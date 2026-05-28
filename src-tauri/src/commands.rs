use tauri::{AppHandle, State};
use std::sync::Mutex;

use crate::port_killer;
use crate::sidecar::SidecarState;

#[tauri::command]
pub async fn kill_port(port: u16) -> Result<String, String> {
    port_killer::kill_port_if_occupied(port)
}

#[tauri::command]
pub async fn spawn_sidecar(
    app_handle: AppHandle,
    state: State<'_, Mutex<SidecarState>>,
) -> Result<String, String> {
    crate::sidecar::spawn_sidecar_with_logs(app_handle, state)
}

#[tauri::command]
pub async fn check_health(port: u16) -> Result<bool, String> {
    crate::health::check_health(port).await
}

#[tauri::command]
pub async fn shutdown_sidecar(
    state: State<'_, Mutex<SidecarState>>,
) -> Result<String, String> {
    crate::sidecar::shutdown_sidecar(state)
}

#[tauri::command]
pub async fn get_system_theme() -> Result<String, String> {
    crate::theme::get_system_theme()
}

#[tauri::command]
pub async fn export_logs(
    logs: Vec<crate::sidecar::LogPayload>,
) -> Result<String, String> {
    crate::sidecar::export_logs_command(logs).await
}
