import type { SyntheticEvent } from "react";
import { Download, FileText, Folder, Link as LinkIcon, Upload } from "lucide-react";
import { fileCategoryText, formatFileSize, visibilityText } from "../utils/helpers";
import type { FileCategory, FileNodeType, FileVersion, FileVisibility, LabFile } from "../types";

interface FilePanelProps {
  files: LabFile[];
  fileSearch: string;
  setFileSearch: (v: string) => void;
  fileParentId: string;
  setFileParentId: (v: string) => void;
  selectedFileId: string;
  setSelectedFileId: (v: string) => void;
  fileVersions: FileVersion[];
  currentFolders: LabFile[];
  currentFileItems: LabFile[];
  selectedFile: LabFile | undefined;
  canManageFiles: boolean;
  loading: boolean;
  fileNodeType: FileNodeType;
  setFileNodeType: (v: FileNodeType) => void;
  fileTitle: string;
  setFileTitle: (v: string) => void;
  fileCategory: FileCategory;
  setFileCategory: (v: FileCategory) => void;
  fileVisibility: FileVisibility;
  setFileVisibility: (v: FileVisibility) => void;
  fileTags: string;
  setFileTags: (v: string) => void;
  fileDriveUrl: string;
  setFileDriveUrl: (v: string) => void;
  fileDescription: string;
  setFileDescription: (v: string) => void;
  versionNote: string;
  setVersionNote: (v: string) => void;
  onFileUpload: (file: File | null) => void;
  onRegisterFile: (e: SyntheticEvent<HTMLFormElement>) => void;
  onAddFileVersion: (e: SyntheticEvent<HTMLFormElement>) => void;
  onDownloadVersion: (version: FileVersion) => void;
}

