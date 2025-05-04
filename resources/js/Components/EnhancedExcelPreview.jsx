import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Enhanced Excel Preview Component
 * Features:
 * - Horizontal scrolling for wide tables
 * - Column width configuration
 * - Pagination for large datasets
 * - Responsive design
 */
const EnhancedExcelPreview = ({ data, maxHeight = '400px' }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!data || data.length === 0) {
    return null;
  }

  const headers = data[0] || [];
  const rows = data.slice(1);

  // Pagination
  const totalPages = Math.ceil(rows.length / rowsPerPage);
  const paginatedRows = rows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handlePreviousPage = () => {
    setPage(Math.max(0, page - 1));
  };

  const handleNextPage = () => {
    setPage(Math.min(totalPages - 1, page + 1));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-4' : ''}`}>
      <div className="flex justify-between items-center bg-gray-50 p-2 border-b">
        <div className="text-sm font-medium">Preview ({rows.length} rows)</div>
        <div className="flex items-center gap-2">
          <select 
            className="text-xs border rounded px-1 py-0.5"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(0);
            }}
          >
            <option value={5}>5 rows</option>
            <option value={10}>10 rows</option>
            <option value={20}>20 rows</option>
          </select>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleFullscreen}
            className="text-xs"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
        </div>
      </div>

      <div 
        className="overflow-x-auto" 
        style={{ maxHeight: isFullscreen ? 'calc(100vh - 120px)' : maxHeight }}
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  style={{ minWidth: '150px' }}
                >
                  {header || '(Empty)'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedRows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {headers.map((_, cellIndex) => {
                  const cell = row[cellIndex];
                  return (
                    <td
                      key={cellIndex}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 overflow-hidden text-ellipsis"
                      style={{ maxWidth: '200px' }}
                    >
                      {cell !== undefined && cell !== '' ? cell : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border-t">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{page * rowsPerPage + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min((page + 1) * rowsPerPage, rows.length)}
                </span>{' '}
                of <span className="font-medium">{rows.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={page === 0}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Previous
                </Button>
                {[...Array(totalPages)].map((_, idx) => (
                  <Button
                    key={idx}
                    variant={idx === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(idx)}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium"
                  >
                    {idx + 1}
                  </Button>
                )).slice(Math.max(0, page - 1), Math.min(totalPages, page + 3))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={page >= totalPages - 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Next
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedExcelPreview;