import { describe, expect, it } from "vitest";
import {
  adaptDbFilesResponse,
  adaptDbRowsResponse,
  adaptDbSearchResponse,
  classifyReadOnlySql,
  formatDbCellValue,
} from "./dbExplorerAdapters";

describe("dbExplorerAdapters", () => {
  it("adapts backend group-to-files DB response without leaking raw paths", () => {
    const files = adaptDbFilesResponse({
      MicroMsg: ["MSG0.db", "MSG1.db"],
      MediaMSG: ["MediaMSG0.db"],
      Broken: [42, null, "ok.db"],
      Ignored: "not-an-array",
    });

    expect(files).toEqual([
      {
        id: "MicroMsg/MSG0.db",
        group: "MicroMsg",
        file: "MSG0.db",
        displayName: "MSG0.db",
        groupLabel: "MicroMsg",
        category: "message",
      },
      {
        id: "MicroMsg/MSG1.db",
        group: "MicroMsg",
        file: "MSG1.db",
        displayName: "MSG1.db",
        groupLabel: "MicroMsg",
        category: "message",
      },
      {
        id: "MediaMSG/MediaMSG0.db",
        group: "MediaMSG",
        file: "MediaMSG0.db",
        displayName: "MediaMSG0.db",
        groupLabel: "MediaMSG",
        category: "media",
      },
      {
        id: "Broken/ok.db",
        group: "Broken",
        file: "ok.db",
        displayName: "ok.db",
        groupLabel: "Broken",
        category: "other",
      },
    ]);
    expect(JSON.stringify(files)).not.toContain("WeChat Files");
  });

  it("normalizes row-map responses into a stable table view", () => {
    const table = adaptDbRowsResponse([
      { id: 1, summary: "Synthetic row", empty: null },
      { id: 2, kind: "image" },
    ]);

    expect(table.columns).toEqual(["id", "summary", "empty", "kind"]);
    expect(table.rowCount).toBe(2);
    expect(table.columnCount).toBe(4);
    expect(table.rows[0].cells).toMatchObject({
      id: "1",
      summary: "Synthetic row",
      empty: "",
      kind: "",
    });
  });

  it("adapts DB search hits and keeps row values summarized", () => {
    const response = adaptDbSearchResponse({
      keyword: "synthetic",
      mode: "quick",
      total: 1,
      items: [
        {
          group: "MicroMsg",
          file: "MSG0.db",
          db_name: "MSG0.db",
          table: "MSG",
          column: "StrContent",
          row_id: "9",
          preview: "Synthetic preview",
          row: {
            local_id: 9,
            StrContent: "Synthetic private message for redaction test only",
          },
        },
      ],
    });

    expect(response.total).toBe(1);
    expect(response.items[0]).toMatchObject({
      id: "MicroMsg/MSG0.db/MSG/StrContent/9",
      table: "MSG",
      preview: "Synthetic preview",
    });
    expect(response.items[0].rowSummary).toContain("local_id=9");
    expect(response.items[0].rowSummary).not.toContain("private message");
  });

  it("classifies only read-only SQL statements as executable", () => {
    expect(classifyReadOnlySql("select * from MSG limit 10")).toMatchObject({
      allowed: true,
      kind: "select",
    });
    expect(classifyReadOnlySql("WITH recent AS (SELECT * FROM MSG) SELECT * FROM recent")).toMatchObject({
      allowed: true,
      kind: "select",
    });
    expect(classifyReadOnlySql("pragma table_info(MSG)")).toMatchObject({
      allowed: true,
      kind: "pragma",
    });
    expect(classifyReadOnlySql("explain query plan select * from MSG")).toMatchObject({
      allowed: true,
      kind: "explain",
    });
  });

  it("blocks mutating, multi-statement, empty, and unsafe SQL before dispatch", () => {
    expect(classifyReadOnlySql("update MSG set content='x'")).toMatchObject({
      allowed: false,
      reason: "mutation",
    });
    expect(classifyReadOnlySql("select * from MSG; delete from MSG")).toMatchObject({
      allowed: false,
      reason: "multi-statement",
    });
    expect(classifyReadOnlySql("")).toMatchObject({
      allowed: false,
      reason: "empty",
    });
    expect(classifyReadOnlySql("attach database 'private.db' as private")).toMatchObject({
      allowed: false,
      reason: "unsupported",
    });
    expect(classifyReadOnlySql("pragma user_version=1")).toMatchObject({
      allowed: false,
      reason: "mutation",
    });
    expect(classifyReadOnlySql("pragma writable_schema=ON")).toMatchObject({
      allowed: false,
      reason: "mutation",
    });
  });

  it("masks DB cell values when privacy mode is enabled", () => {
    expect(formatDbCellValue("Synthetic visible value", false)).toBe("Synthetic visible value");
    expect(formatDbCellValue("Synthetic visible value", true)).toBe("已隐藏");
    expect(formatDbCellValue(null, true)).toBe("");
    expect(formatDbCellValue("x".repeat(160), false)).toHaveLength(123);
  });
});
