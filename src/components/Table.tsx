"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconChevronUp,
  IconGripVertical,
  IconLayoutColumns,
} from "@tabler/icons-react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Row,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Create a separate component for the drag handle
function DragHandle({ id }: { id: UniqueIdentifier }) {
  const { attributes, listeners } = useSortable({
    id,
  });

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

function DataTableRow<TData>({
  row,
  enableDragAndDrop = false,
  onRowClick,
}: {
  row: Row<TData>;
  enableDragAndDrop?: boolean;
  onRowClick?: (row: Row<TData>) => void;
}) {
  const sortableProps = useSortable({ id: row.id });
  const { transform, transition, setNodeRef, isDragging } = enableDragAndDrop
    ? sortableProps
    : {};

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger row click if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest('[role="button"]') ||
      target.closest("[data-radix-collection-item]")
    ) {
      return;
    }

    if (onRowClick) {
      onRowClick(row);
    }
  };

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={enableDragAndDrop ? setNodeRef : undefined}
      className={`relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 ${
        onRowClick ? "cursor-pointer hover:bg-muted/50" : ""
      }`}
      style={
        enableDragAndDrop && transform
          ? {
              transform: CSS.Transform.toString(transform),
              transition: transition,
            }
          : undefined
      }
      onClick={onRowClick ? handleRowClick : undefined}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  enableDragAndDrop?: boolean;
  enableRowSelection?: boolean;
  enablePagination?: boolean;
  enableColumnVisibility?: boolean;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  onDataChange?: (data: TData[]) => void;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;
  onRowClick?: (row: Row<TData>) => void;
  className?: string;
  showToolbar?: boolean;
  toolbarActions?: React.ReactNode;
  emptyMessage?: string;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  storageKey?: string;
  loading?: boolean;
}

