"""Disposable synthetic sources for the TASK-0056 final P-22 campaign.

Three temporary REAL_ROOT trees under the proof directory, created by this
script and dying with it. **No user folder is read, no personal path appears.**

* ``atelier`` — the rich tree the campaign exercises: unicode names, depth,
  a wide folder that forces an exact aggregate and several children pages,
  an identical-content pair (the deterministic relation of ``dre-v1``), a
  numbered-sibling pair (its suggestion), a real hard link, an empty folder
  and an empty file;
* ``carnets`` — a small second tree, so "several independent brains" is a real
  observation and not a claim;
* ``archives`` — a small third tree, the one the campaign makes **temporarily
  unavailable** and restores. It is renamed away and back, which never touches
  its own contents or timestamps.

Two stages, on purpose (``TASK-0056`` §4 / ``ACTION-0105`` §6):

``seed``    builds the three trees. The app then indexes them — that is the
            pre-baseline stage.
``mutate``  applies the real source changes whose journal, seen/unseen and
            incremental-apply consequences the P-22 window reads. **It runs
            BEFORE the baseline fingerprint**, so no change of the analysed
            tree is ever counted inside the P-22 window.

Usage:  python scripts/task0056-seed-proof.py seed <variant>
        python scripts/task0056-seed-proof.py mutate <variant>
"""

import json
import os
import sqlite3
import sys
import uuid
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
stage = sys.argv[1]
variant = sys.argv[2]
assert stage in {"seed", "mutate"}
assert variant.startswith("task0056-") and variant.replace("-", "").isalnum()

proof_root = repository / ".filetopo-sandbox" / variant
state_root = repository / ".filetopo-sandbox" / "variants" / variant
roots = {name: proof_root / name for name in ("atelier", "carnets", "archives")}

WIDE_CHILDREN = 150
IDENTICAL = "contenu synthetique partage par deux occurrences\n"


def touch(path: Path, content: str = "synthetique\n") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def seed() -> None:
    for root in roots.values():
        root.mkdir(parents=True, exist_ok=False)

    atelier = roots["atelier"]
    touch(atelier / "lisez-moi.txt", "racine de l'atelier\n")
    # Unicode: accents, a non-Latin script, and a long name.
    touch(atelier / "dossier-éàç" / "fichier-日本語.txt", "unicode\n")
    touch(atelier / "dossier-éàç" / "note-accentuée.txt", "accents\n")
    touch(
        atelier / "dossier-éàç" / ("nom-tres-long-" + ("x" * 120) + ".txt"),
        "nom long\n",
    )
    # Depth: eight levels below the root.
    deep = atelier / "profond"
    for level in range(1, 8):
        deep = deep / f"n{level}"
    touch(deep / "feuille.txt", "profondeur\n")
    # Width: more than ORDINARY_MATERIAL_TARGET, so an exact aggregate and
    # several children pages are forced. The trailing `-x` keeps these names
    # out of the numbered-sibling rule, so the suggestion below stays the only
    # one the campaign has to reason about.
    for index in range(WIDE_CHILDREN):
        touch(atelier / "large" / f"fiche-{index:03d}-x.txt", f"fiche {index}\n")
    # The deterministic relation of `dre-v1`: identical non-empty content.
    touch(atelier / "rapports" / "rapport-original.txt", IDENTICAL)
    touch(atelier / "rapports" / "copie-exacte.txt", IDENTICAL)
    # Its suggestion: same folder, same extension, consecutive trailing number,
    # and DIFFERENT content, so the two rules cannot be confused.
    touch(atelier / "versions" / "note-1.txt", "premiere version\n")
    touch(atelier / "versions" / "note-2.txt", "deuxieme version differente\n")
    # Moved by the `mutate` stage, so the pair above is never disturbed.
    touch(atelier / "brouillons" / "essai.txt", "brouillon a deplacer\n")
    # One physical object, two occurrences (F-046), plus a byte-for-byte copy.
    (atelier / "liens").mkdir(parents=True, exist_ok=True)
    (atelier / "liens" / "objet.bin").write_bytes(b"octets partages\n")
    os.link(atelier / "liens" / "objet.bin", atelier / "liens" / "objet-lien.bin")
    (atelier / "liens" / "objet-copie.bin").write_bytes(b"octets partages\n")
    assert (atelier / "liens" / "objet.bin").stat().st_nlink >= 2
    (atelier / "vide").mkdir()
    (atelier / "vide.txt").write_bytes(b"")

    carnets = roots["carnets"]
    for name in ("l1", "l2", "l3"):
        touch(carnets / "lettres" / f"{name}.txt")
    for name in ("f1", "f2"):
        touch(carnets / "factures" / f"{name}.txt")
    touch(carnets / "lisez-moi.txt", "racine des carnets\n")

    archives = roots["archives"]
    for name in ("a1", "a2", "a3-jetable"):
        touch(archives / "2025" / f"{name}.txt", f"archive {name}\n")
    touch(archives / "lisez-moi.txt", "racine des archives\n")

    brains = state_root / "brains"
    brains.mkdir(parents=True, exist_ok=False)
    spec = [
        ("real-" + str(uuid.uuid4()), "Atelier", "#2F6DA8", "A", "atelier", 1),
        ("real-" + str(uuid.uuid4()), "Carnets", "#A8552F", "C", "carnets", 2),
        ("real-" + str(uuid.uuid4()), "Archives", "#4F8F3A", "R", "archives", 3),
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
                "atelier": spec[0][0],
                "carnets": spec[1][0],
                "archives": spec[2][0],
                "rootAtelier": str(roots["atelier"].resolve()),
                "rootCarnets": str(roots["carnets"].resolve()),
                "rootArchives": str(roots["archives"].resolve()),
                "wideChildren": WIDE_CHILDREN,
            }
        )
    )


