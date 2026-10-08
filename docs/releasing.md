# Publicación de Windows y Android

El workflow `.github/workflows/release.yml` se ejecuta al subir una etiqueta `vX.Y.Z` o manualmente con una etiqueta existente. Conserva `com.focus.app` y las claves de firma.

## Secrets

Configúralos en [Settings → Secrets and variables → Actions](https://github.com/Rosellpc/Focus/settings/secrets/actions).

| Secret                               | Contenido                                                      |
| ------------------------------------ | -------------------------------------------------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`          | Clave privada Base64 del updater Tauri, sin encabezados        |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Contraseña de esa clave, si existe                             |
| `ANDROID_KEYSTORE_BASE64`            | Contenido completo de `focus-release.jks` codificado en Base64 |
| `ANDROID_KEY_PASSWORD`               | Contraseña del keystore y del alias `focus-release`            |

GitHub proporciona el token del workflow con permiso de escritura de releases. La firma Tauri verifica actualizaciones Windows; no es Authenticode. Android utiliza su certificado permanente, fijado en el workflow.

Para copiar los Secrets Android al portapapeles sin imprimirlos, desde la raíz:

```powershell
Set-Clipboard -Value ([Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path (Get-Location) '.android-signing/focus-release.jks'))))
# Pegar en ANDROID_KEYSTORE_BASE64.
Set-Clipboard -Value ([IO.File]::ReadAllText((Join-Path (Get-Location) '.android-signing/password.txt')).Trim())
# Pegar en ANDROID_KEY_PASSWORD.
Set-Clipboard -Value ''
```

Conserva una copia privada de la firma fuera del equipo. No publiques las claves.

## Preparar el release

1. Incrementa la versión en `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` y la entrada `focus-app` de `src-tauri/Cargo.lock`.
2. Añade notas en `docs/releases`, actualiza el README y ejecuta las comprobaciones de [desarrollo](development.md) apropiadas al cambio.
3. Revisa el diff, confirma que no incluya datos privados, crea el commit y sube `main`.
4. Crea y sube la etiqueta correspondiente:

```powershell
git tag -a v0.1.4 -m 'Focus v0.1.4'
git push origin main refs/tags/v0.1.4
```

Es un ejemplo; no lo repitas si la etiqueta ya existe. No reutilices ni muevas etiquetas de releases públicos.

## Verificaciones automáticas

1. **release (Windows):** valida versión y secreto, ejecuta pruebas y genera NSIS, `.sig`, `latest.json` y `SHA256SUMS.txt`. Comprueba que la firma del manifiesto coincida con la del instalador; mantiene el release en borrador.
2. **android:** prueba la configuración de firma y la app, compila ARM64 y verifica certificado, identificador, versión y modo de producción. Sube APK y `ANDROID-SHA256SUMS.txt` al borrador.
3. **publish:** descarga los assets, comprueba ambos checksums y la presencia del manifiesto y firma. Publica el release estable como el más reciente.

## Fallos y comprobación final

Si falla, revisa el paso en Actions. Una publicación incompleta permanece en borrador. Para un error transitorio vuelve a ejecutar los trabajos fallidos. Un reintento del mismo commit no incorpora cambios de código: prepara una nueva versión si necesitas corregirlo y no muevas etiquetas públicas. No regeneres claves para resolver fallos de red, SDK o compilación.

La ejecución manual requiere una etiqueta que coincida con la versión del proyecto. La concurrencia evita publicar simultáneamente la misma etiqueta.

Comprueba que el release sea público, estable y el más reciente, y contenga instalador, `.sig`, `latest.json`, APK y ambos checksums. El manifiesto debe indicar la versión correcta y URL y firma Windows x64. Android consulta el último release estable.

Prueba desde una versión anterior siguiendo [las instrucciones de 0.1.4](releases/v0.1.4.md). Las pruebas automatizadas no sustituyen comprobar el aviso, instalación y datos en el teléfono.
