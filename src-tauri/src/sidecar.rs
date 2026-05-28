use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct LogPayload {
    pub level: String,
    pub message: String,
}

pub struct SidecarState {
    pub child: Option<Child>,
}

impl SidecarState {
    pub fn new() -> Self {
        Self { child: None }
    }
}

pub fn spawn_sidecar_with_logs(
    app_handle: AppHandle,
    state: State<'_, Mutex<SidecarState>>,
) -> Result<String, String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if guard.child.is_some() {
        return Err("Sidecar already running".into());
    }

    let mut child = Command::new("binaries/chatlog_alpha-x86_64-pc-windows-msvc.exe")
        .arg("serve")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    if let Some(stdout) = child.stdout.take() {
        let handle = app_handle.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(text) = line {
                    let _ = handle.emit("sidecar-log", LogPayload {
                        level: "stdout".into(),
                        message: text,
                    });
                }
            }
        });
    }

    if let Some(stderr) = child.stderr.take() {
        let handle = app_handle.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(text) = line {
                    let _ = handle.emit("sidecar-log", LogPayload {
                        level: "stderr".into(),
                        message: text,
                    });
                }
            }
        });
    }

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

#[tauri::command]
pub async fn export_logs_command(
    logs: Vec<LogPayload>,
) -> Result<String, String> {
    use std::io::Write;
    let path = std::env::temp_dir().join("chatlog_alpha_export.log");
    let mut file = std::fs::File::create(&path)
        .map_err(|e| format!("无法创建日志文件: {}", e))?;
    for entry in &logs {
        let line = format!("[{}] {}\n", entry.level, entry.message);
        file.write_all(line.as_bytes())
            .map_err(|e| format!("写入日志失败: {}", e))?;
    }
    Ok(path.to_string_lossy().to_string())
}
