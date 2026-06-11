import { Bell, FileText, Image, MessageSquare, RefreshCw, Star, Users } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, DisabledReason, Input, SegmentedControl, Spinner, Typography } from "@l4/ui";
import type {
  MediaAttachment,
  MediaEndpointState,
  MediaEndpointStatus,
  MediaFavoriteItem,
  MediaLoadStatus,
  MediaMember,
  MediaNewMessage,
  MediaUnreadResponse,
} from "@l2/data-clerk/stores/useMediaStore";
import {
  formatAttachmentLabel,
  formatFavoritePreview,
  formatMediaEmptyCopy,
  formatMemberDisplayName,
  summarizeMediaCounts,
} from "./mediaDisplay";
import { MediaPreviewSheet } from "./MediaPreviewSheet";

type MediaTab = "attachments" | "favorites" | "members" | "unread" | "new";
const MEMBER_PREVIEW_LIMIT = 50;

interface MediaLibraryProps {
  currentChat: string;
  privacyOn: boolean;
  attachments: MediaAttachment[];
  favorites: MediaFavoriteItem[];
  members: MediaMember[];
  memberTotal?: number;
  unread: MediaUnreadResponse;
  newMessages: MediaNewMessage[];
  status: MediaLoadStatus;
  error: string | null;
  endpointStatus: MediaEndpointStatus;
  selectedAttachment: MediaAttachment | null;
  previewResourceUrl: string;
  onRetry: () => void;
  onPreviewAttachment: (attachment: MediaAttachment) => void;
  onClosePreview: () => void;
}

