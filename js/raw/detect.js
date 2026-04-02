/**
 * Resemble AI -- Deepfake Detection Quick Start
 *
 * Submit audio, video, or image files for AI-generated media detection.
 * This script demonstrates three workflows:
 *   1. Basic deepfake detection (real vs. fake classification)
 *   2. Detection with audio source tracing (identify which AI provider generated it)
 *   3. Detection with intelligence (AI-generated analysis of the media)
 *
 * Prerequisites:
 *     Node.js 18+ (uses native fetch)
 *
 * Usage:
 *     export RESEMBLE_API_KEY="your_api_key"
 *     export MEDIA_URL="https://example.com/audio.wav"
 *     node detect.js
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

async function pollForResult(uuid, { timeout = 120000, interval = 5000 } = {}) {
  const url = `${BASE_URL}/detect/${uuid}`;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const resp = await fetch(url, { headers: headers() });
    if (!resp.ok) {
      const text = await resp.text();
      console.error(`Error: GET /detect/${uuid} returned ${resp.status}: ${text}`);
      process.exit(1);
    }

    const { item } = await resp.json();
    const status = item.status || "unknown";

    if (status === "completed") return item;
    if (status === "failed") {
      console.error(`Error: detection failed: ${JSON.stringify(item, null, 2)}`);
      process.exit(1);
    }

    console.log(`  Status: ${status} -- retrying in ${interval / 1000}s`);
    await new Promise((r) => setTimeout(r, interval));
  }

  console.error("Error: polling timed out.");
  process.exit(1);
}

// ── Step 1: Basic deepfake detection ─────────────────────────────────────────

async function runBasicDetection(url) {
  console.log("Step 1: Basic deepfake detection");
  console.log(`  Submitting: ${url}\n`);

  const payload = {
    url,
    // Optional parameters (uncomment to use):
    // frame_length: 2,       // Analysis window size in seconds (1-4)
    // visualize: true,       // Generate a confidence heatmap image
    // start_region: 0.0,     // Analyze only a segment (seconds)
    // end_region: 10.0,
  };

  const data = await post("/detect", payload);
  const uuid = data.item.uuid;
  console.log(`  Detection submitted (uuid: ${uuid}). Polling for result...\n`);

  const result = await pollForResult(uuid);
  const metrics = result.metrics || {};

  console.log("  Result:");
  console.log(`    Label:            ${metrics.label ?? "N/A"}`);
  console.log(`    Aggregated score: ${metrics.aggregated_score ?? "N/A"}`);
  console.log();

  return result;
}

// ── Step 2: Detection with source tracing ────────────────────────────────────

async function runDetectionWithSourceTracing(url) {
  console.log("Step 2: Detection with audio source tracing");
  console.log(`  Submitting: ${url}\n`);

  const data = await post("/detect", { url, audio_source_tracing: true });
  const uuid = data.item.uuid;
  console.log(`  Detection submitted (uuid: ${uuid}). Polling for result...\n`);

  const result = await pollForResult(uuid);
  const metrics = result.metrics || {};
  const source = result.audio_source_tracing || {};

  console.log("  Result:");
  console.log(`    Label:            ${metrics.label ?? "N/A"}`);
  console.log(`    Aggregated score: ${metrics.aggregated_score ?? "N/A"}`);
  if (source.label) {
    console.log(`    Source tracing:   ${source.label}`);
  }
  if (source.error_message) {
    console.log(`    Source error:     ${source.error_message}`);
  }
  console.log();

  return result;
}

// ── Step 3: Detection with intelligence ──────────────────────────────────────

async function runDetectionWithIntelligence(url) {
  console.log("Step 3: Detection with intelligence");
  console.log(`  Submitting: ${url}\n`);

  const data = await post("/detect", { url, intelligence: true });
  const uuid = data.item.uuid;
  console.log(`  Detection submitted (uuid: ${uuid}). Polling for result...\n`);

  const result = await pollForResult(uuid);
  const metrics = result.metrics || {};
  const intelligence = result.intelligence || {};

  console.log("  Result:");
  console.log(`    Label:            ${metrics.label ?? "N/A"}`);
  console.log(`    Aggregated score: ${metrics.aggregated_score ?? "N/A"}`);
  if (intelligence.description) {
    console.log(`    Intelligence:     ${intelligence.description}`);
  }
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
    console.error("Error: set MEDIA_URL environment variable to a publicly accessible audio/video/image URL.");
    process.exit(1);
  }

  console.log("Resemble AI -- Deepfake Detection Quick Start\n");
  console.log("=".repeat(60));

  await runBasicDetection(MEDIA_URL);
  await runDetectionWithSourceTracing(MEDIA_URL);
  await runDetectionWithIntelligence(MEDIA_URL);

  console.log("=".repeat(60));
  console.log("Done. All three detection workflows completed.");
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
