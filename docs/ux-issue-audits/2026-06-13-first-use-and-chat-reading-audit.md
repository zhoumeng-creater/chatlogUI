# 2026-06-13 首次使用与聊天阅读体验问题审计

## 背景

本文件记录用户在 2026-06-13 提出的 8 组体验问题，并逐项核对当前代码是否支持这些判断。结论只基于当前仓库源码、项目验收标准和可见测试/fixture，不等同于已经完成修复。

审计分支：`codex/dev`

参考标准：

- `docs/product-acceptance-standards.md`
- `docs/ui-development-standards.md`

结论标记：

- `成立`：当前代码直接证明问题存在。
- `部分成立`：代码证明存在风险或局部问题，但用户描述的完整现象还需要运行时/后端数据验证。
- `待验证`：需要真实后端、真实数据或视觉回归证据才能下结论。

## 摘要

| 编号 | 问题 | 结论 | 优先级 | 主要证据 |
| --- | --- | --- | --- | --- |
| 1 | 开始页没有围绕“第一次成功导入并进入工作台”组织 | 成立 | P1 | `SetupCenterView` 将主操作放在面板后；手动配置暴露底层字段；目录选择/自动探测能力未统一接入 |
| 2 | 公众号、服务号、企业微信分类缺失 | 部分成立 | P1 | 前端 UI 只暴露最近/私聊/群聊；适配层只有 official/folded 雏形；服务号/企业微信需要后端字段确认 |
| 3 | 打开会话后最近消息显示不出来 | 部分成立 | P0 | 前端固定 `limit=50&offset=0`，无“最新页”契约；现象是否必现取决于后端 offset 排序 |
| 4 | 阅读交互反直觉、未读数未真实接入 | 成立 | P0/P1 | 普通打开无滚动到底部；加载更早无滚动锚点保持；会话 unread 适配为 0 |
| 5 | 消息气泡自己/对方方向不可靠 | 成立 | P0 | `adaptHistoryMessage()` 硬编码 `direction: "unknown"`；渲染层将 unknown 当中性气泡 |
| 6 | 空状态和错误状态太笼统 | 成立 | P1 | 消息空态只显示“后端没有返回该会话的聊天记录” |
| 7 | 设置页是跨模块跳转枢纽，不是真正设置页 | 成立 | P1 | 数据与服务、AI 与语义只显示摘要并跳到 `/` 或 `/ai`；设置校验为空实现 |
| 8 | 内部名词直接暴露给用户 | 成立 | P2 | 多处普通界面文案出现 `chatlog_alpha`、`Sidecar`、`HTTP`、`Data Key`、版本号等内部词 |

## 1. 开始页主流程没有围绕首次成功导入组织

结论：成立。

用户任务应是“选择/导入本地微信数据，启动或连接服务，确认数据库可读，进入工作台”。当前实现更接近设置/诊断控制台。

代码证据：

- `src/l1-entry/pages/SetupCenterView.tsx:20` 先渲染标题区，`src/l1-entry/pages/SetupCenterView.tsx:34` 渲染右侧“状态摘要”，`src/l1-entry/pages/SetupCenterView.tsx:57` 才进入设置流程。
- `src/l1-entry/pages/SetupCenterView.tsx:58` 到 `src/l1-entry/pages/SetupCenterView.tsx:65` 先显示步骤条、路径选择器和当前面板，主按钮区在 `src/l1-entry/pages/SetupCenterView.tsx:116`，诊断信息在 `src/l1-entry/pages/SetupCenterView.tsx:149`。
- `src/l2-coordinator/commander/setupCenterViewModel.ts:393` 到 `src/l2-coordinator/commander/setupCenterViewModel.ts:398` 固定加入“隐私保护”成功项。
- `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx:43` 到 `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx:146` 暴露数据目录、工作目录、平台、版本号、完整版本号、Data Key、Image Key、HTTP 地址、解密媒体缓存等字段。
- `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx:50` 和 `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx:60` 的目录字段是普通文本输入，没有目录选择按钮。
- 自动目录选择能力存在于 `src/l4-atom/system/openDirectoryPicker.ts:1` 到 `src/l4-atom/system/openDirectoryPicker.ts:13`，自动导入路径在 `src/l2-coordinator/commander/useSetupCommander.ts:230` 到 `src/l2-coordinator/commander/useSetupCommander.ts:235` 调用它。
- 微信目录自动探测能力存在于 `src/l4-atom/system/detectWxPath.ts:11` 到 `src/l4-atom/system/detectWxPath.ts:16` 和 `src-tauri/src/wechat_detect.rs:38` 到 `src-tauri/src/wechat_detect.rs:65`，但未接入开始页手动面板。
- 本地校验和 Rust 校验都要求底层字段：`src/l2-coordinator/commander/setupManualValidation.ts:31` 到 `src/l2-coordinator/commander/setupManualValidation.ts:60`，`src-tauri/src/config_store.rs:74` 到 `src-tauri/src/config_store.rs:109`。

