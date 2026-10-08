mod storage;
#[cfg(desktop)]
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

#[tauri::command]
fn notify_timer_finished(app: tauri::AppHandle, show_notification: bool) -> Result<(), String> {
    // Play the Windows system chime even if toast notifications are blocked.
    #[cfg(target_os = "windows")]
    {
        #[link(name = "user32")]
        extern "system" {
            fn MessageBeep(kind: u32) -> i32;
        }
        if unsafe { MessageBeep(0x40) } == 0 {
            return Err("Windows no pudo reproducir el sonido del aviso.".into());
        }
    }
    if show_notification {
        use tauri_plugin_notification::NotificationExt;
        app.notification()
            .builder()
            .title("Focus ? Sesión terminada")
            .body("Tu tiempo de enfoque terminó. Abre Focus para guardar los minutos.")
            .show()
            .map_err(|err| err.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "Abrir Focus", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "Ocultar en la bandeja", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Salir de Focus", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &hide, &quit])?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Focus")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        });
    builder
        .manage(storage::Storage::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            notify_timer_finished,
            storage::snapshot,
            storage::save_minutes,
            storage::complete_habit,
            storage::save_habit,
            storage::archive_habit,
            storage::export_backup,
            storage::import_backup
        ])
        .run(tauri::generate_context!())
        .expect("No se pudo iniciar Focus");
}
