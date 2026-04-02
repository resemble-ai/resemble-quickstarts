"""
Resemble AI -- Synchronous Text-to-Speech Quick Start

Generate speech from text using the synchronous synthesis endpoint.
The server returns the complete audio in a single response as base64.

This script demonstrates four capabilities:
  1. Basic synthesis (default Chatterbox model)
  2. Model selection (Chatterbox-Turbo for lower latency)
  3. Prompting (control delivery style with a text prompt)
  4. Localization (switch languages mid-utterance with SSML)

Prerequisites:
    pip install requests

Usage:
    export RESEMBLE_API_KEY="your_api_key"
    python synthesize.py

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


# ── Step 1: Basic synthesis ──────────────────────────────────────────────────


def run_basic():
    print("Step 1: Basic synthesis (Chatterbox)")
    print('  Text: "Hello! Welcome to Resemble AI."\n')

    synthesize(
        {
            "voice_uuid": VOICE_UUID,
            "data": "Hello! Welcome to Resemble AI.",
            "sample_rate": SAMPLE_RATE,
            "output_format": "wav",
        },
        "output_basic.wav",
    )


# ── Step 2: Model selection (Turbo) ─────────────────────────────────────────


def run_turbo():
    print("Step 2: Turbo model (lower latency)")
    print('  Text: "This is synthesized with Chatterbox-Turbo for faster delivery."\n')

    synthesize(
        {
            "voice_uuid": VOICE_UUID,
            "data": "This is synthesized with Chatterbox-Turbo for faster delivery.",
            "model": "chatterbox-turbo",
            "sample_rate": SAMPLE_RATE,
            "output_format": "wav",
        },
        "output_turbo.wav",
    )


# ── Step 3: Prompting ────────────────────────────────────────────────────────


def run_prompting():
    print("Step 3: Prompting (control delivery style)")
    print("  Using a prompt to steer the voice toward an excited tone.\n")

    ssml = (
        '<speak prompt="Speak with excitement, like announcing a big surprise">'
        "You just won a brand new car! Congratulations!"
        "</speak>"
    )

    synthesize(
        {
            "voice_uuid": VOICE_UUID,
            "data": ssml,
            "sample_rate": SAMPLE_RATE,
            "output_format": "wav",
        },
        "output_prompted.wav",
    )


# ── Step 4: Localization ─────────────────────────────────────────────────────


def run_localization():
    print("Step 4: Localization (switch languages mid-utterance)")
    print("  Mixing English and Spanish using the <lang> SSML tag.\n")

    ssml = (
        "<speak>"
        'Your flight to <lang xml:lang="es-es">Ciudad de México</lang> '
        "departs in thirty minutes."
        "</speak>"
    )

    synthesize(
        {
            "voice_uuid": VOICE_UUID,
            "data": ssml,
            "sample_rate": SAMPLE_RATE,
            "output_format": "wav",
        },
        "output_localized.wav",
    )


# ── Main ──────────────────────────────────────────────────────────────────────


def main():
    if not API_KEY:
        sys.exit("Error: set RESEMBLE_API_KEY environment variable before running.")

    print("Resemble AI -- Synchronous TTS Quick Start\n")
    print("=" * 60)

    run_basic()
    run_turbo()
    run_prompting()
    run_localization()

    print("=" * 60)
    print("Done. Audio files saved to the current directory.")


if __name__ == "__main__":
    main()
