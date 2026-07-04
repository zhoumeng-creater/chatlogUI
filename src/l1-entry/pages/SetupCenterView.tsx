import { Database, Server, ShieldCheck } from "lucide-react";
import { useAppShellCommander, useSetupCenterCommander } from "@l2/commander";
import { AppLayout } from "@l3/common/AppLayout";
import { SetupStepper } from "@l3/setup/SetupStepper";
import { SetupModeChooser } from "@l3/setup/SetupModeChooser";
import { SetupActionPanel } from "@l3/setup/SetupActionPanel";
import { ConfigImportPanel } from "@l3/setup/ConfigImportPanel";
import { ManualAdvancedConfigPanel } from "@l3/setup/ManualAdvancedConfigPanel";
import { ServiceControlPanel } from "@l3/setup/ServiceControlPanel";
import { ReadinessChecklist } from "@l3/setup/ReadinessChecklist";
import { SetupDiagnosticsDisclosure } from "@l3/setup/SetupDiagnosticsDisclosure";
import { Surface, Typography } from "@l4/ui";

export function SetupCenterView() {
  const setup = useSetupCenterCommander();
  const appShell = useAppShellCommander("设置中心");

  return (
    <AppLayout shell={appShell.view} actions={appShell.actions}>
      <div className="setup-shell">
        <header className="setup-flow-header">
          <div className="setup-brand">
            <div className="ui-icon-button ui-icon-button--md ui-icon-button--active" aria-hidden="true">
              <Server size={17} />
            </div>
            <div className="setup-brand__text">
              <Typography variant="label" weight={700}>chatlogUI 设置中心</Typography>
              <Typography variant="caption" color="var(--text-secondary)" className="setup-hero__copy">
                本地私有聊天数据连接
              </Typography>
            </div>
          </div>
          <SetupStepper currentStep={setup.currentStep} />
        </header>

        <main className="setup-shell__main" aria-labelledby="setup-center-title">
          <div className="setup-shell__content">
            <div aria-live="polite" className="sr-only">
              {setup.view.readyAnnouncement}
            </div>
            <SetupActionPanel
              headingId="setup-center-title"
              heading={setup.view.heading}
              description={setup.view.description}
              primaryAction={setup.view.primaryAction}
              secondaryActions={setup.view.secondaryActions}
              onAction={(actionId) => void setup.actions.performAction(actionId)}
            />

            <section className="setup-flow" aria-label="设置流程">
              <SetupModeChooser
                activePath={setup.view.activePath}
                pathOptions={setup.view.pathOptions}
                onChoosePath={setup.actions.chooseSetupPath}
              />

              <div className="setup-flow__panel">
                {setup.view.activePanel === "recommended-import" && (
                  <ConfigImportPanel
                    loading={setup.loading}
                    error={setup.error}
                    profile={setup.profile}
                    detectionStatus={setup.view.detectedPath.status}
                    candidates={setup.view.detectedPath.candidates}
                    detectionError={setup.view.detectedPath.error}
                    onUseCandidate={(candidateId) => void setup.actions.importDetectedDataDirectory(candidateId)}
                    onChooseDirectory={() => void setup.actions.chooseAndImportDataDirectory()}
                    onConnectExternalService={() => setup.actions.chooseSetupPath("external-service")}
                    onOpenManualAdvanced={() => setup.actions.chooseSetupPath("manual-advanced")}
                  />
                )}

                {setup.view.activePanel === "manual-advanced" && (
                  <ManualAdvancedConfigPanel
                    loading={setup.loading}
                    error={setup.error}
                    draft={setup.manualDraft}
                    fieldErrors={setup.manualFieldErrors}
                    onDraftChange={setup.actions.setManualDraft}
                    onSubmit={() => setup.actions.performAction("save-manual-config")}
                    onChooseDataDir={setup.actions.chooseManualDataDirectory}
                    onChooseWorkDir={setup.actions.chooseManualWorkDirectory}
                  />
                )}

                {setup.view.activePanel === "service-control" && (
                  <ServiceControlPanel
                    mode={setup.mode}
                    portState={setup.portState}
                    httpReady={setup.httpReady}
                    dbReady={setup.dbReady}
                    loading={setup.loading}
                    error={setup.error}
                    externalBaseUrl={setup.externalBaseUrlDraft}
                    externalBaseUrlError={setup.externalBaseUrlError}
                    latestDiagnosticFamily={setup.latestDiagnosticFamily}
                    onExternalBaseUrlChange={setup.actions.setExternalBaseUrlDraft}
                  />
                )}

                {setup.view.activePanel === "ready" && (
                  <Surface variant="base" className="setup-ready-card">
                    <div className="setup-ready-header">
                      <div className="ui-icon-button ui-icon-button--lg ui-icon-button--active" aria-hidden="true">
                        <ShieldCheck size={19} />
                      </div>
                      <div>
                        <Typography variant="h3">服务已就绪</Typography>
                        <Typography variant="body" color="var(--text-secondary)" className="setup-ready-copy">
                          所有检查已通过，可以开始使用工作台。
                        </Typography>
                      </div>
                    </div>
                  </Surface>
                )}
              </div>
            </section>

            <section className="setup-card--compact setup-status-summary" aria-label="设置状态摘要">
              <div className="setup-card-header">
                <Database size={16} color="var(--text-secondary)" />
                <Typography variant="label" weight={700}>状态摘要</Typography>
              </div>
              <div className="setup-status-stack">
                <ReadinessChecklist
                  profile={setup.profile}
                  mode={setup.mode}
                  httpReady={setup.httpReady}
                  dbReady={setup.dbReady}
                  items={setup.view.readinessSummary}
                />
              </div>
            </section>

            <section className="setup-card--compact setup-diagnostics-card">
              <Typography variant="label" weight={700}>诊断信息</Typography>
              <SetupDiagnosticsDisclosure
                report={setup.diagnostics.report}
                copyText={setup.diagnostics.copyText}
                onExport={setup.diagnostics.exportReport}
              />
            </section>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
