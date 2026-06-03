import { Database, Server, ShieldCheck } from "lucide-react";
import { useSetupCenterCommander } from "@l2/commander";
import { SetupStepper } from "@l3/setup/SetupStepper";
import { SetupModeChooser } from "@l3/setup/SetupModeChooser";
import { ConfigImportPanel } from "@l3/setup/ConfigImportPanel";
import { ManualAdvancedConfigPanel } from "@l3/setup/ManualAdvancedConfigPanel";
import { ServiceControlPanel } from "@l3/setup/ServiceControlPanel";
import { ReadinessChecklist } from "@l3/setup/ReadinessChecklist";
import { DiagnosticPanel } from "@l3/setup/DiagnosticPanel";
import { Button, StatusIndicator, Surface, Typography } from "@l4/ui";

export function SetupCenterView() {
  const setup = useSetupCenterCommander();

  return (
    <div className="setup-shell">
      <aside className="setup-shell__nav">
        <div className="setup-brand">
          <div className="ui-icon-button ui-icon-button--md ui-icon-button--active" aria-hidden="true">
            <Server size={17} />
          </div>
          <div>
            <Typography variant="label" weight={700}>设置中心</Typography>
            <Typography variant="caption" color="var(--text-tertiary)">chatlog_alpha</Typography>
          </div>
        </div>
        <SetupStepper currentStep={setup.currentStep} />
      </aside>

      <main className="setup-shell__main">
        <div className="setup-shell__content">
          <div className="setup-hero">
            <Typography variant="h2">连接本地聊天数据服务</Typography>
            <Typography variant="body" color="var(--text-secondary)" className="setup-hero__copy">
              选择服务模式、确认配置与数据库状态后进入工作台。
            </Typography>
          </div>

          {setup.currentStep === "mode" && (
            <Surface variant="raised" className="setup-card">
              <SetupModeChooser mode={setup.mode} onChooseMode={setup.actions.chooseMode} />
            </Surface>
          )}
          {setup.currentStep === "config" && (
            <Surface variant="raised" className="setup-card">
              <ConfigImportPanel
                loading={setup.loading}
                error={setup.error}
                profile={setup.profile}
                onChooseDataDirectory={setup.actions.chooseAndImportDataDirectory}
              />
              <div className="setup-section-divider">
                <ManualAdvancedConfigPanel
                  loading={setup.loading}
                  error={setup.error}
                  onSaveManualConfig={setup.actions.saveManualConfig}
                />
              </div>
            </Surface>
          )}
          {(setup.currentStep === "service" || setup.currentStep === "database") && (
            <Surface variant="raised" className="setup-card">
              <ServiceControlPanel
                mode={setup.mode}
                portState={setup.portState}
                httpReady={setup.httpReady}
                dbReady={setup.dbReady}
                loading={setup.loading}
                error={setup.error}
                externalBaseUrl={setup.profile?.httpAddr ?? "http://127.0.0.1:5030"}
                onInspectServicePort={setup.actions.inspectServicePort}
                onStartManagedService={setup.actions.startManagedService}
                onConnectExternalService={setup.actions.connectExternalService}
                onStopManagedService={setup.actions.stopManagedService}
                onCheckReadiness={setup.actions.checkReadiness}
              />
            </Surface>
          )}
          {setup.currentStep === "ready" && (
            <Surface variant="raised" className="setup-card">
              <div className="setup-ready-header">
                <div className="ui-icon-button ui-icon-button--lg ui-icon-button--active" aria-hidden="true">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <Typography variant="h3">服务已就绪</Typography>
                  <Typography variant="body" color="var(--text-secondary)" className="setup-ready-copy">
                    所有检查已通过，可以开始使用了。
                  </Typography>
                </div>
              </div>
            <Button type="button" onClick={setup.actions.openWorkbench}>
              打开工作台
            </Button>
            </Surface>
          )}
        </div>
      </main>

      <aside className="setup-shell__aside">
        <div aria-live="polite" className="sr-only">
          {setup.view.readyAnnouncement}
        </div>
        <div className="setup-aside-stack">
          <Surface variant="base" className="setup-card--compact">
            <div className="setup-card-header">
              <Database size={16} color="var(--text-secondary)" />
              <Typography variant="label" weight={700}>状态</Typography>
            </div>
            <div className="setup-status-stack">
              <StatusIndicator label={setup.view.dbStatusLabel} tone={setup.view.dbStatusTone} />
              <ReadinessChecklist
                profile={setup.profile}
                httpReady={setup.httpReady}
                dbReady={setup.dbReady}
              />
            </div>
          </Surface>

          <Surface variant="base" className="setup-card--compact">
            <Typography variant="label" weight={700}>诊断信息</Typography>
            <div className="setup-diagnostics-body">
              <DiagnosticPanel
                report={setup.diagnostics.report}
                copyText={setup.diagnostics.copyText}
                onExport={setup.diagnostics.exportReport}
              />
            </div>
          </Surface>

          <Button type="button" variant={setup.view.workbenchButtonVariant} onClick={setup.actions.openWorkbench}>
            {setup.view.workbenchButtonLabel}
          </Button>
        </div>
      </aside>
    </div>
  );
}
