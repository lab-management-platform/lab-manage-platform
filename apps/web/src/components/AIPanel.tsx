import type { SyntheticEvent } from "react";
import {
  BookOpen,
  Bot,
  HelpCircle,
  MessageCircle,
  Plus,
  Send,
  Trash2,
  Users,
  XCircle
} from "lucide-react";
import type { ChatMessage, FaqTemplate, KnowledgeDocument, KnowledgeSource } from "../types";

interface AIPanelProps {
  aiMessage: string;
  setAiMessage: (v: string) => void;
  aiChatMessages: ChatMessage[];
  aiLoading: boolean;
  aiError: string;
  aiSources: KnowledgeSource[];
  knowledgeDocs: KnowledgeDocument[];
  faqTemplates: FaqTemplate[];
  knowledgeTitle: string;
  setKnowledgeTitle: (v: string) => void;
  knowledgeContent: string;
  setKnowledgeContent: (v: string) => void;
  knowledgeCategory: string;
  setKnowledgeCategory: (v: string) => void;
  knowledgeTags: string;
  setKnowledgeTags: (v: string) => void;
  editingKnowledgeId: string;
  setEditingKnowledgeId: (v: string) => void;
  showKnowledgePanel: boolean;
  setShowKnowledgePanel: (v: boolean) => void;
  aiActiveTab: "chat" | "knowledge";
  setAiActiveTab: (v: "chat" | "knowledge") => void;
  onSendAiMessage: () => void;
  onClearAiHistory: () => void;
  onUseFaqTemplate: (question: string) => void;
  onLoadKnowledgeDocs: () => void;
  onCreateKnowledgeDoc: (e: SyntheticEvent<HTMLFormElement>) => void;
  onUpdateKnowledgeDoc: (id: string) => void;
  onDeleteKnowledgeDoc: (id: string) => void;
  onStartEditKnowledge: (doc: KnowledgeDocument) => void;
}

