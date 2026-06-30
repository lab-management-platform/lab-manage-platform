import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState, SectionCard, StatusBadge } from "../shared/Ui";
import {
  fileCategoryText,
  fileKindText,
  formatFileSize,
  visibilityText
} from "../../utils/helpers";
import type { Actor, FileVersion, LabFile, Project } from "../../types";

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

interface FilesPageProps {
  actor: Actor;
  projects: Project[];
  selectedProjectId: string;
  files: LabFile[];
  versions: FileVersion[];
  onSelectFile: (fileId: string) => Promise<void>;
  onCreateProjectFile: (payload: {
    projectId: string;
    title: string;
    category: "record" | "dataset" | "meeting" | "other" | "template" | "sop";
    fileKind:
      | "project_tree"
      | "report_doc"
      | "report_ppt"
      | "experiment_record"
      | "design_doc"
      | "api_doc"
      | "code_snapshot"
      | "dataset"
      | "model_weight"
      | "meeting_minutes"
      | "other";
    description: string;
    driveUrl?: string;
    nasPath?: string;
    originalName?: string;
    mimeType?: string;
    sizeBytes?: number;
    contentBase64?: string;
  }) => Promise<void>;
  onAddFileVersion: (payload: {
    fileId: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    driveUrl?: string;
    changeNote?: string;
    contentBase64?: string;
  }) => Promise<void>;
}

