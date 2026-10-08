# Desarrollo

Stack: Tauri 2, React 19, TypeScript, Vite, Tailwind CSS 4 y SQLite/SQLx.

| Ruta                                                | Función                                                         |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `src/components`                                    | Hábitos, reportes, temporizador, temas, audio y actualizaciones |
| `src/services`                                      | Datos, estadísticas, plataforma, tema, audio y releases Android |
| `src-tauri/src`                                     | Comandos Rust, SQLite, migraciones y respaldos                  |
| `src-tauri/gen/android`                             | Proyecto Android, Gradle y wrapper versionados                  |
| `public/focus*` y `scripts/generate-brand-icon.cjs` | Fuentes y generación del icono Sparkles                         |
| `tests`                                             | Pruebas de estadísticas, actualizaciones, firma e interfaz      |
| `.github/workflows/release.yml`                     | Compilación y publicación verificadas                           |

La interfaz se comparte entre Windows y Android. Bandeja, inicio con Windows, instancia única y updater Tauri se limitan a escritorio. Android consulta releases estables de GitHub y abre el APK con el plugin opener.

## Entorno Windows

Instala Node compatible con Vite (CI utiliza Node 24), pnpm 10, Rust estable MSVC, herramientas C++ de Visual Studio, Windows SDK y WebView2.

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd tauri dev
```

Para Android sigue [la guía de compilación](android-release.md). El proyecto ya está generado; no necesitas repetir `tauri android init` para desarrollar.

## Comprobaciones

```powershell
pnpm.cmd build
pnpm.cmd test
python tests/android-signing.py
pnpm.cmd test:ui
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

Las pruebas UI usan Microsoft Edge y comandos Tauri simulados. Las pruebas Rust usan SQLite real en bases aisladas. Python comprueba propiedades de firma con datos ficticios, sin acceder a secretos. Las pruebas automatizadas no sustituyen la instalación real en un teléfono.

## Iconos y versiones

`pnpm.cmd icons` regenera iconos Windows y Android desde Sparkles, incluidos adaptativos, redondos y monocromos.

Mantén la versión en `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` y la entrada `focus-app` de `src-tauri/Cargo.lock`. No edites manualmente los assets producidos durante la compilación. Consulta [publicación](releasing.md).

No incluyas datos personales, respaldos, contraseñas ni keystores en Git. `.android-signing`, `android-backups`, `keystore.properties` y cachés están excluidos.
