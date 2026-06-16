import { Button, Typography } from "@l4/ui";

interface SearchHitNavigatorProps {
  label: string;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function SearchHitNavigator({
  label,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: SearchHitNavigatorProps) {
  return (
    <div className="search-hit-navigator" aria-label="搜索命中导航">
      <Button variant="ghost" size="md" disabled={!hasPrevious} onClick={onPrevious}>
        上一条命中
      </Button>
      <Typography variant="caption" color="var(--text-secondary)">
        {label}
      </Typography>
      <Button variant="ghost" size="md" disabled={!hasNext} onClick={onNext}>
        下一条命中
      </Button>
    </div>
  );
}
