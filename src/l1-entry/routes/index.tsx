import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AiWorkspaceView } from "@l1/pages/AiWorkspaceView";
import { AnalyticsView } from "@l1/pages/AnalyticsView";
import { GraphView } from "@l1/pages/GraphView";
import { MediaView } from "@l1/pages/MediaView";
import { ReadyWorkspaceShellView } from "@l1/pages/ReadyWorkspaceShellView";
import { SearchView } from "@l1/pages/SearchView";
import { SettingsView } from "@l1/pages/SettingsView";
import { SetupCenterView } from "@l1/pages/SetupCenterView";
import { SnsView } from "@l1/pages/SnsView";
import { WorkbenchShellView } from "@l1/pages/WorkbenchShellView";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SetupCenterView />} />
        <Route path="/workbench" element={<WorkbenchShellView />} />
        <Route path="/dashboard" element={<RedirectWithSearch to="/workbench" />} />
        <Route path="/workbench/search" element={<RedirectWithSearch to="/search" />} />
        <Route path="/workbench/stats" element={<RedirectWithSearch to="/analytics" />} />
        <Route path="/workbench/media" element={<RedirectWithSearch to="/media" />} />
        <Route path="/workbench/sns" element={<RedirectWithSearch to="/sns" />} />
        <Route path="/workbench/ai" element={<RedirectWithSearch to="/ai" />} />
        <Route path="/workbench/graph" element={<RedirectWithSearch to="/graph" />} />
        <Route
          path="/search"
          element={(
            <ReadyWorkspaceShellView pageTitle="搜索" activeDestination="search">
              <SearchView />
            </ReadyWorkspaceShellView>
          )}
        />
        <Route
          path="/analytics"
          element={(
            <ReadyWorkspaceShellView pageTitle="统计" activeDestination="analytics">
              <AnalyticsView />
            </ReadyWorkspaceShellView>
          )}
        />
        <Route
          path="/media"
          element={(
            <ReadyWorkspaceShellView pageTitle="媒体" activeDestination="media">
              <MediaView />
            </ReadyWorkspaceShellView>
          )}
        />
        <Route
          path="/sns"
          element={(
            <ReadyWorkspaceShellView pageTitle="朋友圈" activeDestination="sns">
              <SnsView />
            </ReadyWorkspaceShellView>
          )}
        />
        <Route
          path="/ai"
          element={(
            <ReadyWorkspaceShellView pageTitle="AI" activeDestination="ai">
              <AiWorkspaceView />
            </ReadyWorkspaceShellView>
          )}
        />
        <Route
          path="/graph"
          element={(
            <ReadyWorkspaceShellView pageTitle="图谱" activeDestination="graph">
              <GraphView />
            </ReadyWorkspaceShellView>
          )}
        />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function RedirectWithSearch({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}
