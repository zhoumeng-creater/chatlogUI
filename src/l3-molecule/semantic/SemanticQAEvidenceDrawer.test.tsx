import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import drawerSource from "./SemanticQAEvidenceDrawer.tsx?raw";
import { SemanticQAEvidenceDrawer } from "./SemanticQAEvidenceDrawer";

describe("SemanticQAEvidenceDrawer", () => {
  it("labels exact evidence anchors separately from conversation-only fallbacks", () => {
    const html = renderToStaticMarkup(
      <SemanticQAEvidenceDrawer
        message={{
          id: "answer-1",
          evidence: [
            {
              talker: "synthetic_room",
              talker_name: "Synthetic Room",
              local_id: 42,
              time: "2026-01-02 09:00",
              content: "Synthetic anchored evidence",
            },
            {
              talker: "synthetic_room",
              talker_name: "Synthetic Room",
              time: "2026-01-02 09:02",
              content: "Synthetic unanchored evidence",
            },
          ],
        }}
        privacyOn={false}
        onClose={vi.fn()}
        onUseEntityCandidate={vi.fn()}
        onOpenSource={vi.fn()}
      />,
    );

    expect(html).toContain("打开到证据");
    expect(html).toContain("打开会话");
    expect(html).toContain("证据未提供消息锚点，打开后需在会话内手动核对。");
  });

  it("uses dialog semantics and exposes evidence export from the drawer", () => {
    const html = renderToStaticMarkup(
      <SemanticQAEvidenceDrawer
        message={{
          id: "answer-1",
          evidence: [
            {
              talker: "synthetic_room",
              talker_name: "Synthetic Room",
              local_id: 42,
              time: "2026-01-02 09:00",
              content: "Synthetic anchored evidence",
            },
          ],
        }}
        privacyOn={false}
        onClose={vi.fn()}
        onUseEntityCandidate={vi.fn()}
        onOpenSource={vi.fn()}
        {...({ onExportEvidence: vi.fn(), exportDisabledReason: null } as Record<string, unknown>)}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="问答证据"');
    expect(html).toContain("导出证据");
  });

  it("uses shared overlay focus helpers for initial focus and restoration", () => {
    expect(drawerSource).toContain("focusInitialOverlayTarget");
    expect(drawerSource).toContain("restoreFocusTarget");
    expect(drawerSource).toContain("shouldCloseOverlayOnKey");
  });
});
