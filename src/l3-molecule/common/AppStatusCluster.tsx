import { StatusIndicator } from "@l4/ui";

interface AppStatusClusterProps {
  privacyOn: boolean;
}

export function AppStatusCluster({ privacyOn }: AppStatusClusterProps) {
  return (
    <div className="app-status-cluster">
      <StatusIndicator
        label={privacyOn ? "隐私保护" : "本地工作台"}
        tone={privacyOn ? "warning" : "neutral"}
      />
    </div>
  );
}
