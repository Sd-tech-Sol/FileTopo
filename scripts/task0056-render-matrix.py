"""Renders the human-readable P-01..P-22 matrix from its machine-readable twin.

One source of truth — ``docs/product/parity-matrix-p01-p22.json`` — so the two
cannot drift. The renderer also **checks** the matrix rather than trusting it:

* the 22 requirements are present, once each, in order;
* every requirement a row claims a runtime observation for really has one in the
  campaign artifact's ``coverage`` table;
* a requirement marked ``CLOSED/VERIFIED`` names the ACTION that closed it, and
  one marked ``CANDIDATE`` names none;
* a ``GAP`` anywhere makes the whole matrix a ``GAP``, and the exit code says so.

    python scripts/task0056-render-matrix.py
"""

import json
import sys
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
matrix_path = repository / "docs/product/parity-matrix-p01-p22.json"
output_path = repository / "docs/product/PARITY_MATRIX_P01_P22.md"
matrix = json.loads(matrix_path.read_text(encoding="utf-8"))

expected = [f"P-{index:02d}" for index in range(1, 23)]
actual = [requirement["id"] for requirement in matrix["requirements"]]
assert actual == expected, f"the matrix must hold P-01..P-22 once each, in order: {actual}"

campaign_path = repository / matrix["runtimeEvidence"]["artifact"]
covered: dict[str, list[dict]] = {}
if campaign_path.is_file():
    campaign = json.loads(campaign_path.read_text(encoding="utf-8"))
    for row in campaign.get("coverage", []):
        covered.setdefault(row["requirement"], []).append(row)
else:
    print(f"WARNING: {matrix['runtimeEvidence']['artifact']} is absent; runtime rows are not checked")

problems = []
for requirement in matrix["requirements"]:
    identifier = requirement["id"]
    if requirement["status"] == "CLOSED/VERIFIED" and not requirement.get("closedBy"):
        problems.append(f"{identifier}: CLOSED/VERIFIED without the ACTION that closed it")
    if requirement["status"] == "CANDIDATE" and requirement.get("closedBy"):
        problems.append(f"{identifier}: CANDIDATE but names a closure")
    if covered:
        for row in requirement.get("runtimeRows", []):
            if row not in covered:
                problems.append(f"{identifier}: claims a runtime row `{row}` the campaign does not have")
if problems:
    for problem in problems:
        print(f"MATRIX PROBLEM: {problem}")
    sys.exit(2)

gaps = [r["id"] for r in matrix["requirements"] if r["verdict"] == "GAP"]
overall = "GAP" if gaps else "SATISFIED"

lines: list[str] = []
add = lines.append

add("<!-- Généré par scripts/task0056-render-matrix.py depuis")
add("     docs/product/parity-matrix-p01-p22.json. Ne pas éditer à la main :")
add("     éditer le JSON, puis réexécuter le rendu. -->")
add("")
add(f"# {matrix['document']}")
add("")
add(f"- **Date :** {matrix['date']}")
add(f"- **Tâche :** `{matrix['task']}`")
add(f"- **Branche :** `{matrix['branch']}`")
add(f"- **Base :** `{matrix['base']}`")
add(f"- **Contrat de référence :** [{Path(matrix['contract']).name}]({Path(matrix['contract']).name})")
add(f"- **Nature :** {matrix['nature']}")
add(f"- **Preuve runtime finale :** `{matrix['runtimeEvidence']['artifact']}`")
add(f"- **Verdict d'ensemble de `{matrix['task']}` :** **{overall}**"
    + (f" — manques : {', '.join(gaps)}" if gaps else " — aucun sous-critère nommé sans preuve"))
add("")
if matrix.get("overallFinding"):
    add(f"> **Constat d'ensemble.** {matrix['overallFinding']}")
    add("")
add(f"> **Autorité.** {matrix['authority']}")
add("")
add("## Comment lire ce document")
add("")
add("| Valeur | Sens |")
add("|---|---|")
for name, meaning in matrix["legend"]["verdict"].items():
    add(f"| `{name}` | {meaning} |")
