import type { InventoryApplicationRequestedPayload } from "@lab/contracts";
import type { PluginManifest } from "@lab/core";
import { createDomainEvent } from "@lab/core";
import { randomUUID } from "node:crypto";
import pg from "pg";

type ApplicationStatus = "pending" | "approved" | "rejected";

interface InventoryCategory {
  id: string;
  code: string;
  name: string;
  returnRequired: boolean;
  quantityMode: "quantity" | "serialized";
  serialRequired: boolean;
  dynamicSchema: Record<string, unknown>;
  active: boolean;
}

interface InventoryCategoryRequest {
  code: string;
  name: string;
  returnRequired?: boolean;
  quantityMode?: "quantity" | "serialized";
  serialRequired?: boolean;
  dynamicSchema?: Record<string, unknown>;
}

interface Material {
  id: string;
  name: string;
  spec: string;
  stock: number;
  warnStock: number;
  unit: string;
  location: string;
  manager: string;
  categoryId?: string;
  categoryName?: string;
  returnRequired?: boolean;
  serialRequired?: boolean;
}

interface InventoryApplication {
  id: string;
  materialId: string;
  materialName: string;
  applicantId: string;
  applicantName: string;
  projectId?: string;
  quantity: number;
  reason: string;
  status: ApplicationStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewRemark?: string;
  usageMode?: "consume" | "borrow";
  dueAt?: string;
  returnedAt?: string;
}

type LoanStatus = "borrowed" | "returned" | "overdue";

interface InventoryLoan {
  id: string;
  applicationId: string;
  materialId: string;
  materialName: string;
  borrowerId: string;
  borrowerName: string;
  quantity: number;
  dueAt: string;
  status: LoanStatus;
  borrowedAt: string;
  returnedAt?: string;
}

interface StockMovement {
  id: string;
  materialId: string;
  materialName: string;
  operatorId: string;
  quantity: number;
  type: "stock_in" | "application_out" | "return";
  remark: string;
  createdAt: string;
}

interface InventoryApplicationRequest {
  materialId: string;
  quantity: number;
  reason?: string;
  projectId?: string;
}

interface ReviewRequest {
  remark?: string;
}

interface StockInRequest {
  quantity: number;
  remark?: string;
}

interface InventoryRepository {
  initialize(): Promise<void>;
  getSummary(): Promise<{
    materialCount: number;
    lowStockCount: number;
    pendingApplications: number;
    approvedApplications: number;
  }>;
  listCategories(): Promise<InventoryCategory[]>;
  createCategory(
    input: InventoryCategoryRequest
  ): Promise<InventoryCategory | { error: string; status: number }>;
  listMaterials(): Promise<Material[]>;
  listApplications(): Promise<InventoryApplication[]>;
  listStockMovements(): Promise<StockMovement[]>;
  listLoans(): Promise<InventoryLoan[]>;
  returnLoan(
    id: string,
    actorId: string
  ): Promise<InventoryLoan | { error: string; status: number }>;
  createApplication(input: {
    actorId: string;
    materialId: string;
    quantity: number;
    reason?: string;
    projectId?: string;
  }): Promise<InventoryApplication | { error: string; status: number }>;
  approveApplication(
    id: string,
    remark: string | undefined,
    reviewerId: string
  ): Promise<InventoryApplication | { error: string; status: number }>;
  rejectApplication(
    id: string,
    remark: string | undefined,
    reviewerId: string
  ): Promise<InventoryApplication | { error: string; status: number }>;
  stockInMaterial(
    materialId: string,
    quantity: number,
    remark: string | undefined,
    actorId: string
  ): Promise<Material | { error: string; status: number }>;
}

const seedMaterials: Material[] = [
  {
    id: "m-001",
    name: "一次性丁腈手套",
    spec: "M 码 / 100 只",
    stock: 18,
    warnStock: 10,
    unit: "盒",
    location: "A-01 安全柜",
    manager: "李老师"
  },
  {
    id: "m-002",
    name: "移液枪枪头",
    spec: "10uL / 无菌盒装",
    stock: 7,
    warnStock: 12,
    unit: "盒",
    location: "B-03 试剂架",
    manager: "王同学"
  },
  {
    id: "m-003",
    name: "离心管",
    spec: "1.5mL / 500 支",
    stock: 26,
    warnStock: 8,
    unit: "包",
    location: "B-01 耗材柜",
    manager: "王同学",
    categoryId: "category-equipment",
    categoryName: "器材",
    returnRequired: true,
    serialRequired: true
  },
  {
    id: "m-004",
    name: "无水乙醇",
    spec: "AR 500mL",
    stock: 5,
    warnStock: 6,
    unit: "瓶",
    location: "C-02 危化柜",
    manager: "李老师"
  }
];

const seedApplications: InventoryApplication[] = [
  {
    id: "a-1001",
    materialId: "m-002",
    materialName: "移液枪枪头",
    applicantId: "student001",
    applicantName: "学生一号",
    quantity: 2,
    reason: "细胞培养实验补充耗材",
    status: "pending",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  }
];

