import { invoke } from "@tauri-apps/api/core";
import { canInvokeTauriCommand } from "./tauriRuntime";

type WindowMaterial = "mica" | "acrylic" | "vibrancy" | "none";

interface ApplyWindowMaterialOptions {
  onFailure?: (failure: { material: WindowMaterial; error: unknown }) => void;
}

export async function applyWindowMaterial(
  material: WindowMaterial,
  options: ApplyWindowMaterialOptions = {},
): Promise<void> {
  if (!canInvokeTauriCommand()) return;

  try {
    await invoke("apply_window_material", { material });
  } catch (error) {
    options.onFailure?.({ material, error });
  }
}
