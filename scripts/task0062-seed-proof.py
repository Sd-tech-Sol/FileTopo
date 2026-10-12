"""Fresh synthetic catalogue for the TASK-0062 campaign (Stage B / B05): panels that are POPULATED.

``B01``..``B04`` measured the shell with a catalogue whose brains had no relations at all, so the
three panels of the right column (``RelationsPanel``, ``ReviewQueuePanel``,
``CrossRelationsPanel``) were only ever drawn in their empty form. This seed builds the smallest
catalogue in which each of them has something to say, **through the paths the product already
has** and without inventing a model:

* the three FROZEN synthetic brains of ``TASK-0018`` (``brain-alpha``, ``brain-beta``,
  ``brain-gamma``), registered exactly as the product registers them. They are the ones the
  inter-brain rules ``XBR-1`` (``TASK-0020``) are frozen against, so the six deterministic
  inter-brain relations and the four pending inter-brain suggestions exist as soon as the three
  are indexed, and Alpha also carries the legacy ``TASK-0017`` relations and suggestions. Two of
  them are renamed (a 60-character French name with accents and an em dash, a 75-character
  English name) the way a person renames a brain in the identity editor;
* one disposable ``REAL_ROOT`` tree, ``atelier-relations``: three pairs of byte-identical files
  (the deterministic ``dre-v1`` relation, one of them with a very long name) and three runs of
  numbered siblings with DIFFERENT contents (its pending suggestions: 2 + 4 + 2 = 8), so the
  review queue has several items and the engine panel has real text to wrap.

Every name, path and identifier is fictitious. Every byte is synthetic. Nothing is read from a user
folder, and nothing is written outside the repository sandbox. The harness recomputes from this
directory any count it judges instead of believing FileTopo.
"""

import json
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
variant = sys.argv[1]
assert variant.startswith("task0062-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant


def touch(root: Path, rel: str, content: str) -> None:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


IDENTICAL_A = "contenu synthetique partage par deux occurrences\n"
IDENTICAL_B = "second contenu synthetique, lui aussi en double\n"
IDENTICAL_C = "troisieme contenu synthetique, copie fidele\n"
LONG = "nom-tres-long-" + ("x" * 90)

atelier = proof_root / "atelier-relations"
atelier.mkdir(parents=True, exist_ok=False)
touch(atelier, "lisez-moi.txt", "racine de l'atelier\n")
touch(atelier, "rapports/rapport-original.txt", IDENTICAL_A)
touch(atelier, "rapports/copie-exacte.txt", IDENTICAL_A)
touch(atelier, f"dossier-éàç/{LONG}.txt", IDENTICAL_B)
touch(atelier, f"dossier-éàç/copie-{LONG}.txt", IDENTICAL_B)
touch(atelier, "lettres/lettre-de-motivation-version-finale-vraiment-finale.txt", IDENTICAL_C)
touch(atelier, "lettres/lettre-de-motivation-version-finale-vraiment-finale-copie.txt", IDENTICAL_C)
# Numbered siblings with DIFFERENT contents: the numbered-sibling rule, never the identical one.
for index, words in enumerate(("premiere version", "deuxieme version differente", "troisieme version encore autre"), start=1):
    touch(atelier, f"versions/note-{index}.txt", words + "\n")
for index in range(1, 6):
    touch(atelier, f"chapitres/chapitre-{index:02d}.txt", f"chapitre numero {index}, contenu propre\n")
for index in range(1, 4):
    touch(atelier, f"annexes/annexe-{index}.txt", f"annexe {index}, texte distinct {index * 7}\n")

BRAINS = [
    # (brain id, display name, colour, icon, kind, source ref, position)
    ("brain-alpha", "Cerveau Alpha", "#1F6F5C", "▲", "SYNTHETIC_FIXTURE", "quasi-empty"),
    ("brain-beta", "Dossier d'études comparées — étés, forêts, écoles numériques", "#4A4FA8", "■", "SYNTHETIC_FIXTURE", "deep"),
    ("brain-gamma", "Synthetic Quarterly Reconciliation Workspace for Archive Verification Tests", "#9A5A18", "◆", "SYNTHETIC_FIXTURE", "quasi-empty"),
    ("real-" + str(uuid.uuid4()), "Atelier relations", "#2E7D32", "●", "REAL_ROOT", str(uuid.uuid4())),
]
assert len(BRAINS[1][1]) == 60, len(BRAINS[1][1])
assert len(BRAINS[2][1]) == 75, len(BRAINS[2][1])

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
    for position, (brain_id, name, color, icon, kind, source_ref) in enumerate(BRAINS, start=1):
        if kind == "REAL_ROOT":
            label = atelier.name
            source_path = str(atelier.resolve()).encode("utf-16-le")
        else:
            label = source_ref
            source_path = None
        database.execute(
            "INSERT INTO brains VALUES (?,?,?,?,?,?,?,?,?)",
            (brain_id, name, color, icon, kind, source_ref, label, source_path, position),
        )
        records.append(
            {"brain": brain_id, "name": name, "kind": kind, "icon": icon, "sourceRef": source_ref,
             "position": position, "root": str(atelier.resolve()) if kind == "REAL_ROOT" else None,
             "folder": atelier.name if kind == "REAL_ROOT" else None}
        )
    database.execute("INSERT INTO catalog_meta VALUES ('active_brain_id', ?)", (BRAINS[0][0],))
    database.execute("INSERT INTO catalog_meta VALUES ('schema_version', '2')")
    database.execute("PRAGMA user_version=2")

print(json.dumps({"brains": records, "atelierRoot": str(atelier.resolve())}))
