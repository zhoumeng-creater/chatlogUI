export const settingsMessagesZhCN = {
  app: {
    productName: "chatlogUI",
  },
  status: {
    service: {
      stopped: "本机服务已停止",
      starting: "本机服务启动中",
      running: "本机服务运行中",
      error: "本机服务异常",
      ready: "本机服务就绪",
      notReady: "本机服务未就绪",
      connected: "本机服务已连接",
      unconfigured: "本机服务未配置",
    },
    database: {
      disconnected: "数据库未连接",
      connecting: "数据库连接中",
      decrypting: "数据库解密中",
      ready: "数据库就绪",
      error: "数据库异常",
      initializing: "数据库初始化中",
    },
  },
  setup: {
    service: {
      externalServiceOccupied: "已检测到外部本机聊天服务。请切换到外部服务模式连接，或手动停止该服务后再启动托管服务。",
      portOccupied: "本机聊天服务端口被其他进程占用。请关闭该进程或修改服务端口后再启动。",
    },
  },
  workbench: {
    gate: {
      serviceNotStartedStatus: "服务未启动",
      serviceDbPendingStatus: "服务运行中，数据库未就绪",
      notConfiguredTitle: "尚未配置",
      notReadyTitle: "服务尚未完全就绪",
      notConfigured: "请先完成设置中心的基本配置后再进入工作台。",
      externalServiceUnavailable: "无法连接已配置的本机聊天服务，请在设置中心检查服务地址或服务进程。",
      managedServiceNotStarted: "本机聊天服务尚未启动，请在设置中心启动服务。",
      databaseNotReady: "服务已启动但数据库尚未就绪，请稍候。",
      setupLink: "前往设置中心",
    },
  },
  search: {
    title: "搜索",
    inputLabel: "搜索内容",
    emptyState: "输入关键词后搜索聊天记录。",
    exportCurrentResults: "导出当前结果",
  },
  stats: {
    title: "统计",
    rangeLabel: "统计范围",
    exportCurrentView: "导出当前统计",
  },
  sns: {
    title: "朋友圈",
    filterLabel: "筛选动态",
    exportCurrentView: "导出当前视图",
  },
  export: {
    title: "导出",
    currentView: "当前视图",
    redactedDefault: "默认脱敏导出",
  },
  settings: {
    title: "设置",
    categories: {
      data: "数据与服务",
      appearance: "外观",
      ai: "AI 与语义",
      advanced: "隐私与诊断",
      about: "关于与更新",
    },
    appearance: {
      title: "外观",
      theme: {
        label: "主题",
        system: "跟随系统",
        light: "浅色",
        dark: "深色",
      },
      fontSize: {
        label: "字体大小",
        small: "小",
        medium: "中",
        large: "大",
      },
      material: {
        label: "窗口材质",
        vibrancy: "macOS 视觉融合",
        mica: "Windows 云母",
        acrylic: "Windows 亚克力",
        none: "不透明",
      },
      motion: {
        label: "动画效果",
        full: "标准",
        reduced: "减少",
      },
    },
    data: {
      title: "数据与服务",
      dataDirectoryLabel: "数据目录",
      dataDirectoryUnset: "未配置微信数据目录",
      keyConfiguredLabel: "密钥状态",
      keyConfiguredHint: "密钥状态由初始设置管理，不保存在 UI 设置里。",
      keyConfiguredPlaceholder: "密钥已配置",
      keyMissingPlaceholder: "密钥未配置，请前往初始设置",
      primaryAction: "前往初始设置修复",
      cacheTitle: "缓存管理",
      description: "数据目录、数据库 readiness、服务连接和密钥配置由初始设置负责；这里保留安全摘要和入口。",
      cacheDescription: "聊天记录和语义索引缓存保存在本地存储。后续诊断阶段会把缓存清理、导出和索引状态合并到统一设置中心。",
    },
    ai: {
      title: "AI 与语义",
      description: "语义搜索、问答、模型连接测试、模型密钥和索引参数由 AI 工作台负责。设置页只显示状态和入口。",
      primaryAction: "前往 AI 工作台配置",
      legacyIgnored: "已忽略旧版 AI 配置字段；真实语义配置以 AI 工作台为准。",
    },
    advanced: {
      title: "隐私与诊断",
      privacyDefaultLabel: "隐私模式默认状态",
      privacyDefaultHint: "控制新打开工作区时是否默认隐藏私人内容。",
      privacyDefaultOff: "默认关闭",
      privacyDefaultOn: "默认开启",
      developerEntryLabel: "开发者工具入口",
      developerHint: "仅控制本机高级诊断入口；复制和导出诊断仍会脱敏。",
      developerDisabled: "隐藏",
      developerEnabled: "显示",
    },
    about: {
      title: "关于",
      productName: "chatlogUI",
      productDescription: "本机聊天记录桌面工作台",
      versionPrefix: "应用版本",
      kernelTitle: "本机聊天服务内核信息",
      kernelDescription: "诊断层信息用于排查本机服务问题，普通路径不依赖这些技术名词。",
      kernelRuntimeNote: "Sidecar 版本需在运行时由本地 chatlog_alpha 提供；当前设置页不伪造版本号。",
      licenseTitle: "开源许可",
      licenseDescription: "基于本机聊天服务内核构建。本软件仅供个人学习和研究使用。",
      updateTitle: "更新",
      checkUpdate: "检查更新",
      updateChecking: "正在检查更新...",
      updateCurrent: "已是最新版本",
    },
    diagnostics: {
      title: "脱敏诊断",
      description: "默认只显示安全摘要；需要排查问题时再展开复制或导出脱敏诊断。",
      exportReady: "可导出",
      exportBlocked: "已阻止导出",
      expand: "查看脱敏诊断",
      collapse: "收起脱敏诊断",
    },
    save: {
      saving: "正在保存设置...",
      saved: "设置已保存",
      storageError: "设置暂时无法保存，请检查浏览器或桌面存储权限后重试。",
    },
    validation: {
      theme: "主题只能选择跟随系统、浅色或深色。",
      fontSize: "字体大小只能选择小、中或大。",
      reduceAnimations: "动画偏好只能保存为开启或减少。",
      windowMaterial: "窗口材质只能选择 macOS 视觉融合、Windows 云母、Windows 亚克力或不透明。",
      privacyOn: "隐私模式只能保存为开启或关闭。",
      developerMode: "开发者工具入口只能保存为显示或隐藏。",
    },
  },
} as const;

type WidenMessageValues<T> = T extends string
  ? string
  : { readonly [K in keyof T]: WidenMessageValues<T[K]> };

export type AppMessages = WidenMessageValues<typeof settingsMessagesZhCN>;
export type SettingsMessages = AppMessages;

export function flattenMessageKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return prefix ? [prefix] : [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (nested && typeof nested === "object") {
      return flattenMessageKeys(nested, nextPrefix);
    }
    return [nextPrefix];
  });
}
