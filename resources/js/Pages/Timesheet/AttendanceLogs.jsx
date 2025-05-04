import React, { useState, useEffect, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import { Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import AttendanceModal from './AttendanceModal';

const AttendanceLogs = () => {
    const { auth, attendances: initialAttendances = [], error: serverError, debug = {} } = usePage().props;
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('view');
    const [message, setMessage] = useState('');
    const [error, setError] = useState(serverError || '');

    // Define filteredAttendances before any useEffect that uses it
    const filteredAttendances = useMemo(() => {
        return initialAttendances.filter(attendance => {
            const matchesSearch = !searchTerm || 
                String(attendance.idno).toLowerCase().includes(searchTerm.toLowerCase()) ||
                (attendance.employee_name && 
                 attendance.employee_name.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesDate = !dateFilter || 
                (attendance.attendance_date && attendance.attendance_date.includes(dateFilter));

            return matchesSearch && matchesDate;
        });
    }, [initialAttendances, searchTerm, dateFilter]);

    // Add immediate debugging on mount
    useEffect(() => {
        console.log('Component Mounted');
        console.log('Initial Props:', {
            initialAttendances,
            auth,
            serverError,
            debug
        });
    }, []);

    // Add debugging for filtered results
    useEffect(() => {
        console.log('Filtered Attendances:', filteredAttendances);
        console.log('Search Term:', searchTerm);
        console.log('Date Filter:', dateFilter);
    }, [filteredAttendances, searchTerm, dateFilter]);

    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return '-';
        try {
            return new Date(dateTimeStr).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        } catch {
            return '-';
        }
    };

    const handleSave = async (updatedAttendance) => {
        try {
            setError('');
            setMessage('');
            console.log('Saving attendance:', updatedAttendance);
            
            await axios.put(`/attendance-logs/${updatedAttendance.id}`, updatedAttendance);
            setMessage('Attendance updated successfully');
            setModalOpen(false);
            
            // Refresh the page
            window.location.reload();
        } catch (error) {
            console.error('Save error:', error);
            setError('Error updating attendance: ' + (error.response?.data?.message || error.message));
        }
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedAttendance(null);
        setMessage('');
        setError('');
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Attendance Logs" />
            <div className="flex min-h-screen bg-gray-50/50">
                <Sidebar />
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        {message && (
                            <Alert className="mb-4">
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                        )}
                        
                        {error && (
                            <Alert className="mb-4" variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    Employee Attendance Checker
                                </h1>
                                <p className="text-gray-600">
                                    Easily view and manage employee attendance records.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex gap-4 mb-6">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <input
                                        type="text"
                                        placeholder="Search by Employee ID or Name..."
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="w-48">
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                {filteredAttendances.length > 0 ? (
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID No.</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Break In</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Break Out</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredAttendances.map((attendance) => (
                                                <tr key={attendance.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">{attendance.idno}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{attendance.employee_name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{attendance.department}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{attendance.line}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{attendance.attendance_date}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{formatDateTime(attendance.time_in)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{formatDateTime(attendance.time_out)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{formatDateTime(attendance.break_in)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{formatDateTime(attendance.break_out)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <Button
                                                            onClick={() => {
                                                                setSelectedAttendance(attendance);
                                                                setModalMode('edit');
                                                                setModalOpen(true);
                                                            }}
                                                            className="text-sm"
                                                            variant="outline"
                                                        >
                                                            Edit
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-gray-600">No attendance records found.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <AttendanceModal
                            isOpen={modalOpen}
                            onClose={closeModal}
                            attendance={selectedAttendance}
                            mode={modalMode}
                            onSave={handleSave}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
};

export default AttendanceLogs;