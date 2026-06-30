import type { Actor, PluginManifest } from "@lab/core";
import { randomUUID } from "node:crypto";
import pg from "pg";

type FileCategory = "sop" | "template" | "record" | "dataset" | "meeting" | "other";
type FileNodeType = "folder" | "file";
type FileVisibility = "public" | "group" | "private";
type StorageProvider = "database" | "synology" | "external_link";
type FileKind =
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

interface LabFile {
  id: string;
  nodeType: FileNodeType;
  title: string;
  category: FileCategory;
  fileKind?: FileKind;
  parentId?: string;
  projectId?: string;
  reportId?: string;
  nasPath?: string;
  isRequired?: boolean;
  tags: string[];
  visibility: FileVisibility;
  storageProvider: StorageProvider;
  driveUrl?: string;
  description: string;
  ownerId: string;
  ownerName: string;
  currentVersion: number;
  latestVersionId?: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
  updatedAt: string;
}

interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64?: string;
  driveUrl?: string;
  changeNote: string;
  uploaderId: string;
  uploaderName: string;
  createdAt: string;
}

interface FileCreateRequest {
  nodeType?: FileNodeType;
  title: string;
  category: FileCategory;
  fileKind?: FileKind;
  parentId?: string;
  projectId?: string;
  reportId?: string;
  nasPath?: string;
  isRequired?: boolean;
  tags?: string[];
  visibility?: FileVisibility;
  driveUrl?: string;
  description?: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  contentBase64?: string;
}

interface FileVersionRequest {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64?: string;
  driveUrl?: string;
  changeNote?: string;
}

interface FileRepository {
  initialize(): Promise<void>;
  listFiles(
    actor: Actor,
    filters: { search?: string; parentId?: string; projectId?: string }
  ): Promise<LabFile[]>;
  createFile(input: Omit<LabFile, "id" | "createdAt" | "updatedAt">): Promise<LabFile>;
  addVersion(
    fileId: string,
    input: Omit<FileVersion, "id" | "fileId" | "version" | "createdAt">
  ): Promise<FileVersion>;
  listVersions(fileId: string, actor: Actor): Promise<FileVersion[]>;
  getVersionDownload(fileId: string, versionId: string, actor: Actor): Promise<FileVersion | null>;
}

const maxInlineFileBytes = 5 * 1024 * 1024;

const seedFiles: LabFile[] = [
  {
    id: "folder-safety",
    nodeType: "folder",
    title: "安全培训",
    category: "sop",
    tags: ["安全", "培训"],
    visibility: "public",
    storageProvider: "external_link",
    description: "实验室安全培训与制度资料。",
    ownerId: "u-admin",
    ownerName: "实验室管理员",
    currentVersion: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: "f-001",
    nodeType: "file",
    title: "实验室安全培训材料",
    category: "sop",
    parentId: "folder-safety",
    tags: ["安全", "SOP"],
    visibility: "public",
    storageProvider: "synology",
    driveUrl: "https://synology-drive.example.local/safety-training",
    description: "实验室安全培训资料，当前通过 Synology Drive 共享访问。",
    ownerId: "u-admin",
    ownerName: "实验室管理员",
    currentVersion: 1,
    latestVersionId: "fv-001",
    originalName: "safety-training.pdf",
    mimeType: "application/pdf",
    sizeBytes: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
  }
];

const seedVersions: FileVersion[] = [
  {
    id: "fv-001",
    fileId: "f-001",
    version: 1,
    originalName: "safety-training.pdf",
    mimeType: "application/pdf",
    sizeBytes: 0,
    driveUrl: "https://synology-drive.example.local/safety-training",
    changeNote: "初始资料登记",
    uploaderId: "u-admin",
    uploaderName: "实验室管理员",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
  }
];

