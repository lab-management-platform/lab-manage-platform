CREATE SCHEMA IF NOT EXISTS identity;

CREATE TABLE IF NOT EXISTS identity.user_profile (
  id TEXT PRIMARY KEY,
  external_subject TEXT UNIQUE,
  display_name TEXT NOT NULL,
  username TEXT,
  identity_type TEXT,
  identity_no TEXT,
  phone TEXT,
  identity_provider TEXT NOT NULL DEFAULT 'keycloak',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity.organization (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity.organization_member (
  organization_id TEXT NOT NULL REFERENCES identity.organization(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES identity.user_profile(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE SCHEMA IF NOT EXISTS inventory;

CREATE TABLE IF NOT EXISTS inventory.item_category (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  return_required BOOLEAN NOT NULL DEFAULT false,
  quantity_mode TEXT NOT NULL DEFAULT 'quantity'
    CHECK (quantity_mode IN ('quantity', 'serialized')),
  serial_required BOOLEAN NOT NULL DEFAULT false,
  dynamic_schema JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inventory.material ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE inventory.material ADD COLUMN IF NOT EXISTS dynamic_attributes JSONB NOT NULL DEFAULT '{}';
ALTER TABLE inventory.material ADD COLUMN IF NOT EXISTS manager_id TEXT;

CREATE TABLE IF NOT EXISTS inventory.item_instance (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL REFERENCES inventory.material(id),
  serial_no TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'borrowed', 'maintenance', 'retired')),
  location TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory.stock_transaction (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL REFERENCES inventory.material(id),
  project_id TEXT,
  actor_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL
    CHECK (transaction_type IN ('stock_in', 'consume', 'borrow', 'return', 'transfer', 'adjust')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  from_location TEXT,
  to_location TEXT,
  reference_type TEXT,
  reference_id TEXT,
  remark TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory.loan (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL,
  project_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'borrowed', 'returned', 'overdue', 'rejected')),
  due_at TIMESTAMPTZ,
  approved_by TEXT,
  borrowed_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory.loan_line (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL REFERENCES inventory.loan(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL REFERENCES inventory.material(id),
  instance_id TEXT REFERENCES inventory.item_instance(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  returned_quantity INTEGER NOT NULL DEFAULT 0 CHECK (returned_quantity >= 0),
  UNIQUE (loan_id, material_id, instance_id)
);

CREATE INDEX IF NOT EXISTS inventory_material_category_idx
  ON inventory.material(category_id, active);
CREATE INDEX IF NOT EXISTS inventory_stock_transaction_material_date_idx
  ON inventory.stock_transaction(material_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_loan_due_status_idx
  ON inventory.loan(status, due_at);

INSERT INTO inventory.item_category (id, code, name, return_required, quantity_mode, serial_required)
VALUES
  ('category-consumable', 'consumable', '耗材', false, 'quantity', false),
  ('category-equipment', 'equipment', '器材', true, 'serialized', true)
ON CONFLICT (code) DO NOTHING;

UPDATE inventory.material
SET category_id = COALESCE(category_id, 'category-consumable')
WHERE category_id IS NULL;
