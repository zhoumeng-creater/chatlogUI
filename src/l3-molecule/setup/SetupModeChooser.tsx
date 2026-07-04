import type { SetupMode, SetupPathId } from "@l2/data-clerk/types/setup";
import { Typography } from "@l4/ui";
import { SetupChoiceCard } from "./SetupChoiceCard";

interface SetupModeChoiceOption {
  id: SetupPathId;
  label: string;
  description: string;
  selected?: boolean;
}

interface SetupModeChooserProps {
  mode?: SetupMode;
  onChooseMode?: (mode: SetupMode) => void;
  activePath?: SetupPathId;
  pathOptions?: SetupModeChoiceOption[];
  onChoosePath?: (path: SetupPathId) => void;
}

const DEFAULT_OPTIONS: SetupModeChoiceOption[] = [
  {
    id: "recommended-import",
    label: "推荐自动导入",
    description: "选择微信数据目录，由应用读取本机配置并管理服务。",
  },
  {
    id: "external-service",
    label: "连接已有服务",
    description: "连接已经运行的本机聊天服务。",
  },
  {
    id: "manual-advanced",
    label: "高级手动配置",
    description: "排障或迁移时手动填写服务配置。",
  },
];

export function SetupModeChooser({
  mode,
  onChooseMode,
  activePath,
  pathOptions,
  onChoosePath,
}: SetupModeChooserProps) {
  const selectedPath = activePath ?? (mode === "external" ? "external-service" : "recommended-import");
  const options = (pathOptions?.length ? pathOptions : DEFAULT_OPTIONS).map((option) => ({
    ...option,
    selected: option.selected ?? option.id === selectedPath,
  }));

  function handleChoose(path: SetupPathId) {
    if (onChoosePath) {
      onChoosePath(path);
      return;
    }

    onChooseMode?.(path === "external-service" ? "external" : "managed");
  }

  return (
    <div className="setup-mode-chooser">
      <Typography variant="h2">选择设置路径</Typography>
      <div className="setup-choice-list">
        {options.map((option) => (
          <SetupChoiceCard
            key={option.id}
            active={Boolean(option.selected)}
            heading={option.label}
            description={option.description}
            onClick={() => handleChoose(option.id)}
          />
        ))}
      </div>
    </div>
  );
}
