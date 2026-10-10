"""Lays out, from a TASK-0061 campaign artifact, what a person SEES of the notices at the moment they appear.

The campaign measures it directly (ACTION-0113, B04-O2): for the status line, its dismiss button, the
workspace corrections and theirs, the harness records whether the box is wholly inside the window and
whether every one of five probe points (the centre and four corners) answers a hit test with the notice
itself, read at the opening of each state with every region at its origin (no scroll first). This script
only lays those recorded facts out per state; it measures nothing and runs no product.

    python scripts/task0061-derive-status-visibility.py <campaign.json> <out.json>
"""

import json
import sys
from pathlib import Path

source = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))


def probe(entry):
    if entry is None:
        return None
    return {
        "whole": entry["whole"],
        "inWindow": entry["inWindow"],
        "visibleHeightPx": entry["visibleHeightPx"],
        "ownHeightPx": entry["ownHeightPx"],
        "everyProbePointAnswers": entry["answersAtEveryPoint"],
    }


rows = []
for pass_name in ("pass1", "pass2", "pass3"):
    for entry in source[pass_name]["matrix"]:
        composition = entry["composition"]
        if composition["status"] is None and composition["corrections"] is None:
            continue
        row = {"pass": pass_name, "size": entry["size"], "state": entry["state"]}
        if composition["status"] is not None:
            row["status"] = {"text": composition["status"]["text"][:80], **probe(composition["statusProbe"]), "dismiss": probe(composition["statusDismissProbe"])}
            feedback = composition["feedback"]
            row["statusLayer"] = {
                "position": feedback["position"],
                "insideTheChromeBand": feedback["insideTheChromeBand"],
                "overlapsTheMapViewPx": feedback["mapViewOverlapHeightPx"],
                "overlapsTheMapViewFraction": feedback["mapViewOverlapFraction"],
                "coversACommandOrSummaryOrChip": bool(feedback["primariesUnderANotice"] or feedback["groupSummariesUnderANotice"] or feedback["chipsOrMenuTriggerUnderANotice"]),
            }
        if composition["corrections"] is not None:
            row["corrections"] = {"words": composition["corrections"]["words"], **probe(composition["correctionsProbe"]), "dismiss": probe(composition["correctionsDismissProbe"]), "placement": composition.get("correctionsPlacement")}
        rows.append(row)


def label(r):
    return f"{r['pass']} {r['size']}/{r['state']}"


summary = {
    "source": Path(sys.argv[1]).name,
    "note": "Laid out from the facts recorded in the campaign artifact: the notice's box inside the window and five hit-test points at the moment the state opened. Nothing was measured again.",
    "rows": rows,
    "statusWholeWithItsDismissAtAppearance": [label(r) for r in rows if "status" in r and r["status"]["whole"] and r["status"]["dismiss"]["whole"]],
    "statusNotWholeAtAppearance": [label(r) for r in rows if "status" in r and not (r["status"]["whole"] and r["status"]["dismiss"]["whole"])],
    "correctionsWholeWithTheirDismissAtAppearance": [label(r) for r in rows if "corrections" in r and r["corrections"]["whole"] and r["corrections"]["dismiss"]["whole"]],
    "correctionsNotWholeAtAppearance": [label(r) for r in rows if "corrections" in r and not (r["corrections"]["whole"] and r["corrections"]["dismiss"]["whole"])],
}
Path(sys.argv[2]).write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
print(json.dumps({k: v for k, v in summary.items() if k != "rows"}, ensure_ascii=False, indent=1))
