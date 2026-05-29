export function maskSecretText(input: string): string {
  return input
    .replace(/("data_key"\s*:\s*")[^"]+(")/gi, "$1******$2")
    .replace(/("img_key"\s*:\s*")[^"]+(")/gi, "$1******$2")
    .replace(/(data_key=)[^\s]+/gi, "$1******")
    .replace(/(img_key=)[^\s]+/gi, "$1******");
}