export function MediaLibrary({
  currentChat,
  privacyOn,
  attachments,
  favorites,
  members,
  memberTotal,
  unread,
  newMessages,
  status,
  error,
  endpointStatus,
  selectedAttachment,
  previewResourceUrl,
  onRetry,
  onPreviewAttachment,
  onClosePreview,
}: MediaLibraryProps) {
  const [activeTab, setActiveTab] = useState<MediaTab>(() =>
    chooseInitialMediaTab({ attachments, favorites, members, unread, newMessages }),
  );
  const [memberQuery, setMemberQuery] = useState("");
  const mediaCounts = useMemo(() => summarizeMediaCounts(attachments), [attachments]);
  const reportedMemberTotal = Math.max(memberTotal ?? members.length, members.length);
  const memberLabel = reportedMemberTotal > members.length
    ? `${members.length}/${reportedMemberTotal}`
    : members.length.toLocaleString();
  const totalItems = attachments.length + favorites.length + members.length + unread.total + newMessages.length;
  const refreshDisabledReasonId = !currentChat ? "media-library-refresh-disabled-reason" : undefined;

  useEffect(() => {
    if (status === "loading") return;
    if (mediaTabHasContent(activeTab, { attachments, favorites, members, unread, newMessages })) return;
    const nextTab = chooseInitialMediaTab({ attachments, favorites, members, unread, newMessages });
    if (nextTab !== activeTab) setActiveTab(nextTab);
  }, [activeTab, attachments, favorites, members, newMessages, status, unread]);

  return (
    <aside className="media-library" aria-label="媒体与扩展">
      <div className="media-library__header">
        <div className="media-library__title">
          <Typography variant="label" weight={700}>
            媒体与扩展
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {currentChat ? `${totalItems.toLocaleString()} 项可查看内容` : "选择会话后加载扩展信息"}
          </Typography>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          disabled={!currentChat || status === "loading"}
          aria-describedby={refreshDisabledReasonId}
          aria-label="刷新媒体与扩展"
        >
          <RefreshCw size={14} />
        </Button>
      </div>
      {!currentChat && (
        <DisabledReason
          id={refreshDisabledReasonId}
          reason="先选择一个会话。选择会话后可刷新媒体与扩展。"
        />
      )}

      {!currentChat ? (
        <div className="workbench-empty-state">
          <Typography variant="label" weight={700}>
            选择会话
          </Typography>
          <Typography variant="body" color="var(--text-secondary)">
            打开会话后显示附件、收藏、成员、未读和增量消息。
          </Typography>
        </div>
      ) : error && status !== "partial" ? (
        <div className="workbench-error-state" role="alert">
          <Typography variant="label" weight={700}>
            媒体扩展加载失败
          </Typography>
          <Typography variant="body" color="var(--text-secondary)">
            {error}
          </Typography>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            重试
          </Button>
        </div>
      ) : (
        <>
          {status === "partial" && (
            <PartialEndpointAlert endpointStatus={endpointStatus} />
          )}

          <SummaryStrip
            attachmentCount={attachments.length}
            favoritesCount={favorites.length}
            membersCount={members.length}
            unreadTotal={unread.total}
            newMessageCount={newMessages.length}
            loading={status === "loading"}
          />

          {mediaCounts.length > 0 && (
            <div className="media-library__chips" aria-label="媒体类型统计">
              {mediaCounts.map((item) => (
                <span key={item.label} className="media-library__chip">
                  {item.label} {item.count.toLocaleString()}
                </span>
              ))}
            </div>
          )}

          <SegmentedControl
            label="媒体扩展视图"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: "attachments", label: `附件 ${attachments.length}` },
              { value: "favorites", label: `收藏 ${favorites.length}` },
              { value: "members", label: `成员 ${memberLabel}` },
              { value: "unread", label: `未读 ${unread.total}` },
              { value: "new", label: `增量 ${newMessages.length}` },
            ]}
          />

          <MediaBoundaryNotes
            memberCount={members.length}
            memberTotal={reportedMemberTotal}
            unreadTotal={unread.total}
            newMessageCount={newMessages.length}
          />

          <div className="media-library__body">
            {status === "loading" && (
              <div className="media-library__loading">
                <Spinner size={18} label="加载媒体扩展..." color="var(--text-muted)" />
              </div>
            )}
            {activeTab === "attachments" && (
              <AttachmentList
                attachments={attachments}
                privacyOn={privacyOn}
                onPreviewAttachment={onPreviewAttachment}
              />
            )}
            {activeTab === "favorites" && (
              <EndpointTabState label="收藏" endpoint={endpointStatus.favorites} onRetry={onRetry}>
                <FavoriteList
                  favorites={favorites}
                  privacyOn={privacyOn}
                  onPreviewAttachment={onPreviewAttachment}
                />
              </EndpointTabState>
            )}
            {activeTab === "members" && (
              <EndpointTabState label="成员" endpoint={endpointStatus.members} onRetry={onRetry}>
                <MemberList
                  members={members}
                  privacyOn={privacyOn}
                  query={memberQuery}
                  onQueryChange={setMemberQuery}
                />
              </EndpointTabState>
            )}
            {activeTab === "unread" && (
              <EndpointTabState label="未读" endpoint={endpointStatus.unread} onRetry={onRetry}>
                <UnreadList unread={unread} privacyOn={privacyOn} />
              </EndpointTabState>
            )}
            {activeTab === "new" && (
              <EndpointTabState label="增量消息" endpoint={endpointStatus.newMessages} onRetry={onRetry}>
                <NewMessageList messages={newMessages} privacyOn={privacyOn} />
              </EndpointTabState>
            )}
          </div>
        </>
      )}

      <MediaPreviewSheet
        attachment={selectedAttachment}
        resourceUrl={previewResourceUrl}
        privacyOn={privacyOn}
        onClose={onClosePreview}
      />
    </aside>
  );
}

function chooseInitialMediaTab(data: {
  attachments: MediaAttachment[];
  favorites: MediaFavoriteItem[];
  members: MediaMember[];
  unread: MediaUnreadResponse;
  newMessages: MediaNewMessage[];
}): MediaTab {
  if (data.attachments.length > 0) return "attachments";
  if (data.favorites.length > 0) return "favorites";
  if (data.members.length > 0) return "members";
  if (data.unread.total > 0) return "unread";
  if (data.newMessages.length > 0) return "new";
  return "attachments";
}

function mediaTabHasContent(
  tab: MediaTab,
  data: {
    attachments: MediaAttachment[];
    favorites: MediaFavoriteItem[];
    members: MediaMember[];
    unread: MediaUnreadResponse;
    newMessages: MediaNewMessage[];
  },
): boolean {
  if (tab === "attachments") return data.attachments.length > 0;
  if (tab === "favorites") return data.favorites.length > 0;
  if (tab === "members") return data.members.length > 0;
  if (tab === "unread") return data.unread.total > 0;
  return data.newMessages.length > 0;
}