class MemoryFileRepository implements FileRepository {
  private readonly files = structuredClone(seedFiles);
  private readonly versions = structuredClone(seedVersions);

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async listFiles(
    actor: Actor,
    filters: { search?: string; parentId?: string; projectId?: string }
  ): Promise<LabFile[]> {
    const keyword = filters.search?.trim().toLowerCase() ?? "";
    const parentId = filters.parentId?.trim();
    const projectId = filters.projectId?.trim();
    return this.files
      .filter((file) => canReadFile(file, actor))
      .filter((file) => (parentId === undefined ? true : (file.parentId ?? "") === parentId))
      .filter((file) => (projectId === undefined ? true : (file.projectId ?? "") === projectId))
      .filter((file) =>
        [file.title, file.category, file.description, file.tags.join(" "), file.ownerName].some(
          (value) => value.toLowerCase().includes(keyword)
        )
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async createFile(input: Omit<LabFile, "id" | "createdAt" | "updatedAt">): Promise<LabFile> {
    const now = new Date().toISOString();
    const file = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    this.files.unshift(file);
    return file;
  }

  async addVersion(
    fileId: string,
    input: Omit<FileVersion, "id" | "fileId" | "version" | "createdAt">
  ): Promise<FileVersion> {
    const file = this.files.find((item) => item.id === fileId && item.nodeType === "file");
    if (!file) {
      throw new Error("file not found");
    }

    const version = file.currentVersion + 1;
    const nextVersion = {
      ...input,
      id: randomUUID(),
      fileId,
      version,
      createdAt: new Date().toISOString()
    };
    this.versions.unshift(nextVersion);
    file.currentVersion = version;
    file.latestVersionId = nextVersion.id;
    file.originalName = nextVersion.originalName;
    file.mimeType = nextVersion.mimeType;
    file.sizeBytes = nextVersion.sizeBytes;
    file.driveUrl = nextVersion.driveUrl;
    file.storageProvider = nextVersion.contentBase64 ? "database" : "synology";
    file.updatedAt = nextVersion.createdAt;
    return nextVersion;
  }

  async listVersions(fileId: string, actor: Actor): Promise<FileVersion[]> {
    const file = this.files.find((item) => item.id === fileId);
    if (!file || !canReadFile(file, actor)) {
      return [];
    }
    return this.versions
      .filter((version) => version.fileId === fileId)
      .map((version) => ({
        id: version.id,
        fileId: version.fileId,
        version: version.version,
        originalName: version.originalName,
        mimeType: version.mimeType,
        sizeBytes: version.sizeBytes,
        driveUrl: version.driveUrl,
        changeNote: version.changeNote,
        uploaderId: version.uploaderId,
        uploaderName: version.uploaderName,
        createdAt: version.createdAt
      }))
      .sort((left, right) => right.version - left.version);
  }

  async getVersionDownload(
    fileId: string,
    versionId: string,
    actor: Actor
  ): Promise<FileVersion | null> {
    const file = this.files.find((item) => item.id === fileId);
    if (!file || !canReadFile(file, actor)) {
      return null;
    }
    return (
      this.versions.find((version) => version.id === versionId && version.fileId === fileId) ?? null
    );
  }
}

class PostgresFileRepository implements FileRepository {
  private readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({ connectionString: databaseUrl });
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE SCHEMA IF NOT EXISTS files;

      CREATE TABLE IF NOT EXISTS files.lab_file (
        id TEXT PRIMARY KEY,
        node_type TEXT NOT NULL DEFAULT 'file' CHECK (node_type IN ('folder', 'file')),
        title TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('sop', 'template', 'record', 'dataset', 'meeting', 'other')),
        file_kind TEXT,
        parent_id TEXT REFERENCES files.lab_file(id),
        project_id TEXT,
        report_id TEXT,
        nas_path TEXT,
        is_required BOOLEAN NOT NULL DEFAULT false,
        tags TEXT[] NOT NULL DEFAULT '{}',
        visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'group', 'private')),
        storage_provider TEXT NOT NULL DEFAULT 'external_link' CHECK (storage_provider IN ('database', 'synology', 'external_link')),
        drive_url TEXT,
        description TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        owner_name TEXT NOT NULL DEFAULT '',
        current_version INTEGER NOT NULL DEFAULT 0,
        latest_version_id TEXT,
        original_name TEXT,
        mime_type TEXT,
        size_bytes INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS node_type TEXT NOT NULL DEFAULT 'file';
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS parent_id TEXT;
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS file_kind TEXT;
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS report_id TEXT;
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS nas_path TEXT;
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'external_link';
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS owner_name TEXT NOT NULL DEFAULT '';
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS project_id TEXT;
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS latest_version_id TEXT;
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS original_name TEXT;
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS mime_type TEXT;
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS size_bytes INTEGER;
      ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
      ALTER TABLE files.lab_file ALTER COLUMN drive_url DROP NOT NULL;

