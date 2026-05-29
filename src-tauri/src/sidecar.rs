use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct LogPayload {
    pub level: String,
    pub message: String,
}

pub struct SidecarState {
    pub child: Option<CommandChild>,
}

#[derive(Clone, Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnSidecarOptions {
    pub data_dir: Option<String>,
    pub data_key: Option<String>,
    pub work_dir: Option<String>,
}

impl SidecarState {
    pub fn new() -> Self {
        Self { child: None }
    }
}

fn default_work_dir() -> PathBuf {
    std::env::temp_dir().join("chatlog_alpha")
}

fn sidecar_program() -> &'static str {
    "binaries/chatlog_alpha"
}

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
    state: State<'_, Mutex<SidecarState>>,
    options: SpawnSidecarOptions,
) -> Result<String, String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if guard.child.is_some() {
        return Err("Sidecar already running".into());
    }

    let data_dir = normalize_option(options.data_dir);
    let data_key = normalize_option(options.data_key);
    let work_dir = normalize_option(options.work_dir)
        .map(PathBuf::from)
        .unwrap_or_else(default_work_dir);

    std::fs::create_dir_all(&work_dir)
        .map_err(|e| format!("Failed to create work directory: {}", e))?;

    let mut args = vec![
        "serve".to_string(),
        "--http-addr".to_string(),
        "0.0.0.0:5030".to_string(),
        "--work-dir".to_string(),
        work_dir.to_string_lossy().to_string(),
    ];

    if let Some(path) = data_dir {
        args.push("--data-dir".to_string());
        args.push(path);
    }

    if let Some(key) = data_key {
        args.push("--data-key".to_string());
        args.push(key);
    }

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

    guard.child = Some(child);
    Ok("Sidecar started".into())
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

pub fn shutdown_sidecar(state: State<'_, Mutex<SidecarState>>) -> Result<String, String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if let Some(child) = guard.child.take() {
        child
            .kill()
            .map_err(|e| format!("Failed to kill sidecar: {}", e))?;
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
