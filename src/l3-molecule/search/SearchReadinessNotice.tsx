import {
  buildSearchReadinessRecoveryActions,
  type SearchReadinessRecoveryPhase,
  type SearchRequestRecoveryActionId,
} from "@l2/commander/searchRequestRecoveryModel";
import { classNames } from "@/utils/classNames";

interface SearchReadinessCallbacks {
  onRecoverService: () => void;
  onRecheckDatabase: () => void;
  onOpenSettings: (section: "service" | "data") => void;
}

interface SearchReadinessNoticeProps extends SearchReadinessCallbacks {
  phase: SearchReadinessRecoveryPhase;
  reason: string | null;
}

export function SearchReadinessNotice({
  phase,
  reason,
  onRecoverService,
  onRecheckDatabase,
  onOpenSettings,
}: SearchReadinessNoticeProps) {
  if (phase === "ready" || !reason) return null;
  const actions = buildSearchReadinessRecoveryActions(phase);
  const transitional = phase === "service-starting" || phase === "database-loading";
  const callbacks = { onRecoverService, onRecheckDatabase, onOpenSettings };

  return (
    <aside
      className={classNames(
        "search-readiness-notice",
        transitional ? "search-readiness-notice--progress" : "search-readiness-notice--blocked",
      )}
      role={transitional ? "status" : "alert"}
      aria-live={transitional ? "polite" : "assertive"}
      aria-label="搜索服务状态"
    >
      <div className="search-readiness-notice__copy">
        <strong>{transitional ? "正在准备搜索" : "搜索暂不可用"}</strong>
        <span>{reason}</span>
      </div>
      {actions.length > 0 && (
        <div className="search-readiness-notice__actions" aria-label="搜索恢复操作">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => runSearchReadinessAction(action.id, callbacks)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

export function runSearchReadinessAction(
  actionId: SearchRequestRecoveryActionId,
  callbacks: SearchReadinessCallbacks,
): void {
  if (actionId === "recover-service") callbacks.onRecoverService();
  else if (actionId === "recheck-database") callbacks.onRecheckDatabase();
  else if (actionId === "service-settings") callbacks.onOpenSettings("service");
  else if (actionId === "data-settings") callbacks.onOpenSettings("data");
}
