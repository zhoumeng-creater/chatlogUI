const ERROR_MAP: Record<string, string> = {
  "Failed to fetch": "无法连接到更新服务器，请检查网络连接",
  "forbidden": "更新服务器拒绝访问，请稍后重试",
  "not found": "未找到更新清单文件，请联系开发者",
  "timeout": "更新服务器连接超时，请检查网络后重试",
};

export function translateUpdateError(error: unknown): string {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return ERROR_MAP["Failed to fetch"];
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    for (const [key, translation] of Object.entries(ERROR_MAP)) {
      if (message.includes(key)) {
        return translation;
      }
    }
    return `更新失败：${error.message}`;
  }

  return "发生未知错误，请稍后重试";
}
