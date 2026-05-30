import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";

export function DiagnosticPanel() {
  const profile = useSetupStore((s) => s.profile);
  const portState = useSetupStore((s) => s.portState);
  const httpReady = useSetupStore((s) => s.httpReady);
  const dbReady = useSetupStore((s) => s.dbReady);
  const error = useSetupStore((s) => s.error);
  const mode = useSetupStore((s) => s.mode);

  if (!profile) {
    return (
      <div className="text-sm text-gray-400 p-3 bg-gray-50 rounded-md">
        暂无诊断信息。请先完成配置。
      </div>
    );
  }

  return (
    <div className="text-xs font-mono bg-gray-50 rounded-md p-3 space-y-1 whitespace-pre-wrap break-all">
      <div>Mode: {mode}</div>
      <div>Source: {profile.source}</div>
      <div>Config dir: {profile.configDir ?? "-"}</div>
      <div>Data dir: {profile.dataDir ?? "-"}</div>
      <div>Work dir: {profile.workDir ?? "-"}</div>
      <div>HTTP addr: {profile.httpAddr}</div>
      <div>Port state: {portState}</div>
      <div>HTTP ready: {String(httpReady)}</div>
      <div>DB ready: {String(dbReady)}</div>
      <div>Secrets: data_key={profile.hasDataKey ? "present" : "missing"}, img_key={profile.hasImgKey ? "present" : "missing"}</div>
      {error && <div className="text-red-600">Last error: {error}</div>}
    </div>
  );
}