class MemoryInventoryRepository implements InventoryRepository {
  private readonly categories: InventoryCategory[] = [
    {
      id: "category-consumable",
      code: "consumable",
      name: "耗材",
      returnRequired: false,
      quantityMode: "quantity",
      serialRequired: false,
      dynamicSchema: {},
      active: true
    },
    {
      id: "category-equipment",
      code: "equipment",
      name: "器材",
      returnRequired: true,
      quantityMode: "serialized",
      serialRequired: true,
      dynamicSchema: { model: "型号", condition: "状态" },
      active: true
    }
  ];
  private readonly materials = structuredClone(seedMaterials);
  private readonly applications = structuredClone(seedApplications);
  private readonly stockMovements: StockMovement[] = [];
  private readonly loans: InventoryLoan[] = [];

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async getSummary() {
    return {
      materialCount: this.materials.length,
      lowStockCount: this.materials.filter((material) => material.stock <= material.warnStock)
        .length,
      pendingApplications: this.applications.filter(
        (application) => application.status === "pending"
      ).length,
      approvedApplications: this.applications.filter(
        (application) => application.status === "approved"
      ).length
    };
  }

  async listCategories(): Promise<InventoryCategory[]> {
    return structuredClone(this.categories);
  }

  async createCategory(
    input: InventoryCategoryRequest
  ): Promise<InventoryCategory | { error: string; status: number }> {
    if (this.categories.some((category) => category.code === input.code)) {
      return { status: 409, error: "Category code already exists" };
    }
    const category: InventoryCategory = {
      id: `category-${randomUUID()}`,
      code: input.code,
      name: input.name,
      returnRequired: input.returnRequired ?? false,
      quantityMode: input.quantityMode ?? "quantity",
      serialRequired: input.serialRequired ?? false,
      dynamicSchema: input.dynamicSchema ?? {},
      active: true
    };
    this.categories.push(category);
    return structuredClone(category);
  }

  async listMaterials(): Promise<Material[]> {
    return this.materials;
  }

