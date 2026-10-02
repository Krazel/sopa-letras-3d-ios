import fs from 'node:fs';
import path from 'node:path';
const cfg = JSON.parse(fs.readFileSync('store/testflight.json', 'utf8'));
const file = 'ios/App/App.xcodeproj/project.pbxproj';
let project = fs.readFileSync(file, 'utf8');
project = project
  .replace(
    /MARKETING_VERSION = [^;]+;/g,
    `MARKETING_VERSION = ${cfg.marketingVersion};`,
  )
  .replace(
    /CURRENT_PROJECT_VERSION = [^;]+;/g,
    `CURRENT_PROJECT_VERSION = ${cfg.buildNumber};`,
  )
  .replace(
    /IPHONEOS_DEPLOYMENT_TARGET = [^;]+;/g,
    'IPHONEOS_DEPLOYMENT_TARGET = 16.4;',
  )
  .replace(
    /TARGETED_DEVICE_FAMILY = [^;]+;/g,
    'TARGETED_DEVICE_FAMILY = "1,2";',
  )
  .replace(/developmentRegion = [^;]+;/, 'developmentRegion = es;');
fs.writeFileSync(file, project);
const info = 'ios/App/App/Info.plist';
let plist = fs
  .readFileSync(info, 'utf8')
  .replace(
    /(<key>CFBundleDevelopmentRegion<\/key>\s*<string>)[^<]+(<\/string>)/,
    '$1es$2',
  )
  .replace('<string>armv7</string>', '<string>arm64</string>');
if (!plist.includes('ITSAppUsesNonExemptEncryption'))
  plist = plist.replace(
    /<\/dict>\s*<\/plist>\s*$/,
    '\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n\t<key>UIUserInterfaceStyle</key>\n\t<string>Dark</string>\n</dict>\n</plist>',
  );
fs.writeFileSync(info, plist);
const web = 'ios/App/App/public/index.html';
if (!fs.existsSync(web)) throw Error('Run build and cap sync ios first');
const html = fs.readFileSync(web, 'utf8');
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(
  (m) => m[1],
);
if (
  !html.includes('<title>Sopa de letras 3D</title>') ||
  !html.includes('viewport') ||
  !scripts.length ||
  scripts.some(
    (src) =>
      !src.startsWith('/') ||
      !fs.existsSync(path.join('ios/App/App/public', src)),
  )
)
  throw Error(
    'Bundled HTML must contain the game title, mobile viewport and local executable assets',
  );
const chunks = 'ios/App/App/public/_next/static/chunks';
if (
  !fs
    .readdirSync(chunks)
    .some(
      (file) =>
        file.endsWith('.js') &&
        fs
          .readFileSync(path.join(chunks, file), 'utf8')
          .includes('live-home-label'),
    )
)
  throw Error('Bundled game menu code is missing');
const spm = 'ios/App/CapApp-SPM/Package.swift';
fs.writeFileSync(
  spm,
  fs
    .readFileSync(spm, 'utf8')
    .replace(
      /(name: "CapacitorStatusBar", path: ")[^"]+/,
      '$1../../../node_modules/@capacitor/status-bar',
    )
    .replace(/(name: "SopaAds", path: ")[^"]+/, '$1../../../plugins/sopa-ads'),
);
const cap = JSON.parse(
  fs.readFileSync('ios/App/App/capacitor.config.json', 'utf8'),
);
if (cap.server?.url || cap.appId !== cfg.bundleId)
  throw Error('The native game must use its own bundled offline assets');
console.log(
  `Prepared iPhone ${cfg.marketingVersion} (${cfg.buildNumber}), ${cfg.bundleId}, bundled offline game`,
);
