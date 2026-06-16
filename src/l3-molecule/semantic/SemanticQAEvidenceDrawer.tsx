import { useEffect, useRef } from 'react';
import { Download, ExternalLink, X } from 'lucide-react';
import { Button } from '@l4/ui/Button';
import { DisabledReason } from '@l4/ui/DisabledReason';
import { IconButton } from '@l4/ui/IconButton';
import { Typography } from '@l4/ui/Typography';
import {
  focusInitialOverlayTarget,
  getOverlayDialogProps,
  restoreFocusTarget,
  shouldCloseOverlayOnKey,
  type FocusTarget,
} from '@l4/ui';
import {
  getSemanticEntityCandidateRows,
  getSemanticEvidenceRows,
  getSemanticDisplayText,
  getSemanticMetadataChips,
  type SemanticEntityCandidateDisplayRow,
} from './semanticDisplay';

interface EvidenceMessage {
  id: string;
  evidence?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  sourceCount?: number;
  reason?: string;
}

interface SemanticQAEvidenceDrawerProps {
  message: EvidenceMessage;
  privacyOn: boolean;
  onClose: () => void;
  onUseEntityCandidate: (candidate: SemanticEntityCandidateDisplayRow) => void;
  onOpenSource?: (chat: string, label: string, localId?: number) => void;
  onExportEvidence?: () => void;
  exportDisabledReason?: string | null;
}

export function SemanticQAEvidenceDrawer({
  message,
  privacyOn,
  onClose,
  onUseEntityCandidate,
  onOpenSource,
  onExportEvidence,
  exportDisabledReason,
}: SemanticQAEvidenceDrawerProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const restoreTargetRef = useRef<FocusTarget | null>(null);
  const metadata = {
    ...(message.metadata ?? {}),
    sourceCount: message.sourceCount ?? message.metadata?.sourceCount,
  };
  const chips = getSemanticMetadataChips(metadata);
  const rows = getSemanticEvidenceRows(message.evidence, privacyOn);
  const candidates = getSemanticEntityCandidateRows(metadata, privacyOn);

  useEffect(() => {
    restoreTargetRef.current = document.activeElement as FocusTarget | null;
    focusInitialOverlayTarget(panelRef.current);
    return () => {
      restoreFocusTarget(restoreTargetRef.current);
    };
  }, []);

  return (
    <aside
      ref={panelRef}
      {...getOverlayDialogProps({ label: "问答证据", modal: false })}
      className="qa-evidence"
      onKeyDown={(event) => {
        if (!shouldCloseOverlayOnKey(event.key, { dismissible: true })) return;
        event.preventDefault();
        onClose();
      }}
    >
      <div className="qa-evidence__header">
        <div>
          <Typography variant="label" weight={700}>证据</Typography>
          {chips.length > 0 && (
            <div className="qa-evidence__chips">
              {chips.map((chip) => (
                <span key={chip} className="qa-evidence__chip">{chip}</span>
              ))}
            </div>
          )}
        </div>
        <div className="qa-evidence__header-actions">
          {onExportEvidence && (
            exportDisabledReason ? (
              <DisabledReason reason={exportDisabledReason} variant="compact">
                <Button
                  variant="ghost"
                  size="sm"
                  className="qa-evidence__export"
                  disabled
                >
                  <Download size={14} />导出证据
                </Button>
              </DisabledReason>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="qa-evidence__export"
                onClick={onExportEvidence}
              >
                <Download size={14} />导出证据
              </Button>
            )
          )}
          <IconButton
            icon={<X size={15} />}
            label="关闭证据"
            tooltip="关闭证据"
            size="sm"
            autoFocus
            onClick={onClose}
          />
        </div>
      </div>

      {message.reason && (
        <Typography variant="caption" color="var(--color-text-secondary)" className="qa-evidence__reason">
          {getSemanticDisplayText(message.reason, privacyOn)}
        </Typography>
      )}

      {candidates.length > 0 && (
        <section className="qa-evidence__section" aria-label="实体候选">
          <Typography variant="caption" weight={700}>实体候选</Typography>
          <div className="qa-evidence__candidates">
            {candidates.map((candidate) => (
              <div key={`${candidate.entityOverride}-${candidate.displayLabel}`} className="qa-evidence__candidate">
                <div className="qa-evidence__candidate-copy">
                  <span>{candidate.displayLabel}</span>
                  <small>{candidate.kindLabel} · {candidate.sourceLabel}</small>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onUseEntityCandidate(candidate)}
                  disabled={!candidate.entityOverride}
                >
                  使用
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="qa-evidence__section" aria-label="证据行">
        {rows.length === 0 && (
          <Typography variant="caption" color="var(--color-text-tertiary)">
            暂无证据。
          </Typography>
        )}
        {rows.map((row) => (
          <article key={`${row.index}-${row.time}-${row.localId}`} className="qa-evidence__row">
            <div className="qa-evidence__row-head">
              <span>[{row.index}] {row.time || '未知时间'}</span>
              {row.chat && onOpenSource && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="qa-evidence__open"
                  onClick={() => onOpenSource(row.chat, row.chatLabel, row.localId > 0 ? row.localId : undefined)}
                >
                  <ExternalLink size={13} />{row.localId > 0 ? "打开到证据" : "打开会话"}
                </Button>
              )}
            </div>
            {row.chat && row.localId <= 0 && (
              <Typography variant="caption" color="var(--color-text-tertiary)">
                证据未提供消息锚点，打开后需在会话内手动核对。
              </Typography>
            )}
            <div className="qa-evidence__row-meta">
              {row.chatLabel} · {row.senderLabel} · {row.sourceLabel}
            </div>
            <div className="qa-evidence__scores">
              {row.scoreLabel && <span>{row.scoreLabel}</span>}
              {row.rerankScoreLabel && <span>{row.rerankScoreLabel}</span>}
            </div>
            <p className="qa-evidence__content">{row.content}</p>
            {row.contextRows.length > 0 && (
              <div className="qa-evidence__context">
                {row.contextRows.map((contextRow) => (
                  <div key={`${contextRow.time}-${contextRow.senderLabel}-${contextRow.content}`}>
                    {contextRow.time} {contextRow.senderLabel}: {contextRow.content}
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </section>
    </aside>
  );
}
