import { describe, expect, it } from "vitest";
import routeSource from "./index.tsx?raw";

describe("search route loading", () => {
  it("keeps the search page behind a lazy route boundary", () => {
    expect(routeSource).not.toContain('import { SearchView } from "@l1/pages/SearchView"');
    expect(routeSource).toContain('import("@l1/pages/SearchView")');
    expect(routeSource).toContain("<Suspense");
    expect(routeSource).toContain("<LazySearchView />");
  });
});
