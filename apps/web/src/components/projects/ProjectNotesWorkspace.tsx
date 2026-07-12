import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { EmptyState, StatusBadge } from "../shared/Ui";
import type { Project, ProjectNote, ProjectNoteKind } from "../../types";

interface ProjectNotesWorkspaceProps {
  project: Project;
  notes: ProjectNote[];
  canWrite: boolean;
  onExit: () => void;
  onCreateNote: (payload: {
    projectId: string;
    title: string;
    content: string;
    noteKind?: ProjectNoteKind;
  }) => Promise<ProjectNote | void>;
  onUpdateNote: (
    projectId: string,
    noteId: string,
    payload: { title?: string; content?: string; noteKind?: ProjectNoteKind }
  ) => Promise<ProjectNote | void>;
  onDeleteNote: (projectId: string, noteId: string) => Promise<void>;
}

type ParsedDocument = {
  title: string;
  noteKind: ProjectNoteKind;
  aliases: string[];
  tags: string[];
  body: string;
};

const defaultNoteKind: ProjectNoteKind = "project_note";

const noteKindOptions: Array<{ value: ProjectNoteKind; label: string }> = [
  { value: "project_note", label: "项目笔记" },
  { value: "meeting_minutes", label: "会议纪要" },
  { value: "report_draft", label: "汇报草稿" },
  { value: "knowledge_draft", label: "知识草稿" }
];

function noteKindText(noteKind: ProjectNoteKind) {
  return noteKindOptions.find((option) => option.value === noteKind)?.label ?? "项目笔记";
}

function noteKindTone(noteKind: ProjectNoteKind): "active" | "pending" | "muted" | "danger" {
  if (noteKind === "meeting_minutes") {
    return "pending";
  }
  if (noteKind === "report_draft") {
    return "muted";
  }
  if (noteKind === "knowledge_draft") {
    return "danger";
  }
  return "active";
}

function defaultDocument(title = "未命名笔记", noteKind: ProjectNoteKind = defaultNoteKind) {
  return [
    "---",
    `title: ${title}`,
    `type: ${noteKind}`,
    "aliases:",
    "  - ",
    "tags:",
    "  - project",
    "---",
    "",
    "# 摘要",
    "",
    "在这里写项目笔记正文。可使用：",
    "- `#` 标题",
    "- `-` 列表",
    "- `**加粗**`",
    "- `[[另一篇笔记]]` 内部链接"
  ].join("\n");
}

function ensureDocumentShape(text: string) {
  if (text.trim().startsWith("---")) {
    return text;
  }
  return defaultDocument("未命名笔记", defaultNoteKind).replace(
    "在这里写项目笔记正文。可使用：",
    text.trim() || "在这里写项目笔记正文。可使用："
  );
}

function parseFrontmatterList(lines: string[], startIndex: number) {
  const values: string[] = [];
  let index = startIndex;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.startsWith("  -")) {
      break;
    }
    const value = line.replace("  -", "").trim();
    if (value) {
      values.push(value);
    }
    index += 1;
  }
  return { values, nextIndex: index };
}

function parseDocument(documentText: string): ParsedDocument {
  const normalized = documentText.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  let title = "未命名笔记";
  let noteKind: ProjectNoteKind = defaultNoteKind;
  const aliases: string[] = [];
  const tags: string[] = [];
  let bodyStartIndex = 0;

  if (lines[0] === "---") {
    let index = 1;
    while (index < lines.length) {
      const line = lines[index] ?? "";
      if (line === "---") {
        bodyStartIndex = index + 1;
        break;
      }
      if (line.startsWith("title:")) {
        title = line.replace("title:", "").trim() || title;
      } else if (line.startsWith("type:")) {
        const nextKind = line.replace("type:", "").trim() as ProjectNoteKind;
        if (noteKindOptions.some((option) => option.value === nextKind)) {
          noteKind = nextKind;
        }
      } else if (line.startsWith("aliases:")) {
        const parsed = parseFrontmatterList(lines, index + 1);
        aliases.push(...parsed.values);
        index = parsed.nextIndex - 1;
      } else if (line.startsWith("tags:")) {
        const parsed = parseFrontmatterList(lines, index + 1);
        tags.push(...parsed.values);
        index = parsed.nextIndex - 1;
      }
      index += 1;
    }
  }

  const body = lines.slice(bodyStartIndex).join("\n").trim();
  return {
    title,
    noteKind,
    aliases,
    tags,
    body
  };
}

