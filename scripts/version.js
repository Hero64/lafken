#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

// ---- CONFIG ----
const PACKAGES_DIR = path.join(process.cwd(), 'packages');
const MAIN_PACKAGE = path.join(PACKAGES_DIR, 'main', 'package.json');

// ---- UTILS ----
const readJSON = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const writeJSON = (filePath, data) => {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
};

const getAllPackageJsonFiles = () => {
  return fs
    .readdirSync(PACKAGES_DIR)
    .map((dir) => path.join(PACKAGES_DIR, dir, 'package.json'))
    .filter((file) => fs.existsSync(file));
};

const bumpVersion = (version, type) => {
  const [main, _pre] = version.split('-');
  let [major, minor, patch] = main.split('.').map(Number);

  if (type === 'major') {
    major++;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor++;
    patch = 0;
  } else if (type === 'patch') {
    patch++;
  }

  return `${major}.${minor}.${patch}`;
};

// ---- CLI ----
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q) => new Promise((resolve) => rl.question(q, (ans) => resolve(ans)));

(async () => {
  try {
    const mainPkg = readJSON(MAIN_PACKAGE);
    const currentVersion = mainPkg.version;

    console.log(`\n📦 Current version: ${currentVersion}\n`);

    const type = await ask('Select version bump (major/minor/patch/manual): ');

    let newVersion;

    if (type === 'manual') {
      newVersion = await ask('Enter full version (e.g. 1.2.3-alpha.0): ');
    } else if (['major', 'minor', 'patch'].includes(type)) {
      newVersion = bumpVersion(currentVersion, type);

      const pre = await ask('Pre-release? (alpha/beta/rc/none): ');

      if (pre && pre !== 'none') {
        newVersion = `${newVersion}-${pre}.0`;
      }
    } else {
      console.log('❌ Invalid option');
      process.exit(1);
    }

    console.log(`\n🚀 New version: ${newVersion}\n`);

    const confirm = await ask('Continue? (y/n): ');
    if (confirm !== 'y') {
      console.log('Cancelled.');
      process.exit(0);
    }

    const packageFiles = getAllPackageJsonFiles();

    packageFiles.forEach((file) => {
      const pkg = readJSON(file);
      pkg.version = newVersion;

      if (pkg.dependencies) {
        Object.keys(pkg.dependencies).forEach((dep) => {
          if (dep.startsWith('@your-scope/')) {
            pkg.dependencies[dep] = newVersion;
          }
        });
      }

      if (pkg.devDependencies) {
        Object.keys(pkg.devDependencies).forEach((dep) => {
          if (dep.startsWith('@your-scope/')) {
            pkg.devDependencies[dep] = newVersion;
          }
        });
      }

      writeJSON(file, pkg);
      console.log(`✅ Updated: ${file}`);
    });

    console.log('\n🎉 All packages updated!');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    rl.close();
  }
})();
