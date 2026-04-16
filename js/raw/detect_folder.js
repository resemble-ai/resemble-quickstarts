/**
 * Resemble AI -- Batch Deepfake Detection with Secure Upload
 *
 * Walk a folder of local media files, upload each via the Secure Upload API,
 * run deepfake detection against the returned media token, and poll until each
 * job reaches a terminal state. Uploads and polling run concurrently so
 * batches of dozens/hundreds of files finish in practical wall-clock time
 * (and well within the 1-hour secure-upload token expiration).
 *
 * Non-media files and subdirectories are skipped. Per-file failures are
 * collected and reported in the final summary; the script never aborts early.
 *
 * Prerequisites:
 *     Node.js 18+ (uses native fetch, FormData, Blob)
 *
 * Usage:
 *     export RESEMBLE_API_KEY="your_api_key"
 *     node detect_folder.js <absolute-folder-path> [output-json-path]
 *
 * If [output-json-path] is omitted, results are written to `<folder>/results.json`.
 *
 * Find your API key at https://app.resemble.ai/hub/api
 */

const fs = require("fs");
const path = require("path");

// ── Configuration ────────────────────────────────────────────────────────────

const API_KEY = process.env.RESEMBLE_API_KEY || "";
const BASE_URL = "https://app.resemble.ai/api/v2";
const MAX_WORKERS = 4; // tune to your rate limit / upload bandwidth

// Extend with any audio/video/image extension you care about.
const MEDIA_EXTS = new Set([".wav", ".mp3", ".mp4", ".mov", ".png", ".jpg", ".jpeg"]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonHeaders() {
  return { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" };
}

function authOnlyHeaders() {
  // For multipart/form-data, fetch sets Content-Type (with boundary) itself.
  return { Authorization: `Bearer ${API_KEY}` };
}

async function pollForResult(uuid, { timeout = 600000, interval = 5000 } = {}) {
  const url = `${BASE_URL}/detect/${uuid}`;
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const resp = await fetch(url, { headers: jsonHeaders() });
    if (!resp.ok) {
      throw new Error(`GET /detect/${uuid} returned ${resp.status}: ${await resp.text()}`);
    }
    const { item } = await resp.json();
    const status = (item && item.status) || "unknown";
    if (status === "completed" || status === "failed") return item;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`polling timed out after ${timeout / 1000}s`);
}

function iterMediaFiles(folder) {
  return fs
    .readdirSync(folder)
    .sort()
    .map((name) => path.join(folder, name))
    .filter((full) => {
      try {
        return fs.statSync(full).isFile() && MEDIA_EXTS.has(path.extname(full).toLowerCase());
      } catch {
        return false;
      }
    });
}

// ── Step 1: Secure upload ────────────────────────────────────────────────────

async function secureUpload(filePath) {
  const buffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.append("file", new Blob([buffer]), path.basename(filePath));

  const resp = await fetch(`${BASE_URL}/secure_uploads`, {
    method: "POST",
    headers: authOnlyHeaders(),
    body: form,
  });
  if (!resp.ok) {
    throw new Error(`POST /secure_uploads returned ${resp.status}: ${await resp.text()}`);
  }
  const data = await resp.json();
  if (!data.token) throw new Error(`no token in secure upload response: ${JSON.stringify(data)}`);
  return data.token;
}

// ── Step 2: Submit detect using the media token ─────────────────────────────

async function submitDetect(mediaToken) {
  const payload = {
    media_token: mediaToken,
    // Prefer webhooks over polling for large batches:
    // callback_url: "https://your-server.example.com/resemble-webhook",
  };
  const resp = await fetch(`${BASE_URL}/detect`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    throw new Error(`POST /detect returned ${resp.status}: ${await resp.text()}`);
  }
  const data = await resp.json();
  const uuid = data && data.item && data.item.uuid;
  if (!uuid) throw new Error("no uuid in detect response");
  return uuid;
}

// ── Step 3: Process one file ─────────────────────────────────────────────────

async function processFile(filePath) {
  const token = await secureUpload(filePath);
  const uuid = await submitDetect(token);
  const result = await pollForResult(uuid);
  const status = (result && result.status) || "unknown";
  if (status !== "completed") {
    throw new Error(`detect job ${uuid} ended with status=${status}`);
  }
  return { file: filePath, detect: result };
}

// ── Concurrency ──────────────────────────────────────────────────────────────

async function runWithConcurrency(items, limit, fn) {
  const succeeded = [];
  const failed = [];
  const iter = items.entries();
  const worker = async () => {
    for (const [, item] of iter) {
      const name = path.basename(item);
      try {
        const record = await fn(item);
        succeeded.push(record);
        const metrics = (record.detect && record.detect.metrics) || {};
        console.log(
          `  [OK]  ${name}  label=${metrics.label ?? null}  score=${metrics.aggregated_score ?? null}`,
        );
      } catch (err) {
        failed.push({ file: item, error: err.message });
        console.log(`  [ERR] ${name}  ${err.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return { succeeded, failed };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error("Error: set RESEMBLE_API_KEY environment variable before running.");
    process.exit(1);
  }
  if (process.argv.length !== 3 && process.argv.length !== 4) {
    console.error(
      `Usage: node ${path.basename(process.argv[1])} ` +
        `<absolute-folder-path> [output-json-path]`,
    );
    process.exit(1);
  }
  const folder = process.argv[2];
  if (!path.isAbsolute(folder)) {
    console.error(`Error: folder path must be absolute (got: ${folder}).`);
    process.exit(1);
  }
  let stat;
  try {
    stat = fs.statSync(folder);
  } catch {
    console.error(`Error: not a directory: ${folder}`);
    process.exit(1);
  }
  if (!stat.isDirectory()) {
    console.error(`Error: not a directory: ${folder}`);
    process.exit(1);
  }

  const outputPath = process.argv[3] || path.join(folder, "results.json");

  const files = iterMediaFiles(folder);

  console.log("Resemble AI -- Batch Deepfake Detection with Secure Upload\n");
  console.log("=".repeat(60));
  console.log(`Folder:  ${folder}`);
  console.log(`Output:  ${outputPath}`);
  console.log(`Files:   ${files.length}`);
  console.log(`Workers: ${MAX_WORKERS}\n`);

  if (files.length === 0) {
    console.log("No media files to process.");
    return;
  }

  const { succeeded, failed } = await runWithConcurrency(files, MAX_WORKERS, processFile);

  fs.writeFileSync(outputPath, JSON.stringify({ folder, succeeded, failed }, null, 2));

  console.log();
  console.log("=".repeat(60));
  console.log(
    `Done. ${succeeded.length} succeeded, ${failed.length} failed (of ${files.length}).`,
  );
  console.log(`Results written to ${outputPath}`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
