#!/usr/bin/env python3
"""Scan the repo for marker comments and emit a task list.

Markers are matched inside comment lines only (//, /* */, leading *,
and #). Marker words appear in this file's code strings only — never in
comments — so the scan cannot flag this tool itself.

Usage:
    python3 generate_todos.py                # JSON list to stdout
    python3 generate_todos.py --markdown     # megaplan task blocks
    python3 generate_todos.py --out todos.json
    python3 generate_todos.py --paths src,docs   # override scan roots
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

MARKERS = ("TODO", "FIXME", "BUG", "FIX", "HACK", "XXX")
MARKER_ALT = "|".join(MARKERS)

# A hit requires a comment token before the marker on the same line.
# `^\s*\*` covers block-comment continuation lines.
HIT_RE = re.compile(
    r"(//|/\*|\*/|^\s*\*|#)[^\n]*?\b(" + MARKER_ALT + r")\b"
)

SCAN_EXTS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".py", ".sh", ".css"}
DEFAULT_ROOTS = ("src", "scripts")

EXCLUDE_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "coverage",
    ".jules",
    ".storybook",
    ".githooks",
    "report",
    "audit",
}
EXCLUDE_FILE_NAMES = {"routeTree.gen.ts", Path(__file__).name, "search_todos.py"}
EXCLUDE_SUBSTRINGS = (".gen.", ".min.", "/megaplan/", "/data/realHorses")

RATIONALE = "Matches standard pattern, but requires further investigation."


def _is_excluded(rel: str) -> bool:
    parts = Path(rel).parts
    if any(p in EXCLUDE_DIRS for p in parts):
        return True
    if Path(rel).name in EXCLUDE_FILE_NAMES:
        return True
    norm = "/" + rel.replace("\\", "/")
    return any(s in norm for s in EXCLUDE_SUBSTRINGS)


def _iter_files(roots):
    for root in roots:
        base = (ROOT / root).resolve()
        if base.is_file():
            yield base
            continue
        if not base.is_dir():
            continue
        for path in sorted(base.rglob("*")):
            if path.is_file():
                yield path
    # Top-level files at the repo root (where these tools live).
    for path in sorted(ROOT.iterdir()):
        if path.is_file():
            yield path


def scan(roots=DEFAULT_ROOTS):
    """Return marker hits as a list of dicts (sorted by file, then line)."""
    items = []
    seen = set()
    for path in _iter_files(roots):
        if path.suffix not in SCAN_EXTS or path in seen:
            continue
        seen.add(path)
        try:
            rel = path.relative_to(ROOT).as_posix()
        except ValueError:
            continue
        if _is_excluded(rel):
            continue
        try:
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            continue
        for lineno, line in enumerate(lines, start=1):
            m = HIT_RE.search(line)
            if not m:
                continue
            marker = m.group(2)
            items.append(
                {
                    "title": "Address {} in {}".format(marker, path.name),
                    "file": rel,
                    "line": lineno,
                    "marker": marker,
                    "text": line.strip(),
                    "rationale": RATIONALE,
                }
            )
    return items


def to_markdown(items):
    blocks = []
    for it in items:
        blocks.append(
            "## {title}\n"
            "- Location: `{file}:{line}`\n"
            "- Rationale: {rationale}\n"
            "- Code context: `{text}`\n".format(**it)
        )
    return "\n".join(blocks)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="emit JSON (default)")
    parser.add_argument("--markdown", action="store_true", help="emit megaplan task blocks")
    parser.add_argument("--out", help="write output to this path instead of stdout")
    parser.add_argument(
        "--paths",
        help="comma-separated scan roots relative to repo root (default: src,scripts + root files)",
    )
    args = parser.parse_args(argv)

    roots = tuple(p.strip() for p in args.paths.split(",")) if args.paths else DEFAULT_ROOTS
    items = scan(roots)

    output = to_markdown(items) if args.markdown else json.dumps(items, indent=2) + "\n"
    if args.out:
        (ROOT / args.out).write_text(output, encoding="utf-8")
        print("wrote {} item(s) to {}".format(len(items), args.out), file=sys.stderr)
    else:
        sys.stdout.write(output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
