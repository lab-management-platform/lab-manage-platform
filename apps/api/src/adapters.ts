import type { AuditEntry, AuditPort, LoggerPort } from "@lab/core";
import pg from "pg";

export class ConsoleLogger implements LoggerPort {
  info(message: string, meta?: Record<string, unknown>): void {
    console.info(JSON.stringify({ level: "info", message, meta }));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(JSON.stringify({ level: "warn", message, meta }));
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(JSON.stringify({ level: "error", message, meta }));
  }
}

export class ConsoleAuditAdapter implements AuditPort {
  async record(entry: AuditEntry): Promise<void> {
    console.info(JSON.stringify({ level: "audit", ...entry }));
  }
}

export class PostgresAuditAdapter implements AuditPort {
  private readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({ connectionString: databaseUrl });
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE SCHEMA IF NOT EXISTS core;

      CREATE TABLE IF NOT EXISTS core.audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}',
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS audit_log_occurred_at_idx
        ON core.audit_log (occurred_at DESC);

      CREATE INDEX IF NOT EXISTS audit_log_actor_action_idx
        ON core.audit_log (actor_id, action);
    `);
  }

  async record(entry: AuditEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO core.audit_log
        (actor_id, action, target_type, target_id, metadata, occurred_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        entry.actorId,
        entry.action,
        entry.targetType,
        entry.targetId ?? null,
        JSON.stringify(entry.metadata ?? {}),
        entry.occurredAt
      ]
    );
  }
}

export function createAuditAdapter(databaseUrl?: string): AuditPort {
  if (!databaseUrl) {
    return new ConsoleAuditAdapter();
  }
  return new PostgresAuditAdapter(databaseUrl);
}
