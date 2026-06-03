import { Search } from "lucide-react";
import { Button, Input, Select, Spinner, Typography } from "@l4/ui";
import type { AdaptedDbSearchResponse } from "@l4/network";
import type { DeveloperToolsLoadStatus } from "@l2/data-clerk/stores/useDeveloperToolsStore";
import { formatDbSearchInputValue } from "./developerDisplay";

interface DbSearchPanelProps {
  status: DeveloperToolsLoadStatus;
  query: string;
  mode: "quick" | "deep";
  limit: number;
  privacyOn: boolean;
  results: AdaptedDbSearchResponse;
  error: string | null;
  onQueryChange: (query: string) => void;
  onModeChange: (mode: "quick" | "deep") => void;
  onLimitChange: (limit: number) => void;
  onSearch: () => void;
}

export function DbSearchPanel({
  status,
  query,
  mode,
  limit,
  privacyOn,
  results,
  error,
  onQueryChange,
  onModeChange,
  onLimitChange,
  onSearch,
}: DbSearchPanelProps) {
  return (
    <section className="developer-section" aria-label="数据库搜索">
      <div className="developer-section__header">
        <Typography variant="label" weight={700}>
          DB Search
        </Typography>
        {status === "loading" && <Spinner size={15} label="搜索数据库..." color="var(--text-muted)" />}
      </div>
      <div className="developer-form-row">
        <Input
          controlSize="sm"
          value={formatDbSearchInputValue(query, privacyOn)}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder={privacyOn ? "隐私模式已隐藏关键词" : "keyword"}
          aria-label="数据库搜索关键词"
          disabled={privacyOn}
        />
        <Select
          controlSize="sm"
          value={mode}
          onChange={(event) => onModeChange(event.currentTarget.value as "quick" | "deep")}
          aria-label="数据库搜索模式"
        >
          <option value="quick">quick</option>
          <option value="deep">deep</option>
        </Select>
        <Select
          controlSize="sm"
          value={limit}
          onChange={(event) => onLimitChange(Number(event.currentTarget.value))}
          aria-label="数据库搜索条数"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
          <option value={500}>500</option>
        </Select>
        <Button variant="secondary" size="sm" onClick={onSearch} disabled={status === "loading" || privacyOn}>
          <Search size={14} />
          搜索
        </Button>
      </div>
      {error && (
        <Typography variant="caption" color="var(--danger)">
          {error}
        </Typography>
      )}
      <div className="developer-list developer-list--compact">
        {results.items.length === 0 ? (
          <Typography variant="caption" color="var(--text-secondary)">
            输入关键词后搜索数据库。
          </Typography>
        ) : (
          results.items.slice(0, 12).map((item) => (
            <div key={item.id} className="developer-search-hit">
              <strong>{item.table || "table"}</strong>
              <span>{item.column || "column"}</span>
              <span>{item.preview || item.rowSummary || "matched row"}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
