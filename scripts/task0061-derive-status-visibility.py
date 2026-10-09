"""Derives, from a TASK-0061 campaign artifact, how much of the notice a person SEES.

The harness records, for every state, the rectangle of the status line, the rectangle of the
corrections notice and the rectangle of the chrome band that holds them. The band scrolls, so a
notice whose rectangle is inside the window can still be entirely under the band's own fold. This
script intersects the two recorded rectangles; it reads nothing but the artifact, runs no
product and measures nothing new.

    python scripts/task0061-derive-status-visibility.py <campaign.json> <out.json>
"""

import json
import sys
from pathlib import Path

source = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))


def visible(rect, band):
    if rect is None or band is None:
        return None
    top = max(rect["y"], band["y"])
    bottom = min(rect["bottom"], band["bottom"])
    own = rect["h"]
    seen = max(0.0, bottom - top)
    return {"visibleHeightPx": round(seen, 1), "ownHeightPx": round(own, 1), "fraction": round(seen / own, 2) if own else None}


rows = []
for pass_name in ("pass1", "pass2", "pass3"):
    for entry in source[pass_name]["matrix"]:
        composition = entry["composition"]
        band = composition["chromeBand"]["rect"] if composition["chromeBand"] else None
        status = composition["status"]
        corrections = composition["corrections"]
        if status is None and corrections is None:
            continue
        row = {"pass": pass_name, "size": entry["size"], "state": entry["state"]}
        if status is not None:
            row["status"] = {"text": status["text"][:80], **visible(status["rect"], band)}
        if corrections is not None:
            row["corrections"] = {
                "words": corrections["words"],
                **visible(corrections["rect"], band),
                "dismiss": visible(corrections["dismissRect"], band),
            }
        rows.append(row)

summary = {
    "source": Path(sys.argv[1]).name,
    "note": "Derived from the rectangles recorded in the campaign artifact: the part of the notice that lies inside the chrome band's own box, which is what a person sees without scrolling the band. Nothing was measured again.",
    "rows": rows,
    "statusesEntirelyUnderTheBandFold": [f"{r['pass']} {r['size']}/{r['state']}" for r in rows if "status" in r and r["status"]["visibleHeightPx"] == 0],
    "statusesFullyVisible": [f"{r['pass']} {r['size']}/{r['state']}" for r in rows if "status" in r and r["status"]["fraction"] == 1.0],
    "correctionsFullyVisible": [f"{r['pass']} {r['size']}/{r['state']}" for r in rows if "corrections" in r and r["corrections"]["fraction"] == 1.0],
}
Path(sys.argv[2]).write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
print(json.dumps({k: v for k, v in summary.items() if k != "rows"}, ensure_ascii=False, indent=1))
