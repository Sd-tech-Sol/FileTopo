"""Hash external TASK-0049 stores canonically.

The catalogue digest excludes the two rows expected to change: resume is
generation-corrected, and the source observation is re-stamped by the explicit
fresh rebuild. Brain identity, policy and every other catalogue row remain in
the digest.
"""

import hashlib
import json
import sqlite3
import sys
from pathlib import Path


def value(item):
    if isinstance(item, bytes):
        return {"blob": item.hex()}
    return item


def database_digest(path: Path, stable_catalog_rows: bool = False):
    if not path.exists():
        return None
    payload = []
    with sqlite3.connect(path) as database:
        tables = [
            row[0]
            for row in database.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            )
        ]
        for table in tables:
            columns = [row[1] for row in database.execute(f'PRAGMA table_info("{table}")')]
            rows = database.execute(f'SELECT * FROM "{table}"').fetchall()
            if stable_catalog_rows and table == "catalog_meta":
                rows = [
                    row
                    for row in rows
                    if not str(row[0]).startswith("brain_resume.")
                    and not str(row[0]).startswith("source_observation.")
                ]
            normalized = sorted(
                ([value(item) for item in row] for row in rows),
                key=lambda row: json.dumps(row, ensure_ascii=False, sort_keys=True),
            )
            payload.append({"table": table, "columns": columns, "rows": normalized})
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


state_root = Path(sys.argv[1]).resolve()
brain_id = sys.argv[2]
brain_root = state_root / "brains" / brain_id
print(
    json.dumps(
        {
            "catalogStable": database_digest(state_root / "brains" / "catalog.sqlite", True),
            "relations": database_digest(brain_root / "relations" / "relations.sqlite"),
            "contentSignals": database_digest(brain_root / "signals" / "content.sqlite"),
        }
    )
)
