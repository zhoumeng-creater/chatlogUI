import type { ReactNode } from "react";
import { Typography } from "@l4/ui";
import { classNames } from "@/utils/classNames";

interface SetupChoiceCardProps {
  active: boolean;
  heading: string;
  description: ReactNode;
  onClick: () => void;
}

export function SetupChoiceCard({
  active,
  heading,
  description,
  onClick,
}: SetupChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={classNames("setup-choice-card", active && "setup-choice-card--active")}
    >
      <Typography variant="label" weight={700}>
        {heading}
      </Typography>
      <Typography variant="caption" color="var(--text-secondary)">
        {description}
      </Typography>
    </button>
  );
}
