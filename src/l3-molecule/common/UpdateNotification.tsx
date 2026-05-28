import { motion, AnimatePresence } from "framer-motion";
import { useUpdateCommander } from "@l2/commander/useUpdateCommander";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";

export function UpdateNotification() {
  const update = useUpdateCommander();

  const showAvailable = update.status === "available";
  const showDownloading = update.status === "downloading";
  const showReady = update.status === "ready";
  const showError = update.status === "error";
  const show = showAvailable || showDownloading || showReady || showError;

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={update.dismissUpdate}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(4px)",
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 9999,
              width: 340,
              maxWidth: "90vw",
              background: "rgba(30, 30, 50, 0.95)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(74, 158, 255, 0.2)",
              borderRadius: 16,
              boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <Typography variant="h3" weight={600}>
              {showReady
                ? "下载完成"
                : showError
                  ? "更新失败"
                  : showDownloading
                    ? `正在下载 v${update.version}`
                    : `发现新版本 v${update.version}`}
            </Typography>

            {update.notes && showAvailable && (
              <div
                style={{
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 8,
                  padding: 12,
                  maxHeight: 120,
                  overflowY: "auto",
                }}
              >
                <Typography
                  variant="caption"
                  color="var(--color-text-secondary)"
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {update.notes}
                </Typography>
              </div>
            )}

            {showDownloading && (
              <div>
                <div
                  style={{
                    width: "100%",
                    height: 6,
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    style={{
                      height: "100%",
                      background: "linear-gradient(90deg, #007AFF, #5856D6)",
                      borderRadius: 3,
                    }}
                    animate={{ width: `${update.progress}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                </div>
                <Typography
                  variant="caption"
                  color="var(--color-text-tertiary)"
                  style={{ marginTop: 8, textAlign: "center" }}
                >
                  {update.totalBytes > 0
                    ? `${formatBytes(update.downloadedBytes)} / ${formatBytes(update.totalBytes)}`
                    : `${formatBytes(update.downloadedBytes)} 已下载`}
                </Typography>
              </div>
            )}

            {showError && (
              <Typography variant="caption" color="#FF3B30">
                {update.errorMessage}
              </Typography>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              {showAvailable && (
                <>
                  <AppleButton
                    variant="secondary"
                    size="sm"
                    onClick={update.dismissUpdate}
                  >
                    稍后提醒
                  </AppleButton>
                  <AppleButton
                    variant="primary"
                    size="sm"
                    onClick={update.downloadUpdate}
                  >
                    立即更新
                  </AppleButton>
                </>
              )}

              {showDownloading && (
                <AppleButton
                  variant="secondary"
                  size="sm"
                  onClick={update.dismissUpdate}
                >
                  取消
                </AppleButton>
              )}

              {showReady && (
                <AppleButton
                  variant="primary"
                  size="sm"
                  onClick={update.installAndRestart}
                >
                  安装并重启
                </AppleButton>
              )}

              {showError && (
                <>
                  <AppleButton
                    variant="secondary"
                    size="sm"
                    onClick={update.dismissUpdate}
                  >
                    稍后提醒
                  </AppleButton>
                  <AppleButton
                    variant="primary"
                    size="sm"
                    onClick={update.downloadUpdate}
                  >
                    重试
                  </AppleButton>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
