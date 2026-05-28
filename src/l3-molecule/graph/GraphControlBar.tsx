import { useGraphCommander } from "@l2/commander/useGraphCommander";
import { AppleButton } from "@l4/ui/AppleButton";
import type { EntityKind } from "@/l2-coordinator/api-docs/graph";

const KIND_GROUPS: { label: string; kinds: EntityKind[] }[] = [
  { label: "人物", kinds: ["person"] },
  { label: "组织", kinds: ["organization", "group"] },
  { label: "主题", kinds: ["topic", "keyword", "event"] },
  { label: "项目", kinds: ["project", "product"] },
  { label: "其他", kinds: ["customer", "unknown"] },
];

const TIME_OPTIONS: { label: string; value: string }[] = [
  { label: "全部", value: "" },
  { label: "近7天", value: "7d" },
  { label: "近30天", value: "30d" },
  { label: "近90天", value: "90d" },
];

export function GraphControlBar() {
  const graph = useGraphCommander();
  const { visibleEntityKinds, timeWindow, layoutMode, autoRotate, timelineVisible } = graph;

  const toggleKind = (kind: EntityKind) => {
    if (visibleEntityKinds.includes(kind)) {
      graph.setVisibleKinds(visibleEntityKinds.filter((k) => k !== kind));
    } else {
      graph.setVisibleKinds([...visibleEntityKinds, kind]);
    }
  };

  const toggleAllKinds = () => {
    const allKinds: EntityKind[] = ["person","organization","project","product","customer","group","topic","keyword","event","unknown"];
    if (visibleEntityKinds.length === allKinds.length) {
      graph.setVisibleKinds([]);
    } else {
      graph.setVisibleKinds(allKinds);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "2px 8px",
        borderBottom: "1px solid rgba(74,158,255,0.12)",
        flexShrink: 0,
        flexWrap: "wrap",
        minHeight: 30,
      }}
    >
      <div style={{ display: "flex", gap: 2 }}>
        <button
          onClick={toggleAllKinds}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 11,
            color: "rgba(255,255,255,0.5)",
            padding: "1px 4px",
          }}
        >
          {visibleEntityKinds.length === 10 ? "全部" : "无"}
        </button>
        {KIND_GROUPS.map((group) => {
          const allActive = group.kinds.every((k) => visibleEntityKinds.includes(k));
          const partialActive = group.kinds.some((k) => visibleEntityKinds.includes(k)) && !allActive;
          return (
            <AppleButton
              key={group.label}
              variant={allActive ? "primary" : partialActive ? "secondary" : "ghost"}
              size="sm"
              onClick={() => group.kinds.forEach(toggleKind)}
              style={{ padding: "0 6px", minWidth: 36, fontSize: 11 }}
            >
              {group.label}
            </AppleButton>
          );
        })}
      </div>

      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />

      <div style={{ display: "flex", gap: 2 }}>
        {TIME_OPTIONS.map((opt) => (
          <AppleButton
            key={opt.value}
            variant={timeWindow === opt.value ? "primary" : "ghost"}
            size="sm"
            onClick={() => {
              graph.setTimeWindow(opt.value);
              graph.refreshGraph();
            }}
            style={{ padding: "0 6px", minWidth: 40, fontSize: 11 }}
          >
            {opt.label}
          </AppleButton>
        ))}
      </div>

      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />

      <div style={{ display: "flex", gap: 2 }}>
        <AppleButton
          variant={layoutMode === "force" ? "primary" : "ghost"}
          size="sm"
          onClick={() => graph.setLayoutMode("force")}
          style={{ padding: "0 6px", minWidth: 50, fontSize: 11 }}
        >
          力导向
        </AppleButton>
        <AppleButton
          variant={layoutMode === "radial" ? "primary" : "ghost"}
          size="sm"
          onClick={() => graph.setLayoutMode("radial")}
          style={{ padding: "0 6px", minWidth: 36, fontSize: 11 }}
        >
          径向
        </AppleButton>
      </div>

      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />

      <AppleButton
        variant="ghost"
        size="sm"
        onClick={graph.refreshGraph}
        style={{ padding: "0 6px", minWidth: 30, fontSize: 11 }}
      >
        {"\u{1F504}"}
      </AppleButton>

      <button
        onClick={() => graph.toggleAutoRotate()}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          color: autoRotate ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
          padding: "0 4px",
        }}
        title="自动旋转"
      >
        {"\u25EF"}
      </button>

      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />

      <AppleButton
        variant={timelineVisible ? "primary" : "ghost"}
        size="sm"
        onClick={() => graph.setTimelineVisible(!timelineVisible)}
        style={{ padding: "0 6px", minWidth: 36, fontSize: 11 }}
      >
        时间轴
      </AppleButton>
    </div>
  );
}
