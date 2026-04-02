"""
Resemble AI — WebSocket Streaming Quick Start

Stream text-to-speech audio in real time over a WebSocket connection.
Audio chunks arrive as base64-encoded PCM_16 and are played back immediately,
giving you low-latency voice output.

Prerequisites:
    pip install websockets pyaudio

Usage:
    export RESEMBLE_API_KEY="your_api_key"
    python websocket_streaming.py

Find your API key and voice UUIDs at https://app.resemble.ai/hub/api
"""

import asyncio
import base64
import json
import os
import sys

import websockets
import pyaudio

# ── Configuration ─────────────────────────────────────────────────────────────

API_KEY = os.environ.get("RESEMBLE_API_KEY", "")
VOICE_UUID = "55592656"  # Replace with your voice UUID
SAMPLE_RATE = 48000
WEBSOCKET_URL = "wss://websocket.cluster.resemble.ai/stream"

# ── Audio playback setup ─────────────────────────────────────────────────────

audio = pyaudio.PyAudio()
playback_stream = audio.open(
    format=pyaudio.paInt16,
    channels=1,
    rate=SAMPLE_RATE,
    output=True,
)


async def connect(api_key: str) -> websockets.WebSocketClientProtocol:
    """Open an authenticated WebSocket connection to the Resemble streaming API."""
    return await websockets.connect(
        WEBSOCKET_URL,
        extra_headers={"Authorization": f"Bearer {api_key}"},
        ping_interval=5,
        ping_timeout=10,
    )


async def synthesize(websocket, text: str) -> None:
    """Send a text payload and stream back audio until the server signals completion."""
    request = {
        "voice_uuid": VOICE_UUID,
        "data": text,
        "sample_rate": SAMPLE_RATE,
        "precision": "PCM_16",
        "no_audio_header": True,
    }
    await websocket.send(json.dumps(request))

    while True:
        message = await websocket.recv()

        try:
            data = json.loads(message)
        except json.JSONDecodeError:
            print(f"Error: received non-JSON response: {message[:200]}")
            break

        msg_type = data.get("type")

        if msg_type == "error":
            print(f"Error from API: {data.get('message', data)}")
            break

        if msg_type == "audio":
            chunk = base64.b64decode(data["audio_content"])
            playback_stream.write(chunk)

        elif msg_type == "audio_end":
            break

        else:
            print(f"Error: unexpected message type '{msg_type}': {data}")
            break


async def main():
    if not API_KEY:
        sys.exit("Error: set RESEMBLE_API_KEY environment variable before running.")

    websocket = await connect(API_KEY)
    print("Connected to Resemble streaming API. Type text to synthesize (Ctrl+C to quit).\n")

    try:
        while True:
            text = input("Text: ").strip()
            if not text:
                continue
            await synthesize(websocket, text)
    except (KeyboardInterrupt, EOFError):
        print("\nGoodbye.")
    except websockets.exceptions.ConnectionClosed as e:
        print(f"Error: connection closed unexpectedly: {e}")
    finally:
        await websocket.close()
        playback_stream.stop_stream()
        playback_stream.close()
        audio.terminate()


if __name__ == "__main__":
    asyncio.run(main())
