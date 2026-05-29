use std::sync::Mutex;
use tauri::Manager;

mod commands;
mod health;
mod port_killer;
mod sidecar;
mod theme;
mod material;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Mutex::new(sidecar::SidecarState::new()))
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            #[cfg(debug_assertions)]
            window.open_devtools();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::kill_port,
            commands::spawn_sidecar,
            commands::check_health,
            commands::shutdown_sidecar,
            commands::get_system_theme,
            commands::export_logs,
            material::apply_window_material,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
