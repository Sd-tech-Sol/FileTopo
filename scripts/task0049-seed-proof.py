"""Create the one synthetic REAL_ROOT brain used by TASK-0049's WebView2 proof."""

import json
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0049-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant
source_root = proof_root / "real-root"
source_root.mkdir(parents=True, exist_ok=False)

for name in ("a.txt", "b.txt", "c.txt", "d.txt"):
    (source_root / name).write_text(f"synthetic {name}\n", encoding="utf-8")
(source_root / "excluded").mkdir()
(source_root / "excluded" / "hidden.txt").write_text("excluded synthetic\n", encoding="utf-8")

brain_id = "real-" + str(uuid.uuid4())
brains = state_root / "brains"
brains.mkdir(parents=True, exist_ok=False)
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
            "Reconstructibilite",
            "#2F6DA8",
            "▣",
            "REAL_ROOT",
            str(uuid.uuid4()),
            source_root.name,
            str(source_root.resolve()).encode("utf-16-le"),
            1,
        ),
    )
    database.execute("INSERT INTO catalog_meta VALUES ('active_brain_id', ?)", (brain_id,))
    database.execute("INSERT INTO catalog_meta VALUES ('schema_version', '2')")
    database.execute("PRAGMA user_version=2")

print(
    json.dumps(
        {
            "brainId": brain_id,
            "sourceRoot": str(source_root.resolve()),
            "stateRoot": str(state_root.resolve()),
        }
    )
)
