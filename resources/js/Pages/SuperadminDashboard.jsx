import React from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import { 
    Users,
    Clock,
    Calendar,
    AlertCircle,
    TrendingUp,
    Activity,
    ArrowUpRight,
    BarChart3,
    Bell
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, trend, color }) => (
    <div className="relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-110 transition-transform duration-300" />
        <div className="relative">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
                    <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
                </div>
                {trend && (
                    <span className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
                        <ArrowUpRight className="w-4 h-4 mr-1" />
                        {trend}%
                    </span>
                )}
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
            <p className="text-sm font-medium text-gray-600">{label}</p>
        </div>
    </div>
);

const ActivityItem = ({ title, time }) => (
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-xl transition-colors duration-200">
        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
        <div className="flex-1">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{title}</p>
                <span className="text-xs text-gray-500">{time}</span>
            </div>
        </div>
    </div>
);

const DashboardHeader = ({ user, notificationCount = 5 }) => (
    <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Welcome back, {user.name}
            </h1>
            <p className="text-gray-600">
                Here's what's happening with your organization today.
            </p>
        </div>
        <div className="flex items-center space-x-4">
            <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                <Bell className="w-6 h-6 text-gray-600" />
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-medium flex items-center justify-center rounded-full transform -translate-y-1/4 translate-x-1/4">
                    {notificationCount}
                </span>
            </button>
            <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Generate Report
            </button>
        </div>
    </div>
);

const PerformanceChart = () => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
                <p className="text-sm text-gray-500">Monthly performance metrics</p>
            </div>
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option>Last 30 days</option>
                <option>Last 60 days</option>
                <option>Last 90 days</option>
            </select>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500 border border-dashed border-gray-200 rounded-xl bg-gray-50">
            [Performance Chart Placeholder]
        </div>
    </div>
);

const ActivityCard = ({ title, items }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500">Latest updates and activities</p>
            </div>
            <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                View All
            </button>
        </div>
        <div className="space-y-1">
            {items.map((item, index) => (
                <ActivityItem key={index} {...item} />
            ))}
        </div>
    </div>
);

export default function SuperadminDashboard({ auth }) {
    const stats = [
        {
            icon: Users,
            label: 'Total Employees',
            value: '1,234',
            trend: '12',
            color: 'bg-blue-500'
        },
        {
            icon: Clock,
            label: 'Attendance Today',
            value: '98%',
            trend: '4',
            color: 'bg-green-500'
        },
        {
            icon: Calendar,
            label: 'Upcoming Events',
            value: '8',
            color: 'bg-purple-500'
        },
        {
            icon: AlertCircle,
            label: 'Pending Requests',
            value: '25',
            color: 'bg-orange-500'
        }
    ];

    const recentActivity = [
        {
            title: 'New employee John Doe onboarded',
            time: '2 hours ago'
        },
        {
            title: 'Payroll processing completed',
            time: '4 hours ago'
        },
        {
            title: 'Training session scheduled',
            time: '6 hours ago'
        },
        {
            title: 'Leave request approved',
            time: '8 hours ago'
        }
    ];

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Superadmin Dashboard" />
            <div className="flex min-h-screen bg-gray-50/50">
                <Sidebar />
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        <DashboardHeader user={auth.user} />

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {stats.map((stat, index) => (
                                <StatCard key={index} {...stat} />
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <PerformanceChart />
                            <ActivityCard 
                                title="Recent Activity"
                                items={recentActivity}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}