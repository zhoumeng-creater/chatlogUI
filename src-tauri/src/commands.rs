use tauri::{AppHandle, State};

use crate::config_store;
use crate::service_probe;
use crate::sidecar::SidecarState;
use crate::sidecar_args::SidecarLaunchPlan;

#[tauri::command]
pub async fn spawn_sidecar(
    app_handle: AppHandle,
    state: State<'_, SidecarState>,
    plan: SidecarLaunchPlan,
) -> Result<String, String> {
    crate::sidecar::spawn_sidecar_with_logs(app_handle, state, plan)
}

#[tauri::command]
pub async fn check_health(port: u16) -> Result<bool, String> {
    crate::health::check_health(port).await
}

#[tauri::command]
pub async fn shutdown_sidecar(state: State<'_, SidecarState>) -> Result<String, String> {
    crate::sidecar::shutdown_sidecar(state)
}

#[tauri::command]
pub async fn get_system_theme() -> Result<String, String> {
    crate::theme::get_system_theme()
}

#[tauri::command]
pub async fn export_logs(logs: Vec<crate::sidecar::LogPayload>) -> Result<String, String> {
    crate::sidecar::export_logs_command(logs).await
}

#[tauri::command]
pub async fn import_data_dir_config(data_dir: String) -> Result<config_store::ConfigSummary, String> {
    let mut cfg = config_store::read_data_dir_chatlog_json(std::path::Path::new(&data_dir))?;
    if cfg.data_dir.as_deref().map(str::trim).unwrap_or_default().is_empty() {
        cfg.data_dir = Some(data_dir);
    }
    config_store::write_managed_server_config_with_source(&cfg, "data-dir-chatlog-json")
}

#[tauri::command]
pub async fn save_managed_server_config(config: config_store::ServerConfigDraft) -> Result<config_store::ConfigSummary, String> {
    config_store::write_managed_server_config(&config)
}

#[tauri::command]
pub async fn load_managed_server_config_summary() -> Result<Option<config_store::ConfigSummary>, String> {
    config_store::load_managed_server_config_summary()
}

#[tauri::command]
pub async fn validate_managed_server_config(config: config_store::ServerConfigDraft) -> Result<Vec<config_store::ConfigValidationError>, String> {
    Ok(config_store::validate_server_config(&config))
}

#[tauri::command]
pub async fn inspect_port(port: u16, state: tauri::State<'_, SidecarState>) -> Result<service_probe::PortInspection, String> {
    let managed_pid = state.0.lock().unwrap().managed_pid;
    Ok(service_probe::inspect_port(port, managed_pid))
}

#[tauri::command]
pub async fn stop_managed_sidecar(state: tauri::State<'_, SidecarState>) -> Result<String, String> {
    crate::sidecar::shutdown_sidecar(state)?;
    Ok("stopped".into())
}

#[tauri::command]
pub async fn detect_wechat_data_dirs() -> Result<Vec<crate::wechat_detect::WxPathCandidate>, String> {
    Ok(crate::wechat_detect::detect_wechat_data_dirs())
}
