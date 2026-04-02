/**
 * Resemble AI — WebSocket Streaming Quick Start
 *
 * Stream text-to-speech audio in real time over a WebSocket connection.
 * Audio chunks arrive as base64-encoded PCM_16 and are played back immediately,
 * giving you low-latency voice output.
 *
 * Prerequisites:
 *     npm install ws speaker readline
 *
 * Usage:
 *     export RESEMBLE_API_KEY="your_api_key"
 *     node websocket_streaming.js
 *
 * Find your API key and voice UUIDs at https://app.resemble.ai/hub/api
 */

const WebSocket = require("ws");
const Speaker = require("speaker");
const readline = require("readline");

// ── Configuration ────────────────────────────────────────────────────────────

const API_KEY = process.env.RESEMBLE_API_KEY || "";
const VOICE_UUID = "55592656"; // Replace with your voice UUID
const SAMPLE_RATE = 48000;
const WEBSOCKET_URL = "wss://websocket.cluster.resemble.ai/stream";

// ── Helpers ──────────────────────────────────────────────────────────────────

function connect(apiKey) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WEBSOCKET_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    ws.on("open", () => resolve(ws));
    ws.on("error", (err) => reject(err));
  });
}

function synthesize(ws, text) {
  return new Promise((resolve, reject) => {
    let speaker = null;

    const request = {
      voice_uuid: VOICE_UUID,
      data: text,
      sample_rate: SAMPLE_RATE,
      precision: "PCM_16",
      no_audio_header: true,
    };
    ws.send(JSON.stringify(request));

    const onMessage = (message) => {
      let data;
      try {
        data = JSON.parse(message);
      } catch {
        console.error(`Error: received non-JSON response: ${String(message).slice(0, 200)}`);
        cleanup();
        return resolve();
      }

      const msgType = data.type;

      if (msgType === "error") {
        console.error(`Error from API: ${data.message || JSON.stringify(data)}`);
        cleanup();
        return resolve();
      }

      if (msgType === "audio") {
        if (!speaker) {
          speaker = new Speaker({
            channels: 1,
            bitDepth: 16,
            sampleRate: SAMPLE_RATE,
            signed: true,
          });
        }
        const chunk = Buffer.from(data.audio_content, "base64");
        speaker.write(chunk);
      } else if (msgType === "audio_end") {
        if (speaker) speaker.end();
        cleanup();
        return resolve();
      } else {
        console.error(`Error: unexpected message type '${msgType}': ${JSON.stringify(data)}`);
        cleanup();
        return resolve();
      }
    };

    const onClose = () => {
      cleanup();
      reject(new Error("Connection closed unexpectedly"));
    };

    function cleanup() {
      ws.removeListener("message", onMessage);
      ws.removeListener("close", onClose);
    }

    ws.on("message", onMessage);
    ws.on("close", onClose);
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error("Error: set RESEMBLE_API_KEY environment variable before running.");
    process.exit(1);
  }

  const ws = await connect(API_KEY);
  console.log("Connected to Resemble streaming API. Type text to synthesize (Ctrl+C to quit).\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const prompt = () => {
    rl.question("Text: ", async (text) => {
      text = text.trim();
      if (!text) return prompt();

      try {
        await synthesize(ws, text);
      } catch (err) {
        console.error(`Error: ${err.message}`);
        rl.close();
        ws.close();
        return;
      }
      prompt();
    });
  };

  rl.on("close", () => {
    console.log("\nGoodbye.");
    ws.close();
    process.exit(0);
  });

  prompt();
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