export function DataTable<TData>({
  data: initialData,
  columns,
  enableDragAndDrop = false,
  enableRowSelection = true,
  enablePagination = true,
  enableColumnVisibility = true,
  enableSearch = true,
  searchPlaceholder = "Search...",
  onDataChange,
  onRowSelectionChange,
  onRowClick,
  className = "",
  showToolbar = true,
  toolbarActions,
  emptyMessage = "No results.",
  pageSizeOptions = [10, 20, 30, 40, 50],
  defaultPageSize = 10,
  storageKey,
  loading = false,
}: DataTableProps<TData>) {
  const safeInitialData = Array.isArray(initialData) ? initialData : [];
  type PersistedTableState = {
    sorting?: SortingState;
    columnVisibility?: VisibilityState;
    columnFilters?: ColumnFiltersState;
    pagination?: { pageIndex: number; pageSize: number };
    globalFilter?: string;
  };

  const persisted: PersistedTableState | null = React.useMemo(() => {
    if (!storageKey) return null;
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as PersistedTableState;
    } catch {
      return null;
    }
  }, [storageKey]);

  const [data, setData] = React.useState(() => safeInitialData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => persisted?.columnVisibility ?? {});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    () => persisted?.columnFilters ?? [],
  );
  const [sorting, setSorting] = React.useState<SortingState>(
    () => persisted?.sorting ?? [],
  );
  const [pagination, setPagination] = React.useState(() => ({
    pageIndex: persisted?.pagination?.pageIndex ?? 0,
    pageSize: persisted?.pagination?.pageSize ?? defaultPageSize,
  }));
  const [globalFilter, setGlobalFilter] = React.useState(
    () => persisted?.globalFilter ?? "",
  );

  const sortableId = React.useId();
  const rowsPerPageId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map((_item, index) => `row-${index}`) || [],
    [data],
  );

  // Add drag column if drag and drop is enabled
  const tableColumns = React.useMemo(() => {
    const safeColumns = Array.isArray(columns) ? columns : [];
    if (enableDragAndDrop) {
      return [
        {
          id: "drag",
          header: () => null,
          cell: ({ row }) => <DragHandle id={row.id} />,
          enableSorting: false,
          enableHiding: false,
        },
        ...safeColumns,
      ];
    }
    return safeColumns;
  }, [columns, enableDragAndDrop]);

  // Add selection column if row selection is enabled
  const finalColumns = React.useMemo(() => {
    if (enableRowSelection) {
      return [
        {
          id: "select",
          header: ({
            table,
          }: {
            table: ReturnType<typeof useReactTable<TData>>;
          }) => (
            <div className="flex items-center justify-center">
              <Checkbox
                checked={
                  table.getIsAllPageRowsSelected() ||
                  (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) =>
                  table.toggleAllPageRowsSelected(!!value)
                }
                aria-label="Select all"
              />
            </div>
          ),

          cell: ({ row }: { row: Row<TData> }) => (
            <div className="flex items-center justify-center">
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
              />
            </div>
          ),
          enableSorting: false,
          enableHiding: false,
        },
        ...tableColumns,
      ];
    }
    return tableColumns;
  }, [tableColumns, enableRowSelection]);

  const table = useReactTable({
    data: data || [],
    columns: finalColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
      globalFilter,
    },
    getRowId: (row) => {
      if (row && typeof row === "object" && "id" in row) {
        return String(row.id);
      }
      return `row-${Math.random().toString(36).substr(2, 9)}`;
    },
    enableRowSelection,
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(newSelection);
      onRowSelectionChange?.(newSelection);
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // Persist table state if storageKey provided
  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const toStore: PersistedTableState = {
        sorting,
        columnVisibility,
        columnFilters,
        pagination,
        globalFilter,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(toStore));
    } catch {}
  }, [
    storageKey,
    sorting,
    columnVisibility,
    columnFilters,
    pagination,
    globalFilter,
  ]);

  function handleDragEnd(event: DragEndEvent) {
    if (!enableDragAndDrop) return;

    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = dataIds.indexOf(active.id);
      const newIndex = dataIds.indexOf(over.id);
      const newData = arrayMove(data, oldIndex, newIndex);
      setData(newData);
      onDataChange?.(newData);
    }
  }

  React.useEffect(() => {
    const safeData = Array.isArray(initialData) ? initialData : [];
    setData(safeData);
  }, [initialData]);

  if (
    !table ||
    !table.getRowModel ||
    !finalColumns ||
    finalColumns.length === 0
  ) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">
          {!finalColumns || finalColumns.length === 0
            ? "No columns defined"
            : "Loading table..."}
        </div>
      </div>
    );
  }

  const rows = table.getRowModel()?.rows || [];

  // Loading skeleton component
  const renderLoadingSkeleton = () => (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={`skeleton-row-${i}-${Math.random()}`}
          className="flex items-center space-x-4 p-4"
        >
          {enableRowSelection && <Skeleton className="h-4 w-4" />}
          {finalColumns.slice(0, -1).map((_, colIndex) => (
            <Skeleton
              key={`skeleton-col-${colIndex}-${Math.random()}`}
              className="h-4 flex-1"
            />
          ))}
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );

  return (
    <div className={`w-full ${className}`}>
      {showToolbar && (
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-4 flex-1">
            {enableSearch && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder={searchPlaceholder}
                  value={globalFilter ?? ""}
                  onChange={(event) => setGlobalFilter(event.target.value)}
                  className="max-w-sm"
                  disabled={loading}
                />
              </div>
            )}
            {toolbarActions}
          </div>
          <div className="flex items-center gap-2">
            {enableColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={loading}>
                    <IconLayoutColumns />
                    <span className="hidden lg:inline">Customize columns</span>
                    <span className="lg:hidden">Columns</span>
                    <IconChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {table
                    .getAllColumns()
                    .filter(
                      (column) =>
                        typeof column.accessorFn !== "undefined" &&
                        column.getCanHide(),
                    )
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                          disabled={loading}
                        >
                          {column.columnDef.header?.toString()}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        {loading ? (
          <div className="p-4">{renderLoadingSkeleton()}</div>
        ) : enableDragAndDrop ? (
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const sortState = header.column.getIsSorted();
                      const ariaSort: "ascending" | "descending" | "none" =
                        sortState === "asc"
                          ? "ascending"
                          : sortState === "desc"
                            ? "descending"
                            : "none";
                      return (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          aria-sort={canSort ? ariaSort : undefined}
                        >
                          {header.isPlaceholder ? null : canSort ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-2 -ml-2 h-8 px-2"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              {sortState === "asc" ? (
                                <IconChevronUp className="h-4 w-4" />
                              ) : sortState === "desc" ? (
                                <IconChevronDown className="h-4 w-4" />
                              ) : (
                                <IconArrowsSort className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          ) : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows && rows.length > 0 ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {rows.map((row) => (
                      <DataTableRow
                        key={row.id}
                        row={row}
                        enableDragAndDrop={enableDragAndDrop}
                        onRowClick={onRowClick}
                      />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={finalColumns.length}
                      className="h-24 text-center"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        ) : (
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sortState = header.column.getIsSorted();
                    const ariaSort: "ascending" | "descending" | "none" =
                      sortState === "asc"
                        ? "ascending"
                        : sortState === "desc"
                          ? "descending"
                          : "none";
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        aria-sort={canSort ? ariaSort : undefined}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-2 -ml-2 h-8 px-2"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {sortState === "asc" ? (
                              <IconChevronUp className="h-4 w-4" />
                            ) : sortState === "desc" ? (
                              <IconChevronDown className="h-4 w-4" />
                            ) : (
                              <IconArrowsSort className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows && rows.length > 0 ? (
                rows.map((row) => (
                  <DataTableRow
                    key={row.id}
                    row={row}
                    enableDragAndDrop={false}
                    onRowClick={onRowClick}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={finalColumns.length}
                    className="h-24 text-center"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {enablePagination && (
        <div className="flex items-center justify-between px-4 py-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {table.getFilteredSelectedRowModel()?.rows?.length || 0} of{" "}
            {rows.length} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor={rowsPerPageId} className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
                disabled={loading}
              >
                <SelectTrigger size="sm" className="w-20" id={rowsPerPageId}>
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {pageSizeOptions.map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={loading || !table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={loading || !table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={loading || !table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={loading || !table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
