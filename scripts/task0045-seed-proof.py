"""Fresh REAL_ROOT catalogue with THREE synthetic brains, two of them on ONE source — TASK-0045.

`TASK-0045` proves, in the real WebView2 host, that the identity editor changes the name,
the colour and the icon of **one** brain and nothing else, and that the change survives a REAL
close and relaunch of the process.

Three brains, all generated here under the proof root and dying with it. Nothing is anybody's
data. They are shaped on purpose:

* brain A and brain C read the **same folder** (same `source_ref`, same `source_path`) and
  differ only in identity — the shape `TASK-0018` froze, the one an edit must not cross;
* brain B reads a different, smaller folder;
* every brain already has its own name, colour and icon, and A / C differ from each other.

The registration is written directly to a fresh sandbox variant's catalogue, exactly as
`task0044-seed-proof.py` established. No root contains, or is contained by, the FileTopo
state space — `DEC-0033` G.
"""

import json
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0045-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant

roots = {"shared": proof_root / "shared", "solo": proof_root / "solo"}
for root in roots.values():
    root.mkdir(parents=True, exist_ok=False)

written = 0


def touch(path: Path, content: str) -> None:
    global written
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    written += 1


# ---- the shared folder (brains A and C) ------------------------------------------------
for i in range(8):
    touch(roots["shared"] / "docs" / f"partage-{i}.txt", f"synthetique partage {i}\n")
for i in range(3):
    touch(roots["shared"] / "notes" / f"note-{i}.txt", f"synthetique note {i}\n")
touch(roots["shared"] / "fin.txt", "synthetique fin\n")

# ---- the solo folder (brain B) ---------------------------------------------------------
for i in range(5):
    touch(roots["solo"] / "docs" / f"solo-{i}.txt", f"synthetique solo {i}\n")
touch(roots["solo"] / "solo-fin.txt", "synthetique solo fin\n")

brains = state_root / "brains"
brains.mkdir(parents=True, exist_ok=False)
shared_ref = str(uuid.uuid4())
solo_ref = str(uuid.uuid4())
spec = [
    # key, brain id, name, colour, icon, source ref, root key, position
    ("a", "real-" + str(uuid.uuid4()), "Arbre Alix", "#2F6DA8", "▣", shared_ref, "shared", 4),
    ("b", "real-" + str(uuid.uuid4()), "Arbre Basile", "#A85D2F", "▤", solo_ref, "solo", 5),
    ("c", "real-" + str(uuid.uuid4()), "Arbre Camille", "#3E6B2A", "▥", shared_ref, "shared", 6),
]
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
    for _key, brain_id, display, color, icon, source_ref, root_key, position in spec:
        db.execute(
            "INSERT INTO brains VALUES (?,?,?,?,?,?,?,?,?)",
            (
                brain_id,
                display,
                color,
                icon,
                "REAL_ROOT",
                source_ref,
                roots[root_key].name,
                str(roots[root_key].resolve()).encode("utf-16-le"),
                position,
            ),
        )
    db.execute("INSERT INTO catalog_meta VALUES ('active_brain_id', ?)", (spec[0][1],))
    db.execute("INSERT INTO catalog_meta VALUES ('schema_version', '2')")
    db.execute("PRAGMA user_version=2")

print(
    json.dumps(
        {
            "brainA": spec[0][1],
            "brainB": spec[1][1],
            "brainC": spec[2][1],
            "rootShared": str(roots["shared"].resolve()),
            "rootSolo": str(roots["solo"].resolve()),
            "seed": {s[0]: {"displayName": s[2], "color": s[3], "icon": s[4]} for s in spec},
            "entriesWritten": written,
        }
    )
)
