use std::path::{Path, PathBuf};
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

#[derive(Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticLinePayload {
    pub label: String,
    pub value: String,
}

#[derive(Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticExportPayload {
    pub redaction_ok: bool,
    pub lines: Vec<DiagnosticLinePayload>,
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
    "chatlog_alpha"
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

    let child_pid = child.pid();
    inner.child = Some(child);
    inner.managed_pid = Some(child_pid);

    if let Some(port) = plan
        .http_addr
        .split(':')
        .last()
        .and_then(|p| p.parse::<u16>().ok())
    {
        std::thread::sleep(std::time::Duration::from_millis(800));
        let inspection = crate::service_probe::inspect_port(port, Some(child_pid));
        if let Some(pid) = managed_pid_from_post_spawn_inspection(&inspection, child_pid) {
            inner.managed_pid = Some(pid);
        }
    }

    Ok("Sidecar started".into())
}

fn managed_pid_from_post_spawn_inspection(
    inspection: &crate::service_probe::PortInspection,
    spawned_pid: u32,
) -> Option<u32> {
    inspection
        .process
        .as_ref()
        .and_then(|process| (process.pid == spawned_pid).then_some(spawned_pid))
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
    shutdown_sidecar_inner(&mut inner)?;
    Ok("Sidecar stopped".into())
}

pub fn shutdown_sidecar_for_app_exit(state: &SidecarState) {
    if let Ok(mut inner) = state.0.lock() {
        let _ = shutdown_sidecar_inner(&mut inner);
    }
}

fn shutdown_sidecar_inner(inner: &mut SidecarInner) -> Result<(), String> {
    let kill_result = if let Some(child) = inner.child.take() {
        child
            .kill()
            .map_err(|e| format!("Failed to kill sidecar: {}", e))
    } else {
        Ok(())
    };

    inner.managed_pid = None;
    kill_result
}

