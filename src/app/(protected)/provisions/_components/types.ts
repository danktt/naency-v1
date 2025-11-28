"use client";

export type TreeNode = {
  id: string;
  categoryId: string;
  name: string;
  color?: string | null;
  type: "expense" | "income";
  planned: number;
  realized: number;
  parentId: string | null;
  children: TreeNode[];
};

export type SelectOption = {
  value: string;
  label: string;
};

export type PeriodValue = {
  month: number;
  year: number;
};

export type CopyFormValues = {
  month: string;
  year: string;
  overwrite: boolean;
};
