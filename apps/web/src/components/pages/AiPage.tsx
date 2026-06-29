import { useState } from "react";
import { EmptyState, SectionCard, StatusBadge } from "../shared/Ui";
import type {
  Actor,
  ChatMessage,
  FaqTemplate,
  KnowledgeDocument,
  KnowledgeSource
} from "../../types";

interface AiPageProps {
  actor: Actor;
  messages: ChatMessage[];
  loading: boolean;
  error: string;
  sources: KnowledgeSource[];
  knowledgeDocs: KnowledgeDocument[];
  faqTemplates: FaqTemplate[];
  onSendMessage: (message: string) => Promise<void>;
  onClearHistory: () => Promise<void>;
  onCreateKnowledge: (payload: {
    title: string;
    content: string;
    category: string;
    tags: string[];
  }) => Promise<void>;
  onDeleteKnowledge: (id: string) => Promise<void>;
}

export function AiPage({
  actor,
  messages,
  loading,
  error,
  sources,
  knowledgeDocs,
  faqTemplates,
  onSendMessage,
  onClearHistory,
  onCreateKnowledge,
  onDeleteKnowledge
}: AiPageProps) {
  const [message, setMessage] = useState("");
  const [knowledgeDraft, setKnowledgeDraft] = useState({
    title: "",
    content: "",
    category: "general",
    tags: ""
  });

  return (
    <div className="page-grid">
      <div className="split-layout">
        <SectionCard
          title="AI 协作台"
          eyebrow="Assistant"
          extra={
            <button type="button" className="secondary-button" onClick={onClearHistory}>
              清空历史
            </button>
          }
        >
          <div className="ai-layout">
            <div className="ai-chat-card">
              <div className="ai-thread">
                {messages.length === 0 ? (
                  <div className="empty-chat">
                    <span className="feature-glyph">✦</span>
                    <strong>知识问答已就绪</strong>
                    <p>可以提问流程、项目背景、会议准备或库存协同问题。</p>
                  </div>
                ) : (
                  messages.map((item, index) => (
                    <article key={`${item.role}-${index}`} className={`chat-bubble ${item.role}`}>
                      <small>{item.role === "assistant" ? "实验室 AI 助手" : "你"}</small>
                      <p>{item.content}</p>
                    </article>
                  ))
                )}
              </div>
              {error ? <div className="error-banner">{error}</div> : null}
              <form
                className="chat-input-row"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await onSendMessage(message);
                  setMessage("");
                }}
              >
                <textarea
                  value={message}
                  placeholder="输入问题，例如：帮我整理当前项目待办与本周会议要点"
                  onChange={(event) => setMessage(event.target.value)}
                />
                <button className="primary-icon-button" disabled={loading}>
                  <span aria-hidden="true">↗</span>
                </button>
              </form>
            </div>

            <aside className="ai-sidecard">
              <strong>参考来源</strong>
              {sources.length === 0 ? (
                <EmptyState title="暂无引用来源" text="当回答命中知识库时，会在这里列出依据。" />
              ) : (
                <div className="data-list compact">
                  {sources.map((source) => (
                    <article key={source.id} className="source-card">
                      <strong>{source.title}</strong>
                      <p>{source.snippet}</p>
                    </article>
                  ))}
                </div>
              )}

              <strong>快捷提问</strong>
              <div className="faq-list">
                {faqTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="faq-pill"
                    onClick={() => setMessage(template.question)}
                  >
                    {template.question}
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </SectionCard>
      </div>

      {actor.permissions.includes("ai:manage") ? (
        <div className="split-layout">
          <SectionCard title="知识库管理" eyebrow="Knowledge Base">
            <form
              className="form-grid compact"
              onSubmit={async (event) => {
                event.preventDefault();
                await onCreateKnowledge({
                  title: knowledgeDraft.title,
                  content: knowledgeDraft.content,
                  category: knowledgeDraft.category,
                  tags: knowledgeDraft.tags
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                });
                setKnowledgeDraft({ title: "", content: "", category: "general", tags: "" });
              }}
            >
              <label>
                文档标题
                <input
                  value={knowledgeDraft.title}
                  onChange={(event) =>
                    setKnowledgeDraft((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </label>
              <label>
                分类
                <input
                  value={knowledgeDraft.category}
                  onChange={(event) =>
                    setKnowledgeDraft((current) => ({ ...current, category: event.target.value }))
                  }
                />
              </label>
              <label>
                标签
                <input
                  value={knowledgeDraft.tags}
                  placeholder="以逗号分隔"
                  onChange={(event) =>
                    setKnowledgeDraft((current) => ({ ...current, tags: event.target.value }))
                  }
                />
              </label>
              <label>
                内容
                <textarea
                  value={knowledgeDraft.content}
                  onChange={(event) =>
                    setKnowledgeDraft((current) => ({ ...current, content: event.target.value }))
                  }
                />
              </label>
              <button className="secondary-button">添加知识文档</button>
            </form>
          </SectionCard>

          <SectionCard title="已收录文档" eyebrow="Documents">
            <div className="data-list">
              {knowledgeDocs.length === 0 ? (
                <EmptyState
                  title="暂无知识文档"
                  text="添加常见流程、SOP 或项目背景后，AI 回复会更可靠。"
                />
              ) : (
                knowledgeDocs.map((doc) => (
                  <article key={doc.id} className="knowledge-card">
                    <div className="row-inline spread">
                      <div>
                        <strong>{doc.title}</strong>
                        <small>{doc.category}</small>
                      </div>
                      <StatusBadge tone="muted">{doc.tags.join(" / ") || "未标记"}</StatusBadge>
                    </div>
                    <p>{doc.content}</p>
                    <button
                      type="button"
                      className="tertiary-button"
                      onClick={() => onDeleteKnowledge(doc.id)}
                    >
                      删除
                    </button>
                  </article>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
