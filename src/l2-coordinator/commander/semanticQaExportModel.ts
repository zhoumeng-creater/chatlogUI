import {
  createAiExportArtifact,
  type AiExportInput,
  type BusinessExportArtifact,
} from "./businessExportModel";

export interface SemanticQaExportArtifactInput extends AiExportInput {
  evidence: Array<Record<string, unknown>>;
}

export function createSemanticQaExportArtifact(
  input: SemanticQaExportArtifactInput,
): BusinessExportArtifact {
  return createAiExportArtifact(input);
}
