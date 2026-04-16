"""
Resemble AI -- Batch Deepfake Detection with Secure Upload

Walk a folder of local media files, upload each via the Secure Upload API,
run deepfake detection against the returned media token, and poll until each
job reaches a terminal state. Uploads and polling run concurrently so batches
of dozens/hundreds of files finish in practical wall-clock time (and well
within the 1-hour secure-upload token expiration).

Non-media files and subdirectories are skipped. Per-file failures are
collected and reported in the final summary; the script never aborts early.

Prerequisites:
    pip install requests

Usage:
    export RESEMBLE_API_KEY="your_api_key"
    python detect_folder.py <absolute-folder-path> [output-json-path]

If `output-json-path` is omitted, results are written to `<folder>/results.json`.

Find your API key at https://app.resemble.ai/hub/api
"""

import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

# ── Configuration ─────────────────────────────────────────────────────────────

API_KEY = os.environ.get("RESEMBLE_API_KEY", "")
BASE_URL = "https://app.resemble.ai/api/v2"
MAX_WORKERS = 4  # tune to your rate limit / upload bandwidth

# Extend with any audio/video/image extension you care about.
MEDIA_EXTS = {".wav", ".mp3", ".mp4", ".mov", ".png", ".jpg", ".jpeg"}

# ── Helpers ───────────────────────────────────────────────────────────────────


def json_headers() -> dict:
    return {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}


def auth_only_headers() -> dict:
    # For multipart/form-data, requests sets Content-Type (with boundary) itself.
    return {"Authorization": f"Bearer {API_KEY}"}


def poll_for_result(uuid: str, timeout: int = 600, interval: int = 5) -> dict:
    """Poll GET /detect/{uuid} until the job reaches a terminal state."""
    url = f"{BASE_URL}/detect/{uuid}"
    deadline = time.time() + timeout
    while time.time() < deadline:
        resp = requests.get(url, headers=json_headers())
        if not resp.ok:
            raise RuntimeError(f"GET /detect/{uuid} returned {resp.status_code}: {resp.text}")
        item = resp.json().get("item", {})
        status = item.get("status", "unknown")
        if status in ("completed", "failed"):
            return item
        time.sleep(interval)
    raise RuntimeError(f"polling timed out after {timeout}s")


def iter_media_files(folder: str):
    """Yield absolute paths of media files directly inside `folder`, sorted."""
    for name in sorted(os.listdir(folder)):
        full = os.path.join(folder, name)
        if not os.path.isfile(full):
            continue
        if os.path.splitext(name)[1].lower() not in MEDIA_EXTS:
            continue
        yield full


# ── Step 1: Secure upload ─────────────────────────────────────────────────────


def secure_upload(path: str) -> str:
    """Upload a local file to the Secure Upload API and return its media_token."""
    with open(path, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/secure_uploads",
            headers=auth_only_headers(),
            files={"file": (os.path.basename(path), f)},
        )
    if not resp.ok:
        raise RuntimeError(f"POST /secure_uploads returned {resp.status_code}: {resp.text}")
    token = resp.json().get("token")
    if not token:
        raise RuntimeError(f"no token in secure upload response: {resp.text}")
    return token


# ── Step 2: Submit detect using the media token ──────────────────────────────


def submit_detect(media_token: str) -> str:
    """Submit a detect job referencing a secure-upload token and return the uuid."""
    payload = {
        "media_token": media_token,
        # Prefer webhooks over polling for large batches:
        # "callback_url": "https://your-server.example.com/resemble-webhook",
    }
    resp = requests.post(f"{BASE_URL}/detect", headers=json_headers(), json=payload)
    if not resp.ok:
        raise RuntimeError(f"POST /detect returned {resp.status_code}: {resp.text}")
    uuid = resp.json().get("item", {}).get("uuid")
    if not uuid:
        raise RuntimeError("no uuid in detect response")
    return uuid


# ── Step 3: Process one file ─────────────────────────────────────────────────


def process_file(path: str) -> dict:
    """Upload, submit, and poll one file. Returns a record with the full detect response."""
    token = secure_upload(path)
    uuid = submit_detect(token)
    result = poll_for_result(uuid)
    status = result.get("status", "unknown")
    if status != "completed":
        raise RuntimeError(f"detect job {uuid} ended with status={status}")
    return {"file": path, "detect": result}


# ── Main ──────────────────────────────────────────────────────────────────────


def main():
    if not API_KEY:
        sys.exit("Error: set RESEMBLE_API_KEY environment variable before running.")
    if len(sys.argv) not in (2, 3):
        sys.exit(
            f"Usage: python {os.path.basename(sys.argv[0])} "
            f"<absolute-folder-path> [output-json-path]"
        )
    folder = sys.argv[1]
    if not os.path.isabs(folder):
        sys.exit(f"Error: folder path must be absolute (got: {folder}).")
    if not os.path.isdir(folder):
        sys.exit(f"Error: not a directory: {folder}")

    output_path = sys.argv[2] if len(sys.argv) == 3 else os.path.join(folder, "results.json")

    files = list(iter_media_files(folder))

    print("Resemble AI -- Batch Deepfake Detection with Secure Upload\n")
    print("=" * 60)
    print(f"Folder:  {folder}")
    print(f"Output:  {output_path}")
    print(f"Files:   {len(files)}")
    print(f"Workers: {MAX_WORKERS}\n")

    if not files:
        print("No media files to process.")
        return

    succeeded: list[dict] = []
    failed: list[dict] = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        future_to_path = {pool.submit(process_file, p): p for p in files}
        for future in as_completed(future_to_path):
            path = future_to_path[future]
            name = os.path.basename(path)
            try:
                record = future.result()
                succeeded.append(record)
                metrics = (record["detect"].get("metrics") or {})
                print(
                    f"  [OK]  {name}  "
                    f"label={metrics.get('label')}  score={metrics.get('aggregated_score')}"
                )
            except Exception as e:
                failed.append({"file": path, "error": str(e)})
                print(f"  [ERR] {name}  {e}")

    with open(output_path, "w") as f:
        json.dump(
            {"folder": folder, "succeeded": succeeded, "failed": failed},
            f,
            indent=2,
        )

    print()
    print("=" * 60)
    print(f"Done. {len(succeeded)} succeeded, {len(failed)} failed (of {len(files)}).")
    print(f"Results written to {output_path}")


if __name__ == "__main__":
    main()
