import { useMediaWorkspaceCommander } from "@l2/commander/useMediaWorkspaceCommander";
import { BusinessExportDialog } from "@l3/export";
import { MediaLibrary } from "@l3/media/MediaLibrary";
import { WorkspaceScopeController } from "@l3/workspace/WorkspaceScopeController";
import { WorkspaceScopeStatus } from "@l3/workspace/WorkspaceScopeStatus";
import { Typography } from "@l4/ui";

export function MediaView() {
  const {
    currentChat,
    privacyOn,
    media,
    scopeController,
    workspaceRouteScope,
    selectScope,
    clearScopeChip,
    resetScope,
    statusItems,
  } = useMediaWorkspaceCommander();

  return (
    <div className="workspace-page media-workspace">
      <header className="workspace-page__header">
        <div>
          <Typography variant="h3">媒体</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            当前阶段聚焦当前会话媒体、收藏、成员、未读和新消息资源。
          </Typography>
        </div>
      </header>
      <WorkspaceScopeStatus
        workspaceRouteScope={workspaceRouteScope}
        items={statusItems}
      />
      <WorkspaceScopeController
        model={scopeController}
        onSelectScope={selectScope}
        onClearChip={clearScopeChip}
        onReset={resetScope}
      />
      <div className="workspace-page__surface workspace-page__module-surface">
        <MediaLibrary
          currentChat={currentChat}
          privacyOn={privacyOn}
          attachments={media.attachments}
          favorites={media.favorites}
          members={media.members}
          memberTotal={media.memberTotal}
          unread={media.unread}
          newMessages={media.newMessages}
          status={media.status}
          error={media.error}
          endpointStatus={media.endpointStatus}
          selectedAttachment={media.selectedAttachment}
          previewResourceUrl={media.previewResourceUrl}
          previewResourceStatus={media.previewResourceStatus}
          exportAction={media.businessExport.action}
          filters={media.filters}
          filteredAttachments={media.filteredAttachments}
          filterChips={media.filterChips}
          selectedAttachmentIds={media.selectedAttachmentIds}
          actionModelsByAttachmentId={media.actionModelsByAttachmentId}
          actionPrompt={media.actionPrompt}
          lastActionResult={media.lastActionResult}
          onRetry={media.retry}
          onPreviewAttachment={media.previewAttachment}
          onClosePreview={media.closePreview}
          onChangeFilters={media.setFilters}
          onClearFilter={media.clearFilter}
          onResetFilters={media.resetFilters}
          onToggleSelectedAttachment={media.toggleSelectedAttachment}
          onCopyAttachmentSummary={media.copyAttachmentSummary}
          onLocateAttachment={media.locateAttachment}
          onRequestOpenOriginal={media.requestOpenOriginal}
          onConfirmOpenOriginal={media.confirmOpenOriginal}
          onCancelOpenOriginal={media.cancelOpenOriginal}
          onRetryResource={media.retryResource}
          onPreviewResourceError={media.markResourceError}
        />
      </div>
      {media.businessExport.isOpen && <BusinessExportDialog {...media.businessExport.dialog} />}
    </div>
  );
}
