import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SettingsView } from "@l1/pages/SettingsView";
import { SetupCenterView } from "@l1/pages/SetupCenterView";
import { WorkbenchShellView } from "@l1/pages/WorkbenchShellView";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SetupCenterView />} />
        <Route path="/workbench" element={<WorkbenchShellView />} />
        <Route path="/dashboard" element={<WorkbenchShellView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
