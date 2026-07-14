use std::collections::HashMap;
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, MutexGuard};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_EXPORT_CHUNK_BYTES: usize = 1 << 20;
const VALIDATION_TAIL_CHARS: usize = 128;

pub struct BusinessExportStreamState {
    sessions: Mutex<HashMap<String, ActiveBusinessExportStream>>,
    sequence: AtomicU64,
}

struct ActiveBusinessExportStream {
    final_path: PathBuf,
    temp_path: PathBuf,
    file: File,
    file_name: String,
    extension: String,
    bytes_written: usize,
    validation_tail: String,
}

#[derive(Clone, Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BeginBusinessExportStreamPayload {
    pub path: String,
    pub expected_extension: String,
    pub redaction_policy: String,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BeginBusinessExportStreamResponse {
    pub session_id: String,
    pub file_name: String,
    pub extension: String,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppendBusinessExportStreamResponse {
    pub bytes_written: usize,
}

impl BusinessExportStreamState {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            sequence: AtomicU64::new(0),
        }
    }

    pub fn cleanup_all(&self) {
        let streams = lock_streams(self)
            .drain()
            .map(|(_, stream)| stream)
            .collect::<Vec<_>>();
        for stream in streams {
            cleanup_partial(stream);
        }
    }

    #[cfg(test)]
    fn active_count(&self) -> usize {
        lock_streams(self).len()
    }

    #[cfg(test)]
    fn active_temp_path(&self, session_id: &str) -> Option<PathBuf> {
        lock_streams(self)
            .get(session_id)
            .map(|stream| stream.temp_path.clone())
    }
}

impl Default for BusinessExportStreamState {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for BusinessExportStreamState {
    fn drop(&mut self) {
        let sessions = self
            .sessions
            .get_mut()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        for (_, stream) in sessions.drain() {
            cleanup_partial(stream);
        }
    }
}

pub fn begin_business_export_stream(
    state: &BusinessExportStreamState,
    payload: BeginBusinessExportStreamPayload,
) -> Result<BeginBusinessExportStreamResponse, String> {
    validate_redaction_policy(&payload.redaction_policy)?;
    let extension = normalize_extension(&payload.expected_extension)?;
    let final_path = PathBuf::from(payload.path);
    validate_business_export_path(&final_path, extension)?;
    let file_name = final_path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "保存文件名无效，请重新选择位置。".to_string())?
        .to_string();
    let session_id = next_stream_id(state);
    let parent = final_path
        .parent()
        .ok_or_else(|| "保存位置不可用，请重新选择。".to_string())?;
    let temp_path = parent.join(format!(".{}.{}.partial", file_name, session_id));
    let file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temp_path)
        .map_err(|_| "无法准备导出文件，请重新选择位置。".to_string())?;
    let stream = ActiveBusinessExportStream {
        final_path,
        temp_path,
        file,
        file_name: file_name.clone(),
        extension: extension.to_string(),
        bytes_written: 0,
        validation_tail: String::new(),
    };
    let mut sessions = lock_streams(state);
    if sessions.contains_key(&session_id) {
        cleanup_partial(stream);
        return Err("导出任务不可用，请重新开始。".into());
    }
    sessions.insert(session_id.clone(), stream);
    Ok(BeginBusinessExportStreamResponse {
        session_id,
        file_name,
        extension: extension.to_string(),
    })
}

pub fn append_business_export_stream(
    state: &BusinessExportStreamState,
    session_id: &str,
    chunk: &str,
) -> Result<AppendBusinessExportStreamResponse, String> {
    let mut sessions = lock_streams(state);
    if !sessions.contains_key(session_id) {
        return Err("导出任务已结束，请重新开始。".into());
    }
    let outcome = {
        let stream = sessions
            .get_mut(session_id)
            .expect("session existence checked");
        if chunk.len() > MAX_EXPORT_CHUNK_BYTES {
            Err("单次导出内容过大，请缩小分块后重试。".to_string())
        } else {
            let candidate = format!("{}{}", stream.validation_tail, chunk);
            match validate_business_export_content(&candidate) {
                Err(error) => Err(error),
                Ok(()) => match stream.file.write_all(chunk.as_bytes()) {
                    Err(_) => Err("保存失败，请换一个位置后重试。".to_string()),
                    Ok(()) => match stream.bytes_written.checked_add(chunk.len()) {
                        None => Err("导出内容过大，请缩小范围后重试。".to_string()),
                        Some(bytes_written) => {
                            stream.bytes_written = bytes_written;
                            stream.validation_tail =
                                trailing_chars(&candidate, VALIDATION_TAIL_CHARS);
                            Ok(AppendBusinessExportStreamResponse { bytes_written })
                        }
                    },
                },
            }
        }
    };
    if outcome.is_err() {
        if let Some(stream) = sessions.remove(session_id) {
            cleanup_partial(stream);
        }
    }
    outcome
}

