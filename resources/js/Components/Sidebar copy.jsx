import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { 
    LayoutDashboard, 
    Users, 
    Clock, 
    Wallet, 
    FileText, 
    Settings, 
    Building2,
    UserCog,
    Calendar,
    FileBarChart,
    GraduationCap,
    CalendarCheck,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import '../../css/sidebar.css';

const MenuItem = ({ icon: Icon, label, items, path, isCollapsed }) => {
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);

    if (path) {
        return (
            <Link 
                href={path}
                className="block mb-1 group"
            >
                <div className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all duration-200">
                    {Icon && <Icon className="w-5 h-5 mr-3" />}
                    {!isCollapsed && <span className="flex-1 font-medium">{label}</span>}
                </div>
            </Link>
        );
    }

    return (
        <div className="mb-1">
            <div 
                className={`flex items-center px-4 py-2.5 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg cursor-pointer transition-all duration-200 ${isSubmenuOpen ? 'bg-indigo-50 text-indigo-600' : ''}`}
                onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
            >
                {Icon && <Icon className="w-5 h-5 mr-3" />}
                {!isCollapsed && (
                    <>
                        <span className="flex-1 font-medium">{label}</span>
                        <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isSubmenuOpen ? 'rotate-90' : ''}`} />
                    </>
                )}
            </div>
            {isSubmenuOpen && !isCollapsed && items && (
                <div className="ml-6 mt-1 space-y-1">
                    {items.map((subItem, index) => (
                        <Link
                            key={index}
                            href={subItem.path}
                            className="block px-4 py-2 text-sm text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all duration-200"
                        >
                            {subItem.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

const Sidebar = () => {
    const { auth } = usePage().props;
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    const userRoles = auth?.user?.roles || [];

    const hasAccess = (allowedRoles) => {
        return true; // Temporarily return true to show all menu items
    };

    const menuItems = [
        {
            icon: LayoutDashboard,
            label: 'Dashboard',
            path: route('dashboard'),
            allowedRoles: ['superadmin']
        },
        {
            icon: Users,
            label: 'Employees',
            allowedRoles: ['superadmin', 'finance', 'hrd'],
            items: [
                { label: 'Employee List', path: '/employees/list' },
                { label: 'View Inactive Employees', path: '/employees/inactive' },
                { label: 'Block Employees', path: '/employees/block' },
                { label: 'Import Employees', path: '/employees/import' }
            ]
        },
        {
            icon: Clock,
            label: 'Timesheets',
            allowedRoles: ['superadmin', 'hrd'],
            items: [
                { label: 'DTR', path: '/timesheets/dtr' },
                { label: 'EAC', path: '/timesheets/eac' },
                { label: 'Import Attendance', path: '/timesheets/import' }
            ]
        },
        {
            icon: Wallet,
            label: 'Payroll',
            allowedRoles: ['superadmin', 'finance'],
            items: [
                { label: 'Salary Lists', path: '/payroll/salary' },
                { label: 'Contribution Lists', path: '/payroll/contributions' },
                { label: 'Deduction Lists', path: '/payroll/deductions' },
                { label: 'Debit Summary', path: '/payroll/debit' },
                { label: 'Credit Summary', path: '/payroll/credit' },
                { label: 'SLVL Summary', path: '/payroll/slvl' }
            ]
        },
        {
            icon: FileText,
            label: 'File',
            allowedRoles: ['superadmin', 'hrd'],
            items: [
                { label: 'Overtime', path: '/file/overtime' },
                { label: 'Offset', path: '/file/offset' },
                { label: 'Change Restday', path: '/file/restday' },
                { label: 'Change Time Sched', path: '/file/schedule' },
                { label: 'SLVL', path: '/file/slvl' },
                { label: 'Travel Order', path: '/file/travel' },
                { label: 'Retro', path: '/file/retro' }
            ]
        },
        {
            icon: Building2,
            label: 'Manage',
            allowedRoles: ['superadmin', 'hrd'],
            items: [
                { label: 'Line & Section', path: '/manage/line-section' },
                { label: 'Departments', path: '/manage/departments' },
                { label: 'Roles And Access', path: '/manage/roles' }
            ]
        },
        {
            icon: UserCog,
            label: 'Core HR',
            allowedRoles: ['superadmin', 'hrd'],
            items: [
                { label: 'Promotion', path: '/core-hr/promotion' },
                { label: 'Award', path: '/core-hr/award' },
                { label: 'Travel', path: '/core-hr/travel' },
                { label: 'Transfer', path: '/core-hr/transfer' },
                { label: 'Resignations', path: '/core-hr/resignations' },
                { label: 'Complaints', path: '/core-hr/complaints' },
                { label: 'Warnings', path: '/core-hr/warnings' },
                { label: 'Terminations', path: '/core-hr/terminations' }
            ]
        },
        {
            icon: Calendar,
            label: 'HR Calendar',
            allowedRoles: ['superadmin', 'hrd'],
            path: '/hr-calendar'
        },
        {
            icon: FileBarChart,
            label: 'HR Reports',
            allowedRoles: ['superadmin', 'hrd'],
            items: [
                { label: 'Daily Attendances', path: '/reports/daily-attendance' },
                { label: 'Monthly Attendance', path: '/reports/monthly-attendance' },
                { label: 'Training Report', path: '/reports/training' }
            ]
        },
        {
            icon: GraduationCap,
            label: 'Training',
            allowedRoles: ['superadmin', 'hrd'],
            items: [
                { label: 'Training Lists', path: '/training/lists' },
                { label: 'Training Type', path: '/training/types' },
                { label: 'Trainers', path: '/training/trainers' }
            ]
        },
        {
            icon: CalendarCheck,
            label: 'Events & Meetings',
            allowedRoles: ['superadmin', 'hrd'],
            items: [
                { label: 'Events', path: '/events' },
                { label: 'Meetings', path: '/meetings' }
            ]
        },
        {
            icon: Settings,
            label: 'Settings',
            allowedRoles: ['superadmin'],
            path: '/settings'
        }
    ];

    return (
        <div className={`h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className="p-4 flex items-center justify-between border-b border-gray-200">
                {!isCollapsed && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 tracking-tight">
                            Dashboard
                        </h2>
                        <p className="text-sm text-gray-500">
                            {userRoles.map(role => role.name).join(', ')}
                        </p>
                    </div>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    ) : (
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    )}
                </button>
            </div>
            <nav className="mt-4 px-2">
                {menuItems
                    .filter(item => hasAccess(item.allowedRoles))
                    .map((item, index) => (
                        <MenuItem
                            key={index}
                            icon={item.icon}
                            label={item.label}
                            items={item.items}
                            path={item.path}
                            isCollapsed={isCollapsed}
                        />
                    ))}
            </nav>
        </div>
    );
};

export default Sidebar;