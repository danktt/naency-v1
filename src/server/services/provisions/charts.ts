import type { DbClient } from "@/server/db/client";

import { getProvisionsGrid } from "./grid";
import type { PeriodInput } from "./helpers";

type PlannedVsActualParams = {
  db: DbClient;
  groupId: string;
  period?: PeriodInput;
  type?: "expense" | "income";
  limit?: number;
};

export type PlannedVsActualChartEntry = {
  categoryId: string;
  name: string;
  planned: number;
  realized: number;
  color: string | null;
};

type TreeRow = PlannedVsActualChartEntry & {
  type: "expense" | "income";
  parentId: string | null;
  children: TreeRow[];
};

function buildTree(rows: PlannedVsActualChartEntry[], metadata: Map<string, { type: "expense" | "income"; parentId: string | null }>): TreeRow[] {
  const nodes = new Map<string, TreeRow>();

  rows.forEach((row) => {
    const meta = metadata.get(row.categoryId);
    if (!meta) {
      return;
    }
    nodes.set(row.categoryId, {
      ...row,
      type: meta.type,
      parentId: meta.parentId,
      children: [],
    });
  });

  const roots: TreeRow[] = [];
  nodes.forEach((node) => {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function aggregateTree(node: TreeRow): { planned: number; realized: number } {
  if (!node.children.length) {
    return { planned: node.planned, realized: node.realized };
  }

  const totals = node.children.reduce(
    (acc, child) => {
      const childTotals = aggregateTree(child);
      acc.planned += childTotals.planned;
      acc.realized += childTotals.realized;
      return acc;
    },
    { planned: 0, realized: 0 },
  );

  node.planned = Number(totals.planned.toFixed(2));
  node.realized = Number(totals.realized.toFixed(2));

  return { planned: node.planned, realized: node.realized };
}

export async function getPlannedVsActualChart({
  db,
  groupId,
  period,
  type = "expense",
  limit = 6,
}: PlannedVsActualParams): Promise<PlannedVsActualChartEntry[]> {
  const { rows } = await getProvisionsGrid({
    db,
    groupId,
    period,
    includeInactive: false,
    type,
  });

  const metadata = new Map<string, { type: "expense" | "income"; parentId: string | null }>();
  rows.forEach((row) => {
    metadata.set(row.categoryId, { type: row.type, parentId: row.parentId });
  });

  const treeRows = buildTree(
    rows.map((row) => ({
      categoryId: row.categoryId,
      name: row.name,
      planned: row.planned,
      realized: row.realized,
      color: row.color,
    })),
    metadata,
  );

  treeRows.forEach((root) => {
    aggregateTree(root);
  });

  const parents = treeRows.filter((row) => row.parentId === null && row.type === type);

  parents.sort((a, b) => b.planned - a.planned);

  return parents.slice(0, limit).map((row) => ({
    categoryId: row.categoryId,
    name: row.name,
    planned: row.planned,
    realized: row.realized,
    color: row.color ?? null,
  }));
}
