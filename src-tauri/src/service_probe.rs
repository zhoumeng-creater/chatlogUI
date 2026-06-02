use serde::Serialize;

#[derive(Clone, Debug, PartialEq, Serialize)]
pub enum PortOwnerKind {
    Free,
    ManagedSidecar,
    ExternalChatlog,
    UnknownProcess,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub command: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortInspection {
    pub port: u16,
    pub owner: PortOwnerKind,
    pub process: Option<ProcessInfo>,
    pub can_stop_safely: bool,
}

pub struct PortOwnerClassification {
    pub owner: PortOwnerKind,
    pub process: Option<ProcessInfo>,
    pub can_stop_safely: bool,
}

pub fn classify_port_owner(
    process: Option<ProcessInfo>,
    managed_pid: Option<u32>,
) -> PortOwnerClassification {
    match (process, managed_pid) {
        (Some(p), Some(managed)) if p.pid == managed => PortOwnerClassification {
            owner: PortOwnerKind::ManagedSidecar,
            process: Some(p),
            can_stop_safely: true,
        },
        (Some(p), _) if is_chatlog_process_name(&p.name) => PortOwnerClassification {
            owner: PortOwnerKind::ExternalChatlog,
            process: Some(p),
            can_stop_safely: false,
        },
        (Some(p), _) => PortOwnerClassification {
            owner: PortOwnerKind::UnknownProcess,
            process: Some(p),
            can_stop_safely: false,
        },
        (None, _) => PortOwnerClassification {
            owner: PortOwnerKind::Free,
            process: None,
            can_stop_safely: false,
        },
    }
}

fn is_chatlog_process_name(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.contains("chatlog_alpha") || lower.contains("chatlog")
}

pub fn inspect_port(port: u16, managed_pid: Option<u32>) -> PortInspection {
    let process = find_process_on_port(port);
    let classification = classify_port_owner(process, managed_pid);

    PortInspection {
        port,
        owner: classification.owner,
        process: classification.process,
        can_stop_safely: classification.can_stop_safely,
    }
}

#[cfg(target_os = "windows")]
fn find_process_on_port(port: u16) -> Option<ProcessInfo> {
    use std::process::Command;

    let output = Command::new("netstat")
        .args(["-ano", "-p", "TCP"])
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let pid = stdout
        .lines()
        .find(|line| line.contains(&format!(":{}", port)) && line.contains("LISTENING"))
        .and_then(|line| line.split_whitespace().last())
        .and_then(|pid_str| pid_str.parse::<u32>().ok())?;

    let name_output = Command::new("tasklist")
        .args(["/FI", &format!("PID eq {}", pid), "/FO", "CSV", "/NH"])
        .output()
        .ok()?;
    let name_stdout = String::from_utf8_lossy(&name_output.stdout);
    let name = name_stdout
        .lines()
        .next()
        .and_then(|line| line.split(',').nth(0))
        .map(|s| s.trim_matches('"').to_string())
        .unwrap_or_else(|| "unknown".to_string());

    Some(ProcessInfo {
        pid,
        name,
        command: format!("(pid={})", pid),
    })
}

#[cfg(not(target_os = "windows"))]
fn find_process_on_port(port: u16) -> Option<ProcessInfo> {
    use std::process::Command;

    let output = Command::new("lsof")
        .args(["-ti", &format!(":{}", port)])
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let pid = stdout.lines().next()?.trim().parse::<u32>().ok()?;

    let name_output = Command::new("ps")
        .args(["-p", &pid.to_string(), "-o", "comm="])
        .output()
        .ok()?;
    let name = String::from_utf8_lossy(&name_output.stdout)
        .trim()
        .to_string();

    Some(ProcessInfo {
        pid,
        name,
        command: format!("(pid={})", pid),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_chatlog_process_name_as_external_chatlog() {
        let result = classify_port_owner(
            Some(ProcessInfo {
                pid: 1234,
                name: "chatlog_alpha-x86_64-pc-windows-msvc.exe".into(),
                command: "chatlog_alpha serve --http-addr 127.0.0.1:5030".into(),
            }),
            None,
        );

        assert_eq!(result.owner, PortOwnerKind::ExternalChatlog);
    }

    #[test]
    fn classifies_tracked_pid_as_managed() {
        let result = classify_port_owner(
            Some(ProcessInfo {
                pid: 42,
                name: "chatlog_alpha".into(),
                command: "chatlog_alpha serve".into(),
            }),
            Some(42),
        );

        assert_eq!(result.owner, PortOwnerKind::ManagedSidecar);
    }

    #[test]
    fn unknown_process_is_conflict_not_kill_target() {
        let result = classify_port_owner(
            Some(ProcessInfo {
                pid: 999,
                name: "node.exe".into(),
                command: "node server.js".into(),
            }),
            None,
        );

        assert_eq!(result.owner, PortOwnerKind::UnknownProcess);
        assert!(!result.can_stop_safely);
    }

    #[test]
    fn free_port_returns_free() {
        let result = classify_port_owner(None, None);
        assert_eq!(result.owner, PortOwnerKind::Free);
    }
}
