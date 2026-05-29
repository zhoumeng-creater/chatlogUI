import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { AppPhase } from "@l2/data-clerk/types/app";
import { useAppCommander } from "@l2/commander/useAppCommander";
import { useAppStore } from "@l2/data-clerk/stores/useAppStore";
import { AppLayout } from "@l3/common/AppLayout";
import { StatusBar } from "@l3/common/StatusBar";
import { Spinner, Typography, SkeletonLoader, AppleButton } from "@l4/ui";

const PHASE_LABELS: Record<AppPhase, string> = {
  idle: "准备启动",
  killing_port: "端口清理",
  spawning_sidecar: "引擎启动",
  health_check: "健康检查",
  ready: "就绪",
  error: "启动失败",
  db_connecting: "数据库连接",
  db_not_found: "未找到数据",
  db_decrypting: "数据解密",
};

const PHASE_ORDER: AppPhase[] = ["killing_port", "spawning_sidecar", "health_check", "db_connecting", "db_decrypting"];

function getPhaseProgress(phase: AppPhase): number {
  const idx = PHASE_ORDER.indexOf(phase);
  return idx >= 0 ? idx : -1;
}

export function LaunchView() {
  const navigate = useNavigate();
  const { boot, retry, chooseWxDataPath } = useAppCommander();
  const appPhase = useAppStore((s) => s.appPhase);
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  const errorMessage = useAppStore((s) => s.errorMessage);

  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    if (appPhase === "ready") {
      const timer = setTimeout(() => navigate("/dashboard"), 500);
      return () => clearTimeout(timer);
    }
  }, [appPhase, navigate]);

  const currentProgress = getPhaseProgress(appPhase);
  const phaseStr: string = appPhase;
  const isReady = phaseStr === "ready";
  const isError = phaseStr === "error";
  const isDbNotFound = phaseStr === "db_not_found";

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-full gap-8 px-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-lg shadow-[#007AFF]/20">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <Typography variant="h3">chatlog_alpha</Typography>
          <Typography variant="caption" color="#8E8E93">
            {PHASE_LABELS[appPhase]}
          </Typography>
        </div>

        {isReady ? (
          <div className="flex flex-col items-center gap-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <Typography variant="body" color="#34C759">
              引擎就绪，正在跳转...
            </Typography>
          </div>
        ) : isDbNotFound ? (
          <div className="flex flex-col items-center gap-4">
            <Typography variant="body" color="#FF9500">
              未找到微信数据目录
            </Typography>
            <div className="flex gap-3">
              <AppleButton variant="primary" size="md" onClick={chooseWxDataPath}>
                手动选择
              </AppleButton>
              <AppleButton variant="ghost" size="md" onClick={() => navigate("/dashboard")}>
                跳过
              </AppleButton>
            </div>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-4">
            <Typography variant="body" color="#FF3B30">
              {errorMessage || "启动失败"}
            </Typography>
            <AppleButton variant="primary" size="md" onClick={retry}>
              重试
            </AppleButton>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            <Spinner size={36} color="#007AFF" label="正在初始化本地引擎..." />
            <div className="flex flex-col gap-2 w-full">
              {PHASE_ORDER.map((phase, idx) => {
                const isActive = idx === currentProgress;
                const isDone = idx < currentProgress || isReady;

                return (
                  <div key={phase} className="flex items-center gap-3">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{
                        backgroundColor: isDone
                          ? "#34C759"
                          : isActive
                            ? "#007AFF"
                            : "#E8E8ED",
                        color: isDone || isActive ? "white" : "#8E8E93",
                      }}
                    >
                      {isDone ? "\u2713" : isActive ? "\u25CF" : "\u25CB"}
                    </span>
                    <Typography
                      variant="caption"
                      color={isDone ? "#34C759" : isActive ? "#007AFF" : "#8E8E93"}
                    >
                      {PHASE_LABELS[phase]}
                    </Typography>
                  </div>
                );
              })}
            </div>
            <SkeletonLoader variant="rect" height={4} count={1} />
          </div>
        )}
      </div>
      <StatusBar status={sidecarStatus} error={errorMessage ?? undefined} />
    </AppLayout>
  );
}
