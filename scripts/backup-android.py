"""Back up the installed debug app without uninstalling it."""
import datetime
import hashlib
import io
import json
from pathlib import Path
import sqlite3
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
ADB = Path.home() / 'AppData/Local/Android/Sdk/platform-tools/adb.exe'
PACKAGE = 'com.focus.app'

def adb(*args):
    return subprocess.run([str(ADB), *args], check=True, capture_output=True).stdout

devices = [line.split()[0] for line in adb('devices').decode().splitlines()[1:]
           if line.strip().endswith('\tdevice')]
if len(devices) != 1:
    raise SystemExit('Conecta un unico telefono y autoriza la depuracion USB.')
folder = ROOT / 'android-backups' / datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
folder.mkdir(parents=True, exist_ok=False)
adb('shell', 'am', 'force-stop', PACKAGE)
data = adb('exec-out', 'run-as', PACKAGE, 'tar', '-cf', '-', '.')
archive = folder / 'focus-debug-data.tar'
archive.write_bytes(data)
with tarfile.open(fileobj=io.BytesIO(data)) as tar:
    members = {m.name.removeprefix('./'): m for m in tar.getmembers()}
    for name in ('dailyfocus.db', 'dailyfocus.db-wal', 'dailyfocus.db-shm'):
        if name in members:
            (folder / name).write_bytes(tar.extractfile(members[name]).read())
db = sqlite3.connect(folder / 'dailyfocus.db')
db.row_factory = sqlite3.Row
assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok', 'Base corrupta'
def rows(table, mapping):
    return [{dest: (bool(row[src]) if dest in ('active', 'completed') else row[src])
             for src, dest in mapping.items()} for row in db.execute(f'SELECT * FROM {table}')]
snapshot = {
    'version': 3,
    'habits': rows('habits', {'id':'id', 'title':'title', 'target_hours':'targetHours', 'color':'color', 'created_on':'createdOn', 'archived_on':'archivedOn'}),
    'logs': rows('daily_logs', {'habit_id':'habitId', 'log_date':'logDate', 'logged_minutes':'loggedMinutes', 'completed':'completed'}),
    'goals': rows('habit_goals', {'habit_id':'habitId', 'effective_on':'effectiveOn', 'target_hours':'targetHours'}),
    'activity': rows('habit_activity', {'habit_id':'habitId', 'effective_on':'effectiveOn', 'active':'active'}),
}
db.close()
restore_file = folder / 'Focus-restaurar.json'
restore_file.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding='utf-8')
assert json.loads(restore_file.read_text(encoding='utf-8')) == snapshot
(folder / 'SHA256SUMS.txt').write_text('\n'.join(
    hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.name
    for p in (archive, restore_file)), encoding='ascii')
adb('push', str(restore_file), '/sdcard/Download/Focus-restaurar.json')
print(f'Respaldo verificado: {folder}')
print(f'Habitos: {len(snapshot["habits"])}; registros: {len(snapshot["logs"])}; metas: {len(snapshot["goals"])}; actividad: {len(snapshot["activity"])}')
print('JSON de restauracion copiado a Descargas del telefono. Focus sigue instalada.')
