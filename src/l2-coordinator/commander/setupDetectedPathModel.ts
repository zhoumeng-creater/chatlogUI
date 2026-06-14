import type { SetupDetectedPathCandidate } from "@l2/data-clerk/types/setup";

export interface SetupDetectedPathCandidateView {
  id: string;
  title: string;
  description: string;
  confidenceLabel: string;
  disabled: boolean;
}

export function buildDetectedPathCandidateViews(
  candidates: SetupDetectedPathCandidate[],
): SetupDetectedPathCandidateView[] {
  return candidates.map((candidate, index) => ({
    id: candidate.id,
    title: `微信数据目录候选 ${index + 1}`,
    description: buildCandidateDescription(candidate),
    confidenceLabel: confidenceLabel(candidate.confidence),
    disabled: !candidate.exists,
  }));
}

function buildCandidateDescription(candidate: SetupDetectedPathCandidate): string {
  const availability = candidate.exists ? "可用于导入" : "当前不可用";
  return `${sourceLabel(candidate.source)}，完整路径已隐藏，${availability}。`;
}

function sourceLabel(source: string): string {
  const normalized = source.trim().toLowerCase();
  if (normalized.includes("onedrive")) return "来自 OneDrive 文档目录";
  if (normalized.includes("document")) return "来自 Windows 文档目录";
  if (normalized.includes("library")) return "来自 macOS 用户资料目录";
  return "来自系统默认目录";
}

function confidenceLabel(confidence: string): string {
  const normalized = confidence.trim().toLowerCase();
  if (normalized === "high") return "可信度高";
  if (normalized === "medium") return "可信度中";
  if (normalized === "low") return "可信度低";
  return "可信度未知";
}
