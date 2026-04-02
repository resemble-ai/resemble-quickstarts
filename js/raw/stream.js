/**
 * Resemble AI -- HTTP Streaming TTS Quick Start
 *
 * Stream synthesized audio over HTTP. Unlike the synchronous /synthesize endpoint,
 * /stream returns chunked WAV data progressively, reducing time-to-first-byte
 * and enabling playback before the full audio is generated.
 *
 * Prerequisites:
 *     Node.js 18+ (uses native fetch)
 *
 * Usage:
 *     export RESEMBLE_API_KEY="your_api_key"
 *     node stream.js
 *
 * Find your API key and voice UUIDs at https://app.resemble.ai/hub/api
 */

const fs = require("fs");

// ── Configuration ────────────────────────────────────────────────────────────

const API_KEY = process.env.RESEMBLE_API_KEY || "";
const VOICE_UUID = process.env.VOICE_UUID || "55592656"; // Replace with your voice UUID
const BASE_URL = "https://p.cluster.resemble.ai";
const SAMPLE_RATE = 48000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function headers() {
  return { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" };
}

// ── Stream and save ──────────────────────────────────────────────────────────

async function streamAndSave(text, outputFile) {
  console.log(`  Streaming: "${text}"`);
  console.log(`  Saving to: ${outputFile}\n`);

  const payload = {
    voice_uuid: VOICE_UUID,
    data: text,
    sample_rate: SAMPLE_RATE,
    precision: "PCM_16",
  };

  const resp = await fetch(`${BASE_URL}/stream`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error(`Error: POST /stream returned ${resp.status}: ${text}`);
    process.exit(1);
  }

  const fileStream = fs.createWriteStream(outputFile);
  const reader = resp.body.getReader();
  let totalBytes = 0;
  let chunkCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fileStream.write(value);
    totalBytes += value.length;
    chunkCount++;
  }

  fileStream.end();

  console.log(`    Chunks received: ${chunkCount}`);
  console.log(`    Total size:      ${totalBytes.toLocaleString()} bytes`);
  console.log();
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error("Error: set RESEMBLE_API_KEY environment variable before running.");
    process.exit(1);
  }

  console.log("Resemble AI -- HTTP Streaming TTS Quick Start\n");
  console.log("=".repeat(60));

  await streamAndSave(
    "Streaming reduces time to first byte, so your application can start " +
      "playing audio before the full synthesis is complete.",
    "output_stream.wav"
  );

  console.log("=".repeat(60));
  console.log("Done. Audio file saved to the current directory.");
  console.log();
  console.log("Tip: For real-time playback, pipe chunks directly to an audio player");
  console.log("instead of writing to a file. See websocket_streaming.js for an");
  console.log("example using WebSocket streaming with live playback.");
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
