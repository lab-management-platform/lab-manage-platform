CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS files;
CREATE SCHEMA IF NOT EXISTS inventory;

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

CREATE TABLE IF NOT EXISTS core.app_user (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  student_id TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'member')),
  identity_provider TEXT NOT NULL DEFAULT 'local',
  external_subject TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.session (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES core.app_user(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory.material (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  spec TEXT NOT NULL,
  stock INTEGER NOT NULL CHECK (stock >= 0),
  warn_stock INTEGER NOT NULL CHECK (warn_stock >= 0),
  unit TEXT NOT NULL,
  location TEXT NOT NULL,
  manager TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory.application (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL REFERENCES inventory.material(id),
  material_name TEXT NOT NULL,
  applicant_id TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  review_remark TEXT
);

CREATE TABLE IF NOT EXISTS inventory.application_review (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES inventory.application(id),
  reviewer_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  remark TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory.stock_movement (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL REFERENCES inventory.material(id),
  operator_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stock_in', 'application_out')),
  remark TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS files.lab_file (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sop', 'template', 'record', 'other')),
  drive_url TEXT NOT NULL,
  description TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