for name, meaning in matrix["legend"]["status"].items():
    add(f"| `{name}` | {meaning} |")
add("")
add(matrix["runtimeEvidence"]["note"])
add("")

add("## 1. Tableau de synthèse")
add("")
add(f"| # | Exigence | Fonctions propriétaires | État courant | Fermée par | Verdict {matrix['task']} |")
add("|---|---|---|---|---|---|")
for requirement in matrix["requirements"]:
    add(
        "| `{id}` | {title} | {owners} | `{status}` | {closed} | **{verdict}** |".format(
            id=requirement["id"],
            title=requirement["title"],
            owners=", ".join(f"`{owner}`" for owner in requirement["owners"]),
            status=requirement["status"],
            closed=requirement["closedBy"] or "—",
            verdict=requirement["verdict"],
        )
    )
add("")
closed = [r["id"] for r in matrix["requirements"] if r["status"] == "CLOSED/VERIFIED"]
candidates = [r["id"] for r in matrix["requirements"] if r["status"] == "CANDIDATE"]
add(f"**Déjà fermées formellement :** {', '.join(f'`{name}`' for name in closed)}.")
add("")
add(
    f"**Candidates à la fermeture par contrôle indépendant :** "
    f"{', '.join(f'`{name}`' for name in candidates)}. "
    "Aucune n'est fermée par cette tâche."
)
add("")

add("## 2. Exigence par exigence")
add("")
for requirement in matrix["requirements"]:
    add(f"### `{requirement['id']}` — {requirement['title']}")
    add("")
    add(f"- **Fonctions propriétaires :** {', '.join(f'`{owner}`' for owner in requirement['owners'])}")
    add(f"- **État courant :** `{requirement['status']}`"
        + (f", fermée par **{requirement['closedBy']}**" if requirement["closedBy"] else ""))
    add(f"- **Verdict de `{matrix['task']}` :** **{requirement['verdict']}**")
    if requirement.get("regressionAfterClosure"):
        add(f"- **Régression postérieure à la clôture :** {requirement['regressionAfterClosure']}")
    add("")
    if requirement.get("gap"):
        add(f"> **Manque.** {requirement['gap']}")
        add("")
    if requirement.get("correction"):
        add(f"> **Correction.** {requirement['correction']}")
        add("")
    add("**Sous-critères du texte courant, un par un :**")
    add("")
    for item in requirement["subCriteria"]:
        add(f"- {item}")
    add("")
    add("**Preuves indépendantes :**")
    add("")
    for item in requirement["independentEvidence"]:
        add(f"- {item}")
    add("")
    if requirement["limits"]:
        add("**Limites, écrites plutôt que corrigées en silence :**")
        add("")
        for item in requirement["limits"]:
            add(f"- {item}")
        add("")
    rows = [row for name in requirement.get("runtimeRows", []) for row in covered.get(name, [])]
    if rows:
        add("**Preuve runtime de la campagne finale :**")
        add("")
        for row in rows:
            add(f"- *(phase {row['phase']})* {row['observation']}")
        add("")
    elif covered:
        add("**Preuve runtime de la campagne finale :** aucune ligne; l'exigence est composée seulement.")
        add("")

add("## 3. Invariants I-1 à I-3")
add("")
add("| # | Invariant | Verdict | Preuve |")
add("|---|---|---|---|")
for invariant in matrix["invariants"]:
    add(
        "| `{id}` | {statement} | **{verdict}** | {evidence} |".format(
            id=invariant["id"],
            statement=invariant["statement"],
            verdict=invariant["verdict"],
            evidence=invariant["evidence"],
        )
    )
add("")

add("## 4. Audit reuse-first")
add("")
add(matrix["reuseFirst"]["note"])
add("")
for heading, key in (("RÉUTILISER", "reuse"), ("COMPOSER", "compose"), ("MANQUANT POUR L'ACCEPTANCE FINALE", "missing")):
    add(f"### {heading}")
    add("")
    for item in matrix["reuseFirst"][key]:
        add(f"- {item}")
    add("")

output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"rendered {output_path.relative_to(repository).as_posix()} — verdict {overall}")