      ALTER TABLE files.lab_file DROP CONSTRAINT IF EXISTS lab_file_category_check;
      ALTER TABLE files.lab_file DROP CONSTRAINT IF EXISTS lab_file_node_type_check;
      ALTER TABLE files.lab_file DROP CONSTRAINT IF EXISTS lab_file_visibility_check;
      ALTER TABLE files.lab_file DROP CONSTRAINT IF EXISTS lab_file_storage_provider_check;
      ALTER TABLE files.lab_file ADD CONSTRAINT lab_file_category_check
        CHECK (category IN ('sop', 'template', 'record', 'dataset', 'meeting', 'other'));
      ALTER TABLE files.lab_file ADD CONSTRAINT lab_file_node_type_check
        CHECK (node_type IN ('folder', 'file'));
      ALTER TABLE files.lab_file ADD CONSTRAINT lab_file_visibility_check
        CHECK (visibility IN ('public', 'group', 'private'));
      ALTER TABLE files.lab_file ADD CONSTRAINT lab_file_storage_provider_check
        CHECK (storage_provider IN ('database', 'synology', 'external_link'));

      CREATE TABLE IF NOT EXISTS files.file_version (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL REFERENCES files.lab_file(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        content_base64 TEXT,
        drive_url TEXT,
        change_note TEXT NOT NULL,
        uploader_id TEXT NOT NULL,
        uploader_name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (file_id, version)
      );

      CREATE INDEX IF NOT EXISTS lab_file_parent_idx ON files.lab_file(parent_id);
      CREATE INDEX IF NOT EXISTS lab_file_updated_idx ON files.lab_file(updated_at DESC);
      CREATE INDEX IF NOT EXISTS file_version_file_idx ON files.file_version(file_id, version DESC);
    `);

    const count = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM files.lab_file"
    );
    if (Number(count.rows[0]?.count ?? 0) === 0) {
      for (const file of seedFiles) {
        await this.pool.query(
          `INSERT INTO files.lab_file
            (id, node_type, title, category, file_kind, parent_id, project_id, report_id, nas_path, is_required, tags, visibility, storage_provider,
             drive_url, description, owner_id, owner_name, current_version, latest_version_id,
             original_name, mime_type, size_bytes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
          [
            file.id,
            file.nodeType,
            file.title,
            file.category,
            file.fileKind ?? null,
            file.parentId ?? null,
            file.projectId ?? null,
            file.reportId ?? null,
            file.nasPath ?? null,
            file.isRequired ?? false,
            file.tags,
            file.visibility,
            file.storageProvider,
            file.driveUrl ?? null,
            file.description,
            file.ownerId,
            file.ownerName,
            file.currentVersion,
            file.latestVersionId ?? null,
            file.originalName ?? null,
            file.mimeType ?? null,
            file.sizeBytes ?? null,
            file.createdAt,
            file.updatedAt
          ]
        );
      }

