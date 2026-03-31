import os
import shutil
import urllib.request
import urllib.error
import json
from datetime import datetime
import argparse
from pathlib import Path
from translate_geojson import enrich_geojson

def validate_citizen_report_schema(file_path: Path):
    """
    Validates the schema of the fetched citizenReport.geojson.
    Logs warnings if deviations are found.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if data.get("type") != "FeatureCollection":
        print("[WARN] citizenReport.geojson is not a FeatureCollection")
    
    features = data.get("features", [])
    for i, feature in enumerate(features):
        geom = feature.get("geometry", {})
        if not geom.get("coordinates"):
            print(f"[WARN] Feature {i} missing geometry.coordinates")
        
        props = feature.get("properties", {})
        if "name:fa" not in props:
            print(f"[WARN] Feature {i} missing properties.name:fa")
        if "description" not in props:
            print(f"[WARN] Feature {i} missing properties.description")
        if "id" not in props:
            print(f"[WARN] Feature {i} missing properties.id")

def fetch_daily_data(repo_url_template: str, file_type: str, api_key: str = ""):
    """
    Fetches today's data and archives yesterday's data.
    """
    # Get today's date in DD-MM-YYYY format
    today_str = datetime.now().strftime("%d-%m-%Y")
    url = repo_url_template.format(date=today_str)

    print(f"[{datetime.now().isoformat()}] Attempting to fetch {file_type} from: {url}")

    # Set up paths
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent
    data_dir = backend_dir / "data"
    yesterday_dir = data_dir / "yesterday"
    
    current_file_path = data_dir / f"{file_type}.geojson"
    yesterday_file_path = yesterday_dir / f"{file_type}.geojson"

    # Create directories if they don't exist
    yesterday_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Download the new file first to a temporary location
        temp_file_path = data_dir / f"temp_{file_type}.geojson"
        urllib.request.urlretrieve(url, temp_file_path)
        print("Successfully downloaded today's data.")

        # Schema Validation for citizenReport
        if file_type == "citizenReport":
            print("Validating citizenReport.geojson schema...")
            validate_citizen_report_schema(temp_file_path)

        # If download was successful, archive the current file (yesterday's data)
        if current_file_path.exists():
            shutil.move(str(current_file_path), str(yesterday_file_path))
            print(f"Moved existing data to {yesterday_file_path}")

        # Move the downloaded temp file into place
        shutil.move(str(temp_file_path), str(current_file_path))
        print(f"Successfully updated {current_file_path}")

        # Run translation enrichment if an API key is available
        if api_key:
            print("Running translation enrichment...")
            enrich_geojson(current_file_path, api_key, file_type=file_type)
        else:
            print("Skipping translation: no ANTHROPIC_API_KEY provided.")

    except urllib.error.HTTPError as e:
        # Clean up any partial temp file
        if temp_file_path.exists():
            temp_file_path.unlink()

        if e.code == 404:
            # The source repo simply hasn't published today's data yet.
            print(
                f"No data available yet for today ({today_str}) — "
                "the source repository hasn't published it yet (HTTP 404). "
                "Nothing to update."
            )
            exit(0)
        else:
            print(f"HTTP Error: {e.code} - {e.reason}")
            exit(1)
    except Exception as e:
        # Clean up any partial temp file
        if 'temp_file_path' in locals() and temp_file_path.exists():
            temp_file_path.unlink()
        print(f"An error occurred: {e}")
        exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch daily geojson data.")
    parser.add_argument(
        "--url", 
        type=str, 
        required=True, 
        help="URL template for the remote file. Use {date} as a placeholder."
    )
    parser.add_argument(
        "--file-type",
        type=str,
        default="newTargets",
        help="Type of file being fetched (e.g. newTargets, citizenReport)."
    )
    parser.add_argument(
        "--api-key",
        type=str,
        default=os.environ.get("ANTHROPIC_API_KEY", ""),
        help="Anthropic API key for translation (or set ANTHROPIC_API_KEY env var).",
    )
    args = parser.parse_args()
    fetch_daily_data(args.url, args.file_type, api_key=args.api_key)
