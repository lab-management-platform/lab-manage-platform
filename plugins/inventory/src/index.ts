import type { InventoryApplicationRequestedPayload } from "@lab/contracts";
import type { PluginManifest } from "@lab/core";
import { createDomainEvent } from "@lab/core";
import { randomUUID } from "node:crypto";
import pg from "pg";

type ApplicationStatus = "pending" | "approved" | "rejected";

interface Material {
  id: string;
  name: string;
  spec: string;
  stock: number;
  warnStock: number;
  unit: string;
  location: string;
  manager: string;
}

interface InventoryApplication {
  id: string;
  materialId: string;
  materialName: string;
  applicantId: string;
  applicantName: string;
  quantity: number;
  reason: string;
  status: ApplicationStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewRemark?: string;
}

interface StockMovement {
  id: string;
  materialId: string;
  materialName: string;
  operatorId: string;
  quantity: number;
  type: "stock_in" | "application_out";
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
  listMaterials(): Promise<Material[]>;
  listApplications(): Promise<InventoryApplication[]>;
  listStockMovements(): Promise<StockMovement[]>;
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
    manager: "王同学"
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
    applicantId: "demo-member",
    applicantName: "成员 demo-member",
    quantity: 2,
    reason: "细胞培养实验补充耗材",
    status: "pending",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  }
];

class MemoryInventoryRepository implements InventoryRepository {
  private readonly materials = structuredClone(seedMaterials);
  private readonly applications = structuredClone(seedApplications);
  private readonly stockMovements: StockMovement[] = [];

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

  async listMaterials(): Promise<Material[]> {
    return this.materials;
  }

  async listApplications(): Promise<InventoryApplication[]> {
    return [...this.applications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listStockMovements(): Promise<StockMovement[]> {
    return [...this.stockMovements].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
      applicantName: `成员 ${input.actorId}`,
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
        project_id TEXT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        reason TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        reviewed_at TIMESTAMPTZ,
        review_remark TEXT
      );
      ALTER TABLE inventory.application ADD COLUMN IF NOT EXISTS project_id TEXT;

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
    `);

    const materialCount = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM inventory.material"
    );
    if (Number(materialCount.rows[0]?.count ?? 0) === 0) {
      for (const material of seedMaterials) {
        await this.pool.query(
          `INSERT INTO inventory.material
            (id, name, spec, stock, warn_stock, unit, location, manager)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            material.id,
            material.name,
            material.spec,
            material.stock,
            material.warnStock,
            material.unit,
            material.location,
            material.manager
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
        projectId: input.projectId ?? null,
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

      const materialResult = await client.query<{ stock: number }>(
        "SELECT stock FROM inventory.material WHERE id = $1 FOR UPDATE",
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

function createRepository(): InventoryRepository {
  if (!process.env.DATABASE_URL) {
    return new MemoryInventoryRepository();
  }
  return new PostgresInventoryRepository(process.env.DATABASE_URL);
}

function isRepositoryError(
  value: InventoryApplication | { error: string; status: number }
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
          path: "/inventory/applications",
          permission: "inventory:read",
          summary: "获取耗材申请列表（可按项目筛选）",
          handler: async ({ query }) => {
            const all = await repository.listApplications();
            const projectId = (query as any)?.projectId as string | undefined;
            if (projectId) return { body: all.filter((a: any) => a.project_id === projectId || !a.project_id) };
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
