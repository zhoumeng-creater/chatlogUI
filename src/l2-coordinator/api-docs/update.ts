export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "error";

export interface UpdateState {
  status: UpdateStatus;
  version: string;
  notes: string;
  progress: number;
  totalBytes: number;
  downloadedBytes: number;
  errorMessage: string;
}

export interface UpdateManifestPlatform {
  signature: string;
  url: string;
}

export interface UpdateManifest {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, UpdateManifestPlatform>;
}
