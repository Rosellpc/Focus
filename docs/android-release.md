# Android: desarrollo y APK de producción

Focus utiliza `com.focus.app`, Android mínimo API 24 (Android 7.0) y APK ARM64. Las actualizaciones se descargan en el navegador y requieren confirmación.

## Entorno local

Instala Android Studio, JBR, Platform-Tools, SDK Platform 37.0, Build-Tools 37.0.0, NDK 30.0.16248370 y Rust estable. En Windows:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:NDK_HOME = "$env:ANDROID_HOME\ndk\30.0.16248370"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
rustup target add aarch64-linux-android
pnpm.cmd install --frozen-lockfile
pnpm.cmd tauri android dev
```

Conecta y desbloquea el teléfono, habilita depuración USB y acepta la autorización. El proyecto está en `src-tauri/gen/android`. El APK de desarrollo usa otra firma y puede depender del servidor local.

## Firma permanente

La carpeta privada `.android-signing` contiene `focus-release.jks` y `password.txt`. Conserva ambos fuera del equipo. El alias es `focus-release`; la huella SHA-256 del certificado esperado es:

```text
510614a7c250d94da6d6a82244428bfddcc5d86aaefb945896efaea3c971fb12
```

La carpeta y `keystore.properties` están excluidos de Git. No publiques sus contenidos. Si falta la clave, restaura su respaldo antes de compilar. El script puede crear una clave cuando no existe: una clave nueva no sustituye la firma de las instalaciones actuales.

## Compilación e instalación local

Desde la raíz, con la firma existente:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-android-release.ps1
adb install -r '.\src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release.apk'
```

Aunque la carpeta se llame universal, el comando compila ARM64. Usa la ruta al **archivo `.apk`**, no solo su carpeta. Actualiza sin desinstalar.

Android no permite sustituir directamente una firma de depuración por otra de producción. Antes de desinstalar una versión de prueba, respalda y verifica que puedas recuperar los datos. `scripts/backup-android.py` usa `adb run-as` para exportar la instalación de depuración y copiar un JSON a Descargas; no sirve para el APK de producción. Consulta [las limitaciones de respaldos](user-guide.md).

## GitHub Actions

CI utiliza Java 25, `platforms;android-37.0`, Build-Tools 37.0.0 y NDK 30.0.16248370. setup-android instala `platform-tools` con command-line tools `16111833`; el paquete antiguo `tools` ya no está disponible.

`scripts/configure-android-ci.py` decodifica el Secret, escribe propiedades escapadas para Java y restringe permisos. CI verifica el certificado con apksigner, identificador, versión y ausencia de depuración; genera checksums y elimina archivos temporales.

El release 0.1.4 publica `Focus_0.1.4_arm64.apk` y `ANDROID-SHA256SUMS.txt`. El versionCode derivado es 1004. El hash del APK cambia por versión: compara con el checksum de su release.

La app consulta el último release estable de Rosellpc/Focus y acepta solo la URL esperada del APK para esa versión. Android verifica la firma al instalar. No hay instalación silenciosa. Consulta [publicación](releasing.md) y [la prueba desde 0.1.3](releases/v0.1.4.md).
