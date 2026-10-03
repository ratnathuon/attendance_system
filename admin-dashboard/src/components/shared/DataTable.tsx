"use client";

import React from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  currentPage?: number;
  lastPage?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  actionButton?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  filterButton?: React.ReactNode;
  filterPanel?: React.ReactNode;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = "Search records...",
  searchValue,
  onSearchChange,
  currentPage = 1,
  lastPage = 1,
  total,
  onPageChange,
  emptyMessage = "No records found.",
  actionButton,
  toolbarRight,
  filterButton,
  filterPanel,
}: DataTableProps<T>) {
  return (
    <div className="w-full space-y-4">
      {/* Table Toolbar */}
      {(onSearchChange !== undefined || toolbarRight || filterButton || actionButton) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {onSearchChange !== undefined && (
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
              />
            </div>
          )}

          {(toolbarRight || filterButton || actionButton) && (
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
              {toolbarRight}
              {filterButton}
              {actionButton}
            </div>
          )}
        </div>
      )}

      {filterPanel && <div>{filterPanel}</div>}

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className={`px-6 py-4 ${col.className || ""}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-16 text-center">
                    <div className="inline-flex items-center gap-3 text-slate-500">
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-16 text-center text-slate-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((item, rowIdx) => (
                  <tr
                    key={item.id ? String(item.id) : rowIdx}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={colIdx}
                        className={`px-6 py-4 ${col.className || ""}`}
                      >
                        {col.cell
                          ? col.cell(item)
                          : col.accessorKey
                            ? String(item[col.accessorKey] ?? "-")
                            : "-"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {(lastPage > 1 || total !== undefined) && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-white">
            <div>
              {total !== undefined ? (
                <span>
                  Showing <span className="text-slate-900 font-semibold">{data.length}</span> of{" "}
                  <span className="text-slate-900 font-semibold">{total}</span> records
                </span>
              ) : (
                <span>Page {currentPage} of {lastPage}</span>
              )}
            </div>

            {onPageChange && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isLoading}
                  onClick={() => onPageChange(currentPage - 1)}
                  className="px-2.5 py-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-2 font-medium text-slate-700">
                  {currentPage} / {lastPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= lastPage || isLoading}
                  onClick={() => onPageChange(currentPage + 1)}
                  className="px-2.5 py-1"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
