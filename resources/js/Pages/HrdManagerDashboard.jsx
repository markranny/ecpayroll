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
    CheckCircle
} from 'lucide-react';
import OvertimeStatusBadge from './Overtime/OvertimeStatusBadge';

const HrdManagerDashboard = () => {
    const { props } = usePage();
    const { auth, pendingOvertimes = [], departmentsStats = [], organizationStats = {}, recentActivities = [] } = props;
    
    // Handle view of pending overtime approvals
    const handleViewOvertime = (overtimeId) => {
        router.get(route('overtimes.index', { selected: overtimeId }));
    };

    // Add a bulk approval function
    const handleBulkApprove = () => {
        if (pendingOvertimes.length === 0) return;
        
        const selectedIds = pendingOvertimes.map(overtime => overtime.id);
        
        if (confirm(`Are you sure you want to approve ${selectedIds.length} overtime requests?`)) {
            router.post(route('overtimes.bulkUpdateStatus'), {
                overtime_ids: selectedIds,
                status: 'approved',
                remarks: 'Bulk approved by HRD'
            }, {
                onSuccess: () => {
                    // Success notification would be handled by the parent component
                }
            });
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
                                                                onClick={() => handleViewOvertime(overtime.id)}
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
        </AuthenticatedLayout>
    );
};

export default HrdManagerDashboard;