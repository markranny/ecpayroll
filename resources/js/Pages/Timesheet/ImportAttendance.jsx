import React, { useState, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
// Import papaparse directly without using named import
import papaparse from 'papaparse';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    UploadCloud, 
    FileSpreadsheet, 
    Download, 
    AlertCircle,
    CheckCircle2,
    XCircle,
    Clock 
} from 'lucide-react';

// Create an alias for papaparse to use as Papa
const Papa = papaparse;

// Loader component for showing during import process
const Loader = () => (
    <div className="animate-spin h-5 w-5">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const ImportAttendance = () => {
    const { auth } = usePage().props;
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [importResult, setImportResult] = useState(null);
    const [validationStatus, setValidationStatus] = useState(null);

    // Column mappings matching the template in the image
    const requiredColumns = [
        'employee_no',
        'date',
        'day',
        'in',
        'out',
        'in2',
        'out2',
        'next_day',
        'hours_work'
    ];

    const resetState = () => {
        setFile(null);
        setPreview([]);
        setError('');
        setImportResult(null);
        setValidationStatus(null);
    };

    // Enhanced formatDate function for better Excel date handling
    const formatDate = (date) => {
        if (!date) return '';
        try {
            // Check for MM/DD/YYYY format (common in the template)
            if (typeof date === 'string' && date.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                const parts = date.split('/');
                if (parts.length === 3) {
                    const month = String(parseInt(parts[0], 10)).padStart(2, '0');
                    const day = String(parseInt(parts[1], 10)).padStart(2, '0');
                    const year = parts[2];
                    return `${year}-${month}-${day}`;
                }
            }
            
            // Handle Excel serial date numbers
            if (typeof date === 'number') {
                // Excel dates start from December 30, 1899
                const excelEpoch = new Date(1899, 11, 30);
                const millisecondsPerDay = 24 * 60 * 60 * 1000;
                const dateObj = new Date(excelEpoch.getTime() + date * millisecondsPerDay);
                
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            
            // Handle string dates in various formats
            if (typeof date === 'string') {
                // Handle Excel's short date format (e.g., "16-Jan")
                if (date.match(/^\d{1,2}[-\/][a-zA-Z]{3,}$/)) {
                    const [day, monthStr] = date.split(/[-\/]/);
                    const monthNames = {
                        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, 
                        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
                    };
                    const monthIndex = monthNames[monthStr.toLowerCase().substr(0, 3)];
                    const currentYear = new Date().getFullYear();
                    
                    const dateObj = new Date(currentYear, monthIndex, parseInt(day, 10));
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const dayFormatted = String(dateObj.getDate()).padStart(2, '0');
                    return `${year}-${month}-${dayFormatted}`;
                }
                
                // Try to parse other common date formats
                const d = new Date(date);
                if (!isNaN(d.getTime())) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            }
            
            // Return original value if we can't parse it
            return date;
        } catch {
            return date;
        }
    };

    // Enhanced formatTime function for Excel time values
    const formatTime = (time) => {
        if (!time) return '';
        
        // Check for empty time values
        if (time === 0 || time === '0' || time === '0:00' || 
            time === '00:00' || time === '0:00:00' || time === '00:00:00') {
            return '';
        }
        
        try {
            // Handle Excel time (decimal)
            if (typeof time === 'number') {
                // Ignore values too small (close to zero)
                if (Math.abs(time) < 0.0001) return '';
                
                const totalSeconds = Math.round(time * 86400);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const period = hours >= 12 ? 'PM' : 'AM';
                const formattedHours = hours % 12 || 12;
                return `${String(formattedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
            }

            // For string values already in time format
            if (typeof time === 'string') {
                // Check if it's already in a well-known format like "HH:MM AM/PM"
                if (/^\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)$/i.test(time)) {
                    return time;
                }
                
                // Check for 24-hour format
                if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(time)) {
                    const [hours, minutes] = time.split(':').map(Number);
                    const period = hours >= 12 ? 'PM' : 'AM';
                    const formattedHours = hours % 12 || 12;
                    return `${String(formattedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
                }
                
                // Try to parse as time
                try {
                    const d = new Date(`2000-01-01 ${time}`);
                    if (!isNaN(d.getTime())) {
                        const hours = d.getHours();
                        const minutes = d.getMinutes();
                        const period = hours >= 12 ? 'PM' : 'AM';
                        const formattedHours = hours % 12 || 12;
                        return `${String(formattedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
                    }
                } catch {
                    // Fall through to return original if parsing fails
                }
            }
            
            // Return original value if we can't parse it
            return time;
        } catch {
            return time;
        }
    };

    // Format numeric values (like hours worked) to 2 decimal places
    const formatNumeric = (value) => {
        if (value === null || value === undefined || value === '') return '';
        const numValue = parseFloat(value);
        return isNaN(numValue) ? value : numValue.toFixed(2);
    };

    // Enhanced validateHeaders function for the specific template format
    const validateHeaders = (headers) => {
        // Normalize headers by removing whitespace and converting to lowercase
        const normalizedHeaders = headers.map(h => 
            typeof h === 'string' ? h.toLowerCase().trim().replace(/\s+/g, '_').replace(/\.+$/, '') : ''
        );
        
        console.log('Original headers:', headers);
        console.log('Normalized headers:', normalizedHeaders);
        
        // The specific format from the excel template screenshot
        const expectedFormats = [
            // First format - from the screenshot
            ['employeedate', 'day', 'in', 'out', 'in', 'out', 'next_day', 'hours_work'],
            // Alternative format with separate employee/date
            ['employee', 'date', 'day', 'in', 'out', 'in', 'out', 'next_day', 'hours_work'],
            // Another common format 
            ['employee_no', 'date', 'day', 'time_in', 'time_out', 'break_in', 'break_out', 'next_day', 'hours']
        ];
        
        // Check if our normalized headers match any expected format
        // We don't need exact matches, just need to make sure we have the essential columns
        const hasEmployeeField = normalizedHeaders.some(h => 
            h === 'employee' || h === 'employeedate' || h === 'employee_no' || h === 'idno' || h === 'id'
        );
        
        const hasDateField = normalizedHeaders.some(h => 
            h === 'date' || h === 'employeedate'
        );
        
        // Check for IN/OUT columns - specifically looking for the pattern in the screenshot
        let inColumns = normalizedHeaders.filter(h => h === 'in');
        let outColumns = normalizedHeaders.filter(h => h === 'out');
        
        // Alternative check for time_in/time_out
        if (inColumns.length === 0) {
            inColumns = normalizedHeaders.filter(h => h === 'time_in' || h === 'timein');
        }
        
        if (outColumns.length === 0) {
            outColumns = normalizedHeaders.filter(h => h === 'time_out' || h === 'timeout');
        }
        
        const hasNextDayField = normalizedHeaders.some(h => 
            h === 'next_day' || h === 'nextday' || h === 'next'
        );
        
        const hasHoursField = normalizedHeaders.some(h => 
            h === 'hours_work' || h === 'hours' || h === 'work_hours' || h === 'hours_worked'
        );
        
        // Build list of missing required columns
        const missingColumns = [];
        if (!hasEmployeeField) missingColumns.push('employee_no');
        if (!hasDateField) missingColumns.push('date');
        if (inColumns.length === 0) missingColumns.push('in');
        if (outColumns.length === 0) missingColumns.push('out');
        
        // Determine if this is a valid format - we need at least employee, date, and one in/out pair
        const isValidFormat = hasEmployeeField && hasDateField && inColumns.length > 0 && outColumns.length > 0;
        
        return {
            valid: isValidFormat,
            missingColumns: missingColumns,
            format: 'specific_template'
        };
    };

    const formatRowData = (row, headers) => {
        // Normalize headers to help with identifying column types
        const normalizedHeaders = headers.map(h => 
            typeof h === 'string' ? h.toLowerCase().trim().replace(/\s+/g, '_').replace(/\.+$/, '') : ''
        );
        
        return row.map((cell, index) => {
            const header = normalizedHeaders[index];
            if (!header) return cell;
            
            // Improved empty value handling for all fields
            const isEmpty = cell === null || cell === undefined || cell === '' || 
                            cell === 0 || cell === "0" || cell === 0.0;
                            
            // For empty cells, return empty string
            if (isEmpty) {
                return '';
            }
            
            // Try to determine column type by header name first, then by position if needed
            const isEmployeeCol = header === 'employee' || header === 'employeedate' || 
                                  header === 'employee_no' || header === 'idno' || 
                                  index === 0; // First column is typically employee
                                  
            const isDateCol = header === 'date' || header === 'employeedate' || index === 1; // Second col often date
            const isDayCol = header === 'day' || index === 2; // Third col is day
            const isInCol = header === 'in' || header === 'time_in';
            const isOutCol = header === 'out' || header === 'time_out';
            const isNextDayCol = header === 'next_day' || header === 'nextday';
            const isHoursCol = header === 'hours_work' || header === 'hours';
    
            if (isDateCol) {
                return formatDate(cell);
            } else if (isNextDayCol) {
                // Special handling for next_day column to ensure it doesn't display incorrectly
                if (isEmpty || cell === '0:00' || cell === '00:00' || 
                    (typeof cell === 'string' && cell.trim() === '')) {
                    return '';
                }
                return formatTime(cell);
            } else if (isInCol || isOutCol) {
                // Catch any 0:00 or 00:00 values that might not be caught by isEmpty
                if (cell === '0:00' || cell === '00:00') {
                    return '';
                }
                return formatTime(cell);
            } else if (isHoursCol) {
                // For hours, return empty string if it's a zero value in non-working days
                if (cell === 0 || cell === "0" || cell === 0.0) {
                    return '';
                }
                return formatNumeric(cell);
            } else if (isEmployeeCol) {
                // For employee ID, return as is 
                return cell;
            } else if (isDayCol) {
                // For day column, just return as is
                return cell;
            } else {
                return cell;
            }
        });
    };

    // Handle file upload
    const handleFileChange = useCallback(async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];

        // Check file type
        if (!allowedTypes.includes(selectedFile.type) && 
            !selectedFile.name.endsWith('.csv') && 
            !selectedFile.name.endsWith('.xlsx') && 
            !selectedFile.name.endsWith('.xls')) {
            setError('Please upload only Excel or CSV files (.xlsx, .xls, .csv)');
            setValidationStatus('error');
            return;
        }

        // Check file size
        if (selectedFile.size > 10 * 1024 * 1024) {  
            setError('File size should not exceed 10MB');
            setValidationStatus('error');
            return;
        }

        setFile(selectedFile);
        setError('');
        setValidationStatus('validating');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                let jsonData;
                
                // Parse based on file type
                if (selectedFile.name.endsWith('.csv')) {
                    // For CSV files
                    const csvText = e.target.result;
                    const result = Papa.parse(csvText, { 
                        header: false,
                        skipEmptyLines: true
                    });
                    jsonData = result.data;
                } else {
                    // For Excel files - optimized for the specific template
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { 
                        type: 'array', 
                        cellDates: true,
                        dateNF: 'yyyy-mm-dd' 
                    });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // Set raw to false to get string values, which helps with date/time formatting
                    jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1, 
                        raw: false,
                        defval: ''
                    });
                }
                
                // Validate the data
                if (!jsonData[0] || jsonData[0].length === 0) {
                    throw new Error('File appears to be empty');
                }

                const headerValidation = validateHeaders(jsonData[0]);
                
                if (!headerValidation.valid) {
                    setError(`Missing required columns: ${headerValidation.missingColumns.join(', ')}`);
                    setValidationStatus('error');
                    setFile(null);
                    return;
                }

                // Filter out empty rows and format the data
                const previewData = jsonData
                    .filter((row, index) => {
                        if (index === 0) return true; // Always keep the header row
                        // Check if row has any non-empty values (excluding first column)
                        return row.some((cell, cellIndex) => 
                            cellIndex > 0 && cell !== null && cell !== undefined && cell !== ''
                        );
                    })
                    .slice(0, 6) // Take up to 6 rows (including header)
                    .map((row, index) => 
                        index === 0 ? row : formatRowData(row, jsonData[0])
                    );
                
                setPreview(previewData);
                setValidationStatus('success');
            } catch (error) {
                console.error('Error reading file:', error);
                setError('Error reading file. Please make sure it\'s a valid Excel or CSV file.');
                setValidationStatus('error');
                setFile(null);
            }
        };

        // Read the file as array buffer for Excel files or text for CSV
        if (selectedFile.name.endsWith('.csv')) {
            reader.readAsText(selectedFile);
        } else {
            reader.readAsArrayBuffer(selectedFile);
        }
    }, []);

    // Handle the upload and import process
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
            // Use the correct route URL
            const response = await fetch('/attendance/import', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                credentials: 'same-origin',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.message || 'Import failed');
            }

            setImportResult(data);
        } catch (error) {
            console.error('Import error:', error);
            setError(error.message || 'Import failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    // Update the downloadTemplate function to use the correct URL
    const downloadTemplate = async () => {
        try {
            // Use the correct route URL
            window.location.href = '/attendance/template/download';
        } catch (error) {
            console.error('Download error:', error);
            setError('Failed to download template: ' + error.message);
        }
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Import Attendance Records" />
            <div className="flex min-h-screen bg-gray-50/50">
                <Sidebar />
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    Import Attendance Records
                                </h1>
                                <p className="text-gray-600">
                                    Bulk import employee attendance data using our Excel template.
                                </p>
                            </div>
                        </div>
                        
                        <Card className="max-w-4xl mx-auto">
                            <CardHeader>
                                <CardTitle>Import Attendance</CardTitle>
                                <p className="text-gray-600">
                                    Upload your Excel file containing attendance records with the format matching the sample template.
                                </p>
                            </CardHeader>

                            <CardContent>
                                <div className="space-y-6">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h3 className="text-sm font-medium text-blue-800 mb-2">Expected Format:</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <div className="col-span-3 text-sm text-blue-700 mb-2">
                                                Your Excel file should have these columns:
                                            </div>
                                            <div className="flex items-center text-sm text-blue-700">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
                                                Employee No.
                                            </div>
                                            <div className="flex items-center text-sm text-blue-700">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
                                                Date (MM/DD/YYYY)
                                            </div>
                                            <div className="flex items-center text-sm text-blue-700">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
                                                Day
                                            </div>
                                            <div className="flex items-center text-sm text-blue-700">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
                                                IN (Time In)
                                            </div>
                                            <div className="flex items-center text-sm text-blue-700">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
                                                OUT (Time Out)
                                            </div>
                                            <div className="flex items-center text-sm text-blue-700">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
                                                IN (Break In)
                                            </div>
                                            <div className="flex items-center text-sm text-blue-700">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
                                                OUT (Break Out)
                                            </div>
                                            <div className="flex items-center text-sm text-blue-700">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
                                                Next day
                                            </div>
                                            <div className="flex items-center text-sm text-blue-700">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
                                                Hours Work
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={downloadTemplate}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Attendance Import Template
                                    </Button>

                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="file-upload"
                                            accept=".xlsx,.xls,.csv"
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className="cursor-pointer flex flex-col items-center"
                                        >
                                            {validationStatus === 'success' ? (
                                                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                                            ) : validationStatus === 'error' ? (
                                                <XCircle className="h-12 w-12 text-red-500 mb-4" />
                                            ) : (
                                                <UploadCloud className="h-12 w-12 text-gray-400 mb-4" />
                                            )}
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
                                                                    {header}
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
                                                                        {/* Make sure to render empty string for null/undefined values */}
                                                                        {cell !== null && cell !== undefined ? cell : ''}
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
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    {importResult && (
                                        <Alert variant={importResult.failures?.length === 0 ? "default" : "warning"}>
                                            <AlertDescription>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        <span className="font-medium">
                                                            {importResult.message}
                                                        </span>
                                                    </div>
                                                    {importResult.successful > 0 && (
                                                        <div className="text-sm text-green-600">
                                                            Total records processed: {importResult.total_processed}
                                                        </div>
                                                    )}
                                                    {importResult.failures?.length > 0 && (
                                                        <>
                                                            <div className="flex items-center gap-2 mt-4">
                                                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                                                <span className="font-medium">Failed Imports</span>
                                                            </div>
                                                            <div className="mt-2 max-h-40 overflow-y-auto border-l-2 border-amber-200 pl-4">
                                                                {importResult.failures.map((failure, index) => (
                                                                    <div key={index} className="text-sm text-amber-600 mb-1">
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
                                        disabled={!file || uploading || validationStatus !== 'success'}
                                        className="w-full"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader />
                                                <span className="ml-2">Importing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Clock className="w-4 h-4 mr-2" />
                                                Upload and Import Attendance
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
};

export default ImportAttendance;