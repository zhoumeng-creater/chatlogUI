import { Button, Spinner, Typography } from "@l4/ui";
import type { ChatMembersResult, Conversation, LoadStatus } from "@l2/data-clerk/stores/useChatStore";
import { formatMemberDisplay } from "./chatExtensionsDisplay";

interface ConversationInspectorProps {
  conversation: Conversation;
  members: ChatMembersResult | undefined;
  status: LoadStatus;
  error: string | null;
  privacyOn: boolean;
  onRefresh: () => void;
}

export function ConversationInspector({
  conversation,
  members,
  status,
  error,
  privacyOn,
  onRefresh,
}: ConversationInspectorProps) {
  if (!conversation.isGroup) return null;

  return (
    <aside className="conversation-inspector" aria-label="群成员">
      <header className="conversation-inspector__header">
        <div>
          <Typography variant="label" weight={700}>
            群成员
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {members ? `${members.count.toLocaleString()} 人` : "按需读取"}
          </Typography>
        </div>
        <Button variant="secondary" size="sm" loading={status === "loading"} onClick={onRefresh}>
          刷新成员
        </Button>
      </header>

      {status === "loading" && !members ? (
        <div className="conversation-inspector__state">
          <Spinner size={20} label="加载群成员..." />
        </div>
      ) : status === "error" ? (
        <div className="conversation-inspector__state" role="alert">
          <Typography variant="body" color="var(--text-secondary)">
            {error ?? "无法读取群成员。"}
          </Typography>
        </div>
      ) : !members || members.members.length === 0 ? (
        <div className="conversation-inspector__state">
          <Typography variant="body" color="var(--text-secondary)">
            暂无成员数据。
          </Typography>
        </div>
      ) : (
        <div className="conversation-inspector__members" role="list">
          {members.members.map((member) => (
            <div key={member.id} className="conversation-inspector__member" role="listitem">
              {formatMemberDisplay(member, privacyOn)}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
