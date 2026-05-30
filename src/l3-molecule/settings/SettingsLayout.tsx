import type { ReactNode } from "react";
import type { SettingsCategory } from "@/l2-coordinator/api-docs/settings";
import { Bot, Database, Info, Palette } from "lucide-react";
import { useSettingsCommander } from "@l2/commander/useSettingsCommander";

const CATEGORIES: { key: SettingsCategory; label: string; icon: ReactNode }[] = [
  { key: "data", label: "数据", icon: <Database size={16} /> },
  { key: "appearance", label: "外观", icon: <Palette size={16} /> },
  { key: "ai", label: "AI 模型", icon: <Bot size={16} /> },
  { key: "about", label: "关于", icon: <Info size={16} /> },
];

interface SettingsLayoutProps {
  children: ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const { activeCategory, setActiveCategory } = useSettingsCommander();

  return (
    <div className="settings-shell">
      <nav className="settings-shell__nav" aria-label="设置分类">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveCategory(cat.key)}
            className={[
              "settings-category-button",
              activeCategory === cat.key ? "settings-category-button--active" : "",
            ].filter(Boolean).join(" ")}
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
