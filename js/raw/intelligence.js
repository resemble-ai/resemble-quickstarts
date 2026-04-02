/**
 * Resemble AI -- Media Intelligence Quick Start
 *
 * Analyze audio, video, or image files using AI to extract metadata:
 * speaker information, language, emotion, transcription, and more.
 *
 * This script demonstrates two modes:
 *   1. Plain-text analysis (free-form description)
 *   2. Structured JSON analysis (parsed fields)
 *
 * Note: Intelligence can also be triggered alongside deepfake detection
 * by setting intelligence=true on the detect endpoint (see detect.js).
 *
 * Prerequisites:
 *     Node.js 18+ (uses native fetch)
 *
 * Usage:
 *     export RESEMBLE_API_KEY="your_api_key"
 *     export MEDIA_URL="https://example.com/audio.wav"
 *     node intelligence.js
 *
 * Find your API key at https://app.resemble.ai/hub/api
 */

// ── Configuration ────────────────────────────────────────────────────────────

const API_KEY = process.env.RESEMBLE_API_KEY || "";
const MEDIA_URL = process.env.MEDIA_URL || "";
const BASE_URL = "https://app.resemble.ai/api/v2";

// ── Helpers ──────────────────────────────────────────────────────────────────

function headers() {
  return { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" };
}

async function post(endpoint, payload) {
  const resp = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error(`Error: POST ${endpoint} returned ${resp.status}: ${text}`);
    process.exit(1);
  }
  return resp.json();
}

// ── Step 1: Plain-text intelligence analysis ─────────────────────────────────

async function runTextAnalysis(url) {
  console.log("Step 1: Plain-text intelligence analysis");
  console.log(`  Submitting: ${url}\n`);

  const payload = {
    url,
    // Optional parameters (uncomment to use):
    // media_type: "audio",  // Explicitly set media type (auto-detected by default)
    // callback_url: "https://your-server.com/webhook",  // For async processing
  };

  const data = await post("/intelligence", payload);
  const item = data.item || {};

  console.log("  Result:");
  console.log(`    Description: ${item.description ?? "N/A"}`);
  console.log();

  return item;
}

// ── Step 2: Structured JSON intelligence analysis ────────────────────────────

async function runJsonAnalysis(url) {
  console.log("Step 2: Structured JSON intelligence analysis");
  console.log(`  Submitting: ${url}\n`);

  const data = await post("/intelligence", { url, json: true });
  const item = data.item || {};
  const description = item.description || {};

  console.log("  Result:");
  if (typeof description === "object") {
    for (const [key, value] of Object.entries(description)) {
      const display = typeof value === "object" ? JSON.stringify(value, null, 2) : value;
      console.log(`    ${key}: ${display}`);
    }
  } else {
    console.log(`    ${description}`);
  }
  console.log();

  return item;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error("Error: set RESEMBLE_API_KEY environment variable before running.");
    process.exit(1);
  }
  if (!MEDIA_URL) {
    console.error("Error: set MEDIA_URL environment variable to a publicly accessible audio/video/image URL.");
    process.exit(1);
  }

  console.log("Resemble AI -- Media Intelligence Quick Start\n");
  console.log("=".repeat(60));

  await runTextAnalysis(MEDIA_URL);
  await runJsonAnalysis(MEDIA_URL);

  console.log("=".repeat(60));
  console.log("Done. Both intelligence analysis modes completed.");
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
