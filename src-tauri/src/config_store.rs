use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct ServerConfigDraft {
    #[serde(rename = "type", default)]
    pub type_: Option<String>,
    #[serde(default)]
    pub platform: Option<String>,
    #[serde(default)]
    pub version: Option<i64>,
    #[serde(default, alias = "fullVersion")]
    pub full_version: Option<String>,
    #[serde(default, alias = "dataDir")]
    pub data_dir: Option<String>,
    #[serde(default, alias = "workDir")]
    pub work_dir: Option<String>,
    #[serde(default, alias = "dataKey")]
    pub data_key: Option<String>,
    #[serde(default, alias = "imgKey")]
    pub img_key: Option<String>,
    #[serde(default, alias = "httpAddr")]
    pub http_addr: Option<String>,
    #[serde(default, alias = "saveDecryptedMedia")]
    pub save_decrypted_media: Option<bool>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct ExternalConnectionConfigDraft {
    #[serde(default, alias = "httpAddr")]
    pub http_addr: String,
    #[serde(default)]
    pub port: u16,
    #[serde(default, alias = "lastValidatedAt")]
    pub last_validated_at: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct ConfigValidationError {
    pub code: String,
    pub field: String,
    pub message: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigSummary {
    pub mode: String,
    pub source: String,
    pub config_dir: String,
    pub data_dir: Option<String>,
    pub work_dir: Option<String>,
    pub http_addr: String,
    pub port: u16,
    pub platform: Option<String>,
    pub version: Option<i64>,
    pub full_version: Option<String>,
    pub has_data_key: bool,
    pub has_img_key: bool,
    pub last_validated_at: Option<String>,
}

fn is_blank(value: Option<&str>) -> bool {
    value.map(str::trim).unwrap_or_default().is_empty()
}

fn error(code: &str, field: &str, message: &str) -> ConfigValidationError {
    ConfigValidationError {
        code: code.into(),
        field: field.into(),
        message: message.into(),
    }
}

pub fn validate_server_config(cfg: &ServerConfigDraft) -> Vec<ConfigValidationError> {
    let mut errors = Vec::new();

    if is_blank(cfg.data_dir.as_deref()) {
        errors.push(error("data_dir_required", "data_dir", "请选择微信数据目录"));
    }
    if is_blank(cfg.data_key.as_deref()) {
        errors.push(error(
            "data_key_required",
            "data_key",
            "需要 data key 才能解密数据库",
        ));
    }
    if is_blank(cfg.platform.as_deref()) {
        errors.push(error(
            "platform_required",
            "platform",
            "需要平台信息，例如 windows",
        ));
    }
    if cfg.version.unwrap_or_default() <= 0 {
        errors.push(error(
            "version_required",
            "version",
            "需要微信主版本号，例如 4",
        ));
    }
    if is_blank(cfg.full_version.as_deref()) {
        errors.push(error(
            "full_version_required",
            "full_version",
            "需要完整微信版本号，例如 4.1.8.107",
        ));
    }

    errors
}

pub fn read_data_dir_chatlog_json(data_dir: &std::path::Path) -> Result<ServerConfigDraft, String> {
    let path = data_dir.join("chatlog.json");
    let bytes = std::fs::read(&path)
        .map_err(|_| "无法读取配置文件，请确认所选目录包含有效配置".to_string())?;
    serde_json::from_slice::<ServerConfigDraft>(&bytes)
        .map_err(|_| "配置文件格式无效，请重新选择目录或检查配置".to_string())
}

pub fn summarize_config(
    cfg: &ServerConfigDraft,
    config_dir: String,
    source: String,
) -> ConfigSummary {
    let http_addr = cfg
        .http_addr
        .clone()
        .unwrap_or_else(|| "127.0.0.1:5030".into());
    let port: u16 = http_addr
        .split(':')
        .last()
        .and_then(|p| p.parse().ok())
        .unwrap_or(5030);

    ConfigSummary {
        mode: "managed".into(),
        source,
        config_dir,
        data_dir: cfg.data_dir.clone(),
        work_dir: cfg.work_dir.clone(),
        http_addr,
        port,
        platform: cfg.platform.clone(),
        version: cfg.version,
        full_version: cfg.full_version.clone(),
        has_data_key: cfg
            .data_key
            .as_ref()
            .map_or(false, |k| !k.trim().is_empty()),
        has_img_key: cfg.img_key.as_ref().map_or(false, |k| !k.trim().is_empty()),
        last_validated_at: None,
    }
}

pub fn summarize_external_connection(
    cfg: &ExternalConnectionConfigDraft,
    config_dir: String,
) -> ConfigSummary {
    ConfigSummary {
        mode: "external".into(),
        source: "external-service".into(),
        config_dir,
        data_dir: None,
        work_dir: None,
        http_addr: cfg.http_addr.clone(),
        port: cfg.port,
        platform: None,
        version: None,
        full_version: None,
        has_data_key: false,
        has_img_key: false,
        last_validated_at: cfg.last_validated_at.clone(),
    }
}

pub fn get_app_config_dir() -> Result<std::path::PathBuf, String> {
    let dir = dirs::config_dir()
        .ok_or_else(|| "无法确定用户配置目录".to_string())?
        .join("chatlogUI");
    std::fs::create_dir_all(&dir).map_err(|e| format!("无法创建配置目录: {}", e))?;
    Ok(dir)
}

pub fn write_managed_server_config(cfg: &ServerConfigDraft) -> Result<ConfigSummary, String> {
    write_managed_server_config_with_source(cfg, "app-managed-server-config")
}

pub fn write_managed_server_config_with_source(
    cfg: &ServerConfigDraft,
    source: &str,
) -> Result<ConfigSummary, String> {
    let config_dir = get_app_config_dir()?;
    let path = config_dir.join("chatlog-server.json");
    let json = serde_json::to_string_pretty(cfg).map_err(|e| format!("无法序列化配置: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("无法写入配置: {}", e))?;
    let summary = summarize_config(cfg, config_dir.to_string_lossy().to_string(), source.into());
    Ok(summary)
}

pub fn load_managed_server_config() -> Result<Option<ServerConfigDraft>, String> {
    let config_dir = get_app_config_dir()?;
    let path = config_dir.join("chatlog-server.json");
    if !path.exists() {
        return Ok(None);
    }
    let bytes = std::fs::read(&path).map_err(|e| format!("无法读取配置: {}", e))?;
    let cfg: ServerConfigDraft =
        serde_json::from_slice(&bytes).map_err(|e| format!("无法解析配置: {}", e))?;
    Ok(Some(cfg))
}

pub fn load_managed_server_config_summary() -> Result<Option<ConfigSummary>, String> {
    let cfg = load_managed_server_config()?;
    let config_dir = get_app_config_dir()?;
    Ok(cfg.map(|c| {
        summarize_config(
            &c,
            config_dir.to_string_lossy().to_string(),
            "app-managed-server-config".into(),
        )
    }))
}

pub fn write_external_connection_config(
    cfg: &ExternalConnectionConfigDraft,
) -> Result<ConfigSummary, String> {
    let config_dir = get_app_config_dir()?;
    let path = config_dir.join("chatlog-connection.json");
    let json =
        serde_json::to_string_pretty(cfg).map_err(|e| format!("无法序列化外部服务配置: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("无法写入外部服务配置: {}", e))?;
    Ok(summarize_external_connection(
        cfg,
        config_dir.to_string_lossy().to_string(),
    ))
}

pub fn load_external_connection_config() -> Result<Option<ExternalConnectionConfigDraft>, String> {
    let config_dir = get_app_config_dir()?;
    let path = config_dir.join("chatlog-connection.json");
    if !path.exists() {
        return Ok(None);
    }
    let bytes = std::fs::read(&path).map_err(|e| format!("无法读取外部服务配置: {}", e))?;
    let cfg: ExternalConnectionConfigDraft =
        serde_json::from_slice(&bytes).map_err(|e| format!("无法解析外部服务配置: {}", e))?;
    Ok(Some(cfg))
}

pub fn load_external_connection_config_summary() -> Result<Option<ConfigSummary>, String> {
    let cfg = load_external_connection_config()?;
    let config_dir = get_app_config_dir()?;
    Ok(cfg.map(|c| summarize_external_connection(&c, config_dir.to_string_lossy().to_string())))
}

pub fn clear_external_connection_config() -> Result<(), String> {
    let config_dir = get_app_config_dir()?;
    let path = config_dir.join("chatlog-connection.json");
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| format!("无法删除外部服务配置: {}", e))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_complete_windows_config() {
        let cfg = ServerConfigDraft {
            data_dir: Some("E:\\WeChat Files\\wxid_synthetic_xxx".into()),
            work_dir: Some("E:\\chatlog\\work".into()),
            data_key: Some("a".repeat(64)),
            img_key: Some("image-key".into()),
            platform: Some("windows".into()),
            version: Some(4),
            full_version: Some("4.1.8.107".into()),
            type_: Some("wechat".into()),
            http_addr: Some("127.0.0.1:5030".into()),
            save_decrypted_media: Some(true),
        };

        assert_eq!(
            validate_server_config(&cfg),
            Vec::<ConfigValidationError>::new()
        );
    }

    #[test]
    fn reports_missing_platform_version_and_key() {
        let cfg = ServerConfigDraft::default();
        let errors = validate_server_config(&cfg);
        let codes: Vec<_> = errors.iter().map(|e| e.code.as_str()).collect();

        assert!(codes.contains(&"data_dir_required"));
        assert!(codes.contains(&"data_key_required"));
        assert!(codes.contains(&"platform_required"));
        assert!(codes.contains(&"version_required"));
    }

    #[test]
    fn masks_secret_fields_in_summary() {
        let cfg = ServerConfigDraft {
            data_key: Some("a".repeat(64)),
            img_key: Some("secret-image".into()),
            ..ServerConfigDraft::default()
        };

        let summary = summarize_config(&cfg, "C:\\config".into(), "manual-advanced".into());

        assert!(summary.has_data_key);
        assert!(summary.has_img_key);
    }

    #[test]
    fn accepts_camel_case_frontend_payload_but_serializes_snake_case_config() {
        let cfg: ServerConfigDraft = serde_json::from_str(
            r#"{
            "dataDir": "E:/Synthetic/WeChat Files/wxid_synthetic_xxx",
            "workDir": "E:/chatlog/work",
            "dataKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "imgKey": "image-key",
            "fullVersion": "4.1.8.107",
            "httpAddr": "127.0.0.1:5030",
            "saveDecryptedMedia": true,
            "platform": "windows",
            "version": 4
        }"#,
        )
        .expect("camelCase payload should deserialize");

        assert_eq!(cfg.data_dir.as_deref(), Some("E:/Synthetic/WeChat Files/wxid_synthetic_xxx"));
        let out = serde_json::to_string(&cfg).expect("config should serialize");
        assert!(out.contains("data_dir"));
        assert!(out.contains("full_version"));
        assert!(!out.contains("dataDir"));
        assert!(!out.contains("fullVersion"));
    }

    #[test]
    fn read_data_dir_chatlog_json_errors_do_not_return_local_paths() {
        let temp_dir = std::env::temp_dir().join("chatlogUI-synthetic-missing-chatlog-json");
        let _ = std::fs::create_dir_all(&temp_dir);
        let error = read_data_dir_chatlog_json(&temp_dir).expect_err("missing chatlog.json should fail");
        let path_text = temp_dir.to_string_lossy();

        assert!(!error.contains(path_text.as_ref()));
        assert!(!error.contains("chatlog.json"));
    }

    #[test]
    fn summary_contains_setup_profile_fields() {
        let summary = summarize_config(
            &ServerConfigDraft::default(),
            "C:\\config".into(),
            "data-dir-chatlog-json".into(),
        );

        assert_eq!(summary.mode, "managed");
        assert_eq!(summary.source, "data-dir-chatlog-json");
        assert_eq!(summary.last_validated_at, None);
    }

    #[test]
    fn summarizes_external_connection_without_managed_secrets() {
        let summary = summarize_external_connection(
            &ExternalConnectionConfigDraft {
                http_addr: "http://127.0.0.1:6041".into(),
                port: 6041,
                last_validated_at: Some("2026-06-09T10:00:00.000Z".into()),
            },
            "C:\\config".into(),
        );

        assert_eq!(summary.mode, "external");
        assert_eq!(summary.source, "external-service");
        assert_eq!(summary.http_addr, "http://127.0.0.1:6041");
        assert_eq!(summary.port, 6041);
        assert!(!summary.has_data_key);
        assert!(!summary.has_img_key);
        assert_eq!(
            summary.last_validated_at.as_deref(),
            Some("2026-06-09T10:00:00.000Z")
        );
    }
}
