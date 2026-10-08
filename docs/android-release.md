# APK Android de produccion

Compilar desde PowerShell en la raiz del proyecto:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-android-release.ps1
```

El script reutiliza la firma `focus-release` y genera un APK para dispositivos
ARM64, incluido el Samsung SM-A528B. Requiere Android Studio, SDK, NDK y el
destino Rust `aarch64-linux-android`.

## Firma permanente

La carpeta privada `.android-signing` contiene `focus-release.jks` y
`password.txt`. Conserva ambos en un respaldo privado fuera del equipo. No
los publiques ni los envies al chat. La carpeta y `keystore.properties`
estan excluidos de Git. El script nunca reemplaza una clave existente.

Si pierdes la clave o su contraseña, no podras firmar actualizaciones
compatibles para las instalaciones de este APK. Una copia dentro del mismo
disco no protege ante una averia del equipo.

## Instalacion inicial desde la version de prueba

La firma de produccion es diferente de la firma de depuracion. Android no
permite reemplazar directamente la version de prueba con este APK.
Antes de desinstalar la version de prueba, respalda y verifica sus datos.
Desinstalar elimina los datos locales. No ejecutes una desinstalacion hasta
haber confirmado que el respaldo puede recuperarse.

## Futuras actualizaciones de produccion

Mantener `com.focus.app`, usar la misma clave y aumentar la version de
`src-tauri/tauri.conf.json` (y mantener las versiones del proyecto coherentes).
Tauri deriva el versionCode Android de esa version. Generar el nuevo APK con
el script e instalarlo con `adb install -r "ruta-completa.apk"`.
La misma firma permite actualizar; no instala actualizaciones automaticamente.

## Verificacion

Verificar el APK con `apksigner verify --verbose --print-certs`, disponible
en Android SDK Build-Tools. El certificado debe coincidir con el de
`focus-release.jks`; el APK de produccion no debe ser depurable.

APK verificado el 8 de octubre de 2026:

- Archivo: `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`
- Version: 0.1.2; versionCode: 1002; arquitectura: arm64-v8a.
- Tamano: 8 462 452 bytes; depuracion desactivada.
- Firma APK v2 verificada con apksigner.
- SHA-256 certificado: `510614a7c250d94da6d6a82244428bfddcc5d86aaefb945896efaea3c971fb12`
- SHA-256 APK: `E4C482D8D2F296F6E9D6B196B9EE47CF75FF3DCBB0D59DF9DA63943C3C15B809`

Estos valores corresponden a este APK; el hash del archivo cambiara al recompilar.
