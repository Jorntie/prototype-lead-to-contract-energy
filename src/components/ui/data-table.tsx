"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  searchColumn?: string;
  enableSelection?: boolean;
  onRowClick?: (row: TData) => void;
  pageSize?: number;
  bulkActions?: (selectedRows: TData[]) => React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Search...",
  searchColumn,
  enableSelection = false,
  onRowClick,
  pageSize = 50,
  bulkActions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const allColumns = React.useMemo(() => {
    if (!enableSelection) return columns;
    const selectColumn: ColumnDef<TData, TValue> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      size: 40,
    };
    return [selectColumn, ...columns];
  }, [columns, enableSelection]);

  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting,
      columnFilters,
      globalFilter: searchColumn ? undefined : globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: searchColumn ? undefined : setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize },
    },
    enableRowSelection: enableSelection,
  });

  const filterValue = searchColumn
    ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""
    : globalFilter;

  const handleFilterChange = (value: string) => {
    if (searchColumn) {
      table.getColumn(searchColumn)?.setFilterValue(value);
    } else {
      setGlobalFilter(value);
    }
  };

  const selectedRows = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
  const totalRows = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize: currentPageSize } = table.getState().pagination;
  const startRow = totalRows === 0 ? 0 : pageIndex * currentPageSize + 1;
  const endRow = Math.min((pageIndex + 1) * currentPageSize, totalRows);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder={searchPlaceholder}
            value={filterValue}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  className={cn(
                    header.column.getCanSort() && "cursor-pointer select-none"
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {header.isPlaceholder ? null : (
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="ml-1">
                          {header.column.getIsSorted() === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <span className="h-4 w-4 inline-block" />
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn(onRowClick && "cursor-pointer")}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={allColumns.length} className="h-24 text-center text-[var(--muted-foreground)]">
                No results found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-[var(--muted-foreground)]">
          {enableSelection && selectedRows.length > 0 && (
            <span className="mr-4">{selectedRows.length} selected</span>
          )}
          Showing {startRow}-{endRow} of {totalRows}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {enableSelection && selectedRows.length > 0 && bulkActions && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-[var(--background)] p-3 shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <span className="text-sm font-medium">
              {selectedRows.length} item{selectedRows.length !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">{bulkActions(selectedRows)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SortableHeader({ label }: { label: string }) {
  return <span>{label}</span>;
}
