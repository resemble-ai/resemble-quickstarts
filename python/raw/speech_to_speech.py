"""
Resemble AI -- Speech-to-Speech Quick Start

Convert a source audio file into a different voice using Resemble's
speech-to-speech (STS) capability. The source audio's content and timing
are preserved while the voice identity is transformed.

This script demonstrates:
  1. Basic voice conversion
  2. Voice conversion with a style prompt

Prerequisites:
    pip install requests

Usage:
    export RESEMBLE_API_KEY="your_api_key"
    export STS_AUDIO_URL="https://example.com/source-audio.wav"
    python speech_to_speech.py

The source audio URL must be publicly accessible, contain a single speaker,
and be under 50 MB / 300 seconds.

Find your API key and voice UUIDs at https://app.resemble.ai/hub/api
"""

import base64
import json
import os
import sys

import requests

# ── Configuration ─────────────────────────────────────────────────────────────

API_KEY = os.environ.get("RESEMBLE_API_KEY", "")
VOICE_UUID = os.environ.get("VOICE_UUID", "55592656")  # Replace with your voice UUID
STS_AUDIO_URL = os.environ.get("STS_AUDIO_URL", "")
BASE_URL = "https://p.cluster.resemble.ai"
SAMPLE_RATE = 48000

# ── Helpers ───────────────────────────────────────────────────────────────────


def headers():
    return {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}


def synthesize(payload: dict, output_file: str) -> dict:
    """Send a synthesis request and save the resulting audio to a file."""
    resp = requests.post(f"{BASE_URL}/synthesize", headers=headers(), json=payload)
    if not resp.ok:
        sys.exit(f"Error: POST /synthesize returned {resp.status_code}: {resp.text}")

    data = resp.json()
    if not data.get("success", True):
        sys.exit(f"Error: {json.dumps(data, indent=2)}")

    audio_bytes = base64.b64decode(data["audio_content"])
    with open(output_file, "wb") as f:
        f.write(audio_bytes)

    print(f"    Saved to:   {output_file}")
    print(f"    Duration:   {data.get('duration', 'N/A')}s")
    print(f"    Format:     {data.get('output_format', 'N/A')} @ {data.get('sample_rate', 'N/A')} Hz")
    print()

    return data


# ── Step 1: Basic voice conversion ──────────────────────────────────────────


def run_basic_sts(audio_url: str):
    print("Step 1: Basic speech-to-speech (voice conversion)")
    print(f"  Source audio: {audio_url}\n")

    # The <resemble:convert> SSML tag triggers voice conversion.
    # The src attribute points to the source audio file.
    ssml = f'<speak><resemble:convert src="{audio_url}" /></speak>'

    synthesize(
        {
            "voice_uuid": VOICE_UUID,
            "data": ssml,
            "sample_rate": SAMPLE_RATE,
            "output_format": "wav",
        },
        "output_sts.wav",
    )


# ── Step 2: Voice conversion with style prompt ──────────────────────────────


def run_prompted_sts(audio_url: str):
    print("Step 2: Speech-to-speech with style prompt")
    print(f"  Source audio: {audio_url}")
    print("  Prompt: \"Speak in a calm, soothing voice.\"\n")

    # For STS, the prompt attribute goes on <resemble:convert>, not on <speak>.
    ssml = (
        "<speak>"
        f'<resemble:convert src="{audio_url}" prompt="Speak in a calm, soothing voice." />'
        "</speak>"
    )

    synthesize(
        {
            "voice_uuid": VOICE_UUID,
            "data": ssml,
            "sample_rate": SAMPLE_RATE,
            "output_format": "wav",
        },
        "output_sts_prompted.wav",
    )


# ── Main ──────────────────────────────────────────────────────────────────────


def main():
    if not API_KEY:
        sys.exit("Error: set RESEMBLE_API_KEY environment variable before running.")
    if not STS_AUDIO_URL:
        sys.exit(
            "Error: set STS_AUDIO_URL environment variable to a publicly accessible\n"
            "       audio URL (WAV, single speaker, under 50 MB / 300 seconds)."
        )

    print("Resemble AI -- Speech-to-Speech Quick Start\n")
    print("=" * 60)

    run_basic_sts(STS_AUDIO_URL)
    run_prompted_sts(STS_AUDIO_URL)

    print("=" * 60)
    print("Done. Audio files saved to the current directory.")


if __name__ == "__main__":
    main()
