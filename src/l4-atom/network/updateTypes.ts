export interface UpdateManifestPlatformView {
  signature: string;
  url: string;
}

export interface UpdateManifestView {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, UpdateManifestPlatformView>;
}
