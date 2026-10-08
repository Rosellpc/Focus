# Uso de Focus

Focus registra hábitos y tiempo localmente en Windows x64 y Android ARM64. No requiere cuenta. Internet se usa para consultar y descargar actualizaciones; no hay sincronización automática entre dispositivos.

## Hábitos y temporizador

Crea hábitos con metas diarias, suma o corrige minutos en la fecha seleccionada y consulta reportes mensuales. Completar una tarea registra como mínimo su meta sin duplicar tiempo; vuelve a aparecer al día siguiente. Archivar conserva el historial. Las metas y períodos activos corresponden a cada fecha.

El temporizador admite entre 1 y 1440 minutos. **Guardar sesión** confirma el tiempo; **Terminar y guardar** registra minutos completos transcurridos. **Descartar sesión** no registra tiempo. Conserva su fecha inicial y hora de finalización al reiniciar Focus.

## Tema y sonido

El selector **Claro/Oscuro** recuerda la elección en cada dispositivo. La estrella de la cabecera es también el icono de Windows y Android.

Carga un audio compatible de hasta 50 MB, incluida una canción completa, desde el temporizador. Puedes probarlo, detenerlo o volver al sonido predeterminado. Se guarda en IndexedDB local y se reproduce una vez al terminar con los avisos activados. Los formatos admitidos dependen del dispositivo.

Activa **Notificar al terminar**, concede los permisos y usa **Probar aviso y sonido**. Focus debe estar ejecutándose. Windows puede mantenerla en la bandeja; Android puede suspenderla en segundo plano o con la pantalla bloqueada. No es una alarma garantizada con la app cerrada.

## Datos y respaldos

Los hábitos se guardan en SQLite (`dailyfocus.db`) dentro del directorio privado de configuración de `com.focus.app`. Windows normalmente utiliza `%APPDATA%\com.focus.app\`. Las preferencias y el temporizador usan almacenamiento local; el audio usa IndexedDB.

**Crear respaldo** genera un JSON con hábitos, registros, metas y actividad en `backups`; no incluye audio ni preferencias. **Restaurar respaldo** valida el archivo, pide confirmación y conserva una copia anterior antes de reemplazar los datos en una transacción.

En Windows, **Mostrar respaldo** permite copiar el archivo a otra unidad. En Android el respaldo se crea en almacenamiento privado: la interfaz actual no ofrece exportación mediante Compartir. No asumas que ese archivo interno es una copia externa recuperable. `scripts/backup-android.py` sirve únicamente para instalaciones de depuración accesibles mediante `adb run-as`, no para el APK de producción.

## Actualizaciones

Guarda o descarta la sesión y cierra formularios antes de actualizar. Windows verifica la firma del updater e instala con **Actualizar ahora**. Android ofrece **Descargar actualización**, abre el APK oficial y requiere confirmar su instalación. Actualiza sobre la instalación existente **sin desinstalar**.

Si falla la consulta, revisa Internet y pulsa **Buscar actualizaciones** más tarde. Cada dispositivo conserva sus propios datos al actualizar con el mismo identificador y firma compatible.
