#!/usr/bin/env node
// check-doc-links.mjs — verifies that every reference to a repo file actually resolves.
//
// The doc suite has been renumbered more than once, and a stale `docs/04_DATABASE_ARCHITECTURE.md`
// pointer reads exactly like a live one: nothing fails, an agent simply follows it, finds nothing,
// and works from memory instead. That is the failure mode this catches.
//
// Scans markdown in docs/, tasks/, .claude/ and the root CLAUDE.md for:
//   - markdown links            [text](path.md)
//   - inline-code file mentions `docs/04_DATABASE_ARCHITECTURE.md`, `apps/api/src/app.ts`
// and reports any that do not exist on disk. Exits 1 if there are broken references.
//
//   node scripts/check-doc-links.mjs

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SCAN_DIRS = ['docs', 'tasks', '.claude'];
const SCAN_FILES = ['CLAUDE.md', 'README.md'];

/**
 * Files whose references are forward-looking or frozen, so a non-existent target is correct:
 *   - 08_MISSING_SUGGESTED is a backlog of artefacts that do NOT exist yet — that is its subject.
 *   - _archive/ is superseded history, preserved verbatim; rewriting it would falsify the record.
 */
const SKIP = [/docs[\\/]08_MISSING_SUGGESTED\.md$/, /docs[\\/]_archive[\\/]/];

/** Extensions we can meaningfully assert exist. Anything else (globs, dirs) is skipped. */
const CHECKABLE = /\.(md|ts|tsx|js|mjs|sql|json|ya?ml|sh)$/i;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue;
      walk(full, out);
    } else if (/\.(md|txt)$/i.test(entry) || entry === 'todo') {
      out.push(full);
    }
  }
  return out;
}

const files = [
  ...SCAN_DIRS.flatMap((d) => walk(join(ROOT, d))),
  ...SCAN_FILES.map((f) => join(ROOT, f)).filter(existsSync),
];

// A reference is repo-relative if it names a known top-level dir, otherwise it is resolved
// relative to the file that mentions it (how a sibling doc link is normally written).
const TOP_LEVEL = ['docs/', 'apps/', 'packages/', 'scripts/', 'tasks/', '.claude/', '.github/'];

/** Where source shorthand like `lib/jwt.ts` or `workers/dlq.ts` actually lives. */
const SOURCE_ROOTS = ['apps/api/src', 'packages/db/src', 'packages/config'];

/**
 * Returns every location the reference could legitimately mean. A doc that says
 * `./scripts/verify-pitr.sh` means the repo-root script, not `docs/scripts/...`, so a reference
 * counts as resolved if ANY candidate exists — otherwise the checker manufactures failures.
 */
function candidates(ref, fromFile) {
  const clean = ref.split('#')[0].trim();
  if (!clean || clean.startsWith('http') || clean.startsWith('mailto:')) return [];
  if (clean.includes('*')) return []; // glob, not a path

  const out = [];
  if (clean.startsWith('/')) out.push(join(ROOT, clean.slice(1))); // "/CLAUDE.md" = repo root
  if (TOP_LEVEL.some((p) => clean.startsWith(p))) out.push(join(ROOT, clean));
  if (clean.startsWith('./') || clean.startsWith('../')) {
    out.push(resolve(dirname(fromFile), clean));
    out.push(join(ROOT, clean.replace(/^\.\//, ''))); // docs often mean repo-root
  }
  out.push(join(dirname(fromFile), clean)); // sibling
  out.push(join(ROOT, clean));
  // Docs routinely use source shorthand — `lib/jwt.ts`, `workers/dlq.ts`, `routes/auth.ts` —
  // rather than the full apps/api/src path. That is readable and unambiguous in context, so it
  // resolves rather than being reported.
  for (const base of SOURCE_ROOTS) out.push(join(ROOT, base, clean));
  // `~/.railway/config.json` and other home-relative paths are outside the repo by definition.
  if (clean.startsWith('~')) return [];
  return out;
}

const broken = [];
let checked = 0;

for (const file of files) {
  if (SKIP.some((re) => re.test(file))) continue;
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);

  lines.forEach((line, i) => {
    // Some references are deliberately to things that do not exist — a doc noting that a script
    // was never written, or naming a template due before the first paying client. Marking the
    // line keeps the prose honest instead of contorting it to satisfy the checker.
    if (line.includes('link-check-ignore')) return;

    const refs = new Set();

    for (const m of line.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) refs.add(m[1]);
    for (const m of line.matchAll(/`([^`]+)`/g)) {
      const candidate = m[1].split(/[\s,;:]/)[0];
      if (CHECKABLE.test(candidate) && candidate.includes('/')) refs.add(candidate);
    }

    for (const ref of refs) {
      if (!CHECKABLE.test(ref.split('#')[0])) continue;
      const targets = candidates(ref, file);
      if (targets.length === 0) continue;
      checked++;
      if (!targets.some((t) => existsSync(t))) {
        broken.push({ file: relative(ROOT, file), line: i + 1, ref });
      }
    }
  });
}

if (broken.length === 0) {
  console.log(`✅ doc links OK — ${checked} references checked across ${files.length} files, none broken.`);
  process.exit(0);
}

console.error(`❌ ${broken.length} broken reference(s) of ${checked} checked:\n`);
const byFile = new Map();
for (const b of broken) {
  if (!byFile.has(b.file)) byFile.set(b.file, []);
  byFile.get(b.file).push(b);
}
for (const [file, items] of [...byFile].sort()) {
  console.error(`  ${file}`);
  for (const it of items) console.error(`    :${it.line}  ${it.ref}`);
}
process.exit(1);
