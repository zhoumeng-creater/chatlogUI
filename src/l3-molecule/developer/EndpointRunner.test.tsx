import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getEndpointCatalog, getEndpointCatalogEntry } from "@l4/network";
import type { EndpointRunnerView } from "@l2/commander/endpointRunnerViewModel";
import { EndpointRunner } from "./EndpointRunner";

describe("EndpointRunner", () => {
  it("does not render text parameter values when privacy mode is enabled", () => {
    const html = renderToStaticMarkup(
      <EndpointRunner
        view={viewFor("search")}
        selectedEndpointId="search"
        endpointParams={{
          keyword: "synthetic private keyword",
          chat: "wxid_private_chat",
          limit: 50,
        }}
        status="idle"
        privacyOn
        confirmationPending={false}
        onSelectEndpoint={vi.fn()}
        onParamChange={vi.fn()}
        onRequestConfirmation={vi.fn()}
        onCancelConfirmation={vi.fn()}
        onRun={vi.fn()}
      />,
    );

    expect(html).not.toContain("synthetic private keyword");
    expect(html).not.toContain("wxid_private_chat");
    expect(html).toContain("隐私模式已隐藏Keyword");
    expect(html).toContain("value=\"50\"");
  });

  it("renders destructive endpoints as a two-step confirmation", () => {
    const firstStep = renderToStaticMarkup(
      <EndpointRunner
        view={viewFor("cache_clear")}
        selectedEndpointId="cache_clear"
        endpointParams={{}}
        status="idle"
        privacyOn={false}
        confirmationPending={false}
        onSelectEndpoint={vi.fn()}
        onParamChange={vi.fn()}
        onRequestConfirmation={vi.fn()}
        onCancelConfirmation={vi.fn()}
        onRun={vi.fn()}
      />,
    );
    const secondStep = renderToStaticMarkup(
      <EndpointRunner
        view={viewFor("cache_clear")}
        selectedEndpointId="cache_clear"
        endpointParams={{}}
        status="idle"
        privacyOn={false}
        confirmationPending
        onSelectEndpoint={vi.fn()}
        onParamChange={vi.fn()}
        onRequestConfirmation={vi.fn()}
        onCancelConfirmation={vi.fn()}
        onRun={vi.fn()}
      />,
    );

    expect(firstStep).toContain("需要确认");
    expect(firstStep).not.toContain("确认运行");
    expect(secondStep).toContain("确认运行");
    expect(secondStep).toContain("取消");
  });
});

function viewFor(entryId: string): EndpointRunnerView {
  const selectedEntry = getEndpointCatalogEntry(entryId) ?? null;
  return {
    catalogGroups: [
      {
        id: selectedEntry?.group ?? "core",
        label: "Synthetic",
        entries: getEndpointCatalog().filter((entry) => entry.group === selectedEntry?.group),
      },
    ],
    selectedEntry,
    requestSummary: selectedEntry
      ? {
          method: selectedEntry.method,
          pathTemplate: selectedEntry.pathTemplate,
          endpointFamily: selectedEntry.endpointFamily,
          parameterKeys: selectedEntry.params.map((param) => param.name),
          requiresConfirmation: selectedEntry.requiresConfirmation === true,
        }
      : null,
    paramDrafts: [],
    result: null,
    history: [],
    canRun: selectedEntry?.requiresConfirmation ? false : true,
    status: "idle",
    errorCopy: null,
  };
}
