import { Button, Typography } from "@l4/ui";
import type { SemanticDiscoveryProfileRowView } from "@/l2-coordinator/commander/semanticDiscoveryViewModel";

interface SemanticProfileRowsProps {
  rows: SemanticDiscoveryProfileRowView[];
  onAskSender?: (sender: string) => void;
}

export function SemanticProfileRows({ rows, onAskSender }: SemanticProfileRowsProps) {
  if (rows.length === 0) return null;

  return (
    <div className="semantic-profile-list">
      {rows.map((row) => (
        <div key={`${row.sender}-${row.messages}`} className="semantic-profile-row">
          <div className="semantic-profile-row__main">
            <Typography variant="caption" color="var(--text-secondary)">
              {row.senderLabel}
            </Typography>
            <Typography variant="body">
              {row.messagesLabel}
            </Typography>
          </div>
          {row.keywords.length > 0 && (
            <div className="semantic-chip-list">
              {row.keywords.map((keyword, index) => (
                <span key={`${keyword}-${index}`} className="semantic-chip">
                  {keyword}
                </span>
              ))}
            </div>
          )}
          {onAskSender && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onAskSender(row.sender)}>
              询问此发送者
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
