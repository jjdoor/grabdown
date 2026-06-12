#!/usr/bin/env node
/*
 * Grabdown build — assembles store-ready zips for Chrome/Edge and Firefox.
 *
 * Chrome/Edge use manifest.json as-is. Firefox uses manifest.firefox.json
 * (renamed to manifest.json in its package). Everything else is identical, so a
 * single source tree produces both packages. No dependencies — shells out to zip.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const SHARED = ['src', 'icons'];

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function cp(src, dst) { fs.cpSync(src, dst, { recursive: true }); }

function stage(target, manifestFile) {
  const dir = path.join(DIST, target);
  rmrf(dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(ROOT, manifestFile), path.join(dir, 'manifest.json'));
  for (const item of SHARED) cp(path.join(ROOT, item), path.join(dir, item));
  // Drop the source SVG from the packaged icons — only PNGs ship.
  rmrf(path.join(dir, 'icons', 'icon.svg'));
  return dir;
}

function zipDir(dir, zipName) {
  const zipPath = path.join(DIST, zipName);
  rmrf(zipPath);
  execSync(`cd "${dir}" && zip -r -q -X "${zipPath}" .`, { stdio: 'inherit' });
  const kb = (fs.statSync(zipPath).size / 1024).toFixed(1);
  console.log(`  ${zipName}  (${kb} KB)`);
}

const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')).version;
console.log(`Building Grabdown v${version}`);

const chromeDir = stage('chrome', 'manifest.json');
zipDir(chromeDir, `grabdown-chrome-${version}.zip`);

const firefoxDir = stage('firefox', 'manifest.firefox.json');
zipDir(firefoxDir, `grabdown-firefox-${version}.zip`);

console.log('Done. Chrome zip uploads to Chrome Web Store & Edge Add-ons; Firefox zip to AMO.');
