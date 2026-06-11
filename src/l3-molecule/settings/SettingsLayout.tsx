import type { ReactNode } from "react";
import type { SettingsCategory } from "@/l2-coordinator/api-docs/settings";
import { classNames } from "@/utils/classNames";
import { Bot, Database, Info, Palette, ShieldCheck } from "lucide-react";

const CATEGORIES: { key: SettingsCategory; label: string; icon: ReactNode }[] = [
  { key: "data", label: "数据与服务", icon: <Database size={16} /> },
  { key: "appearance", label: "外观", icon: <Palette size={16} /> },
  { key: "ai", label: "AI 与语义", icon: <Bot size={16} /> },
  { key: "advanced", label: "隐私与诊断", icon: <ShieldCheck size={16} /> },
  { key: "about", label: "关于与更新", icon: <Info size={16} /> },
];

interface SettingsLayoutProps {
  children: ReactNode;
  activeCategory: SettingsCategory;
  onCategoryChange: (category: SettingsCategory) => void;
}

export function SettingsLayout({ children, activeCategory, onCategoryChange }: SettingsLayoutProps) {
  return (
    <div className="settings-shell">
      <nav className="settings-shell__nav" aria-label="设置分类">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => onCategoryChange(cat.key)}
            aria-current={activeCategory === cat.key ? "page" : undefined}
            className={classNames(
              "settings-category-button",
              activeCategory === cat.key && "settings-category-button--active",
            )}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </nav>

      <div className="settings-shell__content">
        {children}
      </div>
    </div>
  );
}
