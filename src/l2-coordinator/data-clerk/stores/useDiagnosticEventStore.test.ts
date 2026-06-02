import { beforeEach, describe, expect, it } from "vitest";
import type { DiagnosticEvent } from "@l4/network/diagnosticEvents";
import { useDiagnosticEventStore } from "./useDiagnosticEventStore";

function makeEvent(id: string): DiagnosticEvent {
  return {
    id,
    timestamp: "2026-06-01T00:00:00.000Z",
    source: "http",
    level: "info",
    privacy: "safe",
    category: "http.request",
    summary: `event ${id}`,
  };
}

describe("useDiagnosticEventStore", () => {
  beforeEach(() => {
    useDiagnosticEventStore.setState({
      items: [],
      filters: {
        source: "all",
        level: "all",
        privacy: "all",
      },
    });
  });

  it("stores diagnostic events and clears them explicitly", () => {
    useDiagnosticEventStore.getState().addEvent(makeEvent("a"));
    useDiagnosticEventStore.getState().addEvents([makeEvent("b"), makeEvent("c")]);

    expect(useDiagnosticEventStore.getState().items.map((event) => event.id)).toEqual([
      "a",
      "b",
      "c",
    ]);

    useDiagnosticEventStore.getState().clear();
    expect(useDiagnosticEventStore.getState().items).toEqual([]);
  });

  it("updates filters without dropping existing filter fields", () => {
    useDiagnosticEventStore.getState().setFilters({ source: "http" });
    useDiagnosticEventStore.getState().setFilters({ level: "warn" });

    expect(useDiagnosticEventStore.getState().filters).toEqual({
      source: "http",
      level: "warn",
      privacy: "all",
    });
  });
});