function MediaBoundaryNotes({
  memberCount,
  memberTotal,
  unreadTotal,
  newMessageCount,
}: {
  memberCount: number;
  memberTotal: number;
  unreadTotal: number;
  newMessageCount: number;
}) {
  const notes: string[] = [];
  if (memberTotal >= MEMBER_PREVIEW_LIMIT || memberCount >= MEMBER_PREVIEW_LIMIT) {
    const totalCopy = memberTotal > memberCount ? `后端报告 ${memberTotal.toLocaleString()} 位成员；` : "";
    notes.push(`当前仅展示前 ${MEMBER_PREVIEW_LIMIT} 位成员；${totalCopy}超过已加载范围的分页需等待后端提供游标能力。`);
  }
  if (memberCount > 0) {
    notes.push("成员搜索仅筛选已加载成员；不会向后端发起全量成员查询。");
  }
  if (unreadTotal > 0 || newMessageCount > 0) {
    notes.push("当前接口未返回可定位消息锚点，未读与增量消息暂按摘要展示。");
  }
  if (notes.length === 0) return null;

  return (
    <div className="media-library__partial" role="status">
      {notes.map((note) => (
        <Typography key={note} variant="caption" color="var(--text-secondary)">
          {note}
        </Typography>
      ))}
    </div>
  );
}

function PartialEndpointAlert({ endpointStatus }: { endpointStatus: MediaEndpointStatus }) {
  const failedLabels = failedEndpointLabels(endpointStatus);
  if (failedLabels.length === 0) return null;

  return (
    <div className="media-library__partial" role="status">
      <Typography variant="label" weight={700}>
        部分媒体扩展加载失败
      </Typography>
      <Typography variant="caption" color="var(--text-secondary)">
        {failedLabels.join("、")}加载失败，其他内容仍可查看。
      </Typography>
    </div>
  );
}