export function FilePanel({
  files,
  fileSearch,
  setFileSearch,
  fileParentId,
  setFileParentId,
  selectedFileId,
  setSelectedFileId,
  fileVersions,
  currentFolders,
  currentFileItems,
  selectedFile,
  canManageFiles,
  loading,
  fileNodeType,
  setFileNodeType,
  fileTitle,
  setFileTitle,
  fileCategory,
  setFileCategory,
  fileVisibility,
  setFileVisibility,
  fileTags,
  setFileTags,
  fileDriveUrl,
  setFileDriveUrl,
  fileDescription,
  setFileDescription,
  versionNote,
  setVersionNote,
  onFileUpload,
  onRegisterFile,
  onAddFileVersion,
  onDownloadVersion
}: FilePanelProps) {
  return (
    <section className="panel" id="files">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Files</p>
          <h2>文件资料与版本</h2>
        </div>
        <FileText size={20} />
      </div>

      <div className="file-layout">
        <div className="file-list">
          <div className="file-toolbar">
            <label className="search-box">
              搜索资料
              <input
                placeholder="按标题、标签、上传者搜索"
                value={fileSearch}
                onChange={(event) => setFileSearch(event.target.value)}
              />
            </label>
            <label>
              当前文件夹
              <select
                value={fileParentId}
                onChange={(event) => {
                  setFileParentId(event.target.value);
                  setSelectedFileId("");
                }}
              >
                <option value="">全部 / 根目录</option>
                {files
                  .filter((file) => file.nodeType === "folder")
                  .map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.title}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="file-grid list-frame">
            {currentFolders.map((folder) => (
              <article
                className="file-card folder-card"
                key={folder.id}
                onClick={() => {
                  setFileParentId(folder.id);
                  setSelectedFileId("");
                }}
              >
                <div>
                  <b>
                    <Folder size={15} />
                    文件夹
                  </b>
                  <span>{visibilityText(folder.visibility)}</span>
                </div>
                <h3>{folder.title}</h3>
                <p>{folder.description}</p>
                <small>{folder.tags.join(" / ") || "未设置标签"}</small>
              </article>
            ))}
            {currentFileItems.map((file) => (
              <article
                className={`file-card ${selectedFileId === file.id ? "selected" : ""}`}
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
              >
                <div>
                  <b>{fileCategoryText(file.category)}</b>
                  <span>v{file.currentVersion}</span>
                </div>
                <h3>{file.title}</h3>
                <p>{file.description}</p>
                <small>
                  {visibilityText(file.visibility)} · {formatFileSize(file.sizeBytes)} ·{" "}
                  {file.ownerName}
                </small>
                {file.driveUrl ? (
                  <a href={file.driveUrl} target="_blank" rel="noreferrer">
                    <LinkIcon size={16} />
                    打开 NAS/外部链接
                  </a>
                ) : null}
              </article>
            ))}
            {files.length === 0 ? <div className="empty-row">暂无文件资料。</div> : null}
          </div>

          {selectedFile ? (
            <div className="version-panel">
              <div className="panel-head compact">
                <div>
                  <p className="eyebrow">Versions</p>
                  <h3>{selectedFile.title}</h3>
                </div>
                <span>{fileVersions.length} 个版本</span>
              </div>
              {fileVersions.map((version) => (
                <div className="version-row" key={version.id}>
                  <span>
                    <strong>v{version.version}</strong>
                    <small>
                      {version.originalName} · {formatFileSize(version.sizeBytes)} ·{" "}
                      {version.uploaderName}
                    </small>
                  </span>
                  <button type="button" onClick={() => onDownloadVersion(version)}>
                    <Download size={15} />
                    下载/打开
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {canManageFiles ? (
          <div className="file-form-stack">
            <form className="file-form" onSubmit={onRegisterFile}>
              <h3>创建文件/文件夹</h3>
              <label>
                类型
                <select
                  value={fileNodeType}
                  onChange={(event) => setFileNodeType(event.target.value as FileNodeType)}
                >
                  <option value="file">文件</option>
                  <option value="folder">文件夹</option>
                </select>
              </label>
              <label>
                标题
                <input value={fileTitle} onChange={(event) => setFileTitle(event.target.value)} />
              </label>
              <label>
                分类
                <select
                  value={fileCategory}
                  onChange={(event) => setFileCategory(event.target.value as FileCategory)}
                >
                  <option value="sop">SOP</option>
                  <option value="template">模板</option>
                  <option value="record">记录</option>
                  <option value="dataset">数据集</option>
                  <option value="meeting">会议资料</option>
                  <option value="other">其他</option>
                </select>
              </label>
              <label>
                权限
                <select
                  value={fileVisibility}
                  onChange={(event) => setFileVisibility(event.target.value as FileVisibility)}
                >
                  <option value="public">公开</option>
                  <option value="group">课题组可见</option>
                  <option value="private">仅自己可见</option>
                </select>
              </label>
              <label>
                标签
                <input value={fileTags} onChange={(event) => setFileTags(event.target.value)} />
              </label>
              {fileNodeType === "file" ? (
                <>
                  <label>
                    小文件上传
                    <input
                      type="file"
                      onChange={(event) => onFileUpload(event.currentTarget.files?.[0] ?? null)}
                    />
                  </label>
                  <label>
                    NAS / 外部链接
                    <input
                      value={fileDriveUrl}
                      onChange={(event) => setFileDriveUrl(event.target.value)}
                    />
                  </label>
                </>
              ) : null}
              <label>
                说明
                <textarea
                  value={fileDescription}
                  onChange={(event) => setFileDescription(event.target.value)}
                />
              </label>
              <button className="primary" disabled={loading}>
                {loading ? "保存中..." : fileNodeType === "folder" ? "创建文件夹" : "保存资料"}
              </button>
            </form>

            {selectedFile ? (
              <form className="file-form" onSubmit={onAddFileVersion}>
                <h3>新增文件版本</h3>
                <label>
                  版本文件
                  <input
                    type="file"
                    onChange={(event) => onFileUpload(event.currentTarget.files?.[0] ?? null)}
                  />
                </label>
                <label>
                  或填写 NAS 链接
                  <input
                    value={fileDriveUrl}
                    onChange={(event) => setFileDriveUrl(event.target.value)}
                  />
                </label>
                <label>
                  更新说明
                  <textarea
                    value={versionNote}
                    onChange={(event) => setVersionNote(event.target.value)}
                  />
                </label>
                <button className="primary" disabled={loading}>
                  <Upload size={16} />
                  {loading ? "更新中..." : "新增版本"}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
