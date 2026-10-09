"""Fresh synthetic REAL_ROOT catalogue of FOUR brains for the TASK-0061 campaign (Stage B / B04).

`B03` measured one brain. `TASK-0061` asks what the usual commands do when the composition
holds two, then three brains, with names long enough to wrap, a menu open and a notice on
screen. So this seed writes four disposable roots below the proof directory and registers
each as a REAL_ROOT brain in a fresh catalogue, exactly as `scripts/task0060-seed-proof.py`
registers one:

* ``A`` — ``Atelier synthetique``: the SAME tree as the B01..B03 fixture (120 archives, a
  6-level chain, long file names), so a mono-brain composition of A is the B03 baseline and
  ``P-02``/``P-05`` keep the aggregate they always had;
* ``B`` — a 60-character French name with accents and an em dash: the Unicode case;
* ``C`` — a 75-character English name, close to the product's 80-character ceiling
  (``MAX_DISPLAY_NAME`` in ``src-tauri/src/map/brains.rs``): the long-name case;
* ``D`` — a short name, registered and deliberately NEVER indexed: composing it is the safe
  way to raise the product's own "not indexed yet" notice, and it gives the composition menu
  something to list when two or three other brains are already displayed.

Every name, path and identifier is fictitious. Every byte is synthetic. Nothing is read from
a user folder, and nothing is written outside the repository sandbox. The harness recomputes
from these directories any count it judges instead of believing FileTopo.
"""

import json
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0061-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant


def touch(root: Path, rel: str) -> None:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("synthetic\n", encoding="utf-8")


def small_tree(root: Path, tag: str) -> None:
    for index in range(14):
        touch(root, f"rapports-{tag}/piece-{index:03d}.txt")
    touch(root, f"profondeur-{tag}/a/b/c/feuille.txt")
    touch(root, f"note-{tag}.txt")


atelier = proof_root / "atelier-synthetique"
atelier.mkdir(parents=True, exist_ok=False)
for index in range(120):
    touch(atelier, f"archives/piece-{index:04d}.txt")
touch(atelier, "profond/a/b/c/d/e/feuille.txt")
for index in range(24):
    touch(atelier, f"melange/sous-dossier-{index % 4:02d}/document-de-travail-tres-long-{index:02d}.txt")
touch(atelier, "melange/sous-dossier-00/note-avec-un-nom-deliberement-long-pour-le-panneau.txt")
touch(atelier, "racine-note.txt")
touch(atelier, "deuxieme-note-de-racine.txt")

BRAINS = [
    # (folder, display name, colour, icon, indexed by the harness)
    ("atelier-synthetique", "Atelier synthetique", "#2F6DA8", "◆", True),
    ("etudes-comparees", "Dossier d'études comparées — étés, forêts, écoles numériques", "#B5651D", "▲", True),
    ("quarterly-reconciliation", "Synthetic Quarterly Reconciliation Workspace for Archive Verification Tests", "#2E7D32", "●", True),
    ("zeta", "Zeta", "#7B3FA0", "■", False),
]
assert len(BRAINS[1][1]) == 60, len(BRAINS[1][1])
assert len(BRAINS[2][1]) == 75, len(BRAINS[2][1])
assert all(len(name) <= 80 for _, name, *_ in BRAINS)

roots = {}
for folder, *_ in BRAINS:
    root = proof_root / folder
    if folder != "atelier-synthetique":
        root.mkdir(parents=True, exist_ok=False)
        small_tree(root, folder[:4])
    roots[folder] = root

brains = state_root / "brains"
brains.mkdir(parents=True, exist_ok=False)
records = []
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
    for position, (folder, name, color, icon, indexed) in enumerate(BRAINS, start=1):
        brain_id = "real-" + str(uuid.uuid4())
        source_ref = str(uuid.uuid4())
        root = roots[folder]
        database.execute(
            "INSERT INTO brains VALUES (?,?,?,?,?,?,?,?,?)",
            (
                brain_id, name, color, icon, "REAL_ROOT", source_ref,
                root.name, str(root.resolve()).encode("utf-16-le"), position,
            ),
        )
        records.append(
            {"brain": brain_id, "name": name, "folder": folder, "root": str(root.resolve()),
             "icon": icon, "indexed": indexed, "position": position, "sourceRef": source_ref}
        )
    database.execute("INSERT INTO catalog_meta VALUES ('active_brain_id', ?)", (records[0]["brain"],))
    database.execute("INSERT INTO catalog_meta VALUES ('schema_version', '2')")
    database.execute("PRAGMA user_version=2")

# `brain` and `root` keep the shape of the B03 seed: the first brain is the B03 one.
print(json.dumps({"brain": records[0]["brain"], "root": records[0]["root"], "brains": records}))