pub fn complete_business_export_stream(
    state: &BusinessExportStreamState,
    session_id: &str,
) -> Result<BusinessExportResponse, String> {
    let mut stream = lock_streams(state)
        .remove(session_id)
        .ok_or_else(|| "导出任务已结束，请重新开始。".to_string())?;
    if stream.file.flush().is_err() || stream.file.sync_all().is_err() {
        cleanup_partial(stream);
        return Err("保存失败，请换一个位置后重试。".into());
    }
    let response = BusinessExportResponse {
        file_name: stream.file_name.clone(),
        extension: stream.extension.clone(),
        bytes_written: stream.bytes_written,
    };
    let temp_path = stream.temp_path.clone();
    let final_path = stream.final_path.clone();
    drop(stream.file);
    if std::fs::rename(&temp_path, &final_path).is_err() {
        let _ = std::fs::remove_file(temp_path);
        return Err("保存失败，请换一个位置后重试。".into());
    }
    Ok(response)
}

pub fn cancel_business_export_stream(
    state: &BusinessExportStreamState,
    session_id: &str,
) -> Result<(), String> {
    let stream = lock_streams(state).remove(session_id);
    if let Some(stream) = stream {
        cleanup_partial(stream);
    }
    Ok(())
}

fn next_stream_id(state: &BusinessExportStreamState) -> String {
    let sequence = state.sequence.fetch_add(1, Ordering::Relaxed);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    format!("export-{}-{}-{}", std::process::id(), nanos, sequence)
}

fn lock_streams(
    state: &BusinessExportStreamState,
) -> MutexGuard<'_, HashMap<String, ActiveBusinessExportStream>> {
    state
        .sessions
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn trailing_chars(value: &str, maximum: usize) -> String {
    let mut characters = value.chars().rev().take(maximum).collect::<Vec<_>>();
    characters.reverse();
    characters.into_iter().collect()
}

fn cleanup_partial(stream: ActiveBusinessExportStream) {
    let temp_path = stream.temp_path.clone();
    drop(stream.file);
    let _ = std::fs::remove_file(temp_path);
}

#[derive(Clone, Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BusinessExportPayload {
    pub path: String,
    pub content: String,
    pub expected_extension: String,
    pub redaction_policy: String,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BusinessExportResponse {
    pub file_name: String,
    pub extension: String,
    pub bytes_written: usize,
}

pub async fn export_business_file_command(
    payload: BusinessExportPayload,
) -> Result<BusinessExportResponse, String> {
    validate_redaction_policy(&payload.redaction_policy)?;
    let extension = normalize_extension(&payload.expected_extension)?;
    let path = PathBuf::from(payload.path);
    validate_business_export_path(&path, extension)?;
    validate_business_export_content(&payload.content)?;

    std::fs::write(&path, payload.content.as_bytes())
        .map_err(|_| "保存失败，请换一个位置后重试。".to_string())?;

    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "保存文件名无效，请重新选择位置。".to_string())?
        .to_string();

    Ok(BusinessExportResponse {
        file_name,
        extension: extension.to_string(),
        bytes_written: payload.content.as_bytes().len(),
    })
}

fn validate_redaction_policy(value: &str) -> Result<(), String> {
    match value {
        "redacted" | "unredacted-confirmed" => Ok(()),
        _ => Err("导出隐私策略无效，已阻止写入。".into()),
    }
}

fn normalize_extension(value: &str) -> Result<&'static str, String> {
    match value
        .trim()
        .trim_start_matches('.')
        .to_ascii_lowercase()
        .as_str()
    {
        "md" => Ok("md"),
        "csv" => Ok("csv"),
        "json" => Ok("json"),
        _ => Err("导出格式无效，请重新选择格式。".into()),
    }
}

