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
    "media_key",
    "mediaKey",
    "image_key",
    "imageKey",
    "video_key",
    "videoKey",
    "file_key",
    "fileKey",
    "voice_key",
    "voiceKey",
    "sns_key",
    "snsKey",
    "sns_id",
    "snsId",
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
    .replace(
      /(\bhttps?:\/\/[^\s?]+\/(?:image|video|file|voice|data)\/)[^\s?#]+(?:\?[^\s\n]+)?/gi,
      "$1[redacted-media-key]",
    )
    .replace(
      /(\/(?:image|video|file|voice|data)\/)[^\s?#]+/gi,
      "$1[redacted-media-key]",
    )
    .replace(/(\bhttps?:\/\/[^\s?]+)\?[^\s\n]+/gi, "$1?[redacted-query]")
    .replace(/\b(?:select|with)\b[\s\S]*?\bfrom\b[^\n]*/gi, "[redacted-sql]")
    .replace(/\b(?:insert\s+into|update|delete\s+from)\b[^\n]*/gi, "[redacted-sql]")
    .replace(/[A-Z]:\\Users\\[^\\\n]+(?:\\[^\n]*)?/gi, "[redacted-path]")
    .replace(/[A-Z]:\\[^:\n]*(?:WeChat Files|微信 Files|微信文件)[^\n]*/gi, "[redacted-path]")
    .replace(/(?:^|\s)[^\s\n]*WeChat Files[^\n]*/gi, " [redacted-path]")
    .replace(/wxid_[A-Za-z0-9_-]+/g, "[redacted-id]");

  if (options.privacyMode) {
    text = redactPrivateDiagnosticFields(text);
  }

  return text;
}

export function containsSensitiveDiagnosticText(input: string): boolean {
  const normalized = input.toLowerCase();
  return [
    /data[_-]?key\s*[=:]\s*(?!\*+)[^\s,;]+/i,
    /img[_-]?key\s*[=:]\s*(?!\*+)[^\s,;]+/i,
    /api[_-]?key\s*[=:]\s*(?!\*+)[^\s,;]+/i,
    /token\s*[=:]\s*(?!\*+)[^\s,;]+/i,
    /secret\s*[=:]\s*(?!\*+)[^\s,;]+/i,
    /credential\s*[=:]\s*(?!\*+)[^\s,;]+/i,
    /password\s*[=:]\s*(?!\*+)[^\s,;]+/i,
    /bearer\s+(?!\*+)[^\s,;]+/i,
    /[a-z]:\\users\\/i,
    /wechat files/i,
    /wxid_[a-z0-9_-]+/i,
    /\/(?:image|video|file|voice|data)\/(?!\[redacted-media-key\])[^/\s?#]+/i,
    /sns\/media\/proxy\?(?!\[redacted-query\])/i,
    /\bselect\b[\s\S]*\bfrom\b/i,
    /\b(?:keyword|query|sql|content|requestBody|responseBody|rawResponse)\s*[=:]\s*(?!\[redacted\]|\*+)[^\s,;]+/i,
    /"(?:content|sender|chat|keyword|query)"\s*:\s*"(?!\[redacted\])[^"]+"/i,
    /synthetic-private-message/i,
  ].some((pattern) => pattern.test(normalized));
}

function redactPrivateDiagnosticFields(input: string): string {
  const privateKeys = [
    "alias",
    "nickname",
    "displayName",
    "sender",
    "chat",
    "content",
    "message",
    "keyword",
    "query",
    "sql",
    "requestBody",
    "responseBody",
    "rawResponse",
    "url",
  ];

  return privateKeys.reduce((text, key) => {
    const jsonPattern = new RegExp(`("${key}"\\s*:\\s*")[^"]*(")`, "gi");
    const kvPattern = new RegExp(`(${key}\\s*[=:]\\s*)[^\\s,;&]+`, "gi");
    const linePattern = new RegExp(`(${key}\\s*:\\s*)[^\\n]+`, "gi");

    return text
      .replace(jsonPattern, "$1[redacted]$2")
      .replace(kvPattern, "$1[redacted]")
      .replace(linePattern, "$1[redacted]");
  }, input);
}
