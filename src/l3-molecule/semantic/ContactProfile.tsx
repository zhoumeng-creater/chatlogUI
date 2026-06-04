import { Button, Surface, Typography, SkeletonLoader } from "@l4/ui";
import type { SemanticDiscoveryView } from "@/l2-coordinator/commander/semanticDiscoveryViewModel";
import { SemanticProfileRows } from "./SemanticProfileRows";

interface ContactProfileProps {
  view: SemanticDiscoveryView["profile"];
  onRetry?: () => void;
  onAskSender?: (sender: string) => void;
}

export function ContactProfile({ view, onRetry, onAskSender }: ContactProfileProps) {
  if (view.status === "loading") {
    return (
      <Surface variant="subtle" className="semantic-section">
        <SectionHeader view={view} />
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="semantic-skeleton-column">
            <SkeletonLoader variant="rect" width="30%" height={12} />
            <SkeletonLoader variant="rect" width="70%" height={14} />
          </div>
        ))}
      </Surface>
    );
  }

  if (view.status === "error") {
    return (
      <Surface variant="subtle" className="semantic-section">
        <SectionHeader view={view} />
        <Typography variant="body" color="var(--danger)" className="semantic-error-copy">
          {view.summaryError || "加载联系人画像失败"}
        </Typography>
        {onRetry && (
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            重试
          </Button>
        )}
      </Surface>
    );
  }

  if (view.status === "idle" || view.status === "empty") {
    return (
      <Surface variant="subtle" className="semantic-section">
        <SectionHeader view={view} />
        <Typography variant="body" color="var(--text-secondary)">
          暂无联系人画像数据，请先完成语义索引或选择有足够消息的会话。
        </Typography>
      </Surface>
    );
  }

  return (
    <Surface variant="subtle" className="semantic-section">
      <SectionHeader view={view} />
      {view.summary && (
        <div className="semantic-summary-block">
          <Typography variant="caption" color="var(--text-secondary)">
            总结
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {view.summary}
          </Typography>
        </div>
      )}
      {view.summaryError && (
        <Typography variant="caption" color="var(--warning)">
          {view.summaryError}
        </Typography>
      )}
      <SemanticProfileRows rows={view.rows} onAskSender={onAskSender} />
      {view.typeRows.length > 0 && (
        <div className="semantic-profile-row">
          <Typography variant="caption" color="var(--text-secondary)">
            类型分布
          </Typography>
          <div className="semantic-chip-list">
            {view.typeRows.map((row) => (
              <span key={row.type} className="semantic-chip">
                {row.type}: {row.countLabel}
              </span>
            ))}
          </div>
        </div>
      )}
    </Surface>
  );
}

function SectionHeader({ view }: { view: SemanticDiscoveryView["profile"] }) {
  return (
    <div className="semantic-section__header">
      <Typography variant="label" weight={700}>
        联系人画像
      </Typography>
      {(view.windowLabel || view.countLabel) && (
        <Typography variant="caption" color="var(--text-secondary)">
          {semanticMetaLine(view.windowLabel, view.countLabel)}
        </Typography>
      )}
    </div>
  );
}

function semanticMetaLine(...values: Array<string | undefined>): string {
  return values.filter((value): value is string => Boolean(value)).join(" · ");
}
