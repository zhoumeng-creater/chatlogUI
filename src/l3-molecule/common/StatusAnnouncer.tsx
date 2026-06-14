import { maskDiagnosticText } from "@/utils/maskSecrets";
import { containsUnsafeDisplayText } from "@/utils/privacyDisplay";

interface StatusAnnouncerProps {
  message: string | null | undefined;
  privacyOn?: boolean;
  privacySafeMessage?: string | null;
  politeness?: "polite" | "assertive";
  id?: string;
  className?: string;
}

export function StatusAnnouncer({
  message,
  privacyOn = false,
  privacySafeMessage = null,
  politeness = "polite",
  id,
  className = "sr-only",
}: StatusAnnouncerProps) {
  const announcement = getSafeAnnouncement({
    message,
    privacyOn,
    privacySafeMessage,
  });

  if (!announcement) return null;

  return (
    <div
      id={id}
      className={className}
      role={politeness === "assertive" ? "alert" : "status"}
      aria-live={politeness}
    >
      {announcement}
    </div>
  );
}

function getSafeAnnouncement({
  message,
  privacyOn,
  privacySafeMessage,
}: {
  message: string | null | undefined;
  privacyOn: boolean;
  privacySafeMessage: string | null;
}): string {
  const safeOverride = privacySafeMessage?.trim();
  if (safeOverride) {
    return maskDiagnosticText(safeOverride, { privacyMode: true });
  }

  const raw = message?.trim() ?? "";
  if (!raw) return "";

  const masked = maskDiagnosticText(raw, { privacyMode: privacyOn || containsUnsafeDisplayText(raw) });
  if (privacyOn || containsUnsafeDisplayText(masked)) {
    return "状态已更新";
  }

  return masked;
}
