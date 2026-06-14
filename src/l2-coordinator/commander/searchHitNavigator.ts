export interface SearchHitLike {
  id: string;
}

export interface SearchHitNavigatorState {
  activeIndex: number;
  total: number;
  label: string;
  previousId: string | null;
  nextId: string | null;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function resolveSearchHitNavigator({
  messages,
  activeResultId,
}: {
  messages: SearchHitLike[];
  activeResultId: string | null;
}): SearchHitNavigatorState {
  const total = messages.length;
  const fallbackIndex = total > 0 ? 0 : -1;
  const activeIndex = Math.max(
    fallbackIndex,
    messages.findIndex((message) => message.id === activeResultId),
  );
  const previousId = activeIndex > 0 ? messages[activeIndex - 1]?.id ?? null : null;
  const nextId = activeIndex >= 0 && activeIndex < total - 1 ? messages[activeIndex + 1]?.id ?? null : null;

  return {
    activeIndex,
    total,
    label: total > 0 && activeIndex >= 0 ? `第 ${activeIndex + 1} / ${total} 条` : "没有命中",
    previousId,
    nextId,
    hasPrevious: Boolean(previousId),
    hasNext: Boolean(nextId),
  };
}

export function moveSearchHit({
  messages,
  activeResultId,
  direction,
}: {
  messages: SearchHitLike[];
  activeResultId: string | null;
  direction: "previous" | "next" | "first" | "last";
}): string | null {
  if (messages.length === 0) return null;
  const currentIndex = messages.findIndex((message) => message.id === activeResultId);
  const index = currentIndex >= 0 ? currentIndex : -1;
  if (direction === "first") return messages[0]?.id ?? null;
  if (direction === "last") return messages[messages.length - 1]?.id ?? null;
  if (direction === "previous") return messages[Math.max(0, index - 1)]?.id ?? null;
  return messages[Math.min(messages.length - 1, index + 1)]?.id ?? null;
}