def mutate_archives() -> list[dict]:
    """The same five natures, on the third tree.

    ``archives`` is the brain whose root is absent when the P-22 window opens, so
    its watcher sleeps and the **manual** « Actualiser » is what applies these
    changes — the automatic watcher applies ``atelier``'s. Two different gestures,
    two different trees, both inside the window.
    """
    archives = roots["archives"]
    changes = []

    touch(archives / "2026" / "nouveau.txt", "cree apres le premier index\n")
    changes.append({"nature": "created", "relativePath": "2026/nouveau.txt"})

    (archives / "lisez-moi.txt").write_text("racine des archives, modifiee\n", encoding="utf-8")
    changes.append({"nature": "modified", "relativePath": "lisez-moi.txt"})

    (archives / "2025" / "a1.txt").rename(archives / "2025" / "a1-renommé.txt")
    changes.append(
        {
            "nature": "renamed",
            "relativePath": "2025/a1-renommé.txt",
            "fromRelativePath": "2025/a1.txt",
        }
    )

    (archives / "2025" / "a2.txt").rename(archives / "2026" / "a2.txt")
    changes.append(
        {"nature": "moved", "relativePath": "2026/a2.txt", "fromRelativePath": "2025/a2.txt"}
    )

    deleted = archives / "2025" / "a3-jetable.txt"
    deleted.unlink()
    changes.append({"nature": "deleted", "relativePath": "2025/a3-jetable.txt"})
    return changes


def mutate() -> None:
    """The five natures of change, applied BEFORE the P-22 baseline."""
    atelier = roots["atelier"]
    changes = []

    created = atelier / "journal" / "cree.txt"
    touch(created, "cree apres le premier index\n")
    changes.append({"nature": "created", "relativePath": "journal/cree.txt"})

    modified = atelier / "lisez-moi.txt"
    modified.write_text("racine de l'atelier, modifiee\n", encoding="utf-8")
    changes.append({"nature": "modified", "relativePath": "lisez-moi.txt"})

    renamed_from = atelier / "dossier-éàç" / "note-accentuée.txt"
    renamed_to = atelier / "dossier-éàç" / "note-renommée.txt"
    renamed_from.rename(renamed_to)
    changes.append(
        {
            "nature": "renamed",
            "relativePath": "dossier-éàç/note-renommée.txt",
            "fromRelativePath": "dossier-éàç/note-accentuée.txt",
        }
    )

    moved_from = atelier / "brouillons" / "essai.txt"
    (atelier / "journal").mkdir(parents=True, exist_ok=True)
    moved_to = atelier / "journal" / "essai.txt"
    moved_from.rename(moved_to)
    changes.append(
        {
            "nature": "moved",
            "relativePath": "journal/essai.txt",
            "fromRelativePath": "brouillons/essai.txt",
        }
    )

    deleted = atelier / "liens" / "objet-copie.bin"
    deleted.unlink()
    changes.append({"nature": "deleted", "relativePath": "liens/objet-copie.bin"})

    print(json.dumps({"atelierChanges": changes, "archivesChanges": mutate_archives()}))


if stage == "seed":
    seed()
else:
    mutate()
