CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS collaboration;
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
  node_type TEXT NOT NULL DEFAULT 'file' CHECK (node_type IN ('folder', 'file')),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sop', 'template', 'record', 'dataset', 'meeting', 'other')),
  parent_id TEXT REFERENCES files.lab_file(id),
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

CREATE TABLE IF NOT EXISTS collaboration.meeting (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  online_url TEXT,
  participant_ids TEXT[] NOT NULL DEFAULT '{}',
  agenda_file_id TEXT,
  minutes_file_id TEXT,
  summary TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collaboration.notification (
  id TEXT PRIMARY KEY,
  recipient_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('announcement', 'meeting', 'approval', 'task', 'system')),
  related_type TEXT,
  related_id TEXT,
  read_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
