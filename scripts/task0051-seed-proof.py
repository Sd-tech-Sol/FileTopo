"""Fresh synthetic REAL_ROOT brain for the TASK-0051 WebView2 proof.

The root lives below the disposable proof directory. Alix supplies a small
folder-backed brain that is only the catalogue's active brain at start-up. The
catalogue is then completed by FileTopo's frozen synthetic brains, whose
established/suggested intra- and inter-brain relations are the subject of the
revocation proof. No user data is read.
"""

import json
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0051-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant
roots = {"alix": proof_root / "alix"}
for root in roots.values():
    root.mkdir(parents=True, exist_ok=False)


def touch(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


touch(roots["alix"] / "docs" / "note.txt", "synthetic note\n")

brains = state_root / "brains"
brains.mkdir(parents=True, exist_ok=False)
spec = [
    ("real-" + str(uuid.uuid4()), "Arbre Alix", "#2F6DA8", "A", "alix", 4),
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
            "realA": spec[0][0],
            "rootAlix": str(roots["alix"].resolve()),
        }
    )
)
