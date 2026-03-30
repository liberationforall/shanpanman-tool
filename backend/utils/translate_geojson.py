"""
translate_geojson.py
────────────────────
Reads a GeoJSON file, finds every feature whose `info` object contains a
`name:fa` field but no `name:en` field, and enriches it in two passes:

Pass 1 – Cache carry-over (free, no LLM calls)
    Reads yesterday's GeoJSON (backend/data/yesterday/newTargets.geojson by
    default) and builds an {id → name:en} lookup.  Any feature in today's
    file whose ID already has a translation is updated immediately without
    touching the API.

Pass 2 – LLM translation (only for truly new/unknown features)
    For every feature still missing `name:en` after the cache pass, the
    Claude API is called with a structured-output schema to produce the
    translation.

Structured output schema (extensible for future tasks):
    {
        "name_en": "<translated English name>"
    }

Usage
-----
    python translate_geojson.py --path path/to/newTargets.geojson --api-key sk-ant-...

The ANTHROPIC_API_KEY environment variable is used as a fallback if
--api-key is omitted.
"""

from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path

import anthropic
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Structured output model
# ---------------------------------------------------------------------------

class FeatureEnrichment(BaseModel):
    """
    Structured output returned by Claude for each feature that requires
    enrichment. Currently only translation, but the schema is intentionally
    designed to be extended with additional fields in the future (e.g.
    name_transliteration, category, …).
    """
    name_en: str  # English translation of the Farsi location name


# ---------------------------------------------------------------------------
# Translation helper
# ---------------------------------------------------------------------------

MODEL = "claude-haiku-4-5"   # Fast + cheap; swap to claude-sonnet-4-6 for higher quality


def translate_name(client: anthropic.Anthropic, name_fa: str) -> str:
    """
    Ask Claude to translate a single Farsi location name to English.
    Uses the structured output API to guarantee a well-formed JSON response.
    """
    response = client.messages.parse(
        model=MODEL,
        max_tokens=256,
        system=(
            "You are an expert Persian-to-English translator specialising in "
            "Iranian place names, military facilities, and geographic features. "
            "When translating, produce the standard, widely-used English "
            "romanisation of the Farsi name. If the name contains a type word "
            "(e.g. پادگان = military base, پایگاه = base, میدان = square) "
            "translate it literally. Return ONLY the structured output, nothing else."
        ),
        messages=[
            {
                "role": "user",
                "content": f"Translate this Farsi location name to English: {name_fa}",
            }
        ],
        output_format=FeatureEnrichment,
    )
    return response.parsed_output.name_en


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def _decode_info(raw) -> dict:
    """Decode the `info` field which may be a JSON string or already a dict."""
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}
    if isinstance(raw, dict):
        return raw
    return {}


def build_translation_cache(yesterday_path: Path) -> dict[str, str]:
    """
    Read yesterday's GeoJSON and return a mapping of
        { feature_id → name:en }
    for every feature that already has a translated name.

    Returns an empty dict if the file does not exist or cannot be parsed.
    """
    if not yesterday_path.exists():
        print(f"[cache] Yesterday's file not found at {yesterday_path} — skipping cache pass.")
        return {}

    try:
        with open(yesterday_path, encoding="utf-8") as fh:
            yesterday_geojson = json.load(fh)
    except Exception as exc:
        print(f"[cache] Could not load yesterday's file: {exc} — skipping cache pass.")
        return {}

    cache: dict[str, str] = {}
    for feature in yesterday_geojson.get("features", []):
        props = feature.get("properties") or {}
        feature_id = props.get("id", "")
        if not feature_id:
            continue
        info = _decode_info(props.get("info", {}))
        name_en = info.get("name:en", "").strip()
        if name_en:
            cache[str(feature_id)] = name_en

    print(f"[cache] Loaded {len(cache)} existing translation(s) from yesterday's data.")
    return cache


