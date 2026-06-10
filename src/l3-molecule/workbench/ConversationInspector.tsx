import type { WorkbenchContextDeepLink } from "@l2/commander/workbenchInformationArchitecture";
import { Button, DisabledReason, Spinner, Typography } from "@l4/ui";
import type { ConversationInspectorView } from "./conversationInspectorDisplay";

interface ConversationInspectorProps {
  view: ConversationInspectorView;
  links: WorkbenchContextDeepLink[];
  onNavigate: (href: string) => void;
  onRetryStats: () => void;
}

export function ConversationInspector({
  view,
  links,
  onNavigate,
  onRetryStats,
}: ConversationInspectorProps) {
  return (
    <aside className="conversation-inspector" aria-label={view.title}>
      <div className="conversation-inspector__header">
        <Typography variant="label" weight={700}>
          {view.title}
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          {view.heading}
        </Typography>
      </div>

      <div className="conversation-inspector__body">
        <Typography variant="body" color="var(--text-secondary)">
          {view.body}
        </Typography>

        {view.sections.map((section) => (
          <section key={section.title} className="conversation-inspector__section">
            <div className="conversation-inspector__section-header">
              <Typography variant="label" weight={700}>
                {section.title}
              </Typography>
              {section.status === "loading" && <Spinner size={14} label="加载中" />}
            </div>

            {section.status === "error" && (
              <div className="conversation-inspector__state" role="alert">
                <Typography variant="caption" color="var(--danger)">
                  {section.body ?? "加载失败"}
                </Typography>
                <Button variant="secondary" size="sm" onClick={onRetryStats}>
                  重试
                </Button>
              </div>
            )}

            {section.status === "loading" && section.body && (
              <Typography variant="caption" color="var(--text-secondary)">
                {section.body}
              </Typography>
            )}

            {section.items.length > 0 && (
              <dl className="conversation-inspector__facts">
                {section.items.map((item) => (
                  <div key={`${section.title}-${item.label}`} className="conversation-inspector__fact">
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        ))}

        <section className="conversation-inspector__section">
          <Typography variant="label" weight={700}>
            上下文入口
          </Typography>
          <div className="conversation-inspector__links">
            {links.map((link) => {
              const reasonId = link.disabled ? `conversation-link-${link.label}` : undefined;
              return (
                <div key={link.href} className="conversation-inspector__link-row">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={link.disabled}
                    aria-describedby={reasonId}
                    onClick={() => onNavigate(link.href)}
                  >
                    {link.label}
                  </Button>
                  {link.disabled && link.disabledReason && (
                    <DisabledReason id={reasonId} reason={link.disabledReason} />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}
