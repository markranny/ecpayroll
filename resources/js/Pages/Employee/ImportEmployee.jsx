import React, { useState, useCallback } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileSpreadsheet, Download, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const Loader = () => (
  <div className="animate-spin h-5 w-5">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);

const EmployeeImport = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState(null);

  const resetState = () => {
    setFile(null);
    setPreview([]);
    setError('');
    setImportResult(null);
  };

  const handleFileChange = useCallback(async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Please upload only Excel files (.xlsx or .xls)');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size should not exceed 5MB');
      return;
    }

    setFile(selectedFile);
    setError('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        
        // Read with full options for better handling of different cell types
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true,    // Properly handle dates
          cellNF: true,       // Number formats
          cellText: false     // Don't force text
        });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Set empty cell handling to empty string instead of undefined
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: null,   // Use null for empty cells
          blankrows: false // Skip entirely blank rows
        });
        
        // Filter out completely empty rows
        const nonEmptyRows = jsonData.filter(row => 
          row.some(cell => cell !== null && cell !== '')
        );
        
        // Get first 6 rows for preview
        const previewData = nonEmptyRows.slice(0, 6);
        
        setPreview(previewData);
      } catch (error) {
        console.error("Excel parsing error:", error);
        setError('Error reading file. Please make sure it\'s a valid Excel file.');
        setFile(null);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/employees/import', { 
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        credentials: 'same-origin',
        body: formData,
      });

      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Expected JSON response but received ${contentType}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Import failed');
      }

      setImportResult(data);
      if (data.failures?.length === 0) {
        resetState();
      }
    } catch (error) {
      console.error('Import error:', error);
      setError(error.message || 'Import failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/employees/template/download');
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      // Create a blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employee_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError('Failed to download template');
    }
  };

  // Function to safely render cell content
  const renderCellContent = (cell) => {
    if (cell === null || cell === undefined) {
      return '';
    }
    
    // Handle dates properly
    if (cell instanceof Date) {
      return cell.toLocaleDateString();
    }
    
    // Convert to string for rendering
    return String(cell);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Import Employees</CardTitle>
        <p className="text-gray-600">Upload your Excel file containing employee details.</p>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          <Button
            onClick={downloadTemplate}
            variant="outline"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Import Template
          </Button>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              accept=".xlsx,.xls"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <UploadCloud className="h-12 w-12 text-gray-400 mb-4" />
              <span className="text-gray-600 text-center">
                {file ? (
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    {file.name}
                  </div>
                ) : (
                  'Drop your Excel file here or click to browse'
                )}
              </span>
            </label>
          </div>

          {preview.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {preview[0].map((header, index) => (
                        <th
                          key={index}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {renderCellContent(header)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.slice(1).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                          >
                            {renderCellContent(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {importResult && (
            <Alert variant={importResult.failures?.length === 0 ? "success" : "warning"}>
              <AlertTitle>Import Results</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p>Successfully imported: {importResult.successful} records</p>
                  {importResult.failures?.length > 0 && (
                    <>
                      <p>Failed imports: {importResult.failures.length}</p>
                      <div className="mt-2 max-h-40 overflow-y-auto">
                        {importResult.failures.map((failure, index) => (
                          <div key={index} className="text-sm text-red-600">
                            Row {failure.row}: {failure.errors.join(", ")}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader />
                <span className="ml-2">Importing...</span>
              </>
            ) : (
              'Upload and Import'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeImport;