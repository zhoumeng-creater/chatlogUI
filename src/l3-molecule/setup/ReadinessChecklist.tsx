import type { SetupMode, SetupProfileSummary } from "@l2/data-clerk/types/setup";
import { ReadinessStatePanel, type ReadinessStateView } from "@l3/common/ReadinessStatePanel";

type ReadinessChecklistItem = ReadinessStateView & { id?: string; scope?: string };

interface ReadinessChecklistProps {
  profile: SetupProfileSummary | null;
  mode: SetupMode;
  httpReady: boolean;
  dbReady: boolean;
  items?: ReadinessChecklistItem[];
}

export function ReadinessChecklist({
  profile,
  mode,
  httpReady,
  dbReady,
  items,
}: ReadinessChecklistProps) {
  const checklistItems: ReadinessChecklistItem[] = items ?? deriveDefaultItems({ profile, mode, httpReady, dbReady });

  return (
    <div className="readiness-list">
      {checklistItems.map((item, index) => (
        <ReadinessStatePanel key={item.id ?? item.scope ?? index} state={item} />
      ))}
    </div>
  );
}

function deriveDefaultItems({
  profile,
  mode,
  httpReady,
  dbReady,
}: Omit<ReadinessChecklistProps, "items">): ReadinessChecklistItem[] {
  return [
    {
      scope: "setup",
      status: profile ? "success" : "empty",
      title: profile ? "配置已保存" : mode === "external" ? "等待连接" : "等待配置",
      message: profile
        ? "本地配置摘要已保存。"
        : mode === "external"
          ? "输入本机服务地址并连接后会保存配置。"
          : "请选择数据目录或填写高级配置。",
    },
    {
      scope: "backend",
      status: httpReady ? "success" : "idle",
      title: httpReady ? "HTTP 服务健康" : "HTTP 未就绪",
      message: httpReady ? "本地服务可连接。" : "启动或连接本地服务后会继续检查。",
    },
    {
      scope: "database",
      status: dbReady ? "success" : httpReady ? "empty" : "idle",
      title: dbReady ? "数据库就绪" : "数据库尚未就绪",
      message: dbReady
        ? "聊天数据库可读取。"
        : httpReady
          ? "服务已连接，数据库尚未就绪。刷新数据库状态后再进入工作台。"
          : "等待本机服务就绪后再检查数据库。",
    },
    {
      scope: "privacy",
      status: "success",
      title: "隐私保护",
      message: "界面和诊断只显示脱敏摘要。",
    },
  ];
}
