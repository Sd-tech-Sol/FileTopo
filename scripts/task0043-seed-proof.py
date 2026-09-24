"""Fresh REAL_ROOT catalogue with TWO synthetic trees — TASK-0043.

`TASK-0043` proves, in the real WebView2 host, that the **automatic watcher** keeps a
brain's Index in step with a source that changes *outside* the process — with no click
on Actualiser — and that a source which leaves is an observation, never a batch of
deletions.

Two brains, two trees, both generated here under the proof root and dying with it.
Nothing is anybody's data:

* `t/` — brain A, the brain the person looks at. A **large unrelated branch**
  (`gros/`, 1 500 files) beside a small one (`dossier/`), so a change deep in the small
  branch is not a reason to walk the large one;
* `u/` — brain B, a small second brain, to prove two watchers never bleed into each other.

The registration is written directly to a fresh sandbox variant's catalogue, exactly as
`task0042-seed-proof.py` established. Neither root contains, or is contained by, the
FileTopo state space — `DEC-0033` G.
"""

import json
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0043-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant

root_a = proof_root / "t"
root_b = proof_root / "u"
root_a.mkdir(parents=True, exist_ok=False)
root_b.mkdir(parents=True, exist_ok=False)

written = 0


def touch(path: Path, content: str) -> None:
    global written
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    written += 1


# ---- brain A --------------------------------------------------------------------
touch(root_a / "a-modifier.txt", "synthetique — avant\n")
touch(root_a / "a-supprimer.txt", "synthetique — sera supprime\n")
for i in range(3):
    touch(root_a / f"stable-{i}.txt", f"synthetique stable {i}\n")
touch(root_a / "dossier" / "enfant.txt", "synthetique enfant\n")
touch(root_a / "dossier" / "sous" / "profond.txt", "synthetique profond\n")
touch(root_a / "dossier" / "sous" / "autre.txt", "synthetique autre\n")
(root_a / "vide").mkdir()
# The large unrelated branch.
for group in range(20):
    for file in range(75):
        touch(root_a / "gros" / f"g{group:02d}" / f"f{file:03d}.txt", "grand\n")

# ---- brain B --------------------------------------------------------------------
touch(root_b / "docs" / "a.txt", "synthetique B a\n")
touch(root_b / "docs" / "b.txt", "synthetique B b\n")
touch(root_b / "archive" / "x.txt", "synthetique B x\n")

brains = state_root / "brains"
brains.mkdir(parents=True, exist_ok=False)
brain_a = "real-" + str(uuid.uuid4())
brain_b = "real-" + str(uuid.uuid4())
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
    for brain_id, name, color, icon, root, position in (
        (brain_a, "Arbre surveille", "#2F6DA8", "▣", root_a, 4),
        (brain_b, "Second arbre", "#A85D2F", "▤", root_b, 5),
    ):
        db.execute(
            "INSERT INTO brains VALUES (?,?,?,?,?,?,?,?,?)",
            (
                brain_id,
                name,
                color,
                icon,
                "REAL_ROOT",
                str(uuid.uuid4()),
                root.name,
                str(root.resolve()).encode("utf-16-le"),
                position,
            ),
        )
    db.execute("INSERT INTO catalog_meta VALUES ('active_brain_id', ?)", (brain_a,))
    db.execute("INSERT INTO catalog_meta VALUES ('schema_version', '2')")
    db.execute("PRAGMA user_version=2")

print(
    json.dumps(
        {
            "brainA": brain_a,
            "rootA": str(root_a.resolve()),
            "brainB": brain_b,
            "rootB": str(root_b.resolve()),
            "entriesWritten": written,
        }
    )
)
