import { Activity, RefreshCw } from "lucide-react";
import { Button, Typography } from "@l4/ui";
import type { McpView } from "@l2/commander/mcpViewModel";
import { describeMcpForbiddenControls, formatMcpRouteLabel } from "./mcpDisplay";

interface McpPanelProps {
  view: McpView;
  onRefresh: () => void;
  onSmoke: () => void;
}

export function McpPanel({ view, onRefresh, onSmoke }: McpPanelProps) {
  return (
    <div className="developer-mcp">
      <section className="developer-section developer-section--top">
        <div className="developer-section__header">
          <div>
            <Typography variant="label" weight={700}>
              MCP Inventory
            </Typography>
            <Typography variant="caption" color="var(--text-secondary)">
              {view.summary}
            </Typography>
          </div>
          <div className="developer-inline-actions">
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw size={14} />
              刷新
            </Button>
            <Button variant="secondary" size="sm" loading={view.smokeStatus === "loading"} onClick={onSmoke}>
              <Activity size={14} />
              {view.smokeActionCopy}
            </Button>
          </div>
        </div>
        <Typography variant="caption" color="var(--text-muted)">
          禁用控件：{describeMcpForbiddenControls(view.forbiddenControls)}
        </Typography>
        {view.smokeResult && (
          <Typography variant="caption" color="var(--text-secondary)">
            {view.smokeResultCopy}
          </Typography>
        )}
        {view.errorCopy && (
          <Typography variant="caption" color="var(--danger)">
            {view.errorCopy}
          </Typography>
        )}
      </section>
      <section className="developer-section" aria-label="MCP 路由">
        <Typography variant="label" weight={700}>
          Routes
        </Typography>
        <div className="developer-list developer-list--compact">
          {view.routes.map((route) => (
            <div key={`${route.method}-${route.path}`} className="developer-list-row developer-list-row--table">
              <span>{formatMcpRouteLabel(route.method, route.path)}</span>
              <small>{route.status}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="developer-section" aria-label="MCP 工具">
        <Typography variant="label" weight={700}>
          Tools
        </Typography>
        <div className="developer-mcp-grid">
          {view.tools.map((tool) => (
            <article key={tool.name} className="developer-mcp-card">
              <Typography variant="label" weight={700}>
                {tool.name}
              </Typography>
              <Typography variant="caption" color="var(--text-secondary)">
                {tool.description}
              </Typography>
              <Typography variant="caption" color="var(--text-muted)">
                {tool.argumentKeys.length > 0 ? tool.argumentKeys.join(", ") : "no arguments"}
              </Typography>
            </article>
          ))}
        </div>
      </section>
      <section className="developer-section" aria-label="MCP Prompts">
        <Typography variant="label" weight={700}>
          Prompts
        </Typography>
        <div className="developer-mcp-grid">
          {view.prompts.map((prompt) => (
            <article key={prompt.name} className="developer-mcp-card">
              <Typography variant="label" weight={700}>
                {prompt.name}
              </Typography>
              <Typography variant="caption" color="var(--text-secondary)">
                {prompt.description}
              </Typography>
              <Typography variant="caption" color="var(--text-muted)">
                {prompt.argumentKeys.length > 0 ? prompt.argumentKeys.join(", ") : "no arguments"}
              </Typography>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
