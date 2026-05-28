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
    let output = Command::new("netstat")
        .args(["-ano"])
        .output()
        .map_err(|e| format!("Failed to run netstat: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let port_str = format!(":{}", port);

    for line in stdout.lines() {
        if line.contains(&port_str) && line.contains("LISTENING") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(pid_str) = parts.last() {
                if let Ok(pid) = pid_str.parse::<u32>() {
                    return Ok(Some(pid));
                }
            }
        }
    }

    Ok(None)
}

fn kill_process(pid: u32) -> Result<(), String> {
    Command::new("taskkill")
        .args(["/PID", &pid.to_string()])
        .output()
        .map_err(|e| format!("Failed to kill PID {}: {}", pid, e))?;
    Ok(())
}

fn force_kill(pid: u32) -> Result<(), String> {
    Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/F"])
        .output()
        .map_err(|e| format!("Failed to force kill PID {}: {}", pid, e))?;
    Ok(())
}
