#!/usr/bin/env node

/**
 * Renders one markdown table out of the per-package coverage summaries.
 *
 * Each package measures itself, so `pnpm test:coverage` leaves twelve
 * `packages/*\/coverage/coverage-summary.json` files and no repo-wide number.
 * This collects them into a single view, sorted weakest first — the interesting
 * end of the list.
 *
 * On CI the table is appended to the job summary; run it locally with no
 * GITHUB_STEP_SUMMARY set and it prints to stdout instead.
 *
 * Usage: node scripts/coverage-report.js
 */

const fs = require('node:fs');
const path = require('node:path');

const PACKAGES_DIR = path.join(__dirname, '..', 'packages');
const METRICS = ['statements', 'branches', 'functions', 'lines'];

function collect() {
  return fs
    .readdirSync(PACKAGES_DIR)
    .map((name) => ({
      name,
      file: path.join(PACKAGES_DIR, name, 'coverage', 'coverage-summary.json'),
    }))
    .filter(({ file }) => fs.existsSync(file))
    .map(({ name, file }) => {
      const { total } = JSON.parse(fs.readFileSync(file, 'utf8'));
      return { name, total };
    })
    .sort((a, b) => a.total.lines.pct - b.total.lines.pct);
}

function render(rows) {
  const pct = (m) => `${m.pct.toFixed(1)}%`;
  const lines = [
    '## 🧪 Coverage',
    '',
    '| Package | Statements | Branches | Functions | Lines |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...rows.map(
      ({ name, total }) =>
        `| \`@lafken/${name}\` | ${METRICS.map((m) => pct(total[m])).join(' | ')} |`
    ),
  ];

  // A weighted total, not an average of averages: a 40-line package must not
  // count the same as a 1900-line one.
  const sum = (metric, key) =>
    rows.reduce((acc, { total }) => acc + total[metric][key], 0);
  const overall = METRICS.map((m) => {
    const covered = sum(m, 'covered');
    const totalCount = sum(m, 'total');
    return totalCount === 0 ? '—' : `${((covered / totalCount) * 100).toFixed(1)}%`;
  });

  lines.push(`| **Total** | ${overall.map((v) => `**${v}**`).join(' | ')} |`, '');
  return lines.join('\n');
}

const rows = collect();

if (rows.length === 0) {
  console.error('No coverage summaries found — run `pnpm test:coverage` first.');
  process.exit(1);
}

const table = render(rows);
const summaryFile = process.env.GITHUB_STEP_SUMMARY;

if (summaryFile) {
  fs.appendFileSync(summaryFile, `${table}\n`);
}

console.log(table);
