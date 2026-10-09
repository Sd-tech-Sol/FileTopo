"""Removes ONE brain from the disposable catalogue of a TASK-0061 variant.

This is how the third pass raises the product's own workspace corrections without inventing
anything: the second pass leaves a stored composition that names a brain, and this script
makes that brain vanish from the catalogue between two processes, exactly as a brain deleted
by another session would. The product then has to say what it corrected
(``BRAIN_MISSING``, ``FOCUSED_BRAIN_MISSING``).

Only the catalogue of the harness's own variant under ``.filetopo-sandbox/`` is touched; the
analysed root of that brain is not read, listed or modified.
"""

import sqlite3
import sys
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
brain_id = sys.argv[2]
assert variant.startswith("task0061-") and variant.replace("-", "").isalnum()
assert brain_id.startswith("real-")

catalog = repository / ".filetopo-sandbox" / "variants" / variant / "brains" / "catalog.sqlite"
assert catalog.is_file(), "the variant catalogue must exist"
with sqlite3.connect(catalog) as database:
    removed = database.execute("DELETE FROM brains WHERE brain_id = ?", (brain_id,)).rowcount
    remaining = database.execute("SELECT count(*) FROM brains").fetchone()[0]
    active = database.execute("SELECT value FROM catalog_meta WHERE key='active_brain_id'").fetchone()
print(f'{{"removed": {removed}, "remaining": {remaining}, "activeBrainId": "{active[0] if active else ""}"}}')
