"""Write signing files from Actions secrets without printing their contents."""
import base64
import os
from pathlib import Path


def escape_property(value):
    encoded = value.encode('utf-16-be')
    return ''.join(chr(92) + 'u' + encoded[i:i + 2].hex()
                   for i in range(0, len(encoded), 2))


def configure_signing(root, environment):
    encoded = environment.get('ANDROID_KEYSTORE_BASE64', '')
    password = environment.get('ANDROID_KEY_PASSWORD', '')
    if not encoded or not password:
        raise ValueError('Missing ANDROID_KEYSTORE_BASE64 or ANDROID_KEY_PASSWORD secret')
    decoded = base64.b64decode(encoded, validate=True)
    if not decoded:
        raise ValueError('Android keystore is empty')
    key = Path(environment['RUNNER_TEMP']) / 'focus-release.jks'
    key.write_bytes(decoded)
    key.chmod(0o600)
    properties = root / 'src-tauri/gen/android/keystore.properties'
    properties.write_text(chr(10).join([
        'keyAlias=focus-release',
        'password=' + escape_property(password),
        'storeFile=' + escape_property(key.as_posix()),
        '',
    ]), encoding='ascii')
    properties.chmod(0o600)
    return key, properties


if __name__ == '__main__':
    configure_signing(Path(__file__).resolve().parents[1], os.environ)
    print('Android signing configured; private key not logged.')
