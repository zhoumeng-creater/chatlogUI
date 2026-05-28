import type { UpdateManifest } from "@/l2-coordinator/api-docs/update";

const DEFAULT_UPDATE_URL =
  "https://github.com/zhoumeng-creater/chatlogUI/releases/latest/download/update.json";

export async function fetchUpdateJson(): Promise<UpdateManifest> {
  const response = await fetch(DEFAULT_UPDATE_URL, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`获取更新清单失败: HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  const manifest = data as UpdateManifest;

  if (!manifest.version || !manifest.platforms) {
    throw new Error("更新清单格式无效");
  }

  return manifest;
}
