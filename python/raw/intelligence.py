"""
Resemble AI -- Media Intelligence Quick Start

Analyze audio, video, or image files using AI to extract metadata:
speaker information, language, emotion, transcription, and more.

This script demonstrates two modes:
  1. Plain-text analysis (free-form description)
  2. Structured JSON analysis (parsed fields)

Note: Intelligence can also be triggered alongside deepfake detection
by setting intelligence=True on the detect endpoint (see detect.py).

Prerequisites:
    pip install requests

Usage:
    export RESEMBLE_API_KEY="your_api_key"
    export MEDIA_URL="https://example.com/audio.wav"
    python intelligence.py

Find your API key at https://app.resemble.ai/hub/api
"""

import json
import os
import sys

import requests

# ── Configuration ─────────────────────────────────────────────────────────────

API_KEY = os.environ.get("RESEMBLE_API_KEY", "")
MEDIA_URL = os.environ.get("MEDIA_URL", "")
BASE_URL = "https://app.resemble.ai/api/v2"

# ── Helpers ───────────────────────────────────────────────────────────────────


def headers():
    return {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}


# ── Step 1: Plain-text intelligence analysis ─────────────────────────────────


def run_text_analysis(url: str) -> dict:
    """Get a natural language description of the media."""
    print("Step 1: Plain-text intelligence analysis")
    print(f"  Submitting: {url}\n")

    payload = {
        "url": url,
        # Optional parameters (uncomment to use):
        # "media_type": "audio",  # Explicitly set media type (auto-detected by default)
        # "callback_url": "https://your-server.com/webhook",  # For async processing
    }

    resp = requests.post(f"{BASE_URL}/intelligence", headers=headers(), json=payload)
    if not resp.ok:
        sys.exit(f"Error: POST /intelligence returned {resp.status_code}: {resp.text}")

    item = resp.json().get("item", {})
    print("  Result:")
    print(f"    Description: {item.get('description', 'N/A')}")
    print()

    return item


# ── Step 2: Structured JSON intelligence analysis ────────────────────────────


def run_json_analysis(url: str) -> dict:
    """Get structured metadata from the media."""
    print("Step 2: Structured JSON intelligence analysis")
    print(f"  Submitting: {url}\n")

    payload = {
        "url": url,
        "json": True,
    }

    resp = requests.post(f"{BASE_URL}/intelligence", headers=headers(), json=payload)
    if not resp.ok:
        sys.exit(f"Error: POST /intelligence returned {resp.status_code}: {resp.text}")

    item = resp.json().get("item", {})
    description = item.get("description", {})

    print("  Result:")
    if isinstance(description, dict):
        for key, value in description.items():
            print(f"    {key}: {value}")
    else:
        print(f"    {description}")
    print()

    return item


# ── Main ──────────────────────────────────────────────────────────────────────


def main():
    if not API_KEY:
        sys.exit("Error: set RESEMBLE_API_KEY environment variable before running.")
    if not MEDIA_URL:
        sys.exit("Error: set MEDIA_URL environment variable to a publicly accessible audio/video/image URL.")

    print("Resemble AI -- Media Intelligence Quick Start\n")
    print("=" * 60)

    run_text_analysis(MEDIA_URL)
    run_json_analysis(MEDIA_URL)

    print("=" * 60)
    print("Done. Both intelligence analysis modes completed.")


if __name__ == "__main__":
    main()
