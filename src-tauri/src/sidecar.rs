use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::State;

pub struct SidecarState {
    pub child: Option<Child>,
}

#[allow(dead_code)]
impl SidecarState {
    pub fn new() -> Self {
        Self { child: None }
    }
}

pub async fn spawn_sidecar(
    state: State<'_, Mutex<SidecarState>>,
) -> Result<String, String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if guard.child.is_some() {
        return Err("Sidecar already running".into());
    }

    let child = Command::new("binaries/chatlog_alpha-x86_64-pc-windows-msvc.exe")
        .arg("serve")
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    guard.child = Some(child);
    Ok("Sidecar started".into())
}

pub fn shutdown_sidecar(
    state: State<'_, Mutex<SidecarState>>,
) -> Result<String, String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if let Some(ref mut child) = guard.child {
        child.kill().map_err(|e| format!("Failed to kill sidecar: {}", e))?;
        child.wait().map_err(|e| format!("Failed to wait: {}", e))?;
    }

    guard.child = None;
    Ok("Sidecar stopped".into())
}
