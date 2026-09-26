"""Fresh synthetic REAL_ROOT catalogue for TASK-0048 WebView2 proof.

All roots live below the proof directory inside the repository and disappear
with it. A and C deliberately share one source; B reads another.
"""

import json
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0048-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant
roots = {"shared": proof_root / "shared", "solo": proof_root / "solo"}
for root in roots.values():
    root.mkdir(parents=True, exist_ok=False)


def write(relative: str, content: str, root: str = "shared") -> None:
    target = roots[root] / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


write("skip/hidden.txt", "synthetic hidden baseline\n")
write("skip/deep/nested.txt", "synthetic nested baseline\n")
write("other/c-only.txt", "synthetic c policy boundary\n")
write("common/visible.txt", "synthetic visible baseline\n")
write("common/second.txt", "synthetic second baseline\n")
write("docs/été 2026.txt", "synthetic unicode and spaces\n")
write("solo/cache.txt", "synthetic solo cache\n", "solo")
write("solo/visible.txt", "synthetic solo visible\n", "solo")

brains = state_root / "brains"
brains.mkdir(parents=True, exist_ok=False)
shared_ref = str(uuid.uuid4())
solo_ref = str(uuid.uuid4())
spec = [
    ("a", "real-" + str(uuid.uuid4()), "Policy A", "#2F6DA8", "▣", shared_ref, "shared", 4),
    ("b", "real-" + str(uuid.uuid4()), "Policy B", "#A85D2F", "▤", solo_ref, "solo", 5),
    ("c", "real-" + str(uuid.uuid4()), "Policy C", "#3E6B2A", "▥", shared_ref, "shared", 6),
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
        }
    )
)
