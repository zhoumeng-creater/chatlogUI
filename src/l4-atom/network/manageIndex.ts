import { AI_BASE_URL } from '@/utils/constants';
import { requestJson } from "./httpClient";
import { adaptSemanticIndexActionResult, type SemanticIndexActionResult } from "./semanticAdapters";

type IndexAction = 'rebuild' | 'pause' | 'resume' | 'clear';

export async function manageIndex(action: IndexAction): Promise<SemanticIndexActionResult> {
  const endpoints: Record<IndexAction, string> = {
    rebuild: `${AI_BASE_URL}/api/v1/semantic/index/rebuild`,
    pause: `${AI_BASE_URL}/api/v1/semantic/index/pause`,
    resume: `${AI_BASE_URL}/api/v1/semantic/index/resume`,
    clear: `${AI_BASE_URL}/api/v1/semantic/index/clear`,
  };

  const data = await requestJson(endpoints[action], { method: 'POST' });
  return adaptSemanticIndexActionResult(data);
}
