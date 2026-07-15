import { describe, expect, it } from "vitest";
import {
  buildSearchReadinessRecoveryActions,
  buildSearchRequestRecoveryActions,
} from "./searchRequestRecoveryModel";

const base = {
  hasSnapshot: false,
  retryAvailable: false,
  requestRecoveryDisabledReason: null,
  resubmitDisabled: false,
  resubmitDisabledReason: null,
};

describe("buildSearchRequestRecoveryActions", () => {
  it("offers first-visit readiness recovery without requiring a failed search", () => {
    expect(buildSearchReadinessRecoveryActions("not-configured")).toEqual([
      { id: "data-settings", label: "前往数据设置" },
    ]);
    expect(buildSearchReadinessRecoveryActions("service-failed")).toEqual([
      { id: "recover-service", label: "重新启动本机服务" },
      { id: "service-settings", label: "前往服务设置" },
    ]);
    expect(buildSearchReadinessRecoveryActions("external-unreachable")).toEqual([
      { id: "recover-service", label: "重新检查外部服务" },
      { id: "service-settings", label: "前往服务设置" },
    ]);
    expect(buildSearchReadinessRecoveryActions("database-not-ready")).toEqual([
      { id: "recheck-database", label: "重新加载数据库" },
      { id: "data-settings", label: "前往数据设置" },
    ]);
  });

  it("keeps transitional and ready phases informational", () => {
    expect(buildSearchReadinessRecoveryActions("service-starting")).toEqual([]);
    expect(buildSearchReadinessRecoveryActions("database-loading")).toEqual([]);
    expect(buildSearchReadinessRecoveryActions("ready")).toEqual([]);
  });

  it("maps service, database, and capability failures to real recovery boundaries", () => {
    expect(
      buildSearchRequestRecoveryActions(
        { status: "error", errorCode: "service_unavailable" },
        base,
      ).map((action) => action.id),
    ).toEqual(["recover-service", "service-settings"]);
    expect(
      buildSearchRequestRecoveryActions(
        { status: "error", errorCode: "database_unavailable" },
        base,
      ).map((action) => action.id),
    ).toEqual(["recheck-database", "data-settings"]);
    expect(
      buildSearchRequestRecoveryActions(
        { status: "error", errorCode: "capability_unavailable" },
        base,
      ).map((action) => action.id),
    ).toEqual(["reprobe-capabilities", "service-settings"]);
  });

  it("returns a field review intent for a safe validation field", () => {
    expect(
      buildSearchRequestRecoveryActions(
        { status: "error", errorCode: "invalid_request", errorField: "senders" },
        base,
      ),
    ).toEqual([
      { id: "review-field", label: "检查发送者筛选", field: "senders" },
    ]);
  });

  it("keeps permission, identity, snapshot, timeout, and unknown recovery distinct", () => {
    expect(
      buildSearchRequestRecoveryActions(
        { status: "error", errorCode: "permission_denied" },
        base,
      ).map((action) => action.id),
    ).toEqual(["data-settings", "diagnostics"]);
    expect(
      buildSearchRequestRecoveryActions(
        { status: "error", errorCode: "identity_conflict" },
        { ...base, hasSnapshot: true },
      ).map((action) => action.id),
    ).toEqual(["refresh", "diagnostics"]);
    expect(
      buildSearchRequestRecoveryActions(
        { status: "error", errorCode: "snapshot_expired" },
        { ...base, hasSnapshot: true },
      ).map((action) => action.id),
    ).toEqual(["refresh"]);
    expect(
      buildSearchRequestRecoveryActions(
        { status: "error", errorCode: "timeout" },
        { ...base, retryAvailable: true },
      ).map((action) => action.id),
    ).toEqual(["retry"]);
    expect(
      buildSearchRequestRecoveryActions(
        { status: "error", errorCode: "request_failed" },
        { ...base, retryAvailable: true },
      ).map((action) => action.id),
    ).toEqual(["retry", "diagnostics"]);
  });

  it("does not offer an executable request action while request recovery is disabled", () => {
    const result = buildSearchRequestRecoveryActions(
      { status: "error", errorCode: "timeout" },
      {
        ...base,
        retryAvailable: true,
        requestRecoveryDisabledReason: "等待聊天数据库就绪。",
      },
    );

    expect(result).toEqual([]);
  });
});
