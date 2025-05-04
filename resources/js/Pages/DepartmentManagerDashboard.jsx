import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { 
    Clock, 
    Users, 
    ClipboardCheck, 
    Calendar,
    Bell,
    Plus,
    ArrowRight
} from 'lucide-react';
import OvertimeStatusBadge from './Overtime/OvertimeStatusBadge';

const DepartmentManagerDashboard = () => {
    const { props } = usePage();
    const { auth, pendingOvertimes = [], departmentEmployees = [], upcomingEvents = [], departmentStats = {} } = props;
    
    // State for modals
    const [showCreateOvertimeModal, setShowCreateOvertimeModal] = useState(false);
    const [overtimeData, setOvertimeData] = useState({
        date: new Date().toISOString().substr(0, 10),
        start_time: '17:00',
        end_time: '19:00',
        reason: '',
        rate_multiplier: 1.25
    });
    
    // Stats setup
    const stats = [
        {
            title: 'Department Employees',
            value: departmentStats?.employeeCount || 0,
            icon: <Users className="h-8 w-8 text-blue-500" />,
            change: 'View all',
            changeType: 'neutral',
            bgColor: 'bg-blue-50',
            route: 'employees.index',
            params: { department: auth.user.department }
        },
        {
            title: 'Pending Approvals',
            value: pendingOvertimes.length || 0,
            icon: <Clock className="h-8 w-8 text-orange-500" />,
            change: pendingOvertimes.length > 3 ? 'Urgent' : 'View all',
            changeType: pendingOvertimes.length > 3 ? 'urgent' : 'neutral',
            bgColor: 'bg-orange-50',
            route: 'overtimes.index',
            params: { status: 'pending', department: auth.user.department }
        },
        {
            title: 'Offset Remaining',
            value: departmentStats?.offsetRemaining || 0,
            icon: <Calendar className="h-8 w-8 text-purple-500" />,
            change: 'Hours',
            changeType: 'neutral',
            bgColor: 'bg-purple-50',
            onClick: () => handleViewOffsets()
        },
        {
            title: 'Attendance Rate',
            value: departmentStats?.attendanceRate || '97%',
            icon: <ClipboardCheck className="h-8 w-8 text-green-500" />,
            change: 'This Month',
            changeType: 'increase',
            bgColor: 'bg-green-50',
            onClick: () => handleViewAttendance()
        }
    ];

    // Handle view details of an overtime
    const handleViewOvertime = (overtimeId) => {
        router.get(route('overtimes.index', { selected: overtimeId }));
    };
    
    // Handle clicks on cards
    const handleCardClick = (stat) => {
        if (stat.onClick) {
            stat.onClick();
        } else if (stat.route) {
            router.get(route(stat.route, stat.params || {}));
        }
    };
    
    // Handle create overtime for department manager
    const handleCreateOvertime = () => {
        setShowCreateOvertimeModal(true);
    };
    
    // Handle input changes for overtime form
    const handleOvertimeChange = (e) => {
        const { name, value } = e.target;
        setOvertimeData({
            ...overtimeData,
            [name]: value
        });
    };
    
    // Submit overtime form
    const submitOvertimeForm = (e) => {
        e.preventDefault();
        router.post(route('overtimes.store'), {
            ...overtimeData,
            employee_ids: [auth.user.employee_id], // Manager filing for themselves
        }, {
            onSuccess: () => {
                setShowCreateOvertimeModal(false);
                setOvertimeData({
                    date: new Date().toISOString().substr(0, 10),
                    start_time: '17:00',
                    end_time: '19:00',
                    reason: '',
                    rate_multiplier: 1.25
                });
            }
        });
    };
    
    // Handle viewing offsets
    const handleViewOffsets = () => {
        router.get(route('offsets.index'));
    };
    
    // Handle viewing attendance
    const handleViewAttendance = () => {
        router.get(route('attendance.index'));
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Department Manager Dashboard" />

            <div className="min-h-screen bg-gray-50">
                <div className="p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    Welcome back, {auth.user.name}
                                </h1>
                                <p className="text-gray-600">
                                    Here's what's happening in your department today
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <button 
                                    onClick={handleCreateOvertime} 
                                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    File Overtime
                                </button>
                                <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                                    <Bell className="w-6 h-6 text-gray-600" />
                                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-medium flex items-center justify-center rounded-full transform -translate-y-1/4 translate-x-1/4">
                                        {pendingOvertimes.length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {stats.map((stat, index) => (
                                <div 
                                    key={index} 
                                    className={`${stat.bgColor} rounded-xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200`}
                                    onClick={() => handleCardClick(stat)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                            <p className="text-3xl font-bold mt-2 text-gray-900">{stat.value}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-white shadow-sm">
                                            {stat.icon}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                            stat.changeType === 'increase' ? 'bg-green-100 text-green-800' : 
                                            stat.changeType === 'decrease' ? 'bg-red-100 text-red-800' : 
                                            stat.changeType === 'urgent' ? 'bg-red-100 text-red-800' : 
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {stat.change}
                                        </span>
                                        <ArrowRight className="h-4 w-4 text-gray-500" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Pending Approvals */}
                            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
                                    <a href={route('overtimes.index')} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                        View All
                                    </a>
                                </div>
                                
                                {pendingOvertimes.length === 0 ? (
                                    <div className="text-center py-6">
                                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                            <ClipboardCheck className="h-8 w-8 text-gray-400" />
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
                                                        Date & Time
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
                                                                {overtime.date ? new Date(overtime.date).toLocaleDateString() : 'N/A'}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {overtime.total_hours} hours
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <OvertimeStatusBadge status={overtime.status} />
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

                            {/* Department Team & Calendar */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900">Department Team</h2>
                                    <a href={route('employees.index', { department: auth.user.department })} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                        View All
                                    </a>
                                </div>
                                
                                <div className="space-y-4">
                                    {departmentEmployees.slice(0, 5).map((employee) => (
                                        <div key={employee.id} className="flex items-center p-3 hover:bg-gray-50 rounded-lg">
                                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                                                {employee.Fname?.charAt(0)}{employee.Lname?.charAt(0)}
                                            </div>
                                            <div className="ml-4 flex-1">
                                                <div className="text-sm font-medium text-gray-900">{employee.Fname} {employee.Lname}</div>
                                                <div className="text-sm text-gray-500">{employee.Jobtitle}</div>
                                            </div>
                                            <div className={`flex-shrink-0 w-3 h-3 rounded-full ${
                                                employee.status === 'active' ? 'bg-green-500' : 
                                                employee.status === 'on-leave' ? 'bg-yellow-500' : 
                                                'bg-gray-300'
                                            }`}></div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
                                    
                                    {upcomingEvents.length === 0 ? (
                                        <div className="text-center py-4">
                                            <p className="text-gray-500 text-sm">No upcoming events this week</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {upcomingEvents.map((event, index) => (
                                                <div key={index} className="flex items-center p-3 hover:bg-gray-50 rounded-lg">
                                                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                                                        <Calendar className="h-5 w-5" />
                                                    </div>
                                                    <div className="ml-3 flex-1">
                                                        <div className="text-sm font-medium text-gray-900">{event.title}</div>
                                                        <div className="text-xs text-gray-500">{event.date}</div>
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

            {/* Create Overtime Modal */}
            {showCreateOvertimeModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">File Overtime Request</h3>
                                
                                <form onSubmit={submitOvertimeForm}>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                                                Date <span className="text-red-600">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                id="date"
                                                name="date"
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                value={overtimeData.date}
                                                onChange={handleOvertimeChange}
                                                required
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Start Time <span className="text-red-600">*</span>
                                                </label>
                                                <input
                                                    type="time"
                                                    id="start_time"
                                                    name="start_time"
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                    value={overtimeData.start_time}
                                                    onChange={handleOvertimeChange}
                                                    required
                                                />
                                            </div>
                                            
                                            <div>
                                                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
                                                    End Time <span className="text-red-600">*</span>
                                                </label>
                                                <input
                                                    type="time"
                                                    id="end_time"
                                                    name="end_time"
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                    value={overtimeData.end_time}
                                                    onChange={handleOvertimeChange}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label htmlFor="rate_multiplier" className="block text-sm font-medium text-gray-700 mb-1">
                                                Rate Type <span className="text-red-600">*</span>
                                            </label>
                                            <select
                                                id="rate_multiplier"
                                                name="rate_multiplier"
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                value={overtimeData.rate_multiplier}
                                                onChange={handleOvertimeChange}
                                                required
                                            >
                                                <option value="1.25">Ordinary Weekday Overtime (125%)</option>
                                                <option value="1.30">Rest Day/Special Day (130%)</option>
                                                <option value="1.50">Scheduled Rest Day (150%)</option>
                                                <option value="2.00">Regular Holiday (200%)</option>
                                                <option value="1.69">Rest Day/Special Day Overtime (169%)</option>
                                                <option value="1.95">Scheduled Rest Day Overtime (195%)</option>
                                                <option value="2.60">Regular Holiday Overtime (260%)</option>
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                                                Reason <span className="text-red-600">*</span>
                                            </label>
                                            <textarea
                                                id="reason"
                                                name="reason"
                                                rows="3"
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                placeholder="Provide a detailed reason for the overtime request"
                                                value={overtimeData.reason}
                                                onChange={handleOvertimeChange}
                                                required
                                            ></textarea>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                                        <button
                                            type="submit"
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                                        >
                                            Submit Request
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                            onClick={() => setShowCreateOvertimeModal(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
};

export default DepartmentManagerDashboard;