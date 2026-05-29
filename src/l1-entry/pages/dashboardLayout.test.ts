import { describe, expect, it } from "vitest";
import { getDashboardLayout } from "./dashboardLayout";

describe("getDashboardLayout", () => {
  it("keeps all dashboard columns visible at the configured minimum window width", () => {
    const layout = getDashboardLayout(900);

    expect(layout.density).toBe("compact");
    expect(layout.gridTemplateColumns).toContain("minmax(200px");
    expect(layout.searchMaxHeight).toBeLessThan(320);
  });

  it("uses comfortable fixed bounds on wide screens", () => {
    const layout = getDashboardLayout(1440);

    expect(layout.density).toBe("comfortable");
    expect(layout.gridTemplateColumns).toBe(
      "minmax(240px, 280px) minmax(0, 1fr) minmax(240px, 260px)",
    );
  });

  it("falls back to the balanced desktop layout for invalid viewport measurements", () => {
    expect(getDashboardLayout(Number.NaN).density).toBe("balanced");
  });
});
