import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const AttendanceManagement = () => {
    const [deviceIp, setDeviceIp] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const validateDateRange = () => {
        if (!startDate || !endDate) return false;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) {
            setError('End date must be after start date');
            return false;
        }
        
        // Limit range to 31 days
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 31) {
            setError('Date range cannot exceed 31 days');
            return false;
        }
        
        return true;
    };

    const fetchBiometricLogs = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        
        try {
            const response = await fetch('/biometric/fetch-logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ device_ip: deviceIp }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch logs');
            }
            
            setSuccess('Logs fetched successfully');
            await fetchAttendanceReport();
        } catch (err) {
            setError('Failed to fetch biometric logs: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceReport = async () => {
        if (!validateDateRange()) return;
        
        setLoading(true);
        setError('');
        
        try {
            const response = await fetch(
                `/attendance/report?start_date=${startDate}&end_date=${endDate}`
            );
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch report');
            }
            
            setAttendance(data);
        } catch (err) {
            setError('Failed to fetch attendance report: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateTime) => {
        if (!dateTime) return '-';
        return new Date(dateTime).toLocaleString();
    };

    return (
        <Card className="max-w-7xl mx-auto">
            <CardHeader>
                <CardTitle>Attendance Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Device IP</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={deviceIp}
                                    onChange={(e) => setDeviceIp(e.target.value)}
                                    placeholder="192.168.1.100"
                                    className="flex-1 px-3 py-2 border rounded-md"
                                    pattern="\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}"
                                />
                                <button 
                                    onClick={fetchBiometricLogs}
                                    disabled={!deviceIp || loading}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-blue-300 flex items-center gap-2"
                                >
                                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {loading ? 'Fetching...' : 'Fetch Logs'}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md"
                                    max={endDate}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md"
                                    min={startDate}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={fetchAttendanceReport}
                            disabled={!startDate || !endDate || loading}
                            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-blue-300 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Generate Report
                        </button>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="bg-green-50 border-green-200">
                        <AlertDescription className="text-green-700">{success}</AlertDescription>
                    </Alert>
                )}

                <div className="overflow-x-auto rounded-lg border">
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
                            {attendance.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                                        No attendance records found
                                    </td>
                                </tr>
                            ) : (
                                attendance.map((record) => (
                                    <tr key={`${record.idno}-${record.attendance_date}`} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.idno}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.attendance_date}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDateTime(record.time_in)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDateTime(record.break_in)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDateTime(record.break_out)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDateTime(record.time_out)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.is_nightshift ? 'Yes' : 'No'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDateTime(record.next_day_timeout)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

export default AttendanceManagement;