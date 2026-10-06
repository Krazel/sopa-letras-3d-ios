import json, pathlib, plistlib, sys, hashlib, subprocess
app = pathlib.Path(sys.argv[1])
config = json.loads(pathlib.Path('store/testflight.json').read_text())
info = plistlib.loads((app / 'Info.plist').read_bytes())
assert info['CFBundleIdentifier'] == config['bundleId']
assert info['CFBundleShortVersionString'] == config['marketingVersion']
assert info['CFBundleVersion'] == str(config['buildNumber'])
assert info['ITSAppUsesNonExemptEncryption'] is False
assert sorted(info['UIDeviceFamily']) == [1, 2]
assert (app / 'public/index.html').is_file()
cap = json.loads((app / 'capacitor.config.json').read_text())
assert not cap.get('server', {}).get('url')
html = (app / 'public/index.html').read_text()
assert '<title>Sopa de letras 3D</title>' in html and 'viewport' in html
assert any('live-home-label' in p.read_text() for p in (app / 'public/_next/static/chunks').glob('*.js'))
# SDK manifests do not declare the app executable's own required-reason APIs.
# SopaEngagement keeps app-only review/reminder preferences in UserDefaults.
privacy_path = app / 'PrivacyInfo.xcprivacy'
assert privacy_path.is_file(), 'App-level privacy manifest missing (SDK manifests are insufficient)'
privacy = plistlib.loads(privacy_path.read_bytes())
assert privacy['NSPrivacyTracking'] is False
assert privacy['NSPrivacyTrackingDomains'] == []
assert privacy['NSPrivacyCollectedDataTypes'] == []
assert privacy['NSPrivacyAccessedAPITypes'] == [{
    'NSPrivacyAccessedAPIType': 'NSPrivacyAccessedAPICategoryUserDefaults',
    'NSPrivacyAccessedAPITypeReasons': ['CA92.1'],
}], 'App-only UserDefaults reason must match SopaEngagement usage'
brand = json.loads(pathlib.Path('design/branding/official-branding.json').read_text())
for asset in brand['assets']:
    if asset['path'].startswith('public/'):
        assert hashlib.sha256((app / asset['path']).read_bytes()).hexdigest() == asset['sha256'], 'Bundled branding mismatch: ' + asset['path']
assert hashlib.sha256((app / brand['source']).read_bytes()).hexdigest() == brand['sourceSha256']

if config.get('iconSha256'):
    catalog=pathlib.Path('ios/App/App/Assets.xcassets/AppIcon.appiconset')
    icon=json.loads((catalog/'Contents.json').read_text())['images'][0]['filename']
    assert hashlib.sha256((catalog/icon).read_bytes()).hexdigest()==config['iconSha256']
    assets=json.loads(subprocess.check_output(['xcrun','assetutil','--info',str(app/'Assets.car')]))
    assert any('AppIcon' in str(a.get('Name','')) for a in assets), 'Compiled app icon missing'
    assert info['CFBundleIcons']['CFBundlePrimaryIcon']['CFBundleIconName']=='AppIcon'
    assert info['GADApplicationIdentifier']=='ca-app-pub-3425091654264901~5737651561', 'Incorrect Sopa AdMob app'
    assert 'NSUserTrackingUsageDescription' not in info
    pathlib.Path('artifacts/testflight').mkdir(parents=True,exist_ok=True)
    pathlib.Path('artifacts/testflight/icon-verification.json').write_text(json.dumps({'sourceSha256':config['iconSha256'],'compiledIconName':'AppIcon','assets':assets,'commercialReady':False,'brandingSourceSha256':brand['sourceSha256'],'bundledBrandingVerified':True},indent=2))
print('Verified universal iPhone/iPad bundle, version/build, bundled game, privacy manifest and export compliance')
