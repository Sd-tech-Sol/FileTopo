"""Fresh synthetic REAL_ROOT brains for the TASK-0053 WebView2 proof (F-052, P-19).

Three disposable roots below the proof directory, so the workspace has three
territories to compose, focus, restart and invalidate:

* ``alix``  — a small tree (the catalogue's first brain, hence the default active one);
* ``bea``   — a small second tree;
* ``chloe`` — the rich tree: a deep folder (``projet``) with two independent collapsible
              sub-folders and a three-level folder, plus a wide folder (``archives``).
              It is the third brain, never the default active one, and carries no filter.

Every file is synthetic. No user data is read. The harness recomputes every count it
judges from these directories with its own walk, never from FileTopo.
"""

import json
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0053-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant
roots = {name: proof_root / name for name in ("alix", "bea", "chloe")}
for root in roots.values():
    root.mkdir(parents=True, exist_ok=False)


def touch(path: Path, content: str = "synthetic\n") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


alix = roots["alix"]
for name in ("a1", "a2", "a3", "a4"):
    touch(alix / "dossier-a" / f"{name}.txt")
for name in ("b1", "b2"):
    touch(alix / "dossier-b" / f"{name}.txt")
touch(alix / "lisez-moi.txt")

bea = roots["bea"]
for name in ("l1", "l2", "l3"):
    touch(bea / "lettres" / f"{name}.txt")
for name in ("f1", "f2"):
    touch(bea / "factures" / f"{name}.txt")
touch(bea / "lisez-moi.txt")

# The rich tree is the THIRD brain's: a deep folder (`projet`) with two independent collapsible
# sub-folders (`docs`, `src`), `docs/guide` a level below, and a wide folder (`archives`).
chloe = roots["chloe"]
for name in ("c1a", "c1b", "c1c"):
    touch(chloe / "projet" / "docs" / "guide" / "chapitre-1" / f"{name}.txt")
for name in ("c2a", "c2b"):
    touch(chloe / "projet" / "docs" / "guide" / "chapitre-2" / f"{name}.txt")
touch(chloe / "projet" / "docs" / "guide" / "index.txt")
for name in ("a1", "a2", "a3"):
    touch(chloe / "projet" / "docs" / "annexes" / f"{name}.txt")
touch(chloe / "projet" / "docs" / "lisez-moi.txt")
for name in ("k1", "k2", "k3", "k4"):
    touch(chloe / "projet" / "src" / "core" / f"{name}.txt")
for name in ("u1", "u2"):
    touch(chloe / "projet" / "src" / "utils" / f"{name}.txt")
touch(chloe / "projet" / "src" / "main.txt")
touch(chloe / "projet" / "notes.txt")
for index in range(40):
    touch(chloe / "archives" / f"fichier-{index:03d}.txt")
for name in ("j1", "j2"):
    touch(chloe / "archives" / "2024" / f"{name}.txt")
touch(chloe / "zzz-racine.txt")

brains = state_root / "brains"
brains.mkdir(parents=True, exist_ok=False)
spec = [
    ("real-" + str(uuid.uuid4()), "Arbre Alix", "#2F6DA8", "A", "alix", 1),
    ("real-" + str(uuid.uuid4()), "Arbre Béa", "#A8552F", "B", "bea", 2),
    ("real-" + str(uuid.uuid4()), "Arbre Chloé", "#4F8F3A", "C", "chloe", 3),
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
            "chloe": spec[2][0],
            "rootAlix": str(roots["alix"].resolve()),
            "rootBea": str(roots["bea"].resolve()),
            "rootChloe": str(roots["chloe"].resolve()),
        }
    )
)
