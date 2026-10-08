"""Collect the TASK-0054 Rust scale evidence into one public, path-free artifact.

Run after:

    cargo test --lib scale_closure_tests -- --include-ignored --test-threads=1

The tests write one small JSON file per measurement under
``.filetopo-sandbox/task0054`` (git-ignored). This script folds them, together
with the exact HEAD that was tested and the pass/fail line of every test, into
``docs/performance/runs/TASK-0054-scale-rust.json``. Nothing here reads user
data: every corpus is synthetic and exists only as indexed rows.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
sandbox = repository / ".filetopo-sandbox"
measurements = {}
for path in sorted((sandbox / "task0054").glob("*.json")):
    entry = json.loads(path.read_text(encoding="utf-8"))
    measurements[entry.pop("id")] = entry

log = (sandbox / "task0054-rust-final.log").read_text(encoding="utf-8", errors="replace")
tests = re.findall(r"^test (\S+) \.\.\. (ok|FAILED|ignored)", log, flags=re.MULTILINE)
summary = re.findall(r"^test result: .*$", log, flags=re.MULTILINE)
if not summary or "FAILED" in summary[-1] or any(status != "ok" for _, status in tests):
    sys.exit("the Rust run is not a clean pass; no artifact is written")

tested = (sandbox / "task0054-rust-head.txt").read_text(encoding="utf-8").strip()
head = subprocess.run(
    ["git", "rev-parse", "HEAD"], cwd=repository, capture_output=True, text=True, check=True
).stdout.strip()
product_changes = subprocess.run(
    ["git", "diff", "--name-only", tested, "HEAD", "--", "src-tauri/src", "src"],
    cwd=repository, capture_output=True, text=True, check=True,
).stdout.split()
if product_changes:
    sys.exit(f"product files changed since the tested HEAD: {product_changes}")

webview = json.loads(
    (repository / "docs/performance/runs/TASK-0054-webview2.json").read_text(encoding="utf-8-sig")
)
artifact = {
    "task": "TASK-0054",
    "headTested": tested,
    "classification": "DEVELOPMENT_BENCH_ENGINEERING_EVIDENCE",
    "method": (
        "Synthetic INDEXED corpora written straight through the canonical Index writer "
        "(BrainIndex::replace); no physical file at 10k/100k/1M. The oracle is the corpus' own "
        "parent links and child counts, never the product's. Search/focus/pagination go through "
        "the product's own primitives."
    ),
    "machine": webview["machine"],
    "command": "cargo test --lib scale_closure_tests -- --include-ignored --test-threads=1",
    "result": summary[-1],
    "tests": [{"name": name.split("::")[-1], "status": status} for name, status in tests],
    "measurements": measurements,
    "notTested": [
        "No latency SLA is claimed: times are engineering evidence on a workstation more powerful than the modest-laptop target.",
        "Memory per process was not measured by this harness.",
        "A focus whose ancestry reaches the material budget is refused with a fixed error (see limits in the report).",
    ],
}
text = json.dumps(artifact, indent=2, ensure_ascii=False)
for forbidden in (str(repository), str(Path.home()), Path.home().name):
    assert forbidden not in text, "a local path or user name would leak into the artifact"
(repository / "docs/performance/runs/TASK-0054-scale-rust.json").write_text(text + "\n", encoding="utf-8")
print(f"TASK-0054 Rust evidence written; tested {tested[:12]}, HEAD {head[:12]}, {len(tests)} tests")