建议记录为 P1 产品化修复：开始页应重排为首次导入向导，把“选择目录/自动探测/导入并进入工作台”放在主路径；手动配置降级为高级诊断/导入配置文件流。

## 2. 公众号、服务号、企业微信分类缺失

结论：部分成立。

前端 UI 层确实没有接住更细账号类型。是否能准确区分“服务号、企业微信、企业联系人、系统通知”等，需要确认 `chatlog_alpha` 当前会返回哪些字段。

代码证据：

- `src/l3-molecule/chat/conversationDisplay.ts:3` 的筛选类型只有 `recent | private | group`。
- `src/l3-molecule/chat/ConversationListToolbar.tsx:4` 到 `src/l3-molecule/chat/ConversationListToolbar.tsx:8` 只显示“最近 / 私聊 / 群聊”。
- `src/l3-molecule/chat/conversationDisplay.ts:26` 到 `src/l3-molecule/chat/conversationDisplay.ts:29` 过滤逻辑只看 `conversation.isGroup`。
- `src/l3-molecule/chat/conversationDisplay.ts:42` 到 `src/l3-molecule/chat/conversationDisplay.ts:52` badge 只有“最近 / 群聊 / 联系人”。
- `src/l4-atom/network/chatlogAdapters.ts:168` 到 `src/l4-atom/network/chatlogAdapters.ts:176` 已有 `official_account` 和 `folded` 雏形，且 `gh_` 会归为公众号。
- `src/l4-atom/network/chatlogAdapters.ts:195` 到 `src/l4-atom/network/chatlogAdapters.ts:211` 将 contact 转 conversation 时硬编码 `chatType: "private"`。
- `src/l2-coordinator/data-clerk/stores/useChatStore.ts:5` 到 `src/l2-coordinator/data-clerk/stores/useChatStore.ts:19` 的会话模型没有独立 `accountKind` 一等字段。

建议记录为 P1 功能修复：新增统一账号维度，例如 `accountKind = private | group | official_account | subscription_account | service_account | enterprise_contact | enterprise_account | system | folded | unknown`。短期 UI 至少应支持“全部、私聊、群聊、公众号/服务号、企业微信、系统/折叠”分组，并对后端暂不支持的类型显示明确原因。

## 3. 最近消息显示不出来

结论：部分成立，风险等级 P0。

当前前端没有定义“首次打开会话加载最新 50 条”的契约。用户报告的“只显示之前一段时间的消息”是否必现，取决于后端 `/api/v1/history?offset=0` 返回的是最早页还是最新页，以及返回顺序是正序还是倒序。即使后端当前碰巧返回最新页，前端也没有保护这个产品语义。

代码证据：

- 普通打开会话在 `src/l2-coordinator/commander/useChatCommander.ts:96` 到 `src/l2-coordinator/commander/useChatCommander.ts:118` 固定请求 `{ chat, limit: 50, offset: 0 }`。
- 后续加载更多在 `src/l2-coordinator/commander/useChatCommander.ts:131` 到 `src/l2-coordinator/commander/useChatCommander.ts:152` 使用 `messages.length` 作为 `nextOffset`。
- `src/l4-atom/network/fetchHistory.ts:28` 到 `src/l4-atom/network/fetchHistory.ts:51` 只传 `chat/limit/offset/since/until` 等参数，没有 `latest/order/cursor` 参数。
- `src/l4-atom/network/chatlogAdapters.ts:92` 到 `src/l4-atom/network/chatlogAdapters.ts:110` 直接按后端顺序 `map` 消息，不按时间排序。
- `src/l4-atom/network/chatlogRawTypes.ts:225` 到 `src/l4-atom/network/chatlogRawTypes.ts:235` 原始响应有 `total_count/count/limit/offset`，但前端没有用 `total_count` 计算最后一页。

建议记录为 P0 修复：先确认后端历史接口分页排序契约；若只支持 offset 且 `offset=0` 是最早页，前端应先获取总数或使用后端新增参数加载最新页。无论后端顺序如何，前端内部应统一按时间正序渲染。

## 4. 阅读交互与未读数

结论：成立。

普通聊天阅读模型应是打开会话看到最近消息，向上滚动加载更早消息。当前实现只有顶部加载更早按钮的外形，没有保证最新页、底部定位和加载前插后的视口稳定。

代码证据：

