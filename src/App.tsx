import { AppRoutes } from "@l1/routes";
import { useDevConsoleLifecycle } from "@l2/commander/useDevConsoleCommander";
import { useSettingsBootstrap } from "@l2/commander/useSettingsCommander";
import { useUpdateLifecycle } from "@l2/commander/useUpdateCommander";
import "./styles/globals.css";

function App() {
  useSettingsBootstrap();
  useDevConsoleLifecycle();
  useUpdateLifecycle();

  return <AppRoutes />;
}

export default App;
