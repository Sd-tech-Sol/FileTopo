"""Fresh REAL_ROOT catalogue with ONE small real tree — TASK-0042.

`TASK-0042` proves, in the real WebView2 host, that a source which becomes
unavailable is an **observation** and never a batch of deletions: the folder is
moved away from its path **by the harness, outside the running process**, the
real `Actualiser` fails cleanly, the map that was loaded stays on screen, the
badge says `UNAVAILABLE`, a REAL process restart still finds the same map and the
same observation with the source still absent, and the very same folder put back
synchronises again without a single invented event.

The tree is generated here, under the proof root, and dies with it. Nothing is
anybody's data. The registration is written directly to a fresh sandbox variant's
catalogue, exactly as `task0041-seed-proof.py` established.
"""

import json
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0042-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant

# A sibling of the FileTopo state space, never an ancestor or a descendant of it
# — `DEC-0033` G's containment rule.
root = proof_root / "t"
root.mkdir(parents=True, exist_ok=False)

written = 0


def touch(path: Path, content: str) -> None:
    global written
    path.write_text(content, encoding="utf-8")
    written += 1


touch(root / "a-modifier.txt", "synthetique — avant\n")
touch(root / "a-supprimer.txt", "synthetique — sera supprime\n")
for i in range(3):
    touch(root / f"stable-{i}.txt", f"synthetique stable {i}\n")
(root / "dossier" / "sous").mkdir(parents=True)
touch(root / "dossier" / "enfant.txt", "synthetique enfant\n")
touch(root / "dossier" / "sous" / "profond.txt", "synthetique profond\n")
(root / "vide").mkdir()

brains = state_root / "brains"
brains.mkdir(parents=True, exist_ok=False)
brain_id = "real-" + str(uuid.uuid4())
with sqlite3.connect(brains / "catalog.sqlite") as db:
    db.execute(
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
    db.execute("CREATE TABLE catalog_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    db.execute(
        "INSERT INTO brains VALUES (?,?,?,?,?,?,?,?,?)",
        (
            brain_id,
            "Arbre de disponibilite",
            "#2F6DA8",
            "▣",
            "REAL_ROOT",
            str(uuid.uuid4()),
            root.name,
            str(root.resolve()).encode("utf-16-le"),
            4,
        ),
    )
    db.execute("INSERT INTO catalog_meta VALUES ('active_brain_id', ?)", (brain_id,))
    db.execute("INSERT INTO catalog_meta VALUES ('schema_version', '2')")
    db.execute("PRAGMA user_version=2")

print(
    json.dumps(
        {
            "brainId": brain_id,
            "absolutePath": str(root.resolve()),
            "entriesWritten": written,
        }
    )
)
