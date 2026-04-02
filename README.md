# Resemble Examples

Quick start examples for the [Resemble AI](https://www.resemble.ai/) API in Python and JavaScript.

## Structure

```
python/
  raw/   — Direct API calls (no SDK)
  sdk/   — Using the Resemble Python SDK
js/
  raw/   — Direct API calls (no SDK)
  sdk/   — Using the Resemble Node SDK
```

## Setup

1. Get your API key from [app.resemble.ai/hub/api](https://app.resemble.ai/hub/api)
2. Export it in your shell:
   ```
   export RESEMBLE_API_KEY="your_api_key"
   ```
3. For detection, intelligence, and watermarking examples, export a media URL:
   ```
   export MEDIA_URL="https://example.com/your-audio-file.wav"
   ```

### Python

```
cd python/raw
pip install -r requirements.txt
python websocket_streaming.py
```

### JavaScript

```
cd js/raw
npm install
node websocket_streaming.js
```

## Available Examples

| Example              | Python | JS |
|----------------------|--------|----|
| WebSocket Streaming  | [raw](python/raw/websocket_streaming.py) | [raw](js/raw/websocket_streaming.js) |
| Synchronous TTS      | [raw](python/raw/synthesize.py) | [raw](js/raw/synthesize.js) |
| HTTP Streaming TTS   | [raw](python/raw/stream.py) | [raw](js/raw/stream.js) |
| Speech-to-Speech     | [raw](python/raw/speech_to_speech.py) | [raw](js/raw/speech_to_speech.js) |
| Deepfake Detection   | [raw](python/raw/detect.py) | [raw](js/raw/detect.js) |
| Media Intelligence   | [raw](python/raw/intelligence.py) | [raw](js/raw/intelligence.js) |
| Audio Watermarking   | [raw](python/raw/watermark.py) | [raw](js/raw/watermark.js) |
