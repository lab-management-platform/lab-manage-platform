import { useMemo, useState } from "react";
import { EmptyState, SectionCard, StatusBadge } from "../shared/Ui";
import type {
  Actor,
  InventoryApplication,
  Material,
  Project,
  StockMovement,
  Summary
} from "../../types";

interface InventoryPageProps {
  actor: Actor;
  summary: Summary;
  materials: Material[];
  applications: InventoryApplication[];
  stockMovements: StockMovement[];
  projects: Project[];
  selectedProjectId: string;
  onSubmitApplication: (payload: {
    materialId: string;
    quantity: number;
    reason: string;
    projectId?: string;
  }) => Promise<void>;
  onStockIn: (payload: { materialId: string; quantity: number; remark: string }) => Promise<void>;
  onReviewApplication: (
    applicationId: string,
    action: "approve" | "reject",
    remark: string
  ) => Promise<void>;
}

export function InventoryPage({
  actor,
  summary,
  materials,
  applications,
  stockMovements,
  projects,
  selectedProjectId,
  onSubmitApplication,
  onStockIn,
  onReviewApplication
}: InventoryPageProps) {
  const [selectedMaterialId, setSelectedMaterialId] = useState(materials[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("课题实验耗材申请");
  const [stockInQuantity, setStockInQuantity] = useState(10);
  const [reviewRemark, setReviewRemark] = useState("库存确认无误，批准领用。");

  const selectedMaterial =
    materials.find((material) => material.id === selectedMaterialId) ?? materials[0];
  const filteredApplications = useMemo(
    () =>
      selectedProjectId
        ? applications.filter((item) => item.projectId === selectedProjectId || !item.projectId)
        : applications,
    [applications, selectedProjectId]
  );
  const recentMovements = stockMovements.slice(0, 6);

  return (
    <div className="page-grid">
      <div className="split-layout three">
        <article className="summary-card">
          <span>耗材总数</span>
          <strong>{summary.materialCount}</strong>
          <small>库存与目录联动</small>
        </article>
        <article className="summary-card">
          <span>低库存预警</span>
          <strong>{summary.lowStockCount}</strong>
          <small>需补货清单</small>
        </article>
        <article className="summary-card">
          <span>审批处理中</span>
          <strong>{summary.pendingApplications}</strong>
          <small>等待管理员/教授处理</small>
        </article>
      </div>

      <div className="split-layout">
        <SectionCard title="耗材目录" eyebrow="Materials">
          <div className="catalog-grid">
            {materials.map((material) => (
              <button
                key={material.id}
                type="button"
                className={
                  material.id === selectedMaterial?.id ? "catalog-card active" : "catalog-card"
                }
                onClick={() => setSelectedMaterialId(material.id)}
              >
                <div>
                  <strong>{material.name}</strong>
                  <small>{material.spec}</small>
                </div>
                <div className="catalog-meta">
                  <span>{material.location}</span>
                  <StatusBadge tone={material.stock <= material.warnStock ? "danger" : "active"}>
                    {material.stock <= material.warnStock ? "预警" : "充足"}
                  </StatusBadge>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="领用与入库" eyebrow="Actions">
          {!selectedMaterial ? (
            <EmptyState title="暂无耗材数据" text="接口返回耗材后，这里会显示领用与入库操作。" />
          ) : (
            <div className="column-layout">
              <article className="detail-card">
                <strong>{selectedMaterial.name}</strong>
                <p>
                  {selectedMaterial.spec} · 负责人 {selectedMaterial.manager}
                </p>
                <div className="meta-grid">
                  <span>
                    库存：{selectedMaterial.stock} {selectedMaterial.unit}
                  </span>
                  <span>
                    预警线：{selectedMaterial.warnStock} {selectedMaterial.unit}
                  </span>
                  <span>位置：{selectedMaterial.location}</span>
                </div>
              </article>

              <form
                className="form-grid compact"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await onSubmitApplication({
                    materialId: selectedMaterial.id,
                    quantity,
                    reason,
                    projectId: selectedProjectId || undefined
                  });
                }}
              >
                <label>
                  领用数量
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                  />
                </label>
                <label>
                  关联项目
                  <select value={selectedProjectId} disabled>
                    <option value="">{projects.length ? "全部项目视图" : "暂无项目"}</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  申请说明
                  <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
                </label>
                <button className="primary-button">提交申请</button>
              </form>

              {actor.permissions.includes("inventory:stock") ? (
                <form
                  className="inline-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    await onStockIn({
                      materialId: selectedMaterial.id,
                      quantity: stockInQuantity,
                      remark: "前端工作台入库登记"
                    });
                  }}
                >
                  <input
                    type="number"
                    min={1}
                    value={stockInQuantity}
                    onChange={(event) => setStockInQuantity(Number(event.target.value))}
                  />
                  <button className="secondary-button">登记入库</button>
                </form>
              ) : null}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="split-layout">
        <SectionCard title="申请队列" eyebrow="Applications">
          <div className="data-list">
            {filteredApplications.length === 0 ? (
              <EmptyState
                title="当前没有申请记录"
                text="提交领用申请后，审批队列会在这里集中展示。"
              />
            ) : (
              filteredApplications.map((item) => (
                <article key={item.id} className="approval-card">
                  <div>
                    <strong>{item.materialName}</strong>
                    <small>
                      {item.applicantName} · {item.quantity}
                    </small>
                  </div>
                  <p>{item.reason}</p>
                  <div className="row-inline">
                    <StatusBadge
                      tone={
                        item.status === "approved"
                          ? "active"
                          : item.status === "rejected"
                            ? "danger"
                            : "pending"
                      }
                    >
                      {item.status === "pending"
                        ? "待审批"
                        : item.status === "approved"
                          ? "已批准"
                          : "已拒绝"}
                    </StatusBadge>
                    {item.status === "pending" &&
                    actor.permissions.includes("inventory:approve") ? (
                      <div className="row-inline">
                        <button
                          type="button"
                          className="tertiary-button"
                          onClick={() => onReviewApplication(item.id, "approve", reviewRemark)}
                        >
                          批准
                        </button>
                        <button
                          type="button"
                          className="tertiary-button ghost-tone"
                          onClick={() =>
                            onReviewApplication(item.id, "reject", "请补充实验说明后重新提交。")
                          }
                        >
                          驳回
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
          {actor.permissions.includes("inventory:approve") ? (
            <label>
              审批备注模板
              <input
                value={reviewRemark}
                onChange={(event) => setReviewRemark(event.target.value)}
              />
            </label>
          ) : null}
        </SectionCard>

        <SectionCard title="库存流水" eyebrow="Movements">
          <div className="data-list">
            {recentMovements.length === 0 ? (
              <EmptyState title="暂无流水" text="入库和领用出库都会生成可追溯记录。" />
            ) : (
              recentMovements.map((movement) => (
                <article key={movement.id} className="list-row">
                  <div>
                    <strong>{movement.materialName}</strong>
                    <small>{movement.remark}</small>
                  </div>
                  <div className="row-inline">
                    <small>{movement.type === "stock_in" ? "入库" : "领用出库"}</small>
                    <span className="numeric">{movement.quantity}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
