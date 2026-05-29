use tauri::window::{Effect, EffectsBuilder};
use tauri::Window;

#[tauri::command]
pub async fn apply_window_material(window: Window, material: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let effect = match material.as_str() {
            "mica" => Some(Effect::Mica),
            "acrylic" => Some(Effect::Acrylic),
            _ => None,
        };
        let config = effect.map(|effect| EffectsBuilder::new().effect(effect).build());
        window
            .set_effects(config)
            .map_err(|e| format!("设置窗口材质失败: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        if material == "vibrancy" {}
    }

    let _ = (window, material);
    Ok(())
}