function EndpointTabState({
  label,
  endpoint,
  onRetry,
  children,
}: {
  label: string;
  endpoint: MediaEndpointState;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (endpoint.status === "loading") {
    return (
      <div className="media-library__loading">
        <Spinner size={18} label={`加载${label}...`} color="var(--text-muted)" />
      </div>
    );
  }

  if (endpoint.status === "error") {
    return (
      <div className="media-library__endpoint-error" role="alert">
        <Typography variant="label" weight={700}>
          {endpoint.error || `${label}加载失败`}
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          其他媒体内容仍可查看，可刷新后重试。
        </Typography>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          重试
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

function failedEndpointLabels(endpointStatus: MediaEndpointStatus): string[] {
  const labels: Array<[keyof MediaEndpointStatus, string]> = [
    ["favorites", "收藏"],
    ["members", "成员"],
    ["unread", "未读"],
    ["newMessages", "增量消息"],
  ];

  return labels
    .filter(([key]) => endpointStatus[key].status === "error")
    .map(([, label]) => label);
}

function SummaryStrip({
  attachmentCount,
  favoritesCount,
  membersCount,
  unreadTotal,
  newMessageCount,
  loading,
}: {
  attachmentCount: number;
  favoritesCount: number;
  membersCount: number;
  unreadTotal: number;
  newMessageCount: number;
  loading: boolean;
}) {
  const items = [
    { icon: <Image size={14} />, label: "附件", value: attachmentCount },
    { icon: <Star size={14} />, label: "收藏", value: favoritesCount },
    { icon: <Users size={14} />, label: "成员", value: membersCount },
    { icon: <Bell size={14} />, label: "未读", value: unreadTotal },
    { icon: <MessageSquare size={14} />, label: "增量", value: newMessageCount },
  ];

  return (
    <div className="media-library__summary" aria-busy={loading}>
      {items.map((item) => (
        <div key={item.label} className="media-library__summary-item">
          {item.icon}
          <span>{item.label}</span>
          <strong>{item.value.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

function AttachmentList({
  attachments,
  privacyOn,
  onPreviewAttachment,
}: {
  attachments: MediaAttachment[];
  privacyOn: boolean;
  onPreviewAttachment: (attachment: MediaAttachment) => void;
}) {
  if (attachments.length === 0) return <EmptyTab label="附件" />;

  return (
    <div className="media-library__list">
      {attachments.map((attachment) => (
        <button
          key={attachment.id}
          type="button"
          className="media-library__row media-library__row--button"
          onClick={() => onPreviewAttachment(attachment)}
        >
          <Image size={16} />
          <span>{formatAttachmentLabel(attachment, privacyOn)}</span>
          <span className="media-library__row-meta">{privacyOn ? "已隐藏来源" : attachment.source}</span>
        </button>
      ))}
    </div>
  );
}

function FavoriteList({
  favorites,
  privacyOn,
  onPreviewAttachment,
}: {
  favorites: MediaFavoriteItem[];
  privacyOn: boolean;
  onPreviewAttachment: (attachment: MediaAttachment) => void;
}) {
  if (favorites.length === 0) return <EmptyTab label="收藏" />;

  return (
    <div className="media-library__list">
      {favorites.map((favorite) => (
        <div key={favorite.id} className="media-library__row">
          <Star size={16} />
          <div className="media-library__row-stack">
            <span>{formatFavoritePreview(favorite, privacyOn)}</span>
            {favorite.attachments.length > 0 ? (
              <div className="media-library__inline-actions" aria-label="收藏附件预览">
                {favorite.attachments.map((attachment) => (
                  <Button
                    key={attachment.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onPreviewAttachment(attachment)}
                  >
                    <Image size={14} />
                    预览附件
                    <span className="media-library__inline-action-label">
                      {formatAttachmentLabel(attachment, privacyOn)}
                    </span>
                  </Button>
                ))}
              </div>
            ) : (
              <span className="media-library__row-note">收藏没有可用媒体预览</span>
            )}
          </div>
          <span className="media-library__row-meta">{privacyOn ? "已隐藏时间" : favorite.time}</span>
        </div>
      ))}
    </div>
  );
}

function MemberList({
  members,
  privacyOn,
  query,
  onQueryChange,
}: {
  members: MediaMember[];
  privacyOn: boolean;
  query: string;
  onQueryChange: (query: string) => void;
}) {
  if (members.length === 0) return <EmptyTab label="成员" />;
  const normalizedQuery = privacyOn ? "" : query.trim().toLowerCase();
  const memberSearchDisabledReasonId = privacyOn ? "media-member-search-privacy-disabled-reason" : undefined;
  const filteredMembers = normalizedQuery
    ? members.filter((member) =>
        [member.displayName, member.username]
          .some((value) => value.toLowerCase().includes(normalizedQuery)))
    : members;
  const visibleMembers = filteredMembers.slice(0, MEMBER_PREVIEW_LIMIT);

  return (
    <>
      <div className="media-library__member-tools">
        <Input
          controlSize="sm"
          value={privacyOn ? "" : query}
          disabled={privacyOn}
          aria-describedby={memberSearchDisabledReasonId}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder={privacyOn ? "隐私模式已隐藏成员搜索" : "搜索已加载成员"}
          aria-label="搜索已加载成员"
        />
        {privacyOn && (
          <DisabledReason
            id={memberSearchDisabledReasonId}
            reason="隐私模式下不筛选成员，避免暴露成员身份。"
            variant="compact"
          />
        )}
        <Typography variant="caption" color="var(--text-secondary)">
          成员搜索仅筛选已加载成员。
        </Typography>
      </div>
      {visibleMembers.length === 0 ? (
        <EmptyTab label="匹配成员" />
      ) : (
        <div className="media-library__list media-library__list--members">
          {visibleMembers.map((member) => (
            <div key={member.username} className="media-library__row">
              <Users size={16} />
              <span>{formatMemberDisplayName(member, privacyOn)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function UnreadList({
  unread,
  privacyOn,
}: {
  unread: MediaUnreadResponse;
  privacyOn: boolean;
}) {
  if (unread.chats.length === 0) return <EmptyTab label="未读" />;

  return (
    <div className="media-library__list">
      {unread.chats.map((chat) => (
        <div key={chat.chat} className="media-library__row">
          <Bell size={16} />
          <span>{privacyOn ? "已隐藏会话" : chat.chat}</span>
          <span className="media-library__row-meta">{chat.count.toLocaleString()} 条</span>
        </div>
      ))}
    </div>
  );
}

function NewMessageList({
  messages,
  privacyOn,
}: {
  messages: MediaNewMessage[];
  privacyOn: boolean;
}) {
  if (messages.length === 0) return <EmptyTab label="增量消息" />;

  return (
    <div className="media-library__list">
      {messages.map((message) => (
        <div key={message.id} className="media-library__row">
          <FileText size={16} />
          <span>{privacyOn ? "已隐藏消息内容" : message.content || "新消息"}</span>
          <span className="media-library__row-meta">{privacyOn ? "已隐藏时间" : message.time}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="media-library__empty">
      <Typography variant="label" weight={700}>
        {formatMediaEmptyCopy(label)}
      </Typography>
    </div>
  );
}
