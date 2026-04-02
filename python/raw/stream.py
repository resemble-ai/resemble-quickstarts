"""
Resemble AI -- HTTP Streaming TTS Quick Start

Stream synthesized audio over HTTP. Unlike the synchronous /synthesize endpoint,
/stream returns chunked WAV data progressively, reducing time-to-first-byte
and enabling playback before the full audio is generated.

Prerequisites:
    pip install requests

Usage:
    export RESEMBLE_API_KEY="your_api_key"
    python stream.py

Find your API key and voice UUIDs at https://app.resemble.ai/hub/api
"""

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


# ── Stream and save ──────────────────────────────────────────────────────────


def stream_and_save(text: str, output_file: str) -> None:
    """Stream audio from the /stream endpoint and write chunks to a WAV file."""
    print(f"  Streaming: \"{text}\"")
    print(f"  Saving to: {output_file}\n")

    payload = {
        "voice_uuid": VOICE_UUID,
        "data": text,
        "sample_rate": SAMPLE_RATE,
        "precision": "PCM_16",
    }

    resp = requests.post(
        f"{BASE_URL}/stream", headers=headers(), json=payload, stream=True
    )
    if not resp.ok:
        sys.exit(f"Error: POST /stream returned {resp.status_code}: {resp.text}")

    total_bytes = 0
    chunk_count = 0

    with open(output_file, "wb") as f:
        for chunk in resp.iter_content(chunk_size=4096):
            f.write(chunk)
            total_bytes += len(chunk)
            chunk_count += 1

    print(f"    Chunks received: {chunk_count}")
    print(f"    Total size:      {total_bytes:,} bytes")
    print()


# ── Main ──────────────────────────────────────────────────────────────────────


def main():
    if not API_KEY:
        sys.exit("Error: set RESEMBLE_API_KEY environment variable before running.")

    print("Resemble AI -- HTTP Streaming TTS Quick Start\n")
    print("=" * 60)

    stream_and_save(
        "Streaming reduces time to first byte, so your application can start "
        "playing audio before the full synthesis is complete.",
        "output_stream.wav",
    )

    print("=" * 60)
    print("Done. Audio file saved to the current directory.")
    print()
    print("Tip: For real-time playback, pipe chunks directly to an audio player")
    print("instead of writing to a file. See websocket_streaming.py for an")
    print("example using WebSocket streaming with live playback.")


if __name__ == "__main__":
    main()
