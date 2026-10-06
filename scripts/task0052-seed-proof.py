"""Fresh synthetic REAL_ROOT brains for the TASK-0052 WebView2 proof (F-042).

Two disposable roots below the proof directory, so the composition has two
territories to put away while a branch is focused:

* ``alix`` — a rich tree with a deep branch (``projet``) and a wide folder
  (``archives``) that overflows the ordinary view budget;
* ``bea``  — a small second tree.

Every file is synthetic. No user data is read. The harness recomputes every
count it judges from these directories with its own walk, never from FileTopo.
"""

import json
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0052-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant
roots = {"alix": proof_root / "alix", "bea": proof_root / "bea"}
for root in roots.values():
    root.mkdir(parents=True, exist_ok=False)


def touch(path: Path, content: str = "synthetic\n") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


alix = roots["alix"]
# The deep branch: three levels below the focused folder, two independent
# collapsible sub-branches (docs, src), one collapsible deep folder (guide).
for name in ("c1a", "c1b", "c1c"):
    touch(alix / "projet" / "docs" / "guide" / "chapitre-1" / f"{name}.txt")
for name in ("c2a", "c2b"):
    touch(alix / "projet" / "docs" / "guide" / "chapitre-2" / f"{name}.txt")
touch(alix / "projet" / "docs" / "guide" / "index.txt")
for name in ("a1", "a2", "a3"):
    touch(alix / "projet" / "docs" / "annexes" / f"{name}.txt")
touch(alix / "projet" / "docs" / "lisez-moi.txt")
for name in ("k1", "k2", "k3", "k4"):
    touch(alix / "projet" / "src" / "core" / f"{name}.txt")
for name in ("u1", "u2"):
    touch(alix / "projet" / "src" / "utils" / f"{name}.txt")
touch(alix / "projet" / "src" / "main.txt")
touch(alix / "projet" / "notes.txt")
# The wide folder: more direct children than the ordinary view target shows.
for index in range(90):
    touch(alix / "archives" / f"fichier-{index:03d}.txt")
for name in ("j1", "j2", "j3"):
    touch(alix / "archives" / "2024" / f"{name}.txt")
for name in ("m1", "m2"):
    touch(alix / "archives" / "2025" / f"{name}.txt")
touch(alix / "zzz-racine.txt")

bea = roots["bea"]
for name in ("l1", "l2"):
    touch(bea / "lettres" / f"{name}.txt")
for name in ("f1", "f2", "f3"):
    touch(bea / "factures" / f"{name}.txt")
touch(bea / "lisez-moi.txt")

brains = state_root / "brains"
brains.mkdir(parents=True, exist_ok=False)
spec = [
    ("real-" + str(uuid.uuid4()), "Arbre Alix", "#2F6DA8", "A", "alix", 1),
    ("real-" + str(uuid.uuid4()), "Arbre Béa", "#A8552F", "B", "bea", 2),
]
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
    for brain_id, display_name, color, icon, root_key, position in spec:
        database.execute(
            "INSERT INTO brains VALUES (?,?,?,?,?,?,?,?,?)",
            (
                brain_id,
                display_name,
                color,
                icon,
                "REAL_ROOT",
                str(uuid.uuid4()),
                roots[root_key].name,
                str(roots[root_key].resolve()).encode("utf-16-le"),
                position,
            ),
        )
    database.execute("INSERT INTO catalog_meta VALUES ('active_brain_id', ?)", (spec[0][0],))
    database.execute("INSERT INTO catalog_meta VALUES ('schema_version', '2')")
    database.execute("PRAGMA user_version=2")

print(
    json.dumps(
        {
            "alix": spec[0][0],
            "bea": spec[1][0],
            "rootAlix": str(roots["alix"].resolve()),
            "rootBea": str(roots["bea"].resolve()),
        }
    )
)
