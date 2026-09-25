"""Fresh REAL_ROOT catalogue with THREE synthetic trees — TASK-0044.

`TASK-0044` proves, in the real WebView2 host, that a brain reopens **where it was left**
— branch, selection, filter, camera, details panel — from its OWN record in the catalogue,
across a brain switch and across a REAL close and relaunch of the process.

Three brains, three trees, all generated here under the proof root and dying with it.
Nothing is anybody's data. They are shaped on purpose:

* every root has a `docs/` directory that is its first entry, so `docs` carries the
  **same numeric node id in all three brains** — the trap the proof must not fall in:
  one brain's record can never select or focus another brain's `docs`;
* `x/docs` holds 200 files (a FILE filter spans several pages, the third page is a real
  page beyond the first), `y/` is small and deep, `z/salles` holds 90 directories (a
  DIRECTORY filter spans two pages).

The registration is written directly to a fresh sandbox variant's catalogue, exactly as
`task0043-seed-proof.py` established. No root contains, or is contained by, the FileTopo
state space — `DEC-0033` G.
"""

import json
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0044-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant

roots = {name: proof_root / name for name in ("x", "y", "z")}
for root in roots.values():
    root.mkdir(parents=True, exist_ok=False)

written = 0


def touch(path: Path, content: str) -> None:
    global written
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    written += 1


# ---- brain X : one big folder, a FILE filter spans several pages ---------------------
for i in range(200):
    touch(roots["x"] / "docs" / f"x-d-{i:03d}.txt", f"synthetique X {i}\n")
for i in range(5):
    touch(roots["x"] / "notes" / f"x-n-{i}.txt", f"synthetique X note {i}\n")
touch(roots["x"] / "x-fin.txt", "synthetique X fin\n")

# ---- brain Y : small and deep -------------------------------------------------------
for i in range(12):
    touch(roots["y"] / "docs" / f"y-d-{i:02d}.txt", f"synthetique Y {i}\n")
for i in range(3):
    touch(roots["y"] / "zdeep" / "a" / "b" / "c" / f"y-deep-{i}.txt", f"synthetique Y profond {i}\n")
touch(roots["y"] / "y-fin.txt", "synthetique Y fin\n")

# ---- brain Z : ninety directories, a DIRECTORY filter spans two pages ------------------
for i in range(6):
    touch(roots["z"] / "docs" / f"z-d-{i}.txt", f"synthetique Z {i}\n")
for i in range(90):
    touch(roots["z"] / "salles" / f"s-{i:03d}" / "z-f.txt", f"synthetique Z salle {i}\n")
touch(roots["z"] / "z-fin.txt", "synthetique Z fin\n")

brains = state_root / "brains"
brains.mkdir(parents=True, exist_ok=False)
ids = {name: "real-" + str(uuid.uuid4()) for name in roots}
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
    for name, display, color, icon, position in (
        ("x", "Arbre Xavier", "#2F6DA8", "▣", 4),
        ("y", "Arbre Yvon", "#A85D2F", "▤", 5),
        ("z", "Arbre Zoe", "#3E6B2A", "▥", 6),
    ):
        db.execute(
            "INSERT INTO brains VALUES (?,?,?,?,?,?,?,?,?)",
            (
                ids[name],
                display,
                color,
                icon,
                "REAL_ROOT",
                str(uuid.uuid4()),
                roots[name].name,
                str(roots[name].resolve()).encode("utf-16-le"),
                position,
            ),
        )
    db.execute("INSERT INTO catalog_meta VALUES ('active_brain_id', ?)", (ids["x"],))
    db.execute("INSERT INTO catalog_meta VALUES ('schema_version', '2')")
    db.execute("PRAGMA user_version=2")

print(
    json.dumps(
        {
            "brainX": ids["x"],
            "rootX": str(roots["x"].resolve()),
            "brainY": ids["y"],
            "rootY": str(roots["y"].resolve()),
            "brainZ": ids["z"],
            "rootZ": str(roots["z"].resolve()),
            "displayNames": {"x": "Arbre Xavier", "y": "Arbre Yvon", "z": "Arbre Zoe"},
            "entriesWritten": written,
        }
    )
)
