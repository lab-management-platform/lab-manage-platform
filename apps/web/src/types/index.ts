export type Role = "student" | "professor" | "lab_admin";
export type Permission =
  | "user:read"
  | "user:write"
  | "inventory:read"
  | "inventory:apply"
  | "inventory:approve"
  | "inventory:stock"
  | "file:read"
  | "file:write"
  | "project:read"
  | "project:write"
  | "project:progress"
  | "meeting:read"
  | "meeting:write"
  | "ai:use"
  | "ai:manage";
  | "ai:use";
export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface Actor {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  permissions: string[];
}

export interface Material {
  id: string;
  name: string;
  spec: string;
  stock: number;
  warnStock: number;
  unit: string;
  location: string;
  manager: string;
}

export interface InventoryApplication {
  id: string;
  materialId: string;
  materialName: string;
  applicantId: string;
  applicantName: string;
  projectId?: string;
  quantity: number;
  reason: string;
  status: ApplicationStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewRemark?: string;
}

export interface StockMovement {
  id: string;
  materialId: string;
  materialName: string;
  operatorId: string;
  quantity: number;
  type: "stock_in" | "application_out";
  remark: string;
  createdAt: string;
}

export interface Summary {
  materialCount: number;
  lowStockCount: number;
  pendingApplications: number;
  approvedApplications: number;
}

export interface ManagedUser {
  id: string;
  username: string;
  studentId?: string;
  phone?: string;
  displayName: string;
  role: Role;
  identityProvider: string;
  active: boolean;
  createdAt: string;
}

export type FileCategory = "sop" | "template" | "record" | "dataset" | "meeting" | "other";
export type FileNodeType = "folder" | "file";
export type FileVisibility = "public" | "group" | "private";
export type StorageProvider = "database" | "synology" | "external_link";
export type MeetingStatus = "scheduled" | "completed" | "cancelled";
export type NotificationType = "announcement" | "meeting" | "approval" | "task" | "system";

export interface LabFile {
  id: string;
  nodeType: FileNodeType;
  title: string;
  category: FileCategory;
  parentId?: string;
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

export interface FileVersion {
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

export interface Meeting {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  onlineUrl?: string;
  participantIds: string[];
  agendaFileId?: string;
  minutesFileId?: string;
  summary: string;
  status: MeetingStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  recipientId?: string;
  title: string;
  content: string;
  type: NotificationType;
  relatedType?: string;
  relatedId?: string;
  readAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface KnowledgeSource {
  id: string;
  title: string;
  snippet: string;
}

export interface ChatResponse {
  reply: string;
  sources?: KnowledgeSource[];
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FaqTemplate {
  id: string;
  question: string;
  category: string;
  sortOrder: number;
}

export interface ChatHistoryRecord {
  id: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
