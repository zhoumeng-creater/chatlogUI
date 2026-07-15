import { describe, expect, it } from "vitest";
import { APP_BROWSER_ROUTER_FUTURE } from "./browserRouterFuture";

describe("browser router future behavior", () => {
  it("opts into the v7 transition and splat-resolution behavior", () => {
    expect(APP_BROWSER_ROUTER_FUTURE).toEqual({
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    });
  });
});
