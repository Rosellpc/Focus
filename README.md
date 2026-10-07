# Focus para Windows 11

Aplicación local de hábitos, registro de minutos y reportes mensuales. Funciona sin cuenta ni conexión a Internet después de instalarla.

## Diseño

Interfaz de cristal translúcido en tonos cálidos, con navegación lateral, tarjetas minimalistas e indicador circular de progreso. El diseño se adapta al ancho de la ventana y respeta la preferencia de movimiento reducido.

[Vista previa del escritorio con datos de prueba](docs/design-preview.png).

## Instalar

El instalador se genera en `src-tauri/target/release/bundle/nsis/Focus_0.1.0_x64-setup.exe`. Ejecútalo y abre Focus desde el menú Inicio. El instalador es para el usuario actual. WebView2 es necesario; el instalador de Tauri puede instalarlo si falta. El instalador no lleva una firma comercial.

## Uso

- **Fecha del registro** permite consultar y corregir días anteriores. La fecha usa la hora local de Windows y cambia automáticamente a medianoche o al volver de suspensión.
- **30m**, **1h**, **−30m** y **Editar minutos** guardan registros reales. Se permiten minutos por encima de la meta, hasta 1440 por hábito y día. El progreso visual se limita al ancho de la barra; el porcentaje refleja todo el tiempo registrado.
- **Tarea completada** registra como mínimo las horas de la meta diaria sin duplicar el tiempo ya registrado. Oculta la card solo para esa fecha, conserva sus horas en el contador y en los reportes, y persiste al reiniciar. Al día siguiente vuelve a aparecer desde cero. **Tareas completadas** permite volver a mostrarla para corregir un registro.
- **Nuevo hábito** y **Editar hábito** permiten nombre, color y meta en minutos. Las metas cambian desde hoy y conservan el historial de días anteriores. Los cambios de nombre y color sí se reflejan en los reportes históricos.
- **Administrar hábitos** permite archivar y reactivar sin borrar registros. Se conserva el historial de los períodos activos. Archivar excluye la meta desde hoy; los minutos anteriores siguen presentes en los reportes.
- **Reporte mensual** suma los minutos exactos, calcula la categoría con mayor cumplimiento y compara con el mes anterior. La meta incluye el mes completo y respeta metas y períodos activos. No hay datos simulados.
- **Temporizador** conserva su fecha de inicio, duración y hora de finalización al cerrar/reabrir. **Guardar sesión** confirma los minutos; **Terminar y guardar** registra los minutos completos transcurridos. Las notificaciones llegan cuando Focus está ejecutándose, incluida la bandeja.
- **Iniciar con Windows** y **Notificar al terminar** son opciones voluntarias. Configura el inicio automático desde la versión instalada para registrar su ubicación definitiva.
- **Ocultar en la bandeja** mantiene la aplicación funcionando. El menú de la bandeja permite abrir, ocultar y salir. Cerrar la ventana termina la aplicación. Una segunda apertura activa la ventana existente.

## Datos y respaldos

Se conserva el identificador `com.focus.app` y el archivo `dailyfocus.db` para migrar automáticamente la base anterior. La base está en la carpeta de configuración de usuario de Tauri, normalmente `%APPDATA%/com.focus.app/` en Windows.

**Crear respaldo** guarda un JSON completo en la subcarpeta `backups`. **Mostrar respaldo** abre su ubicación en el Explorador. Copia los respaldos a otra unidad para protegerte ante fallos del disco. **Restaurar respaldo** valida el archivo, solicita confirmación, crea una copia de los datos actuales y reemplaza hábitos, registros, metas y períodos activos dentro de una transacción. Si falla, se conserva la base anterior.

Las migraciones SQLite están versionadas y son transaccionales. El acceso a SQLite se realiza desde comandos Rust con validación, consultas parametrizadas y una conexión serializada. La interfaz muestra errores y solo actualiza los datos después de confirmar el guardado.

## Desarrollo y validación

Requisitos: Node/pnpm, Rust estable MSVC en el PATH, Visual Studio con herramientas C++ y Windows SDK, Microsoft Edge WebView2.

```bash
pnpm install
pnpm tauri dev
pnpm build
pnpm test
pnpm test:ui
cargo test --manifest-path src-tauri/Cargo.toml --lib
pnpm tauri build
```

En PowerShell, si la política de scripts bloquea `pnpm.ps1`, usa `pnpm.cmd`. No hace falta cambiar la política del sistema. Las pruebas de interfaz usan Microsoft Edge y simulan los comandos Tauri; las pruebas Rust usan SQLite real en bases aisladas para verificar migración, concurrencia, rollback y persistencia tras reabrir.

El icono original está en `public/focus.svg`; se regenera con `pnpm tauri icon public/focus.svg`.
