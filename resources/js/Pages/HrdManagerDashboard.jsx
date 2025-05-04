import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import {
    Users,
    Clock,
    CalendarRange,
    FileSpreadsheet,
    Briefcase,
    ArrowUp,
    ArrowDown,
    Award,
    Bell,
    BarChart4,
    UserRoundCog,
    FileText,
    CheckCircle,
    Zap,
    X
} from 'lucide-react';
import OvertimeStatusBadge from './Overtime/OvertimeStatusBadge';
import { format } from 'date-fns';

const HrdManagerDashboard = () => {
    const { props } = usePage();
    const { auth, pendingOvertimes = [], departmentsStats = [], organizationStats = {}, recentActivities = [] } = props;
    
    // State for the review modal
    const [showModal, setShowModal] = useState(false);
    const [selectedOvertime, setSelectedOvertime] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [processing, setProcessing] = useState(false);

    // Format date function
    const formatDate = (dateString) => {
        try {
            return format(new Date(dateString), 'yyyy-MM-dd');
        } catch (error) {
            return 'Invalid date';
        }
    };

    // Format time function
    const formatTime = (timeString) => {
        if (!timeString) return '-';
        
        try {
            let timeOnly;
            if (timeString.includes('T')) {
                const [, time] = timeString.split('T');
                timeOnly = time.slice(0, 5); // Extract HH:MM
            } else {
                const timeParts = timeString.split(' ');
                timeOnly = timeParts[timeParts.length - 1].slice(0, 5);
            }
            
            // Parse hours and minutes
            const [hours, minutes] = timeOnly.split(':');
            const hourNum = parseInt(hours, 10);
            
            // Convert to 12-hour format with AM/PM
            const ampm = hourNum >= 12 ? 'PM' : 'AM';
            const formattedHours = hourNum % 12 || 12; // handle midnight and noon
            
            return `${formattedHours}:${minutes} ${ampm}`;
        } catch (error) {
            return '-';
        }
    };
    
    // Handle review button click - open modal instead of redirect
    const handleReview = (overtime) => {
        setSelectedOvertime(overtime);
        setRemarks('');
        setShowModal(true);
    };

    // Handle status update
    const handleStatusUpdate = (status) => {
        if (processing) return;
        
        if (status === 'rejected' && !remarks.trim()) {
            alert('Please provide remarks for rejection');
            return;
        }
        
        setProcessing(true);
        
        // Use traditional fetch instead of Inertia to avoid JSON response issues
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        fetch(route('overtimes.updateStatus', selectedOvertime.id), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                status: status,
                remarks: remarks || (status === 'approved' ? 'Approved by HRD Manager' : '')
            })
        })
        .then(response => {
            // Handle successful response
            setShowModal(false);
            setSelectedOvertime(null);
            setRemarks('');
            setProcessing(false);
            
            // Force reload the page regardless of response to refresh the data
            window.location.href = route('hrd_manager.dashboard');
        })
        .catch(error => {
            console.error('Error updating status:', error);
            alert('Failed to update status. Please try again.');
            setProcessing(false);
        });
    };

    // Add a bulk approval function
