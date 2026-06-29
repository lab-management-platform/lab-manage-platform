import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState, SectionCard, StatusBadge } from "../shared/Ui";
import { fileCategoryText, formatFileSize, visibilityText } from "../../utils/helpers";
import type { Actor, FileVersion, LabFile } from "../../types";

interface FilesPageProps {
  actor: Actor;
  files: LabFile[];
  versions: FileVersion[];
  onSelectFile: (fileId: string) => Promise<void>;
}

export function FilesPage({ actor, files, versions, onSelectFile }: FilesPageProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedFileId, setSelectedFileId] = useState("");

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
  const selectedFile = files.find((file) => file.id === selectedFileId) ?? visibleFiles[0];

  return (
    <div className="page-grid">
      <SectionCard title="资料中心" eyebrow="Knowledge Assets">
        <div className="toolbar-row">
          <input
            placeholder="搜索 SOP、模板、记录或数据集"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span className="panel-tag">{actor.permissions.includes("file:write") ? "可管理文件" : "只读访问"}</span>
        </div>

        <div className="file-browser-layout">
          <div className="file-card-grid">
            {visibleFiles.length === 0 ? (
              <EmptyState title="未找到匹配资料" text="换个关键词试试，或者在后端先创建文件资料。" />
            ) : (
              visibleFiles.map((file) => (
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
                  <span>可见性：{visibilityText(selectedFile.visibility)}</span>
                  <span>大小：{formatFileSize(selectedFile.sizeBytes)}</span>
                </div>
                <p className="muted-paragraph">{selectedFile.description || "暂无描述。"}</p>
                {selectedFile.driveUrl ? (
                  <a className="link-button" href={selectedFile.driveUrl} target="_blank" rel="noreferrer">
                    <span aria-hidden="true">↗</span>
                    打开外部资料
                  </a>
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
                          <a href={version.driveUrl} target="_blank" rel="noreferrer" className="icon-only-link">
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
