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
        endpointFamily: "all",
        failedOnly: false,
        timeRange: "all",
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
    useDiagnosticEventStore.getState().setFilters({ source: "ux" });
    useDiagnosticEventStore.getState().setFilters({ level: "warn" });

    expect(useDiagnosticEventStore.getState().filters).toEqual({
      source: "ux",
      level: "warn",
      privacy: "all",
      endpointFamily: "all",
      failedOnly: false,
      timeRange: "all",
    });
  });

  it("updates endpoint, failed-only, and time-range filters without resetting earlier choices", () => {
    useDiagnosticEventStore.getState().setFilters({ source: "http" });
    useDiagnosticEventStore.getState().setFilters({
      endpointFamily: "semantic",
      failedOnly: true,
      timeRange: "last15m",
    });

    expect(useDiagnosticEventStore.getState().filters).toEqual({
      source: "http",
      level: "all",
      privacy: "all",
      endpointFamily: "semantic",
      failedOnly: true,
      timeRange: "last15m",
    });

    useDiagnosticEventStore.getState().clear();

    expect(useDiagnosticEventStore.getState().filters).toEqual({
      source: "http",
      level: "all",
      privacy: "all",
      endpointFamily: "semantic",
      failedOnly: true,
      timeRange: "last15m",
    });
  });
});
