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
}: DataTableProps<T>) {
  return (
    <div className="w-full space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {onSearchChange !== undefined ? (
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        ) : (
          <div />
        )}

        {actionButton && <div>{actionButton}</div>}
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800/80">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className={`px-6 py-4 ${col.className || ""}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-16 text-center">
                    <div className="inline-flex items-center gap-3 text-slate-400">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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
                    className="hover:bg-slate-800/40 transition-colors"
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
          <div className="px-6 py-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div>
              {total !== undefined ? (
                <span>
                  Showing <span className="text-white font-medium">{data.length}</span> of{" "}
                  <span className="text-white font-medium">{total}</span> records
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
                <span className="px-2 font-medium text-slate-300">
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