function noteToDocument(note: ProjectNote) {
  const parsed = parseDocument(note.content);
  return [
    "---",
    `title: ${parsed.title || note.title}`,
    `type: ${parsed.noteKind || note.noteKind}`,
    "aliases:",
    ...(parsed.aliases.length > 0 ? parsed.aliases.map((alias) => `  - ${alias}`) : ["  - "]),
    "tags:",
    ...(parsed.tags.length > 0 ? parsed.tags.map((tag) => `  - ${tag}`) : ["  - project"]),
    "---",
    "",
    parsed.body || note.content || ""
  ].join("\n");
}

function buildNotePayload(documentText: string) {
  const parsed = parseDocument(ensureDocumentShape(documentText));
  return {
    title: parsed.title || "未命名笔记",
    noteKind: parsed.noteKind,
    content: ensureDocumentShape(documentText)
  };
}

function snippet(content: string) {
  const parsed = parseDocument(content);
  return parsed.body.replace(/\s+/g, " ").trim().slice(0, 84) || "暂无内容摘要。";
}

function extractWikiLinks(content: string) {
  const parsed = parseDocument(content);
  const matches = parsed.body.match(/\[\[([^\]]+)\]\]/g) ?? [];
  return matches.map((match) => match.replace(/\[\[|\]\]/g, "").trim()).filter(Boolean);
}

function renderInline(
  line: string,
  onOpenLink: (title: string) => void,
  noteIndex: Map<string, ProjectNote>
) {
  const segments = line.split(/(\[\[[^\]]+\]\]|\*\*[^*]+\*\*)/g).filter(Boolean);
  return segments.map((segment, index) => {
    if (segment.startsWith("[[") && segment.endsWith("]]")) {
      const target = segment.slice(2, -2).trim();
      const linkedNote = noteIndex.get(target.toLowerCase());
      return (
        <button
          key={`${segment}-${index}`}
          type="button"
          className="markdown-inline-link"
          onClick={() => onOpenLink(linkedNote?.title ?? target)}
        >
          {target}
        </button>
      );
    }
    if (segment.startsWith("**") && segment.endsWith("**")) {
      return <strong key={`${segment}-${index}`}>{segment.slice(2, -2)}</strong>;
    }
    return (
      <span key={`${segment}-${index}`} className="markdown-inline-text">
        {segment}
      </span>
    );
  });
}

function renderMarkdownPreview(
  content: string,
  onOpenLink: (title: string) => void,
  noteIndex: Map<string, ProjectNote>
) {
  const parsed = parseDocument(content);
  const lines = parsed.body.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }
    blocks.push(
      <ul key={`list-${blocks.length}`} className="markdown-list">
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{renderInline(item, onOpenLink, noteIndex)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushList();
      return;
    }
    if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
      return;
    }
    flushList();
    if (line.startsWith("### ")) {
      blocks.push(
        <h5 key={`h3-${lineIndex}`}>{renderInline(line.slice(4), onOpenLink, noteIndex)}</h5>
      );
      return;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h4 key={`h2-${lineIndex}`}>{renderInline(line.slice(3), onOpenLink, noteIndex)}</h4>
      );
      return;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h3 key={`h1-${lineIndex}`}>{renderInline(line.slice(2), onOpenLink, noteIndex)}</h3>
      );
      return;
    }
    blocks.push(
      <p key={`p-${lineIndex}`} className="markdown-paragraph">
        {renderInline(line, onOpenLink, noteIndex)}
      </p>
    );
  });
  flushList();

  return {
    parsed,
    body: blocks.length > 0 ? blocks : <p className="empty-hint">暂无正文。</p>
  };
}

