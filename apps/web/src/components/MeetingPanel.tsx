import type { SyntheticEvent } from "react";
import { CalendarClock, CheckCircle2, Link as LinkIcon, Megaphone } from "lucide-react";
import { meetingStatusText, notificationTypeText } from "../utils/helpers";
import type { Meeting, NotificationItem } from "../types";

interface MeetingPanelProps {
  meetings: Meeting[];
  notifications: NotificationItem[];
  setSelectedNotification: (v: NotificationItem | null) => void;
  unreadNotifications: NotificationItem[];
  canManageMeetings: boolean;
  loading: boolean;
  meetingTitle: string;
  setMeetingTitle: (v: string) => void;
  meetingStartsAt: string;
  setMeetingStartsAt: (v: string) => void;
  meetingEndsAt: string;
  setMeetingEndsAt: (v: string) => void;
  meetingLocation: string;
  setMeetingLocation: (v: string) => void;
  meetingOnlineUrl: string;
  setMeetingOnlineUrl: (v: string) => void;
  meetingParticipants: string;
  setMeetingParticipants: (v: string) => void;
  meetingSummary: string;
  setMeetingSummary: (v: string) => void;
  announcementTitle: string;
  setAnnouncementTitle: (v: string) => void;
  announcementContent: string;
  setAnnouncementContent: (v: string) => void;
  onCreateMeeting: (e: SyntheticEvent<HTMLFormElement>) => void;
  onCompleteMeeting: (meeting: Meeting) => void;
  onPublishAnnouncement: (e: SyntheticEvent<HTMLFormElement>) => void;
  onMarkNotificationRead: (n: NotificationItem) => void;
}

export function MeetingPanel({
  meetings,
  notifications,
  setSelectedNotification,
  unreadNotifications,
  canManageMeetings,
  loading,
  meetingTitle,
  setMeetingTitle,
  meetingStartsAt,
  setMeetingStartsAt,
  meetingEndsAt,
  setMeetingEndsAt,
  meetingLocation,
  setMeetingLocation,
  meetingOnlineUrl,
  setMeetingOnlineUrl,
  meetingParticipants,
  setMeetingParticipants,
  meetingSummary,
  setMeetingSummary,
  announcementTitle,
  setAnnouncementTitle,
  announcementContent,
  setAnnouncementContent,
  onCreateMeeting,
  onCompleteMeeting,
  onPublishAnnouncement,
  onMarkNotificationRead
}: MeetingPanelProps) {
  return (
    <section className="panel" id="meetings">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Meetings & Notices</p>
          <h2>会议与通知管理</h2>
        </div>
        <CalendarClock size={20} />
      </div>

      <div className="meeting-layout">
        <div className="meeting-list list-frame">
          {meetings.map((meeting) => (
            <article className="meeting-card" key={meeting.id}>
              <div>
                <b className={`pill ${meeting.status}`}>{meetingStatusText(meeting.status)}</b>
                <span>{new Date(meeting.startsAt).toLocaleString()}</span>
              </div>
              <h3>{meeting.title}</h3>
              <p>{meeting.summary}</p>
              <small>
                {meeting.location} · 参会 {meeting.participantIds.length} 人 · 创建人{" "}
                {meeting.createdByName}
              </small>
              <div className="row-actions">
                {meeting.onlineUrl ? (
                  <a href={meeting.onlineUrl} target="_blank" rel="noreferrer">
                    <LinkIcon size={15} />
                    打开会议链接
                  </a>
                ) : null}
                {canManageMeetings && meeting.status === "scheduled" ? (
                  <button type="button" onClick={() => onCompleteMeeting(meeting)}>
                    <CheckCircle2 size={15} />
                    标记完成
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          {meetings.length === 0 ? <div className="empty-row">暂无会议。</div> : null}
        </div>

        <div className="notice-list list-frame" id="notifications">
          <div className="panel-head compact">
            <div>
              <p className="eyebrow">Inbox</p>
              <h3>站内通知</h3>
            </div>
            <span>{unreadNotifications.length} 未读</span>
          </div>
          {notifications.map((notification) => (
            <article
              className={`notice-card ${notification.readAt ? "" : "unread"}`}
              key={notification.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNotification(notification)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedNotification(notification);
                }
              }}
            >
              <div>
                <b>{notificationTypeText(notification.type)}</b>
                <span>{new Date(notification.createdAt).toLocaleString()}</span>
              </div>
              <h3>{notification.title}</h3>
              <p>{notification.content}</p>
              {!notification.readAt ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onMarkNotificationRead(notification);
                  }}
                >
                  标记已读
                </button>
              ) : null}
            </article>
          ))}
          {notifications.length === 0 ? <div className="empty-row">暂无通知。</div> : null}
        </div>

        {canManageMeetings ? (
          <div className="meeting-actions">
            <form className="meeting-form" onSubmit={onCreateMeeting}>
              <h3>创建会议</h3>
              <label>
                主题
                <input value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} />
              </label>
              <label>
                开始时间
                <input
                  type="datetime-local"
                  value={meetingStartsAt}
                  onChange={(e) => setMeetingStartsAt(e.target.value)}
                />
              </label>
              <label>
                结束时间
                <input
                  type="datetime-local"
                  value={meetingEndsAt}
                  onChange={(e) => setMeetingEndsAt(e.target.value)}
                />
              </label>
              <label>
                地点
                <input
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                />
              </label>
              <label>
                腾讯会议/线上链接
                <input
                  value={meetingOnlineUrl}
                  onChange={(e) => setMeetingOnlineUrl(e.target.value)}
                />
              </label>
              <label>
                参会人 ID
                <input
                  placeholder="多个用户 ID 用英文逗号分隔"
                  value={meetingParticipants}
                  onChange={(e) => setMeetingParticipants(e.target.value)}
                />
              </label>
              <label>
                议程说明
                <textarea
                  value={meetingSummary}
                  onChange={(e) => setMeetingSummary(e.target.value)}
                />
              </label>
              <button className="primary" disabled={loading}>
                <CalendarClock size={16} />
                {loading ? "创建中..." : "创建会议"}
              </button>
            </form>

            <form className="meeting-form" onSubmit={onPublishAnnouncement}>
              <h3>发布公告</h3>
              <label>
                标题
                <input
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                />
              </label>
              <label>
                内容
                <textarea
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                />
              </label>
              <button className="primary" disabled={loading}>
                <Megaphone size={16} />
                {loading ? "发布中..." : "发布公告"}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}
