import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
        <Route path="/dashboard" element={<Navigate to="/workbench" replace />} />
        <Route path="/search" element={<ReadyWorkspaceShellView activeWorkspace="search" workspaceTitle="搜索"><SearchView /></ReadyWorkspaceShellView>} />
        <Route path="/analytics" element={<ReadyWorkspaceShellView activeWorkspace="analytics" workspaceTitle="统计"><AnalyticsView /></ReadyWorkspaceShellView>} />
        <Route path="/media" element={<ReadyWorkspaceShellView activeWorkspace="media" workspaceTitle="媒体"><MediaView /></ReadyWorkspaceShellView>} />
        <Route path="/sns" element={<ReadyWorkspaceShellView activeWorkspace="sns" workspaceTitle="朋友圈"><SnsView /></ReadyWorkspaceShellView>} />
        <Route path="/ai" element={<ReadyWorkspaceShellView activeWorkspace="ai" workspaceTitle="AI"><AiWorkspaceView /></ReadyWorkspaceShellView>} />
        <Route path="/graph" element={<ReadyWorkspaceShellView activeWorkspace="graph" workspaceTitle="图谱"><GraphView /></ReadyWorkspaceShellView>} />
        <Route path="/workbench/search" element={<Navigate to="/search" replace />} />
        <Route path="/workbench/graph" element={<Navigate to="/graph" replace />} />
        <Route path="/workbench/stats" element={<Navigate to="/analytics" replace />} />
        <Route path="/workbench/media" element={<Navigate to="/media" replace />} />
        <Route path="/workbench/sns" element={<Navigate to="/sns" replace />} />
        <Route path="/workbench/ai" element={<Navigate to="/ai" replace />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
