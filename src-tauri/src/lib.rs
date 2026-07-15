use tauri::{Emitter, Manager};

mod business_export;
mod commands;
mod config_store;
mod health;
mod material;
mod service_probe;
mod sidecar;
mod sidecar_args;
mod theme;
mod wechat_detect;

const BUSINESS_EXPORT_CLEANUP_REQUIRED_EVENT: &str = "business-export-cleanup-required";

#[derive(Clone, serde::Serialize)]
struct BusinessExportCleanupRequiredPayload {
    code: &'static str,
}

impl BusinessExportCleanupRequiredPayload {
    fn new() -> Self {
        Self {
            code: "cleanup_incomplete",
        }
    }
}

fn cleanup_exports_then_shutdown<C, S, N>(
    cleanup_exports: C,
    shutdown_sidecar: S,
    notify_cleanup_required: N,
) -> Result<(), String>
where
    C: FnOnce() -> Result<(), String>,
    S: FnOnce(),
    N: FnOnce(),
{
    if let Err(error) = cleanup_exports() {
        notify_cleanup_required();
        return Err(error);
    }
    shutdown_sidecar();
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(configure_updater().build())
        .manage(sidecar::SidecarState::new())
        .manage(business_export::BusinessExportStreamState::new())
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                let window = _app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let export_state = window.state::<business_export::BusinessExportStreamState>();
                let sidecar_state = window.state::<sidecar::SidecarState>();
                if cleanup_exports_then_shutdown(
                    || export_state.cleanup_all(),
                    || sidecar::shutdown_sidecar_for_app_exit(&sidecar_state),
                    || {
                        let _ = window.emit(
                            BUSINESS_EXPORT_CLEANUP_REQUIRED_EVENT,
                            BusinessExportCleanupRequiredPayload::new(),
                        );
                    },
                )
                .is_err()
                {
                    api.prevent_close();
                    eprintln!(
                        "Business export cleanup is incomplete; application close was deferred."
                    );
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::spawn_sidecar,
            commands::check_health,
            commands::shutdown_sidecar,
            commands::get_system_theme,
            commands::export_logs,
            commands::export_diagnostics_report,
            commands::export_diagnostics_report_to_path,
            commands::export_business_file,
            commands::begin_business_export_stream,
            commands::append_business_export_stream,
            commands::complete_business_export_stream,
            commands::commit_business_export_stream,
            commands::cancel_business_export_stream,
            material::apply_window_material,
            commands::import_data_dir_config,
            commands::read_data_dir_config_draft,
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

#[cfg(test)]
mod tests {
    use super::{
        cleanup_exports_then_shutdown, BusinessExportCleanupRequiredPayload,
        BUSINESS_EXPORT_CLEANUP_REQUIRED_EVENT,
    };
    use std::sync::Mutex;

    #[test]
    fn application_close_cleans_exports_before_stopping_the_sidecar() {
        let events = Mutex::new(Vec::new());

        cleanup_exports_then_shutdown(
            || {
                events.lock().unwrap().push("cleanup");
                Ok(())
            },
            || events.lock().unwrap().push("shutdown"),
            || events.lock().unwrap().push("notify"),
        )
        .unwrap();

        assert_eq!(*events.lock().unwrap(), vec!["cleanup", "shutdown"]);
    }

    #[test]
    fn application_close_keeps_the_sidecar_running_when_export_cleanup_fails() {
        let shutdown_called = Mutex::new(false);
        let notification_count = Mutex::new(0);

        let error = cleanup_exports_then_shutdown(
            || Err("cleanup failed".to_string()),
            || *shutdown_called.lock().unwrap() = true,
            || *notification_count.lock().unwrap() += 1,
        )
        .expect_err("close must be deferred before sidecar shutdown");

        assert_eq!(error, "cleanup failed");
        assert!(!*shutdown_called.lock().unwrap());
        assert_eq!(*notification_count.lock().unwrap(), 1);
    }

    #[test]
    fn cleanup_required_event_payload_contains_only_a_stable_safe_code() {
        let payload = BusinessExportCleanupRequiredPayload::new();
        let serialized = serde_json::to_string(&payload).unwrap();

        assert_eq!(
            BUSINESS_EXPORT_CLEANUP_REQUIRED_EVENT,
            "business-export-cleanup-required"
        );
        assert_eq!(serialized, r#"{"code":"cleanup_incomplete"}"#);
        assert!(!serialized.contains("Users"));
        assert!(!serialized.contains('\\'));
        assert!(!serialized.contains('/'));
    }
}
