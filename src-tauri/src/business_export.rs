use std::path::{Path, PathBuf};

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

    fn unique_temp_file(file_name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "chatlog-ui-business-export-{}-{}",
            std::process::id(),
            file_name
        ))
    }
}
