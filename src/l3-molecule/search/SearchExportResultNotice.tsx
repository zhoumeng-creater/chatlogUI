import type { SearchExportStreamCompletedSummary } from "@l2/commander/useSearchExportCommander";

interface SearchExportResultNoticeProps {
  result: SearchExportStreamCompletedSummary;
  onDismiss: () => void;
}

export function SearchExportResultNotice({
  result,
  onDismiss,
}: SearchExportResultNoticeProps) {
  return (
    <div className="search-export-result-notice" role="status">
      <span>
        <strong>导出完成</strong>
        {result.locationSummary}
      </span>
      <button type="button" aria-label="关闭导出完成提示" onClick={onDismiss}>
        关闭
      </button>
    </div>
  );
}
