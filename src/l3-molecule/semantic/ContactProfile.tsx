import { Button, Surface, Typography, SkeletonLoader } from "@l4/ui";
import {
  getSemanticDisplayText,
  getSemanticProfileRows,
  getSemanticTypeDistributionRows,
} from "./semanticDisplay";

interface ContactProfileDataView {
  profiles?: Array<{
    sender: string;
    senderName: string;
    messages: number;
    topKeywords: Array<{ topic: string; count: number }>;
  }>;
  typeDistribution?: Array<{ type: string; count: number }>;
  summary?: string;
}

interface ContactProfileProps {
  profile: ContactProfileDataView | null;
  loading: boolean;
  error?: string | null;
  privacyOn: boolean;
  onRetry?: () => void;
}

export function ContactProfile({ profile, loading, error, privacyOn, onRetry }: ContactProfileProps) {
  if (loading && !profile) {
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
        <Typography variant="body" color="var(--danger)" style={{ marginBottom: 8 }}>
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

  const rows = getSemanticProfileRows(profile?.profiles, privacyOn);
  const typeRows = getSemanticTypeDistributionRows(profile?.typeDistribution);

  if (!profile || rows.length === 0) {
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
      <Typography variant="label" weight={700}>
        联系人画像
      </Typography>
      {profile.summary && (
        <div className="semantic-profile-row">
          <Typography variant="caption" color="var(--text-secondary)">
            总结
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {getSemanticDisplayText(profile.summary, privacyOn)}
          </Typography>
        </div>
      )}
      {rows.map((row) => (
        <div key={`${row.sender}-${row.messages}`} className="semantic-profile-row">
          <Typography variant="caption" color="var(--text-secondary)">
            {row.sender}
          </Typography>
          <Typography variant="body">
            {row.messages}
          </Typography>
          {row.keywords.length > 0 && (
            <div className="semantic-chip-list">
              {row.keywords.map((keyword) => (
                <span key={keyword} className="semantic-chip">
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
      {typeRows.length > 0 && (
        <div className="semantic-profile-row">
          <Typography variant="caption" color="var(--text-secondary)">
            类型分布
          </Typography>
          <div className="semantic-chip-list">
            {typeRows.map((row) => (
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
