import { Button, Surface, Typography, SkeletonLoader } from "@l4/ui";
import type { SemanticDiscoveryProfileView } from "@l2/commander/semanticDiscoveryViewModel";

interface ContactProfileProps {
  view: SemanticDiscoveryProfileView | null;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onAskAboutSender?: (senderId: string) => void;
}

export function ContactProfile({ view, loading, error, onRetry, onAskAboutSender }: ContactProfileProps) {
  if (loading && !view) {
    return (
      <Surface variant="subtle" className="semantic-section">
        <Typography variant="label" weight={700}>
          联系人画像
        </Typography>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="semantic-skeleton-column">
            <SkeletonLoader variant="rect" width="30%" height={12} />
            <SkeletonLoader variant="rect" width="70%" height={14} />
          </div>
        ))}
      </Surface>
    );
  }

  if (error) {
    return (
      <Surface variant="subtle" className="semantic-section">
        <Typography variant="label" weight={700}>
          联系人画像
        </Typography>
        <Typography variant="body" color="var(--danger)" className="semantic-error-copy">
          {error}
        </Typography>
        {onRetry && (
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            重试
          </Button>
        )}
      </Surface>
    );
  }

  if (!view || view.rows.length === 0) {
    return (
      <Surface variant="subtle" className="semantic-section">
        <Typography variant="label" weight={700}>
          联系人画像
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          暂无联系人画像数据，请先完成语义索引或选择有足够消息的会话。
        </Typography>
      </Surface>
    );
  }

  return (
    <Surface variant="subtle" className="semantic-section">
      <div className="semantic-section__head">
        <div>
          <Typography variant="label" weight={700}>
            {view.title}
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {view.windowLabel} · {view.countLabel}
          </Typography>
        </div>
        {view.truncatedLabel && <span className="semantic-warning-pill">{view.truncatedLabel}</span>}
      </div>
      {view.summary && (
        <Typography variant="caption" color="var(--text-secondary)" className="semantic-summary-copy">
          {view.summary}
        </Typography>
      )}
      {view.summaryError && (
        <Typography variant="caption" color="var(--warning)" className="semantic-warning-copy">
          摘要生成失败：{view.summaryError}
        </Typography>
      )}
      {view.rows.map((row) => (
        <div key={`${row.senderId}-${row.messagesLabel}`} className="semantic-profile-row">
          <div className="semantic-profile-row__head">
            <div>
              <Typography variant="caption" color="var(--text-secondary)">
                {row.senderLabel}
              </Typography>
              <Typography variant="body">
                {row.messagesLabel}
              </Typography>
            </div>
            {row.canAskAboutSender && onAskAboutSender && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onAskAboutSender(row.senderId)}>
                问答
              </Button>
            )}
          </div>
          <div className="semantic-chip-list semantic-chip-list--inline">
            {row.keywords.map((keyword) => (
              <span key={keyword} className="semantic-chip">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      ))}
      {view.typeRows.length > 0 && (
        <div className="semantic-profile-row">
          <Typography variant="caption" color="var(--text-secondary)">
            类型分布
          </Typography>
          <div className="semantic-chip-list">
            {view.typeRows.map((row) => (
              <span key={row} className="semantic-chip">
                {row}
              </span>
            ))}
          </div>
        </div>
      )}
    </Surface>
  );
}
