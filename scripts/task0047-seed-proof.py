"""Fresh REAL_ROOT catalogue with TWO synthetic brains — TASK-0047.

`TASK-0047` audits the accessibility of the real runtime in the real WebView2 host: axe-core in FR/EN
and light/dark on every rich surface, a real keyboard walk, contrast, non-colour alternatives and
`prefers-reduced-motion`. It needs a folder-backed brain rich enough to open the journal, the
review queue and the duplicates explorer, and a second brain so the composition has something to add.

Two brains, generated here under the proof root and dying with it. Nothing is anybody's data.

* brain A ("Arbre Alix") reads a folder shaped to produce every surface: two files with identical
  content (exact duplicates, a deterministic relation), three files with consecutive trailing numbers
  (a `dre-v1` suggestion, hence the review queue), and a plain file. The harness adds one more file
  between two refreshes so the journal and the state of an element have something real to say.
* brain B ("Arbre Basile") reads a smaller folder plus one WIDE folder (120 files), so a bounded view
  shows an aggregate (« +N items ») whose keyboard operation the harness proves.

Same registration as `task0046-seed-proof.py`: written directly to a fresh sandbox variant's
catalogue. No root contains, or is contained by, the FileTopo state space — `DEC-0033` G.
"""

import json
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0047-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant

roots = {"alix": proof_root / "alix", "basile": proof_root / "basile"}
for root in roots.values():
    root.mkdir(parents=True, exist_ok=False)

written = 0


def touch(path: Path, content: str) -> None:
    global written
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    written += 1


# ---- brain A's folder -------------------------------------------------------------------
# Consecutive trailing numbers, same parent and extension, distinct content: `dre-v1` proposes.
for i in (1, 2, 3):
    touch(roots["alix"] / "docs" / f"report-{i}.txt", f"synthetic report number {i}\n")
# Identical bytes under two names: an exact-duplicate group and a deterministic relation.
touch(roots["alix"] / "docs" / "twin-a.txt", "identical synthetic content\n")
touch(roots["alix"] / "docs" / "twin-b.txt", "identical synthetic content\n")
touch(roots["alix"] / "notes" / "memo.txt", "synthetic memo\n")
touch(roots["alix"] / "readme.txt", "synthetic readme\n")

# ---- brain B's folder -------------------------------------------------------------------
for i in range(3):
    touch(roots["basile"] / "docs" / f"basile-{i}.txt", f"synthetic basile {i}\n")
touch(roots["basile"] / "basile-end.txt", "synthetic basile end\n")
# A wide folder: more direct children than one bounded view materializes (ORDINARY_MATERIAL_TARGET), so
# the map shows an "+N items" aggregate - the keyboard-operable custom widget of the map.
for i in range(1, 121):
    touch(roots["basile"] / "wide" / f"item-{i:03d}.txt", f"synthetic wide item {i}\n")

brains = state_root / "brains"
brains.mkdir(parents=True, exist_ok=False)
spec = [
    # key, brain id, name, colour, icon, source ref, root key, position
    ("a", "real-" + str(uuid.uuid4()), "Arbre Alix", "#2F6DA8", "▣", str(uuid.uuid4()), "alix", 4),
    ("b", "real-" + str(uuid.uuid4()), "Arbre Basile", "#A85D2F", "▤", str(uuid.uuid4()), "basile", 5),
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
            "rootAlix": str(roots["alix"].resolve()),
            "rootBasile": str(roots["basile"].resolve()),
            "seed": {s[0]: {"displayName": s[2], "color": s[3], "icon": s[4]} for s in spec},
            "entriesWritten": written,
        }
    )
)
