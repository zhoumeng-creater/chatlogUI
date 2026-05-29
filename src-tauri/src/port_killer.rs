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
    let port_str = format!(":{}", port);

    for line in output.lines() {
        if line.contains(&port_str) && line.contains("LISTENING") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(pid_str) = parts.last() {
                if let Ok(pid) = pid_str.parse::<u32>() {
                    return Some(pid);
                }
            }
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
    let port_suffix = format!(":{}", port);

    output
        .lines()
        .find(|line| line.contains(&port_suffix))
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

    #[cfg(unix)]
    #[test]
    fn parses_ss_listener_pid() {
        let output =
            r#"LISTEN 0 4096 127.0.0.1:5030 0.0.0.0:* users:(("chatlog_alpha",pid=4242,fd=7))"#;
        assert_eq!(parse_ss_output(output, 5030), Some(4242));
    }
}
