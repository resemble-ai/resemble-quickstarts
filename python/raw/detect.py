"""
Resemble AI -- Deepfake Detection Quick Start

Submit audio, video, or image files for AI-generated media detection.
This script demonstrates three workflows:
  1. Basic deepfake detection (real vs. fake classification)
  2. Detection with audio source tracing (identify which AI provider generated it)
  3. Detection with intelligence (AI-generated analysis of the media)

Prerequisites:
    pip install requests

Usage:
    export RESEMBLE_API_KEY="your_api_key"
    export MEDIA_URL="https://example.com/audio.wav"
    python detect.py

Find your API key at https://app.resemble.ai/hub/api
"""

import json
import os
import sys
import time

import requests

# ── Configuration ─────────────────────────────────────────────────────────────

API_KEY = os.environ.get("RESEMBLE_API_KEY", "")
MEDIA_URL = os.environ.get("MEDIA_URL", "")
BASE_URL = "https://app.resemble.ai/api/v2"

# ── Helpers ───────────────────────────────────────────────────────────────────


def headers():
    return {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}


def poll_for_result(uuid: str, timeout: int = 120, interval: int = 5) -> dict:
    """Poll GET /detect/{uuid} until the job completes or times out."""
    url = f"{BASE_URL}/detect/{uuid}"
    deadline = time.time() + timeout

    while time.time() < deadline:
        resp = requests.get(url, headers=headers())
        if not resp.ok:
            sys.exit(f"Error: GET /detect/{uuid} returned {resp.status_code}: {resp.text}")

        item = resp.json().get("item", {})
        status = item.get("status", "unknown")

        if status == "completed":
            return item
        if status == "failed":
            sys.exit(f"Error: detection failed: {json.dumps(item, indent=2)}")

        print(f"  Status: {status} -- retrying in {interval}s")
        time.sleep(interval)

    sys.exit("Error: polling timed out.")


# ── Step 1: Basic deepfake detection ─────────────────────────────────────────


def run_basic_detection(url: str) -> dict:
    """Submit a media URL for deepfake detection and return the result."""
    print("Step 1: Basic deepfake detection")
    print(f"  Submitting: {url}\n")

    payload = {
        "url": url,
        # Optional parameters (uncomment to use):
        # "frame_length": 2,       # Analysis window size in seconds (1-4)
        # "visualize": True,       # Generate a confidence heatmap image
        # "start_region": 0.0,     # Analyze only a segment (seconds)
        # "end_region": 10.0,
    }

    resp = requests.post(f"{BASE_URL}/detect", headers=headers(), json=payload)
    if not resp.ok:
        sys.exit(f"Error: POST /detect returned {resp.status_code}: {resp.text}")

    uuid = resp.json()["item"]["uuid"]
    print(f"  Detection submitted (uuid: {uuid}). Polling for result...\n")

    result = poll_for_result(uuid)

    metrics = result.get("metrics", {})
    print("  Result:")
    print(f"    Label:            {metrics.get('label', 'N/A')}")
    print(f"    Aggregated score: {metrics.get('aggregated_score', 'N/A')}")
    print()

    return result


# ── Step 2: Detection with source tracing ────────────────────────────────────


def run_detection_with_source_tracing(url: str) -> dict:
    """Submit with audio_source_tracing enabled to identify the AI provider."""
    print("Step 2: Detection with audio source tracing")
    print(f"  Submitting: {url}\n")

    payload = {
        "url": url,
        "audio_source_tracing": True,
    }

    resp = requests.post(f"{BASE_URL}/detect", headers=headers(), json=payload)
    if not resp.ok:
        sys.exit(f"Error: POST /detect returned {resp.status_code}: {resp.text}")

    uuid = resp.json()["item"]["uuid"]
    print(f"  Detection submitted (uuid: {uuid}). Polling for result...\n")

    result = poll_for_result(uuid)

    metrics = result.get("metrics", {})
    source = result.get("audio_source_tracing", {})
    print("  Result:")
    print(f"    Label:            {metrics.get('label', 'N/A')}")
    print(f"    Aggregated score: {metrics.get('aggregated_score', 'N/A')}")
    if source:
        print(f"    Source tracing:   {source.get('label', 'N/A')}")
        if source.get("error_message"):
            print(f"    Source error:     {source['error_message']}")
    print()

    return result


# ── Step 3: Detection with intelligence ──────────────────────────────────────


def run_detection_with_intelligence(url: str) -> dict:
    """Submit with intelligence enabled for AI-generated media analysis."""
    print("Step 3: Detection with intelligence")
    print(f"  Submitting: {url}\n")

    payload = {
        "url": url,
        "intelligence": True,
    }

    resp = requests.post(f"{BASE_URL}/detect", headers=headers(), json=payload)
    if not resp.ok:
        sys.exit(f"Error: POST /detect returned {resp.status_code}: {resp.text}")

    uuid = resp.json()["item"]["uuid"]
    print(f"  Detection submitted (uuid: {uuid}). Polling for result...\n")

    result = poll_for_result(uuid)

    metrics = result.get("metrics", {})
    intelligence = result.get("intelligence", {})
    print("  Result:")
    print(f"    Label:            {metrics.get('label', 'N/A')}")
    print(f"    Aggregated score: {metrics.get('aggregated_score', 'N/A')}")
    if intelligence:
        description = intelligence.get("description", "N/A")
        print(f"    Intelligence:     {description}")
    print()

    return result


# ── Main ──────────────────────────────────────────────────────────────────────


def main():
    if not API_KEY:
        sys.exit("Error: set RESEMBLE_API_KEY environment variable before running.")
    if not MEDIA_URL:
        sys.exit("Error: set MEDIA_URL environment variable to a publicly accessible audio/video/image URL.")

    print("Resemble AI -- Deepfake Detection Quick Start\n")
    print("=" * 60)

    run_basic_detection(MEDIA_URL)
    run_detection_with_source_tracing(MEDIA_URL)
    run_detection_with_intelligence(MEDIA_URL)

    print("=" * 60)
    print("Done. All three detection workflows completed.")


if __name__ == "__main__":
    main()