fn validate_business_export_path(path: &Path, expected_extension: &str) -> Result<(), String> {
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "保存文件名无效，请重新选择位置。".to_string())?;

    if contains_sensitive_marker(file_name) {
        return Err("保存文件名包含私密标记，请重命名后重试。".into());
    }

    let actual_extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if actual_extension != expected_extension {
        return Err(format!("请选择 .{} 文件后重试。", expected_extension));
    }

    let parent_exists = path.parent().map(Path::exists).unwrap_or(false);
    if !parent_exists {
        return Err("保存位置不可用，请重新选择。".into());
    }

    Ok(())
}

fn validate_business_export_content(content: &str) -> Result<(), String> {
    if contains_sensitive_marker(content) {
        return Err("导出内容仍包含密钥、本机路径或原始私密标记，已阻止写入。".into());
    }
    Ok(())
}

fn contains_sensitive_marker(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    lower.contains("datakey=")
        || lower.contains("datakey:")
        || lower.contains("data_key=")
        || lower.contains("data_key:")
        || lower.contains("data-key=")
        || lower.contains("data-key:")
        || lower.contains("data key")
        || lower.contains("api_key=")
        || lower.contains("api_key:")
        || lower.contains("api-key=")
        || lower.contains("api-key:")
        || lower.contains("api key")
        || lower.contains("access_token")
        || lower.contains("token=")
        || lower.contains("token:")
        || lower.contains("secret=")
        || lower.contains("secret:")
        || lower.contains("bearer ")
        || lower.contains("sk-")
        || lower.contains("wxid_")
        || lower.contains("wechat files")
        || lower.contains("微信 files")
        || lower.contains("微信文件")
        || contains_windows_user_path(value)
        || lower.contains("/api/v1/sns/media/proxy?")
}

