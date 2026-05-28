export async function openDirectoryPicker(): Promise<string | null> {
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      directory: true,
      multiple: false,
      title: "选择微信数据目录",
    });
    return typeof selected === "string" ? selected : null;
  } catch {
    return null;
  }
}
