export interface WxPathCandidate {
  path: string;
  label: string;
  exists: boolean;
}

export async function detectWxPath(): Promise<WxPathCandidate[]> {
  // For now, return empty array - actual Tauri FS API implementation deferred
  // In production this would use @tauri-apps/plugin-fs to scan WeChat Files directory
  return [];
}
