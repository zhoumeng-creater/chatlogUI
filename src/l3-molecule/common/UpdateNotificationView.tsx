import { useEffect, useRef, type KeyboardEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Typography } from "@l4/ui/Typography";
import { Button } from "@l4/ui/Button";
import { restoreFocusTarget, type FocusTarget } from "./focusManagement";

type UpdateNotificationStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "error";

interface UpdateNotificationViewState {
  visible: boolean;
  title: string;
  titleId: string;
  dismissible: boolean;
  tone: "info" | "success" | "danger";
  statusText: string;
  progressValue: number | null;
  progressLabel: string;
  settingsActionLabel: string | null;
}

interface UpdateNotificationActions {
  dismiss: () => void;
  download: () => void;
  install: () => void;
  retry: () => void;
  openSettings?: () => void;
}

interface UpdateNotificationViewProps {
  view: UpdateNotificationViewState;
  status: UpdateNotificationStatus;
  notes?: string;
  actions: UpdateNotificationActions;
}

export function UpdateNotificationView({
  view,
  status,
  notes,
  actions,
}: UpdateNotificationViewProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<FocusTarget | null>(null);
  const wasVisibleRef = useRef(false);
  const reduceMotion = useReducedMotion();

  const showAvailable = status === "available";
  const showDownloading = status === "downloading";
  const showReady = status === "ready";
  const showError = status === "error";

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    if (view.visible && !wasVisibleRef.current) {
      previousFocusRef.current = document.activeElement as FocusTarget | null;
      const firstButton = dialogRef.current?.querySelector<HTMLButtonElement>("button");
      const focusTarget = firstButton ?? dialogRef.current;
      focusTarget?.focus();
    }

    if (!view.visible && wasVisibleRef.current) {
      restoreFocusTarget(previousFocusRef.current);
      previousFocusRef.current = null;
    }

    wasVisibleRef.current = view.visible;

    return undefined;
  }, [view.visible]);

  useEffect(() => {
    return () => {
      if (wasVisibleRef.current) {
        restoreFocusTarget(previousFocusRef.current);
        previousFocusRef.current = null;
        wasVisibleRef.current = false;
      }
    };
  }, []);

  function handleDismiss() {
    if (view.dismissible) {
      actions.dismiss();
    }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape" || !view.dismissible) return;
    event.stopPropagation();
    actions.dismiss();
  }

  const backdropMotion = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.01 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
  const dialogMotion = reduceMotion
    ? { initial: false, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0 }, transition: { duration: 0.01 } }
    : {
        initial: { opacity: 0, scale: 0.92, y: 8 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.92, y: 8 },
        transition: { type: "spring", stiffness: 400, damping: 28 },
      };

  return (
    <AnimatePresence>
      {view.visible && (
        <>
          <motion.div
            {...backdropMotion}
            className="update-notification__backdrop"
            onClick={handleDismiss}
          />
          <motion.div
            {...dialogMotion}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={view.titleId}
            tabIndex={-1}
            className={`update-notification update-notification--${view.tone}`}
            onKeyDown={handleDialogKeyDown}
          >
            <Typography id={view.titleId} variant="h3" weight={600}>
              {view.title}
            </Typography>

            {notes && showAvailable && (
              <div className="update-notification__notes">
                <Typography
                  variant="caption"
                  color="var(--color-text-secondary)"
                  className="update-notification__notes-text"
                >
                  {notes}
                </Typography>
              </div>
            )}

            {showDownloading && (
              <div className="update-notification__download">
                <div
                  className="update-notification__progress"
                  role="progressbar"
                  aria-label="更新下载进度"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={view.progressValue ?? 0}
                >
                  <motion.div
                    className="update-notification__progress-bar"
                    animate={{ width: `${view.progressValue ?? 0}%` }}
                    transition={reduceMotion
                      ? { duration: 0.01 }
                      : { type: "spring", stiffness: 100, damping: 20 }}
                  />
                </div>
                <Typography
                  variant="caption"
                  color="var(--color-text-tertiary)"
                  className="update-notification__progress-label"
                >
                  {view.progressLabel}
                </Typography>
              </div>
            )}

            {showError && (
              <Typography variant="caption" color="var(--danger)" role="alert">
                {view.statusText}
              </Typography>
            )}

            <div className="update-notification__actions">
              {showAvailable && (
                <>
                  <Button variant="secondary" size="sm" onClick={actions.dismiss}>
                    稍后提醒
                  </Button>
                  <Button variant="primary" size="sm" onClick={actions.download}>
                    立即更新
                  </Button>
                </>
              )}

              {showDownloading && (
                <Button variant="secondary" size="sm" onClick={actions.dismiss}>
                  取消
                </Button>
              )}

              {showReady && (
                <Button variant="primary" size="sm" onClick={actions.install}>
                  安装并重启
                </Button>
              )}

              {showError && (
                <>
                  <Button variant="secondary" size="sm" onClick={actions.dismiss}>
                    稍后提醒
                  </Button>
                  {view.settingsActionLabel && actions.openSettings && (
                    <Button variant="secondary" size="sm" onClick={actions.openSettings}>
                      {view.settingsActionLabel}
                    </Button>
                  )}
                  <Button variant="primary" size="sm" onClick={actions.retry}>
                    重试
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
