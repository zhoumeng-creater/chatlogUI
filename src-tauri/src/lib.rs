use std::sync::Mutex;
#[cfg(debug_assertions)]
use tauri::Manager;

mod commands;
mod health;
mod material;
mod port_killer;
mod sidecar;
mod theme;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(configure_updater().build())
        .manage(Mutex::new(sidecar::SidecarState::new()))
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                let window = _app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
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

fn configure_updater() -> tauri_plugin_updater::Builder {
    let builder = tauri_plugin_updater::Builder::new();
    match option_env!("TAURI_UPDATER_PUBKEY").map(str::trim) {
        Some(pubkey) if !pubkey.is_empty() => builder.pubkey(pubkey),
        _ => builder,
    }
}
