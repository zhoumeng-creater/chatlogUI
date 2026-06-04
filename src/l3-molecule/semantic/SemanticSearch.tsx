import { useEffect, useState } from "react";
import { Button, Input, Select, Spinner, Typography } from "@l4/ui";
import { classNames } from "@/utils/classNames";
import type {
  SemanticDiscoveryScope,
  SemanticSearchControlOverrides,
} from "@/l2-coordinator/commander/semanticDiscoveryRequestModel";
import type {
  SemanticDiscoverySearchRowView,
  SemanticDiscoveryView,
} from "@/l2-coordinator/commander/semanticDiscoveryViewModel";

interface SemanticSearchProps {
  view: SemanticDiscoveryView["search"];
  query: string;
  scope: SemanticDiscoveryScope;
  window: string;
  depth: string;
  sourceLimit: number;
  rerank: boolean;
  onSearch: (
    query: string,
    scope?: SemanticDiscoveryScope,
    overrides?: SemanticSearchControlOverrides,
  ) => void;
  onScopeChange: (scope: SemanticDiscoveryScope) => void;
  onWindowChange: (window: string) => void;
  onDepthChange: (depth: string) => void;
  onSourceLimitChange: (limit: number) => void;
  onRerankChange: (enabled: boolean) => void;
  onSelectResult: (result: SemanticDiscoverySearchRowView) => void;
  onRetry?: () => void;
}

const WINDOW_OPTIONS = [
  { value: "today", label: "今天" },
  { value: "yesterday", label: "昨天" },
  { value: "7d", label: "7 天" },
  { value: "30d", label: "30 天" },
  { value: "90d", label: "90 天" },
  { value: "1y", label: "1 年" },
  { value: "all", label: "全部" },
];

const DEPTH_OPTIONS = [
  { value: "standard", label: "标准" },
  { value: "deep", label: "深入" },
  { value: "wide", label: "广泛" },
];

export function SemanticSearch({
  view,
  query,
  scope,
  window,
  depth,
  sourceLimit,
  rerank,
  onSearch,
  onScopeChange,
  onWindowChange,
  onDepthChange,
  onSourceLimitChange,
  onRerankChange,
  onSelectResult,
  onRetry,
}: SemanticSearchProps) {
  const [draftQuery, setDraftQuery] = useState(query);
  const exampleQueries = [
    "上个月和老板讨论了什么",
    "关于预算的会议记录",
    "谁提到了项目上线时间",
  ];

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  return (
    <div className="semantic-search">
      <div className="semantic-search__header">
        <Input
          aria-label="语义搜索"
          placeholder="用自然语言搜索聊天记录..."
          value={draftQuery}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setDraftQuery(nextQuery);
            onSearch(nextQuery, scope);
          }}
        />
        <div className="semantic-search__controls">
          <label className="semantic-search__field">
            <span>范围</span>
            <Select
              controlSize="sm"
              value={scope}
              onChange={(event) => {
                const nextScope = event.currentTarget.value as SemanticDiscoveryScope;
                onScopeChange(nextScope);
                if (draftQuery.trim()) onSearch(draftQuery, nextScope);
              }}
            >
              <option value="contact">当前会话</option>
              <option value="selected">最近会话</option>
              <option value="all">全部会话</option>
            </Select>
          </label>
          <label className="semantic-search__field">
            <span>窗口</span>
            <Select
              controlSize="sm"
              value={window}
              onChange={(event) => {
                const nextWindow = event.currentTarget.value;
                onWindowChange(nextWindow);
                if (draftQuery.trim()) onSearch(draftQuery, scope, { window: nextWindow });
              }}
            >
              {WINDOW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="semantic-search__field">
            <span>深度</span>
            <Select
              controlSize="sm"
              value={depth}
              onChange={(event) => {
                const nextDepth = event.currentTarget.value;
                onDepthChange(nextDepth);
                if (draftQuery.trim()) onSearch(draftQuery, scope, { depth: nextDepth });
              }}
            >
              {DEPTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="semantic-search__field">
            <span>候选</span>
            <Select
              controlSize="sm"
              value={String(sourceLimit)}
              onChange={(event) => {
                const nextSourceLimit = Number(event.currentTarget.value);
                onSourceLimitChange(nextSourceLimit);
                if (draftQuery.trim()) onSearch(draftQuery, scope, { sourceLimit: nextSourceLimit });
              }}
            >
              {[10, 25, 50, 100].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>
          <label className="semantic-search__toggle">
            <input
              type="checkbox"
              checked={rerank}
              onChange={(event) => {
                const nextRerank = event.currentTarget.checked;
                onRerankChange(nextRerank);
                if (draftQuery.trim()) onSearch(draftQuery, scope, { rerank: nextRerank });
              }}
            />
            重排
          </label>
        </div>
      </div>

      <div className="semantic-search__body">
        {view.status === "loading" && (
          <div className="semantic-search__loading">
            <Spinner size={20} />
          </div>
        )}

        {!draftQuery && view.status === "idle" && (
          <div className="semantic-search__examples">
            <Typography variant="caption" color="var(--color-text-tertiary)" className="semantic-search__caption">
              示例查询
            </Typography>
            {exampleQueries.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setDraftQuery(example);
                  onSearch(example, scope);
                }}
                className="semantic-search__example"
              >
                {example}
              </button>
            ))}
          </div>
        )}

        {view.status === "error" && (
          <div className="semantic-search__error" role="alert">
            <Typography variant="body" color="var(--danger)" className="semantic-search__caption">
              {view.error}
            </Typography>
            {onRetry && (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                重试
              </Button>
            )}
          </div>
        )}

        {draftQuery && view.status === "empty" && (
          <div className="semantic-search__empty">
            <Typography variant="body" color="var(--text-secondary)">
              没有找到语义匹配结果。可以放宽时间窗口、切换范围或减少重排限制。
            </Typography>
            {view.rerankError && (
              <Typography variant="caption" color="var(--danger)">
                重排失败：{view.rerankError}
              </Typography>
            )}
          </div>
        )}

        {view.rows.length > 0 && (
          <div className="semantic-search__results">
            <Typography variant="caption" color="var(--color-text-secondary)" className="semantic-search__caption">
              {view.summary}
            </Typography>
            {view.rerankError && (
              <Typography variant="caption" color="var(--danger)" className="semantic-search__caption">
                重排失败：{view.rerankError}
              </Typography>
            )}
            {view.rows.map((row) => (
              <button
                key={`${row.chat}-${row.localId}`}
                type="button"
                onClick={() => onSelectResult(row)}
                className={classNames("semantic-search__row", "semantic-search__row--clickable")}
              >
                <span className="semantic-search__row-head">
                  <Typography variant="caption" weight={600}>
                    {row.chatLabel} · {row.senderLabel}
                  </Typography>
                  <Typography variant="caption" color="var(--color-text-quaternary)">
                    {row.time}
                  </Typography>
                </span>
                <Typography variant="caption" color="var(--color-text-secondary)" className="semantic-search__snippet">
                  {row.contentPreview.length > 100 ? `${row.contentPreview.slice(0, 100)}...` : row.contentPreview}
                </Typography>
                <span className="semantic-search__score">
                  <progress
                    className="semantic-search__score-meter"
                    value={Number(row.scoreLabel.replace("%", ""))}
                    max={100}
                    aria-label={`相关度 ${row.scoreLabel}`}
                  />
                  <Typography variant="caption" color="var(--color-text-quaternary)">
                    {row.scoreLabel}
                  </Typography>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
