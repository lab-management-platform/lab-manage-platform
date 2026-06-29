CREATE SCHEMA IF NOT EXISTS collaboration;
CREATE SCHEMA IF NOT EXISTS files;

ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS node_type TEXT NOT NULL DEFAULT 'file';
ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';
ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'external_link';
ALTER TABLE files.lab_file ADD COLUMN IF NOT EXISTS owner_name TEXT NOT NULL DEFAULT '';
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lab_file_parent_fk'
      AND conrelid = 'files.lab_file'::regclass
  ) THEN
    ALTER TABLE files.lab_file
      ADD CONSTRAINT lab_file_parent_fk FOREIGN KEY (parent_id) REFERENCES files.lab_file(id);
  END IF;
END $$;

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

CREATE INDEX IF NOT EXISTS meeting_starts_at_idx ON collaboration.meeting(starts_at);
CREATE INDEX IF NOT EXISTS notification_recipient_idx
  ON collaboration.notification(recipient_id, read_at, created_at DESC);
