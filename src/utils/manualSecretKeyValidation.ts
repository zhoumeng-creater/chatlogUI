const HEX_64_PATTERN = /^[0-9a-fA-F]{64}$/;

export function validateManualSecretKeyFormat(
  value: string | null | undefined,
  label: string,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return HEX_64_PATTERN.test(trimmed) ? null : `${label}应为64位十六进制字符。`;
}
