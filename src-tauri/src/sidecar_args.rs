use serde::Deserialize;

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarLaunchPlan {
    pub http_addr: String,
    pub config_dir: Option<String>,
    pub data_dir: Option<String>,
    pub work_dir: Option<String>,
}

pub fn build_sidecar_args(plan: &SidecarLaunchPlan) -> Vec<String> {
    let mut args = vec![
        "serve".to_string(),
        "--http-addr".to_string(),
        normalize_http_addr(&plan.http_addr),
    ];

    if let Some(config_dir) = normalize_option(plan.config_dir.clone()) {
        args.push("--config".to_string());
        args.push(config_dir);
        return args;
    }

    if let Some(data_dir) = normalize_option(plan.data_dir.clone()) {
        args.push("--data-dir".to_string());
        args.push(data_dir);
    }

    if let Some(work_dir) = normalize_option(plan.work_dir.clone()) {
        args.push("--work-dir".to_string());
        args.push(work_dir);
    }

    args
}

fn normalize_http_addr(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        "127.0.0.1:5030".to_string()
    } else {
        trimmed.to_string()
    }
}

fn normalize_option(value: Option<String>) -> Option<String> {
    value.and_then(|v| {
        let trimmed = v.trim().to_string();
        if trimmed.is_empty() { None } else { Some(trimmed) }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_dir_launch_does_not_put_data_key_in_args() {
        let plan = SidecarLaunchPlan {
            http_addr: "127.0.0.1:5030".into(),
            config_dir: Some("C:\\Users\\me\\AppData\\Roaming\\chatlogUI".into()),
            data_dir: None,
            work_dir: None,
        };

        let args = build_sidecar_args(&plan);

        assert!(args.contains(&"--config".to_string()));
        assert!(args.contains(&"--http-addr".to_string()));
        assert!(!args.contains(&"--data-key".to_string()));
    }

    #[test]
    fn data_dir_config_launch_omits_data_key_so_chatlog_json_can_load() {
        let plan = SidecarLaunchPlan {
            http_addr: "127.0.0.1:5030".into(),
            config_dir: None,
            data_dir: Some("E:\\WeChat Files\\wxid_xxx".into()),
            work_dir: Some("E:\\chatlog\\work".into()),
        };

        let args = build_sidecar_args(&plan);

        assert!(args.contains(&"--data-dir".to_string()));
        assert!(args.contains(&"--work-dir".to_string()));
        assert!(!args.contains(&"--data-key".to_string()));
    }

    #[test]
    fn default_http_addr_when_empty() {
        let plan = SidecarLaunchPlan {
            http_addr: "  ".into(),
            config_dir: None,
            data_dir: Some("/data".into()),
            work_dir: None,
        };

        let args = build_sidecar_args(&plan);
        assert!(args.contains(&"127.0.0.1:5030".to_string()));
    }
}
