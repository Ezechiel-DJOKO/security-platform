// src/components/common/DataTable.tsx
"use client";

import { ReactNode, useState } from "react";
import { ArrowUpDown } from "lucide-react";

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => ReactNode);
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export function DataTable<T>({ columns, data, emptyMessage = "Aucune donnée trouvée" }: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: "asc" | "desc" } | null>(null);

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const { key, direction } = sortConfig;
    const aValue = a[key];
    const bValue = b[key];

    if (aValue < bValue) return direction === "asc" ? -1 : 1;
    if (aValue > bValue) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof T) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-950">
            {columns.map((col, i) => (
              <th 
                key={i} 
                className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-200 transition-colors"
                onClick={() => col.sortable && typeof col.accessor === 'string' && handleSort(col.accessor as keyof T)}
              >
                <div className="flex items-center gap-2">
                  {col.header}
                  {col.sortable && <ArrowUpDown className="w-4 h-4" />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {sortedData.length > 0 ? (
            sortedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-900/50 transition-colors">
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 text-sm">
                    {typeof col.accessor === "function" 
                      ? col.accessor(row) 
                      : String(row[col.accessor])}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-6 py-16 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}