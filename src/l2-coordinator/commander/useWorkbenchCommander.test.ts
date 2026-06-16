import { describe, expect, it } from "vitest";
import commanderSource from "./useWorkbenchCommander.ts?raw";

describe("useWorkbenchCommander", () => {
  it("builds selected-fragment exports with the selected-fragment source", () => {
    const selectedExportBlock = commanderSource.slice(
      commanderSource.indexOf("const selectedFragmentExport"),
      commanderSource.indexOf("const commandBar"),
    );

    expect(selectedExportBlock).toContain('source: "conversation_selection",\n    formats');
    expect(selectedExportBlock).toContain('createConversationExportArtifact({\n        source: "conversation_selection"');
    expect(selectedExportBlock).toContain("createConversationExportArtifact");
  });
});
