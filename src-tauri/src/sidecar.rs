use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

use crate::sidecar_args;

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct LogPayload {
    pub level: String,
    pub message: String,
}

pub struct SidecarState(pub Mutex<SidecarInner>);

pub struct SidecarInner {
    pub child: Option<CommandChild>,
    pub managed_pid: Option<u32>,
}

#[allow(dead_code)]
#[derive(Clone, Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnSidecarOptions {
    pub data_dir: Option<String>,
    pub data_key: Option<String>,
    pub work_dir: Option<String>,
}

impl SidecarState {
    pub fn new() -> Self {
        Self(Mutex::new(SidecarInner {
            child: None,
            managed_pid: None,
        }))
    }
}

fn default_work_dir() -> PathBuf {
    std::env::temp_dir().join("chatlog_alpha")
}

fn sidecar_program() -> &'static str {
    "binaries/chatlog_alpha"
}

#[allow(dead_code)]
fn normalize_option(value: Option<String>) -> Option<String> {
    value.and_then(|v| {
        let trimmed = v.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

pub fn spawn_sidecar_with_logs(
    app_handle: AppHandle,
    state: State<'_, SidecarState>,
    plan: sidecar_args::SidecarLaunchPlan,
) -> Result<String, String> {
    let mut inner = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    if inner.child.is_some() {
        return Err("Sidecar already running".into());
    }

    let work_dir = plan
        .work_dir
        .clone()
        .map(PathBuf::from)
        .unwrap_or_else(default_work_dir);

    std::fs::create_dir_all(&work_dir)
        .map_err(|e| format!("Failed to create work directory: {}", e))?;

    let args = sidecar_args::build_sidecar_args(&plan);

    let (mut rx, child) = app_handle
        .shell()
        .sidecar(sidecar_program())
        .map_err(|e| format!("Failed to prepare sidecar: {}", e))?
        .args(args)
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => emit_sidecar_log(&handle, "stdout", bytes),
                CommandEvent::Stderr(bytes) => emit_sidecar_log(&handle, "stderr", bytes),
                CommandEvent::Error(message) => {
                    let _ = handle.emit(
                        "sidecar-log",
                        LogPayload {
                            level: "error".into(),
                            message,
                        },
                    );
                }
                CommandEvent::Terminated(payload) => {
                    clear_sidecar_child(&handle);
                    let code = payload
                        .code
                        .map(|value| value.to_string())
                        .unwrap_or_else(|| "signal".to_string());
                    let _ = handle.emit(
                        "sidecar-log",
                        LogPayload {
                            level: "system".into(),
                            message: format!("sidecar terminated: {}", code),
                        },
                    );
                }
                _ => {}
            }
        }
    });

    inner.child = Some(child);

    if let Some(port) = plan
        .http_addr
        .split(':')
        .last()
        .and_then(|p| p.parse::<u16>().ok())
    {
        std::thread::sleep(std::time::Duration::from_millis(800));
        let inspection = crate::service_probe::inspect_port(port, None);
        inner.managed_pid = inspection.process.map(|p| p.pid);
    }

    Ok("Sidecar started".into())
}

fn clear_sidecar_child(app_handle: &AppHandle) {
    let state = app_handle.state::<SidecarState>();
    if let Ok(mut inner) = state.0.lock() {
        inner.child = None;
        inner.managed_pid = None;
    };
}

fn emit_sidecar_log(app_handle: &AppHandle, level: &str, bytes: Vec<u8>) {
    let message = String::from_utf8_lossy(&bytes)
        .trim_end_matches(['\r', '\n'])
        .to_string();
    if message.is_empty() {
        return;
    }

    let _ = app_handle.emit(
        "sidecar-log",
        LogPayload {
            level: level.into(),
            message,
        },
    );
}

pub fn shutdown_sidecar(state: State<'_, SidecarState>) -> Result<String, String> {
    let mut inner = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    if let Some(child) = inner.child.take() {
        child
            .kill()
            .map_err(|e| format!("Failed to kill sidecar: {}", e))?;
        inner.managed_pid = None;
    }

    Ok("Sidecar stopped".into())
}

#[tauri::command]
pub async fn export_logs_command(logs: Vec<LogPayload>) -> Result<String, String> {
    use std::io::Write;
    let path = std::env::temp_dir().join("chatlog_alpha_export.log");
    let mut file = std::fs::File::create(&path).map_err(|e| format!("无法创建日志文件: {}", e))?;
    for entry in &logs {
        let line = format!("[{}] {}\n", entry.level, entry.message);
        file.write_all(line.as_bytes())
            .map_err(|e| format!("写入日志失败: {}", e))?;
    }
    Ok(path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sidecar_program_uses_external_bin_base_name() {
        assert_eq!(sidecar_program(), "binaries/chatlog_alpha");
    }

    #[test]
    fn normalize_option_trims_empty_values() {
        assert_eq!(normalize_option(Some("  ".to_string())), None);
        assert_eq!(
            normalize_option(Some("  C:/WeChat Files/wxid_xxx  ".to_string())),
            Some("C:/WeChat Files/wxid_xxx".to_string()),
        );
    }
}
