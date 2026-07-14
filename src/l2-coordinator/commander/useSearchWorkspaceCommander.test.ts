import { describe, expect, it } from "vitest";
import { buildSearchEmptyStateReadiness } from "./useSearchWorkspaceCommander";

describe("buildSearchEmptyStateReadiness", () => {
  it("uses real HTTP and database readiness instead of a hard-coded ready state", () => {
    expect(buildSearchEmptyStateReadiness(true, { httpReady: false, dbReady: true })).toEqual({
      serviceConfigured: true,
      httpReady: false,
      dbReady: true,
      hasCurrentConversation: true,
    });
    expect(buildSearchEmptyStateReadiness(false, { httpReady: true, dbReady: false })).toEqual({
      serviceConfigured: true,
      httpReady: true,
      dbReady: false,
      hasCurrentConversation: false,
    });
  });
});
