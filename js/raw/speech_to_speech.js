/**
 * Resemble AI -- Speech-to-Speech Quick Start
 *
 * Convert a source audio file into a different voice using Resemble's
 * speech-to-speech (STS) capability. The source audio's content and timing
 * are preserved while the voice identity is transformed.
 *
 * This script demonstrates:
 *   1. Basic voice conversion
 *   2. Voice conversion with a style prompt
 *
 * Prerequisites:
 *     Node.js 18+ (uses native fetch)
 *
 * Usage:
 *     export RESEMBLE_API_KEY="your_api_key"
 *     export STS_AUDIO_URL="https://example.com/source-audio.wav"
 *     node speech_to_speech.js
 *
 * The source audio URL must be publicly accessible, contain a single speaker,
 * and be under 50 MB / 300 seconds.
 *
 * Find your API key and voice UUIDs at https://app.resemble.ai/hub/api
 */

const fs = require("fs");

// ── Configuration ────────────────────────────────────────────────────────────

const API_KEY = process.env.RESEMBLE_API_KEY || "";
const VOICE_UUID = process.env.VOICE_UUID || "55592656"; // Replace with your voice UUID
const STS_AUDIO_URL = process.env.STS_AUDIO_URL || "";
const BASE_URL = "https://p.cluster.resemble.ai";
const SAMPLE_RATE = 48000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function headers() {
  return { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" };
}

async function synthesize(payload, outputFile) {
  const resp = await fetch(`${BASE_URL}/synthesize`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error(`Error: POST /synthesize returned ${resp.status}: ${text}`);
    process.exit(1);
  }

  const data = await resp.json();
  if (data.success === false) {
    console.error(`Error: ${JSON.stringify(data, null, 2)}`);
    process.exit(1);
  }

  const audioBytes = Buffer.from(data.audio_content, "base64");
  fs.writeFileSync(outputFile, audioBytes);

  console.log(`    Saved to:   ${outputFile}`);
  console.log(`    Duration:   ${data.duration ?? "N/A"}s`);
  console.log(`    Format:     ${data.output_format ?? "N/A"} @ ${data.sample_rate ?? "N/A"} Hz`);
  console.log();

  return data;
}

// ── Step 1: Basic voice conversion ───────────────────────────────────────────

async function runBasicSts(audioUrl) {
  console.log("Step 1: Basic speech-to-speech (voice conversion)");
  console.log(`  Source audio: ${audioUrl}\n`);

  // The <resemble:convert> SSML tag triggers voice conversion.
  // The src attribute points to the source audio file.
  const ssml = `<speak><resemble:convert src="${audioUrl}" /></speak>`;

  await synthesize(
    {
      voice_uuid: VOICE_UUID,
      data: ssml,
      sample_rate: SAMPLE_RATE,
      output_format: "wav",
    },
    "output_sts.wav"
  );
}

// ── Step 2: Voice conversion with style prompt ───────────────────────────────

async function runPromptedSts(audioUrl) {
  console.log("Step 2: Speech-to-speech with style prompt");
  console.log(`  Source audio: ${audioUrl}`);
  console.log('  Prompt: "Speak in a calm, soothing voice."\n');

  // For STS, the prompt attribute goes on <resemble:convert>, not on <speak>.
  const ssml =
    "<speak>" +
    `<resemble:convert src="${audioUrl}" prompt="Speak in a calm, soothing voice." />` +
    "</speak>";

  await synthesize(
    {
      voice_uuid: VOICE_UUID,
      data: ssml,
      sample_rate: SAMPLE_RATE,
      output_format: "wav",
    },
    "output_sts_prompted.wav"
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error("Error: set RESEMBLE_API_KEY environment variable before running.");
    process.exit(1);
  }
  if (!STS_AUDIO_URL) {
    console.error(
      "Error: set STS_AUDIO_URL environment variable to a publicly accessible\n" +
        "       audio URL (WAV, single speaker, under 50 MB / 300 seconds)."
    );
    process.exit(1);
  }

  console.log("Resemble AI -- Speech-to-Speech Quick Start\n");
  console.log("=".repeat(60));

  await runBasicSts(STS_AUDIO_URL);
  await runPromptedSts(STS_AUDIO_URL);

  console.log("=".repeat(60));
  console.log("Done. Audio files saved to the current directory.");
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
