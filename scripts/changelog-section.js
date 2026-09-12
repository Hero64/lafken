#!/usr/bin/env node

/**
 * Prints the CHANGELOG.md section for a given version, used as the body of the
 * GitHub release.
 *
 * Exits non-zero when the section is missing or empty, so the release pipeline
 * refuses to cut a release that has no release notes written for it.
 *
 * Usage: node scripts/changelog-section.js 0.15.0
 */

const fs = require('node:fs');
const path = require('node:path');

const CHANGELOG = path.join(__dirname, '..', 'CHANGELOG.md');

const getSection = (version) => {
  const lines = fs.readFileSync(CHANGELOG, 'utf-8').split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);

  if (start === -1) {
    throw new Error(`No "## ${version}" section found in CHANGELOG.md`);
  }

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();

  if (!body) {
    throw new Error(`The "## ${version}" section in CHANGELOG.md is empty`);
  }

  return body;
};

module.exports = { getSection };

if (require.main === module) {
  const version = process.argv[2];

  if (!version) {
    console.error('Usage: node scripts/changelog-section.js <version>');
    process.exit(1);
  }

  try {
    console.log(getSection(version));
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}
