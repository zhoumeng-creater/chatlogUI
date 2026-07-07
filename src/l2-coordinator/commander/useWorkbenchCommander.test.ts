import { describe, expect, it } from "vitest";
import commanderSource from "./useWorkbenchCommander.ts?raw";

describe("useWorkbenchCommander", () => {
  it("builds selected-fragment exports with the selected-fragment source", () => {
    const selectedExportBlock = commanderSource.slice(
      commanderSource.indexOf("const selectedFragmentExport"),
      commanderSource.indexOf("const commandBar"),
    );

    expect(selectedExportBlock).toMatch(/source:\s*"conversation_selection",\s*formats/);
    expect(selectedExportBlock).toMatch(/createConversationExportArtifact\(\{\s*source:\s*"conversation_selection"/);
    expect(selectedExportBlock).toContain("createConversationExportArtifact");
  });

  it("implements message time jump by highlighting and scrolling to the clicked row", () => {
    const jumpBlock = commanderSource.slice(
      commanderSource.indexOf('if (actionId === "jump-to-time")'),
      commanderSource.indexOf('if (actionId === "find-similar")'),
    );

    expect(jumpBlock).toContain("chat.setAnchorHit(message.id)");
    expect(jumpBlock).toContain("已定位到");
  });
});
