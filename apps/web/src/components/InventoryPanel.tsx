import type { SyntheticEvent } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Database,
  PackageCheck,
  Send,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { Metric } from "./Shared";
import { statusText, applicationPreviewLimit } from "../utils/helpers";
import type { InventoryApplication, Material, StockMovement, Summary } from "../types";

interface InventoryPanelProps {
  summary: Summary;
  materials: Material[];
  selectedMaterialId: string;
  setSelectedMaterialId: (v: string) => void;
  selectedMaterial: Material | undefined;
  quantity: number;
  setQuantity: (v: number) => void;
  reason: string;
  setReason: (v: string) => void;
  loading: boolean;
  canApprove: boolean;
  canStock: boolean;
  stockInQuantity: number;
  setStockInQuantity: (v: number) => void;
  displayedApplications: InventoryApplication[];
  pendingApplications: InventoryApplication[];
  visibleApplications: InventoryApplication[];
  hasMoreApplications: boolean;
  showAllApplications: boolean;
  setShowAllApplications: (v: boolean) => void;
  filteredStockMovements: StockMovement[];
  movementMaterialFilter: string;
  setMovementMaterialFilter: (v: string) => void;
  movementTypeFilter: string;
  setMovementTypeFilter: (v: string) => void;
  onSubmitApplication: (e: SyntheticEvent<HTMLFormElement>) => void;
  onStockIn: () => void;
  onReviewApplication: (id: string, action: "approve" | "reject") => void;
  projectMap: Record<string, string>;
}

