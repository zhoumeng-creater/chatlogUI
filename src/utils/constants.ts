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

// ========== Sprint 4: 3D 知识图谱常量 ==========

export const GRAPH_BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;
export const GRAPH_DEFAULT_LIMIT = 80;
export const GRAPH_MAX_LIMIT = 300;
export const GRAPH_FETCH_TIMEOUT_MS = 15000;

export const GRAPH_FORCE_LINK_DISTANCE = 2.5;
export const GRAPH_FORCE_LINK_STRENGTH = 0.3;
export const GRAPH_FORCE_CHARGE_MULTIPLIER = 2;
export const GRAPH_FORCE_COLLIDE_PADDING = 0.5;
export const GRAPH_LAYOUT_TICKS = 300;

export const GRAPH_AUTO_ROTATE_SPEED = 0.3;
export const GRAPH_CAMERA_MIN_DISTANCE = 3;
export const GRAPH_CAMERA_MAX_DISTANCE = 20;

export const GRAPH_NODE_MIN_RADIUS = 0.5;

// ========== Sprint 5a: Settings 常量 ==========

export const SETTINGS_STORAGE_KEY = "chatlog_alpha_settings";
export const SETTINGS_SIDEBAR_WIDTH = 180;
export const SETTINGS_CONTENT_MAX_WIDTH = 600;

// ========== Sprint 5b: 高级功能 Part B 常量 ==========

export const DEV_CONSOLE_MAX_LOGS = 5000;
export const DEV_CONSOLE_MAX_HEIGHT = 200;
export const DEV_CONSOLE_FONT_SIZE = 12;

export const GRAPH_TIMELINE_HEIGHT = 150;
export const GRAPH_CONTROL_BAR_HEIGHT = 32;

export const PRIVACY_STORAGE_KEY = "chatlog_alpha_settings";

// ========== Sprint 6: 更新与发布常量 ==========

export const UPDATE_CHECK_DELAY_MS = 5000;