const handleBulkApprove = () => {
    if (pendingOvertimes.length === 0) return;
    
    const selectedIds = pendingOvertimes.map(overtime => overtime.id);
    
    if (confirm(`Are you sure you want to approve ${selectedIds.length} overtime requests?`)) {
        // Use traditional form submission instead of fetch API
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = route('overtimes.bulkUpdateStatus');
        form.style.display = 'none';
        
        // Add CSRF token
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = '_token';
        csrfInput.value = csrfToken;
        form.appendChild(csrfInput);
        
        // Add the overtime_ids as individual form fields
        selectedIds.forEach(id => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'overtime_ids[]';
            input.value = id;
            form.appendChild(input);
        });
        
        // Add status and remarks
        const statusInput = document.createElement('input');
        statusInput.type = 'hidden';
        statusInput.name = 'status';
        statusInput.value = 'approved';
        form.appendChild(statusInput);
        
        const remarksInput = document.createElement('input');
        remarksInput.type = 'hidden';
        remarksInput.name = 'remarks';
        remarksInput.value = 'Bulk approved by HRD';
        form.appendChild(remarksInput);
        
        // Append form to the document, submit it, and then remove it
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }
};
    
    // Stats setup
    const stats = [
        {
            title: 'Total Employees',
            value: organizationStats.totalEmployees || 0,
            change: organizationStats.employeeChange || '+0',
            status: 'increase',
            icon: <Users className="h-6 w-6 text-blue-600" />,
            bgColor: 'bg-blue-50'
        },
        {
            title: 'Pending Approvals',
            value: pendingOvertimes.length || 0,
            change: 'Overtime',
            status: 'neutral',
            icon: <Clock className="h-6 w-6 text-orange-600" />, 
            bgColor: 'bg-orange-50'
        },
        {
            title: 'Leave Requests',
            value: organizationStats.leaveRequests || 0,
            change: organizationStats.leaveChange || '+0',
            status: 'neutral',
            icon: <CalendarRange className="h-6 w-6 text-purple-600" />,
            bgColor: 'bg-purple-50'
        },
        {
            title: 'Overall Attendance',
            value: organizationStats.attendanceRate || '0%',
            change: organizationStats.attendanceChange || '+0%',
            status: 'increase',
            icon: <Award className="h-6 w-6 text-green-600" />,
            bgColor: 'bg-green-50'
        }
    ];

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="HRD Manager Dashboard" />

            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    HRD Manager Dashboard
                                </h1>
                                <p className="text-gray-600">
                                    Overview of human resources operations and approvals
                                </p>
                            </div>
                            <div className="flex space-x-4">
                                <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                                    <Bell className="w-6 h-6 text-gray-600" />
                                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-medium flex items-center justify-center rounded-full transform -translate-y-1/4 translate-x-1/4">
                                        {pendingOvertimes.length}
                                    </span>
                                </button>
                                
                                <a
                                    href={route('reports.index')}
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                                >
                                    <BarChart4 className="w-5 h-5 mr-2" />
                                    HR Reports
                                </a>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {stats.map((stat, index) => (
                                <div key={index} className={`${stat.bgColor} rounded-xl p-6 shadow-sm border border-gray-100`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                            <p className="text-3xl font-bold mt-2 text-gray-900">{stat.value}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-white shadow-sm">
                                            {stat.icon}
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center w-fit ${
                                            stat.status === 'increase' ? 'bg-green-100 text-green-800' : 
                                            stat.status === 'decrease' ? 'bg-red-100 text-red-800' : 
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {stat.status === 'increase' ? <ArrowUp className="w-3 h-3 mr-1" /> : 
                                             stat.status === 'decrease' ? <ArrowDown className="w-3 h-3 mr-1" /> : null}
                                            {stat.change}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Pending OT Approvals */}
                            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900">Pending Overtime Approvals (Dept. Approved)</h2>
                                    <div className="flex space-x-2">
                                        {pendingOvertimes.length > 0 && (
                                            <button
                                                onClick={handleBulkApprove}
                                                className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 flex items-center"
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Approve All
                                            </button>
                                        )}
                                        <a href={route('overtimes.index')} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                            View All
                                        </a>
                                    </div>
                                </div>
                                
                                {pendingOvertimes.length === 0 ? (
                                    <div className="text-center py-6">
                                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                            <Clock className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-gray-900 font-medium mb-1">No pending approvals</h3>
                                        <p className="text-gray-500 text-sm">All overtime requests have been processed</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Employee
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Department
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Date & Hours
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Dept. Approved By
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {pendingOvertimes.slice(0, 5).map((overtime) => (
                                                    <tr key={overtime.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {overtime.employee ? 
                                                                    `${overtime.employee.Lname}, ${overtime.employee.Fname}` : 
                                                                    'Unknown employee'}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {overtime.employee?.idno || 'N/A'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">
                                                                {overtime.employee?.Department || 'N/A'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">
                                                                {overtime.date ? new Date(overtime.date).toLocaleDateString() : 'N/A'}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {overtime.total_hours} hours
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <OvertimeStatusBadge status={overtime.status} />
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">
                                                                {overtime.departmentApprover?.name || 'N/A'}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {overtime.dept_approved_at ? new Date(overtime.dept_approved_at).toLocaleDateString() : 'N/A'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <button
                                                                onClick={() => handleReview(overtime)}
                                                                className="text-indigo-600 hover:text-indigo-900"
                                                            >
                                                                Review
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Department Stats & Activities */}
                            <div className="space-y-6">
                                {/* Department Stats */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-lg font-semibold text-gray-900">Department Overview</h2>
                                        <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                            Detailed View
                                        </a>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {departmentsStats.slice(0, 4).map((dept, index) => (
                                            <div key={index} className="flex items-center p-3 hover:bg-gray-50 rounded-lg">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                                    <Briefcase className="h-5 w-5 text-gray-600" />
                                                </div>
                                                <div className="ml-4 flex-1">
                                                    <div className="flex justify-between items-center">
                                                        <div className="text-sm font-medium text-gray-900">{dept.name}</div>
                                                        <div className="text-sm text-gray-900">{dept.employeeCount}</div>
                                                    </div>
                                                    <div className="mt-1">
                                                        <div className="bg-gray-200 h-1.5 rounded-full w-full">
                                                            <div 
                                                                className="bg-indigo-600 h-1.5 rounded-full" 
                                                                style={{ width: `${dept.attendanceRate || 0}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="flex justify-between mt-1">
                                                            <span className="text-xs text-gray-500">Attendance</span>
                                                            <span className="text-xs text-gray-700 font-medium">{dept.attendanceRate || 0}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Recent Activities */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
                                    </div>
                                    
                                    {recentActivities.length === 0 ? (
                                        <div className="text-center py-4">
                                            <p className="text-gray-500 text-sm">No recent activities</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {recentActivities.map((activity, index) => (
                                                <div key={index} className="flex items-start p-3 hover:bg-gray-50 rounded-lg">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Overtime Review Modal */}
            {showModal && selectedOvertime && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <Clock className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                                            Review Overtime Request (HRD Final Approval)
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                You are reviewing the overtime request for 
                                                <span className="font-medium"> {selectedOvertime.employee ? 
                                                    `${selectedOvertime.employee.Fname} ${selectedOvertime.employee.Lname}` : 
                                                    'Unknown employee'}</span> that was approved by department manager.
                                            </p>
                                        </div>
                                        
                                        <div className="mt-4 bg-gray-50 p-4 rounded-md">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-gray-500">Date</p>
                                                    <p className="text-sm font-medium">{formatDate(selectedOvertime.date)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Time</p>
                                                    <p className="text-sm font-medium">
                                                        {formatTime(selectedOvertime.start_time)} - {formatTime(selectedOvertime.end_time)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Hours</p>
                                                    <p className="text-sm font-medium">
                                                        {parseFloat(selectedOvertime.total_hours).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Rate</p>
                                                    <p className="text-sm font-medium">
                                                        {selectedOvertime.rate_multiplier}x
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <p className="text-xs text-gray-500">Reason</p>
                                                <p className="text-sm font-medium mt-1">{selectedOvertime.reason}</p>
                                            </div>
                                            
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <p className="text-xs text-gray-500">Department Manager Approval</p>
                                                <p className="text-sm font-medium mt-1">
                                                    Approved by: {selectedOvertime.departmentApprover?.name || 'N/A'}
                                                </p>
                                                {selectedOvertime.dept_remarks && (
                                                    <p className="text-sm mt-1">
                                                        Remarks: <span className="italic">{selectedOvertime.dept_remarks}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4">
                                            <p className="text-sm text-gray-500">
                                                Do you want to approve or reject this overtime request?
                                            </p>
                                        </div>
                                        
                                        <div className="mt-4">
                                            <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">
                                                Remarks <span className="text-xs text-gray-500">(optional for approval, required for rejection)</span>
                                            </label>
                                            <textarea
                                                id="remarks"
                                                rows="3"
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                placeholder="Enter your comments..."
                                                value={remarks}
                                                onChange={(e) => setRemarks(e.target.value)}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => handleStatusUpdate('approved')}
                                    disabled={processing}
                                >
                                    {processing ? 'Processing...' : 'Final Approve'}
                                </button>
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => handleStatusUpdate('rejected')}
                                    disabled={processing}
                                >
                                    {processing ? 'Processing...' : 'Reject'}
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setShowModal(false)}
                                    disabled={processing}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
};

export default HrdManagerDashboard;