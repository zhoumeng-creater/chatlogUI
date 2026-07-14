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
  createSearchExportStreamEncoder,
  createSnsExportArtifact,
  createStatsExportArtifact,
  validateBusinessExportArtifact,
} from "./businessExportModel";

const generatedAt = new Date("2026-01-02T03:04:05.000Z");

describe("businessExportModel", () => {
  it("serializes bounded search chunks into one valid privacy-safe JSON document", () => {
    const encoder = createSearchExportStreamEncoder({
      format: "json",
      privacyOn: true,
      requestedUnredacted: false,
      unredactedConfirmed: false,
      generatedAt,
      snapshotId: "snapshot-safe",
      dataRevision: "revision-safe",
      revisionState: "stale",
      query: "PRIVATE QUERY",
      scopeSummary: "PRIVATE CHAT",
      filterSummary: ["PRIVATE SENDER"],
      exportScope: "partial",
      exportedCount: 2,
      totalCount: 9,
      ranges: [
        { start: 0, end: 1 },
        { start: 8, end: 9 },
      ],
      gaps: [{ start: 1, end: 8 }],
      browseMode: "manual",
      sortMode: "newest",
      groupingMode: "conversation",
      timeZone: "Asia/Shanghai",
      utcOffsetMinutes: 480,
      querySince: 1_767_290_400,
      queryUntil: 1_767_376_799,
    });
    const content = [
      encoder.start(),
      encoder.append([streamRow(0, "PRIVATE GROUP A")]),
      encoder.append([streamRow(8, "PRIVATE GROUP B")]),
      encoder.finish(),
    ].join("");
    const parsed = JSON.parse(content) as {
      metadata: {
        partial: boolean;
        exportedCount: number;
        ranges: Array<{ start: number; end: number }>;
        gaps: Array<{ start: number; end: number }>;
        timeZone: string;
        utcOffsetMinutes: number;
        querySince: number;
        queryUntil: number;
        revisionState: string;
        snapshotId: string;
        dataRevision: string;
      };
      messages: Array<{
        sourceIndex: number;
        groupKey: string;
        groupLabel: string;
        content: string;
      }>;
    };

    expect(parsed.metadata).toMatchObject({
      partial: true,
      exportedCount: 2,
      ranges: [
        { start: 0, end: 1 },
        { start: 8, end: 9 },
      ],
      gaps: [{ start: 1, end: 8 }],
      timeZone: "Asia/Shanghai",
      utcOffsetMinutes: 480,
      querySince: 1_767_290_400,
      queryUntil: 1_767_376_799,
      revisionState: "stale",
      snapshotId: "snapshot-safe",
      dataRevision: "revision-safe",
    });
    expect(parsed.messages.map((row) => row.sourceIndex)).toEqual([0, 8]);
    expect(parsed.messages.map((row) => row.groupLabel)).toEqual(["分组 1", "分组 2"]);
    expect(content).not.toContain("PRIVATE");
  });

  it("keeps CSV headers singular and preserves explicit group columns across chunks", () => {
    const encoder = createSearchExportStreamEncoder({
      format: "csv",
      privacyOn: false,
      requestedUnredacted: true,
      unredactedConfirmed: true,
      generatedAt,
      snapshotId: "snapshot-safe",
      dataRevision: "revision-safe",
      revisionState: "current",
      query: "needle",
      scopeSummary: "全部会话",
      filterSummary: [],
      exportScope: "all",
      exportedCount: 2,
      totalCount: 2,
      ranges: [{ start: 0, end: 2 }],
      gaps: [],
      browseMode: "manual",
      sortMode: "baseline",
      groupingMode: "none",
      timeZone: "UTC",
      utcOffsetMinutes: 0,
      querySince: null,
      queryUntil: null,
    });
    const content = [
      encoder.start(),
      encoder.append([streamRow(0, null)]),
      encoder.append([streamRow(1, null)]),
      encoder.finish(),
    ].join("");

    expect(
      content.match(
        /recordType,sourceIndex,time,chat,sender,type,groupKey,groupLabel,content,metadata/g,
      ),
    ).toHaveLength(1);
    expect(content).toContain("metadata,,,,,,,,,");
    expect(content).toContain('""partial"":false');
    expect(content).toContain(
      "message,0,2026-01-02T03:04:05.000Z,Synthetic Chat,Synthetic Sender,text,,,Synthetic content 0,",
    );
    expect(content).toContain(
      "message,1,2026-01-02T03:04:05.000Z,Synthetic Chat,Synthetic Sender,text,,,Synthetic content 1,",
    );
  });

  it("emits Markdown group headings only when the frozen presentation group changes", () => {
    const encoder = createSearchExportStreamEncoder({
      format: "markdown",
      privacyOn: false,
      requestedUnredacted: true,
      unredactedConfirmed: true,
      generatedAt,
      snapshotId: "snapshot-safe",
      dataRevision: "revision-safe",
      revisionState: "current",
      query: "needle",
      scopeSummary: "全部会话",
      filterSummary: [],
      exportScope: "partial",
      exportedCount: 3,
      totalCount: 3,
      ranges: [{ start: 0, end: 3 }],
      gaps: [],
      browseMode: "infinite",
      sortMode: "oldest",
      groupingMode: "conversation",
      timeZone: "UTC",
      utcOffsetMinutes: 0,
      querySince: 1_767_225_600,
      queryUntil: 1_767_311_999,
    });
    const content = [
      encoder.start(),
      encoder.append([streamRow(0, "Group A")]),
      encoder.append([streamRow(1, "Group A"), streamRow(2, "Group B")]),
      encoder.finish(),
    ].join("");

    expect(content.match(/## Group A/g)).toHaveLength(1);
    expect(content.match(/## Group B/g)).toHaveLength(1);
    expect(content).toContain("部分导出: 是");
    expect(content).toContain("数据版本状态: 当前");
    expect(content).toContain("查询时间边界: 1767225600 – 1767311999");
    expect(content).toContain("来源位置");
    expect(content).toContain("时区: UTC\nUTC 偏移（分钟）: 0\n查询时间边界: 1767225600 – 1767311999\n\n## Group A");
    expect(content).toContain("Synthetic content 1 |\n\n## Group B");
  });

  it("keeps streamed search content redacted until unredacted export is explicitly confirmed", () => {
    const encoder = createSearchExportStreamEncoder({
      format: "json",
      privacyOn: false,
      requestedUnredacted: false,
      unredactedConfirmed: false,
      generatedAt,
      snapshotId: "snapshot-safe",
      dataRevision: "revision-safe",
      revisionState: "current",
      query: "PRIVATE QUERY",
      scopeSummary: "PRIVATE CHAT",
      filterSummary: [],
      exportScope: "partial",
      exportedCount: 1,
      totalCount: 1,
      ranges: [{ start: 0, end: 1 }],
      gaps: [],
      browseMode: "manual",
      sortMode: "baseline",
      groupingMode: "none",
      timeZone: "UTC",
      utcOffsetMinutes: 0,
      querySince: null,
      queryUntil: null,
    });
    const content = `${encoder.start()}${encoder.append([
      {
        ...streamRow(0, null),
        chat: "PRIVATE CHAT",
        sender: "PRIVATE SENDER",
        content: "PRIVATE CONTENT",
      },
    ])}${encoder.finish()}`;

    expect(content).toContain("已隐藏查询");
    expect(content).toContain("已隐藏消息内容");
    expect(content).not.toContain("PRIVATE");
  });

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
      filterSummary: ["类型：图片", "状态：可预览"],
      loadedCount: 2,
      visibleCount: 1,
      selectedCount: 1,
      attachments: [
        {
          id: "file-1",
          kind: "image",
          fileName: "C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_private\\image.jpg",
          sizeBytes: 1024,
          time: "2026-01-02",
          available: true,
          source: "当前会话",
        },
      ],
    });
    expect(media.content).toContain("kind,source,fileName,sizeBytes,time,available");
    expect(media.content).toContain("image,当前会话,已隐藏文件名,1024,2026-01-02,true");
    expect(media.warnings).toContain("当前只导出已加载媒体记录。");
    expect(media.warnings).toContain("当前导出已选媒体记录。");
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
    expect(ai.content).toContain("证据 1");
    expect(ai.content).toContain("score 0.87");
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

  it("keeps selected-fragment conversation export attributed to the selection source", () => {
    const artifact = createConversationExportArtifact({
      source: "conversation_selection",
      format: "markdown",
      privacyOn: false,
      requestedUnredacted: true,
      unredactedConfirmed: true,
      generatedAt,
      scopeSummary: "当前会话 · 已选 2 条",
      totalCount: 2,
      loadedCount: 2,
      messages: [
        {
          id: "selected-1",
          sender: "Synthetic Sender",
          content: "Selected message one",
          time: "2026-01-02 08:00",
          type: "text",
        },
        {
          id: "selected-2",
          sender: "Synthetic Sender",
          content: "Selected message two",
          time: "2026-01-02 08:05",
          type: "text",
        },
      ],
    });

    expect(artifact.source).toBe("conversation_selection");
    expect(artifact.job.source).toBe("conversation_selection");
    expect(artifact.job.sourceLabel).toBe("选中消息片段");
    expect(artifact.fileName).toBe("chatlog-conversation-selection-20260102-030405.md");
    expect(artifact.content).toContain("# 选中消息片段");
    expect(artifact.content).toContain("Selected message one");
    expect(artifact.content).toContain("Selected message two");
    expect(artifact.content).not.toContain("Full conversation message");
  });

  it("records current-conversation export filters and exports only matching loaded messages", () => {
    const artifact = createConversationExportArtifact({
      format: "json",
      privacyOn: false,
      requestedUnredacted: true,
      unredactedConfirmed: true,
      generatedAt,
      scopeSummary: "当前会话 · 筛选后 1 条",
      totalCount: 99,
      loadedCount: 3,
      filterSummary: ["对象：Alice", "类型：图片", "日期：2026-07-05 至 2026-07-05"],
      messages: [
        {
          id: "filtered-1",
          sender: "Alice",
          content: "Only filtered image message",
          time: "2026-07-05 10:00",
          type: "image",
        },
      ],
    });
    const json = JSON.parse(artifact.content) as {
      filterSummary: string[];
      loadedCount: number;
      totalCount: number;
      messages: Array<{ content: string; type: string }>;
    };

    expect(artifact.rowCount).toBe(1);
    expect(json.loadedCount).toBe(3);
    expect(json.totalCount).toBe(99);
    expect(json.filterSummary).toEqual(["对象：Alice", "类型：图片", "日期：2026-07-05 至 2026-07-05"]);
    expect(json.messages).toEqual([
      expect.objectContaining({ content: "Only filtered image message", type: "image" }),
    ]);
    expect(artifact.warnings).toContain("筛选只作用于当前已加载消息。");
  });

  it("exports graph query, timeline, visualization, metadata, freshness, and empty summaries", () => {
    const artifact = createGraphExportArtifact({
      format: "markdown",
      privacyOn: true,
      generatedAt,
      scopeSummary: "全部会话",
      filterSummary: ["关键词：已隐藏关键词", "时间：近 30 天"],
      sourceSummary: "来源：图谱当前视图",
      graphGeneratedAt: "2026-01-02T03:04:00.000Z",
      refreshedAt: "2026-01-02T03:05:00.000Z",
      freshnessState: "partial",
      partialWarnings: ["图谱任务仍有等待处理项目。"],
      entities: [
        { id: "entity-1", label: "Synthetic Person", type: "person", mentions: 2 },
      ],
      relations: [
        {
          id: "relation-1",
          subject: "Synthetic Person",
          predicate: "knows",
          object: "Synthetic Topic",
          status: "active",
          evidenceCount: 3,
        },
      ],
      events: [
        {
          id: "event-1",
          label: "Synthetic Event",
          type: "event",
          time: "2026-01-02 03:04",
          source: "Synthetic Source",
          evidenceCount: 1,
        },
      ],
      facts: [
        {
          id: "fact-1",
          label: "Synthetic Fact",
          status: "active",
          evidenceCount: 2,
        },
      ],
      timelineRows: [
        {
          id: "timeline-1",
          time: "2026-01-02 03:04",
          type: "event",
          title: "Synthetic Timeline",
          description: "Private detail",
          source: "Synthetic Source",
        },
      ],
      visualNodes: [{ id: "node-1", label: "Synthetic Person", kind: "person" }],
      visualEdges: [{ id: "edge-1", source: "node-1", target: "node-2", label: "knows", evidenceCount: 3 }],
    });

    expect(artifact.content).toContain("# 图谱");
    expect(artifact.content).toContain("筛选: 关键词：已隐藏关键词、时间：近 30 天");
    expect(artifact.content).toContain("新鲜度: partial");
    expect(artifact.content).toContain("## 实体");
    expect(artifact.content).toContain("## 关系");
    expect(artifact.content).toContain("## 事件");
    expect(artifact.content).toContain("## 事实");
    expect(artifact.content).toContain("## 时间线");
    expect(artifact.warnings).toContain("图谱任务仍有等待处理项目。");
    expect(artifact.content).not.toContain("Synthetic Person");
    expect(artifact.content).not.toContain("Private detail");

    const empty = createGraphExportArtifact({
      format: "json",
      privacyOn: false,
      generatedAt,
      scopeSummary: "全部会话",
      filterSummary: [],
      sourceSummary: "来源：图谱当前视图",
      graphGeneratedAt: "",
      refreshedAt: "",
      freshnessState: "empty",
      partialWarnings: ["当前图谱没有条目。"],
      entities: [],
      relations: [],
      events: [],
      facts: [],
      timelineRows: [],
      visualNodes: [],
      visualEdges: [],
    });
    const emptyJson = JSON.parse(empty.content) as { freshness: { state: string }; metadata: { rowCount: number } };
    expect(emptyJson.freshness.state).toBe("empty");
    expect(emptyJson.metadata.rowCount).toBe(0);
    expect(empty.warnings).toContain("当前图谱没有条目。");
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

function streamRow(sourceIndex: number, groupLabel: string | null) {
  return {
    sourceIndex,
    timestamp: generatedAt.getTime() / 1000,
    chat: "Synthetic Chat",
    sender: "Synthetic Sender",
    type: "text",
    content: `Synthetic content ${sourceIndex}`,
    groupKey: groupLabel ? `private:${groupLabel}` : null,
    groupLabel,
  };
}
