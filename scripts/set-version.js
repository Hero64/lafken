#!/usr/bin/env node

/**
 * Sets the same version across every package in the workspace.
 *
 * Lafken uses fixed versioning: all @lafken/* packages are released together
 * under one version, because they are consumed as a unit and depend on each
 * other through peer dependencies.
 *
 * Internal @lafken/* dependencies use the `workspace:*` protocol, which pnpm
 * replaces with the concrete version at publish time, so they are left alone.
 *
 * Usage: node scripts/set-version.js 0.15.0
 */

const fs = require('node:fs');
const path = require('node:path');

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const PACKAGES_DIR = path.join(__dirname, '..', 'packages');

const getPackageFiles = () =>
  fs
    .readdirSync(PACKAGES_DIR)
    .map((dir) => path.join(PACKAGES_DIR, dir, 'package.json'))
    .filter((file) => fs.existsSync(file));

const setVersion = (version, { log = true } = {}) => {
  if (!SEMVER.test(version)) {
    throw new Error(`Invalid version: ${version}`);
  }

  const files = getPackageFiles();

  for (const file of files) {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf-8'));
    pkg.version = version;
    fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);

    if (log) {
      console.log(`✅ ${pkg.name} → ${version}`);
    }
  }

  return files.length;
};

module.exports = { setVersion, SEMVER };

if (require.main === module) {
  const version = process.argv[2];

  if (!version) {
    console.error('Usage: node scripts/set-version.js <version>');
    process.exit(1);
  }

  try {
    const count = setVersion(version);
    console.log(`\n🎉 ${count} packages set to ${version}`);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}
