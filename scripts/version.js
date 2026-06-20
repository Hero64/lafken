#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { execSync } = require('node:child_process');

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

const getCurrentBranch = () => {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
};

const getBranchVersion = (branch) => {
  const match = branch.match(/\d+\.\d+\.\d+/);
  return match ? match[0] : null;
};

const run = (cmd) => {
  console.log(`\n$ ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit' });
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

const ask = (q, defaultValue) =>
  new Promise((resolve) => {
    const hint = defaultValue !== undefined ? ` [${defaultValue}]` : '';
    rl.question(`${q}${hint}: `, (ans) => resolve(ans.trim() || defaultValue));
  });

(async () => {
  try {
    const mainPkg = readJSON(MAIN_PACKAGE);
    const currentVersion = mainPkg.version;

    console.log(`\n📦 Current version: ${currentVersion}\n`);

    const type = await ask('Select version bump (major/minor/patch/manual)', 'patch');

    let newVersion;

    if (type === 'manual') {
      newVersion = await ask('Enter full version (e.g. 1.2.3-alpha.0)');
    } else if (['major', 'minor', 'patch'].includes(type)) {
      newVersion = bumpVersion(currentVersion, type);

      const pre = await ask('Pre-release? (alpha/beta/rc/none)', 'none');

      if (pre && pre !== 'none') {
        newVersion = `${newVersion}-${pre}.0`;
      }
    } else {
      console.log('❌ Invalid option');
      process.exit(1);
    }

    console.log(`\n🚀 New version: ${newVersion}\n`);

    const confirm = await ask('Continue? (y/n)', 'y');
    if (!['y', 'yes'].includes(confirm.toLowerCase())) {
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

    // ---- RELEASE ----
    const release = await ask('\n📦 Run release? (pnpm release) (y/n)', 'y');
    if (['y', 'yes'].includes(release.toLowerCase())) {
      run('pnpm release');
    }

    // ---- COMMIT ----
    const branch = getCurrentBranch();
    const branchVersion = getBranchVersion(branch);
    const defaultMessage = `chore: bump to ${branchVersion || newVersion}`;

    const doCommit = await ask('\n📝 Create commit? (y/n)', 'y');
    if (['y', 'yes'].includes(doCommit.toLowerCase())) {
      const message = await ask('Commit message', defaultMessage);
      run('git add -A');
      run(`git commit -m "${message}"`);
      console.log('\n✅ Commit created!');
    }
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    rl.close();
  }
})();
