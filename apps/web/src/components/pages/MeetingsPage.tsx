import { useState } from "react";
import { EmptyState, SectionCard, StatusBadge } from "../shared/Ui";
import { meetingStatusText, notificationTypeText, toDatetimeLocal } from "../../utils/helpers";
import type { Actor, Meeting, NotificationItem } from "../../types";

interface MeetingsPageProps {
  actor: Actor;
  meetings: Meeting[];
  notifications: NotificationItem[];
  onCreateMeeting: (payload: {
    title: string;
    startsAt: string;
    endsAt: string;
    location: string;
    onlineUrl?: string;
    participantIds: string[];
    summary: string;
  }) => Promise<void>;
  onPublishAnnouncement: (payload: { title: string; content: string }) => Promise<void>;
  onMarkNotificationRead: (notificationId: string) => Promise<void>;
}

export function MeetingsPage({
  actor,
  meetings,
  notifications,
  onCreateMeeting,
  onPublishAnnouncement,
  onMarkNotificationRead
}: MeetingsPageProps) {
  const [meetingDraft, setMeetingDraft] = useState({
    title: "课题组周会",
    startsAt: toDatetimeLocal(new Date(Date.now() + 86400000)),
    endsAt: toDatetimeLocal(new Date(Date.now() + 90000000)),
    location: "实验室会议室",
    onlineUrl: "",
    summary: "同步实验进展、审批与下周安排。"
  });
  const [announcementDraft, setAnnouncementDraft] = useState({
    title: "实验室通知",
    content: "请相关成员按时提交本周实验记录与会议纪要。"
  });

  return (
    <div className="page-grid">
      <div className="split-layout">
        <SectionCard title="会议排期" eyebrow="Meetings">
          <div className="data-list">
            {meetings.length === 0 ? (
              <EmptyState title="暂无会议" text="创建会议后，这里会展示预约、完成与取消状态。" />
            ) : (
              meetings.map((meeting) => (
                <article key={meeting.id} className="meeting-card">
                  <div className="row-inline spread">
                    <div>
                      <strong>{meeting.title}</strong>
                      <small>{meeting.createdByName}</small>
                    </div>
                    <StatusBadge tone={meeting.status === "completed" ? "muted" : meeting.status === "cancelled" ? "danger" : "active"}>
                      {meetingStatusText(meeting.status)}
                    </StatusBadge>
                  </div>
                  <p>{meeting.summary}</p>
                  <div className="meta-grid">
                    <span>{new Date(meeting.startsAt).toLocaleString("zh-CN")}</span>
                    <span>{meeting.location}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="通知收件箱" eyebrow="Inbox">
          <div className="data-list">
            {notifications.length === 0 ? (
              <EmptyState title="暂无通知" text="公告、审批和任务提醒会在这里汇总。" />
            ) : (
              notifications.map((item) => (
                <article key={item.id} className={item.readAt ? "notice-row" : "notice-row unread"}>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{notificationTypeText(item.type)}</small>
                    <p>{item.content}</p>
                  </div>
                  {!item.readAt ? (
                    <button type="button" className="tertiary-button" onClick={() => onMarkNotificationRead(item.id)}>
                      标记已读
                    </button>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {(actor.permissions.includes("meeting:write") || actor.role === "lab_admin") ? (
        <div className="split-layout">
          <SectionCard title="创建会议" eyebrow="Schedule">
            <form
              className="form-grid compact"
              onSubmit={async (event) => {
                event.preventDefault();
                await onCreateMeeting({
                  ...meetingDraft,
                  participantIds: []
                });
              }}
            >
              <label>
                会议主题
                <input
                  value={meetingDraft.title}
                  onChange={(event) =>
                    setMeetingDraft((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </label>
              <label>
                开始时间
                <input
                  type="datetime-local"
                  value={meetingDraft.startsAt}
                  onChange={(event) =>
                    setMeetingDraft((current) => ({ ...current, startsAt: event.target.value }))
                  }
                />
              </label>
              <label>
                结束时间
                <input
                  type="datetime-local"
                  value={meetingDraft.endsAt}
                  onChange={(event) =>
                    setMeetingDraft((current) => ({ ...current, endsAt: event.target.value }))
                  }
                />
              </label>
              <label>
                地点
                <input
                  value={meetingDraft.location}
                  onChange={(event) =>
                    setMeetingDraft((current) => ({ ...current, location: event.target.value }))
                  }
                />
              </label>
              <label>
                摘要
                <textarea
                  value={meetingDraft.summary}
                  onChange={(event) =>
                    setMeetingDraft((current) => ({ ...current, summary: event.target.value }))
                  }
                />
              </label>
              <button className="primary-button">创建会议</button>
            </form>
          </SectionCard>

          <SectionCard title="发布公告" eyebrow="Announcement">
            <form
              className="form-grid compact"
              onSubmit={async (event) => {
                event.preventDefault();
                await onPublishAnnouncement(announcementDraft);
              }}
            >
              <label>
                公告标题
                <input
                  value={announcementDraft.title}
                  onChange={(event) =>
                    setAnnouncementDraft((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </label>
              <label>
                公告内容
                <textarea
                  value={announcementDraft.content}
                  onChange={(event) =>
                    setAnnouncementDraft((current) => ({ ...current, content: event.target.value }))
                  }
                />
              </label>
              <button className="secondary-button">发布公告</button>
            </form>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
