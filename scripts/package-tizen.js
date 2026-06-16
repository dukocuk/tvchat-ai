/**
 * Prepares packages/tv-app/tizen/ for Tizen Studio packaging.
 *
 * What it does:
 *   1. Runs `npm run build:tv` to ensure dist/ is fresh
 *   2. Removes old build assets from tizen/ (keeps config.xml and icon.png)
 *   3. Copies dist/* → tizen/
 *
 * After running this, open tizen/ in Tizen Studio and build the .wgt file.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

var ROOT = path.resolve(__dirname, '..');
var TIZEN_DIR = path.join(ROOT, 'packages', 'tv-app', 'tizen');
var DIST_DIR = path.join(ROOT, 'packages', 'tv-app', 'dist');

// ── 1. Build ────────────────────────────────────────────────────────────────
console.log('Building tv-app...');
execSync('npm run build:tv', { cwd: ROOT, stdio: 'inherit' });

// ── 2. Clean tizen/ (keep config.xml and icon.png) ─────────────────────────
console.log('Cleaning tizen/ build assets...');
var preserved = ['config.xml', 'icon.png', '.tproject', '.project'];

fs.readdirSync(TIZEN_DIR).forEach(function (name) {
  if (preserved.indexOf(name) !== -1) return;
  var full = path.join(TIZEN_DIR, name);
  var stat = fs.statSync(full);
  if (stat.isDirectory()) {
    fs.rmSync(full, { recursive: true, force: true });
  } else {
    fs.unlinkSync(full);
  }
});

// ── 3. Copy dist/* → tizen/ ─────────────────────────────────────────────────
console.log('Copying dist/ → tizen/...');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach(function (name) {
    var srcPath = path.join(src, name);
    var destPath = path.join(dest, name);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

copyDir(DIST_DIR, TIZEN_DIR);

// ── Done ────────────────────────────────────────────────────────────────────
console.log('');
console.log('✓ tizen/ is ready for Tizen Studio packaging.');
console.log('  Next: open Tizen Studio → File → Import → Tizen Project');
console.log('  Select: ' + TIZEN_DIR);
console.log('  Then:   Project → Build Signed Package → export .wgt');
console.log('');
