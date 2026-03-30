import os
import shutil
import urllib.request
import urllib.error
from datetime import datetime
import argparse
from pathlib import Path
from translate_geojson import enrich_geojson

def fetch_daily_data(repo_url_template: str, api_key: str = ""):
    """
    Fetches today's newTargets.geojson and archives yesterday's data.

    repo_url_template: A string url with `{date}` that can be formatted with today's date.
                       Example: "https://raw.githubusercontent.com/OWNER/REPO/main/data/{date}/newTargets.geojson"
    """
    # Get today's date in DD-MM-YYYY format
    today_str = datetime.now().strftime("%d-%m-%Y")
    url = repo_url_template.format(date=today_str)

    print(f"[{datetime.now().isoformat()}] Attempting to fetch data from: {url}")

    # Set up paths
    # Assuming this script is in backend/utils/, the data folder is at backend/data
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent
    data_dir = backend_dir / "data"
    yesterday_dir = data_dir / "yesterday"
    
    current_file_path = data_dir / "newTargets.geojson"
    yesterday_file_path = yesterday_dir / "newTargets.geojson"

    # Create directories if they don't exist
    yesterday_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Download the new file first to a temporary location
        temp_file_path = data_dir / "temp_newTargets.geojson"
        urllib.request.urlretrieve(url, temp_file_path)
        print("Successfully downloaded today's data.")

        # If download was successful, archive the current file (yesterday's data)
        if current_file_path.exists():
            shutil.move(str(current_file_path), str(yesterday_file_path))
            print(f"Moved existing data to {yesterday_file_path}")

        # Move the downloaded temp file into place
        shutil.move(str(temp_file_path), str(current_file_path))
        print(f"Successfully updated {current_file_path}")

        # Run translation enrichment if an API key is available
        if api_key:
            print("Running translation enrichment (name:fa → name:en)...")
            enrich_geojson(current_file_path, api_key)
        else:
            print("Skipping translation: no ANTHROPIC_API_KEY provided.")

    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"Data for today ({today_str}) not found at the source repository (HTTP 404).")
        else:
            print(f"HTTP Error: {e.code} - {e.reason}")
        exit(1)
    except Exception as e:
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
        "--api-key",
        type=str,
        default=os.environ.get("ANTHROPIC_API_KEY", ""),
        help="Anthropic API key for translation (or set ANTHROPIC_API_KEY env var).",
    )
    args = parser.parse_args()
    fetch_daily_data(args.url, api_key=args.api_key)
