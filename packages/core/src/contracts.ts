export type Role = "student" | "professor" | "lab_admin" | "member" | "admin" | "super_admin";
export type IdentityType = "student_no" | "employee_no";

export type Permission =
  | "user:read"
  | "user:write"
  | "inventory:read"
  | "inventory:apply" // 申请领用
  | "inventory:approve" // 审批申请
  | "inventory:stock" // 入库登记
  | "file:read"
  | "file:write"
  | "project:read"
  | "project:write"
  | "project:progress" // 上传进度报告
  | "meeting:read"
  | "meeting:write"
  | "ai:use"
  | "ai:manage"; // 管理知识库

export interface Actor {
  id: string;
  username?: string;
  displayName?: string;
  role: Role;
  permissions: Permission[];
}

export interface LocalUserRegistrationRequest {
  username: string;
  password: string;
  identityType: IdentityType;
  identityNo: string;
  displayName: string;
  role: Role;
}

export interface ManagedUser {
  id: string;
  username: string;
  identityType: IdentityType;
  identityNo: string;
  phone?: string;
  displayName: string;
  role: Role;
  identityProvider: string;
  active: boolean;
  createdAt: string;
}

/** 项目-用户关联（多对多） */
export interface ProjectMember {
  projectId: string;
  userId: string;
  memberRole: "leader" | "member" | "advisor" | "manager";
  joinedAt: string;
}

export interface AuthPort {
  login?(username: string, password: string): Promise<{ token: string; actor: Actor } | null>;
  registerLocalUser?(request: LocalUserRegistrationRequest): Promise<Actor>;
  listUsers?(search?: string, includeInactive?: boolean): Promise<ManagedUser[]>;
  getUserProfile?(actorId: string): Promise<ManagedUser | null>;
  changePassword?(actorId: string, currentPassword: string, newPassword: string): Promise<void>;
  updateContact?(actorId: string, phone: string): Promise<ManagedUser>;
  resetUserPassword?(targetUserId: string, newPassword: string): Promise<void>;
  deactivateUser?(targetUserId: string): Promise<void>;
  updateUserRole?(targetUserId: string, role: Role): Promise<ManagedUser>;
  authenticate(token: string): Promise<Actor | null>;
  assertPermission(actor: Actor, permission: Permission): void;
}

export interface AuditPort {
  record(entry: AuditEntry): Promise<void>;
}

export interface AuditEntry {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, string | number | boolean>;
  occurredAt: string;
}

export interface RouteDefinition {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  permission?: Permission;
  summary: string;
}

export interface DomainEvent<TPayload extends object = object> {
  id: string;
  type: string;
  version: number;
  occurredAt: string;
  source: string;
  payload: TPayload;
}

export interface EventBus {
  publish<TPayload extends object>(event: DomainEvent<TPayload>): Promise<void>;
  subscribe<TPayload extends object>(
    eventType: string,
    handler: (event: DomainEvent<TPayload>) => Promise<void> | void
  ): () => void;
  subscribeAll(handler: (event: DomainEvent<object>) => Promise<void> | void): () => void;
}

export interface PluginContext {
  eventBus: EventBus;
  auth: AuthPort;
  audit: AuditPort;
  logger: LoggerPort;
}

export interface LoggerPort {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  routes: RouteDefinition[];
  eventsPublished: string[];
  eventsSubscribed: string[];
  activate(context: PluginContext): Promise<ActivatedPlugin>;
}

export interface ActivatedPlugin {
  name: string;
  routes: RegisteredRoute[];
  dispose?: () => Promise<void> | void;
}

export interface RegisteredRoute extends RouteDefinition {
  handler: RouteHandler;
}

export interface RouteHandlerRequest<TBody = unknown, TQuery = unknown> {
  actor: Actor | null;
  body: TBody;
  query: TQuery;
  params: Record<string, string>;
}

export interface RouteHandlerResponse {
  status?: number;
  body: unknown;
}

export type RouteHandler<TBody = unknown, TQuery = unknown> = (
  request: RouteHandlerRequest<TBody, TQuery>
) => Promise<RouteHandlerResponse> | RouteHandlerResponse;
