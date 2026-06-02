import { AI_BASE_URL } from '@/utils/constants';
import { requestJson } from "./httpClient";
import { adaptSemanticIndexStatus, type SemanticIndexStatus } from "./semanticAdapters";

export async function fetchIndexStatus(): Promise<SemanticIndexStatus> {
  const data = await requestJson(`${AI_BASE_URL}/api/v1/semantic/index/status`);
  return adaptSemanticIndexStatus(data);
}
