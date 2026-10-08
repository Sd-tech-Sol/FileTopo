"""Fresh synthetic REAL_ROOT brain for the TASK-0054 WebView2 proof (F-050 / F-051).

One disposable root below the proof directory:

* ``large``  — 700 direct children: far more than the view budget, so the
  aggregate and its exact count are real;
* ``deep``   — a 7-level chain;
* ``mixed``  — folders and files together.

Every file is synthetic. No user data is read. The harness recomputes every
count it judges from this directory with its own walk, never from FileTopo.
"""

import json
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0054-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant
root = proof_root / "grand"
root.mkdir(parents=True, exist_ok=False)


def touch(rel: str) -> None:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("synthetic\n", encoding="utf-8")


for index in range(700):
    touch(f"large/f-{index:04d}.txt")
touch("deep/a/b/c/d/e/f/leaf.txt")
for index in range(30):
    touch(f"mixed/sub-{index % 5:02d}/x-{index:02d}.txt")
touch("racine-note.txt")

brains = state_root / "brains"
brains.mkdir(parents=True, exist_ok=False)
brain_id = "real-" + str(uuid.uuid4())
with sqlite3.connect(brains / "catalog.sqlite") as database:
    database.execute(
        """CREATE TABLE brains (
             brain_id TEXT PRIMARY KEY CHECK(length(brain_id) > 0),
             display_name TEXT NOT NULL CHECK(length(trim(display_name)) > 0),
             color TEXT NOT NULL CHECK(length(color) = 7 AND substr(color, 1, 1) = '#'),
             icon TEXT NOT NULL CHECK(length(icon) > 0),
             source_kind TEXT NOT NULL CHECK(source_kind IN ('SYNTHETIC_FIXTURE', 'REAL_ROOT')),
             source_ref TEXT NOT NULL CHECK(length(source_ref) > 0),
             source_label TEXT NOT NULL CHECK(length(trim(source_label)) > 0),
             source_path BLOB,
             position INTEGER NOT NULL,
             CHECK ((source_kind = 'REAL_ROOT') = (source_path IS NOT NULL))
           )"""
    )
    database.execute("CREATE TABLE catalog_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    database.execute(
        "INSERT INTO brains VALUES (?,?,?,?,?,?,?,?,?)",
        (
            brain_id,
            "Grand arbre",
            "#2F6DA8",
            "A",
            "REAL_ROOT",
            str(uuid.uuid4()),
            root.name,
            str(root.resolve()).encode("utf-16-le"),
            1,
        ),
    )
    database.execute("INSERT INTO catalog_meta VALUES ('active_brain_id', ?)", (brain_id,))
    database.execute("INSERT INTO catalog_meta VALUES ('schema_version', '2')")
    database.execute("PRAGMA user_version=2")

print(json.dumps({"brain": brain_id, "root": str(root.resolve())}))
