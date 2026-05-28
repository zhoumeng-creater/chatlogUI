export const SIDECAR_PORT = 5030;
export const HEALTH_CHECK_URL = `http://127.0.0.1:${SIDECAR_PORT}/health`;
export const HEALTH_CHECK_INTERVAL_MS = 2000;
export const HEALTH_CHECK_TIMEOUT_MS = 30000;
export const HEALTH_CHECK_SUCCESS_COUNT = 3;
export const SHUTDOWN_TIMEOUT_MS = 5000;

// ========== Sprint 3: AI 语义分析常量 ==========

export const AI_BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

export const SSE_RECONNECT_MAX_ATTEMPTS = 3;
export const SSE_RECONNECT_BASE_DELAY_MS = 1000;
export const SSE_TIMEOUT_MS = 60000;

export const INDEX_POLL_INTERVAL_MS = 1000;
export const INDEX_BUILD_TIMEOUT_MS = 30 * 60 * 1000;

export const SEMANTIC_SEARCH_DEBOUNCE_MS = 800;
export const SEMANTIC_SEARCH_DEFAULT_LIMIT = 20;

export const QA_MAX_HISTORY = 100;
