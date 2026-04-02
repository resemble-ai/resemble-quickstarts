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
