import type { WxPathCandidate } from "@l4/system";

interface ResolveBootDataPathInput {
  settingsPath: string | null | undefined;
  candidates: WxPathCandidate[];
}

function normalizePath(path: string | null | undefined): string | null {
  const value = path?.trim();
  return value ? value : null;
}

export function resolveBootDataPath({
  settingsPath,
  candidates,
}: ResolveBootDataPathInput): string | null {
  const configuredPath = normalizePath(settingsPath);
  if (configuredPath) return configuredPath;

  const candidate = candidates.find((item) => normalizePath(item.path));
  return normalizePath(candidate?.path);
}
