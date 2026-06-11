import { describe, expect, it } from "vitest";
import advancedFixture from "../../../e2e/fixtures/advanced-capabilities.json";
import {
  adaptSnsFeedResponse,
  adaptSnsNotificationsResponse,
  adaptSnsSearchResponse,
  getSensitiveSnsArticleUrl,
  isLocalSnsProxyUrl,
  type RawSnsFeedResponse,
  type RawSnsNotificationResponse,
} from "./snsAdapters";

const routes = advancedFixture.routes as Record<string, unknown>;

describe("P4-C SNS adapters", () => {
  it("normalizes backend-shaped feed rows without exposing raw XML or external media URLs", () => {
    const feed = adaptSnsFeedResponse(routes["/api/v1/sns_feed"] as RawSnsFeedResponse);

    expect(feed.count).toBe(2);
    expect(feed.posts[0]).toMatchObject({
      id: "9001001",
      timestamp: 1767344400,
      time: "2026-01-02 09:00",
      author: {
        username: "sns_author_synthetic_001",
        displayName: "Synthetic Author Alpha",
      },
      content: "Synthetic SNS image post content",
      contentType: "image",
      mediaCount: 1,
      locationSummary: "Synthetic POI · Synthetic City",
      hasRawContent: true,
      article: {
        title: "Synthetic Article Title",
        description: "Synthetic article description",
        hasExternalUrl: true,
        externalDomain: "synthetic.invalid",
        externalScheme: "https",
      },
      finder: {
        nickname: "Synthetic Finder",
        description: "Synthetic finder feed description",
        mediaCount: 1,
        duration: "12秒",
      },
    });
    expect(feed.posts[0].media[0]).toMatchObject({
      id: "9001001-media-0",
      kind: "image",
      redactedEndpointLabel: "sns:media-proxy",
      width: 1280,
      height: 720,
    });
    expect(feed.posts[0].media[0].sensitiveSrc).toBe(
      "http://127.0.0.1:5030/api/v1/sns/media/proxy",
    );

    const serialized = JSON.stringify(feed.posts[0]);
    expect(serialized).not.toContain("<sns>");
    expect(serialized).not.toContain("raw_content");
    expect(serialized).not.toContain("/private");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("key");
  });

  it("keeps sensitive local proxy URLs non-enumerable while rejecting remote media URLs", () => {
    const raw: RawSnsFeedResponse = {
      count: 1,
      items: [
        {
          id: 1,
          timestamp: 1767344400,
          time: "2026-01-02 09:00",
          username: "sns_author_synthetic_secret",
          display: "Synthetic Secret Author",
          content: "Synthetic content",
          raw_content: "<sns>raw synthetic xml</sns>",
          content_type: "image",
          media_list: [
            {
              type: "image",
              url: "https://synthetic.invalid/private.jpg?token=sns-token",
              thumb: "https://synthetic.invalid/private-thumb.jpg?token=sns-token",
              raw_url: "https://synthetic.invalid/raw.jpg",
              raw_thumb: "https://synthetic.invalid/raw-thumb.jpg",
              token: "sns-token",
              key: "sns-secret-key",
              proxy_url:
                "http://127.0.0.1:5030/api/v1/sns/media/proxy?url=https%3A%2F%2Fsynthetic.invalid%2Fprivate.jpg&key=sns-secret-key",
              proxy_thumb_url:
                "http://localhost:5030/api/v1/sns/media/proxy?url=https%3A%2F%2Fsynthetic.invalid%2Fthumb.jpg&key=sns-secret-key",
            },
          ],
        },
      ],
    };

    const post = adaptSnsFeedResponse(raw).posts[0];

    expect(post.media[0].sensitiveSrc).toContain("/api/v1/sns/media/proxy?");
    expect(post.media[0].sensitiveThumbSrc).toContain("/api/v1/sns/media/proxy?");
    expect(Object.keys(post.media[0])).not.toContain("sensitiveSrc");
    expect(Object.keys(post.media[0])).not.toContain("sensitiveThumbSrc");
    expect(JSON.stringify(post)).not.toContain("sns-secret-key");
    expect(JSON.stringify(post)).not.toContain("synthetic.invalid");
    expect(JSON.stringify(post)).not.toContain("sns-token");
  });

  it("keeps article open URLs non-enumerable while exposing only safe domain summaries", () => {
    const post = adaptSnsFeedResponse({
      count: 1,
      items: [
        {
          id: 1,
          content_type: "article",
          article: {
            title: "Synthetic Article",
            description: "Synthetic desc",
            url: "https://article.synthetic.invalid/private/path?token=sns-token&key=sns-secret-key",
          },
        },
      ],
    }).posts[0];

    expect(post.article).toMatchObject({
      hasExternalUrl: true,
      externalDomain: "article.synthetic.invalid",
      externalScheme: "https",
    });
    expect(getSensitiveSnsArticleUrl(post.article)).toBe(
      "https://article.synthetic.invalid/private/path?token=sns-token&key=sns-secret-key",
    );
    expect(Object.keys(post.article ?? {})).not.toContain("sensitiveExternalUrl");
    const serialized = JSON.stringify(post);
    expect(serialized).toContain("article.synthetic.invalid");
    expect(serialized).not.toContain("/private/path");
    expect(serialized).not.toContain("sns-secret-key");
    expect(serialized).not.toContain("sns-token");
  });

  it("normalizes notifications and malformed rows with stable fallback labels", () => {
    const notifications = adaptSnsNotificationsResponse(
      routes["/api/v1/sns_notifications"] as RawSnsNotificationResponse,
    );

    expect(notifications.total).toBe(2);
    expect(notifications.items.map((item) => item.type)).toEqual(["like", "comment"]);
    expect(notifications.items[1]).toMatchObject({
      actor: {
        username: "sns_actor_synthetic_002",
        displayName: "Synthetic Actor Beta",
      },
      content: "Synthetic notification comment",
      feedPreview: "Synthetic second feed preview",
    });

    const malformed = adaptSnsSearchResponse({
      count: 1,
      items: [{ id: null, media_list: [{ url: "https://remote.invalid/img.jpg" }] }],
    });

    expect(malformed.posts[0]).toMatchObject({
      id: "sns-post-0",
      time: "",
      author: { username: "", displayName: "未知作者" },
      content: "",
      contentType: "unknown",
      mediaCount: 0,
    });
  });

  it("validates only local SNS proxy URLs", () => {
    expect(isLocalSnsProxyUrl("http://127.0.0.1:5030/api/v1/sns/media/proxy?url=x")).toBe(true);
    expect(isLocalSnsProxyUrl("http://localhost:5030/api/v1/sns/media/proxy?url=x")).toBe(true);
    expect(isLocalSnsProxyUrl("http://127.0.0.1:6041/api/v1/sns/media/proxy?url=x")).toBe(true);
    expect(isLocalSnsProxyUrl("https://synthetic.invalid/api/v1/sns/media/proxy?url=x")).toBe(false);
    expect(isLocalSnsProxyUrl("http://127.0.0.1:5030/api/v1/history")).toBe(false);
  });

  it("normalizes accepted localhost proxy URLs to the packaged CSP host", () => {
    const post = adaptSnsFeedResponse({
      count: 1,
      items: [
        {
          id: 1,
          content_type: "image",
          media_list: [
            {
              type: "image",
              proxy_url: "http://localhost:5030/api/v1/sns/media/proxy?url=x&key=sns-secret-key",
            },
          ],
        },
      ],
    }).posts[0];

    expect(post.media[0].sensitiveSrc).toBe(
      "http://127.0.0.1:5030/api/v1/sns/media/proxy?url=x&key=sns-secret-key",
    );
    expect(JSON.stringify(post)).not.toContain("sns-secret-key");
  });
});
