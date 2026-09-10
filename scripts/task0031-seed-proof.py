"""Fresh synthetic catalogue for the real WebView2 proof; never touches an existing one."""
import sqlite3
import sys
from pathlib import Path
repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0031-") and variant.replace("-", "").isalnum()
folder = repository / ".filetopo-sandbox" / "variants" / variant / "brains"
folder.mkdir(parents=True, exist_ok=False)
with sqlite3.connect(folder / "catalog.sqlite") as db:
    db.execute("CREATE TABLE brains (brain_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, color TEXT NOT NULL, icon TEXT NOT NULL, source_kind TEXT NOT NULL, source_ref TEXT NOT NULL, position INTEGER NOT NULL)")
    db.execute("INSERT INTO brains VALUES (?,?,?,?,?,?,?)", ("brain-beta", "Cerveau Bêta", "#4A4FA8", "■", "SYNTHETIC_FIXTURE", "scale-runtime", 2))
# The normal BrainCatalog seeds Alpha and Gamma and chooses the initial brain.
