import { describe, expect, it } from "vitest";
import coreFixture from "../../../e2e/fixtures/core-ready.json";
import advancedFixture from "../../../e2e/fixtures/advanced-capabilities.json";
import {
  adaptHistoryResponse,
  adaptSearchResponse,
} from "./chatlogAdapters";
import type {
  RawGraphQueryResponse,
  RawGraphStatusResponse,
  RawGraphVisualizeResponse,
  RawHistoryResponse,
  RawSearchResponse,
  RawSemanticQAResponse,
  RawSemanticSearchResponse,
  RawSnsFeedResponse,
} from "./chatlogRawTypes";

const coreRoutes = coreFixture.routes as Record<string, unknown>;
const advancedRoutes = advancedFixture.routes as Record<string, unknown>;

describe("chatlog raw DTO contracts", () => {
  it("locks history/search snake_case sender, self, media, pagination, and time-window fields", () => {
    const rawHistory = coreRoutes["/api/v1/history"] as RawHistoryResponse;
    const rawSearch = coreRoutes["/api/v1/search"] as RawSearchResponse;

    expect(
      rawHistory.messages.every((message) =>
        Object.prototype.hasOwnProperty.call(message, "is_self"),
      ),
    ).toBe(true);
    expect(
      rawSearch.messages.every((message) =>
        Object.prototype.hasOwnProperty.call(message, "is_self"),
      ),
    ).toBe(true);
    expect(rawHistory).toMatchObject({
      total_count: expect.any(Number),
      count: expect.any(Number),
      limit: expect.any(Number),
      offset: expect.any(Number),
      query_since: expect.any(Number),
      query_until: expect.any(Number),
    });

    const adaptedHistory = adaptHistoryResponse(rawHistory);
    const adaptedSearch = adaptSearchResponse(rawSearch);

    expect(adaptedHistory.messages.map((message) => message.isSelf)).toEqual([false, true, false]);
    expect(adaptedSearch.messages[0]).toMatchObject({
      isSelf: false,
      sender: "contact_synthetic_001",
    });
    expect(adaptedHistory.messages[1].attachments[0]).toMatchObject({
      kind: "image",
      resourceKey: "media_synthetic_image_key",
    });
  });

  it("exports semantic raw DTOs for search and QA evidence", () => {
    const semanticSearch =
      coreRoutes["/api/v1/semantic/search"] as RawSemanticSearchResponse;
    const semanticQa =
      coreRoutes["/api/v1/semantic/qa/stream"] as RawSemanticQAResponse;

    expect(semanticSearch.results[0]).toMatchObject({
      talker: "session_synthetic_001",
      sender: "contact_synthetic_001",
      score: expect.any(Number),
      seq: expect.any(Number),
    });
    expect(semanticQa.events[semanticQa.events.length - 1]?.data).toMatchObject({
      evidence: expect.arrayContaining([
        expect.objectContaining({
          source: "synthetic-source",
          chunk_type: "message",
          score: expect.any(Number),
        }),
      ]),
      debug: expect.objectContaining({
        entity_candidates: expect.any(Array),
      }),
    });
  });

  it("exports graph raw DTOs for status, visualize, and query evidence", () => {
    const graphStatus = advancedRoutes["/api/v1/graph/status"] as RawGraphStatusResponse;
    const graphVisualize =
      advancedRoutes["/api/v1/graph/visualize"] as RawGraphVisualizeResponse;
    const graphQuery = advancedRoutes["/api/v1/graph/query"] as RawGraphQueryResponse;

    expect(graphStatus).toMatchObject({
      history_queued: expect.any(Boolean),
      entity_count: expect.any(Number),
      relation_count: expect.any(Number),
    });
    expect(graphVisualize.timeline?.[0]).toMatchObject({
      time: expect.any(Number),
      source: "synthetic",
    });
    expect(graphQuery.relations?.[0]).toMatchObject({
      evidence_count: expect.any(Number),
      valid_from: expect.any(Number),
      verified: expect.any(String),
    });
  });

  it("exports SNS raw DTOs with optional/malformed edge-safe media fields", () => {
    const snsFeed = advancedRoutes["/api/v1/sns_feed"] as RawSnsFeedResponse;

    expect(snsFeed.items?.[0]).toMatchObject({
      raw_content: expect.any(String),
      media_list: expect.arrayContaining([
        expect.objectContaining({
          proxy_url: expect.any(String),
          resolved_url: expect.any(String),
        }),
      ]),
    });
  });
});
