import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CustomProgress = ({ value }) => (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-in-out"
            style={{ width: `${value}%` }}
        />
    </div>
);

const Card = ({ children }) => (
    <div className="bg-white rounded-lg shadow-md">
        {children}
    </div>
);

const AttendanceManagement = () => {
    const { auth } = usePage().props;
    const [deviceIp, setDeviceIp] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [attendanceData, setAttendanceData] = useState([]);
    const [csrfToken, setCsrfToken] = useState('');

    // Get CSRF token from cookie
    const getCsrfToken = () => {
        const name = 'XSRF-TOKEN=';
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookieArray = decodedCookie.split(';');
        for(let i = 0; i < cookieArray.length; i++) {
            let cookie = cookieArray[i].trim();
            if (cookie.indexOf(name) === 0) {
                return cookie.substring(name.length, cookie.length);
            }
        }
        return '';
    };

    useEffect(() => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 2);
        
        setEndDate(end.toISOString().split('T')[0]);
        setStartDate(start.toISOString().split('T')[0]);
        
        const token = getCsrfToken();
        if (token) {
            setCsrfToken(token);
        } else {
            const metaTag = document.querySelector('meta[name="csrf-token"]');
            if (metaTag) {
                setCsrfToken(metaTag.getAttribute('content'));
            }
        }
    }, []);

    const validateDateRange = () => {
        if (!startDate || !endDate) {
            setError('Both start and end dates are required');
            return false;
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (end < start) {
            setError('End date must be after start date');
            return false;
        }
        
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 62) {
            setError('Date range cannot exceed 2 months');
            return false;
        }
        
        return true;
    };

    const fetchBiometricLogs = async () => {
        if (!deviceIp) {
            setError('Device IP is required');
            return;
        }

        if (!csrfToken) {
            setError('CSRF token not available');
            return;
        }

        if (!validateDateRange()) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');
        setProgress(0);
        setAttendanceData([]);
        
        try {
            const response = await fetch('/biometric/fetch-logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': csrfToken
                },
                body: JSON.stringify({ 
                    device_ip: deviceIp,
                    start_date: startDate,
                    end_date: endDate
                }),
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch logs');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.progress) {
                            setProgress(data.progress.percentage);
                        }
                        if (data.data) {
                            setAttendanceData(prevData => [...prevData, ...data.data]);
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
                }
            }

            setSuccess('Logs fetched successfully');
        } catch (err) {
            setError(err.message || 'Failed to fetch biometric logs');
            setAttendanceData([]);
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return '-';
        return new Date(dateTimeStr).toLocaleString();
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Attendance Management" />
            <div className="flex min-h-screen bg-gray-50/50">
                <Sidebar />
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Header Section */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    Attendance Management
                                </h1>
                                <p className="text-gray-600">
                                    Monitor and manage employee attendance records.
                                </p>
                            </div>
                        </div>

                        {success && (
                            <Alert className="mb-4">
                                <AlertDescription>{success}</AlertDescription>
                            </Alert>
                        )}

                        {error && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Card>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="deviceIp" className="block text-sm font-medium mb-1 text-gray-700">
                                                Device IP
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    id="deviceIp"
                                                    type="text"
                                                    value={deviceIp}
                                                    onChange={(e) => setDeviceIp(e.target.value)}
                                                    placeholder="192.168.1.100"
                                                    className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    pattern="\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}"
                                                />
                                                <button 
                                                    onClick={fetchBiometricLogs}
                                                    disabled={!deviceIp || loading}
                                                    className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-blue-300 hover:bg-blue-600 transition-colors flex items-center gap-2"
                                                >
                                                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                                    {loading ? 'Fetching...' : 'Fetch Logs'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label htmlFor="startDate" className="block text-sm font-medium mb-1 text-gray-700">
                                                    Start Date
                                                </label>
                                                <input
                                                    id="startDate"
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    max={endDate || undefined}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label htmlFor="endDate" className="block text-sm font-medium mb-1 text-gray-700">
                                                    End Date
                                                </label>
                                                <input
                                                    id="endDate"
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    min={startDate || undefined}
                                                />
                                            </div>
                                        </div>

                                        {loading && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm text-gray-600">
                                                    <span>Fetching attendance data...</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <CustomProgress value={progress} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Employee ID
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Date
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Time In
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Break In
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Break Out
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Time Out
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Night Shift
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Next Day Timeout
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {attendanceData.length > 0 ? (
                                                attendanceData.map((record, index) => (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.idno}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {new Date(record.attendance_date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDateTime(record.time_in)}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDateTime(record.break_in)}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDateTime(record.break_out)}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDateTime(record.time_out)}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            <span className={`px-2 py-1 rounded-full text-xs ${record.is_nightshift ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                {record.is_nightshift ? 'Yes' : 'No'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {formatDateTime(record.next_day_timeout)}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                                                        No attendance records found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
};

export default AttendanceManagement;