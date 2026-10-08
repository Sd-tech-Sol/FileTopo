"""External fingerprint of the analysed trees — the witness of `P-22`.

This tool is **outside the product**: it never calls FileTopo, never reads its
index, and recomputes everything from the directories themselves. It is what
makes `P-22` falsifiable rather than declarative.

For every entry below each root it records:

* the **relative path**, as POSIX text;
* the **kind** — directory or file;
* the **size** in bytes (files);
* the **SHA-256 of the content** (files);
* the **modification time** in nanoseconds (files **and** directories);
* the **creation time** in nanoseconds (files and directories; on Windows
  ``st_ctime_ns`` is the creation time);
* the **number of hard links** to the object (files) — the count, never the
  object identity: a volume serial or a file id is machine identity and
  `DEC-0052` F forbids publishing it or anything derived from it.

The **strict digest** covers all of the above. The **access time** is digested
**separately** and reported on its own line, because opening a file to read it
is what a read-only analyser does by definition, and on a volume where
last-access updates are enabled that is a legitimate consequence of reading —
never a change of content, name, structure or contractual timestamp. Both
digests are published, so nothing is hidden either way.

It also lists any **FileTopo artefact** found under a root (`I-2`): an index,
a journal, a cache, a relations store or a report. Finding one is a failure.

    python scripts/task0056-fingerprint.py <out.json> <label=rootPath> ...

The detailed entry list goes to ``<out.json>``, which belongs OUTSIDE the
repository: only digests and counts are ever published.
"""

import hashlib
import json
import os
import sys
from pathlib import Path

# Anything FileTopo could possibly leave behind, plus the generic shapes of an
# index or a cache. A match under an analysed root is an `I-2` failure.
ARTEFACT_NAMES = {
    "catalog.sqlite",
    "index.sqlite",
    "relations.sqlite",
    "map.sqlite",
    "filetopo.json",
    ".filetopo",
    ".filetopo-sandbox",
}
ARTEFACT_SUFFIXES = (
    ".sqlite",
    ".sqlite-wal",
    ".sqlite-shm",
    ".filetopo",
)
ARTEFACT_PREFIXES = ("filetopo", ".filetopo")


def looks_like_artefact(name: str) -> bool:
    lowered = name.lower()
    if lowered in ARTEFACT_NAMES:
        return True
    if lowered.endswith(ARTEFACT_SUFFIXES):
        return True
    return any(lowered.startswith(prefix) for prefix in ARTEFACT_PREFIXES)


def walk(root: Path):
    """Every entry below `root`, sorted, without following any link."""
    entries = []
    stack = [root]
    while stack:
        directory = stack.pop()
        with os.scandir(directory) as scan:
            for item in sorted(scan, key=lambda e: e.name):
                path = Path(item.path)
                relative = path.relative_to(root).as_posix()
                info = item.stat(follow_symlinks=False)
                if item.is_dir(follow_symlinks=False):
                    entries.append(
                        {
                            "relativePath": relative,
                            "kind": "directory",
                            "modifiedNs": info.st_mtime_ns,
                            "createdNs": info.st_ctime_ns,
                            "accessedNs": info.st_atime_ns,
                        }
                    )
                    stack.append(path)
                else:
                    with open(path, "rb") as handle:
                        digest = hashlib.sha256(handle.read()).hexdigest()
                    entries.append(
                        {
                            "relativePath": relative,
                            "kind": "file",
                            "sizeBytes": info.st_size,
                            "sha256": digest,
                            "hardLinkCount": info.st_nlink,
                            "modifiedNs": info.st_mtime_ns,
                            "createdNs": info.st_ctime_ns,
                            "accessedNs": info.st_atime_ns,
                        }
                    )
    entries.sort(key=lambda entry: entry["relativePath"])
    return entries


def strict_line(entry: dict) -> str:
    if entry["kind"] == "directory":
        return "D|{relativePath}|{modifiedNs}|{createdNs}".format(**entry)
    return (
        "F|{relativePath}|{sizeBytes}|{sha256}|{hardLinkCount}|{modifiedNs}|{createdNs}".format(
            **entry
        )
    )


def digest(lines) -> str:
    return hashlib.sha256("\n".join(lines).encode("utf-8")).hexdigest()


out_path = Path(sys.argv[1])
report = {"roots": {}, "artefactsFound": []}
for argument in sys.argv[2:]:
    label, _, root_text = argument.partition("=")
    root = Path(root_text)
    if not root.is_dir():
        report["roots"][label] = {"present": False}
        continue
    own = root.stat()
    entries = walk(root)
    strict = [strict_line(entry) for entry in entries]
    access = [f"{entry['relativePath']}|{entry['accessedNs']}" for entry in entries]
    artefacts = [
        entry["relativePath"]
        for entry in entries
        if looks_like_artefact(entry["relativePath"].rsplit("/", 1)[-1])
    ]
    report["artefactsFound"].extend(f"{label}/{name}" for name in artefacts)
    report["roots"][label] = {
        "present": True,
        "entryCount": len(entries),
        "directoryCount": sum(1 for entry in entries if entry["kind"] == "directory"),
        "fileCount": sum(1 for entry in entries if entry["kind"] == "file"),
        "totalBytes": sum(entry.get("sizeBytes", 0) for entry in entries),
        # The root directory's own contractual metadata, on top of its contents.
        "rootModifiedNs": own.st_mtime_ns,
        "rootCreatedNs": own.st_ctime_ns,
        "strictDigest": digest([f"ROOT|{own.st_mtime_ns}|{own.st_ctime_ns}", *strict]),
        "accessDigest": digest(access),
        "entries": entries,
    }

report["strictDigest"] = digest(
    [
        f"{label}|{root.get('strictDigest', 'ABSENT')}"
        for label, root in sorted(report["roots"].items())
    ]
)
report["accessDigest"] = digest(
    [
        f"{label}|{root.get('accessDigest', 'ABSENT')}"
        for label, root in sorted(report["roots"].items())
    ]
)
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

# Only the digests and the counts reach stdout; the entries stay in the file,
# which lives outside the repository.
summary = {
    "strictDigest": report["strictDigest"],
    "accessDigest": report["accessDigest"],
    "artefactsFound": report["artefactsFound"],
    "roots": {
        label: {key: value for key, value in root.items() if key != "entries"}
        for label, root in report["roots"].items()
    },
}
print(json.dumps(summary, ensure_ascii=False))