export function AIPanel({
  aiMessage,
  setAiMessage,
  aiChatMessages,
  aiLoading,
  aiError,
  aiSources,
  knowledgeDocs,
  faqTemplates,
  knowledgeTitle,
  setKnowledgeTitle,
  knowledgeContent,
  setKnowledgeContent,
  knowledgeCategory,
  setKnowledgeCategory,
  knowledgeTags,
  setKnowledgeTags,
  editingKnowledgeId,
  setEditingKnowledgeId,
  showKnowledgePanel,
  setShowKnowledgePanel,
  aiActiveTab,
  setAiActiveTab,
  onSendAiMessage,
  onClearAiHistory,
  onUseFaqTemplate,
  onLoadKnowledgeDocs,
  onCreateKnowledgeDoc,
  onUpdateKnowledgeDoc,
  onDeleteKnowledgeDoc,
  onStartEditKnowledge
}: AIPanelProps) {
  return (
    <section className="panel" id="ai">
      <div className="panel-head">
        <div>
          <p className="eyebrow">AI Assistant</p>
          <h2>AI 智能助手</h2>
        </div>
        <Bot size={20} />
      </div>

      <div className="subnav">
        <button
          type="button"
          className={aiActiveTab === "chat" ? "selected" : ""}
          onClick={() => setAiActiveTab("chat")}
        >
          <MessageCircle size={15} />
          对话问答
        </button>
        <button
          type="button"
          className={aiActiveTab === "knowledge" ? "selected" : ""}
          onClick={() => {
            setAiActiveTab("knowledge");
            onLoadKnowledgeDocs();
          }}
        >
          <BookOpen size={15} />
          知识库
        </button>
      </div>

      {aiActiveTab === "chat" ? (
        <div className="ai-chat-layout">
          <div className="ai-chat-main">
            <div className="ai-chat-messages">
              {aiChatMessages.length === 0 ? (
                <div className="ai-welcome">
                  <Bot size={40} />
                  <h3>你好！我是实验室智能助手</h3>
                  <p>
                    我可以帮助你解答实验流程、耗材申请、设备使用、安全规范等问题。请在下方输入你的问题。
                  </p>
                </div>
              ) : (
                aiChatMessages.map((msg, idx) => (
                  <div key={idx} className={`ai-message ${msg.role}`}>
                    <div className="ai-message-avatar">
                      {msg.role === "user" ? <Users size={16} /> : <Bot size={16} />}
                    </div>
                    <div className="ai-message-content">
                      <span className="ai-message-role">
                        {msg.role === "user" ? "你" : "AI 助手"}
                      </span>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {aiLoading ? (
                <div className="ai-message assistant">
                  <div className="ai-message-avatar">
                    <Bot size={16} />
                  </div>
                  <div className="ai-message-content">
                    <span className="ai-message-role">AI 助手</span>
                    <p className="ai-typing">正在思考中...</p>
                  </div>
                </div>
              ) : null}
              {aiError ? (
                <div className="ai-error-banner">
                  <XCircle size={16} />
                  <span>{aiError}</span>
                </div>
              ) : null}
            </div>

            {aiSources.length > 0 ? (
              <div className="ai-sources">
                <span>参考知识库文档：</span>
                {aiSources.map((src) => (
                  <span key={src.id} className="ai-source-tag">
                    {src.title}
                  </span>
                ))}
              </div>
            ) : null}

            <form
              className="ai-chat-input"
              onSubmit={(e) => {
                e.preventDefault();
                void onSendAiMessage();
              }}
            >
              <div className="ai-chat-input-wrap">
                <textarea
                  placeholder="输入你的问题，Enter 发送，Shift+Enter 换行"
                  value={aiMessage}
                  rows={1}
                  onChange={(event) => {
                    setAiMessage(event.target.value);
                    const el = event.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void onSendAiMessage();
                    }
                  }}
                  disabled={aiLoading}
                />
                <button
                  type="submit"
                  className="send-btn"
                  disabled={aiLoading || !aiMessage.trim()}
                  title="发送 (Enter)"
                >
                  <Send size={15} />
                </button>
              </div>
              {aiChatMessages.length > 0 ? (
                <button type="button" className="ghost" onClick={onClearAiHistory} title="清除历史">
                  <Trash2 size={16} />
                </button>
              ) : null}
            </form>
          </div>

          <div className="ai-faq-sidebar">
            <h4>
              <HelpCircle size={15} /> 常见问题
            </h4>
            {faqTemplates.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                className="faq-template-btn"
                onClick={() => onUseFaqTemplate(tmpl.question)}
              >
                {tmpl.question}
              </button>
            ))}
            {faqTemplates.length === 0 ? (
              <p className="ai-welcome">暂无问题模板，管理员可在知识库中添加。</p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="ai-knowledge-layout">
          <div className="ai-knowledge-toolbar">
            <button
              type="button"
              className={!showKnowledgePanel ? "selected" : "ghost"}
              onClick={() => {
                setShowKnowledgePanel(false);
                setEditingKnowledgeId("");
                setKnowledgeTitle("");
                setKnowledgeContent("");
                setKnowledgeCategory("general");
                setKnowledgeTags("");
              }}
            >
              文档列表
            </button>
            <button
              type="button"
              className={showKnowledgePanel ? "selected" : "ghost"}
              onClick={() => {
                setShowKnowledgePanel(true);
                if (editingKnowledgeId) {
                  setEditingKnowledgeId("");
                  setKnowledgeTitle("");
                  setKnowledgeContent("");
                  setKnowledgeCategory("general");
                  setKnowledgeTags("");
                }
              }}
            >
              <Plus size={15} />
              添加文档
            </button>
          </div>

          {showKnowledgePanel ? (
            <form
              className="knowledge-form"
              onSubmit={
                editingKnowledgeId
                  ? (e) => {
                      e.preventDefault();
                      void onUpdateKnowledgeDoc(editingKnowledgeId);
                    }
                  : onCreateKnowledgeDoc
              }
            >
              <h3>{editingKnowledgeId ? "编辑知识文档" : "添加知识文档"}</h3>
              <label>
                标题
                <input
                  value={knowledgeTitle}
                  onChange={(e) => setKnowledgeTitle(e.target.value)}
                  placeholder="文档标题"
                />
              </label>
              <label>
                分类
                <select
                  value={knowledgeCategory}
                  onChange={(e) => setKnowledgeCategory(e.target.value)}
                >
                  <option value="general">通用</option>
                  <option value="rules">规章制度</option>
                  <option value="sop">操作流程</option>
                  <option value="safety">安全规范</option>
                  <option value="equipment">设备使用</option>
                  <option value="faq">常见问题</option>
                </select>
              </label>
              <label>
                标签
                <input
                  value={knowledgeTags}
                  onChange={(e) => setKnowledgeTags(e.target.value)}
                  placeholder="多个标签用逗号分隔"
                />
              </label>
              <label>
                内容
                <textarea
                  value={knowledgeContent}
                  onChange={(e) => setKnowledgeContent(e.target.value)}
                  placeholder="知识文档内容，AI 将基于此回答问题..."
                  rows={12}
                />
              </label>
              <div className="row-actions">
                <button className="primary" type="submit" disabled={aiLoading}>
                  {aiLoading ? "保存中..." : editingKnowledgeId ? "更新文档" : "添加文档"}
                </button>
                {editingKnowledgeId ? (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setEditingKnowledgeId("");
                      setKnowledgeTitle("");
                      setKnowledgeContent("");
                      setKnowledgeCategory("general");
                      setKnowledgeTags("");
                      setShowKnowledgePanel(false);
                    }}
                  >
                    取消编辑
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <div className="knowledge-list">
              {knowledgeDocs.length === 0 ? (
                <div className="ai-welcome">
                  <BookOpen size={32} />
                  <h3>知识库为空</h3>
                  <p>
                    点击"添加文档"上传实验室规章制度、操作流程、常见问题等，AI
                    将基于这些知识回答问题。
                  </p>
                </div>
              ) : (
                knowledgeDocs.map((doc) => (
                  <article className="knowledge-card" key={doc.id}>
                    <div className="knowledge-card-header">
                      <div>
                        <strong>{doc.title}</strong>
                        <span className="knowledge-category">{doc.category}</span>
                      </div>
                      <div className="row-actions">
                        <button type="button" onClick={() => onStartEditKnowledge(doc)}>
                          编辑
                        </button>
                        <button type="button" onClick={() => onDeleteKnowledgeDoc(doc.id)}>
                          删除
                        </button>
                      </div>
                    </div>
                    <p>
                      {doc.content.slice(0, 200)}
                      {doc.content.length > 200 ? "..." : ""}
                    </p>
                    <small>
                      {doc.tags.join(" / ") || "无标签"} · 更新于{" "}
                      {new Date(doc.updatedAt).toLocaleString()}
                    </small>
                  </article>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
