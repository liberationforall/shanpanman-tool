import json
import math
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional

import pandas as pd


# ---------------------------------------------------------------------------
# Date helpers
# ---------------------------------------------------------------------------

def get_end_date(value) -> Optional[date]:
    """Convert a Unix-timestamp range string (or single ts) to a Python date."""
    if pd.isna(value) if not isinstance(value, str) else not value:
        return None

    s = str(value).strip()
    if not s:
        return None

    end_ts = s.split("-")[-1]
    try:
        return datetime.fromtimestamp(float(end_ts), tz=timezone.utc).date()
    except Exception:
        return None


def _parse_info(raw) -> dict:
    """Parse the 'info' field which may be a JSON string or already a dict."""
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
    return {}


# ---------------------------------------------------------------------------
# GeoJSON loader
# ---------------------------------------------------------------------------

DATA_PATH = Path(__file__).parent.parent / "data" / "newTargets.geojson"
DISTRICTS_PATH = Path(__file__).parent.parent / "data" / "districts.json"

try:
    with open(DISTRICTS_PATH, encoding="utf-8") as dh:
        DISTRICTS_DATA = json.load(dh).get("features", [])
except Exception:
    DISTRICTS_DATA = []


def point_in_polygon(x, y, geometry):
    geom_type = geometry.get("type")
    coords = geometry.get("coordinates")
    if not coords:
        return False
        
    def _in_poly(x, y, poly_coords):
        if not poly_coords or not poly_coords[0]:
            return False
        exterior = poly_coords[0]
        n = len(exterior)
        inside = False
        p1x, p1y = exterior[0]
        for i in range(1, n + 1):
            p2x, p2y = exterior[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xints = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xints:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside
        
    if geom_type == "Polygon":
        return _in_poly(x, y, coords)
    elif geom_type == "MultiPolygon":
        for poly_coords in coords:
            if _in_poly(x, y, poly_coords):
                return True
    return False


def get_district(lon, lat):
    if lon is None or lat is None:
        return False
    for feature in DISTRICTS_DATA:
        geom = feature.get("geometry")
        if geom and point_in_polygon(lon, lat, geom):
            return feature.get("properties", {}).get("name", True)
    return False


def load_strikes() -> list[dict]:
    """
    Load newTarget.geojson and return a flat list of normalised strike dicts.

    Each dict exposes:
        id, name_fa, date_str, strike_date, accurate, status,
        geolocates, tweet_url, tweet_id, longitude, latitude,
        source_id, created_at
    """
    with open(DATA_PATH, encoding="utf-8") as fh:
        geojson = json.load(fh)

    strikes = []
    for feature in geojson.get("features", []):
        props = feature.get("properties") or {}
        geom = feature.get("geometry") or {}
        coords = geom.get("coordinates") or [None, None]
        if not isinstance(coords, list) or len(coords) < 2:
            coords = [None, None]

        info = _parse_info(props.get("info", {}))

        # Prefer info fields; fall back to top-level props
        date_str = info.get("date") or props.get("date")
        strike_date = get_end_date(date_str)

        import re
        geolocates = info.get("geolocates") or props.get("geolocates")
        sources = info.get("sources") or props.get("sources")

        # Extract tweet ID from URL for embed
        tweet_id: Optional[str] = None
        tweet_url: Optional[str] = None
        
        url_text = f"{geolocates or ''} {sources or ''}"
        match = re.search(r'(https?://(?:www\.)?(?:twitter|x)\.com/[^/]+/status/(\d+))', url_text)
        if match:
            tweet_url = match.group(1)
            tweet_id = match.group(2)

        accurate_raw = (info.get("accurate") or props.get("accurate") or "").lower()
        accurate = accurate_raw == "yes"

        lon, lat = coords[0], coords[1]
        district = get_district(lon, lat)
        in_tehran = district is not False

        strike_date_iso = strike_date.isoformat() if strike_date else None
        if strike_date_iso and strike_date_iso < "2026-02-28":
            continue

        strikes.append(
            {
                "id": props.get("id", ""),
                "name_fa": info.get("name:fa") or props.get("name:fa", ""),
                "date_str": date_str,
                "strike_date": strike_date.isoformat() if strike_date else None,
                "accurate": accurate,
                "status": info.get("status") or props.get("status", ""),
                "geolocates": geolocates,
                "tweet_url": tweet_url,
                "tweet_id": tweet_id,
                "longitude": lon,
                "latitude": lat,
                "district": district,
                "in_tehran": in_tehran,
                "source_id": props.get("sourceId"),
                "created_at": props.get("createdAt"),
            }
        )

    return strikes


# ---------------------------------------------------------------------------
# Aggregation helpers
# ---------------------------------------------------------------------------

def compute_stats(strikes: list[dict]) -> dict:
    """Return summary statistics for the key-figure cards."""
    today = date.today().isoformat()

    confirmed = [s for s in strikes if s["accurate"]]
    pending = [s for s in strikes if not s["accurate"]]
    today_confirmed = [s for s in confirmed if s["strike_date"] == today]

    return {
        "total_confirmed": len(confirmed),
        "confirmed_today": len(today_confirmed),
        "pending_confirmation": len(pending),
    }


def strikes_by_day(strikes: list[dict]) -> list[dict]:
    """
    Return a list of { date, confirmed, pending } dicts ordered
    chronologically for the timeline chart.
    """
    by_date: dict[str, dict] = {}

    for s in strikes:
        d = s["strike_date"]
        if not d:
            continue
        if d not in by_date:
            by_date[d] = {"date": d, "confirmed": 0, "pending": 0}
        if s["accurate"]:
            by_date[d]["confirmed"] += 1
        else:
            by_date[d]["pending"] += 1

    return sorted(by_date.values(), key=lambda x: x["date"])
