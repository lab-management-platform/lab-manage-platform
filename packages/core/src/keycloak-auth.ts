import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Actor, AuthPort, Permission, Role } from "./contracts.js";

type KeycloakClaims = JWTPayload & {
  preferred_username?: string;
  name?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  groups?: string[];
};

const rolePermissions: Record<Role, Permission[]> = {
  lab_admin: [
    "user:read",
    "user:write",
    "inventory:read",
    "inventory:apply",
    "inventory:approve",
    "inventory:stock",
    "file:read",
    "file:write",
    "project:read",
    "project:write",
    "project:progress",
    "meeting:read",
    "meeting:write",
    "ai:use",
    "ai:manage"
  ],
  professor: [
    "user:read",
    "inventory:read",
    "inventory:apply",
    "inventory:approve",
    "file:read",
    "file:write",
    "project:read",
    "project:write",
    "meeting:read",
    "meeting:write",
    "ai:use"
  ],
  student: [
    "inventory:read",
    "inventory:apply",
    "file:read",
    "project:read",
    "meeting:read",
    "ai:use"
  ],
  member: [
    "inventory:read",
    "inventory:apply",
    "file:read",
    "project:read",
    "meeting:read",
    "ai:use"
  ],
  admin: [
    "user:read",
    "user:write",
    "inventory:read",
    "inventory:apply",
    "inventory:approve",
    "inventory:stock",
    "file:read",
    "file:write",
    "project:read",
    "project:write",
    "project:progress",
    "meeting:read",
    "meeting:write",
    "ai:use",
    "ai:manage"
  ],
  super_admin: [
    "user:read",
    "user:write",
    "inventory:read",
    "inventory:apply",
    "inventory:approve",
    "inventory:stock",
    "file:read",
    "file:write",
    "project:read",
    "project:write",
    "project:progress",
    "meeting:read",
    "meeting:write",
    "ai:use",
    "ai:manage"
  ]
};

function mapRole(claims: KeycloakClaims, clientId: string): Role {
  const roles = new Set([
    ...(claims.realm_access?.roles ?? []),
    ...(claims.resource_access?.[clientId]?.roles ?? []),
    ...(claims.groups ?? []).map((group) => group.split("/").at(-1) ?? "")
  ]);
  if (roles.has("super_admin") || roles.has("platform-admin")) return "super_admin";
  if (roles.has("lab_admin") || roles.has("lab-admin") || roles.has("admin")) return "lab_admin";
  if (roles.has("professor") || roles.has("teacher") || roles.has("advisor")) return "professor";
  return roles.has("member") ? "member" : "student";
}

export class KeycloakAuthAdapter implements AuthPort {
  private readonly issuer: string;
  private readonly clientId: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(issuer: string, clientId: string, audience?: string) {
    this.issuer = issuer.replace(/\/$/, "");
    this.clientId = clientId;
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/protocol/openid-connect/certs`));
    void audience;
  }

  async authenticate(token: string): Promise<Actor | null> {
    const rawToken = token.replace(/^Bearer\s+/i, "").trim();
    if (!rawToken) return null;
    try {
      const { payload } = await jwtVerify<KeycloakClaims>(rawToken, this.jwks, {
        issuer: this.issuer
      });
      const role = mapRole(payload, this.clientId);
      return {
        id: String(payload.sub),
        username: payload.preferred_username ?? String(payload.sub),
        displayName: payload.name ?? payload.preferred_username ?? String(payload.sub),
        role,
        permissions: rolePermissions[role]
      };
    } catch {
      return null;
    }
  }

  assertPermission(actor: Actor, permission: Permission): void {
    if (!actor.permissions.includes(permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}