      for (const version of seedVersions) {
        await this.pool.query(
          `INSERT INTO files.file_version
            (id, file_id, version, original_name, mime_type, size_bytes, content_base64,
             drive_url, change_note, uploader_id, uploader_name, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            version.id,
            version.fileId,
            version.version,
            version.originalName,
            version.mimeType,
            version.sizeBytes,
            version.contentBase64 ?? null,
            version.driveUrl ?? null,
            version.changeNote,
            version.uploaderId,
            version.uploaderName,
            version.createdAt
          ]
        );
      }
    }
  }

  async listFiles(
    actor: Actor,
    filters: { search?: string; parentId?: string; projectId?: string }
  ): Promise<LabFile[]> {
    const keyword = `%${filters.search?.trim() ?? ""}%`;
    const parentId = filters.parentId?.trim() || null;
    const projectId = filters.projectId?.trim() || null;
    const result = await this.pool.query(
      `SELECT *
       FROM files.lab_file
       WHERE (visibility <> 'private' OR owner_id = $3)
         AND (($2::text IS NULL) OR COALESCE(parent_id, '') = $2)
         AND (($4::text IS NULL) OR COALESCE(project_id, '') = $4)
         AND (
          $1 = '%%'
          OR title ILIKE $1
          OR category ILIKE $1
          OR description ILIKE $1
          OR owner_name ILIKE $1
          OR EXISTS (SELECT 1 FROM unnest(tags) tag WHERE tag ILIKE $1)
         )
       ORDER BY node_type ASC, updated_at DESC
       LIMIT 300`,
      [keyword, parentId, actor.id, projectId]
    );
    return result.rows.map(mapFileRow);
  }

  async createFile(input: Omit<LabFile, "id" | "createdAt" | "updatedAt">): Promise<LabFile> {
    const result = await this.pool.query(
      `INSERT INTO files.lab_file
        (id, node_type, title, category, file_kind, parent_id, project_id, report_id, nas_path, is_required, tags, visibility, storage_provider,
         drive_url, description, owner_id, owner_name, current_version, latest_version_id,
         original_name, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
       RETURNING *`,
      [
        randomUUID(),
        input.nodeType,
        input.title,
        input.category,
        input.fileKind ?? null,
        input.parentId ?? null,
        input.projectId ?? null,
        input.reportId ?? null,
        input.nasPath ?? null,
        input.isRequired ?? false,
        input.tags,
        input.visibility,
        input.storageProvider,
        input.driveUrl ?? null,
        input.description,
        input.ownerId,
        input.ownerName,
        input.currentVersion,
        input.latestVersionId ?? null,
        input.originalName ?? null,
        input.mimeType ?? null,
        input.sizeBytes ?? null
      ]
    );
    return mapFileRow(result.rows[0]);
  }

  async addVersion(
    fileId: string,
    input: Omit<FileVersion, "id" | "fileId" | "version" | "createdAt">
  ): Promise<FileVersion> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const fileResult = await client.query<{ current_version: number }>(
        "SELECT current_version FROM files.lab_file WHERE id = $1 AND node_type = 'file' FOR UPDATE",
        [fileId]
      );
      const file = fileResult.rows[0];
      if (!file) {
        throw new Error("file not found");
      }

      const version = Number(file.current_version) + 1;
      const versionId = randomUUID();
      const result = await client.query(
        `INSERT INTO files.file_version
          (id, file_id, version, original_name, mime_type, size_bytes, content_base64,
           drive_url, change_note, uploader_id, uploader_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          versionId,
          fileId,
          version,
          input.originalName,
          input.mimeType,
          input.sizeBytes,
          input.contentBase64 ?? null,
          input.driveUrl ?? null,
          input.changeNote,
          input.uploaderId,
          input.uploaderName
        ]
      );

      await client.query(
        `UPDATE files.lab_file
         SET current_version = $1,
             latest_version_id = $2,
             original_name = $3,
             mime_type = $4,
             size_bytes = $5,
             drive_url = $6,
             storage_provider = $7,
             updated_at = now()
         WHERE id = $8`,
        [
          version,
          versionId,
          input.originalName,
          input.mimeType,
          input.sizeBytes,
          input.driveUrl ?? null,
          input.contentBase64 ? "database" : "synology",
          fileId
        ]
      );
      await client.query("COMMIT");
      return mapVersionRow(result.rows[0], true);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listVersions(fileId: string, actor: Actor): Promise<FileVersion[]> {
    const access = await this.pool.query(
      "SELECT * FROM files.lab_file WHERE id = $1 AND (visibility <> 'private' OR owner_id = $2)",
      [fileId, actor.id]
    );
    if (!access.rows[0]) {
      return [];
    }

    const result = await this.pool.query(
      `SELECT id, file_id, version, original_name, mime_type, size_bytes, drive_url,
              change_note, uploader_id, uploader_name, created_at
       FROM files.file_version
       WHERE file_id = $1
       ORDER BY version DESC`,
      [fileId]
    );
    return result.rows.map((row) => mapVersionRow(row, false));
  }

  async getVersionDownload(
    fileId: string,
    versionId: string,
    actor: Actor
  ): Promise<FileVersion | null> {
    const result = await this.pool.query(
      `SELECT v.*
       FROM files.file_version v
       JOIN files.lab_file f ON f.id = v.file_id
       WHERE v.file_id = $1
         AND v.id = $2
         AND (f.visibility <> 'private' OR f.owner_id = $3)`,
      [fileId, versionId, actor.id]
    );
    return result.rows[0] ? mapVersionRow(result.rows[0], true) : null;
  }
}

function mapFileRow(row: Record<string, unknown>): LabFile {
  return {
    id: String(row.id),
    nodeType: row.node_type as FileNodeType,
    title: String(row.title),
    category: row.category as FileCategory,
    fileKind: row.file_kind ? (row.file_kind as FileKind) : undefined,
    parentId: row.parent_id ? String(row.parent_id) : undefined,
    projectId: row.project_id ? String(row.project_id) : undefined,
    reportId: row.report_id ? String(row.report_id) : undefined,
    nasPath: row.nas_path ? String(row.nas_path) : undefined,
    isRequired: Boolean(row.is_required),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    visibility: row.visibility as FileVisibility,
    storageProvider: row.storage_provider as StorageProvider,
    driveUrl: row.drive_url ? String(row.drive_url) : undefined,
    description: String(row.description),
    ownerId: String(row.owner_id),
    ownerName: String(row.owner_name),
    currentVersion: Number(row.current_version ?? 0),
    latestVersionId: row.latest_version_id ? String(row.latest_version_id) : undefined,
    originalName: row.original_name ? String(row.original_name) : undefined,
    mimeType: row.mime_type ? String(row.mime_type) : undefined,
    sizeBytes:
      row.size_bytes === null || row.size_bytes === undefined ? undefined : Number(row.size_bytes),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function mapVersionRow(row: Record<string, unknown>, includeContent: boolean): FileVersion {
  return {
    id: String(row.id),
    fileId: String(row.file_id),
    version: Number(row.version),
    originalName: String(row.original_name),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes ?? 0),
    contentBase64: includeContent && row.content_base64 ? String(row.content_base64) : undefined,
    driveUrl: row.drive_url ? String(row.drive_url) : undefined,
    changeNote: String(row.change_note),
    uploaderId: String(row.uploader_id),
    uploaderName: String(row.uploader_name),
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

function createRepository(): FileRepository {
  if (!process.env.DATABASE_URL) {
    return new MemoryFileRepository();
  }
  return new PostgresFileRepository(process.env.DATABASE_URL);
}

function canReadFile(file: LabFile, actor: Actor): boolean {
  return file.visibility !== "private" || file.ownerId === actor.id;
}

function normalizeTags(tags?: string[]): string[] {
  return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))].slice(0, 10);
}

function validateUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "driveUrl must be http or https";
    }
  } catch {
    return "driveUrl must be a valid URL";
  }
  return null;
}