export function ProjectNotesWorkspace({
  project,
  notes,
  canWrite,
  onExit,
  onCreateNote,
  onUpdateNote,
  onDeleteNote
}: ProjectNotesWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | ProjectNoteKind>("all");
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [documentText, setDocumentText] = useState(defaultDocument());
  const [saving, setSaving] = useState(false);

  const noteIndex = useMemo(() => {
    const map = new Map<string, ProjectNote>();
    for (const note of notes) {
      map.set(note.title.trim().toLowerCase(), note);
      const parsed = parseDocument(note.content);
      for (const alias of parsed.aliases) {
        map.set(alias.trim().toLowerCase(), note);
      }
    }
    return map;
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return notes.filter((note) => {
      const parsed = parseDocument(note.content);
      const matchesKind = kindFilter === "all" || note.noteKind === kindFilter;
      const haystack =
        `${note.title} ${parsed.body} ${note.authorName} ${parsed.aliases.join(" ")}`.toLowerCase();
      const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;
      return matchesKind && matchesQuery;
    });
  }, [kindFilter, notes, query]);

  useEffect(() => {
    if (isCreating) {
      return;
    }
    if (selectedNoteId && notes.some((note) => note.id === selectedNoteId)) {
      return;
    }
    setSelectedNoteId(notes[0]?.id ?? "");
  }, [isCreating, notes, selectedNoteId]);

  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? null;

  useEffect(() => {
    if (isCreating) {
      return;
    }
    if (!selectedNote) {
      setDocumentText(defaultDocument());
      return;
    }
    setDocumentText(noteToDocument(selectedNote));
  }, [isCreating, selectedNote]);

  const preview = useMemo(
    () =>
      renderMarkdownPreview(
        documentText,
        (title) => {
          const linkedNote = noteIndex.get(title.trim().toLowerCase());
          if (linkedNote) {
            setIsCreating(false);
            setSelectedNoteId(linkedNote.id);
          }
        },
        noteIndex
      ),
    [documentText, noteIndex]
  );

  const outgoingLinks = useMemo(() => {
    return extractWikiLinks(documentText)
      .map((linkTitle) => noteIndex.get(linkTitle.toLowerCase()) ?? linkTitle)
      .slice(0, 10);
  }, [documentText, noteIndex]);

  const incomingLinks = useMemo(() => {
    const currentTitle = preview.parsed.title.trim().toLowerCase();
    if (!currentTitle) {
      return [];
    }
    return notes.filter((note) => {
      if (!isCreating && note.id === selectedNote?.id) {
        return false;
      }
      return extractWikiLinks(note.content).some(
        (link) => link.trim().toLowerCase() === currentTitle
      );
    });
  }, [isCreating, notes, preview.parsed.title, selectedNote?.id]);

  const recentNotes = useMemo(
    () =>
      [...notes].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 6),
    [notes]
  );

  function startNewNote() {
    setIsCreating(true);
    setSelectedNoteId("");
    setDocumentText(defaultDocument("未命名笔记", defaultNoteKind));
  }

  async function handleSave() {
    if (!canWrite) {
      return;
    }
    const payload = buildNotePayload(documentText);
    setSaving(true);
    try {
      if (isCreating || !selectedNote) {
        const created = await onCreateNote({
          projectId: project.id,
          title: payload.title,
          content: payload.content,
          noteKind: payload.noteKind
        });
        if (created) {
          setSelectedNoteId(created.id);
          setDocumentText(noteToDocument(created));
        }
        setIsCreating(false);
        return;
      }

      const updated = await onUpdateNote(project.id, selectedNote.id, payload);
      if (updated) {
        setSelectedNoteId(updated.id);
        setDocumentText(noteToDocument(updated));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="notes-workspace-shell obsidian-mode">
      <div className="notes-workspace-topbar">
        <div className="notes-workspace-brand">
          <small>VAULT-STYLE PROJECT KNOWLEDGE SPACE</small>
          <strong>{project.name}</strong>
          <span>
            仓库浏览器、纯文本编辑器、实时超文本预览与双向链接，按 Obsidian
            的文档流方式组织项目知识。
          </span>
        </div>
        <div className="notes-workspace-actions">
          <button type="button" className="secondary-button" onClick={onExit}>
            返回项目页
          </button>
          {canWrite ? (
            <button type="button" className="secondary-button" onClick={startNewNote}>
              新建仓库文档
            </button>
          ) : null}
          <button
            type="button"
            className="primary-button"
            disabled={!canWrite || saving}
            onClick={handleSave}
          >
            {saving ? "保存中..." : isCreating ? "创建文档" : "保存文档"}
          </button>
        </div>
      </div>

      <div className="notes-workspace-main">
        <aside className="notes-sidebar-panel repo-panel">
          <div className="notes-sidebar-sticky">
            <div className="notes-sidebar-head">
              <strong>仓库浏览器</strong>
              <small>{filteredNotes.length} 篇匹配</small>
            </div>
            <div className="notes-sidebar-controls">
              <input
                placeholder="搜索标题、正文、作者"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                value={kindFilter}
                onChange={(event) => setKindFilter(event.target.value as "all" | ProjectNoteKind)}
              >
                <option value="all">全部类型</option>
                {noteKindOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="notes-file-list">
            {filteredNotes.length === 0 ? (
              <EmptyState title="没有匹配结果" text="试试切换筛选条件，或者新建一篇仓库文档。" />
            ) : (
              filteredNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  className={
                    !isCreating && note.id === selectedNoteId
                      ? "notes-file-item active"
                      : "notes-file-item"
                  }
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedNoteId(note.id);
                  }}
                >
                  <div className="notes-file-item-head">
                    <strong>{note.title}</strong>
                    <StatusBadge tone={noteKindTone(note.noteKind)}>
                      {noteKindText(note.noteKind)}
                    </StatusBadge>
                  </div>
                  <small>
                    {note.authorName} ·{" "}
                    {new Date(note.updatedAt).toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </small>
                  <p>{snippet(note.content)}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="notes-editor-panel prose-editor-panel">
          <div className="notes-editor-head compact">
            <div>
              <small>{isCreating ? "NEW VAULT DOC" : "EDITOR"}</small>
              <h3>{preview.parsed.title}</h3>
            </div>
            <div className="notes-editor-meta">
              <span>标题、类型、别名、标签都写在文档前置元数据里</span>
            </div>
          </div>

          <textarea
            className="notes-prose-editor"
            value={documentText}
            disabled={!canWrite}
            onChange={(event) => setDocumentText(event.target.value)}
          />
        </section>

        <aside className="notes-inspector-panel">
          <article className="notes-inspector-card preview-card">
            <strong>实时预览</strong>
            <div className="notes-preview-meta">
              <StatusBadge tone={noteKindTone(preview.parsed.noteKind)}>
                {noteKindText(preview.parsed.noteKind)}
              </StatusBadge>
              {preview.parsed.tags.map((tag) => (
                <span key={tag} className="notes-tag-chip">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="markdown-preview-article">{preview.body}</div>
          </article>

          <article className="notes-inspector-card">
            <strong>双向链接</strong>
            <small>正文里的 `[[笔记名]]` 会在预览区直接可点，同时这里保留关系面板。</small>
            <div className="notes-related-grid">
              <div>
                <span className="inspector-label">当前文档链接到</span>
                {outgoingLinks.length === 0 ? (
                  <p className="empty-hint">还没有内部链接。</p>
                ) : (
                  <div className="notes-chip-list">
                    {outgoingLinks.map((item) => (
                      <button
                        key={typeof item === "string" ? item : item.id}
                        type="button"
                        className="notes-link-chip"
                        onClick={() => {
                          if (typeof item !== "string") {
                            setIsCreating(false);
                            setSelectedNoteId(item.id);
                          }
                        }}
                      >
                        {typeof item === "string" ? item : item.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <span className="inspector-label">反向提及</span>
                {incomingLinks.length === 0 ? (
                  <p className="empty-hint">还没有其他文档提及当前标题。</p>
                ) : (
                  <div className="notes-chip-list">
                    {incomingLinks.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        className="notes-link-chip"
                        onClick={() => {
                          setIsCreating(false);
                          setSelectedNoteId(note.id);
                        }}
                      >
                        {note.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>

          <article className="notes-inspector-card">
            <strong>最近修改</strong>
            <div className="notes-recent-list">
              {recentNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  className="notes-recent-item"
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedNoteId(note.id);
                  }}
                >
                  <strong>{note.title}</strong>
                  <small>
                    {note.authorName} ·{" "}
                    {new Date(note.updatedAt).toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </small>
                </button>
              ))}
            </div>
            {selectedNote && !isCreating && canWrite ? (
              <button
                type="button"
                className="tertiary-button ghost-tone"
                onClick={async () => {
                  await onDeleteNote(project.id, selectedNote.id);
                  startNewNote();
                }}
              >
                删除当前文档
              </button>
            ) : null}
          </article>
        </aside>
      </div>
    </section>
  );
}
