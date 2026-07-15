import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReadyWorkspaceShellView } from "./ReadyWorkspaceShellView";

const useWorkbenchShellCommander = vi.hoisted(() => vi.fn());

vi.mock("@l2/commander", () => ({
  useAppShellCommander: () => ({ view: {}, actions: {} }),
  useUpdateNotificationCommander: () => ({
    view: {},
    status: "idle",
    notes: [],
    actions: {},
  }),
}));

vi.mock("@l2/commander/useDevConsoleCommander", () => ({
  useDevConsoleCommander: () => ({ view: {}, actions: {} }),
}));

vi.mock("@l2/commander/useWorkbenchShellCommander", () => ({
  useWorkbenchShellCommander,
}));

vi.mock("@l3/common/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

vi.mock("@l3/common/ActionableEmptyState", () => ({
  ActionableEmptyState: () => <div data-testid="readiness-empty-state">readiness</div>,
}));

vi.mock("@l3/common/DevConsole", () => ({ DevConsole: () => null }));
vi.mock("@l3/common/UpdateNotificationView", () => ({ UpdateNotificationView: () => null }));
vi.mock("@l3/workspace/PrimaryWorkspaceRail", () => ({
  PrimaryWorkspaceRail: () => <nav data-testid="workspace-rail">rail</nav>,
}));
vi.mock("@l3/common/StatusBar", () => ({
  StatusBar: ({ httpReady, dbReady }: { httpReady: boolean; dbReady: boolean }) => (
    <div
      data-testid="status-bar"
      data-http-ready={String(httpReady)}
      data-db-ready={String(dbReady)}
    >
      status
    </div>
  ),
}));

beforeEach(() => {
  useWorkbenchShellCommander.mockReset();
});

describe("ReadyWorkspaceShellView readiness layout", () => {
  it.each([
    { httpReady: false, dbReady: false },
    { httpReady: true, dbReady: false },
  ])("keeps search content and the status bar mounted for readiness $httpReady/$dbReady", (readiness) => {
    useWorkbenchShellCommander.mockReturnValue(shellState({
      ...readiness,
      renderWorkbench: false,
      renderWorkspaceContent: true,
    }));

    const html = renderShell("search");

    expect(useWorkbenchShellCommander).toHaveBeenCalledWith("search");
    expect(html).toContain("search-content");
    expect(html).toContain('data-testid="status-bar"');
    expect(html).toContain(`data-http-ready="${String(readiness.httpReady)}"`);
    expect(html).toContain('data-db-ready="false"');
    expect(html).not.toContain("readiness-empty-state");
  });

  it("keeps the readiness empty state for a non-search workspace", () => {
    useWorkbenchShellCommander.mockReturnValue(shellState({
      httpReady: true,
      dbReady: false,
      renderWorkbench: false,
      renderWorkspaceContent: false,
    }));

    const html = renderShell("analytics");

    expect(useWorkbenchShellCommander).toHaveBeenCalledWith("analytics");
    expect(html).toContain("readiness-empty-state");
    expect(html).not.toContain("search-content");
    expect(html).toContain('data-testid="status-bar"');
  });

  it("keeps search content mounted after readiness becomes ready", () => {
    useWorkbenchShellCommander.mockReturnValue(shellState({
      httpReady: true,
      dbReady: true,
      renderWorkbench: true,
      renderWorkspaceContent: true,
    }));

    const html = renderShell("search");

    expect(html).toContain("search-content");
    expect(html).toContain('data-http-ready="true"');
    expect(html).toContain('data-db-ready="true"');
    expect(html).not.toContain("readiness-empty-state");
  });
});

function renderShell(activeWorkspace: "search" | "analytics"): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ReadyWorkspaceShellView
        activeWorkspace={activeWorkspace}
        workspaceTitle="搜索工作区"
      >
        <div>search-content</div>
      </ReadyWorkspaceShellView>
    </MemoryRouter>,
  );
}

function shellState(input: {
  httpReady: boolean;
  dbReady: boolean;
  renderWorkbench: boolean;
  renderWorkspaceContent: boolean;
}) {
  return {
    view: {
      renderWorkbench: input.renderWorkbench,
      renderWorkspaceContent: input.renderWorkspaceContent,
      effectiveHttpReady: input.httpReady,
      effectiveDbReady: input.dbReady,
      readinessEmptyState: {},
    },
    sidecarStatus: "stopped",
    serviceLabel: "本机服务",
    workspaceRail: {
      mode: "expanded",
      showLabels: true,
      canToggleLabels: true,
      toggleLabels: vi.fn(),
      setLastPrimaryRoute: vi.fn(),
    },
  };
}
