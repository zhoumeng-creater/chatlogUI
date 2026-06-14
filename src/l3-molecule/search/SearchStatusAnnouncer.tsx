import type { SearchStatus } from "@l2/data-clerk/stores/useSearchStore";
import { StatusAnnouncer } from "@l3/common/StatusAnnouncer";

interface SearchStatusAnnouncerProps {
  status: SearchStatus;
  loading: boolean;
  totalCount: number;
  loadedCount: number;
  query: string;
}

export function SearchStatusAnnouncer({
  status,
  loading,
  totalCount,
  loadedCount,
}: SearchStatusAnnouncerProps) {
  return (
    <StatusAnnouncer
      message={getSearchStatusText({ status, loading, totalCount, loadedCount })}
      privacySafeMessage={getSearchStatusText({ status, loading, totalCount, loadedCount })}
    />
  );
}

function getSearchStatusText({
  status,
  loading,
  totalCount,
  loadedCount,
}: Omit<SearchStatusAnnouncerProps, "query">): string {
  if (loading || status === "loading") return "正在搜索聊天记录";
  if (status === "ready") return `已加载 ${loadedCount} / 共 ${totalCount} 条搜索结果`;
  if (status === "empty") return "没有找到搜索结果";
  if (status === "cancelled") return "搜索已取消";
  if (status === "error") return "搜索失败";
  if (status === "invalid") return "请输入搜索关键词";
  return "搜索待开始";
}
