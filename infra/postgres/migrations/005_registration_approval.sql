ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ;
ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE core.app_user DROP CONSTRAINT IF EXISTS app_user_approval_status_check;
ALTER TABLE core.app_user ADD CONSTRAINT app_user_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS core_app_user_approval_idx
  ON core.app_user(approval_status, created_at DESC);
