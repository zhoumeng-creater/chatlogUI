use std::process::Command;

pub fn kill_port_if_occupied(port: u16) -> Result<String, String> {
    let pid = find_pid_by_port(port)?;

    if let Some(pid) = pid {
        kill_process(pid)?;
        std::thread::sleep(std::time::Duration::from_millis(500));

        if let Ok(Some(still_alive)) = find_pid_by_port(port) {
            force_kill(still_alive)?;
            std::thread::sleep(std::time::Duration::from_millis(300));
        }
    }

    if let Ok(Some(pid)) = find_pid_by_port(port) {
        return Err(format!("Port {} still occupied by PID {}", port, pid));
    }

    Ok(format!("Port {} is free", port))
}

fn find_pid_by_port(port: u16) -> Result<Option<u32>, String> {
    #[cfg(windows)]
    {
        find_pid_by_port_windows(port)
    }

    #[cfg(unix)]
    {
        Ok(find_pid_by_port_unix(port))
    }
}

#[cfg(windows)]
fn find_pid_by_port_windows(port: u16) -> Result<Option<u32>, String> {
    let output = Command::new("netstat")
        .args(["-ano"])
        .output()
        .map_err(|e| format!("Failed to run netstat: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_windows_netstat(&stdout, port))
}

#[cfg(windows)]
fn parse_windows_netstat(output: &str, port: u16) -> Option<u32> {
    for line in output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 5 && parts[3] == "LISTENING" && address_uses_port(parts[1], port) {
            return parts[4].parse::<u32>().ok();
        }
    }

    None
}

#[cfg(unix)]
fn find_pid_by_port_unix(port: u16) -> Option<u32> {
    if let Some(pid) = find_pid_with_lsof(port) {
        return Some(pid);
    }
    find_pid_with_ss(port)
}

#[cfg(unix)]
fn find_pid_with_lsof(port: u16) -> Option<u32> {
    let output = Command::new("lsof")
        .args(["-nP", "-t", "-iTCP"])
        .arg(format!(":{}", port))
        .args(["-sTCP:LISTEN"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .lines()
        .find_map(|line| line.trim().parse::<u32>().ok())
}

#[cfg(unix)]
fn find_pid_with_ss(port: u16) -> Option<u32> {
    let output = Command::new("ss").args(["-ltnp"]).output().ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_ss_output(&stdout, port)
}

#[cfg(unix)]
fn parse_ss_output(output: &str, port: u16) -> Option<u32> {
    output
        .lines()
        .find(|line| {
            line.split_whitespace()
                .nth(3)
                .is_some_and(|address| address_uses_port(address, port))
        })
        .and_then(parse_ss_pid)
}

#[cfg(unix)]
fn parse_ss_pid(line: &str) -> Option<u32> {
    let pid_marker = "pid=";
    let start = line.find(pid_marker)? + pid_marker.len();
    let rest = &line[start..];
    let pid = rest
        .chars()
        .take_while(|value| value.is_ascii_digit())
        .collect::<String>();
    pid.parse::<u32>().ok()
}

fn address_uses_port(address: &str, port: u16) -> bool {
    address
        .rsplit_once(':')
        .and_then(|(_, value)| value.parse::<u16>().ok())
        .is_some_and(|value| value == port)
}

fn kill_process(pid: u32) -> Result<(), String> {
    #[cfg(windows)]
    {
        return Command::new("taskkill")
            .args(["/PID", &pid.to_string()])
            .output()
            .map(|_| ())
            .map_err(|e| format!("Failed to kill PID {}: {}", pid, e));
    }

    #[cfg(unix)]
    {
        Command::new("kill")
            .arg(pid.to_string())
            .output()
            .map(|_| ())
            .map_err(|e| format!("Failed to kill PID {}: {}", pid, e))
    }
}

fn force_kill(pid: u32) -> Result<(), String> {
    #[cfg(windows)]
    {
        return Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F"])
            .output()
            .map(|_| ())
            .map_err(|e| format!("Failed to force kill PID {}: {}", pid, e));
    }

    #[cfg(unix)]
    {
        Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output()
            .map(|_| ())
            .map_err(|e| format!("Failed to force kill PID {}: {}", pid, e))
    }
}

#[cfg(test)]
mod tests {
    use super::address_uses_port;
    #[cfg(unix)]
    use super::parse_ss_output;
    #[cfg(windows)]
    use super::parse_windows_netstat;

    #[cfg(windows)]
    #[test]
    fn parses_windows_netstat_listener_pid() {
        let output = "TCP    0.0.0.0:5030    0.0.0.0:0    LISTENING    4242";
        assert_eq!(parse_windows_netstat(output, 5030), Some(4242));
    }

    #[cfg(windows)]
    #[test]
    fn does_not_match_windows_prefix_ports() {
        let output = "TCP    0.0.0.0:50300    0.0.0.0:0    LISTENING    4242";
        assert_eq!(parse_windows_netstat(output, 5030), None);
    }

    #[cfg(unix)]
    #[test]
    fn parses_ss_listener_pid() {
        let output =
            r#"LISTEN 0 4096 127.0.0.1:5030 0.0.0.0:* users:(("chatlog_alpha",pid=4242,fd=7))"#;
        assert_eq!(parse_ss_output(output, 5030), Some(4242));
    }

    #[cfg(unix)]
    #[test]
    fn does_not_match_ss_prefix_ports() {
        let output =
            r#"LISTEN 0 4096 127.0.0.1:50300 0.0.0.0:* users:(("chatlog_alpha",pid=4242,fd=7))"#;
        assert_eq!(parse_ss_output(output, 5030), None);
    }

    #[test]
    fn address_port_matching_is_exact() {
        assert!(address_uses_port("127.0.0.1:5030", 5030));
        assert!(address_uses_port("[::]:5030", 5030));
        assert!(!address_uses_port("127.0.0.1:50300", 5030));
    }
}
