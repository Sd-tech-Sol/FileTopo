"""Fresh synthetic REAL_ROOT brain for the TASK-0055 WebView2 proof (F-046 / DEC-0052).

One disposable root below the proof directory, holding exactly the five entries
`TASK-0055` §8 names:

* ``a.bin``            — an ordinary file;
* ``b-hardlink.bin``   — a **real hard link** to ``a.bin``: one physical object,
  two occurrences in the tree (``os.link``, nothing added to create it);
* ``c-copy.bin``       — the same bytes, copied: identical content, a different
  physical object;
* ``vide-un.bin`` and ``vide-deux.bin`` — two distinct empty files: identical
  content again, and no relation of any kind.

Plus ``dossier/stable.bin``, an ordinary file the harness renames to replay the
`F-004` stability of an unshared `SYSTEM` object while a shared group exists in
the same tree.

**The fixture is complete before the harness starts**, so the source fingerprint
the content campaign takes as its baseline is the one of this finished tree:
creating the fixture is never counted as a source change (`TASK-0055` §12).

Every file is synthetic. No user data is read.
"""

import json
import os
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0055-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant
root = proof_root / "objets"
root.mkdir(parents=True, exist_ok=False)

CONTENT = b"octets synthetiques de TASK-0055\n"

(root / "a.bin").write_bytes(CONTENT)
os.link(root / "a.bin", root / "b-hardlink.bin")
(root / "c-copy.bin").write_bytes(CONTENT)
(root / "vide-un.bin").write_bytes(b"")
(root / "vide-deux.bin").write_bytes(b"")
(root / "dossier").mkdir()
(root / "dossier" / "stable.bin").write_bytes(b"objet non partage\n")

# The hard link must really be one: same inode/file index, two directory entries.
assert (root / "a.bin").stat().st_ino == (root / "b-hardlink.bin").stat().st_ino
assert (root / "a.bin").stat().st_ino != (root / "c-copy.bin").stat().st_ino
assert (root / "a.bin").read_bytes() == (root / "c-copy.bin").read_bytes()

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
            "Objets physiques",
            "#2F6DA8",
            "O",
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
