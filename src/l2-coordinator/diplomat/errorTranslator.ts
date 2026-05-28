const ERROR_MAP: Record<string, string> = {
  EADDRINUSE: "端口被占用，正在自动清理...",
  ECONNREFUSED: "引擎未启动，请稍后重试",
  ETIMEDOUT: "引擎启动超时，请检查系统资源",
  ESIDECAR_EXISTS: "引擎已在运行中",
  EPORT_BLOCKED: "端口无法释放，请手动关闭占用程序后重试",
  EDB_TIMEOUT: "数据库初始化超时，请检查微信数据目录是否正确",
  EDB_NOT_FOUND: "未找到微信数据目录，请手动指定路径",
  EDB_DECRYPT_FAIL: "数据库解密失败，当前微信版本可能不支持",
  EPATH_NOT_FOUND: "数据目录不存在，请重新选择",
  ESEMANTIC_NOT_CONFIGURED: "AI 功能尚未配置，请在右侧面板中完成配置",
  ESEMANTIC_INDEX_NOT_BUILT: "语义索引尚未构建，请先构建索引",
  ESEMANTIC_INDEX_BUILDING: "索引正在构建中，请耐心等待",
  ESEMANTIC_OVERLOAD: "AI 引擎处理繁忙，请稍后重试",
  ESEMANTIC_SSE_ERROR: "AI 回答中断，请重新提问",
  ESEMANTIC_SEARCH_FAIL: "语义搜索失败，请检查索引状态",
  ESEMANTIC_CONNECTION_FAIL: "LLM 连接测试失败，请检查配置",
  ESEMANTIC_TIMEOUT: "AI 回答超时，请尝试简化问题或更换模型",
};

export function translateError(error: string): string {
  for (const [key, message] of Object.entries(ERROR_MAP)) {
    if (error.includes(key)) {
      return message;
    }
  }
  return `未知错误: ${error}`;
}
