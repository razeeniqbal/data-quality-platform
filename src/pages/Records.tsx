import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Search } from 'lucide-react';
import type { ColumnValueFilters } from './ProjectView';

interface RecordsProps {
  projectId: string;
  datasetId: string | null;
  columnValueFilters?: ColumnValueFilters;
  onDataLoaded?: (rows: Record<string, any>[], columns: string[]) => void;
}

export default function Records({ projectId, datasetId, columnValueFilters, onDataLoaded }: RecordsProps) {
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (datasetId) {
      loadRecords();
    } else {
      setRecords([]);
      setColumns([]);
      setLoading(false);
    }
  }, [datasetId]);

  async function loadRecords() {
    setLoading(true);
    try {
      const rows = await apiClient.previewDataset(datasetId!, 10000) as Record<string, any>[];
      if (rows && rows.length > 0) {
        const cols = Object.keys(rows[0]);
        setColumns(cols);
        setRecords(rows);
        onDataLoaded?.(rows, cols);
      } else {
        setColumns([]);
        setRecords([]);
        onDataLoaded?.([], []);
      }
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  }

  // Apply sidebar column-value filters + search query
  const filteredRecords = (() => {
    let rows = records;

    // 1. Column value filters from sidebar
    if (columnValueFilters && Object.keys(columnValueFilters).length > 0) {
      rows = rows.filter(row =>
        Object.entries(columnValueFilters).every(([col, allowed]) =>
          allowed.has(String(row[col] ?? ''))
        )
      );
    }

    // 2. Global search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(row =>
        Object.values(row).some(val => String(val ?? '').toLowerCase().includes(q))
      );
    }

    return rows;
  })();

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [columnValueFilters, searchQuery]);

  function exportToCSV() {
    if (columns.length === 0) return;
    const csvContent = [
      columns.join(','),
      ...filteredRecords.map(row =>
        columns.map(col => `"${String(row[col] ?? '').replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `records_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, startIndex + rowsPerPage);

  const activeFilterCount = columnValueFilters ? Object.keys(columnValueFilters).length : 0;

  if (loading) {
    return (
      <div className="text-center py-20 bg-white rounded-lg shadow-md">
        <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Loading records...</p>
      </div>
    );
  }

  if (!datasetId) {
    return (
      <div className="text-center py-20 bg-white rounded-lg shadow-md">
        <Table2Icon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-600 mb-2">No Dataset Selected</h2>
        <p className="text-slate-500">Select a dataset from the left panel, or add a new one using the + button.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {filteredRecords.length.toLocaleString()} of {records.length.toLocaleString()} record{records.length !== 1 ? 's' : ''}
          {activeFilterCount > 0 && (
            <span className="ml-2 text-teal-600 font-medium">· {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active</span>
          )}
        </span>
        <button
          onClick={exportToCSV}
          className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all fields..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currentRecords.map((record, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-50 transition">
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap max-w-[300px] truncate"
                      title={String(record[col] ?? '')}
                    >
                      {String(record[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">
              {activeFilterCount > 0 || searchQuery ? 'No records match the current filters' : 'No records found'}
            </p>
          </div>
        )}

        {filteredRecords.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                Showing {startIndex + 1}–{Math.min(startIndex + rowsPerPage, filteredRecords.length)} of {filteredRecords.length.toLocaleString()}
              </span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button onClick={() => setCurrentPage(1)} disabled={safePage === 1}
                className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition">
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentPage(safePage - 1)} disabled={safePage === 1}
                className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-600 px-4">Page {safePage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(safePage + 1)} disabled={safePage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition">
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Table2Icon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12h-7.5c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125" />
    </svg>
  );
}
