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

class TargetBatchItem(BaseModel):
    id: str
    name_en: str

class TargetBatchResponse(BaseModel):
    items: list[TargetBatchItem]

class CitizenBatchItem(BaseModel):
    id: str
    name_en: str
    description_en: str

class CitizenBatchResponse(BaseModel):
    items: list[CitizenBatchItem]


# ---------------------------------------------------------------------------
# Translation helper
# ---------------------------------------------------------------------------

MODEL = "claude-haiku-4-5"   # Fast + cheap; swap to claude-sonnet-4-6 for higher quality

def translate_batch(client: anthropic.Anthropic, batch: list[dict], file_type: str) -> dict:
    """
    Ask Claude to translate a batch of locations/reports.
    Batch is a list of dicts with 'id', 'name_fa', and optionally 'description_fa'.
    Returns a dict mapping id -> results_dict.
    """
    if not batch:
        return {}

    prompt_lines = []
    for idx, item in enumerate(batch):
        prompt_lines.append(f"Item ID: {item['id']}")
        prompt_lines.append(f"Name: {item['name_fa']}")
        if file_type == "citizenReport":
            prompt_lines.append(f"Description: {item.get('description_fa', '')}")
        prompt_lines.append("---")
    
    prompt = "\n".join(prompt_lines)

    if file_type == "citizenReport":
        system_msg = (
            "You are an expert Persian-to-English translator. "
            "Translate the provided batch of Farsi location names and descriptions into English. "
            "For names, produce the standard, widely-used English romanisation. "
            "For descriptions, provide a clear, literal English translation. "
            "Return the translations in the exact same order with matching IDs."
        )
        output_format = CitizenBatchResponse
    else:
        system_msg = (
            "You are an expert Persian-to-English translator specialising in "
            "Iranian place names, military facilities, and geographic features. "
            "Translate the batch of Farsi location names to English. "
            "If the name contains a type word (e.g. پادگان = military base), translate it literally. "
            "Return the translations with matching IDs."
        )
        output_format = TargetBatchResponse

    response = client.messages.parse(
        model=MODEL,
        max_tokens=2048,
        system=system_msg,
        messages=[{"role": "user", "content": prompt}],
        output_format=output_format,
    )

    results = {}
    for item in response.parsed_output.items:
        if file_type == "citizenReport":
            results[item.id] = {"name_en": item.name_en, "description_en": item.description_en}
        else:
            results[item.id] = {"name_en": item.name_en}
    return results


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


def build_translation_cache(yesterday_path: Path, file_type: str = "newTargets") -> dict:
    """
    Read yesterday's GeoJSON and return a mapping of
        { feature_id → dict_of_translations }
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

    cache: dict[str, dict] = {}
    for feature in yesterday_geojson.get("features", []):
        props = feature.get("properties") or {}
        feature_id = props.get("id", "")
        if not feature_id:
            continue
        info = _decode_info(props.get("info", {}))
        name_en = info.get("name:en", "").strip()
        description_en = info.get("description:en", "").strip()
        
        if file_type == "citizenReport":
            if name_en or description_en:
                cache[str(feature_id)] = {"name_en": name_en, "description_en": description_en}
        else:
            if name_en:
                cache[str(feature_id)] = {"name_en": name_en}

    print(f"[cache] Loaded {len(cache)} existing translation(s) from yesterday's {file_type} data.")
    return cache


# ---------------------------------------------------------------------------
# Main enrichment loop
# ---------------------------------------------------------------------------

def enrich_geojson(
    geojson_path: Path,
    api_key: str,
    yesterday_path: Path | None = None,
    file_type: str = "newTargets",
) -> None:
    """
    Opens the GeoJSON, fills `name:en` fields in two passes, and saves
    the updated file back in-place.
    """
    # Resolve default yesterday path relative to today's file location
    if yesterday_path is None:
        yesterday_path = geojson_path.parent / "yesterday" / f"{file_type}.geojson"

    # -- Pass 1: build cache from yesterday ---------------------------------
    translation_cache = build_translation_cache(yesterday_path, file_type=file_type)

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

    needs_translation = []

    for i, feature in enumerate(features):
        props = feature.get("properties") or {}
        feature_id = str(props.get("id", ""))

        info = _decode_info(props.get("info", {}))
        name_fa = info.get("name:fa", "").strip()
        description_fa = info.get("description", "").strip()
        if file_type != "citizenReport":
            description_fa = "" # Targets don't translate description

        # Already has a translation in today's file – nothing to do
        if info.get("name:en") and (file_type != "citizenReport" or info.get("description:en") is not None):
            skipped += 1
            continue

        # No Farsi text to work from
        if not name_fa and not description_fa:
            skipped += 1
            continue

        # -- Pass 1: carry over from yesterday's cache ----------------------
        if feature_id and feature_id in translation_cache:
            cached_data = translation_cache[feature_id]
            info["name:en"] = cached_data.get("name_en", "")
            if "name:fa" in props:
                props["name:en"] = cached_data.get("name_en", "")

            if file_type == "citizenReport":
                info["description:en"] = cached_data.get("description_en", "")
                if "description" in props:
                    props["description:en"] = cached_data.get("description_en", "")

            if isinstance(props.get("info"), str):
                props["info"] = json.dumps(info, ensure_ascii=False)
            else:
                props["info"] = info
            feature["properties"] = props
            carried_over += 1
            print(f"  [{i+1}/{total}] (cache) {name_fa!r} → {info['name:en']!r}")
            continue

        # Collect for batch translation
        needs_translation.append({
            "index": i,
            "id": feature_id,
            "name_fa": name_fa,
            "description_fa": description_fa,
            "feature": feature,
            "info": info,
            "props": props
        })

    # -- Pass 2: call the LLM in batches for brand-new features --------------------
    batch_size = 10
    total_new = len(needs_translation)
    
    for start_idx in range(0, len(needs_translation), batch_size):
        batch = needs_translation[start_idx:start_idx + batch_size]
        batch_to_send = [{"id": str(i), "name_fa": item["name_fa"], "description_fa": item["description_fa"]} for i, item in enumerate(batch)]
        
        end_idx = min(start_idx + batch_size, total_new)
        print(f"  [Batch] Translating items {start_idx+1} to {end_idx} of {total_new}")
        try:
            results = translate_batch(client, batch_to_send, file_type)
            for i, item in enumerate(batch):
                res_idx_str = str(i)
                if res_idx_str not in results:
                    continue
                    
                name_en = results[res_idx_str].get("name_en", "")
                desc_en = results[res_idx_str].get("description_en", "")
                
                info = item["info"]
                props = item["props"]
                
                info["name:en"] = name_en
                if "name:fa" in props:
                    props["name:en"] = name_en
                
                if file_type == "citizenReport":
                    info["description:en"] = desc_en
                    if "description" in props:
                        props["description:en"] = desc_en
                        
                if isinstance(props.get("info"), str):
                    props["info"] = json.dumps(info, ensure_ascii=False)
                else:
                    props["info"] = info
                item["feature"]["properties"] = props
                translated += 1
                print(f"             → {item['name_fa']!r} to {name_en!r}")
        except Exception as exc:
            print(f"  [WARN] Failed to translate batch: {exc}")

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
    parser.add_argument(
        "--type",
        type=str,
        default="newTargets",
        choices=["newTargets", "citizenReport"],
        help="The type of data being translated (influences schema and fields)",
    )
    args = parser.parse_args()

    if not args.api_key:
        raise SystemExit(
            "No API key provided. Pass --api-key or set ANTHROPIC_API_KEY."
        )

    enrich_geojson(args.path, args.api_key, file_type=args.type)
