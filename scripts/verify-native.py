import json, pathlib, plistlib, sys
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
assert any(app.rglob('PrivacyInfo.xcprivacy'))
print('Verified universal iPhone/iPad bundle, version/build, bundled game, privacy manifest and export compliance')