  async listApplications(): Promise<InventoryApplication[]> {
    return [...this.applications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listStockMovements(): Promise<StockMovement[]> {
    return [...this.stockMovements].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listLoans(): Promise<InventoryLoan[]> {
    return this.loans
      .map((loan) =>
        loan.status === "borrowed" && new Date(loan.dueAt) < new Date()
          ? { ...loan, status: "overdue" as const }
          : loan
      )
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }

  async returnLoan(
    id: string,
    actorId: string
  ): Promise<InventoryLoan | { error: string; status: number }> {
    const loan = this.loans.find((item) => item.id === id);
    if (!loan) return { status: 404, error: "Loan not found" };
    if (loan.status === "returned") return { status: 409, error: "Loan already returned" };
    if (loan.borrowerId !== actorId && !actorId.includes("admin")) {
      return {
        status: 403,
        error: "Only borrower or inventory administrator can return this item"
      };
    }
    const material = this.materials.find((item) => item.id === loan.materialId);
    if (!material) return { status: 404, error: "Material not found" };
    material.stock += loan.quantity;
    loan.status = "returned";
    loan.returnedAt = new Date().toISOString();
    this.stockMovements.unshift({
      id: randomUUID(),
      materialId: material.id,
      materialName: material.name,
      operatorId: actorId,
      quantity: loan.quantity,
      type: "return",
      remark: "器材归还",
      createdAt: loan.returnedAt
    });
    return loan;
  }

  async createApplication(input: {
    actorId: string;
    materialId: string;
    quantity: number;
    reason?: string;
  }): Promise<InventoryApplication | { error: string; status: number }> {
    const material = this.materials.find((item) => item.id === input.materialId);
    if (!material) {
      return { status: 404, error: "Material not found" };
    }
    if (input.quantity > material.stock) {
      return { status: 409, error: "Requested quantity exceeds stock" };
    }

    const application: InventoryApplication = {
      id: randomUUID(),
      materialId: material.id,
      materialName: material.name,
      applicantId: input.actorId,
      applicantName: input.actorId,
      quantity: input.quantity,
      reason: input.reason?.trim() || "未填写",
      status: "pending",
      createdAt: new Date().toISOString()
    };
    this.applications.unshift(application);
    return application;
  }

  async approveApplication(
    id: string,
    remark?: string,
    reviewerId = "memory-admin"
  ): Promise<InventoryApplication | { error: string; status: number }> {
    const application = this.applications.find((item) => item.id === id);
    if (!application) {
      return { status: 404, error: "Application not found" };
    }
    if (application.status !== "pending") {
      return { status: 409, error: "Application already reviewed" };
    }

    const material = this.materials.find((item) => item.id === application.materialId);
    if (!material) {
      return { status: 404, error: "Material not found" };
    }
    if (application.quantity > material.stock) {
      return { status: 409, error: "Insufficient stock" };
    }

    material.stock -= application.quantity;
    application.status = "approved";
    application.reviewedAt = new Date().toISOString();
    application.reviewRemark = remark?.trim() || "审批通过";
    this.stockMovements.unshift({
      id: randomUUID(),
      materialId: material.id,
      materialName: material.name,
      operatorId: reviewerId,
      quantity: -application.quantity,
      type: "application_out",
      remark: "审批出库",
      createdAt: new Date().toISOString()
    });
    if (material.returnRequired) {
      const dueAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      application.usageMode = "borrow";
      application.dueAt = dueAt;
      this.loans.unshift({
        id: randomUUID(),
        applicationId: application.id,
        materialId: material.id,
        materialName: material.name,
        borrowerId: application.applicantId,
        borrowerName: application.applicantName,
        quantity: application.quantity,
        dueAt,
        status: "borrowed",
        borrowedAt: application.reviewedAt
      });
    }
    return application;
  }

  async rejectApplication(
    id: string,
    remark?: string,
    reviewerId = "memory-admin"
  ): Promise<InventoryApplication | { error: string; status: number }> {
    const application = this.applications.find((item) => item.id === id);
    if (!application) {
      return { status: 404, error: "Application not found" };
    }
    if (application.status !== "pending") {
      return { status: 409, error: "Application already reviewed" };
    }

    application.status = "rejected";
    application.reviewedAt = new Date().toISOString();
    application.reviewRemark = remark?.trim() || "审批拒绝";
    void reviewerId;
    return application;
  }

  async stockInMaterial(
    materialId: string,
    quantity: number,
    remark = "耗材入库",
    actorId = "memory-admin"
  ): Promise<Material | { error: string; status: number }> {
    const material = this.materials.find((item) => item.id === materialId);
    if (!material) {
      return { status: 404, error: "Material not found" };
    }
    material.stock += quantity;
    this.stockMovements.unshift({
      id: randomUUID(),
      materialId: material.id,
      materialName: material.name,
      operatorId: actorId,
      quantity,
      type: "stock_in",
      remark: remark.trim() || "耗材入库",
      createdAt: new Date().toISOString()
    });
    return material;
  }
}

class PostgresInventoryRepository implements InventoryRepository {
  private readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({ connectionString: databaseUrl });
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
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
      ALTER TABLE inventory.material ADD COLUMN IF NOT EXISTS category_id TEXT;
      ALTER TABLE inventory.material ADD COLUMN IF NOT EXISTS dynamic_attributes JSONB NOT NULL DEFAULT '{}';
      ALTER TABLE inventory.material ADD COLUMN IF NOT EXISTS manager_id TEXT;

      CREATE TABLE IF NOT EXISTS inventory.application (
        id TEXT PRIMARY KEY,
        material_id TEXT NOT NULL REFERENCES inventory.material(id),
        material_name TEXT NOT NULL,
        applicant_id TEXT NOT NULL,
        applicant_name TEXT NOT NULL,
        project_id TEXT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        reason TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        reviewed_at TIMESTAMPTZ,
        review_remark TEXT
      );
      ALTER TABLE inventory.application ADD COLUMN IF NOT EXISTS project_id TEXT;
      ALTER TABLE inventory.application ADD COLUMN IF NOT EXISTS usage_mode TEXT NOT NULL DEFAULT 'consume';
      ALTER TABLE inventory.application ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
      ALTER TABLE inventory.application ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

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
      ALTER TABLE inventory.stock_movement DROP CONSTRAINT IF EXISTS stock_movement_type_check;
      ALTER TABLE inventory.stock_movement ADD CONSTRAINT stock_movement_type_check
        CHECK (type IN ('stock_in', 'application_out', 'return'));

      CREATE TABLE IF NOT EXISTS inventory.loan (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL UNIQUE REFERENCES inventory.application(id),
        material_id TEXT NOT NULL REFERENCES inventory.material(id),
        borrower_id TEXT NOT NULL,
        borrower_name TEXT NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        due_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('borrowed', 'returned', 'overdue')),
        borrowed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        returned_at TIMESTAMPTZ
      );
    `);

    for (const category of [
      {
        id: "category-consumable",
        code: "consumable",
        name: "耗材",
        returnRequired: false,
        quantityMode: "quantity",
        serialRequired: false
      },
      {
        id: "category-equipment",
        code: "equipment",
        name: "器材",
        returnRequired: true,
        quantityMode: "serialized",
        serialRequired: true
      }
    ]) {
      await this.pool.query(
        `INSERT INTO inventory.item_category
          (id, code, name, return_required, quantity_mode, serial_required)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           return_required = EXCLUDED.return_required,
           quantity_mode = EXCLUDED.quantity_mode,
           serial_required = EXCLUDED.serial_required`,
        [
          category.id,
          category.code,
          category.name,
          category.returnRequired,
          category.quantityMode,
          category.serialRequired
        ]
      );
    }

    const materialCount = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM inventory.material"
    );
    if (Number(materialCount.rows[0]?.count ?? 0) === 0) {
      for (const material of seedMaterials) {
        await this.pool.query(
          `INSERT INTO inventory.material
            (id, name, spec, stock, warn_stock, unit, location, manager, category_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            material.id,
            material.name,
            material.spec,
            material.stock,
            material.warnStock,
            material.unit,
            material.location,
            material.manager,
            material.categoryId ?? "category-consumable"
          ]
        );
      }
    }

    const applicationCount = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM inventory.application"
    );
    if (Number(applicationCount.rows[0]?.count ?? 0) === 0) {
      for (const application of seedApplications) {
        await this.pool.query(
          `INSERT INTO inventory.application
            (id, material_id, material_name, applicant_id, applicant_name, quantity, reason, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            application.id,
            application.materialId,
            application.materialName,
            application.applicantId,
            application.applicantName,
            application.quantity,
            application.reason,
            application.status,
            application.createdAt
          ]
        );
      }
    }
  }

  async getSummary() {
    const result = await this.pool.query<{
      material_count: string;
      low_stock_count: string;
      pending_applications: string;
      approved_applications: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM inventory.material) AS material_count,
        (SELECT COUNT(*) FROM inventory.material WHERE stock <= warn_stock) AS low_stock_count,
        (SELECT COUNT(*) FROM inventory.application WHERE status = 'pending') AS pending_applications,
        (SELECT COUNT(*) FROM inventory.application WHERE status = 'approved') AS approved_applications
    `);
    const row = result.rows[0]!;
    return {
      materialCount: Number(row.material_count),
      lowStockCount: Number(row.low_stock_count),
      pendingApplications: Number(row.pending_applications),
      approvedApplications: Number(row.approved_applications)
    };
  }

  async listCategories(): Promise<InventoryCategory[]> {
    const result = await this.pool.query(
      `SELECT id, code, name, return_required, quantity_mode, serial_required,
              dynamic_schema, active
       FROM inventory.item_category
       WHERE active = true
       ORDER BY name`
    );
    return result.rows.map(mapCategoryRow);
  }

  async createCategory(
    input: InventoryCategoryRequest
  ): Promise<InventoryCategory | { error: string; status: number }> {
    const id = `category-${randomUUID()}`;
    try {
      const result = await this.pool.query(
        `INSERT INTO inventory.item_category
          (id, code, name, return_required, quantity_mode, serial_required, dynamic_schema)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, code, name, return_required, quantity_mode, serial_required,
                   dynamic_schema, active`,
        [
          id,
          input.code,
          input.name,
          input.returnRequired ?? false,
          input.quantityMode ?? "quantity",
          input.serialRequired ?? false,
          JSON.stringify(input.dynamicSchema ?? {})
        ]
      );
      return mapCategoryRow(result.rows[0]);
    } catch (error) {
      if (error instanceof Error && error.message.includes("duplicate key")) {
        return { status: 409, error: "Category code already exists" };
      }
      throw error;
    }
  }

  async listMaterials(): Promise<Material[]> {
    const result = await this.pool.query<{
      id: string;
      name: string;
      spec: string;
      stock: number;
      warn_stock: number;
      unit: string;
      location: string;
      manager: string;
    }>("SELECT * FROM inventory.material ORDER BY id");
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      spec: row.spec,
      stock: row.stock,
      warnStock: row.warn_stock,
      unit: row.unit,
      location: row.location,
      manager: row.manager
    }));
  }

  async listApplications(): Promise<InventoryApplication[]> {
    const result = await this.pool.query(
      "SELECT * FROM inventory.application ORDER BY created_at DESC"
    );
    return result.rows.map(mapApplicationRow);
  }

  async listStockMovements(): Promise<StockMovement[]> {
    const result = await this.pool.query(
      `SELECT
        sm.id,
        sm.material_id,
        m.name AS material_name,
        sm.operator_id,
        sm.quantity,
        sm.type,
        sm.remark,
        sm.created_at
       FROM inventory.stock_movement sm
       JOIN inventory.material m ON m.id = sm.material_id
       ORDER BY sm.created_at DESC
       LIMIT 200`
    );
    return result.rows.map(mapStockMovementRow);
  }

  async listLoans(): Promise<InventoryLoan[]> {
    await this.pool.query(
      `UPDATE inventory.loan SET status = 'overdue'
       WHERE status = 'borrowed' AND due_at < now()`
    );
    const result = await this.pool.query(
      `SELECT l.*, m.name AS material_name
       FROM inventory.loan l
       JOIN inventory.material m ON m.id = l.material_id
       ORDER BY l.due_at ASC`
    );
    return result.rows.map(mapLoanRow);
  }

  async returnLoan(
    id: string,
    actorId: string
  ): Promise<InventoryLoan | { error: string; status: number }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const loanResult = await client.query(
        `SELECT l.*, m.name AS material_name
         FROM inventory.loan l
         JOIN inventory.material m ON m.id = l.material_id
         WHERE l.id = $1 FOR UPDATE`,
        [id]
      );
      const loan = loanResult.rows[0];
      if (!loan) {
        await client.query("ROLLBACK");
        return { status: 404, error: "Loan not found" };
      }
      if (loan.status === "returned") {
        await client.query("ROLLBACK");
        return { status: 409, error: "Loan already returned" };
      }
      if (loan.borrower_id !== actorId && !actorId.includes("admin")) {
        await client.query("ROLLBACK");
        return {
          status: 403,
          error: "Only borrower or inventory administrator can return this item"
        };
      }
      await client.query("UPDATE inventory.material SET stock = stock + $1 WHERE id = $2", [
        loan.quantity,
        loan.material_id
      ]);
      await client.query(
        `UPDATE inventory.loan SET status = 'returned', returned_at = now() WHERE id = $1`,
        [id]
      );
      await client.query(`UPDATE inventory.application SET returned_at = now() WHERE id = $1`, [
        loan.application_id
      ]);
      await client.query(
        `INSERT INTO inventory.stock_movement
          (id, material_id, operator_id, quantity, type, remark)
         VALUES ($1, $2, $3, $4, 'return', $5)`,
        [randomUUID(), loan.material_id, actorId, loan.quantity, "器材归还"]
      );
      await client.query("COMMIT");
      return {
        ...mapLoanRow({ ...loan, status: "returned", returned_at: new Date().toISOString() })
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createApplication(input: {
    actorId: string;
    materialId: string;
    quantity: number;
    reason?: string;
  }): Promise<InventoryApplication | { error: string; status: number }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const materialResult = await client.query<{
        id: string;
        name: string;
        stock: number;
      }>("SELECT id, name, stock FROM inventory.material WHERE id = $1 FOR UPDATE", [
        input.materialId
      ]);
      const material = materialResult.rows[0];
      if (!material) {
        await client.query("ROLLBACK");
        return { status: 404, error: "Material not found" };
      }
      if (input.quantity > material.stock) {
        await client.query("ROLLBACK");
        return { status: 409, error: "Requested quantity exceeds stock" };
      }

      const application: InventoryApplication = {
        id: randomUUID(),
        materialId: material.id,
        materialName: material.name,
        applicantId: input.actorId,
        applicantName: `成员 ${input.actorId}`,
        projectId: undefined,
        quantity: input.quantity,
        reason: input.reason?.trim() || "未填写",
        status: "pending",
        createdAt: new Date().toISOString()
      };

      const inserted = await client.query(
        `INSERT INTO inventory.application
          (id, material_id, material_name, applicant_id, applicant_name, project_id, quantity, reason, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          application.id,
          application.materialId,
          application.materialName,
          application.applicantId,
          application.applicantName,
          application.projectId ?? null,
          application.quantity,
          application.reason,
          application.status,
          application.createdAt
        ]
      );
      await client.query("COMMIT");
      return mapApplicationRow(inserted.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async approveApplication(
    id: string,
    remark?: string,
    reviewerId = "admin"
  ): Promise<InventoryApplication | { error: string; status: number }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const applicationResult = await client.query(
        "SELECT * FROM inventory.application WHERE id = $1 FOR UPDATE",
        [id]
      );
      const application = applicationResult.rows[0];
      if (!application) {
        await client.query("ROLLBACK");
        return { status: 404, error: "Application not found" };
      }
      if (application.status !== "pending") {
        await client.query("ROLLBACK");
        return { status: 409, error: "Application already reviewed" };
      }

      const materialResult = await client.query<{ stock: number; return_required: boolean }>(
        `SELECT m.stock, COALESCE(c.return_required, false) AS return_required
         FROM inventory.material m
         LEFT JOIN inventory.item_category c ON c.id = m.category_id
         WHERE m.id = $1 FOR UPDATE`,
        [application.material_id]
      );
      const material = materialResult.rows[0];
      if (!material) {
        await client.query("ROLLBACK");
        return { status: 404, error: "Material not found" };
      }
      if (application.quantity > material.stock) {
        await client.query("ROLLBACK");
        return { status: 409, error: "Insufficient stock" };
      }

      await client.query("UPDATE inventory.material SET stock = stock - $1 WHERE id = $2", [
        application.quantity,
        application.material_id
      ]);
      const updated = await client.query(
        `UPDATE inventory.application
         SET status = 'approved', reviewed_at = now(), review_remark = $2
         WHERE id = $1
         RETURNING *`,
        [id, remark?.trim() || "审批通过"]
      );
      await client.query(
        `INSERT INTO inventory.application_review (id, application_id, reviewer_id, action, remark)
         VALUES ($1, $2, $3, 'approved', $4)`,
        [randomUUID(), id, reviewerId, remark?.trim() || "审批通过"]
      );
      await client.query(
        `INSERT INTO inventory.stock_movement (id, material_id, operator_id, quantity, type, remark)
         VALUES ($1, $2, $3, $4, 'application_out', $5)`,
        [
          randomUUID(),
          application.material_id,
          reviewerId,
          -Number(application.quantity),
          "审批出库"
        ]
      );
      if (material.return_required) {
        const dueAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        await client.query(
          `UPDATE inventory.application SET usage_mode = 'borrow', due_at = $2 WHERE id = $1`,
          [id, dueAt]
        );
        await client.query(
          `INSERT INTO inventory.loan
            (id, application_id, material_id, borrower_id, borrower_name, quantity, due_at, status, borrowed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'borrowed', now())`,
          [
            randomUUID(),
            id,
            application.material_id,
            application.applicant_id,
            application.applicant_name,
            application.quantity,
            dueAt
          ]
        );
      }
      await client.query("COMMIT");
      return mapApplicationRow(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async rejectApplication(
    id: string,
    remark?: string,
    reviewerId = "admin"
  ): Promise<InventoryApplication | { error: string; status: number }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `UPDATE inventory.application
         SET status = 'rejected', reviewed_at = now(), review_remark = $2
         WHERE id = $1 AND status = 'pending'
         RETURNING *`,
        [id, remark?.trim() || "审批拒绝"]
      );
      if (!result.rows[0]) {
        await client.query("ROLLBACK");
        return { status: 404, error: "Pending application not found" };
      }
      await client.query(
        `INSERT INTO inventory.application_review (id, application_id, reviewer_id, action, remark)
         VALUES ($1, $2, $3, 'rejected', $4)`,
        [randomUUID(), id, reviewerId, remark?.trim() || "审批拒绝"]
      );
      await client.query("COMMIT");
      return mapApplicationRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async stockInMaterial(
    materialId: string,
    quantity: number,
    remark: string | undefined,
    actorId: string
  ): Promise<Material | { error: string; status: number }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const materialResult = await client.query(
        `UPDATE inventory.material
         SET stock = stock + $2
         WHERE id = $1
         RETURNING *`,
        [materialId, quantity]
      );
      const material = materialResult.rows[0];
      if (!material) {
        await client.query("ROLLBACK");
        return { status: 404, error: "Material not found" };
      }
      await client.query(
        `INSERT INTO inventory.stock_movement (id, material_id, operator_id, quantity, type, remark)
         VALUES ($1, $2, $3, $4, 'stock_in', $5)`,
        [randomUUID(), materialId, actorId, quantity, remark?.trim() || "耗材入库"]
      );
      await client.query("COMMIT");
      return {
        id: material.id,
        name: material.name,
        spec: material.spec,
        stock: material.stock,
        warnStock: material.warn_stock,
        unit: material.unit,
        location: material.location,
        manager: material.manager
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

function mapCategoryRow(row: Record<string, unknown>): InventoryCategory {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    returnRequired: Boolean(row.return_required),
    quantityMode: row.quantity_mode === "serialized" ? "serialized" : "quantity",
    serialRequired: Boolean(row.serial_required),
    dynamicSchema:
      typeof row.dynamic_schema === "object" && row.dynamic_schema !== null
        ? (row.dynamic_schema as Record<string, unknown>)
        : {},
    active: Boolean(row.active)
  };
}

function mapApplicationRow(row: Record<string, unknown>): InventoryApplication {
  return {
    id: String(row.id),
    materialId: String(row.material_id),
    materialName: String(row.material_name),
    applicantId: String(row.applicant_id),
    applicantName: String(row.applicant_name),
    projectId: row.project_id ? String(row.project_id) : undefined,
    quantity: Number(row.quantity),
    reason: String(row.reason),
    status: row.status as ApplicationStatus,
    createdAt: new Date(String(row.created_at)).toISOString(),
    reviewedAt: row.reviewed_at ? new Date(String(row.reviewed_at)).toISOString() : undefined,
    reviewRemark: row.review_remark ? String(row.review_remark) : undefined
  };
}

function mapStockMovementRow(row: Record<string, unknown>): StockMovement {
  return {
    id: String(row.id),
    materialId: String(row.material_id),
    materialName: String(row.material_name),
    operatorId: String(row.operator_id),
    quantity: Number(row.quantity),
    type: row.type as StockMovement["type"],
    remark: String(row.remark),
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

function mapLoanRow(row: Record<string, unknown>): InventoryLoan {
  const dueAt = new Date(String(row.due_at)).toISOString();
  const status = row.status === "borrowed" && new Date(dueAt) < new Date() ? "overdue" : row.status;
  return {
    id: String(row.id),
    applicationId: String(row.application_id),
    materialId: String(row.material_id),
    materialName: String(row.material_name),
    borrowerId: String(row.borrower_id),
    borrowerName: String(row.borrower_name),
    quantity: Number(row.quantity),
    dueAt,
    status: status as LoanStatus,
    borrowedAt: new Date(String(row.borrowed_at)).toISOString(),
    returnedAt: row.returned_at ? new Date(String(row.returned_at)).toISOString() : undefined
  };
}

function createRepository(): InventoryRepository {
  if (!process.env.DATABASE_URL) {
    return new MemoryInventoryRepository();
  }
  return new PostgresInventoryRepository(process.env.DATABASE_URL);
}

function isRepositoryError<T extends object>(
  value: T | { error: string; status: number }
): value is { error: string; status: number } {
  return "error" in value;
}

export const inventoryPlugin: PluginManifest = {
  name: "inventory",
  version: "0.1.0",
  description: "耗材与实验室设备申请模块 MVP",
  capabilities: [
    "inventory:materials",
    "inventory:application-request",
    "inventory:approval",
    "inventory:stock-movement-query"
  ],
  routes: [
    {
      method: "GET",
      path: "/inventory/summary",
      permission: "inventory:read",
      summary: "获取耗材管理统计"
    },
    {
      method: "GET",
      path: "/inventory/materials",
      permission: "inventory:read",
      summary: "获取耗材列表"
    },
    {
      method: "GET",
      path: "/inventory/categories",
      permission: "inventory:read",
      summary: "获取物资类别与动态属性规则"
    },
    {
      method: "POST",
      path: "/inventory/categories",
      permission: "inventory:stock",
      summary: "新增物资类别与动态属性规则"
    },
    {
      method: "GET",
      path: "/inventory/applications",
      permission: "inventory:read",
      summary: "获取耗材申请列表"
    },
    {
      method: "GET",
      path: "/inventory/stock-movements",
      permission: "inventory:read",
      summary: "查询库存流水"
    },
    {
      method: "GET",
      path: "/inventory/loans",
      permission: "inventory:read",
      summary: "查询器材借用记录"
    },
    {
      method: "PATCH",
      path: "/inventory/loans/:id/return",
      permission: "inventory:apply",
      summary: "归还器材"
    },
    {
      method: "POST",
      path: "/inventory/applications",
      permission: "inventory:read",
      summary: "成员提交耗材或设备申请"
    },
    {
      method: "PATCH",
      path: "/inventory/materials/:id/stock-in",
      permission: "inventory:stock",
      summary: "管理员登记耗材入库"
    },
    {
      method: "PATCH",
      path: "/inventory/applications/:id/approve",
      permission: "inventory:approve",
      summary: "管理员批准耗材申请"
    },
    {
      method: "PATCH",
      path: "/inventory/applications/:id/reject",
      permission: "inventory:approve",
      summary: "管理员拒绝耗材申请"
    }
  ],
  eventsPublished: [
    "inventory.application.requested",
    "inventory.application.approved",
    "inventory.application.rejected"
  ],
  eventsSubscribed: [],
  async activate(context) {
    const repository = createRepository();
    await repository.initialize();

    return {
      name: "inventory",
      routes: [
        {
          method: "GET",
          path: "/inventory/summary",
          permission: "inventory:read",
          summary: "获取耗材管理统计",
          handler: async () => ({ body: await repository.getSummary() })
        },
        {
          method: "GET",
          path: "/inventory/materials",
          permission: "inventory:read",
          summary: "获取耗材列表",
          handler: async () => ({ body: await repository.listMaterials() })
        },
        {
          method: "GET",
          path: "/inventory/categories",
          permission: "inventory:read",
          summary: "获取物资类别与动态属性规则",
          handler: async () => ({ body: await repository.listCategories() })
        },
        {
          method: "POST",
          path: "/inventory/categories",
          permission: "inventory:stock",
          summary: "新增物资类别与动态属性规则",
          handler: async ({ actor, body }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };
            const request = body as Partial<InventoryCategoryRequest>;
            if (!request.code?.trim() || !request.name?.trim()) {
              return { status: 400, body: { error: "code and name are required" } };
            }
            if (
              request.quantityMode &&
              !["quantity", "serialized"].includes(request.quantityMode)
            ) {
              return { status: 400, body: { error: "invalid quantityMode" } };
            }
            const category = await repository.createCategory({
              code: request.code.trim(),
              name: request.name.trim(),
              returnRequired: request.returnRequired === true,
              quantityMode: request.quantityMode,
              serialRequired: request.serialRequired === true,
              dynamicSchema: request.dynamicSchema ?? {}
            });
            if (isRepositoryError(category)) {
              return { status: category.status, body: { error: category.error } };
            }
            await context.audit.record({
              actorId: actor.id,
              action: "inventory.category.created",
              targetType: "inventory_category",
              targetId: category.id,
              occurredAt: new Date().toISOString(),
              metadata: { code: category.code, name: category.name }
            });
            return { status: 201, body: category };
          }
        },
        {
          method: "GET",
          path: "/inventory/applications",
          permission: "inventory:read",
          summary: "获取耗材申请列表（可按项目筛选）",
          handler: async ({ query }) => {
            const all = await repository.listApplications();
            const projectId = (query as { projectId?: string })?.projectId;
            if (projectId)
              return { body: all.filter((a) => a.projectId === projectId || !a.projectId) };
            return { body: all };
          }
        },
        {
          method: "GET",
          path: "/inventory/stock-movements",
          permission: "inventory:read",
          summary: "查询库存流水",
          handler: async () => ({ body: await repository.listStockMovements() })
        },
        {
          method: "GET",
          path: "/inventory/loans",
          permission: "inventory:read",
          summary: "查询器材借用记录",
          handler: async () => ({ body: await repository.listLoans() })
        },
        {
          method: "PATCH",
          path: "/inventory/loans/:id/return",
          permission: "inventory:apply",
          summary: "归还器材",
          handler: async ({ actor, params }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };
            const loan = await repository.returnLoan(params.id, actor.id);
            if (isRepositoryError(loan)) {
              return { status: loan.status, body: { error: loan.error } };
            }
            await context.audit.record({
              actorId: actor.id,
              action: "inventory.loan.returned",
              targetType: "inventory_loan",
              targetId: loan.id,
              occurredAt: new Date().toISOString(),
              metadata: { materialId: loan.materialId, quantity: loan.quantity }
            });
            return { body: loan };
          }
        },
        {
          method: "POST",
          path: "/inventory/applications",
          permission: "inventory:read",
          summary: "成员提交耗材或设备申请",
          handler: async ({ actor, body }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }

            const request = body as Partial<InventoryApplicationRequest>;
            if (!request.materialId || !request.quantity || request.quantity <= 0) {
              return {
                status: 400,
                body: { error: "materialId and positive quantity are required" }
              };
            }

            const application = await repository.createApplication({
              actorId: actor.id,
              materialId: request.materialId,
              quantity: request.quantity,
              reason: request.reason,
              projectId: request.projectId
            });
            if (isRepositoryError(application)) {
              return { status: application.status, body: { error: application.error } };
            }

            const payload: InventoryApplicationRequestedPayload = {
              applicationId: application.id,
              materialId: application.materialId,
              applicantId: actor.id,
              quantity: application.quantity
            };

            await context.eventBus.publish(
              createDomainEvent("inventory", "inventory.application.requested", payload)
            );

            await context.audit.record({
              actorId: actor.id,
              action: "inventory.application.requested",
              targetType: "inventory_application",
              targetId: application.id,
              occurredAt: new Date().toISOString(),
              metadata: {
                materialId: application.materialId,
                quantity: application.quantity
              }
            });

            return {
              status: 201,
              body: application
            };
          }
        },
        {
          method: "PATCH",
          path: "/inventory/materials/:id/stock-in",
          permission: "inventory:stock",
          summary: "管理员登记耗材入库",
          handler: async ({ actor, params, body }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }

            const request = body as Partial<StockInRequest>;
            if (!request.quantity || request.quantity <= 0) {
              return { status: 400, body: { error: "positive quantity is required" } };
            }

            const material = await repository.stockInMaterial(
              params.id,
              request.quantity,
              request.remark,
              actor.id
            );
            if ("error" in material) {
              return { status: material.status, body: { error: material.error } };
            }

            await context.audit.record({
              actorId: actor.id,
              action: "inventory.stock_in",
              targetType: "inventory_material",
              targetId: material.id,
              occurredAt: new Date().toISOString(),
              metadata: {
                materialId: material.id,
                quantity: request.quantity
              }
            });

            return { body: material };
          }
        },
        {
          method: "PATCH",
          path: "/inventory/applications/:id/approve",
          permission: "inventory:approve",
          summary: "管理员批准耗材申请",
          handler: async ({ actor, params, body }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }

            const review = body as Partial<ReviewRequest>;
            const application = await repository.approveApplication(
              params.id,
              review.remark,
              actor.id
            );
            if (isRepositoryError(application)) {
              return { status: application.status, body: { error: application.error } };
            }

            await context.eventBus.publish(
              createDomainEvent("inventory", "inventory.application.approved", {
                applicationId: application.id,
                materialId: application.materialId,
                quantity: application.quantity,
                reviewerId: actor.id
              })
            );

            await context.audit.record({
              actorId: actor.id,
              action: "inventory.application.approved",
              targetType: "inventory_application",
              targetId: application.id,
              occurredAt: new Date().toISOString(),
              metadata: {
                materialId: application.materialId,
                quantity: application.quantity
              }
            });

            return { body: application };
          }
        },
        {
          method: "PATCH",
          path: "/inventory/applications/:id/reject",
          permission: "inventory:approve",
          summary: "管理员拒绝耗材申请",
          handler: async ({ actor, params, body }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }

            const review = body as Partial<ReviewRequest>;
            const application = await repository.rejectApplication(
              params.id,
              review.remark,
              actor.id
            );
            if (isRepositoryError(application)) {
              return { status: application.status, body: { error: application.error } };
            }

            await context.eventBus.publish(
              createDomainEvent("inventory", "inventory.application.rejected", {
                applicationId: application.id,
                reviewerId: actor.id
              })
            );

            await context.audit.record({
              actorId: actor.id,
              action: "inventory.application.rejected",
              targetType: "inventory_application",
              targetId: application.id,
              occurredAt: new Date().toISOString(),
              metadata: {
                materialId: application.materialId,
                quantity: application.quantity
              }
            });

            return { body: application };
          }
        }
      ]
    };
  }
};
