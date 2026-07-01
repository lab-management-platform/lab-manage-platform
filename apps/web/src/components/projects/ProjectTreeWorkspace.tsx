import { useEffect, useMemo, useState } from "react";
import { EmptyState, StatusBadge } from "../shared/Ui";
import { treeStatusText } from "../../utils/helpers";
import type { Project, ProjectMember, ProjectTreeSnapshot, ProjectTreeNode } from "../../types";

type DraftNode = {
  id?: string;
  parentId?: string;
  title: string;
  status: "todo" | "doing" | "done";
  sortOrder?: number;
  ownerUserId?: string;
  remark?: string;
  deliverableNote?: string;
  collapsed?: boolean;
};

type TreeNodeView = DraftNode & { children: TreeNodeView[] };

interface TreeWorkspaceProps {
  project: Project;
  members: ProjectMember[];
  nodes: ProjectTreeNode[];
  snapshots: ProjectTreeSnapshot[];
  canManage: boolean;
  onExit: () => void;
  onSave: (projectId: string, nodes: DraftNode[]) => Promise<void>;
  onCreateSnapshot: (projectId: string) => Promise<void>;
}

interface ContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

interface DropState {
  nodeId: string;
  mode: "before" | "inside" | "after";
}

function compareNodes(left: DraftNode, right: DraftNode) {
  const orderGap = (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
  if (orderGap !== 0) return orderGap;
  return String(left.id ?? "").localeCompare(String(right.id ?? ""));
}

function buildTree(nodes: DraftNode[]) {
  const byId = new Map<string, TreeNodeView>();
  const roots: TreeNodeView[] = [];
  for (const node of nodes) {
    byId.set(String(node.id), { ...node, children: [] });
  }
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortTree = (items: TreeNodeView[]) => {
    items.sort(compareNodes);
    for (const item of items) {
      sortTree(item.children);
    }
  };
  sortTree(roots);
  return roots;
}

function normalizeDraftNodes(nodes: DraftNode[]) {
  const grouped = new Map<string, DraftNode[]>();
  for (const node of nodes) {
    const parentKey = node.parentId ?? "";
    const current = grouped.get(parentKey) ?? [];
    current.push(node);
    grouped.set(parentKey, current);
  }
  const next = [...nodes];
  for (const siblings of grouped.values()) {
    siblings
      .sort(compareNodes)
      .forEach((node, index) => {
        const target = next.find((item) => item.id === node.id);
        if (target) {
          target.sortOrder = index + 1;
        }
      });
  }
  return next;
}

function nextSiblingSortOrder(nodes: DraftNode[], parentId?: string) {
  const siblings = nodes.filter((node) => (node.parentId ?? "") === (parentId ?? ""));
  return siblings.length + 1;
}

function validateDraftNodes(nodes: DraftNode[]) {
  const ids = new Set(nodes.map((node) => String(node.id)));
  for (const node of nodes) {
    if (!node.title.trim()) {
      throw new Error("项目树节点标题不能为空。");
    }
    if (node.parentId && !ids.has(String(node.parentId))) {
      throw new Error(`节点“${node.title}”的父节点不存在，请重新整理层级。`);
    }
    if (node.parentId && String(node.parentId) === String(node.id)) {
      throw new Error(`节点“${node.title}”不能把自己设为父节点。`);
    }
  }
  for (const node of nodes) {
    const visited = new Set<string>([String(node.id)]);
    let currentParentId = node.parentId;
    while (currentParentId) {
      if (visited.has(String(currentParentId))) {
        throw new Error(`节点“${node.title}”存在循环层级，请调整父子关系后再保存。`);
      }
      visited.add(String(currentParentId));
      currentParentId = nodes.find((item) => String(item.id) === String(currentParentId))?.parentId;
    }
  }
}

function flattenTree(nodes: TreeNodeView[], parentId?: string, output: DraftNode[] = []) {
  nodes.forEach((node, index) => {
    output.push({
      id: node.id,
      parentId,
      title: node.title,
      status: node.status,
      sortOrder: index + 1,
      ownerUserId: node.ownerUserId,
      remark: node.remark,
      deliverableNote: node.deliverableNote,
      collapsed: node.collapsed ?? false
    });
    if (node.children.length > 0) {
      flattenTree(node.children, String(node.id), output);
    }
  });
  return output;
}

function isDescendant(nodes: DraftNode[], sourceId: string, targetId: string) {
  let current = nodes.find((node) => String(node.id) === targetId);
  while (current?.parentId) {
    if (current.parentId === sourceId) return true;
    current = nodes.find((node) => String(node.id) === current?.parentId);
  }
  return false;
}

function countDescendants(nodes: DraftNode[], nodeId: string) {
  return nodes.filter((node) => {
    let current = node;
    while (current.parentId) {
      if (current.parentId === nodeId) return true;
      current = nodes.find((candidate) => String(candidate.id) === current.parentId) ?? {
        title: "",
        status: "todo"
      };
    }
    return false;
  }).length;
}

function buildNodePath(nodes: DraftNode[], nodeId: string) {
  const path: string[] = [];
  let current = nodes.find((node) => String(node.id) === nodeId);
  while (current) {
    path.unshift(current.title);
    current = current.parentId
      ? nodes.find((node) => String(node.id) === current?.parentId)
      : undefined;
  }
  return path;
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function treeToMarkdown(nodes: TreeNodeView[], depth = 0): string {
  return nodes
    .map((node) => {
      const indent = "  ".repeat(depth);
      const owner = node.ownerUserId ? ` | 责任人: ${node.ownerUserId}` : "";
      const remark = node.remark ? ` | 备注: ${node.remark}` : "";
      const deliverable = node.deliverableNote ? ` | 交付物: ${node.deliverableNote}` : "";
      const line = `${indent}- [${treeStatusText(node.status)}] ${node.title}${owner}${deliverable}${remark}`;
      const children =
        node.children.length > 0 ? `\n${treeToMarkdown(node.children, depth + 1)}` : "";
      return `${line}${children}`;
    })
    .join("\n");
}

function toDraftNodes(nodes: ProjectTreeNode[]): DraftNode[] {
  return nodes.map((node) => ({
    id: node.id,
    parentId: node.parentId,
    title: node.title,
    status: node.status,
    sortOrder: node.sortOrder,
    ownerUserId: node.ownerUserId,
    remark: node.remark,
    deliverableNote: node.deliverableNote,
    collapsed: node.collapsed
  }));
}

export function ProjectTreeWorkspace({
  project,
  members,
  nodes,
  snapshots,
  canManage,
  onExit,
  onSave,
  onCreateSnapshot
}: TreeWorkspaceProps) {
  const [draftNodes, setDraftNodes] = useState<DraftNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [draggingNodeId, setDraggingNodeId] = useState<string>("");
  const [dropState, setDropState] = useState<DropState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [snapshotFeedback, setSnapshotFeedback] = useState("");
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>("");

  useEffect(() => {
    const normalizedNodes = toDraftNodes(nodes);
    setDraftNodes(normalizedNodes);
    setSelectedNodeId(normalizedNodes[0]?.id ?? "");
    setContextMenu(null);
    setDropState(null);
    setDirty(false);
  }, [nodes]);

  useEffect(() => {
    setSelectedSnapshotId((current) => {
      if (current && snapshots.some((snapshot) => snapshot.id === current)) {
        return current;
      }
      return snapshots[0]?.id ?? "";
    });
  }, [snapshots]);

  useEffect(() => {
    if (!snapshotFeedback) {
      return;
    }
    const timer = window.setTimeout(() => setSnapshotFeedback(""), 3200);
    return () => window.clearTimeout(timer);
  }, [snapshotFeedback]);

  useEffect(() => {
    const hideMenu = () => setContextMenu(null);
    window.addEventListener("click", hideMenu);
    return () => window.removeEventListener("click", hideMenu);
  }, []);

  const tree = useMemo(() => buildTree(draftNodes), [draftNodes]);
  const selectedNode = draftNodes.find((node) => String(node.id) === selectedNodeId);
  const selectedOwner =
    members.find((member) => member.userId === selectedNode?.ownerUserId)?.userName ?? "未指定";
  const nodePath = selectedNodeId ? buildNodePath(draftNodes, selectedNodeId) : [];
  const stats = useMemo(
    () => ({
      done: draftNodes.filter((node) => node.status === "done").length,
      doing: draftNodes.filter((node) => node.status === "doing").length,
      todo: draftNodes.filter((node) => node.status === "todo").length
    }),
    [draftNodes]
  );
  const totalNodes = draftNodes.length;
  const completion = totalNodes === 0 ? 0 : Math.round((stats.done / totalNodes) * 100);
  const selectedSnapshot =
    snapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ?? snapshots[0] ?? null;
  const selectedSnapshotNodes = selectedSnapshot ? toDraftNodes(selectedSnapshot.nodes) : [];
  const selectedSnapshotTree = useMemo(
    () => buildTree(selectedSnapshotNodes),
    [selectedSnapshotNodes]
  );
  const snapshotStats = useMemo(
    () => ({
      done: selectedSnapshotNodes.filter((node) => node.status === "done").length,
      doing: selectedSnapshotNodes.filter((node) => node.status === "doing").length,
      todo: selectedSnapshotNodes.filter((node) => node.status === "todo").length
    }),
    [selectedSnapshotNodes]
  );
  const snapshotCompletion =
    selectedSnapshotNodes.length === 0
      ? 0
      : Math.round((snapshotStats.done / selectedSnapshotNodes.length) * 100);

  function mutate(mutator: (current: DraftNode[]) => DraftNode[]) {
    setDraftNodes((current) => {
      const next = normalizeDraftNodes(mutator(current));
      setDirty(true);
      return next;
    });
  }

  function updateSelected(patch: Partial<DraftNode>) {
    if (!selectedNodeId) return;
    mutate((current) =>
      current.map((node) =>
        String(node.id) === selectedNodeId
          ? {
              ...node,
              ...patch
            }
          : node
      )
    );
  }

  function siblingsOf(node: DraftNode) {
    return draftNodes
      .filter((item) => (item.parentId ?? "") === (node.parentId ?? ""))
      .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  }

  function reindex(nodesToReindex: DraftNode[]) {
    return nodesToReindex.map((node, index) => ({ ...node, sortOrder: index + 1 }));
  }

  function createNode(parentId?: string) {
    const nextId = `draft-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    mutate((current) => [
      ...current,
      {
        id: nextId,
        parentId,
        title: "新节点",
        status: "todo",
        sortOrder: nextSiblingSortOrder(current, parentId),
        collapsed: false
      }
    ]);
    setSelectedNodeId(nextId);
  }

  function removeNode(nodeId: string) {
    const allChildren = new Set<string>([nodeId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of draftNodes) {
        if (node.parentId && allChildren.has(node.parentId) && !allChildren.has(String(node.id))) {
          allChildren.add(String(node.id));
          changed = true;
        }
      }
    }
    mutate((current) => current.filter((node) => !allChildren.has(String(node.id))));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId("");
    }
  }

  function moveSibling(direction: -1 | 1) {
    if (!selectedNode) return;
    const siblings = siblingsOf(selectedNode);
    const index = siblings.findIndex((node) => String(node.id) === selectedNodeId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= siblings.length) return;
    const nextSiblings = [...siblings];
    const [moved] = nextSiblings.splice(index, 1);
    nextSiblings.splice(nextIndex, 0, moved);
    const indexed = reindex(nextSiblings);
    mutate((current) =>
      current.map((node) => indexed.find((candidate) => candidate.id === node.id) ?? node)
    );
  }

  function promoteNode() {
    if (!selectedNode?.parentId) return;
    mutate((current) => {
      const node = current.find((item) => String(item.id) === selectedNodeId);
      if (!node?.parentId) {
        return current;
      }
      const parent = current.find((item) => String(item.id) === node.parentId);
      const nextParentId = parent?.parentId;
      return current.map((item) =>
        String(item.id) === selectedNodeId
          ? {
              ...item,
              parentId: nextParentId,
              sortOrder: nextSiblingSortOrder(
                current.filter((candidate) => String(candidate.id) !== selectedNodeId),
                nextParentId
              )
            }
          : item
      );
    });
  }

  function demoteNode() {
    if (!selectedNode) return;
    mutate((current) => {
      const node = current.find((item) => String(item.id) === selectedNodeId);
      if (!node) {
        return current;
      }
      const siblings = current
        .filter((item) => (item.parentId ?? "") === (node.parentId ?? ""))
        .sort(compareNodes);
      const index = siblings.findIndex((item) => String(item.id) === selectedNodeId);
      if (index <= 0) {
        return current;
      }
      const previousSibling = siblings[index - 1];
      return current.map((item) =>
        String(item.id) === selectedNodeId
          ? {
              ...item,
              parentId: String(previousSibling.id),
              sortOrder: nextSiblingSortOrder(
                current.filter((candidate) => String(candidate.id) !== selectedNodeId),
                String(previousSibling.id)
              )
            }
          : item
      );
    });
  }

  function expandAll(collapsed: boolean) {
    mutate((current) => current.map((node) => ({ ...node, collapsed })));
  }

  async function persist() {
    try {
      const nextNodes = flattenTree(tree);
      validateDraftNodes(nextNodes);
      await onSave(project.id, nextNodes);
      setDirty(false);
      setSnapshotFeedback("项目树已保存。");
    } catch (error) {
      setSnapshotFeedback(error instanceof Error ? error.message : "保存项目树失败");
    }
  }

  async function snapshot() {
    try {
      setSnapshotBusy(true);
      setSnapshotFeedback("");
      if (dirty) {
        const nextNodes = flattenTree(tree);
        validateDraftNodes(nextNodes);
        await onSave(project.id, nextNodes);
        setDirty(false);
      }
      await onCreateSnapshot(project.id);
      setSnapshotFeedback("已生成新的结构快照，右侧历史已更新。");
    } catch (error) {
      setSnapshotFeedback(error instanceof Error ? error.message : "生成快照失败");
    } finally {
      setSnapshotBusy(false);
    }
  }

  function exportTreeAsJson() {
    const payload = {
      project: { id: project.id, name: project.name },
      exportedAt: new Date().toISOString(),
      nodeCount: draftNodes.length,
      nodes: flattenTree(tree)
    };
    downloadTextFile(
      `${project.name.replace(/[\\/:*?"<>|]/g, "-")}-project-tree.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
  }

  function exportTreeAsMarkdown() {
    const markdown = [
      `# ${project.name} 项目树导出`,
      "",
      `- 导出时间：${new Date().toLocaleString("zh-CN")}`,
      `- 节点数量：${draftNodes.length}`,
      `- 完成率：${completion}%`,
      "",
      "## 树结构",
      "",
      treeToMarkdown(tree)
    ].join("\n");
    downloadTextFile(
      `${project.name.replace(/[\\/:*?"<>|]/g, "-")}-project-tree.md`,
      markdown,
      "text/markdown;charset=utf-8"
    );
  }

  function handleDrop(targetId: string) {
    if (!draggingNodeId || draggingNodeId === targetId) return;
    if (isDescendant(draftNodes, draggingNodeId, targetId)) return;
    mutate((current) => {
      const target = current.find((node) => String(node.id) === targetId);
      const dragged = current.find((node) => String(node.id) === draggingNodeId);
      if (!target || !dragged) {
        return current;
      }
      const mode = dropState?.nodeId === targetId ? dropState.mode : "inside";
      if (mode === "inside") {
        return current.map((node) =>
          String(node.id) === draggingNodeId
            ? {
                ...node,
                parentId: targetId,
                sortOrder: nextSiblingSortOrder(
                  current.filter((candidate) => String(candidate.id) !== draggingNodeId),
                  targetId
                )
              }
            : node
        );
      }

      const nextParentId = target.parentId;
      const siblingSource = current
        .filter((node) => (node.parentId ?? "") === (nextParentId ?? ""))
        .sort(compareNodes)
        .filter((node) => String(node.id) !== draggingNodeId);
      const targetIndex = siblingSource.findIndex((node) => String(node.id) === targetId);
      const insertIndex = mode === "before" ? targetIndex : targetIndex + 1;
      siblingSource.splice(insertIndex, 0, { ...dragged, parentId: nextParentId });
      const indexed = reindex(siblingSource);
      return current.map((node) => {
        if (String(node.id) === draggingNodeId) {
          return {
            ...node,
            parentId: nextParentId,
            sortOrder: indexed.find((item) => String(item.id) === draggingNodeId)?.sortOrder ?? 1
          };
        }
        return indexed.find((item) => item.id === node.id) ?? node;
      });
    });
    setDraggingNodeId("");
    setDropState(null);
  }

  function runContextAction(action: string, nodeId: string) {
    setSelectedNodeId(nodeId);
    setContextMenu(null);
    if (action === "addChild") createNode(nodeId);
    if (action === "addSibling") {
      const node = draftNodes.find((item) => String(item.id) === nodeId);
      createNode(node?.parentId);
    }
    if (action === "todo") {
      setSelectedNodeId(nodeId);
      mutate((current) =>
        current.map((node) => (String(node.id) === nodeId ? { ...node, status: "todo" } : node))
      );
    }
    if (action === "doing") {
      mutate((current) =>
        current.map((node) => (String(node.id) === nodeId ? { ...node, status: "doing" } : node))
      );
    }
    if (action === "done") {
      mutate((current) =>
        current.map((node) => (String(node.id) === nodeId ? { ...node, status: "done" } : node))
      );
    }
    if (action === "delete") removeNode(nodeId);
  }

  function renderTree(nodesToRender: TreeNodeView[], depth = 0) {
    return nodesToRender.map((node) => {
      const isSelected = String(node.id) === selectedNodeId;
      const descendantCount = countDescendants(draftNodes, String(node.id));
      const dropMode = dropState?.nodeId === String(node.id) ? dropState.mode : null;
      return (
        <div key={String(node.id)} className="tree-node-wrap">
          <div className="tree-node-row">
            {depth > 0 ? <div className="tree-node-connector" /> : null}
            <button
              type="button"
              className={
                node.children.length > 0
                  ? "tree-node-toggle"
                  : "tree-node-toggle tree-node-toggle-leaf"
              }
              onClick={() =>
                mutate((current) =>
                  current.map((item) =>
                    item.id === node.id ? { ...item, collapsed: !item.collapsed } : item
                  )
                )
              }
            >
              {node.children.length === 0 ? "·" : node.collapsed ? "+" : "−"}
            </button>
            <button
              type="button"
              draggable={canManage}
              className={
                isSelected
                  ? `tree-canvas-node selected status-${node.status} ${dropMode ? `drop-${dropMode}` : ""}`
                  : `tree-canvas-node status-${node.status} ${dropMode ? `drop-${dropMode}` : ""}`
              }
              onClick={() => setSelectedNodeId(String(node.id))}
              onContextMenu={(event) => {
                if (!canManage) return;
                event.preventDefault();
                setContextMenu({
                  nodeId: String(node.id),
                  x: event.clientX,
                  y: event.clientY
                });
              }}
              onDragStart={() => setDraggingNodeId(String(node.id))}
              onDragOver={(event) => {
                if (!canManage) return;
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                const offsetY = event.clientY - rect.top;
                const ratio = offsetY / rect.height;
                const mode = ratio < 0.28 ? "before" : ratio > 0.72 ? "after" : "inside";
                setDropState({ nodeId: String(node.id), mode });
              }}
              onDragLeave={() => setDropState(null)}
              onDrop={() => handleDrop(String(node.id))}
            >
              <span
                className="tree-canvas-status-dot"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!canManage) return;
                  const order = ["todo", "doing", "done"] as const;
                  const nextStatus =
                    order[(order.indexOf(node.status) + 1) % order.length] ?? "todo";
                  mutate((current) =>
                    current.map((item) =>
                      item.id === node.id ? { ...item, status: nextStatus } : item
                    )
                  );
                }}
              />
              <span className="tree-canvas-label">{node.title}</span>
              <small className="tree-canvas-count">
                {node.children.length} 子节点 / {descendantCount} 后代
              </small>
            </button>
          </div>
          {node.children.length > 0 && !node.collapsed ? (
            <div className="tree-node-children">{renderTree(node.children, depth + 1)}</div>
          ) : null}
        </div>
      );
    });
  }

  function renderSnapshotTree(nodesToRender: TreeNodeView[], depth = 0) {
    return nodesToRender.map((node) => {
      const owner =
        members.find((member) => member.userId === node.ownerUserId)?.userName ??
        (selectedSnapshot?.nodes.find((item) => item.id === node.id)?.ownerName ?? "未指定");
      return (
        <div key={`snapshot-${String(node.id)}`} className="tree-node-wrap preview">
          <div className="tree-node-row">
            {depth > 0 ? <div className="tree-node-connector" /> : null}
            <span
              className={
                node.children.length > 0
                  ? "tree-node-toggle tree-node-toggle-static"
                  : "tree-node-toggle tree-node-toggle-leaf tree-node-toggle-static"
              }
            >
              {node.children.length === 0 ? "·" : "−"}
            </span>
            <div className={`tree-canvas-node readonly status-${node.status}`}>
              <span className="tree-canvas-status-dot" />
              <span className="tree-canvas-label">{node.title}</span>
              <small className="tree-canvas-count">
                {treeStatusText(node.status)} · {owner}
              </small>
            </div>
          </div>
          {node.children.length > 0 ? (
            <div className="tree-node-children">{renderSnapshotTree(node.children, depth + 1)}</div>
          ) : null}
        </div>
      );
    });
  }

  return (
    <section className="tree-workspace-shell">
      <div className="tree-workspace-topbar">
        <div className="tree-workspace-brand">
          <strong>{project.name}</strong>
          <span>独立项目树工作台</span>
        </div>
        <div className="tree-workspace-actions">
          <StatusBadge tone={dirty ? "pending" : "active"}>
            {dirty ? "未保存" : "已保存"}
          </StatusBadge>
          {snapshotFeedback ? (
            <StatusBadge tone={snapshotFeedback.includes("失败") ? "pending" : "active"}>
              {snapshotFeedback}
            </StatusBadge>
          ) : null}
          <button type="button" className="secondary-button" onClick={onExit}>
            返回项目页
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => createNode(undefined)}
            disabled={!canManage}
          >
            添加根节点
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => expandAll(false)}
            disabled={!canManage}
          >
            全部展开
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => expandAll(true)}
            disabled={!canManage}
          >
            全部折叠
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={snapshot}
            disabled={!canManage || snapshotBusy}
          >
            {snapshotBusy ? "生成中..." : dirty ? "保存并生成快照" : "生成快照"}
          </button>
          <button type="button" className="secondary-button" onClick={exportTreeAsJson}>
            导出 JSON
          </button>
          <button type="button" className="secondary-button" onClick={exportTreeAsMarkdown}>
            导出 Markdown
          </button>
          <button type="button" className="primary-button" onClick={persist} disabled={!canManage}>
            保存项目树
          </button>
        </div>
      </div>

      <div className="tree-workspace-legend">
        <span>
          <i className="legend-dot done" />
          已完成
        </span>
        <span>
          <i className="legend-dot doing" />
          进行中
        </span>
        <span>
          <i className="legend-dot todo" />
          未开始
        </span>
        <small>拖到节点中部会挂到其下方，拖到上缘/下缘会前插或后插，实现同级排序。</small>
      </div>

      <div className="tree-workspace-main">
        <div className="tree-canvas-panel">
          {draftNodes.length === 0 ? (
            <EmptyState title="还没有节点" text="先添加一个根节点，再逐层拆分实验阶段。" />
          ) : (
            <div className="tree-canvas-scroll">
              {renderTree(tree)}
              {contextMenu ? (
                <div
                  className="tree-context-menu"
                  style={{ left: contextMenu.x, top: contextMenu.y }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="tree-context-item"
                    onClick={() => runContextAction("addChild", contextMenu.nodeId)}
                  >
                    添加子节点
                  </button>
                  <button
                    type="button"
                    className="tree-context-item"
                    onClick={() => runContextAction("addSibling", contextMenu.nodeId)}
                  >
                    添加兄弟节点
                  </button>
                  <div className="tree-context-separator" />
                  <button
                    type="button"
                    className="tree-context-item"
                    onClick={() => runContextAction("todo", contextMenu.nodeId)}
                  >
                    改为未开始
                  </button>
                  <button
                    type="button"
                    className="tree-context-item"
                    onClick={() => runContextAction("doing", contextMenu.nodeId)}
                  >
                    改为进行中
                  </button>
                  <button
                    type="button"
                    className="tree-context-item"
                    onClick={() => runContextAction("done", contextMenu.nodeId)}
                  >
                    改为已完成
                  </button>
                  <div className="tree-context-separator" />
                  <button
                    type="button"
                    className="tree-context-item danger"
                    onClick={() => runContextAction("delete", contextMenu.nodeId)}
                  >
                    删除节点
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <aside className="tree-inspector-panel">
          <div className="tree-inspector-section">
            <div className="sidebar-title">节点属性</div>
            {!selectedNode ? (
              <EmptyState
                title="未选中节点"
                text="点击左侧树节点后，在这里编辑名称、责任人和交付物。"
              />
            ) : (
              <>
                <div className="tree-node-path">
                  <strong>{selectedNode.title}</strong>
                  <small>{nodePath.join(" / ")}</small>
                </div>
                <div className="tree-node-facts">
                  <span>当前责任人：{selectedOwner}</span>
                  <span>
                    子节点：{draftNodes.filter((node) => node.parentId === selectedNode.id).length}
                  </span>
                  <span>后代节点：{countDescendants(draftNodes, selectedNodeId)}</span>
                </div>
                <div className="tree-inspector-form">
                  <label>
                    名称
                    <input
                      value={selectedNode.title}
                      onChange={(event) => updateSelected({ title: event.target.value })}
                      disabled={!canManage}
                    />
                  </label>
                  <label>
                    状态
                    <div className="status-btns">
                      {(["todo", "doing", "done"] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={
                            selectedNode.status === status
                              ? `status-btn active-${status}`
                              : "status-btn"
                          }
                          onClick={() => updateSelected({ status })}
                          disabled={!canManage}
                        >
                          {treeStatusText(status)}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label>
                    责任人
                    <select
                      value={selectedNode.ownerUserId ?? ""}
                      onChange={(event) =>
                        updateSelected({ ownerUserId: event.target.value || undefined })
                      }
                      disabled={!canManage}
                    >
                      <option value="">未指定</option>
                      {members.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.userName} · {member.identityNo}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    备注
                    <textarea
                      value={selectedNode.remark ?? ""}
                      onChange={(event) => updateSelected({ remark: event.target.value })}
                      disabled={!canManage}
                    />
                  </label>
                  <label>
                    交付物
                    <textarea
                      value={selectedNode.deliverableNote ?? ""}
                      onChange={(event) => updateSelected({ deliverableNote: event.target.value })}
                      disabled={!canManage}
                    />
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="tree-inspector-section">
            <div className="sidebar-title">节点操作</div>
            {!selectedNode ? (
              <div className="empty-hint">选择节点后操作</div>
            ) : (
              <div className="node-actions">
                <button
                  type="button"
                  className="node-action-btn"
                  onClick={() => createNode(selectedNodeId)}
                  disabled={!canManage}
                >
                  添加子节点
                </button>
                <button
                  type="button"
                  className="node-action-btn"
                  onClick={() => createNode(selectedNode.parentId)}
                  disabled={!canManage}
                >
                  添加兄弟节点
                </button>
                <button
                  type="button"
                  className="node-action-btn"
                  onClick={() => moveSibling(-1)}
                  disabled={!canManage}
                >
                  上移
                </button>
                <button
                  type="button"
                  className="node-action-btn"
                  onClick={() => moveSibling(1)}
                  disabled={!canManage}
                >
                  下移
                </button>
                <button
                  type="button"
                  className="node-action-btn"
                  onClick={promoteNode}
                  disabled={!canManage || !selectedNode.parentId}
                >
                  升级
                </button>
                <button
                  type="button"
                  className="node-action-btn"
                  onClick={demoteNode}
                  disabled={!canManage}
                >
                  降级
                </button>
                <button
                  type="button"
                  className="node-action-btn danger"
                  onClick={() => removeNode(selectedNodeId)}
                  disabled={!canManage}
                >
                  删除节点
                </button>
              </div>
            )}
          </div>

          <div className="tree-inspector-section">
            <div className="sidebar-title">统计</div>
            <div className="stats-grid">
              <article className="stat-card">
                <div className="stat-num green">{stats.done}</div>
                <div className="stat-lbl">已完成</div>
              </article>
              <article className="stat-card">
                <div className="stat-num red">{stats.doing}</div>
                <div className="stat-lbl">进行中</div>
              </article>
              <article className="stat-card">
                <div className="stat-num white">{stats.todo}</div>
                <div className="stat-lbl">未开始</div>
              </article>
            </div>
            <div className="tree-progress-strip">
              <span>节点总数 {totalNodes}</span>
              <strong>完成率 {completion}%</strong>
            </div>
            <div className="tree-progress-bar">
              <span
                className="done"
                style={{ width: `${totalNodes ? (stats.done / totalNodes) * 100 : 0}%` }}
              />
              <span
                className="doing"
                style={{ width: `${totalNodes ? (stats.doing / totalNodes) * 100 : 0}%` }}
              />
              <span
                className="todo"
                style={{ width: `${totalNodes ? (stats.todo / totalNodes) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="tree-inspector-section tree-snapshot-section">
            <div className="sidebar-title">快照历史</div>
            {snapshots.length === 0 ? (
              <div className="empty-hint">还没有结构快照</div>
            ) : (
              snapshots.map((snapshot) => (
                <button
                  key={snapshot.id}
                  type="button"
                  className={
                    snapshot.id === selectedSnapshot?.id
                      ? "snapshot-item active"
                      : "snapshot-item"
                  }
                  onClick={() => setSelectedSnapshotId(snapshot.id)}
                >
                  <div>
                    <strong>版本 {snapshot.version}</strong>
                    <small>
                      {snapshot.createdByName} · {snapshot.nodes.length} 个节点
                    </small>
                  </div>
                  <StatusBadge tone="muted">
                    {new Date(snapshot.createdAt).toLocaleString("zh-CN")}
                  </StatusBadge>
                </button>
              ))
            )}
            {selectedSnapshot ? (
              <div className="snapshot-preview-card">
                <div className="snapshot-preview-head">
                  <div>
                    <strong>快照详情 · v{selectedSnapshot.version}</strong>
                    <small>
                      {selectedSnapshot.createdByName} ·{" "}
                      {new Date(selectedSnapshot.createdAt).toLocaleString("zh-CN")}
                    </small>
                  </div>
                  <StatusBadge tone="active">
                    {selectedSnapshot.nodes.length} 节点 / 完成率 {snapshotCompletion}%
                  </StatusBadge>
                </div>
                <div className="snapshot-preview-stats">
                  <span>已完成 {snapshotStats.done}</span>
                  <span>进行中 {snapshotStats.doing}</span>
                  <span>未开始 {snapshotStats.todo}</span>
                </div>
                <div className="snapshot-preview-tree">
                  {selectedSnapshotTree.length === 0 ? (
                    <div className="empty-hint">该快照没有保存任何节点</div>
                  ) : (
                    renderSnapshotTree(selectedSnapshotTree)
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
