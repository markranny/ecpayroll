import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Edit2, 
    Trash2,
    Eye,
    UserCheck,
    UserX,
    UserMinus,
    Filter
} from 'lucide-react';

const EmployeeList = ({ employees, onEdit, onDelete, onView, onUpdateStatus }) => {
    const [statusFilter, setStatusFilter] = useState('all');
    
    if (!employees?.length) {
        return <div className="p-4 text-center text-gray-500">No employees found</div>;
    }

    const filteredEmployees = statusFilter === 'all' 
        ? employees 
        : employees.filter(employee => employee.JobStatus === statusFilter);

    const getStatusBadge = (status) => {
        switch(status) {
            case 'Active':
                return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
            case 'Inactive':
                return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Inactive</Badge>;
            case 'Blocked':
                return <Badge className="bg-red-100 text-red-800 border-red-200">Blocked</Badge>;
            case 'On Leave':
                return <Badge className="bg-blue-100 text-blue-800 border-blue-200">On Leave</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status || 'Unknown'}</Badge>;
        }
    };

    return (
        <div>
            <div className="bg-white p-4 mb-4 flex flex-wrap gap-2 border rounded-lg shadow-sm">
                <span className="text-sm font-medium text-gray-500 mr-2 self-center">Filter by Status:</span>
                <Button 
                    variant={statusFilter === 'all' ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                    className="rounded-full"
                >
                    <Filter className="h-4 w-4 mr-1" />
                    All
                </Button>
                <Button 
                    variant={statusFilter === 'Active' ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setStatusFilter('Active')}
                    className="rounded-full"
                >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Active
                </Button>
                <Button 
                    variant={statusFilter === 'Inactive' ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setStatusFilter('Inactive')}
                    className="rounded-full"
                >
                    <UserMinus className="h-4 w-4 mr-1" />
                    Inactive
                </Button>
                <Button 
                    variant={statusFilter === 'Blocked' ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setStatusFilter('Blocked')}
                    className="rounded-full"
                >
                    <UserX className="h-4 w-4 mr-1" />
                    Blocked
                </Button>
                <Button 
                    variant={statusFilter === 'On Leave' ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setStatusFilter('On Leave')}
                    className="rounded-full"
                >
                    <UserMinus className="h-4 w-4 mr-1" />
                    On Leave
                </Button>
            </div>

            <div className="overflow-x-auto" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                ID No.
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Department
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Job Title
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Contact No.
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hired Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Gender
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Employment Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Emp. Type
                            </th>
                        </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredEmployees.map((employee) => (
                            <tr key={employee.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex space-x-2">
                                        <Button 
                                            variant="outline"
                                            className="p-2"
                                            onClick={() => onView(employee)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>

                                        <Button 
                                            variant="secondary" 
                                            className="p-2"
                                            onClick={() => onEdit(employee)}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>

                                        {employee.JobStatus !== 'Blocked' && (
                                            <Button 
                                                variant="outline"
                                                className="p-2 text-red-500 hover:text-white hover:bg-red-500"
                                                onClick={() => onUpdateStatus(employee.id, 'Blocked')}
                                                title="Block Employee"
                                            >
                                                <UserX className="h-4 w-4" />
                                            </Button>
                                        )}

                                        {employee.JobStatus === 'Active' && (
                                            <Button 
                                                variant="outline"
                                                className="p-2 text-yellow-500 hover:text-white hover:bg-yellow-500"
                                                onClick={() => onUpdateStatus(employee.id, 'Inactive')}
                                                title="Set as Inactive"
                                            >
                                                <UserMinus className="h-4 w-4" />
                                            </Button>
                                        )}

                                        {(employee.JobStatus === 'Inactive' || employee.JobStatus === 'Blocked') && (
                                            <Button 
                                                variant="outline"
                                                className="p-2 text-green-500 hover:text-white hover:bg-green-500"
                                                onClick={() => onUpdateStatus(employee.id, 'Active')}
                                                title="Activate Employee"
                                            >
                                                <UserCheck className="h-4 w-4" />
                                            </Button>
                                        )}

                                        <Button 
                                            variant="destructive"
                                            className="p-2"
                                            onClick={() => onDelete(employee.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">{employee.idno}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {`${employee.Lname}, ${employee.Fname} ${employee.MName || ''}`}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(employee.JobStatus)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">{employee.Department}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{employee.Jobtitle}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{employee.Email || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{employee.ContactNo || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {employee.HiredDate ? new Date(employee.HiredDate).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">{employee.Gender || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{employee.EmpStatus || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{employee.pay_type || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
                Showing {filteredEmployees.length} of {employees.length} employees
            </div>
        </div>
    );
};

export default EmployeeList;