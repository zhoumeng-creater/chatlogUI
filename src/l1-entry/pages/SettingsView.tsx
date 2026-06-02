import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@l3/common/AppLayout";
import { StatusBar } from "@l3/common/StatusBar";
import { SettingsLayout } from "@l3/settings/SettingsLayout";
import { AIModelSettings } from "@l3/settings/AIModelSettings";
import { AppearanceSettings } from "@l3/settings/AppearanceSettings";
import { DataSettings } from "@l3/settings/DataSettings";
import { AboutSettings } from "@l3/settings/AboutSettings";
import { useAppShellCommander } from "@l2/commander";
import { useSettingsPageCommander } from "@l2/commander/useSettingsPageCommander";
import { Typography } from "@l4/ui/Typography";
import { Button } from "@l4/ui/Button";

export function SettingsView() {
  const navigate = useNavigate();
  const commander = useSettingsPageCommander();
  const appShell = useAppShellCommander("设置");

  const renderContent = () => {
    switch (commander.activeCategory) {
      case "ai":
        return (
          <AIModelSettings
            settings={commander.settings}
            saveStatus={commander.saveStatus}
            saveMessage={commander.saveMessage}
            onChange={commander.updateAndSave}
          />
        );
      case "appearance":
        return (
          <AppearanceSettings
            settings={commander.settings}
            saveStatus={commander.saveStatus}
            saveMessage={commander.saveMessage}
            onChange={commander.updateAndSave}
          />
        );
      case "data":
        return (
          <DataSettings
            settings={commander.settings}
            saveStatus={commander.saveStatus}
            saveMessage={commander.saveMessage}
            onChooseDataDirectory={commander.chooseDataDirectory}
          />
        );
      case "about":
        return (
          <AboutSettings
            updateStatusText={commander.updateStatusText}
            onCheckUpdate={commander.checkForUpdates}
            diagnosticReport={commander.diagnostics.report}
            diagnosticCopyText={commander.diagnostics.copyText}
            onExportDiagnostics={commander.diagnostics.exportReport}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AppLayout shell={appShell.view} actions={appShell.actions}>
      <div className="settings-page">
        <div className="settings-page__header">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/workbench", { replace: true })}
        >
          <ArrowLeft size={15} />
          返回工作台
        </Button>
        <Typography variant="label" weight={600}>设置</Typography>
        </div>
        <div className="settings-page__body">
          <SettingsLayout
            activeCategory={commander.activeCategory}
            onCategoryChange={commander.setActiveCategory}
          >
            {renderContent()}
          </SettingsLayout>
        </div>
        <StatusBar status={commander.sidecarStatus} indexStatus={commander.indexStatus} />
      </div>
    </AppLayout>
  );
}