- `src/l3-molecule/chat/MessageList.tsx:63` 到 `src/l3-molecule/chat/MessageList.tsx:66` 只有在搜索/锚点高亮时滚动到命中项；普通打开会话没有滚动到底部。
- `src/l2-coordinator/data-clerk/stores/useChatStore.ts:174` 到 `src/l2-coordinator/data-clerk/stores/useChatStore.ts:185` 直接把新加载消息前插到当前数组，没有记录或恢复用户原先看到的第一条消息。
- `src/l3-molecule/chat/MessageList.tsx:112` 到 `src/l3-molecule/chat/MessageList.tsx:123` 顶部有“加载更早消息”，但没有视口锚点保持逻辑。
- `src/l3-molecule/chat/MessageList.tsx` 没有“跳到最新”或“加载更新”按钮。
- 会话 `unread` 字段存在于 `src/l2-coordinator/data-clerk/stores/useChatStore.ts:14`，UI 显示在 `src/l3-molecule/chat/ConversationRow.tsx:55` 到 `src/l3-molecule/chat/ConversationRow.tsx:59`，但适配器在 `src/l4-atom/network/chatlogAdapters.ts:189`、`src/l4-atom/network/chatlogAdapters.ts:206`、`src/l4-atom/network/chatlogAdapters.ts:224` 都写成 `0`。

建议拆成 P0/P1：P0 先修首次打开最新页和底部定位；P1 接入真实未读或移除会话列表中的未读承诺。

## 5. 消息气泡方向不可靠

结论：成立，风险等级 P0。

聊天记录最基本的“我/对方”方向当前没有可靠适配。

代码证据：

- `src/l4-atom/network/chatlogAdapters.ts:59` 到 `src/l4-atom/network/chatlogAdapters.ts:90` 的 `adaptHistoryMessage()` 固定返回 `direction: "unknown"`。
- `src/l4-atom/network/chatlogAdapters.test.ts:214` 到 `src/l4-atom/network/chatlogAdapters.test.ts:229` 断言完整消息方向仍为 `unknown`。
- `src/l4-atom/network/chatlogRawTypes.ts:54` 到 `src/l4-atom/network/chatlogRawTypes.ts:74` 未声明 `is_self` 或 direction 字段；但 `e2e/fixtures/advanced-capabilities.json:538` 出现过 `is_self`。
- `src/l3-molecule/chat/transcriptDisplay.ts:26` 到 `src/l3-molecule/chat/transcriptDisplay.ts:30` 将 unknown 渲染为 neutral。
- `src/l3-molecule/chat/MessageBubble.tsx:24` 到 `src/l3-molecule/chat/MessageBubble.tsx:38` 使用 tone 生成气泡方向 class。

建议记录为 P0 修复：扩展 raw type，适配 `is_self`、后端 direction、自身 wxid 或 sender 规则，统一在 L4/L2 计算 `direction`，不要留给 L3 UI 猜。

## 6. 空状态和错误状态太笼统

结论：成立。

当前状态文案无法区分“会话类型不支持、真的没有消息、数据库未刷新、接口失败被处理为空、公众号/服务号解析缺失”等原因。

代码证据：

- `src/l3-molecule/chat/MessageList.tsx:97` 到 `src/l3-molecule/chat/MessageList.tsx:107` 空态只显示“没有消息 / 后端没有返回该会话的聊天记录”。
- `src/l3-molecule/chat/MessageList.tsx:81` 到 `src/l3-molecule/chat/MessageList.tsx:94` 错误态提供重试，但原因只有 `messagesError` 或“无法读取该会话的历史消息”。
- `src/l3-molecule/chat/conversationDisplay.ts:61` 到 `src/l3-molecule/chat/conversationDisplay.ts:70` 会话列表空态也只区分查询、私聊、群聊和“数据库已连接但没有返回最近会话”。

建议记录为 P1 修复：空态和错误态应由 L2 根据会话类型、DB readiness、后端错误族、分页范围和当前筛选翻译成“原因 + 下一步”。

## 7. 设置页边界不清

结论：成立。

设置页当前承担“状态摘要 + 跨模块跳转”，而不是稳定、可完成的长期设置入口。

代码证据：

