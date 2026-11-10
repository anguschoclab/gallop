#!/usr/bin/env python3
"""Query marker-comment scan results produced by generate_todos.py.

Examples:
    python3 search_todos.py raceResolution
    python3 search_todos.py --marker TODO
    python3 search_todos.py --file tests/ --marker FIX --json
"""

import argparse
import json
import sys

import generate_todos


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query", nargs="?", help="substring matched against path and comment text")
    parser.add_argument("--marker", choices=list(generate_todos.MARKERS))
    parser.add_argument("--file", help="substring matched against the file path")
    parser.add_argument("--text", help="substring matched against the comment text")
    parser.add_argument("--paths", help="forwarded to the scanner (comma-separated roots)")
    parser.add_argument("--json", action="store_true", help="emit JSON instead of lines")
    args = parser.parse_args(argv)

    roots = tuple(p.strip() for p in args.paths.split(",")) if args.paths else None
    items = generate_todos.scan(roots) if roots else generate_todos.scan()

    def keep(it):
        if args.marker and it["marker"] != args.marker:
            return False
        if args.file and args.file not in it["file"]:
            return False
        if args.text and args.text.lower() not in it["text"].lower():
            return False
        if args.query:
            q = args.query.lower()
            if q not in it["file"].lower() and q not in it["text"].lower():
                return False
        return True

    items = [it for it in items if keep(it)]

    if args.json:
        sys.stdout.write(json.dumps(items, indent=2) + "\n")
    else:
        for it in items:
            sys.stdout.write("{}:{}\t{}\t{}\n".format(it["file"], it["line"], it["marker"], it["text"]))
        sys.stdout.write("-- {} item(s)\n".format(len(items)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