#[tauri::command]
pub async fn export_logs_command(logs: Vec<LogPayload>) -> Result<String, String> {
    use std::io::Write;
    let path = std::env::temp_dir().join("chatlog_alpha_export.log");
    let mut file = std::fs::File::create(&path).map_err(|e| format!("无法创建日志文件: {}", e))?;
    for entry in &logs {
        let safe_entry = redact_log_payload(entry)?;
        let line = format!("[{}] {}\n", safe_entry.level, safe_entry.message);
        file.write_all(line.as_bytes())
            .map_err(|e| format!("写入日志失败: {}", e))?;
    }
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn export_diagnostics_report_command(
    report: DiagnosticExportPayload,
) -> Result<String, String> {
    if !report.redaction_ok {
        return Err("诊断报告仍包含敏感信息，已阻止导出。".into());
    }

    let path = std::env::temp_dir().join("chatlog_alpha_diagnostics.log");
    write_diagnostics_report(&path, &report)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn export_diagnostics_report_to_path_command(
    path: String,
    report: DiagnosticExportPayload,
) -> Result<String, String> {
    if !report.redaction_ok {
        return Err("诊断报告仍包含敏感信息，已阻止导出。".into());
    }

    let path = PathBuf::from(path);
    validate_diagnostics_export_path(&path)?;
    write_diagnostics_report(&path, &report)?;
    Ok(path.to_string_lossy().to_string())
}

fn write_diagnostics_report(path: &Path, report: &DiagnosticExportPayload) -> Result<(), String> {
    use std::io::Write;
    let mut file = std::fs::File::create(path)
        .map_err(|_| "无法创建诊断文件，请换一个位置后重试。".to_string())?;

    for entry in &report.lines {
        let label = redact_text(&entry.label);
        let value = if should_redact_diagnostic_value(&entry.label) {
            "[redacted] sensitive diagnostic value".into()
        } else {
            redact_text(&entry.value)
        };
        if contains_sensitive_marker(&label) || contains_sensitive_marker(&value) {
            return Err("诊断报告脱敏失败，已阻止导出。".into());
        }
        let line = format!("{}: {}\n", label, value);
        file.write_all(line.as_bytes())
            .map_err(|e| format!("写入诊断失败: {}", e))?;
    }

    Ok(())
}

fn validate_diagnostics_export_path(path: &Path) -> Result<(), String> {
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "保存文件名无效，请重新选择位置。".to_string())?;

    if contains_sensitive_marker(file_name) {
        return Err("保存文件名包含私密标记，请重命名后重试。".into());
    }

    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if extension != "log" {
        return Err("请选择 .log 文件后重试。".into());
    }

    if !path.parent().map(Path::exists).unwrap_or(false) {
        return Err("保存位置不可用，请重新选择。".into());
    }

    Ok(())
}

fn redact_log_payload(payload: &LogPayload) -> Result<LogPayload, String> {
    let message = redact_text(&payload.message);
    if contains_sensitive_marker(&message) {
        return Err("日志脱敏失败，已阻止导出。".into());
    }

    Ok(LogPayload {
        level: payload.level.clone(),
        message,
    })
}

fn redact_text(value: &str) -> String {
    if contains_sensitive_marker(value) {
        "[redacted] sensitive diagnostic line".into()
    } else {
        value.to_string()
    }
}

fn should_redact_diagnostic_value(label: &str) -> bool {
    let normalized = label.to_lowercase();
    [
        "data_key",
        "data-key",
        "datakey",
        "img_key",
        "img-key",
        "imgkey",
        "api_key",
        "api-key",
        "apikey",
        "token",
        "secret",
        "credential",
        "password",
        "authorization",
        "private message",
        "message body",
        "chat content",
    ]
    .iter()
    .any(|marker| normalized.contains(marker))
}

fn contains_sensitive_marker(value: &str) -> bool {
    let normalized = value.to_lowercase();
    [
        "data_key",
        "data-key",
        "datakey",
        "img_key",
        "img-key",
        "imgkey",
        "api_key",
        "api-key",
        "apikey",
        "token",
        "secret",
        "credential",
        "password",
        "bearer ",
        "wechat files",
        "wxid_",
        "c:\\users\\",
    ]
    .iter()
    .any(|marker| normalized.contains(marker))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::service_probe::{PortInspection, PortOwnerKind, ProcessInfo};

    #[test]
    fn sidecar_program_uses_external_bin_base_name() {
        assert_eq!(sidecar_program(), "chatlog_alpha");
    }

    #[test]
    fn normalize_option_trims_empty_values() {
        assert_eq!(normalize_option(Some("  ".to_string())), None);
        assert_eq!(
            normalize_option(Some(
                "  C:/Synthetic/WeChat Files/wxid_synthetic_xxx  ".to_string()
            )),
            Some("C:/Synthetic/WeChat Files/wxid_synthetic_xxx".to_string()),
        );
    }

    #[test]
    fn diagnostic_log_export_redacts_sensitive_lines() {
        let payload = LogPayload {
            level: "stderr".into(),
            message: "data_key=raw-secret C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_a"
                .into(),
        };

        let redacted = redact_log_payload(&payload).expect("redaction should complete");

        assert_eq!(redacted.level, "stderr");
        assert!(!redacted.message.contains("raw-secret"));
        assert!(!redacted.message.contains("Alice"));
        assert!(!redacted.message.contains("wxid_synthetic_a"));
        assert!(redacted.message.contains("[redacted]"));
    }

    #[test]
    fn diagnostics_report_export_redacts_synthetic_release_audit_values() {
        let payload = DiagnosticExportPayload {
            redaction_ok: true,
            lines: vec![
                DiagnosticLinePayload {
                    label: "dataKey".into(),
                    value: "synthetic-data-key-should-be-redacted".into(),
                },
                DiagnosticLinePayload {
                    label: "apiKey".into(),
                    value: "sk-synthetic-should-be-redacted".into(),
                },
                DiagnosticLinePayload {
                    label: "token".into(),
                    value: "synthetic-token-should-be-redacted".into(),
                },
                DiagnosticLinePayload {
                    label: "private message".into(),
                    value: "synthetic-private-message-should-be-redacted".into(),
                },
                DiagnosticLinePayload {
                    label: "local path".into(),
                    value: "C:\\Users\\Synthetic\\Private\\Documents\\chatlog".into(),
                },
            ],
        };

        let path = tauri::async_runtime::block_on(export_diagnostics_report_command(payload))
            .expect("diagnostic export should succeed after redaction");
        let contents = std::fs::read_to_string(&path).expect("diagnostic file should be readable");
        let _ = std::fs::remove_file(path);

        assert!(!contents.contains("synthetic-data-key"));
        assert!(!contents.contains("sk-synthetic"));
        assert!(!contents.contains("synthetic-token"));
        assert!(!contents.contains("synthetic-private-message"));
        assert!(!contents.contains("PrivateName"));
    }

    #[test]
    fn post_spawn_pid_tracking_only_claims_spawned_child() {
        let unknown_occupant = PortInspection {
            port: 5030,
            owner: PortOwnerKind::UnknownProcess,
            process: Some(ProcessInfo {
                pid: 9001,
                name: "node.exe".into(),
                command: "node listener.js".into(),
            }),
            can_stop_safely: false,
        };

        assert_eq!(
            managed_pid_from_post_spawn_inspection(&unknown_occupant, 42),
            None
        );

        let spawned_child = PortInspection {
            port: 5030,
            owner: PortOwnerKind::ExternalChatlog,
            process: Some(ProcessInfo {
                pid: 42,
                name: "chatlog_alpha.exe".into(),
                command: "chatlog_alpha serve --http-addr 127.0.0.1:5030".into(),
            }),
            can_stop_safely: false,
        };

        assert_eq!(
            managed_pid_from_post_spawn_inspection(&spawned_child, 42),
            Some(42),
        );
    }

    #[test]
    fn app_exit_shutdown_clears_managed_pid_without_child_handle() {
        let state = SidecarState::new();
        {
            let mut inner = state.0.lock().unwrap();
            inner.managed_pid = Some(5030);
        }

        shutdown_sidecar_for_app_exit(&state);

        let inner = state.0.lock().unwrap();
        assert_eq!(inner.managed_pid, None);
        assert!(inner.child.is_none());
    }
}
