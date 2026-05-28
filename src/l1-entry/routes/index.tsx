import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LaunchView } from "@l1/pages/LaunchView";
import { DashboardView } from "@l1/pages/DashboardView";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LaunchView />} />
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
