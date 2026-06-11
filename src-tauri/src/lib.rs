use tauri::Manager;

mod commands;
mod config_store;
mod health;
mod material;
mod service_probe;
mod sidecar;
mod sidecar_args;
mod theme;
mod wechat_detect;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(configure_updater().build())
        .manage(sidecar::SidecarState::new())
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                let window = _app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                let state = window.state::<sidecar::SidecarState>();
                sidecar::shutdown_sidecar_for_app_exit(&state);
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::spawn_sidecar,
            commands::check_health,
            commands::shutdown_sidecar,
            commands::get_system_theme,
            commands::export_logs,
            commands::export_diagnostics_report,
            material::apply_window_material,
            commands::import_data_dir_config,
            commands::save_managed_server_config,
            commands::load_managed_server_config_summary,
            commands::save_external_connection_config,
            commands::load_external_connection_config_summary,
            commands::clear_external_connection_config,
            commands::validate_managed_server_config,
            commands::inspect_port,
            commands::stop_managed_sidecar,
            commands::detect_wechat_data_dirs,
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