fn contains_windows_user_path(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.windows(9).any(|window| {
        let drive = window[0].is_ascii_alphabetic();
        let colon = window[1] == b':';
        let slash = window[2] == b'\\' || window[2] == b'/';
        let users = window[3..].eq_ignore_ascii_case(b"users\\")
            || window[3..].eq_ignore_ascii_case(b"users/");
        drive && colon && slash && users
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_business_export_without_returning_private_directory() {
        let path = unique_temp_file("chatlog-search-export.md");
        let payload = BusinessExportPayload {
            path: path.to_string_lossy().to_string(),
            content: "# 搜索结果\n已隐藏消息内容\n".into(),
            expected_extension: "md".into(),
            redaction_policy: "redacted".into(),
        };

        let response = tauri::async_runtime::block_on(export_business_file_command(payload))
            .expect("business export should write safe redacted content");
        let contents = std::fs::read_to_string(&path).expect("export file should be readable");
        let _ = std::fs::remove_file(&path);

        let expected_file_name = path
            .file_name()
            .and_then(|name| name.to_str())
            .expect("temp file should have a valid file name");

        assert_eq!(response.file_name, expected_file_name);
        assert!(response.file_name.ends_with("chatlog-search-export.md"));
        assert_eq!(response.extension, "md");
        assert_eq!(
            response.bytes_written,
            "# 搜索结果\n已隐藏消息内容\n".as_bytes().len()
        );
        assert!(contents.contains("已隐藏消息内容"));
        assert!(!response.file_name.contains("Users"));
    }

    #[test]
    fn rejects_content_with_hard_secret_or_raw_path_markers() {
        let path = unique_temp_file("chatlog-search-export.md");
        let payload = BusinessExportPayload {
            path: path.to_string_lossy().to_string(),
            content: "dataKey: synthetic-secret C:\\Users\\Synthetic\\Private".into(),
            expected_extension: "md".into(),
            redaction_policy: "unredacted-confirmed".into(),
        };

        let error = tauri::async_runtime::block_on(export_business_file_command(payload))
            .expect_err("secret-bearing content must be blocked");

        assert!(error.contains("已阻止写入"));
        assert!(!path.exists());
    }

    #[test]
    fn rejects_private_filename_and_extension_mismatch() {
        let unsafe_path = unique_temp_file("wxid_synthetic_private.json");
        let unsafe_payload = BusinessExportPayload {
            path: unsafe_path.to_string_lossy().to_string(),
            content: "{}".into(),
            expected_extension: "json".into(),
            redaction_policy: "redacted".into(),
        };
        let unsafe_error =
            tauri::async_runtime::block_on(export_business_file_command(unsafe_payload))
                .expect_err("private filenames must be blocked");
        assert!(unsafe_error.contains("保存文件名"));

        let csv_path = unique_temp_file("chatlog-search-export.csv");
        let wrong_extension_payload = BusinessExportPayload {
            path: csv_path.to_string_lossy().to_string(),
            content: "section,label,value\n".into(),
            expected_extension: "md".into(),
            redaction_policy: "redacted".into(),
        };
        let extension_error =
            tauri::async_runtime::block_on(export_business_file_command(wrong_extension_payload))
                .expect_err("extension mismatch must be blocked");
        assert!(extension_error.contains(".md"));
    }

    #[test]
    fn streams_chunks_to_a_private_partial_file_and_publishes_only_on_complete() {
        let path = unique_temp_file("chatlog-search-stream.md");
        let _ = std::fs::remove_file(&path);
        let state = BusinessExportStreamState::new();
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .expect("stream should open");
        let partial = state
            .active_temp_path(&opened.session_id)
            .expect("active stream should own a partial file");

        append_business_export_stream(&state, &opened.session_id, "# Search\n")
            .expect("first chunk should append");
        append_business_export_stream(&state, &opened.session_id, "safe row\n")
            .expect("second chunk should append");
        assert!(
            !path.exists(),
            "final path must stay absent before completion"
        );
        assert!(
            partial.exists(),
            "bounded chunks should be written to the private partial file"
        );

        let response = complete_business_export_stream(&state, &opened.session_id)
            .expect("stream should complete atomically");
        assert_eq!(response.bytes_written, "# Search\nsafe row\n".len());
        assert_eq!(
            std::fs::read_to_string(&path).unwrap(),
            "# Search\nsafe row\n"
        );
        assert!(!partial.exists());
        assert_eq!(state.active_count(), 0);
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn cancel_and_cross_chunk_validation_remove_partial_output() {
        let cancelled_path = unique_temp_file("chatlog-search-cancel.csv");
        let _ = std::fs::remove_file(&cancelled_path);
        let state = BusinessExportStreamState::new();
        let cancelled = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: cancelled_path.to_string_lossy().to_string(),
                expected_extension: "csv".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();
        let cancelled_partial = state.active_temp_path(&cancelled.session_id).unwrap();
        append_business_export_stream(&state, &cancelled.session_id, "header\n").unwrap();
        cancel_business_export_stream(&state, &cancelled.session_id).unwrap();
        cancel_business_export_stream(&state, &cancelled.session_id).unwrap();
        assert!(!cancelled_path.exists());
        assert!(!cancelled_partial.exists());

        let rejected_path = unique_temp_file("chatlog-search-rejected.json");
        let _ = std::fs::remove_file(&rejected_path);
        let rejected = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: rejected_path.to_string_lossy().to_string(),
                expected_extension: "json".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();
        let rejected_partial = state.active_temp_path(&rejected.session_id).unwrap();
        append_business_export_stream(&state, &rejected.session_id, "{\"value\":\"data").unwrap();
        let error =
            append_business_export_stream(&state, &rejected.session_id, "Key: synthetic\"}")
                .expect_err("sensitive markers split across chunks must be rejected");
        assert!(error.contains("已阻止写入"));
        assert!(!rejected_path.exists());
        assert!(!rejected_partial.exists());
        assert_eq!(state.active_count(), 0);
    }

    #[test]
    fn completion_replaces_an_existing_selected_file_without_publishing_partial_content() {
        let path = unique_temp_file("chatlog-search-replace.md");
        std::fs::write(&path, "old export").unwrap();
        let state = BusinessExportStreamState::new();
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "new safe export").unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "old export");

        complete_business_export_stream(&state, &opened.session_id).unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "new safe export");
        let _ = std::fs::remove_file(path);
    }

    fn unique_temp_file(file_name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "chatlog-ui-business-export-{}-{}",
            std::process::id(),
            file_name
        ))
    }
}
