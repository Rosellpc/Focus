![Focus — hábitos, tiempo y progreso](docs/focus-cover.svg)

# Focus

**Organiza tus hábitos, registra tus horas y empieza cada día desde cero.** Focus es una aplicación de escritorio para Windows 11, con almacenamiento local y una interfaz minimalista de cristal en tonos cálidos. No requiere cuenta ni conexión a Internet para el uso diario.

[Descargar Focus v0.1.1 para Windows](https://github.com/Rosellpc/Focus/releases/download/v0.1.1/Focus_0.1.1_x64-setup.exe) · [Ver releases](https://github.com/Rosellpc/Focus/releases) · [Notas de v0.1.1](docs/releases/v0.1.1.md)

![Interfaz de Focus con datos de prueba](docs/design-preview.png)

![Temporizador y opciones de escritorio](docs/timer-preview.png)

## Instalación en Windows 11

1. Descarga `Focus_0.1.1_x64-setup.exe` desde el [release v0.1.1](https://github.com/Rosellpc/Focus/releases/tag/v0.1.1).
2. Ejecuta el instalador y sigue el asistente: **Siguiente → Instalar → Finalizar**.
3. Abre **Inicio**, busca **Focus** y ejecútalo. También puedes crear un acceso directo en el escritorio desde la ubicación del acceso directo en Inicio.

El instalador es para Windows **x64** y el usuario actual. No necesitas Node, Rust ni una terminal para usar la aplicación instalada. Focus utiliza Microsoft Edge WebView2; si falta, el instalador puede descargarlo, por lo que ese paso requiere Internet. El instalador no está firmado digitalmente.

El release incluye `SHA256SUMS.txt` para comprobar el archivo descargado. Desde PowerShell, en la carpeta de descargas:

```powershell
Get-FileHash .\Focus_0.1.1_x64-setup.exe -Algorithm SHA256
```

Compara el resultado con el checksum publicado.

## Qué puedes hacer

- **Crear y editar hábitos:** define el nombre y la meta diaria en minutos. Las metas nuevas se aplican desde el día de la edición y conservan el historial anterior.
- **Registrar tiempo:** suma 30 minutos o una hora, resta 30 minutos o edita el total. Se permiten minutos por encima de la meta, hasta 1440 por hábito y día.
- **Completar una tarea:** el botón **Tarea completada** registra como mínimo las horas de su meta, sin duplicar el tiempo ya registrado. La card desaparece para esa fecha; sus horas siguen contando en el progreso y los reportes. Al día siguiente reaparece con cero minutos.
- **Recuperar una tarea completada:** abre **Tareas completadas → Volver a mostrar**. Las horas se conservan para que puedas corregirlas.
- **Consultar días anteriores:** cambia **Fecha del registro** para revisar o corregir el historial. La app utiliza la fecha local de Windows y actualiza el día al llegar la medianoche o volver de suspensión.
- **Consultar reportes mensuales:** revisa horas acumuladas, porcentaje de cumplimiento, mejor categoría y comparación con el mes anterior. Las metas corresponden al mes completo y respetan el historial de metas y períodos activos.
- **Archivar y reactivar hábitos:** conserva sus registros y los períodos en que estuvieron activos. Archivar excluye la meta desde ese día; los minutos registrados siguen en los reportes.
- **Usar el temporizador:** selecciona un hábito y una duración. **Guardar sesión** confirma los minutos; **Terminar y guardar** registra los minutos completos transcurridos. La sesión conserva su fecha de inicio y hora de finalización si cierras o suspendes el equipo.

La interfaz adapta sus paneles al ancho de la ventana y respeta la preferencia de movimiento reducido. Los cambios de nombre y color también se reflejan en reportes anteriores.

## Opciones de escritorio

Abre **Temporizador y opciones de escritorio**, o su acceso en la navegación lateral:

- **Iniciar con Windows:** activa esta opción desde la versión instalada para registrar su ubicación definitiva.
- **Notificar al terminar:** habilita las notificaciones de sesiones. Se muestran mientras Focus está ejecutándose, incluso si lo ocultaste en la bandeja.
- **Ocultar en la bandeja:** mantiene la app funcionando. Su icono permite abrir, ocultar o salir de Focus.

Cerrar la ventana termina la aplicación. Abrir Focus por segunda vez activa la ventana existente.

## Datos, respaldos y actualización

Los hábitos, minutos, tareas completadas y metas se guardan en SQLite, en `dailyfocus.db`, dentro de la carpeta de configuración de la app: normalmente `%APPDATA%\com.focus.app\` en Windows.

**Crear respaldo** guarda un JSON completo en la subcarpeta `backups`. **Mostrar respaldo** abre su ubicación en el Explorador. Copia ese archivo a otra unidad para protegerte ante un fallo del disco.

**Restaurar respaldo** valida el archivo y pide confirmación. Antes de reemplazar los datos, guarda una copia de los registros actuales. La restauración se ejecuta en una transacción: si falla, la base anterior se conserva. Los respaldos contienen información personal de tus hábitos; no los subas al repositorio.

Para actualizar Focus:

1. Crea un respaldo.
2. Cierra la app.
3. Ejecuta el instalador de la versión nueva y abre Focus otra vez.

Se conserva el identificador `com.focus.app` para mantener la ubicación de los datos. Las migraciones de SQLite son versionadas y transaccionales. La interfaz muestra los errores de guardado y confirma las operaciones antes de reflejarlas en el contador.

## Desarrollo

Stack: **Tauri 2 · React 19 · TypeScript · Tailwind CSS 4 · SQLite/SQLx**.

Requisitos de compilación en Windows:

- Node.js 22.12 o superior dentro de la rama 22, o una versión superior compatible con Vite, y pnpm.
- Rust estable con el toolchain MSVC y Cargo disponible en el `PATH`.
- Visual Studio con herramientas C++ de escritorio y Windows SDK.
- Microsoft Edge WebView2. Las pruebas de interfaz utilizan Microsoft Edge.

```bash
git clone https://github.com/Rosellpc/Focus.git
cd Focus
pnpm install --frozen-lockfile
pnpm tauri dev
```

Validación:

```bash
pnpm build
pnpm test
pnpm test:ui
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

Las pruebas de interfaz simulan los comandos Tauri. Las pruebas Rust utilizan SQLite real en bases aisladas para verificar migraciones, guardados simultáneos, tareas completadas, restauración y persistencia después de reabrir.

Crear el instalador:

```bash
pnpm tauri build
```

El archivo se genera en `src-tauri/target/release/bundle/nsis/`. En PowerShell, si la política de scripts bloquea `pnpm.ps1`, usa `pnpm.cmd`.

El icono original está en `public/focus.svg`; se regenera con:

```bash
pnpm tauri icon public/focus.svg
```