- `src/l3-molecule/settings/SettingsLayout.tsx:6` 到 `src/l3-molecule/settings/SettingsLayout.tsx:12` 有五类设置入口。
- `src/l2-coordinator/commander/settingsConfigOwnership.ts:63` 到 `src/l2-coordinator/commander/settingsConfigOwnership.ts:83` 的“数据与服务”只给摘要和“前往设置中心修改”。
- `src/l2-coordinator/commander/settingsConfigOwnership.ts:41` 到 `src/l2-coordinator/commander/settingsConfigOwnership.ts:60` 的“AI 与语义”说明真实配置由 AI 工作台负责，并提供“前往 AI 工作台配置”。
- `src/l1-entry/pages/SettingsView.tsx:23` 到 `src/l1-entry/pages/SettingsView.tsx:44` 直接导航到 `/ai` 或 `/`。
- `src/l2-coordinator/commander/settingsValidation.ts:33` 到 `src/l2-coordinator/commander/settingsValidation.ts:42` 的 `validateSettingsPatch()` 实际为空校验。
- `src/l2-coordinator/commander/useSettingsCommander.ts:29` 到 `src/l2-coordinator/commander/useSettingsCommander.ts:44` 每次修改后立即保存。
- `src/l2-coordinator/api-docs/settings.ts:2` 定义 `WindowMaterial = "vibrancy" | "mica" | "acrylic" | "none"`；`src/l3-molecule/settings/AppearanceSettings.tsx:17` 到 `src/l3-molecule/settings/AppearanceSettings.tsx:20` 只提供 `mica` 和 `none`，且把 `mica` 标为“亚克力材质”。
- `src/l3-molecule/settings/DataSettings.tsx:48` 到 `src/l3-molecule/settings/DataSettings.tsx:55` 有“后续诊断阶段会...”这类未完成说明。
- `src/l3-molecule/settings/AboutSettings.tsx:32` 到 `src/l3-molecule/settings/AboutSettings.tsx:41` 展示依赖版本和 Sidecar 说明，普通用户决策价值较低。

建议记录为 P1 产品化修复：明确“开始页负责接入/修复接入，设置页负责长期偏好和可修改参数，工作台负责内容使用”。设置页摘要可以保留，但不能替代可完成的配置能力。

## 8. 内部名词暴露给普通用户

结论：成立。

这属于持续性设计债，不是单个组件 bug。当前文案确实把研发/运维语境暴露到普通用户路径。

代码证据：

- 开始页文案在 `src/l2-coordinator/commander/setupCenterViewModel.ts:123` 到 `src/l2-coordinator/commander/setupCenterViewModel.ts:125` 使用 `chatlog_alpha`。
- 路径选择在 `src/l2-coordinator/commander/setupCenterViewModel.ts:208` 到 `src/l2-coordinator/commander/setupCenterViewModel.ts:216` 使用“已有服务”“专家手动配置”等偏内部表达。
- 手动配置在 `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx:43` 到 `src/l3-molecule/setup/ManualAdvancedConfigPanel.tsx:146` 暴露 `chatlog_alpha`、Data Key、Image Key、HTTP 地址、完整版本号等。
- 设置关于页在 `src/l3-molecule/settings/AboutSettings.tsx:32` 到 `src/l3-molecule/settings/AboutSettings.tsx:41` 展示技术栈、依赖版本、Sidecar 版本说明。
- 开发者控制台中存在 `Sidecar` 文案，例如 `src/l3-molecule/common/DevConsole.tsx:134`、`src/l3-molecule/common/DevConsole.tsx:150`、`src/l3-molecule/common/DevConsole.tsx:297`。这些保留在开发者工具内可以接受，但不应进入普通用户主路径。

建议记录为 P2 文案治理：建立普通用户文案词表和诊断层词表。普通路径使用“本机聊天服务、数据目录、数据库、密钥已配置、可进入工作台”等任务语言；`chatlog_alpha`、Sidecar、HTTP、Data Key 等保留在高级诊断或开发者工具。

## 优先修复顺序建议

1. P0：确认并修复历史消息分页契约、首次打开最新页、底部定位和方向适配。
2. P1：重构开始页首次导入路径，统一目录选择/自动探测/配置导入。
3. P1：补齐账号类型模型、筛选、badge 和不支持状态说明。
4. P1：重做消息空态/错误态，把原因和下一步交给 L2 view model。
5. P1：明确设置页边界，移除“设置页只是跳转枢纽”的体验。
6. P2：做全局普通用户文案清理，把内部术语收敛到诊断层。

## 待后端/运行时验证

- `/api/v1/history` 的 `offset=0` 到底表示最早页还是最新页；返回顺序是时间正序还是倒序。
- `/api/v1/history` 是否返回 `is_self`、direction、自身账号字段，或是否需要另一个接口提供“我”的 wxid。
- `/api/v1/sessions`、`/api/v1/contacts`、`/api/v1/chatrooms` 是否能返回服务号、订阅号、企业微信、系统通知、折叠会话等明确类型字段。
- 真实大数据量下 `/api/v1/sessions?limit=500` 是否会截断用户期望可见的会话。
