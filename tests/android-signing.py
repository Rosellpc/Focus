import base64
import importlib.util
from pathlib import Path
import re
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('signing', Path(__file__).resolve().parents[1] / 'scripts/configure-android-ci.py')
signing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(signing)


class AndroidSigning(unittest.TestCase):
    def test_properties_preserve_password_and_path(self):
        with tempfile.TemporaryDirectory(prefix='focus signing ') as folder:
            root = Path(folder)
            (root / 'src-tauri/gen/android').mkdir(parents=True)
            password = ' space:=#!' + chr(92) + chr(10) + 'ñ🔑'
            key, properties = signing.configure_signing(root, {
                'RUNNER_TEMP': folder,
                'ANDROID_KEYSTORE_BASE64': base64.b64encode(b'test key').decode(),
                'ANDROID_KEY_PASSWORD': password,
            })
            self.assertEqual(key.read_bytes(), b'test key')
            lines = properties.read_text('ascii').splitlines()
            self.assertEqual(len(lines), 3)
            self.assertEqual(lines[0], 'keyAlias=focus-release')
            def decode(value):
                pairs = re.findall(chr(92) + chr(92) + 'u([0-9a-f]{4})', value)
                return bytes.fromhex(''.join(pairs)).decode('utf-16-be')
            self.assertEqual(decode(lines[1].split('=', 1)[1]), password)
            self.assertEqual(decode(lines[2].split('=', 1)[1]), key.as_posix())

    def test_missing_secrets_fail_before_writing(self):
        with self.assertRaisesRegex(ValueError, 'Missing'):
            signing.configure_signing(Path('.'), {})


if __name__ == '__main__':
    unittest.main()