function validateCreateRequest(request: Partial<FileCreateRequest>): string | null {
  const nodeType = request.nodeType ?? "file";
  if (!["folder", "file"].includes(nodeType)) {
    return "nodeType must be folder or file";
  }
  if (!request.title?.trim()) {
    return "title is required";
  }
  if (
    !["sop", "template", "record", "dataset", "meeting", "other"].includes(request.category ?? "")
  ) {
    return "category must be sop, template, record, dataset, meeting or other";
  }
  if (
    request.fileKind &&
    ![
      "project_tree",
      "report_doc",
      "report_ppt",
      "experiment_record",
      "design_doc",
      "api_doc",
      "code_snapshot",
      "dataset",
      "model_weight",
      "meeting_minutes",
      "other"
    ].includes(request.fileKind)
  ) {
    return "invalid fileKind";
  }
  if (request.visibility && !["public", "group", "private"].includes(request.visibility)) {
    return "visibility must be public, group or private";
  }
  const urlError = validateUrl(request.driveUrl);
  if (urlError) {
    return urlError;
  }
  if (nodeType === "file" && !request.driveUrl && !request.contentBase64) {
    return "file requires driveUrl or contentBase64";
  }
  if (request.sizeBytes && request.sizeBytes > maxInlineFileBytes && request.contentBase64) {
    return "inline file content must be 5MB or smaller";
  }
  return null;
}

function validateVersionRequest(request: Partial<FileVersionRequest>): string | null {
  if (!request.originalName?.trim()) {
    return "originalName is required";
  }
  if (!request.mimeType?.trim()) {
    return "mimeType is required";
  }
  if (!Number.isFinite(request.sizeBytes) || Number(request.sizeBytes) < 0) {
    return "sizeBytes must be a non-negative number";
  }
  const urlError = validateUrl(request.driveUrl);
  if (urlError) {
    return urlError;
  }
  if (!request.driveUrl && !request.contentBase64) {
    return "version requires driveUrl or contentBase64";
  }
  if (request.contentBase64 && Number(request.sizeBytes) > maxInlineFileBytes) {
    return "inline file content must be 5MB or smaller";
  }
  return null;
}

