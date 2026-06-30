import { useState } from "react";
import { EmptyState, SectionCard, StatusBadge } from "../shared/Ui";
import type {
  Actor,
  ChatMessage,
  FaqTemplate,
  KnowledgeDocument,
  KnowledgeSource
} from "../../types";

// pdfjs worker 顶层静态导入，Vite 构建时即可解析，避免 Docker 容器内动态 ?url 解析失败
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

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
  onUploadKnowledgeFile: (payload: {
    title: string;
    content: string;
    category: string;
    tags: string[];
    fileName?: string;
    mimeType?: string;
  }) => Promise<void>;
  onDeleteKnowledge: (id: string) => Promise<void>;
}

async function readKnowledgeFile(file: File) {
  const fileName = file.name;
  const mimeType = file.type || "application/octet-stream";
  const extension = fileName.split(".").pop()?.toLowerCase();
  let content = "";

  if (
    mimeType.startsWith("text/") ||
    ["txt", "md", "markdown", "json", "csv", "log", "yaml", "yml"].includes(extension ?? "")
  ) {
    content = await file.text();
  } else if (mimeType === "application/pdf" || extension === "pdf") {
    const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const chunks: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const contentItems = await page.getTextContent();
      const pageText = contentItems.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (pageText) {
        chunks.push(`第 ${pageNumber} 页\n${pageText}`);
      }
    }
    content = chunks.join("\n\n");
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    const mammoth = await import("mammoth/mammoth.browser");
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    content = result.value.replace(/\n{3,}/g, "\n\n").trim();
  } else {
    throw new Error("当前仅支持 txt / md / json / csv / pdf / docx 作为知识库来源文件。");
  }

  if (!content.trim()) {
    throw new Error("文件已读取，但没有提取到可用文本内容。");
  }

  return {
    fileName,
    mimeType,
    content
  };
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
  onUploadKnowledgeFile,
  onDeleteKnowledge
}: AiPageProps) {
  const [message, setMessage] = useState("");
  const [knowledgeDraft, setKnowledgeDraft] = useState({
    title: "",
    content: "",
    category: "general",
    tags: ""
  });
  const [knowledgeFile, setKnowledgeFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");

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
                setUploadError("");
                const tags = knowledgeDraft.tags
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean);
                setUploadBusy(true);

                try {
                  if (knowledgeFile) {
                    const parsed = await readKnowledgeFile(knowledgeFile);
                    const mergedContent = knowledgeDraft.content.trim()
                      ? `${parsed.content}\n\n---\n补充说明：\n${knowledgeDraft.content.trim()}`
                      : parsed.content;
                    await onUploadKnowledgeFile({
                      title: knowledgeDraft.title || knowledgeFile.name.replace(/\.[^.]+$/, ""),
                      content: mergedContent,
                      category: knowledgeDraft.category,
                      tags,
                      fileName: parsed.fileName,
                      mimeType: parsed.mimeType
                    });
                  } else {
                    await onCreateKnowledge({
                      title: knowledgeDraft.title,
                      content: knowledgeDraft.content,
                      category: knowledgeDraft.category,
                      tags
                    });
                  }
                  setKnowledgeDraft({ title: "", content: "", category: "general", tags: "" });
                  setKnowledgeFile(null);
                } catch (submitError) {
                  setUploadError(
                    submitError instanceof Error ? submitError.message : "知识文件处理失败"
                  );
                } finally {
                  setUploadBusy(false);
                }
              }}
            >
              <label
                className="file-dropzone compact-dropzone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (!file) return;
                  setKnowledgeFile(file);
                  setKnowledgeDraft((current) => ({
                    ...current,
                    title: current.title || file.name.replace(/\.[^.]+$/, "")
                  }));
                }}
              >
                <span>点击选择知识文件或直接拖拽到这里</span>
                <small>
                  支持 txt、md、json、csv、pdf、docx；上传后会先抽取正文，再写入知识库。
                </small>
                <input
                  type="file"
                  accept=".txt,.md,.markdown,.json,.csv,.log,.yaml,.yml,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setUploadError("");
                    setKnowledgeFile(file);
                    setKnowledgeDraft((current) => ({
                      ...current,
                      title: current.title || file.name.replace(/\.[^.]+$/, "")
                    }));
                  }}
                />
              </label>
              {knowledgeFile ? (
                <div className="upload-chip">
                  已选择：{knowledgeFile.name}
                  <small>{knowledgeFile.type || "未知类型"}</small>
                </div>
              ) : null}
              {uploadError ? <div className="error-banner">{uploadError}</div> : null}
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
                  placeholder={
                    knowledgeFile
                      ? "已选择文件，提交时会自动抽取正文；这里可以额外补充摘要、适用范围或备注。"
                      : "直接粘贴制度、SOP、流程或项目背景内容。"
                  }
                  onChange={(event) =>
                    setKnowledgeDraft((current) => ({ ...current, content: event.target.value }))
                  }
                />
              </label>
              <button className="secondary-button" disabled={uploadBusy}>
                {uploadBusy ? "处理中..." : knowledgeFile ? "上传知识文件" : "添加知识文档"}
              </button>
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
                    <div className="knowledge-meta-strip">
                      <span>{doc.sourceImportMethod === "upload" ? "文件导入" : "手工录入"}</span>
                      <span>{doc.sourceFileName ?? "无源文件"}</span>
                      <span>{doc.sourceMimeType ?? "text/plain"}</span>
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