export function FilesPage({
  actor,
  projects,
  selectedProjectId,
  files,
  versions,
  onSelectFile,
  onCreateProjectFile,
  onAddFileVersion
}: FilesPageProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [draft, setDraft] = useState({
    title: "",
    category: "record" as const,
    fileKind: "experiment_record" as const,
    description: "",
    driveUrl: "",
    nasPath: "",
    originalName: ""
  });
  const [draftUpload, setDraftUpload] = useState<File | null>(null);
  const [showLinkFields, setShowLinkFields] = useState(false);
  const [versionDraft, setVersionDraft] = useState({
    originalName: "",
    mimeType: "text/uri-list",
    sizeBytes: "0",
    driveUrl: "",
    changeNote: ""
  });
  const [versionUpload, setVersionUpload] = useState<File | null>(null);
  const [showVersionLinkFields, setShowVersionLinkFields] = useState(false);
  const activeProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];

  const visibleFiles = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    return files.filter((file) =>
      keyword
        ? [file.title, file.description, file.tags.join(" ")].some((field) =>
            field.toLowerCase().includes(keyword)
          )
        : true
    );
  }, [deferredSearch, files]);
  const publicFiles = visibleFiles.filter((file) => !file.projectId);
  const projectFiles = activeProject
    ? visibleFiles.filter((file) => file.projectId === activeProject.id)
    : [];
  const selectedFile = files.find((file) => file.id === selectedFileId) ?? visibleFiles[0];
  const projectChecklist = useMemo(() => {
    const requiredKinds = [
      "project_tree",
      "experiment_record",
      "report_doc",
      "report_ppt"
    ] as const;
    return requiredKinds.map((fileKind) => ({
      fileKind,
      label: fileKindText(fileKind),
      completed: projectFiles.some((file) => file.fileKind === fileKind)
    }));
  }, [projectFiles]);

  return (
    <div className="page-grid">
      <SectionCard title="资料中心" eyebrow="Knowledge Assets">
        <div className="toolbar-row">
          <input
            placeholder="搜索 SOP、项目资料、汇报文档或数据集"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span className="panel-tag">
            {actor.permissions.includes("file:write") ? "可管理文件" : "只读访问"}
          </span>
        </div>

        <div className="file-browser-layout">
          <div className="column-layout">
            <SectionCard title="公共资料" eyebrow="Shared Library">
              <div className="file-card-grid">
                {publicFiles.length === 0 ? (
                  <EmptyState title="暂无公共资料" text="SOP、模板和制度资料会显示在这里。" />
                ) : (
                  publicFiles.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      className={file.id === selectedFile?.id ? "file-tile active" : "file-tile"}
                      onClick={async () => {
                        setSelectedFileId(file.id);
                        await onSelectFile(file.id);
                      }}
                    >
                      <div>
                        <strong>{file.title}</strong>
                        <small>{fileCategoryText(file.category)}</small>
                      </div>
                      <p>{file.description || "暂无描述。"}</p>
                      <div className="row-inline">
                        <StatusBadge tone="muted">{visibilityText(file.visibility)}</StatusBadge>
                        <small>v{file.currentVersion}</small>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </SectionCard>

            <SectionCard
              title={activeProject ? `${activeProject.name} · 项目资料` : "项目资料"}
              eyebrow="Project Files"
            >
              {activeProject ? (
                <>
                  <div className="file-checklist-grid">
                    {projectChecklist.map((item) => (
                      <article key={item.fileKind} className="file-checklist-card">
                        <strong>{item.label}</strong>
                        <small>{item.completed ? "已登记" : "待补齐"}</small>
                        <StatusBadge tone={item.completed ? "active" : "pending"}>
                          {item.completed ? "已完成" : "缺资料"}
                        </StatusBadge>
                      </article>
                    ))}
                  </div>

                  <div className="file-card-grid">
                    {projectFiles.length === 0 ? (
                      <EmptyState
                        title="暂无项目资料"
                        text="实验记录、汇报文档、代码快照和项目树资料会集中展示在这里。"
                      />
                    ) : (
                      projectFiles.map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          className={
                            file.id === selectedFile?.id ? "file-tile active" : "file-tile"
                          }
                          onClick={async () => {
                            setSelectedFileId(file.id);
                            await onSelectFile(file.id);
                          }}
                        >
                          <div>
                            <strong>{file.title}</strong>
                            <small>
                              {file.fileKind ? fileKindText(file.fileKind) : "项目资料"}
                            </small>
                          </div>
                          <p>{file.description || "暂无描述。"}</p>
                          <div className="row-inline">
                            <StatusBadge tone="pending">
                              {visibilityText(file.visibility)}
                            </StatusBadge>
                            <small>{file.nasPath ?? "未登记 NAS 路径"}</small>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <form
                    className="form-grid compact"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const contentBase64 = draftUpload
                        ? await readFileAsBase64(draftUpload)
                        : undefined;
                      await onCreateProjectFile({
                        projectId: activeProject.id,
                        title: draft.title,
                        category: draft.category,
                        fileKind: draft.fileKind,
                        description: draft.description,
                        driveUrl: draft.driveUrl || undefined,
                        nasPath: draft.nasPath || undefined,
                        originalName: draft.originalName || undefined,
                        mimeType:
                          draftUpload?.type ||
                          (draft.driveUrl ? "text/uri-list" : "application/octet-stream"),
                        sizeBytes: draftUpload?.size,
                        contentBase64
                      });
                      setDraft({
                        title: "",
                        category: "record",
                        fileKind: "experiment_record",
                        description: "",
                        driveUrl: "",
                        nasPath: "",
                        originalName: ""
                      });
                      setDraftUpload(null);
                      setShowLinkFields(false);
                    }}
                  >
                    <label
                      className="file-dropzone"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const file = event.dataTransfer.files?.[0];
                        if (!file) return;
                        setDraftUpload(file);
                        setDraft((current) => ({
                          ...current,
                          originalName: file.name,
                          title: current.title || file.name.replace(/\.[^.]+$/, "")
                        }));
                      }}
                    >
                      <span>点击选择文件或直接拖拽到这里</span>
                      <small>默认就是本地上传；只有资料实际放在 NAS / 网盘时才需要填写外链。</small>
                      <input
                        type="file"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          setDraftUpload(file);
                          setDraft((current) => ({
                            ...current,
                            originalName: file.name,
                            title: current.title || file.name.replace(/\.[^.]+$/, "")
                          }));
                        }}
                      />
                    </label>
                    {draftUpload ? (
                      <div className="upload-chip">
                        已选择：{draftUpload.name} · {formatFileSize(draftUpload.size)}
                      </div>
                    ) : null}
                    <div className="upload-mode-card">
                      <strong>上传说明</strong>
                      <p>
                        {draftUpload
                          ? "当前会直接上传你选中的本地文件。"
                          : "如果你暂时不上传本地文件，也可以展开下方 NAS / 外链字段做资料登记。"}
                      </p>
                      <button
                        type="button"
                        className="tertiary-button"
                        onClick={() => setShowLinkFields((current) => !current)}
                      >
                        {showLinkFields ? "收起 NAS / 外链字段" : "展开 NAS / 外链字段"}
                      </button>
                    </div>
                    <label>
                      资料标题
                      <input
                        value={draft.title}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, title: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      资料类型
                      <select
                        value={draft.fileKind}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            fileKind: event.target.value as typeof draft.fileKind
                          }))
                        }
                      >
                        <option value="experiment_record">实验记录</option>
                        <option value="report_doc">汇报文档</option>
                        <option value="report_ppt">汇报 PPT</option>
                        <option value="project_tree">项目树</option>
                        <option value="code_snapshot">代码快照</option>
                        <option value="dataset">数据集</option>
                        <option value="meeting_minutes">会议纪要</option>
                        <option value="other">其他</option>
                      </select>
                    </label>
                    <label>
                      分类
                      <select
                        value={draft.category}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            category: event.target.value as typeof draft.category
                          }))
                        }
                      >
                        <option value="record">记录</option>
                        <option value="dataset">数据集</option>
                        <option value="meeting">会议</option>
                        <option value="template">模板</option>
                        <option value="other">其他</option>
                      </select>
                    </label>
                    <label>
                      原文件名
                      <input
                        value={draft.originalName}
                        readOnly={Boolean(draftUpload)}
                        placeholder="选中文件后自动带出；纯登记模式才需要手填"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            originalName: event.target.value
                          }))
                        }
                      />
                    </label>
                    {showLinkFields ? (
                      <>
                        <label>
                          NAS 路径登记
                          <input
                            placeholder="例如 /nas/lab/project/report-2026-06-30"
                            value={draft.nasPath}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, nasPath: event.target.value }))
                            }
                          />
                        </label>
                        <label>
                          外部分享链接（可选）
                          <input
                            placeholder="https://... 仅在用网盘/NAS分享链接时填写"
                            value={draft.driveUrl}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, driveUrl: event.target.value }))
                            }
                          />
                        </label>
                      </>
                    ) : null}
                    <label>
                      说明
                      <textarea
                        value={draft.description}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            description: event.target.value
                          }))
                        }
                      />
                    </label>
                    <button className="secondary-button">上传项目资料</button>
                  </form>
                </>
              ) : (
                <EmptyState title="尚未选择项目" text="先在顶部切换当前项目，再上传项目资料。" />
              )}
            </SectionCard>
          </div>

          <aside className="file-detail-panel">
            {!selectedFile ? (
              <EmptyState title="未选择文件" text="从左侧点击一份资料查看版本和外链。" />
            ) : (
              <>
                <div className="section-head tight">
                  <div>
                    <h3>{selectedFile.title}</h3>
                    <p>{selectedFile.ownerName}</p>
                  </div>
                </div>
                <div className="meta-grid">
                  <span>分类：{fileCategoryText(selectedFile.category)}</span>
                  <span>
                    资料类型：
                    {selectedFile.fileKind ? fileKindText(selectedFile.fileKind) : "公共资料"}
                  </span>
                  <span>可见性：{visibilityText(selectedFile.visibility)}</span>
                  <span>大小：{formatFileSize(selectedFile.sizeBytes)}</span>
                  <span>NAS：{selectedFile.nasPath ?? "未登记"}</span>
                </div>
                <p className="muted-paragraph">{selectedFile.description || "暂无描述。"}</p>
                {selectedFile.driveUrl ? (
                  <a
                    className="link-button"
                    href={selectedFile.driveUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span aria-hidden="true">↗</span>
                    打开外部资料
                  </a>
                ) : null}
                {actor.permissions.includes("file:write") && selectedFile.nodeType === "file" ? (
                  <form
                    className="form-grid compact"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const contentBase64 = versionUpload
                        ? await readFileAsBase64(versionUpload)
                        : undefined;
                      await onAddFileVersion({
                        fileId: selectedFile.id,
                        originalName: versionDraft.originalName,
                        mimeType: versionDraft.mimeType,
                        sizeBytes: Number(versionDraft.sizeBytes || 0),
                        driveUrl: versionDraft.driveUrl || undefined,
                        changeNote: versionDraft.changeNote || undefined,
                        contentBase64
                      });
                      setVersionDraft({
                        originalName: "",
                        mimeType: "text/uri-list",
                        sizeBytes: "0",
                        driveUrl: "",
                        changeNote: ""
                      });
                      setVersionUpload(null);
                      setShowVersionLinkFields(false);
                    }}
                  >
                    <div className="row-inline spread">
                      <strong>提交新版本</strong>
                      <span className="panel-tag">当前 v{selectedFile.currentVersion}</span>
                    </div>
                    <label
                      className="file-dropzone compact-dropzone"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const file = event.dataTransfer.files?.[0];
                        if (!file) return;
                        setVersionUpload(file);
                        setVersionDraft((current) => ({
                          ...current,
                          originalName: file.name,
                          mimeType: file.type || current.mimeType,
                          sizeBytes: String(file.size)
                        }));
                      }}
                    >
                      <span>点击选择新文件或拖拽覆盖</span>
                      <input
                        type="file"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          setVersionUpload(file);
                          setVersionDraft((current) => ({
                            ...current,
                            originalName: file.name,
                            mimeType: file.type || current.mimeType,
                            sizeBytes: String(file.size)
                          }));
                        }}
                      />
                    </label>
                    {versionUpload ? (
                      <div className="upload-chip">
                        已选择：{versionUpload.name} · {formatFileSize(versionUpload.size)}
                      </div>
                    ) : null}
                    <div className="upload-mode-card">
                      <strong>版本说明</strong>
                      <p>
                        {versionUpload
                          ? "当前会把新本地文件作为一个新版本提交。"
                          : "如果只是 NAS 内部替换，可展开下方链接字段登记新地址。"}
                      </p>
                      <button
                        type="button"
                        className="tertiary-button"
                        onClick={() => setShowVersionLinkFields((current) => !current)}
                      >
                        {showVersionLinkFields ? "收起链接登记" : "展开链接登记"}
                      </button>
                    </div>
                    <label>
                      原文件名
                      <input
                        value={versionDraft.originalName}
                        readOnly={Boolean(versionUpload)}
                        placeholder="选中新文件后自动带出；仅链接更新时可手填"
                        onChange={(event) =>
                          setVersionDraft((current) => ({
                            ...current,
                            originalName: event.target.value
                          }))
                        }
                      />
                    </label>
                    {showVersionLinkFields ? (
                      <label>
                        外链 / NAS 分享地址
                        <input
                          placeholder="https://..."
                          value={versionDraft.driveUrl}
                          onChange={(event) =>
                            setVersionDraft((current) => ({
                              ...current,
                              driveUrl: event.target.value
                            }))
                          }
                        />
                      </label>
                    ) : null}
                    <div className="member-entry-grid">
                      <label>
                        MIME 类型
                        <input
                          value={versionDraft.mimeType}
                          onChange={(event) =>
                            setVersionDraft((current) => ({
                              ...current,
                              mimeType: event.target.value
                            }))
                          }
                        />
                      </label>
                      <label>
                        大小（字节）
                        <input
                          type="number"
                          min={0}
                          value={versionDraft.sizeBytes}
                          onChange={(event) =>
                            setVersionDraft((current) => ({
                              ...current,
                              sizeBytes: event.target.value
                            }))
                          }
                        />
                      </label>
                    </div>
                    <label>
                      更新说明
                      <textarea
                        value={versionDraft.changeNote}
                        onChange={(event) =>
                          setVersionDraft((current) => ({
                            ...current,
                            changeNote: event.target.value
                          }))
                        }
                      />
                    </label>
                    <button className="secondary-button">登记新版本</button>
                  </form>
                ) : null}
                <div className="version-stack">
                  {versions.length === 0 ? (
                    <EmptyState title="暂无版本记录" text="选择文件后会加载该资料的版本列表。" />
                  ) : (
                    versions.map((version) => (
                      <article key={version.id} className="version-item">
                        <div>
                          <strong>版本 {version.version}</strong>
                          <small>{version.changeNote || "无更新说明"}</small>
                        </div>
                        {version.driveUrl ? (
                          <a
                            href={version.driveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="icon-only-link"
                          >
                            <span aria-hidden="true">↓</span>
                          </a>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </>
            )}
          </aside>
        </div>
      </SectionCard>
    </div>
  );
}