export function InventoryPanel({
  summary,
  materials,
  selectedMaterialId,
  setSelectedMaterialId,
  selectedMaterial,
  quantity,
  setQuantity,
  reason,
  setReason,
  loading,
  canApprove,
  canStock,
  stockInQuantity,
  setStockInQuantity,
  displayedApplications,
  pendingApplications,
  visibleApplications,
  hasMoreApplications,
  showAllApplications,
  setShowAllApplications,
  filteredStockMovements,
  movementMaterialFilter,
  setMovementMaterialFilter,
  movementTypeFilter,
  setMovementTypeFilter,
  onSubmitApplication,
  onStockIn,
  onReviewApplication,
  projectMap
}: InventoryPanelProps) {
  return (
    <>
      <section id="dashboard" className="metrics">
        <Metric icon={<Database />} label="耗材种类" value={summary.materialCount} />
        <Metric
          icon={<ShieldCheck />}
          label="低库存预警"
          value={summary.lowStockCount}
          tone="warning"
        />
        <Metric icon={<ClipboardList />} label="待审批申请" value={summary.pendingApplications} />
        <Metric icon={<PackageCheck />} label="已批准申请" value={summary.approvedApplications} />
      </section>

      <section className="layout">
        <div className="panel inventory-panel" id="inventory">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Inventory</p>
              <h2>耗材库存</h2>
            </div>
            <span>{materials.length} 项</span>
          </div>

          <div className="material-list">
            {materials.map((material) => (
              <button
                className={`material-row ${selectedMaterialId === material.id ? "picked" : ""}`}
                key={material.id}
                onClick={() => setSelectedMaterialId(material.id)}
              >
                <div>
                  <strong>{material.name}</strong>
                  <span>{material.spec}</span>
                </div>
                <div className="stock">
                  <b className={material.stock <= material.warnStock ? "danger" : ""}>
                    {material.stock}
                  </b>
                  <span>{material.unit}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <form className="panel request-panel" onSubmit={onSubmitApplication}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">Request</p>
              <h2>{canApprove ? "入库与申请" : "提交领用申请"}</h2>
            </div>
            <Send size={20} />
          </div>

          <label>
            申请耗材
            <select
              value={selectedMaterialId}
              onChange={(event) => setSelectedMaterialId(event.target.value)}
            >
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name} / 库存 {material.stock}
                  {material.unit}
                </option>
              ))}
            </select>
          </label>

          <label>
            数量
            <input
              min={1}
              max={selectedMaterial?.stock ?? 99}
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          </label>

          <label>
            用途说明
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>

          <div className="selected-material">
            <span>存放位置</span>
            <strong>{selectedMaterial?.location ?? "-"}</strong>
            <span>负责人</span>
            <strong>{selectedMaterial?.manager ?? "-"}</strong>
          </div>

          <button className="primary" disabled={loading}>
            {loading ? "处理中..." : "提交申请"}
          </button>

          {canStock ? (
            <div className="stock-in">
              <label>
                入库数量
                <input
                  min={1}
                  type="number"
                  value={stockInQuantity}
                  onChange={(event) => setStockInQuantity(Number(event.target.value))}
                />
              </label>
              <button type="button" className="ghost full" onClick={onStockIn}>
                登记入库
              </button>
            </div>
          ) : null}
        </form>
      </section>

      <section className="panel" id="applications">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Approval</p>
            <h2>{canApprove ? "审批队列" : "我的申请记录"}</h2>
          </div>
          <span>{canApprove ? pendingApplications.length : visibleApplications.length} 条</span>
        </div>

        <div className={`table list-frame ${showAllApplications ? "expanded" : ""}`}>
          <div className="table-head">
            <span>耗材</span>
            <span>申请人</span>
            <span>数量</span>
            <span>状态</span>
            <span>操作</span>
          </div>
          {displayedApplications.map((application) => (
            <div className="table-row" key={application.id}>
              <span>
                <strong>{application.materialName}</strong>
                <small>{application.reason}</small>
              </span>
              <span>{projectMap[application.projectId ?? ""] ?? "-"}</span>
              <span>{application.applicantName}</span>
              <span>{application.quantity}</span>
              <span>
                <b className={`pill ${application.status}`}>{statusText(application.status)}</b>
              </span>
              <span className="row-actions">
                {canApprove && application.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onReviewApplication(application.id, "approve")}
                    >
                      <CheckCircle2 size={16} />
                      批准
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onReviewApplication(application.id, "reject")}
                    >
                      <XCircle size={16} />
                      拒绝
                    </button>
                  </>
                ) : (
                  <small>{application.reviewRemark ?? "等待处理"}</small>
                )}
              </span>
            </div>
          ))}
        </div>
        {hasMoreApplications ? (
          <button
            className="ghost more-button"
            type="button"
            onClick={() => setShowAllApplications((value) => !value)}
          >
            {showAllApplications
              ? "收起"
              : `展示更多（还有 ${visibleApplications.length - applicationPreviewLimit} 条）`}
          </button>
        ) : null}
      </section>

      <section className="panel" id="stock-movements">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Stock Ledger</p>
            <h2>库存流水查询</h2>
          </div>
          <span>{filteredStockMovements.length} 条</span>
        </div>

        <div className="movement-toolbar">
          <label>
            耗材
            <select
              value={movementMaterialFilter}
              onChange={(event) => setMovementMaterialFilter(event.target.value)}
            >
              <option value="all">全部耗材</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            类型
            <select
              value={movementTypeFilter}
              onChange={(event) => setMovementTypeFilter(event.target.value)}
            >
              <option value="all">全部类型</option>
              <option value="stock_in">入库</option>
              <option value="application_out">审批出库</option>
            </select>
          </label>
        </div>

        <div className="movement-table list-frame">
          <div className="movement-head">
            <span>时间</span>
            <span>耗材</span>
            <span>类型</span>
            <span>数量</span>
            <span>操作人</span>
            <span>备注</span>
          </div>
          {filteredStockMovements.map((movement) => (
            <div className="movement-row" key={movement.id}>
              <span>{new Date(movement.createdAt).toLocaleString()}</span>
              <span>{movement.materialName}</span>
              <span>{movement.type === "stock_in" ? "入库" : "审批出库"}</span>
              <span className={movement.quantity < 0 ? "danger" : ""}>{movement.quantity}</span>
              <span>{movement.operatorId}</span>
              <span>{movement.remark}</span>
            </div>
          ))}
          {filteredStockMovements.length === 0 ? (
            <div className="empty-row">暂无符合条件的库存流水。</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
