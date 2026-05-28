use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::Duration;

pub async fn check_health(port: u16) -> Result<bool, String> {
    let addr = format!("127.0.0.1:{}", port);
    let timeout = Duration::from_secs(3);

    let mut stream = TcpStream::connect_timeout(
        &addr.parse().map_err(|e| format!("Invalid address: {}", e))?,
        timeout,
    )
    .map_err(|e| format!("Connection refused: {}", e))?;

    stream
        .set_read_timeout(Some(Duration::from_secs(3)))
        .map_err(|e| format!("Set timeout failed: {}", e))?;

    let request = "GET /health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n";
    stream
        .write_all(request.as_bytes())
        .map_err(|e| format!("Write failed: {}", e))?;

    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .map_err(|e| format!("Read failed: {}", e))?;

    Ok(response.contains("200 OK") || response.contains("\"status\":\"ok\""))
}