# ---------------------------------------------------------------------------
# Main enrichment loop
# ---------------------------------------------------------------------------

def enrich_geojson(
    geojson_path: Path,
    api_key: str,
    yesterday_path: Path | None = None,
) -> None:
    """
    Opens the GeoJSON, fills `name:en` fields in two passes, and saves
    the updated file back in-place.

    Pass 1 – carry-over from yesterday (free, no LLM calls)
    Pass 2 – LLM translation for any feature still missing `name:en`
    """
    # Resolve default yesterday path relative to today's file location
    if yesterday_path is None:
        yesterday_path = geojson_path.parent / "yesterday" / "newTargets.geojson"

    # -- Pass 1: build cache from yesterday ---------------------------------
    translation_cache = build_translation_cache(yesterday_path)

    # -- Load today's file --------------------------------------------------
    client = anthropic.Anthropic(api_key=api_key)

    print(f"Loading: {geojson_path}")
    with open(geojson_path, encoding="utf-8") as fh:
        geojson = json.load(fh)

    features = geojson.get("features", [])
    total = len(features)
    carried_over = 0
    translated = 0
    skipped = 0

    for i, feature in enumerate(features):
        props = feature.get("properties") or {}
        feature_id = str(props.get("id", ""))

        info = _decode_info(props.get("info", {}))
        name_fa = info.get("name:fa", "").strip()

        # Already has a translation in today's file – nothing to do
        if info.get("name:en"):
            skipped += 1
            continue

        # No Farsi name to work from
        if not name_fa:
            skipped += 1
            continue

        # -- Pass 1: carry over from yesterday's cache ----------------------
        if feature_id and feature_id in translation_cache:
            cached_name = translation_cache[feature_id]
            info["name:en"] = cached_name
            if isinstance(props.get("info"), str):
                props["info"] = json.dumps(info, ensure_ascii=False)
            else:
                props["info"] = info
            feature["properties"] = props
            carried_over += 1
            print(f"  [{i+1}/{total}] (cache) {name_fa!r} → {cached_name!r}")
            continue

        # -- Pass 2: call the LLM for brand-new features --------------------
        print(f"  [{i+1}/{total}] (llm)   Translating: {name_fa!r}")
        try:
            name_en = translate_name(client, name_fa)
            info["name:en"] = name_en
            if isinstance(props.get("info"), str):
                props["info"] = json.dumps(info, ensure_ascii=False)
            else:
                props["info"] = info
            feature["properties"] = props
            translated += 1
            print(f"             → {name_en!r}")
        except Exception as exc:
            print(f"  [WARN] Failed to translate {name_fa!r}: {exc}")

        # Small delay to avoid hitting rate limits on bulk runs
        time.sleep(0.1)

    print(
        f"\nDone. "
        f"Carried over: {carried_over}  "
        f"LLM-translated: {translated}  "
        f"Skipped/already present: {skipped}"
    )

    if carried_over > 0 or translated > 0:
        with open(geojson_path, "w", encoding="utf-8") as fh:
            json.dump(geojson, fh, ensure_ascii=False, indent=2)
        print(f"Saved updated GeoJSON → {geojson_path}")
    else:
        print("No changes to write.")


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Translate Farsi names in a GeoJSON file.")
    parser.add_argument(
        "--path",
        type=Path,
        default=Path(__file__).parent.parent / "data" / "newTargets.geojson",
        help="Path to the GeoJSON file (default: backend/data/newTargets.geojson)",
    )
    parser.add_argument(
        "--api-key",
        type=str,
        default=os.environ.get("ANTHROPIC_API_KEY", ""),
        help="Anthropic API key (or set ANTHROPIC_API_KEY env var)",
    )
    args = parser.parse_args()

    if not args.api_key:
        raise SystemExit(
            "No API key provided. Pass --api-key or set ANTHROPIC_API_KEY."
        )

    enrich_geojson(args.path, args.api_key)
