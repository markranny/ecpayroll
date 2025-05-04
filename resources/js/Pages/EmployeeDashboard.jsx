import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import { 
    Clock, 
    Calendar, 
    Briefcase, 
    FileText, 
    Bell,
    ChevronRight,
    AlertCircle,
    ClipboardCheck
} from 'lucide-react';
import OvertimeStatusBadge from './Overtime/OvertimeStatusBadge';

const EmployeeDashboard = () => {
    const { props } = usePage();
    const { auth, myOvertimes = [], upcomingEvents = [], employeeInfo = {}, notifications = [] } = props;
    
    // Stats setup
    const stats = [
        {
            title: 'My Overtime Hours',
            value: employeeInfo?.totalOvertimeHours || '0',
            period: 'This Month',
            icon: <Clock className="h-8 w-8 text-indigo-500" />,
            bgColor: 'bg-indigo-50',
            route: route('overtimes.index')
        },
        {
            title: 'Leave Balance',
            value: employeeInfo?.leaveBalance || '0',
            period: 'Days Available',
            icon: <Calendar className="h-8 w-8 text-green-500" />,
            bgColor: 'bg-green-50',
            route: '#'
        },
        {
            title: 'Attendance',
            value: employeeInfo?.attendancePercentage || '0%',
            period: 'This Month',
            icon: <ClipboardCheck className="h-8 w-8 text-blue-500" />,
            bgColor: 'bg-blue-50',
            route: '#'
        },
        {
            title: 'Payslips',
            value: 'View',
            period: 'Recent Documents',
            icon: <FileText className="h-8 w-8 text-purple-500" />,
            bgColor: 'bg-purple-50',
            route: '#'
        }
    ];

    // Create new overtime request
    const handleFileOvertime = () => {
        router.get(route('overtimes.index', { tab: 'create' }));
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Employee Dashboard" />

            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    Welcome, {auth.user.name}
                                </h1>
                                <p className="text-gray-600">
                                    Your personal dashboard | {employeeInfo?.jobTitle} | {employeeInfo?.department}
                                </p>
                            </div>
                            <div className="mt-4 md:mt-0 space-x-3">
                                <button
                                    onClick={handleFileOvertime}
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                                >
                                    <Clock className="w-5 h-5 mr-2" />
                                    File Overtime
                                </button>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {stats.map((stat, index) => (
                                <a 
                                    key={index} 
                                    href={stat.route} 
                                    className={`${stat.bgColor} rounded-xl p-6 shadow-sm border border-gray-100 group hover:shadow-md transition-all duration-200`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                            <p className="text-3xl font-bold mt-2 text-gray-900">{stat.value}</p>
                                            <p className="text-xs text-gray-500 mt-1">{stat.period}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-white shadow-sm group-hover:bg-opacity-80 transition-all duration-200">
                                            {stat.icon}
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* My Overtime Requests */}
                            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900">My Overtime Requests</h2>
                                    <a href={route('overtimes.index')} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                        View All
                                    </a>
                                </div>
                                
                                {myOvertimes.length === 0 ? (
                                    <div className="text-center py-6">
                                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                            <Clock className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-gray-900 font-medium mb-1">No overtime requests found</h3>
                                        <p className="text-gray-500 text-sm">You haven't filed any overtime requests yet</p>
                                        <button 
                                            onClick={handleFileOvertime}
                                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 inline-flex items-center"
                                        >
                                            <Clock className="w-4 h-4 mr-2" />
                                            File New Overtime
                                        </button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Date
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Hours
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Filed On
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {myOvertimes.slice(0, 5).map((overtime) => (
                                                    <tr key={overtime.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.get(route('overtimes.index', { selected: overtime.id }))}>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {overtime.date ? new Date(overtime.date).toLocaleDateString() : 'N/A'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {overtime.total_hours ? parseFloat(overtime.total_hours).toFixed(2) : 'N/A'} hrs
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <OvertimeStatusBadge status={overtime.status} />
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {overtime.created_at ? new Date(overtime.created_at).toLocaleDateString() : 'N/A'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Notifications & Calendar */}
                            <div className="space-y-6">
                                {/* Notifications */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                                        <span className="px-2.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                                            {notifications.length}
                                        </span>
                                    </div>
                                    
                                    {notifications.length === 0 ? (
                                        <div className="text-center py-4">
                                            <p className="text-gray-500 text-sm">No new notifications</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {notifications.map((notification, index) => (
                                                <div key={index} className="flex items-start p-3 hover:bg-gray-50 rounded-lg">
                                                    <div className="flex-shrink-0">
                                                        <div className={`p-2 rounded-full ${
                                                            notification.type === 'approval' ? 'bg-green-100 text-green-600' :
                                                            notification.type === 'rejection' ? 'bg-red-100 text-red-600' :
                                                            'bg-blue-100 text-blue-600'
                                                        }`}>
                                                            {notification.type === 'approval' ? <ClipboardCheck className="h-5 w-5" /> :
                                                            notification.type === 'rejection' ? <AlertCircle className="h-5 w-5" /> :
                                                            <Bell className="h-5 w-5" />}
                                                        </div>
                                                    </div>
                                                    <div className="ml-3 flex-1">
                                                        <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Upcoming Events */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
                                        <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                            View Calendar
                                        </a>
                                    </div>
                                    
                                    {upcomingEvents.length === 0 ? (
                                        <div className="text-center py-4">
                                            <p className="text-gray-500 text-sm">No upcoming events this week</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {upcomingEvents.map((event, index) => (
                                                <div key={index} className="flex items-center p-3 hover:bg-gray-50 rounded-lg">
                                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                                        <Calendar className="h-5 w-5" />
                                                    </div>
                                                    <div className="ml-3 flex-1">
                                                        <p className="text-sm font-medium text-gray-900">{event.title}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{event.date}</p>
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 text-gray-400" />
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

export default EmployeeDashboard;