import { invoke } from "@tauri-apps/api/core";
import { canInvokeTauriCommand } from "./tauriRuntime";

type WindowMaterial = "mica" | "acrylic" | "vibrancy" | "none";

export async function applyWindowMaterial(material: WindowMaterial): Promise<void> {
  if (!canInvokeTauriCommand()) return;

  try {
    await invoke("apply_window_material", { material });
  } catch (error) {
    console.error("Failed to apply window material:", error);
  }
}
