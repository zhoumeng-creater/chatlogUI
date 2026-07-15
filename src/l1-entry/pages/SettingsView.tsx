import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@l3/common/AppLayout";
import { StatusBar } from "@l3/common/StatusBar";
import { SettingsLayout } from "@l3/settings/SettingsLayout";
import { AIModelSettings } from "@l3/settings/AIModelSettings";
import { AppearanceSettings } from "@l3/settings/AppearanceSettings";
import { DataSettings } from "@l3/settings/DataSettings";
import { AdvancedSettings } from "@l3/settings/AdvancedSettings";
import { AboutSettings } from "@l3/settings/AboutSettings";
import { useAppShellCommander } from "@l2/commander";
import { useSettingsPageCommander } from "@l2/commander/useSettingsPageCommander";
import { settingsMessagesZhCN } from "@l2/commander/messages.zh-CN";
import { Typography } from "@l4/ui/Typography";
import { Button } from "@l4/ui/Button";

export function SettingsView() {
  const navigate = useNavigate();
  const commander = useSettingsPageCommander();
  const copy = commander.copy;
  const appShell = useAppShellCommander(copy.title);

  const renderContent = () => {
    switch (commander.activeCategory) {
      case "ai":
        return (
          <AIModelSettings
            view={commander.aiSemanticView}
            onOpenSemanticSettings={() => navigate(commander.aiSemanticView.primaryAction.target)}
          />
        );
      case "appearance":
        return (
          <AppearanceSettings
            copy={copy.appearance}
            settings={commander.settings}
            saveStatus={commander.saveStatus}
            saveMessage={commander.saveMessage}
            onChange={commander.updateAndSave}
          />
        );
      case "data":
        return (
          <DataSettings
            copy={copy.data}
            view={commander.dataServiceView}
            onOpenSetup={() => navigate(commander.dataServiceView.primaryAction.target)}
          />
        );
      case "advanced":
        return (
          <AdvancedSettings
            copy={copy.advanced}
            settings={commander.settings}
            saveStatus={commander.saveStatus}
            saveMessage={commander.saveMessage}
            rememberRecentSearches={commander.rememberRecentSearches}
            onChange={commander.updateAndSave}
            onRememberRecentSearchesChange={commander.setRememberRecentSearches}
          />
        );
      case "about":
        return (
          <AboutSettings
            copy={copy.about}
            diagnosticsCopy={copy.diagnostics}
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
            onClick={() => navigate(commander.returnAction.target, { replace: commander.returnAction.replace })}
          >
            <ArrowLeft size={15} />
            {commander.returnAction.label}
          </Button>
          <Typography variant="label" weight={600}>{copy.title}</Typography>
        </div>
        <div className="settings-page__body">
          <SettingsLayout
            categoryLabels={copy.categories}
            activeCategory={commander.activeCategory}
            onCategoryChange={commander.setActiveCategory}
          >
            {renderContent()}
          </SettingsLayout>
        </div>
        <StatusBar
          copy={settingsMessagesZhCN.status}
          status={commander.sidecarStatus}
          indexStatus={commander.indexStatus}
          serviceLabel={commander.serviceLabel}
        />
      </div>
    </AppLayout>
  );
}
