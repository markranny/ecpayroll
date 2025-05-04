import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import Layout from '@/Layouts/AuthenticatedLayout';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
    Calendar, 
    Download, 
    Filter, 
    Search, 
    PenTool, 
    Trash2, 
    FileText, 
    Clock, 
    User 
} from 'lucide-react';

const AttendanceReport = ({ 
    auth, 
    departments = [], 
    employees = [] 
}) => {
    // State management for filtering and data handling
    const [isLoading, setIsLoading] = useState(false);
    const [attendance, setAttendance] = useState([]);
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    // Filter state
    const [filters, setFilters] = useState({
        start_date: '',
        end_date: '',
        department: '',
        employee_id: '',
        search: ''
    });

    // Edit form state
    const [editForm, setEditForm] = useState({
        employee_id: '',
        attendance_date: '',
        time_in: '',
        time_out: '',
        status: 'present',
        remarks: ''
    });

    // Initialize filters with current month
    useEffect(() => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        setFilters(prevFilters => ({
            ...prevFilters,
            start_date: firstDayOfMonth.toISOString().split('T')[0],
            end_date: today.toISOString().split('T')[0]
        }));
    }, []);

    // Fetch attendance data when filters change
    useEffect(() => {
        if (filters.start_date && filters.end_date) {
            fetchAttendanceData();
        }
    }, [filters.start_date, filters.end_date]);

    // Fetch attendance data
    const fetchAttendanceData = () => {
        setIsLoading(true);
        
        // Build query string from filters
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                params.append(key, filters[key]);
            }
        });

        fetch(`${route('attendance.report.data')}?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    setAttendance(data.data);
                } else {
                    toast.error('Failed to load attendance data');
                }
                setIsLoading(false);
            })
            .catch(error => {
                console.error('Error fetching attendance data:', error);
                toast.error('Error loading attendance data');
                setIsLoading(false);
            });
    };

    // Handle filter changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prevFilters => ({
            ...prevFilters,
            [name]: value
        }));
    };

    // Apply filters
    const handleApplyFilters = (e) => {
        e.preventDefault();
        fetchAttendanceData();
    };

    // Reset filters
    const handleResetFilters = () => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        setFilters({
            start_date: firstDayOfMonth.toISOString().split('T')[0],
            end_date: today.toISOString().split('T')[0],
            department: '',
            employee_id: '',
            search: ''
        });
    };

    // Export attendance report
    const handleExportReport = () => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                params.append(key, filters[key]);
            }
        });

        window.location.href = `${route('attendance.report.export')}?${params.toString()}`;
    };

    // Edit attendance record
    const handleEditClick = (record) => {
        setSelectedAttendance(record);
        
        // Format time values
        const timeIn = record.time_in ? 
            new Date(`2000-01-01T${record.time_in}`).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false 
            }) : '';
        
        const timeOut = record.time_out ? 
            new Date(`2000-01-01T${record.time_out}`).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false 
            }) : '';

        setEditForm({
            employee_id: record.employee_id,
            attendance_date: record.attendance_date,
            time_in: timeIn,
            time_out: timeOut,
            status: record.status || 'present',
            remarks: record.remarks || ''
        });

        setShowEditModal(true);
    };

    // Handle edit form changes
    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prevForm => ({
            ...prevForm,
            [name]: value
        }));
    };

    // Submit edit form
    const handleEditSubmit = (e) => {
        e.preventDefault();
        
        fetch(route('attendance.update', selectedAttendance.id), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify(editForm)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                toast.success('Attendance record updated successfully');
                setShowEditModal(false);
                fetchAttendanceData();
            } else {
                toast.error('Failed to update attendance record');
                if (data.errors) {
                    Object.keys(data.errors).forEach(key => {
                        toast.error(data.errors[key]);
                    });
                }
            }
        })
        .catch(error => {
            console.error('Error updating attendance:', error);
            toast.error('Error updating attendance record');
        });
    };

    // Handle delete click
    const handleDeleteClick = (record) => {
        setSelectedAttendance(record);
        setShowDeleteConfirm(true);
    };

    // Confirm delete
    const handleConfirmDelete = () => {
        fetch(route('attendance.delete', selectedAttendance.id), {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                toast.success('Attendance record deleted successfully');
                setShowDeleteConfirm(false);
                fetchAttendanceData();
            } else {
                toast.error('Failed to delete attendance record');
            }
        })
        .catch(error => {
            console.error('Error deleting attendance:', error);
            toast.error('Error deleting attendance record');
        });
    };

    // Status formatting
    const formatStatus = (status) => {
        const statusMap = {
            'present': { 
                label: 'Present', 
                className: 'bg-green-100 text-green-800' 
            },
            'absent': { 
                label: 'Absent', 
                className: 'bg-red-100 text-red-800' 
            },
            'late': { 
                label: 'Late', 
                className: 'bg-yellow-100 text-yellow-800' 
            },
            'half_day': { 
                label: 'Half Day', 
                className: 'bg-blue-100 text-blue-800' 
            },
            'leave': { 
                label: 'Leave', 
                className: 'bg-purple-100 text-purple-800' 
            }
        };

        const statusInfo = statusMap[status] || { 
            label: status, 
            className: 'bg-gray-100 text-gray-800' 
        };

        return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.className}`}>
                {statusInfo.label}
            </span>
        );
    };

    return (
        <Layout>
            <Head title="Attendance Report" />
            
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white border-b border-gray-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold text-gray-800">Attendance Report</h2>
                                <button
                                    onClick={handleExportReport}
                                    className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-700 active:bg-green-900 focus:outline-none focus:border-green-900 focus:shadow-outline-gray transition ease-in-out duration-150"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Export
                                </button>
                            </div>
                            
                            {/* Filters Section */}
                            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                <form onSubmit={handleApplyFilters}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                                        {/* Date, Department, Employee, Search Filters */}
                                        {/* Implement filter inputs similar to previous implementations */}
                                    </div>
                                    
                                    <div className="flex justify-end space-x-4">
                                        <button
                                            type="button"
                                            onClick={handleResetFilters}
                                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            type="submit"
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            <Filter className="w-4 h-4 mr-2" />
                                            Apply Filters
                                        </button>
                                    </div>
                                </form>
                            </div>
                            
                            {/* Remaining table and modal sections */}
                            {/* Similar to previous implementations */}
                        </div>
                    </div>
                </div>
            </div>
            
            <ToastContainer />
        </Layout>
    );
};

export default AttendanceReport;