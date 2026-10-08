"""Write signing files from GitHub Actions secrets without printing them."""
import base64
import os
from pathlib import Path

root = Path(__file__).resolve().parents[1]
encoded = os.environ.get('ANDROID_KEYSTORE_BASE64', '')
password = os.environ.get('ANDROID_KEY_PASSWORD', '')
if not encoded or not password:
    raise SystemExit('Missing ANDROID_KEYSTORE_BASE64 or ANDROID_KEY_PASSWORD secret')
key = Path(os.environ['RUNNER_TEMP']) / 'focus-release.jks'
key.write_bytes(base64.b64decode(encoded, validate=True))
key.chmod(0o600)
# Escape Java Properties syntax, including non-ASCII characters.
def escape(value):
    result = ''
    for char in value:
        if char in '\\:=#! ':
            result += '\\' + char
        elif char == '\n': result += '\\n'
        elif char == '\r': result += '\\r'
        elif ord(char) > 127: result += f'\\u{ord(char):04x}'
        else: result += char
    return result
properties = root / 'src-tauri/gen/android/keystore.properties'
properties.write_text(f'keyAlias=focus-release\npassword={escape(password)}\nstoreFile={escape(key.as_posix())}\n', encoding='ascii')
properties.chmod(0o600)
print('Android signing configured; private key not logged.')
