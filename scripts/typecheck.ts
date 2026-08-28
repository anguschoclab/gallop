/**
 * scripts/typecheck.ts
 *
 * Cross-platform TypeScript error checker for agents.
 *
 * Runs `tsc --noEmit --pretty false` via bunx, parses the output into a clean
 * structured report, writes it to tsc-results.txt, and prints a summary to
 * stdout. Exit code matches tsc's exit code (0 = clean, non-zero = errors).
 *
 * Usage:
 *   bun run scripts/typecheck.ts              # full report
 *   bun run scripts/typecheck.ts --quiet      # summary only (errors still go to file)
 *   bun run scripts/typecheck.ts --watch      # not supported, exits with message
 *
 * npm script:
 *   bun run typecheck:errors
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const RESULTS_FILE = resolve(import.meta.dir, "..", "tsc-results.txt");
const args = process.argv.slice(2);
const quiet = args.includes("--quiet") || args.includes("-q");

if (args.includes("--watch") || args.includes("-w")) {
  console.error("typecheck.ts does not support --watch. Use `bunx tsc --noEmit --watch` directly.");
  process.exit(2);
}

// Run tsc via `bun x` (cross-platform, no global install needed).
// Using `bun x` instead of `bunx`/`bunx.cmd` avoids Windows exit-code
// propagation issues with spawnSync + .cmd wrappers.
// --pretty false  → machine-readable output, no ANSI escape codes.
// --noEmit        → type-check only, no JS output.
const result = spawnSync("bun", ["x", "tsc", "--noEmit", "--pretty", "false"], {
  cwd: resolve(import.meta.dir, ".."),
  encoding: "utf-8",
  // Combine stdout + stderr so we capture everything tsc emits.
  maxBuffer: 20 * 1024 * 1024,
});

const rawOutput = [result.stdout ?? "", result.stderr ?? ""].join("").trim();

// tsc error lines look like:
//   src/path/file.ts(12,34): error TS1234: Some message
//   src/path/file.ts(12,34): warning TS5678: Some warning
const errorRegex = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/;
const errors: {
  file: string;
  line: number;
  col: number;
  severity: string;
  code: string;
  message: string;
}[] = [];
const warnings: typeof errors = [];
const unparsed: string[] = [];

for (const line of rawOutput.split(/\r?\n/)) {
  if (!line.trim()) continue;
  const match = line.match(errorRegex);
  if (match) {
    const [, file, lineNum, col, severity, code, message] = match;
    const entry = {
      file,
      line: parseInt(lineNum, 10),
      col: parseInt(col, 10),
      severity,
      code,
      message,
    };
    if (severity === "error") errors.push(entry);
    else warnings.push(entry);
  } else {
    unparsed.push(line);
  }
}

// Group errors by file for the report.
const byFile = new Map<string, typeof errors>();
for (const e of errors) {
  const list = byFile.get(e.file) ?? [];
  list.push(e);
  byFile.set(e.file, list);
}

// Build the report file.
const reportLines: string[] = [];
reportLines.push(`# TypeScript Check Results`);
reportLines.push(`# Generated: ${new Date().toISOString()}`);
reportLines.push(`# Command: bun x tsc --noEmit --pretty false`);
reportLines.push(`# Errors: ${errors.length}  Warnings: ${warnings.length}  Exit: ${result.status}`);
reportLines.push("");

if (errors.length === 0 && warnings.length === 0) {
  reportLines.push("No type errors or warnings.");
  if (unparsed.length > 0) {
    reportLines.push("", "# Unparsed output:", ...unparsed);
  }
} else {
  if (errors.length > 0) {
    reportLines.push("## Errors");
    for (const [file, list] of byFile) {
      reportLines.push("");
      reportLines.push(`### ${file} (${list.length})`);
      for (const e of list) {
        reportLines.push(`  ${e.line}:${e.col}  ${e.code}  ${e.message}`);
      }
    }
    reportLines.push("");
  }
  if (warnings.length > 0) {
    reportLines.push("## Warnings");
    for (const w of warnings) {
      reportLines.push(`  ${w.file}:${w.line}:${w.col}  ${w.code}  ${w.message}`);
    }
    reportLines.push("");
  }
  if (unparsed.length > 0) {
    reportLines.push("## Unparsed output");
    for (const u of unparsed) reportLines.push(`  ${u}`);
  }
}

const report = reportLines.join("\n");
writeFileSync(RESULTS_FILE, report + "\n", "utf-8");

// Print summary to stdout.
if (errors.length === 0 && warnings.length === 0) {
  console.log("✅ TypeScript: 0 errors, 0 warnings");
  if (!quiet && unparsed.length > 0) {
    console.log("   (unparsed output written to tsc-results.txt)");
  }
} else {
  console.log(`❌ TypeScript: ${errors.length} error(s), ${warnings.length} warning(s)`);
  if (!quiet) {
    for (const e of errors) {
      console.log(`  ERROR  ${e.file}:${e.line}:${e.col}  ${e.code}  ${e.message}`);
    }
    for (const w of warnings) {
      console.log(`  WARN   ${w.file}:${w.line}:${w.col}  ${w.code}  ${w.message}`);
    }
  }
  console.log(`   Full report: tsc-results.txt`);
}

// Propagate tsc's exit code. If we couldn't get the status (null), fall back
// to checking whether we found errors — errors means non-zero, clean means 0.
const exitCode =
  result.status !== null
    ? result.status
    : errors.length > 0
      ? 1
      : 0;
process.exit(exitCode);
