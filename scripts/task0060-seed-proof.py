"""Fresh synthetic REAL_ROOT brain for the TASK-0060 primary-chrome campaign (Stage B / B03).

One disposable root below the proof directory, shaped so the chrome actually has
something to lay out around at 960x640:

* ``archives`` — 120 direct children, far past the view budget, so an aggregate
  indicator and its exact omitted count are real (``P-02``);
* ``profond``  — a 6-level chain, so hierarchy edges exist at several depths
  (``P-05``);
* ``melange``  — folders and files together, with deliberately long names, so a
  details panel row and a card label have real text to wrap or truncate;
* two root-level notes.

Every byte is synthetic. No user data is read, nothing is written outside the
repository sandbox, and the harness recomputes from this directory any count it
judges instead of believing FileTopo.

Deliberately the SAME tree as ``scripts/task0058-seed-proof.py`` and
``scripts/task0059-seed-proof.py``, under its own ``task0060-`` variant: `B03`
compares a before and an after of the same chrome, and a different fixture would
change the thing measured at the same time as the interface. The `B01` and `B02`
witnesses are left untouched beside it.
"""

import json
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0060-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant
root = proof_root / "atelier-synthetique"
root.mkdir(parents=True, exist_ok=False)


def touch(rel: str) -> None:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("synthetic\n", encoding="utf-8")


for index in range(120):
    touch(f"archives/piece-{index:04d}.txt")
touch("profond/a/b/c/d/e/feuille.txt")
for index in range(24):
    touch(f"melange/sous-dossier-{index % 4:02d}/document-de-travail-tres-long-{index:02d}.txt")
touch("melange/sous-dossier-00/note-avec-un-nom-deliberement-long-pour-le-panneau.txt")
touch("racine-note.txt")
touch("deuxieme-note-de-racine.txt")

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
            "Atelier synthetique",
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
