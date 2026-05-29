export type DashboardDensity = "comfortable" | "balanced" | "compact";

export interface DashboardLayout {
  density: DashboardDensity;
  gridTemplateColumns: string;
  searchMaxHeight: number;
  panelPadding: number;
}

export function getDashboardLayout(viewportWidth: number): DashboardLayout {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return getDashboardLayout(1080);
  }

  if (viewportWidth < 980) {
    return {
      density: "compact",
      gridTemplateColumns: "minmax(200px, 23vw) minmax(0, 1fr) minmax(200px, 22vw)",
      searchMaxHeight: 260,
      panelPadding: 8,
    };
  }

  if (viewportWidth < 1240) {
    return {
      density: "balanced",
      gridTemplateColumns: "minmax(220px, 25vw) minmax(0, 1fr) minmax(220px, 23vw)",
      searchMaxHeight: 300,
      panelPadding: 10,
    };
  }

  return {
    density: "comfortable",
    gridTemplateColumns: "minmax(240px, 280px) minmax(0, 1fr) minmax(240px, 260px)",
    searchMaxHeight: 320,
    panelPadding: 12,
  };
}
