/**
 * Resemble AI -- Synchronous Text-to-Speech Quick Start
 *
 * Generate speech from text using the synchronous synthesis endpoint.
 * The server returns the complete audio in a single response as base64.
 *
 * This script demonstrates four capabilities:
 *   1. Basic synthesis (default Chatterbox model)
 *   2. Model selection (Chatterbox-Turbo for lower latency)
 *   3. Prompting (control delivery style with a text prompt)
 *   4. Localization (switch languages mid-utterance with SSML)
 *
 * Prerequisites:
 *     Node.js 18+ (uses native fetch)
 *
 * Usage:
 *     export RESEMBLE_API_KEY="your_api_key"
 *     node synthesize.js
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

// ── Step 1: Basic synthesis ──────────────────────────────────────────────────

async function runBasic() {
  console.log("Step 1: Basic synthesis (Chatterbox)");
  console.log('  Text: "Hello! Welcome to Resemble AI."\n');

  await synthesize(
    {
      voice_uuid: VOICE_UUID,
      data: "Hello! Welcome to Resemble AI.",
      sample_rate: SAMPLE_RATE,
      output_format: "wav",
    },
    "output_basic.wav"
  );
}

// ── Step 2: Model selection (Turbo) ──────────────────────────────────────────

async function runTurbo() {
  console.log("Step 2: Turbo model (lower latency)");
  console.log('  Text: "This is synthesized with Chatterbox-Turbo for faster delivery."\n');

  await synthesize(
    {
      voice_uuid: VOICE_UUID,
      data: "This is synthesized with Chatterbox-Turbo for faster delivery.",
      model: "chatterbox-turbo",
      sample_rate: SAMPLE_RATE,
      output_format: "wav",
    },
    "output_turbo.wav"
  );
}

// ── Step 3: Prompting ────────────────────────────────────────────────────────

async function runPrompting() {
  console.log("Step 3: Prompting (control delivery style)");
  console.log("  Using a prompt to steer the voice toward an excited tone.\n");

  const ssml =
    '<speak prompt="Speak with excitement, like announcing a big surprise">' +
    "You just won a brand new car! Congratulations!" +
    "</speak>";

  await synthesize(
    {
      voice_uuid: VOICE_UUID,
      data: ssml,
      sample_rate: SAMPLE_RATE,
      output_format: "wav",
    },
    "output_prompted.wav"
  );
}

// ── Step 4: Localization ─────────────────────────────────────────────────────

async function runLocalization() {
  console.log("Step 4: Localization (switch languages mid-utterance)");
  console.log("  Mixing English and Spanish using the <lang> SSML tag.\n");

  const ssml =
    "<speak>" +
    'Your flight to <lang xml:lang="es-es">Ciudad de México</lang> ' +
    "departs in thirty minutes." +
    "</speak>";

  await synthesize(
    {
      voice_uuid: VOICE_UUID,
      data: ssml,
      sample_rate: SAMPLE_RATE,
      output_format: "wav",
    },
    "output_localized.wav"
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error("Error: set RESEMBLE_API_KEY environment variable before running.");
    process.exit(1);
  }

  console.log("Resemble AI -- Synchronous TTS Quick Start\n");
  console.log("=".repeat(60));

  await runBasic();
  await runTurbo();
  await runPrompting();
  await runLocalization();

  console.log("=".repeat(60));
  console.log("Done. Audio files saved to the current directory.");
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
