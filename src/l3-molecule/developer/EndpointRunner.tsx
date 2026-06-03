import { Play, ShieldCheck } from "lucide-react";
import { Button, Input, Select, Spinner, Typography } from "@l4/ui";
import type { EndpointCatalogEntry } from "@l4/network";
import type { EndpointRunnerView } from "@l2/commander/endpointRunnerViewModel";
import type { DeveloperToolsLoadStatus } from "@l2/data-clerk/stores/useDeveloperToolsStore";
import {
  endpointParamPlaceholder,
  formatEndpointParamInputValue,
  formatRunnerHistoryLabel,
  shouldDisableEndpointParamInput,
} from "./developerDisplay";
import { RawResponsePreview } from "./RawResponsePreview";

interface EndpointRunnerProps {
  view: EndpointRunnerView;
  selectedEndpointId: string;
  endpointParams: Record<string, string | number | boolean | undefined>;
  status: DeveloperToolsLoadStatus;
  privacyOn: boolean;
  confirmationPending: boolean;
  onSelectEndpoint: (entryId: string) => void;
  onParamChange: (name: string, value: string | number | boolean | undefined) => void;
  onRequestConfirmation: () => void;
  onCancelConfirmation: () => void;
  onRun: (confirmed?: boolean) => void;
}

export function EndpointRunner({
  view,
  selectedEndpointId,
  endpointParams,
  status,
  privacyOn,
  confirmationPending,
  onSelectEndpoint,
  onParamChange,
  onRequestConfirmation,
  onCancelConfirmation,
  onRun,
}: EndpointRunnerProps) {
  const requiresConfirmation = view.selectedEntry?.requiresConfirmation === true;

  return (
    <div className="developer-api" aria-label="本机 API 调试器">
      <section className="developer-section">
        <div className="developer-section__header">
          <div>
            <Typography variant="label" weight={700}>
              API Runner
            </Typography>
            <Typography variant="caption" color="var(--text-secondary)">
              local-sidecar allowlist · redacted preview
            </Typography>
          </div>
          {status === "loading" && <Spinner size={15} label="运行 API..." color="var(--text-muted)" />}
        </div>

        <label className="developer-field">
          <span>Endpoint</span>
          <Select
            controlSize="sm"
            value={selectedEndpointId}
            onChange={(event) => onSelectEndpoint(event.currentTarget.value)}
          >
            {view.catalogGroups.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {group.entries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.method} {entry.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </label>

        {view.requestSummary && (
          <div className="developer-request-summary">
            <ShieldCheck size={14} />
            <span>{view.requestSummary.method}</span>
            <code>{view.requestSummary.pathTemplate}</code>
            <small>{view.requestSummary.parameterKeys.join(",") || "no params"}</small>
          </div>
        )}

        {view.selectedEntry && (
          <EndpointParamForm
            entry={view.selectedEntry}
            values={endpointParams}
            privacyOn={privacyOn}
            onParamChange={onParamChange}
          />
        )}

        {view.errorCopy && (
          <Typography variant="caption" color="var(--danger)">
            {view.errorCopy}
          </Typography>
        )}

        <div className="developer-api__actions">
          {requiresConfirmation && confirmationPending && (
            <Button variant="ghost" size="sm" onClick={onCancelConfirmation} disabled={status === "loading"}>
              取消
            </Button>
          )}
          <Button
            variant={requiresConfirmation && confirmationPending ? "danger" : "secondary"}
            size="sm"
            loading={status === "loading"}
            disabled={status === "loading" || (!view.canRun && !requiresConfirmation)}
            onClick={() => {
              if (requiresConfirmation && !confirmationPending) {
                onRequestConfirmation();
                return;
              }
              onRun(requiresConfirmation);
            }}
          >
            <Play size={14} />
            {requiresConfirmation ? (confirmationPending ? "确认运行" : "需要确认") : "运行"}
          </Button>
        </div>

        <RawResponsePreview
          title="Redacted Response"
          preview={view.result?.preview ?? ""}
          emptyCopy="运行 allowlist API 后显示脱敏预览。"
        />
      </section>

      <section className="developer-section" aria-label="API 调试历史">
        <Typography variant="label" weight={700}>
          History
        </Typography>
        <div className="developer-list developer-list--compact">
          {view.history.length === 0 ? (
            <Typography variant="caption" color="var(--text-secondary)">
              暂无调试历史。
            </Typography>
          ) : (
            view.history.map((item, index) => (
              <div key={`${item.entryId}-${index}`} className="developer-history-row">
                {formatRunnerHistoryLabel(item)}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function EndpointParamForm({
  entry,
  values,
  privacyOn,
  onParamChange,
}: {
  entry: EndpointCatalogEntry;
  values: Record<string, string | number | boolean | undefined>;
  privacyOn: boolean;
  onParamChange: (name: string, value: string | number | boolean | undefined) => void;
}) {
  if (entry.params.length === 0) {
    return (
      <Typography variant="caption" color="var(--text-secondary)">
        该 endpoint 无参数。
      </Typography>
    );
  }

  return (
    <div className="developer-param-grid" aria-label="API 参数">
      {entry.params.map((param) => {
        const value = values[param.name] ?? "";
        if (param.kind === "boolean") {
          return (
            <label key={param.name} className="developer-toggle">
              <input
                type="checkbox"
                checked={value === true || value === "true"}
                onChange={(event) => onParamChange(param.name, event.currentTarget.checked)}
              />
              {param.label}
            </label>
          );
        }

        if (param.kind === "select") {
          return (
            <label key={param.name} className="developer-field">
              <span>{param.label}</span>
              <Select
                controlSize="sm"
                value={String(value)}
                onChange={(event) => onParamChange(param.name, event.currentTarget.value)}
              >
                <option value="">默认</option>
                {param.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          );
        }

        return (
          <label key={param.name} className="developer-field">
            <span>{param.label}</span>
            <Input
              controlSize="sm"
              type={param.kind === "number" ? "number" : "text"}
              value={formatEndpointParamInputValue(param, value, privacyOn)}
              disabled={shouldDisableEndpointParamInput(param, privacyOn)}
              placeholder={endpointParamPlaceholder(param, privacyOn)}
              onChange={(event) =>
                onParamChange(
                  param.name,
                  param.kind === "number"
                    ? event.currentTarget.value.trim()
                      ? Number(event.currentTarget.value)
                      : undefined
                    : event.currentTarget.value,
                )
              }
            />
          </label>
        );
      })}
    </div>
  );
}