export const filesPlugin: PluginManifest = {
  name: "files",
  version: "0.2.0",
  description: "文件资料模块，支持文件夹、权限、标签、版本和 NAS 链接兼容",
  capabilities: ["files:metadata", "files:tree", "files:versioning", "files:synology-drive-link"],
  routes: [
    { method: "GET", path: "/files", permission: "file:read", summary: "查询文件资料" },
    { method: "POST", path: "/files", permission: "file:write", summary: "创建文件或文件夹" },
    {
      method: "GET",
      path: "/projects/:id/files",
      permission: "project:read",
      summary: "查询项目资料"
    },
    {
      method: "POST",
      path: "/projects/:id/files",
      permission: "project:read",
      summary: "上传项目资料"
    },
    {
      method: "GET",
      path: "/files/:id/versions",
      permission: "file:read",
      summary: "查询文件版本"
    },
    {
      method: "POST",
      path: "/files/:id/versions",
      permission: "file:write",
      summary: "新增文件版本"
    },
    {
      method: "GET",
      path: "/files/:id/versions/:versionId/download",
      permission: "file:read",
      summary: "获取文件版本内容或 NAS 链接"
    }
  ],
  eventsPublished: ["files.file.created", "files.version.created"],
  eventsSubscribed: [],
  async activate(context) {
    const repository = createRepository();
    await repository.initialize();

    return {
      name: "files",
      routes: [
        {
          method: "GET",
          path: "/files",
          permission: "file:read",
          summary: "查询文件资料",
          handler: async ({ actor, query }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }
            const params = query as Partial<{
              search: string;
              parentId: string;
              projectId: string;
            }>;
            return {
              body: await repository.listFiles(actor, {
                search: params.search,
                parentId: params.parentId,
                projectId: params.projectId
              })
            };
          }
        },
        {
          method: "POST",
          path: "/files",
          permission: "file:write",
          summary: "创建文件或文件夹",
          handler: async ({ actor, body }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }

            const request = body as Partial<FileCreateRequest>;
            const error = validateCreateRequest(request);
            if (error) {
              return { status: 400, body: { error } };
            }

            const nodeType = request.nodeType ?? "file";
            const file = await repository.createFile({
              nodeType,
              title: request.title!.trim(),
              category: request.category!,
              parentId: request.parentId?.trim() || undefined,
              tags: normalizeTags(request.tags),
              visibility: request.visibility ?? "public",
              storageProvider: request.contentBase64
                ? "database"
                : request.driveUrl
                  ? "synology"
                  : "external_link",
              driveUrl: request.driveUrl?.trim(),
              description: request.description?.trim() || "未填写",
              ownerId: actor.id,
              ownerName: actor.displayName ?? actor.username ?? actor.id,
              currentVersion: 0,
              latestVersionId: undefined,
              originalName: request.originalName,
              mimeType: request.mimeType,
              sizeBytes: request.sizeBytes
            });

            if (nodeType === "file") {
              await repository.addVersion(file.id, {
                originalName: request.originalName ?? `${file.title}.link`,
                mimeType: request.mimeType ?? "text/uri-list",
                sizeBytes: request.sizeBytes ?? 0,
                contentBase64: request.contentBase64,
                driveUrl: request.driveUrl,
                changeNote: "初始版本",
                uploaderId: actor.id,
                uploaderName: actor.displayName ?? actor.username ?? actor.id
              });
            }

            await context.audit.record({
              actorId: actor.id,
              action: nodeType === "folder" ? "files.folder.created" : "files.file.created",
              targetType: "lab_file",
              targetId: file.id,
              occurredAt: new Date().toISOString(),
              metadata: {
                category: file.category,
                title: file.title,
                visibility: file.visibility
              }
            });

            await context.eventBus.publish({
              id: randomUUID(),
              type: "files.file.created",
              version: 1,
              occurredAt: new Date().toISOString(),
              source: "files",
              payload: { fileId: file.id, nodeType: file.nodeType, title: file.title }
            });

            return { status: 201, body: file };
          }
        },
        {
          method: "GET",
          path: "/projects/:id/files",
          permission: "project:read",
          summary: "查询项目资料",
          handler: async ({ actor, params, query }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }
            const request = query as Partial<{ search: string; parentId: string }>;
            return {
              body: await repository.listFiles(actor, {
                search: request.search,
                parentId: request.parentId,
                projectId: params.id
              })
            };
          }
        },
        {
          method: "POST",
          path: "/projects/:id/files",
          permission: "project:read",
          summary: "上传项目资料",
          handler: async ({ actor, params, body }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }

            const request = body as Partial<FileCreateRequest>;
            const error = validateCreateRequest({ ...request, projectId: params.id });
            if (error) {
              return { status: 400, body: { error } };
            }

            const nodeType = request.nodeType ?? "file";
            const file = await repository.createFile({
              nodeType,
              title: request.title!.trim(),
              category: request.category!,
              fileKind: request.fileKind,
              parentId: request.parentId?.trim() || undefined,
              projectId: params.id,
              reportId: request.reportId?.trim() || undefined,
              nasPath: request.nasPath?.trim() || undefined,
              isRequired: request.isRequired ?? false,
              tags: normalizeTags(request.tags),
              visibility: request.visibility ?? "group",
              storageProvider: request.contentBase64
                ? "database"
                : request.driveUrl
                  ? "synology"
                  : "external_link",
              driveUrl: request.driveUrl?.trim(),
              description: request.description?.trim() || "项目资料上传",
              ownerId: actor.id,
              ownerName: actor.displayName ?? actor.username ?? actor.id,
              currentVersion: 0,
              latestVersionId: undefined,
              originalName: request.originalName,
              mimeType: request.mimeType,
              sizeBytes: request.sizeBytes
            });

            if (nodeType === "file") {
              await repository.addVersion(file.id, {
                originalName: request.originalName ?? `${file.title}.link`,
                mimeType: request.mimeType ?? "text/uri-list",
                sizeBytes: request.sizeBytes ?? 0,
                contentBase64: request.contentBase64,
                driveUrl: request.driveUrl,
                changeNote: "项目资料初始版本",
                uploaderId: actor.id,
                uploaderName: actor.displayName ?? actor.username ?? actor.id
              });
            }

            return { status: 201, body: file };
          }
        },
        {
          method: "GET",
          path: "/files/:id/versions",
          permission: "file:read",
          summary: "查询文件版本",
          handler: async ({ actor, params }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }
            return { body: await repository.listVersions(params.id, actor) };
          }
        },
        {
          method: "POST",
          path: "/files/:id/versions",
          permission: "file:write",
          summary: "新增文件版本",
          handler: async ({ actor, params, body }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }
            const request = body as Partial<FileVersionRequest>;
            const error = validateVersionRequest(request);
            if (error) {
              return { status: 400, body: { error } };
            }

            try {
              const version = await repository.addVersion(params.id, {
                originalName: request.originalName!.trim(),
                mimeType: request.mimeType!.trim(),
                sizeBytes: Number(request.sizeBytes),
                contentBase64: request.contentBase64,
                driveUrl: request.driveUrl?.trim(),
                changeNote: request.changeNote?.trim() || "更新版本",
                uploaderId: actor.id,
                uploaderName: actor.displayName ?? actor.username ?? actor.id
              });

              await context.audit.record({
                actorId: actor.id,
                action: "files.version.created",
                targetType: "file_version",
                targetId: version.id,
                occurredAt: new Date().toISOString(),
                metadata: { fileId: params.id, version: version.version }
              });

              await context.eventBus.publish({
                id: randomUUID(),
                type: "files.version.created",
                version: 1,
                occurredAt: new Date().toISOString(),
                source: "files",
                payload: { fileId: params.id, versionId: version.id, version: version.version }
              });

              return { status: 201, body: version };
            } catch (error) {
              return {
                status: error instanceof Error && error.message.includes("not found") ? 404 : 400,
                body: { error: error instanceof Error ? error.message : "version create failed" }
              };
            }
          }
        },
        {
          method: "GET",
          path: "/files/:id/versions/:versionId/download",
          permission: "file:read",
          summary: "获取文件版本内容或 NAS 链接",
          handler: async ({ actor, params }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }
            const version = await repository.getVersionDownload(params.id, params.versionId, actor);
            if (!version) {
              return { status: 404, body: { error: "file version not found" } };
            }
            return { body: version };
          }
        }
      ]
    };
  }
};
