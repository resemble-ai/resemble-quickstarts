"""
Resemble AI -- Audio Watermarking Quick Start

Apply invisible watermarks to audio files and detect them later.
Watermarks survive common transformations (compression, re-encoding)
and can be used for provenance tracking.

This script demonstrates two workflows:
  1. Applying a watermark to an audio file
  2. Detecting a watermark in an audio file

Prerequisites:
    pip install requests

Usage:
    export RESEMBLE_API_KEY="your_api_key"
    export MEDIA_URL="https://example.com/audio.wav"
    python watermark.py

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


def headers(prefer_wait: bool = False) -> dict:
    h = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    if prefer_wait:
        h["Prefer"] = "wait"
    return h


# ── Step 1: Apply watermark ──────────────────────────────────────────────────


def apply_watermark(url: str) -> str:
    """Apply an invisible watermark to an audio file and return the watermarked URL."""
    print("Step 1: Apply watermark")
    print(f"  Submitting: {url}\n")

    payload = {
        "url": url,
        # Optional parameters for image/video (ignored for audio):
        # "strength": 0.2,            # Watermark strength (0.0-1.0)
        # "custom_message": "my-tag",  # Embed a custom message
    }

    # The "Prefer: wait" header makes the request synchronous --
    # the server blocks until the watermarked file is ready.
    # Without it, you would need to poll GET /watermark/apply/{uuid}/result.
    resp = requests.post(
        f"{BASE_URL}/watermark/apply", headers=headers(prefer_wait=True), json=payload
    )
    if not resp.ok:
        sys.exit(f"Error: POST /watermark/apply returned {resp.status_code}: {resp.text}")

    result = resp.json().get("item", {})
    watermarked_url = result.get("watermarked_media")

    print("  Result:")
    print(f"    Media type:      {result.get('media_type', 'N/A')}")
    print(f"    Watermarked URL: {watermarked_url}")
    print()

    return watermarked_url


# ── Step 2: Detect watermark ─────────────────────────────────────────────────


def detect_watermark(url: str) -> dict:
    """Check whether an audio file contains a Resemble watermark."""
    print("Step 2: Detect watermark")
    print(f"  Submitting: {url}\n")

    payload = {
        "url": url,
        # "custom_message": "my-tag",  # Must match the message used during apply
    }

    resp = requests.post(
        f"{BASE_URL}/watermark/detect", headers=headers(prefer_wait=True), json=payload
    )
    if not resp.ok:
        sys.exit(f"Error: POST /watermark/detect returned {resp.status_code}: {resp.text}")

    result = resp.json().get("item", {})
    metrics = result.get("metrics", {})

    print("  Result:")
    has_watermark = metrics.get("has_watermark", "N/A")
    if isinstance(has_watermark, dict):
        has_watermark = json.dumps(has_watermark)
    print(f"    Has watermark: {has_watermark}")
    print(f"    Confidence:    {metrics.get('confidence', 'N/A')}")
    print()

    return result


# ── Main ──────────────────────────────────────────────────────────────────────


def main():
    if not API_KEY:
        sys.exit("Error: set RESEMBLE_API_KEY environment variable before running.")
    if not MEDIA_URL:
        sys.exit("Error: set MEDIA_URL environment variable to a publicly accessible audio URL.")

    print("Resemble AI -- Audio Watermarking Quick Start\n")
    print("=" * 60)

    watermarked_url = apply_watermark(MEDIA_URL)

    if watermarked_url:
        detect_watermark(watermarked_url)
    else:
        print("  Skipping detection: no watermarked URL returned.")

    print("=" * 60)
    print("Done. Watermark apply and detect workflows completed.")


if __name__ == "__main__":
    main()
