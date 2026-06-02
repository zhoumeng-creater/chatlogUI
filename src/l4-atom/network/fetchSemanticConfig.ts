import { AI_BASE_URL } from '@/utils/constants';
import { requestJson } from "./httpClient";
import { adaptSemanticConfig, type SemanticConfigView } from "./semanticAdapters";

export type SemanticConfigDraft = SemanticConfigView | object;

export async function fetchSemanticConfig(): Promise<SemanticConfigView | null> {
  const data = await requestJson(`${AI_BASE_URL}/api/v1/semantic/config`);
  return adaptSemanticConfig(data);
}

export async function setSemanticConfig(
  config: SemanticConfigDraft
): Promise<void> {
  await requestJson(`${AI_BASE_URL}/api/v1/semantic/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}
