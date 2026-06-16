import { invoke } from "@tauri-apps/api/core";

export interface WxPathCandidate {
  path: string;
  label: string;
  exists: boolean;
  source: string;
  confidence: string;
}

export async function detectWxPath(): Promise<WxPathCandidate[]> {
  return invoke<WxPathCandidate[]>("detect_wechat_data_dirs");
}
