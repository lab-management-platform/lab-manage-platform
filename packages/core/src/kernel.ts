import type {
  Actor,
  ActivatedPlugin,
  AuditPort,
  AuthPort,
  DomainEvent,
  LocalUserRegistrationRequest,
  LoggerPort,
  ManagedUser,
  PluginManifest,
  RegisteredRoute
} from "./contracts.js";
import { InMemoryEventBus } from "./event-bus.js";

export interface KernelOptions {
  auth: AuthPort;
  audit: AuditPort;
  logger: LoggerPort;
}

export class Kernel {
  private readonly activatedPlugins: ActivatedPlugin[] = [];
  private readonly eventBus: InMemoryEventBus;

  constructor(private readonly options: KernelOptions) {
    this.eventBus = new InMemoryEventBus(options.logger);
  }

  async register(plugin: PluginManifest): Promise<void> {
    const activated = await plugin.activate({
      eventBus: this.eventBus,
      auth: this.options.auth,
      audit: this.options.audit,
      logger: this.options.logger
    });

    this.activatedPlugins.push(activated);
    this.options.logger.info("plugin.activated", {
      name: plugin.name,
      routes: activated.routes.length
    });
  }

  get routes(): RegisteredRoute[] {
    return this.activatedPlugins.flatMap((plugin) => plugin.routes);
  }

  get plugins(): string[] {
    return this.activatedPlugins.map((plugin) => plugin.name);
  }

  async authenticate(token: string): Promise<Actor | null> {
    return this.options.auth.authenticate(token);
  }

  async login(username: string, password: string): Promise<{ token: string; actor: Actor } | null> {
    return this.options.auth.login?.(username, password) ?? null;
  }

  async registerLocalUser(request: LocalUserRegistrationRequest): Promise<Actor> {
    if (!this.options.auth.registerLocalUser) {
      throw new Error("Local registration is disabled");
    }
    return this.options.auth.registerLocalUser(request);
  }

  async listUsers(search?: string, includeInactive = false): Promise<ManagedUser[]> {
    if (!this.options.auth.listUsers) {
      return [];
    }
    return this.options.auth.listUsers(search, includeInactive);
  }

  async getUserProfile(actorId: string): Promise<ManagedUser | null> {
    return this.options.auth.getUserProfile?.(actorId) ?? null;
  }

  async changePassword(
    actorId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    if (!this.options.auth.changePassword) {
      throw new Error("Password change is disabled");
    }
    await this.options.auth.changePassword(actorId, currentPassword, newPassword);
  }

  async updateContact(actorId: string, phone: string): Promise<ManagedUser> {
    if (!this.options.auth.updateContact) {
      throw new Error("Contact update is disabled");
    }
    return this.options.auth.updateContact(actorId, phone);
  }

  async resetUserPassword(targetUserId: string, newPassword: string): Promise<void> {
    if (!this.options.auth.resetUserPassword) {
      throw new Error("Password reset is disabled");
    }
    await this.options.auth.resetUserPassword(targetUserId, newPassword);
  }

  async deactivateUser(targetUserId: string): Promise<void> {
    if (!this.options.auth.deactivateUser) {
      throw new Error("User deletion is disabled");
    }
    await this.options.auth.deactivateUser(targetUserId);
  }

  async updateUserRole(
    targetUserId: string,
    role: Exclude<LocalUserRegistrationRequest["role"], "super_admin">
  ): Promise<ManagedUser> {
    if (!this.options.auth.updateUserRole) {
      throw new Error("Role update is disabled");
    }
    return this.options.auth.updateUserRole(targetUserId, role);
  }

  assertPermission(actor: Actor, permission: RegisteredRoute["permission"]): void {
    if (permission) {
      this.options.auth.assertPermission(actor, permission);
    }
  }

  subscribeAllEvents(handler: (event: DomainEvent<object>) => Promise<void> | void): () => void {
    return this.eventBus.subscribeAll(handler);
  }

  async shutdown(): Promise<void> {
    await Promise.all(this.activatedPlugins.map((plugin) => plugin.dispose?.()));
  }
}
