"""Logical digests of the stores TASK-0051 must keep apart, read from outside.

Run with the product closed. Row ids are left out of every digest: opening a
legacy brain replays its derivation, which hands the same relations fresh ids,
so an id is not part of what a relation is.

Prints, per store, a digest and the facts a reader can check by eye: how many
approved relations it holds and the state of every suggestion. Source trees are
hashed by name, size and content; Indexes by their logical content.
"""

import hashlib
import json
import sqlite3
import sys
from pathlib import Path

state_root = Path(sys.argv[1]).resolve()
source_roots = [Path(item).resolve() for item in sys.argv[2:]]


def digest(payload) -> str:
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode()).hexdigest()


def rows(database, query):
    return [list(row) for row in database.execute(query).fetchall()]


def relations_store(path: Path, prefix: str, suggestions_table: str, deterministic_columns: str):
    if not path.exists():
        return None
    with sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True) as database:
        deterministic = sorted(
            rows(database, f"SELECT {deterministic_columns} FROM {prefix}relations_deterministic")
        )
        approved = sorted(
            rows(
                database,
                f"SELECT * FROM {prefix}relations_approved",
            )
        )
        # Drop the autoincrement id (first column) and the approval timestamp
        # is kept: an approval that moved would be a finding.
        approved = [row[1:] for row in approved]
        suggestions = sorted(rows(database, f"SELECT * FROM {suggestions_table}"))
        return {
            "digest": digest([deterministic, approved, suggestions]),
            "deterministic": len(deterministic),
            "approved": len(approved),
            "approvedKeys": sorted(row[5] if prefix else row[3] for row in approved),
            "suggestionStates": {row[0]: row[5] if not prefix else row[7] for row in suggestions},
        }


def index_digest(path: Path):
    if not path.exists():
        return None
    with sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True) as database:
        tables = [
            row[0]
            for row in database.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            )
        ]
        payload = []
        for table in tables:
            data = sorted(
                (
                    [item.hex() if isinstance(item, bytes) else item for item in row]
                    for row in database.execute(f'SELECT * FROM "{table}"')
                ),
                key=lambda row: json.dumps(row, ensure_ascii=False, sort_keys=True),
            )
            payload.append([table, data])
        return digest(payload)


def tree_digest(root: Path):
    lines = []
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root).as_posix()
        if path.is_dir():
            lines.append(f"D:{relative}")
        else:
            lines.append(f"F:{relative}:{path.stat().st_size}:{hashlib.sha256(path.read_bytes()).hexdigest()}")
    return hashlib.sha256("\n".join(lines).encode()).hexdigest()


brains = state_root / "brains"
result = {
    "alphaRelations": relations_store(
        brains / "brain-alpha" / "relations" / "relations.sqlite",
        "",
        "relation_suggestions",
        "source_key, target_key, relation_type, rule_name, rule_version, rule_symmetric, producer",
    ),
    "gammaRelations": relations_store(
        brains / "brain-gamma" / "relations" / "relations.sqlite",
        "",
        "relation_suggestions",
        "source_key, target_key, relation_type, rule_name, rule_version, rule_symmetric, producer",
    ),
    "commonRelations": relations_store(
        brains / "interbrain" / "relations.sqlite",
        "cross_",
        "cross_suggestions",
        "source_brain_id, source_key, target_brain_id, target_key, relation_type, rule_name, rule_version, rule_symmetric",
    ),
    "alphaIndex": index_digest(brains / "brain-alpha" / "map" / "index.sqlite"),
    "gammaIndex": index_digest(brains / "brain-gamma" / "map" / "index.sqlite"),
    "syntheticFixtures": tree_digest(state_root / "fixtures") if (state_root / "fixtures").exists() else None,
    "realRoots": [tree_digest(root) for root in source_roots],
}
print(json.dumps(result, indent=1))
