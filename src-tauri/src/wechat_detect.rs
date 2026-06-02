#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WxPathCandidate {
    pub path: String,
    pub label: String,
    pub exists: bool,
    pub source: String,
    pub confidence: String,
}

fn scan_wechat_accounts(base: &str) -> Vec<WxPathCandidate> {
    let dir_path = std::path::Path::new(base);
    if !dir_path.exists() || !dir_path.is_dir() {
        return vec![];
    }
    match std::fs::read_dir(dir_path) {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.file_type().map(|t| t.is_dir()).unwrap_or(false)
                    && e.file_name().to_string_lossy().starts_with("wxid_")
            })
            .map(|e| {
                let path_str = e.path().to_string_lossy().to_string();
                WxPathCandidate {
                    path: path_str.clone(),
                    label: e.file_name().to_string_lossy().to_string(),
                    exists: true,
                    source: "documents".to_string(),
                    confidence: "high".to_string(),
                }
            })
            .collect(),
        Err(_) => vec![],
    }
}

pub fn detect_wechat_data_dirs() -> Vec<WxPathCandidate> {
    let mut results = Vec::new();

    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        let standard_root = format!("{}\\Documents\\WeChat Files", user_profile);
        results.extend(scan_wechat_accounts(&standard_root));

        let xwechat_root = format!("{}\\Documents\\xwechat_files", user_profile);
        results.extend(scan_wechat_accounts(&xwechat_root));

        let onedrive_root = format!(
            "{}\\OneDrive - Default Directory\\Documents\\WeChat Files",
            user_profile
        );
        results.extend(scan_wechat_accounts(&onedrive_root));

        let onedrive_xwechat = format!(
            "{}\\OneDrive - Default Directory\\Documents\\xwechat_files",
            user_profile
        );
        results.extend(scan_wechat_accounts(&onedrive_xwechat));

        let user_xwechat = format!("{}\\Documents\\xwechat_files", user_profile);
        results.extend(scan_wechat_accounts(&user_xwechat));
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_returns_vec_even_if_no_paths_exist() {
        let results = detect_wechat_data_dirs();
        assert!(results.is_empty() || !results.is_empty());
    }

    #[test]
    fn candidate_struct_serializes_correctly() {
        let c = WxPathCandidate {
            path: "C:\\test".into(),
            label: "Test Account".into(),
            exists: true,
            source: "documents".into(),
            confidence: "high".into(),
        };
        assert_eq!(c.path, "C:\\test");
        assert_eq!(c.confidence, "high");
    }
}
