import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import OvertimeStatusBadge from './Overtime/OvertimeStatusBadge';
import { format } from 'date-fns';
import { UserPlus, Clock, Users, CheckCircle, Calendar, X, Check } from 'lucide-react';

const DepartmentManagerDashboard = ({ auth, pendingOvertimes, departmentEmployees, departmentStats, upcomingEvents, managedDepartments }) => {
    const [activeTab, setActiveTab] = useState('employees');
    const [showModal, setShowModal] = useState(false);
    const [selectedOvertime, setSelectedOvertime] = useState(null);
    // Define remarks state
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

    // Handle review button click
    const handleReview = (overtime) => {
        setSelectedOvertime(overtime);
        // Reset remarks when opening modal
        setRemarks('');
        setShowModal(true);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Department Manager Dashboard" />
            
            <div className="min-h-screen bg-gray-50">
                <div className="p-8">
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-2xl font-bold text-gray-900 mb-6">Department Manager Dashboard</h1>
                        
                        {/* Managed departments section */}
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold mb-2">Your Managed Departments:</h2>
                            <div className="flex flex-wrap gap-2">
                                {managedDepartments.map((dept, index) => (
                                    <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                                        {dept}
                                    </span>
                                ))}
                            </div>
                        </div>
                        
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="bg-white p-6 rounded-lg shadow">
                                <div className="flex items-center">
                                    <div className="p-3 rounded-full bg-blue-100 mr-4">
                                        <Users className="h-6 w-6 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 font-medium">Total Employees</p>
                                        <p className="text-2xl font-bold">{departmentStats.employeeCount}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-lg shadow">
                                <div className="flex items-center">
                                    <div className="p-3 rounded-full bg-green-100 mr-4">
                                        <CheckCircle className="h-6 w-6 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 font-medium">Attendance Rate</p>
                                        <p className="text-2xl font-bold">{departmentStats.attendanceRate}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-lg shadow">
                                <div className="flex items-center">
                                    <div className="p-3 rounded-full bg-purple-100 mr-4">
                                        <Clock className="h-6 w-6 text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 font-medium">Pending Approvals</p>
                                        <p className="text-2xl font-bold">{pendingOvertimes.length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Tabs */}
                        <div className="bg-white overflow-hidden shadow-sm rounded-lg mb-6">
                            <div className="p-6 bg-white border-b border-gray-200">
                                <div className="mb-6">
                                    <div className="border-b border-gray-200">
                                        <nav className="-mb-px flex space-x-8">
                                            <button
                                                className={`${
                                                    activeTab === 'employees'
                                                        ? 'border-indigo-500 text-indigo-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                                                onClick={() => setActiveTab('employees')}
                                            >
                                                <Users className="w-4 h-4 mr-2" />
                                                Department Employees
                                            </button>
                                            <button
                                                className={`${
                                                    activeTab === 'approvals'
                                                        ? 'border-indigo-500 text-indigo-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                                                onClick={() => setActiveTab('approvals')}
                                            >
                                                <Clock className="w-4 h-4 mr-2" />
                                                Pending Approvals
                                                {pendingOvertimes.length > 0 && (
                                                    <span className="ml-2 bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                                        {pendingOvertimes.length}
                                                    </span>
                                                )}
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                                
                                {/* Department Employees List */}
                                {activeTab === 'employees' && (
                                    <div className="overflow-x-auto">
                                        <h3 className="text-lg font-semibold mb-4">Department Employees</h3>
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Employee ID
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Name
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Department
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Position
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {departmentEmployees.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                                                            No employees found in your department
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    departmentEmployees.map(employee => (
                                                        <tr key={employee.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {employee.idno}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {employee.Lname}, {employee.Fname}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {employee.Department}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {employee.Jobtitle}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                    employee.status === 'active' 
                                                                    ? 'bg-green-100 text-green-800' 
                                                                    : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                    {employee.status === 'active' ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                
                                {/* Pending Approvals List */}
                                {activeTab === 'approvals' && (
                                    <div className="overflow-x-auto">
                                        <h3 className="text-lg font-semibold mb-4">Pending Overtime Approvals</h3>
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Employee
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Date & Time
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Hours
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {pendingOvertimes.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                                                            No pending overtime requests
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    pendingOvertimes.map(overtime => (
                                                        <tr key={overtime.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {overtime.employee 
                                                                        ? `${overtime.employee.Lname}, ${overtime.employee.Fname}` 
                                                                        : 'Unknown employee'}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {overtime.employee?.idno || 'N/A'}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900">
                                                                    {overtime.date ? formatDate(overtime.date) : 'N/A'}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {overtime.start_time && overtime.end_time ? 
                                                                        `${formatTime(overtime.start_time)} - ${formatTime(overtime.end_time)}` : 
                                                                        'N/A'}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {overtime.total_hours !== undefined ? 
                                                                    parseFloat(overtime.total_hours).toFixed(2) : 
                                                                    'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <OvertimeStatusBadge status={overtime.status} />
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
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Upcoming Events Section */}
                        <div className="bg-white overflow-hidden shadow-sm rounded-lg">
                            <div className="p-6">
                                <h3 className="text-lg font-semibold mb-4 flex items-center">
                                    <Calendar className="h-5 w-5 text-indigo-500 mr-2" />
                                    Upcoming Events
                                </h3>
                                {upcomingEvents.length === 0 ? (
                                    <p className="text-gray-500">No upcoming events scheduled</p>
                                ) : (
                                    <div className="space-y-4">
                                        {upcomingEvents.map((event, index) => (
                                            <div key={index} className="flex items-start p-4 border rounded-lg hover:bg-gray-50">
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                                                    <p className="text-sm text-gray-500">{event.date}</p>
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
            
            {/* Review Confirmation Modal */}
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
                                            Review Overtime Request
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                You are about to review the overtime request for 
                                                <span className="font-medium"> {selectedOvertime.employee ? 
                                                    `${selectedOvertime.employee.Fname} ${selectedOvertime.employee.Lname}` : 
                                                    'Unknown employee'}</span>.
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
                                        </div>
                                        
                                        <div className="mt-4">
                                            <p className="text-sm text-gray-500">
                                                Do you want to approve or disapprove this overtime request?
                                            </p>
                                        </div>
                                        
                                        <div className="mt-4">
                                            <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">
                                                Remarks <span className="text-xs text-gray-500">(optional for approval, required for disapproval)</span>
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
                                    onClick={() => {
                                        // Handle direct approval
                                        if (selectedOvertime) {
                                            setProcessing(true);
                                            // Make API call to approve overtime
                                            fetch(`/overtimes/${selectedOvertime.id}/status`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                                                },
                                                body: JSON.stringify({
                                                    status: 'manager_approved',
                                                    remarks: remarks || 'Approved from dashboard'
                                                })
                                            })
                                            .then(response => {
                                                if (response.ok) {
                                                    // Close modal and refresh the page to show updated status
                                                    setShowModal(false);
                                                    window.location.reload();
                                                } else {
                                                    alert('Failed to approve overtime request');
                                                    setProcessing(false);
                                                }
                                            })
                                            .catch(error => {
                                                console.error('Error approving overtime:', error);
                                                alert('An error occurred while approving the overtime request');
                                                setProcessing(false);
                                            });
                                        }
                                    }}
                                    disabled={processing}
                                >
                                    {processing ? 'Processing...' : 'Approve'}
                                </button>
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => {
                                        // Validate remarks for rejection
                                        if (!remarks.trim()) {
                                            alert('Please provide remarks for disapproval');
                                            return;
                                        }
                                        
                                        // Handle direct disapproval
                                        if (selectedOvertime) {
                                            setProcessing(true);
                                            // Make API call to reject overtime
                                            fetch(`/overtimes/${selectedOvertime.id}/status`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                                                },
                                                body: JSON.stringify({
                                                    status: 'rejected',
                                                    remarks: remarks
                                                })
                                            })
                                            .then(response => {
                                                if (response.ok) {
                                                    // Close modal and refresh the page to show updated status
                                                    setShowModal(false);
                                                    window.location.reload();
                                                } else {
                                                    alert('Failed to reject overtime request');
                                                    setProcessing(false);
                                                }
                                            })
                                            .catch(error => {
                                                console.error('Error rejecting overtime:', error);
                                                alert('An error occurred while rejecting the overtime request');
                                                setProcessing(false);
                                            });
                                        }
                                    }}
                                    disabled={processing}
                                >
                                    {processing ? 'Processing...' : 'Disapprove'}
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

export default DepartmentManagerDashboard;