import { Bell, FileText, Image, MessageSquare, RefreshCw, Star, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, DisabledReason, SegmentedControl, Spinner, Typography } from "@l4/ui";
import type {
  MediaAttachment,
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

interface MediaLibraryProps {
  currentChat: string;
  privacyOn: boolean;
  attachments: MediaAttachment[];
  favorites: MediaFavoriteItem[];
  members: MediaMember[];
  unread: MediaUnreadResponse;
  newMessages: MediaNewMessage[];
  status: MediaLoadStatus;
  error: string | null;
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
  unread,
  newMessages,
  status,
  error,
  selectedAttachment,
  previewResourceUrl,
  onRetry,
  onPreviewAttachment,
  onClosePreview,
}: MediaLibraryProps) {
  const [activeTab, setActiveTab] = useState<MediaTab>("attachments");
  const mediaCounts = useMemo(() => summarizeMediaCounts(attachments), [attachments]);
  const totalItems = attachments.length + favorites.length + members.length + unread.total + newMessages.length;
  const refreshDisabledReasonId = !currentChat ? "media-library-refresh-disabled-reason" : undefined;

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
      ) : error ? (
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
              { value: "members", label: `成员 ${members.length}` },
              { value: "unread", label: `未读 ${unread.total}` },
              { value: "new", label: `增量 ${newMessages.length}` },
            ]}
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
              <FavoriteList favorites={favorites} privacyOn={privacyOn} />
            )}
            {activeTab === "members" && (
              <MemberList members={members} privacyOn={privacyOn} />
            )}
            {activeTab === "unread" && (
              <UnreadList unread={unread} privacyOn={privacyOn} />
            )}
            {activeTab === "new" && (
              <NewMessageList messages={newMessages} privacyOn={privacyOn} />
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
}: {
  favorites: MediaFavoriteItem[];
  privacyOn: boolean;
}) {
  if (favorites.length === 0) return <EmptyTab label="收藏" />;

  return (
    <div className="media-library__list">
      {favorites.map((favorite) => (
        <div key={favorite.id} className="media-library__row">
          <Star size={16} />
          <span>{formatFavoritePreview(favorite, privacyOn)}</span>
          <span className="media-library__row-meta">{privacyOn ? "已隐藏时间" : favorite.time}</span>
        </div>
      ))}
    </div>
  );
}

function MemberList({
  members,
  privacyOn,
}: {
  members: MediaMember[];
  privacyOn: boolean;
}) {
  if (members.length === 0) return <EmptyTab label="成员" />;

  return (
    <div className="media-library__list media-library__list--members">
      {members.map((member) => (
        <div key={member.username} className="media-library__row">
          <Users size={16} />
          <span>{formatMemberDisplayName(member, privacyOn)}</span>
        </div>
      ))}
    </div>
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
