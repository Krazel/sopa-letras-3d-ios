import json, pathlib, plistlib, sys
app = pathlib.Path(sys.argv[1])
config = json.loads(pathlib.Path('store/testflight.json').read_text())
info = plistlib.loads((app / 'Info.plist').read_bytes())
assert info['CFBundleIdentifier'] == config['bundleId']
assert info['CFBundleShortVersionString'] == config['marketingVersion']
assert info['CFBundleVersion'] == str(config['buildNumber'])
assert info['ITSAppUsesNonExemptEncryption'] is False
assert info['UIDeviceFamily'] == [1]
assert (app / 'public/index.html').is_file()
cap = json.loads((app / 'capacitor.config.json').read_text())
assert not cap.get('server', {}).get('url')
assert 'Menú del juego' in (app / 'public/index.html').read_text()
assert 'Crear una sopa' in (app / 'public/index.html').read_text()
assert any(app.rglob('PrivacyInfo.xcprivacy'))
print('Verified iPhone bundle, version/build, bundled game, privacy manifest and export compliance')
