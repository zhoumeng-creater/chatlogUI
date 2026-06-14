import { describe, expect, it } from "vitest";
import {
  BUSINESS_EXPORT_FORMATS,
  BUSINESS_EXPORT_STATUSES,
  buildBusinessExportJob,
  createAiExportArtifact,
  createConversationExportArtifact,
  createGraphExportArtifact,
  createMediaManifestExportArtifact,
  createSearchExportArtifact,
  createSnsExportArtifact,
  createStatsExportArtifact,
  validateBusinessExportArtifact,
} from "./businessExportModel";

const generatedAt = new Date("2026-01-02T03:04:05.000Z");

describe("businessExportModel", () => {
  it("defines the shared job contract with safe filename previews and redacted privacy defaults", () => {
    expect(BUSINESS_EXPORT_FORMATS).toEqual(["markdown", "csv", "json"]);
    expect(BUSINESS_EXPORT_STATUSES).toEqual([
      "idle",
      "preparing",
      "confirming",
      "writing",
      "completed",
      "failed",
      "cancelling",
      "cancelled",
      "partial",
    ]);

    const job = buildBusinessExportJob({
      source: "search",
      format: "markdown",
      privacyOn: true,
      requestedUnredacted: false,
      rowCount: 2,
      estimatedBytes: 1200,
      scopeSummary: "当前会话 · wxid_synthetic_private · 发票",
      generatedAt,
    });

    expect(job.status).toBe("confirming");
    expect(job.redactionPolicy).toBe("redacted");
    expect(job.filenamePreview).toBe("chatlog-search-20260102-030405.md");
    expect(job.scopeSummary).toBe("当前会话 · 已隐藏私密范围");
    expect(job.filenamePreview).not.toContain("wxid_synthetic_private");
    expect(job.filenamePreview).not.toContain("发票");
  });

  it("redacts search exports by default while preserving structure, counts, and partial state", () => {
    const artifact = createSearchExportArtifact({
      format: "markdown",
      privacyOn: true,
      generatedAt,
      query: "发票 wxid_synthetic_private",
      scopeSummary: "当前会话",
      filterSummary: ["图片", "近 30 天"],
      totalCount: 3,
      loadedCount: 1,
      messages: [
        {
          id: "msg-1",
          sender: "Synthetic Sender",
          chat: "Synthetic Chat",
          content: "这里有一条私密聊天内容",
          timestamp: 1_767_254_400,
          type: "text",
        },
      ],
    });

    expect(artifact.status).toBe("partial");
    expect(artifact.rowCount).toBe(1);
    expect(artifact.content).toContain("搜索结果");
    expect(artifact.content).toContain("已加载 1 / 共 3");
    expect(artifact.content).toContain("已隐藏查询");
    expect(artifact.content).toContain("当前会话");
    expect(artifact.content).not.toContain("发票");
    expect(artifact.content).not.toContain("Synthetic Sender");
    expect(artifact.content).not.toContain("私密聊天内容");
    expect(validateBusinessExportArtifact(artifact).ok).toBe(true);
  });

  it("keeps search exports redacted by default when privacy mode is off until unredacted export is confirmed", () => {
    const artifact = createSearchExportArtifact({
      format: "markdown",
      privacyOn: false,
      requestedUnredacted: false,
      unredactedConfirmed: false,
      generatedAt,
      query: "project invoice",
      scopeSummary: "全部会话",
      filterSummary: [],
      totalCount: 1,
      loadedCount: 1,
      messages: [
        {
          id: "msg-1",
          sender: "Synthetic Sender",
          chat: "Synthetic Chat",
          content: "private invoice discussion",
          timestamp: 1_767_254_400,
          type: "text",
        },
      ],
    });

    expect(artifact.redactionPolicy).toBe("redacted");
    expect(artifact.privacyMode).toBe("redacted");
    expect(artifact.content).toContain("已隐藏查询");
    expect(artifact.content).toContain("已隐藏消息内容");
    expect(artifact.content).not.toContain("project invoice");
    expect(artifact.content).not.toContain("Synthetic Sender");
    expect(artifact.content).not.toContain("private invoice discussion");
  });

  it("serializes stats and SNS with stable CSV/Markdown fields and privacy-safe labels", () => {
    const stats = createStatsExportArtifact({
      format: "csv",
      privacyOn: true,
      generatedAt,
      scopeSummary: "当前会话",
      stats: {
        total: 42,
        sentCount: 18,
        receivedCount: 24,
        activeSenders: 2,
        activeDays: 7,
        queryRangeLabel: "近 7 天",
        topSenders: [
          { sender: "wxid_synthetic_private_sender", display: "Synthetic Sender", count: 24 },
        ],
      },
      trend: [{ date: "2026-01-02", count: 6 }],
      visibleRangeLabel: "近 7 天",
      controlSummary: "近 7 天 · 按日 · 全部成员",
      metricDefinitions: [
        { key: "total", label: "消息总数", description: "当前统计范围内的消息数量。" },
      ],
      comparison: {
        mode: "previousPeriod",
        unavailableReason: null,
        rows: [
          { key: "total", label: "消息总数", current: 42, previous: 21, deltaPercent: 100 },
        ],
      },
      warnings: ["趋势按当前返回数据本地汇总。"],
    });

    expect(stats.content.split("\n")[0]).toBe("section,label,value");
    expect(stats.content).toContain("overview,total,42");
    expect(stats.content).toContain("trend,2026-01-02,6");
    expect(stats.content).toContain("metadata,control,近 7 天 · 按日 · 全部成员");
    expect(stats.content).toContain("definition,消息总数,当前统计范围内的消息数量。");
    expect(stats.content).toContain("comparison,消息总数,+100%");
    expect(stats.warnings).toContain("趋势按当前返回数据本地汇总。");
    expect(stats.content).toContain("top_sender,已隐藏对象,24");
    expect(stats.content).not.toContain("Synthetic Sender");

    const sns = createSnsExportArtifact({
      format: "markdown",
      privacyOn: true,
      generatedAt,
      activeTab: "timeline",
      activeTabLabel: "动态",
      scopeSummary: "全部会话",
      appliedFilterSummary: ["类型 文章", "只看含媒体"],
      searchQuery: "private query",
      visibleCount: 1,
      loadedCount: 2,
      filters: {
        user: "wxid_synthetic_private",
        since: "2026-01-01",
        until: "2026-01-02",
        contentType: "article",
        mediaOnly: true,
        includeRead: false,
      },
      posts: [
        {
          id: "sns-1",
          author: "Synthetic Author",
          content: "朋友圈私密正文",
          time: "2026-01-02 08:00",
          contentType: "article",
          mediaCount: 1,
          articleUrl: "https://example.invalid/private?a=1",
        },
      ],
      notifications: [],
      selectedPost: {
        id: "sns-1",
        author: "Synthetic Author",
        content: "朋友圈私密正文",
        time: "2026-01-02 08:00",
        contentType: "article",
        mediaCount: 1,
      },
      warnings: ["文章外链不会导出原始 URL。"],
    });

    expect(sns.content).toContain("朋友圈当前视图");
    expect(sns.content).toContain("当前视图: 动态");
    expect(sns.content).toContain("已加载 2 条");
    expect(sns.content).toContain("当前可见 1 条");
    expect(sns.content).toContain("筛选: 类型 文章、只看含媒体");
    expect(sns.content).toContain("已隐藏查询");
    expect(sns.content).toContain("## 选中动态");
    expect(sns.warnings).toContain("文章外链不会导出原始 URL。");
    expect(sns.warnings).toContain("选中动态详情已脱敏；关闭隐私模式并确认未脱敏导出后才会包含原文。");
    expect(sns.content).toContain("选中动态详情已脱敏");
    expect(sns.content).toContain("类型: article");
    expect(sns.content).toContain("已隐藏作者");
    expect(sns.content).not.toContain("Synthetic Author");
    expect(sns.content).not.toContain("朋友圈私密正文");
    expect(sns.content).not.toContain("example.invalid/private");
  });

  it("warns SNS exports about loaded-only and local-only filter scope across formats", () => {
    for (const format of BUSINESS_EXPORT_FORMATS) {
      const artifact = createSnsExportArtifact({
        format,
        privacyOn: false,
        requestedUnredacted: true,
        unredactedConfirmed: true,
        generatedAt,
        activeTab: "timeline",
        activeTabLabel: "动态",
        scopeSummary: "朋友圈",
        appliedFilterSummary: ["类型 图片", "只看含媒体"],
        visibleCount: 1,
        loadedCount: 2,
        filters: {
          user: "",
          since: "",
          until: "",
          contentType: "image",
          mediaOnly: true,
          includeRead: false,
        },
        posts: [
          {
            id: "sns-1",
            author: "Synthetic Author",
            content: "Synthetic post",
            time: "2026-01-02 08:00",
            contentType: "image",
            mediaCount: 1,
          },
        ],
        notifications: [],
      });

      expect(artifact.warnings).toContain("当前只导出已加载的朋友圈记录。");
      expect(artifact.warnings).toContain("类型和仅媒体筛选只作用于已加载记录。");
      expect(artifact.content).toContain("当前只导出已加载的朋友圈记录。");
      expect(artifact.content).toContain("类型和仅媒体筛选只作用于已加载记录。");
    }
  });

  it("does not warn selected SNS detail redaction after explicit unredacted confirmation", () => {
    const artifact = createSnsExportArtifact({
      format: "json",
      privacyOn: false,
      requestedUnredacted: true,
      unredactedConfirmed: true,
      generatedAt,
      activeTab: "timeline",
      activeTabLabel: "动态",
      scopeSummary: "朋友圈",
      appliedFilterSummary: [],
      visibleCount: 1,
      loadedCount: 1,
      filters: {
        user: "",
        since: "",
        until: "",
        contentType: "all",
        mediaOnly: false,
        includeRead: false,
      },
      posts: [],
      notifications: [],
      selectedPost: {
        id: "sns-1",
        author: "Synthetic Author",
        content: "Synthetic post",
        time: "2026-01-02 08:00",
        contentType: "text",
        mediaCount: 0,
      },
    });

    expect(artifact.warnings).not.toContain("选中动态详情已脱敏；关闭隐私模式并确认未脱敏导出后才会包含原文。");
    expect(artifact.content).toContain("Synthetic post");
  });

  it("covers conversation, media manifest, AI evidence, and graph serializers without leaking raw private fields", () => {
    const conversation = createConversationExportArtifact({
      format: "json",
      privacyOn: true,
      generatedAt,
      scopeSummary: "当前会话",
      totalCount: 5,
      loadedCount: 1,
      messages: [
        {
          id: "m-1",
          sender: "Synthetic Sender",
          content: "聊天正文",
          time: "2026-01-02 08:00",
          type: "text",
        },
      ],
    });
    const conversationJson = JSON.parse(conversation.content) as {
      messages: Array<{ sender: string; content: string }>;
      partial: boolean;
    };
    expect(conversationJson.partial).toBe(true);
    expect(conversationJson.messages[0].sender).toBe("已隐藏发送者");
    expect(conversationJson.messages[0].content).toBe("已隐藏消息内容");

    const media = createMediaManifestExportArtifact({
      format: "csv",
      privacyOn: true,
      generatedAt,
      scopeSummary: "当前会话",
      attachments: [
        {
          id: "file-1",
          kind: "image",
          fileName: "C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_private\\image.jpg",
          sizeBytes: 1024,
          time: "2026-01-02",
          available: true,
        },
      ],
    });
    expect(media.content).toContain("kind,fileName,sizeBytes,time,available");
    expect(media.content).toContain("image,已隐藏文件名,1024,2026-01-02,true");
    expect(media.content).not.toContain("C:\\Users");
    expect(media.content).not.toContain("wxid_synthetic_private");

    const ai = createAiExportArtifact({
      format: "markdown",
      privacyOn: true,
      generatedAt,
      scopeSummary: "当前会话",
      question: "这个人的地址是什么",
      answer: "地址在私密聊天里",
      evidence: [
        { chat: "Synthetic Chat", time: "2026-01-02", text: "证据正文", score: 0.87 },
      ],
    });
    expect(ai.content).toContain("AI 问答与证据");
    expect(ai.content).toContain("证据数量: 1");
    expect(ai.content).not.toContain("地址在私密聊天里");
    expect(ai.content).not.toContain("证据正文");

    const graph = createGraphExportArtifact({
      format: "json",
      privacyOn: true,
      generatedAt,
      scopeSummary: "全部会话",
      nodes: [{ id: "node-1", label: "Synthetic Person", kind: "person" }],
      edges: [{ id: "edge-1", source: "node-1", target: "node-2", label: "knows" }],
    });
    expect(graph.content).toContain('"nodes"');
    expect(graph.content).toContain("已隐藏实体");
    expect(graph.content).not.toContain("Synthetic Person");
  });

  it("fails closed when export content still contains hard secrets or raw local paths", () => {
    const artifact = createSearchExportArtifact({
      format: "markdown",
      privacyOn: false,
      requestedUnredacted: true,
      unredactedConfirmed: true,
      generatedAt,
      query: "project",
      scopeSummary: "全部会话",
      filterSummary: [],
      totalCount: 1,
      loadedCount: 1,
      messages: [
        {
          id: "msg-1",
          sender: "Synthetic Sender",
          chat: "Synthetic Chat",
          content: "dataKey=synthetic-secret C:\\Users\\Synthetic\\Private",
          timestamp: 1_767_254_400,
          type: "text",
        },
      ],
    });

    const validation = validateBusinessExportArtifact(artifact);

    expect(validation.ok).toBe(false);
    expect(validation.error?.category).toBe("redaction-blocked");
  });
});
