import type { SetupProfileSummary } from "@l2/data-clerk/types/setup";
import { ReadinessStatePanel, type ReadinessStateView } from "@l3/common/ReadinessStatePanel";

interface ReadinessChecklistProps {
  profile: SetupProfileSummary | null;
  httpReady: boolean;
  dbReady: boolean;
}

export function ReadinessChecklist({ profile, httpReady, dbReady }: ReadinessChecklistProps) {
  const items: Array<ReadinessStateView & { scope: string }> = [
    {
      scope: "setup",
      status: profile ? "success" : "empty",
      title: profile ? "配置已保存" : "等待配置",
      message: profile ? "本地配置摘要已保存。" : "请选择数据目录或填写高级配置。",
    },
    {
      scope: "backend",
      status: httpReady ? "success" : "idle",
      title: httpReady ? "HTTP 服务健康" : "HTTP 未就绪",
      message: httpReady ? "本地服务可连接。" : "启动或连接本地服务后会继续检查。",
    },
    {
      scope: "database",
      status: dbReady ? "success" : httpReady ? "loading" : "idle",
      title: dbReady ? "数据库就绪" : "数据库未就绪",
      message: dbReady ? "聊天数据库可读取。" : "等待数据库校验完成。",
    },
  ];

  return (
    <div className="readiness-list">
      {items.map((item) => (
        <ReadinessStatePanel key={item.scope} state={item} />
      ))}
    </div>
  );
}
