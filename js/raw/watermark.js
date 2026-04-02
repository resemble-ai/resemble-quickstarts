/**
 * Resemble AI -- Audio Watermarking Quick Start
 *
 * Apply invisible watermarks to audio files and detect them later.
 * Watermarks survive common transformations (compression, re-encoding)
 * and can be used for provenance tracking.
 *
 * This script demonstrates two workflows:
 *   1. Applying a watermark to an audio file
 *   2. Detecting a watermark in an audio file
 *
 * Prerequisites:
 *     Node.js 18+ (uses native fetch)
 *
 * Usage:
 *     export RESEMBLE_API_KEY="your_api_key"
 *     export MEDIA_URL="https://example.com/audio.wav"
 *     node watermark.js
 *
 * Find your API key at https://app.resemble.ai/hub/api
 */

// ── Configuration ────────────────────────────────────────────────────────────

const API_KEY = process.env.RESEMBLE_API_KEY || "";
const MEDIA_URL = process.env.MEDIA_URL || "";
const BASE_URL = "https://app.resemble.ai/api/v2";

// ── Helpers ──────────────────────────────────────────────────────────────────

function headers({ preferWait = false } = {}) {
  const h = { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" };
  if (preferWait) h["Prefer"] = "wait";
  return h;
}

async function post(endpoint, payload, { preferWait = false } = {}) {
  const resp = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: headers({ preferWait }),
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error(`Error: POST ${endpoint} returned ${resp.status}: ${text}`);
    process.exit(1);
  }
  return resp.json();
}

// ── Step 1: Apply watermark ──────────────────────────────────────────────────

async function applyWatermark(url) {
  console.log("Step 1: Apply watermark");
  console.log(`  Submitting: ${url}\n`);

  const payload = {
    url,
    // Optional parameters for image/video (ignored for audio):
    // strength: 0.2,            // Watermark strength (0.0-1.0)
    // custom_message: "my-tag", // Embed a custom message
  };

  // The "Prefer: wait" header makes the request synchronous --
  // the server blocks until the watermarked file is ready.
  // Without it, you would need to poll GET /watermark/apply/{uuid}/result.
  const data = await post("/watermark/apply", payload, { preferWait: true });
  const result = data.item || {};
  const watermarkedUrl = result.watermarked_media;

  console.log("  Result:");
  console.log(`    Media type:      ${result.media_type ?? "N/A"}`);
  console.log(`    Watermarked URL: ${watermarkedUrl}`);
  console.log();

  return watermarkedUrl;
}

// ── Step 2: Detect watermark ─────────────────────────────────────────────────

async function detectWatermark(url) {
  console.log("Step 2: Detect watermark");
  console.log(`  Submitting: ${url}\n`);

  const payload = {
    url,
    // custom_message: "my-tag",  // Must match the message used during apply
  };

  const data = await post("/watermark/detect", payload, { preferWait: true });
  const result = data.item || {};
  const metrics = result.metrics || {};

  console.log("  Result:");
  const hasWatermark = typeof metrics.has_watermark === "object"
    ? JSON.stringify(metrics.has_watermark)
    : metrics.has_watermark;
  console.log(`    Has watermark: ${hasWatermark ?? "N/A"}`);
  console.log(`    Confidence:    ${metrics.confidence ?? "N/A"}`);
  console.log();

  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error("Error: set RESEMBLE_API_KEY environment variable before running.");
    process.exit(1);
  }
  if (!MEDIA_URL) {
    console.error("Error: set MEDIA_URL environment variable to a publicly accessible audio URL.");
    process.exit(1);
  }

  console.log("Resemble AI -- Audio Watermarking Quick Start\n");
  console.log("=".repeat(60));

  const watermarkedUrl = await applyWatermark(MEDIA_URL);

  if (watermarkedUrl) {
    await detectWatermark(watermarkedUrl);
  } else {
    console.log("  Skipping detection: no watermarked URL returned.");
  }

  console.log("=".repeat(60));
  console.log("Done. Watermark apply and detect workflows completed.");
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
