import { RefreshCw } from "lucide-react";
import { Button, Spinner, Typography } from "@l4/ui";
import type { AdaptedFavoriteItem } from "@l4/network/chatExtensionsAdapters";
import type { FavoriteFilters } from "@l2/data-clerk/stores/useFavoritesStore";
import type { LoadStatus } from "@l2/data-clerk/stores/useChatStore";
import {
  formatFavoriteOrigin,
  formatFavoritePreview,
  getFavoriteEmptyMessage,
} from "./favoritesDisplay";

interface MediaLibraryProps {
  status: LoadStatus;
  error: string | null;
  filters: FavoriteFilters;
  count: number;
  items: AdaptedFavoriteItem[];
  selectedFavoriteId: string | null;
  selectedFavorite: AdaptedFavoriteItem | null;
  privacyOn: boolean;
  onRefresh: () => void;
  onQueryChange: (query: string) => void;
  onTypeChange: (type: string) => void;
  onSelectFavorite: (id: string) => void;
}

export function MediaLibrary({
  status,
  error,
  filters,
  count,
  items,
  selectedFavoriteId,
  selectedFavorite,
  privacyOn,
  onRefresh,
  onQueryChange,
  onTypeChange,
  onSelectFavorite,
}: MediaLibraryProps) {
  return (
    <section className="media-library" aria-busy={status === "loading"}>
      <header className="media-library__header">
        <div>
          <Typography variant="label" weight={700}>
            媒体与收藏
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {count > 0 ? `${count.toLocaleString()} 条收藏` : "本地收藏与已加载媒体"}
          </Typography>
        </div>
        <Button
          variant="secondary"
          size="sm"
          loading={status === "loading"}
          onClick={onRefresh}
        >
          <RefreshCw size={14} />
          刷新
        </Button>
      </header>

      <div className="media-library__filters">
        <input
          className="media-library__input"
          value={filters.query}
          placeholder="筛选收藏"
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <select
          className="media-library__select"
          value={filters.favType}
          onChange={(event) => onTypeChange(event.target.value)}
          aria-label="收藏类型"
        >
          <option value="">全部类型</option>
          <option value="text">文本</option>
          <option value="image">图片</option>
          <option value="video">视频</option>
          <option value="voice">语音</option>
          <option value="file">文件</option>
        </select>
      </div>

      {status === "loading" && items.length === 0 ? (
        <div className="workbench-empty-state">
          <Spinner size={24} label="加载收藏..." />
        </div>
      ) : status === "error" ? (
        <div className="workbench-error-state" role="alert">
          <Typography variant="label" weight={700}>
            收藏加载失败
          </Typography>
          <Typography variant="body" color="var(--text-secondary)">
            {error ?? "无法读取收藏列表。"}
          </Typography>
          <Button variant="secondary" size="sm" onClick={onRefresh}>
            重试
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="workbench-empty-state">
          <Typography variant="label" weight={700}>
            {getFavoriteEmptyMessage(filters.query)}
          </Typography>
        </div>
      ) : (
        <div className="media-library__grid">
          <div className="media-library__list" role="list" aria-label="收藏列表">
            {items.map((item) => (
              <FavoriteRow
                key={item.id}
                item={item}
                selected={item.id === selectedFavoriteId}
                privacyOn={privacyOn}
                onSelectFavorite={onSelectFavorite}
              />
            ))}
          </div>
          <FavoriteDetail item={selectedFavorite ?? items[0]} privacyOn={privacyOn} />
        </div>
      )}
    </section>
  );
}

function FavoriteRow({
  item,
  selected,
  privacyOn,
  onSelectFavorite,
}: {
  item: AdaptedFavoriteItem;
  selected: boolean;
  privacyOn: boolean;
  onSelectFavorite: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`favorite-row${selected ? " favorite-row--selected" : ""}`}
      onClick={() => onSelectFavorite(item.id)}
    >
      <span className="favorite-row__type">{item.kindLabel}</span>
      <span className="favorite-row__preview">{formatFavoritePreview(item, privacyOn)}</span>
      <span className="favorite-row__meta">{item.time || "未知时间"}</span>
    </button>
  );
}

function FavoriteDetail({
  item,
  privacyOn,
}: {
  item: AdaptedFavoriteItem;
  privacyOn: boolean;
}) {
  return (
    <aside className="favorite-detail" aria-label="收藏详情">
      <Typography variant="label" weight={700}>
        {item.kindLabel}
      </Typography>
      <Typography variant="body" color="var(--text-primary)">
        {formatFavoritePreview(item, privacyOn)}
      </Typography>
      <Typography variant="caption" color="var(--text-secondary)">
        {formatFavoriteOrigin(item, privacyOn)}
      </Typography>
      <Typography variant="caption" color="var(--text-muted)">
        {item.time || "未知时间"}
      </Typography>
    </aside>
  );
}
