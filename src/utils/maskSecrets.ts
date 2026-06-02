export function maskSecretText(input: string): string {
  const secretKeys = [
    "data_key",
    "dataKey",
    "img_key",
    "imgKey",
    "api_key",
    "apiKey",
    "token",
    "secret",
    "credential",
    "password",
    "authorization",
  ];

  return secretKeys.reduce((text, key) => {
    const jsonPattern = new RegExp(`("${key}"\\s*:\\s*")[^"]+(")`, "gi");
    const kvPattern = new RegExp(`(${key}\\s*[=:]\\s*)[^\\s,;]+`, "gi");
    const colonPattern = new RegExp(`(${key}\\s*:\\s*)[^\\n]+`, "gi");

    return text
      .replace(jsonPattern, "$1******$2")
      .replace(kvPattern, "$1******")
      .replace(colonPattern, "$1******");
  }, input)
    .replace(/(Bearer\s+)[^\s,;]+/gi, "$1******");
}

export interface MaskDiagnosticOptions {
  privacyMode?: boolean;
}

export function maskDiagnosticText(input: string, options: MaskDiagnosticOptions = {}): string {
  let text = maskSecretText(input)
    .replace(/\bhttps?:\/\/(?!(?:localhost|127\.0\.0\.1|\[::1\])(?::|\/|$))[^\s]+/gi, "[redacted-url]")
    .replace(/([?&](?:url|key)=)[^&\s]+/gi, "$1******")
    .replace(/\b(key\s*[=:]\s*)(?!present\b|missing\b)[^\s,;&]+/gi, "$1******")
    .replace(/\/(image|video|file|voice)\/[^?\s]+/gi, "/$1/[redacted-key]")
    .replace(/\/data\/[^\s]+/gi, "/data/[redacted-path]")
    .replace(/[A-Z]:\\Users\\[^\\\n]+(?:\\[^\n]*)?/gi, "[redacted-path]")
    .replace(/[A-Z]:\\[^:\n]*(?:WeChat Files|微信 Files|微信文件)[^\n]*/gi, "[redacted-path]")
    .replace(/(?:^|\s)[^\s\n]*WeChat Files[^\n]*/gi, " [redacted-path]")
    .replace(/wxid_[A-Za-z0-9_-]+/g, "[redacted-id]");

  if (options.privacyMode) {
    text = text.replace(/(?:alias|nickname|displayName|sender|chat)\s*[:=]\s*[^\n,;]+/gi, "$1=[redacted]");
  }

  return text;
}

export function containsSensitiveDiagnosticText(input: string): boolean {
  const normalized = input.toLowerCase();
  return [
    /data[_\s-]?key\s*[=:]\s*(?!\*+|present\b|missing\b)[^\s,;]+/i,
    /img[_\s-]?key\s*[=:]\s*(?!\*+|present\b|missing\b)[^\s,;]+/i,
    /image[_\s-]?key\s*[=:]\s*(?!\*+|present\b|missing\b)[^\s,;]+/i,
    /api[_\s-]?key\s*[=:]\s*(?!\*+|present\b|missing\b)[^\s,;]+/i,
    /token\s*[=:]\s*(?!\*+)[^\s,;]+/i,
    /secret\s*[=:]\s*(?!\*+)[^\s,;]+/i,
    /credential\s*[=:]\s*(?!\*+)[^\s,;]+/i,
    /password\s*[=:]\s*(?!\*+)[^\s,;]+/i,
    /bearer\s+(?!\*+)[^\s,;]+/i,
    /[?&](?:url|key)=(?!\*+)[^&\s]+/i,
    /\bhttps?:\/\/(?!(?:localhost|127\.0\.0\.1|\[::1\])(?::|\/|$))[^\s]+/i,
    /\bkey\s*[=:]\s*(?!\*+|present\b|missing\b)[^\s,;&]+/i,
    /\/(?:image|video|file|voice)\/(?!\[redacted-key\])[^?\s]+/i,
    /\/data\/(?!\[redacted-path\])[^?\s]+/i,
    /[a-z]:\\users\\/i,
    /wechat files/i,
    /wxid_[a-z0-9_-]+/i,
  ].some((pattern) => pattern.test(normalized));
}
