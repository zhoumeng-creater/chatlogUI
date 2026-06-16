import type { ReactNode } from "react";
import type { SettingsCategory } from "@/l2-coordinator/api-docs/settings";
import type { SettingsMessages } from "@/l2-coordinator/commander/messages.zh-CN";
import { classNames } from "@/utils/classNames";
import { Bot, Database, Info, Palette, ShieldCheck } from "lucide-react";

const CATEGORY_ICONS: Record<SettingsCategory, ReactNode> = {
  data: <Database size={16} />,
  appearance: <Palette size={16} />,
  ai: <Bot size={16} />,
  advanced: <ShieldCheck size={16} />,
  about: <Info size={16} />,
};

const CATEGORY_ORDER: SettingsCategory[] = [
  "data",
  "appearance",
  "ai",
  "advanced",
  "about",
];

interface SettingsLayoutProps {
  children: ReactNode;
  categoryLabels: SettingsMessages["settings"]["categories"];
  activeCategory: SettingsCategory;
  onCategoryChange: (category: SettingsCategory) => void;
}

export function SettingsLayout({
  children,
  categoryLabels,
  activeCategory,
  onCategoryChange,
}: SettingsLayoutProps) {
  return (
    <div className="settings-shell">
      <nav className="settings-shell__nav" aria-label="设置分类">
        {CATEGORY_ORDER.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onCategoryChange(category)}
            aria-current={activeCategory === category ? "page" : undefined}
            className={classNames(
              "settings-category-button",
              activeCategory === category && "settings-category-button--active",
            )}
          >
            {CATEGORY_ICONS[category]}
            <span>{categoryLabels[category]}</span>
          </button>
        ))}
      </nav>

      <div className="settings-shell__content">
        {children}
      </div>
    </div>
  );
}
