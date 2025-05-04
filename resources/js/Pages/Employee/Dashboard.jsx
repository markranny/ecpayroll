import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { 
    Clock, 
    CalendarCheck, 
    User, 
    Bell, 
    FileText, 
    FileInput, 
    Clock8, 
    Users, 
    HeartHandshake 
} from 'lucide-react';

const EmployeeDashboard = ({ auth }) => {
    const [pendingOvertimes, setPendingOvertimes] = useState(0);
    
    // Check if user is a department manager, HRD manager, or superadmin
    const isManager = auth.user.roles?.some(role => 
        ['department_manager', 'superadmin', 'hrd_manager', 'hrd'].includes(role.name?.toLowerCase() || role.slug?.toLowerCase())
    );

    // Fetch pending overtimes count for managers
    useEffect(() => {
        if (isManager) {
            fetch('/api/pending-overtimes-count')
                .then(response => response.json())
                .then(data => {
                    setPendingOvertimes(data.count || 0);
                })
                .catch(error => {
                    console.error('Error fetching pending overtimes:', error);
                    // Set a default value for demonstration
                    setPendingOvertimes(3); 
                });
        }
    }, [isManager]);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Employee Dashboard" />
            
            <div className="flex min-h-screen bg-gray-50">
                
                {/* Main Content */}
                <div className="flex-1 p-8 ml-0">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    Welcome to Your Dashboard, {auth.user.name}!
                                </h1>
                                <p className="text-gray-600">
                                    Manage your work activities and personal information
                                </p>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                                <div className="relative">
                                    <Bell className="w-6 h-6 text-gray-600" />
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">3</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Quick Action Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center mb-3">
                                    <Clock className="w-5 h-5 text-blue-600 mr-2" />
                                    <h3 className="text-lg font-medium text-blue-800">My Attendance</h3>
                                </div>
                                <p className="text-gray-600 mb-4">View and manage your attendance records</p>
                                <Link 
                                    href="/my-attendance" 
                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                >
                                    View Records →
                                </Link>
                            </div>
                            
                            <div className="bg-green-50 p-6 rounded-lg border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center mb-3">
                                    <FileInput className="w-5 h-5 text-green-600 mr-2" />
                                    <h3 className="text-lg font-medium text-green-800">Filing Request</h3>
                                </div>
                                <p className="text-gray-600 mb-4">Submit various workplace requests</p>
                                <Link 
                                    href="/filing-requests" 
                                    className="text-green-600 hover:text-green-800 font-medium text-sm"
                                >
                                    Submit Request →
                                </Link>
                            </div>
                            
                            <div className="bg-purple-50 p-6 rounded-lg border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center mb-3">
                                    <User className="w-5 h-5 text-purple-600 mr-2" />
                                    <h3 className="text-lg font-medium text-purple-800">My Profile</h3>
                                </div>
                                <p className="text-gray-600 mb-4">View and update your personal information</p>
                                <Link 
                                    href="/profile" 
                                    className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                                >
                                    Edit Profile →
                                </Link>
                            </div>
                        </div>
                        
                        {/* Manager Approval Section */}
                        {isManager && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                {/* Pending Approval Card */}
                                <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 shadow-sm">
                                    <div className="flex items-center mb-3">
                                        <FileText className="w-5 h-5 text-indigo-600 mr-2" />
                                        <h3 className="text-lg font-medium text-indigo-800">Pending Approvals</h3>
                                    </div>
                                    <p className="text-gray-600 mb-4">
                                        You have <span className="font-semibold">{pendingOvertimes}</span> overtime {pendingOvertimes === 1 ? 'request' : 'requests'} waiting for your approval.
                                    </p>
                                    <Link 
                                        href="/overtimes" 
                                        className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
                                    >
                                        View & Approve Overtime
                                    </Link>
                                </div>
                                
                                {/* Schedule Monitoring Card */}
                                <div className="bg-teal-50 p-6 rounded-lg border border-teal-100 shadow-sm">
                                    <div className="flex items-center mb-3">
                                        <Clock8 className="w-5 h-5 text-teal-600 mr-2" />
                                        <h3 className="text-lg font-medium text-teal-800">Schedule Monitoring</h3>
                                    </div>
                                    <p className="text-gray-600 mb-4">Create and manage team schedules</p>
                                    <Link 
                                        href="/schedule-monitoring" 
                                        className="inline-flex items-center px-4 py-2 bg-teal-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition"
                                    >
                                        Manage Schedules →
                                    </Link>
                                </div>
                                
                                {/* Employee Relations Card */}
                                <div className="bg-pink-50 p-6 rounded-lg border border-pink-100 shadow-sm">
                                    <div className="flex items-center mb-3">
                                        <HeartHandshake className="w-5 h-5 text-pink-600 mr-2" />
                                        <h3 className="text-lg font-medium text-pink-800">Employee Relations</h3>
                                    </div>
                                    <p className="text-gray-600 mb-4">Manage employee engagement and support</p>
                                    <Link 
                                        href="/employee-relations" 
                                        className="inline-flex items-center px-4 py-2 bg-pink-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition"
                                    >
                                        View Relations →
                                    </Link>
                                </div>
                            </div>
                        )}
                        
                        {/* Recent Announcements */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Announcements</h2>
                            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-medium mb-2">Company Update</h3>
                                <p className="text-gray-600 mb-2">All employees are required to complete the annual compliance training by the end of this month.</p>
                                <span className="text-sm text-gray-500">Posted on March 5, 2025</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
};

export default EmployeeDashboard;