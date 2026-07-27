import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";
import type { Actor, Permission, Role } from "../types";

const issuer = import.meta.env.VITE_KEYCLOAK_ISSUER ?? "http://localhost:8080/realms/lab";
const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "lab-web";

export const oidcManager = new UserManager({
  authority: issuer,
  client_id: clientId,
  redirect_uri: `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile email",
  userStore: new WebStorageStateStore({ store: window.sessionStorage })
});

const permissions: Record<Role, Permission[]> = {
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

function roleFromClaims(user: User): Role {
  const claims = user.profile as Record<string, unknown>;
  const realmRoles = (claims.realm_access as { roles?: string[] } | undefined)?.roles ?? [];
  const groups = (claims.groups as string[] | undefined) ?? [];
  const values = new Set([...realmRoles, ...groups.map((group) => group.split("/").at(-1) ?? "")]);
  if (values.has("super_admin") || values.has("platform-admin")) return "super_admin";
  if (values.has("lab_admin") || values.has("lab-admin") || values.has("admin")) return "lab_admin";
  if (values.has("professor") || values.has("teacher") || values.has("advisor")) return "professor";
  return values.has("member") ? "member" : "student";
}

export function actorFromOidcUser(user: User): Actor {
  const role = roleFromClaims(user);
  return {
    id: user.profile.sub,
    username: String(user.profile.preferred_username ?? user.profile.sub),
    displayName: String(user.profile.name ?? user.profile.preferred_username ?? user.profile.sub),
    role,
    permissions: permissions[role]
  };
}

export const oidcEnabled = import.meta.env.VITE_AUTH_MODE === "oidc";
