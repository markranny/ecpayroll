import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const OffsetForm = ({ employees, offsetTypes, departments, onSubmit }) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Form state
    const [formData, setFormData] = useState({
        employee_id: '',
        offset_type_id: '',
        date: today,
        workday: '',
        hours: '',
        reason: '',
        transaction_type: 'credit'
    });
    
    // Filtered employees state
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    
    // Update filtered employees when search or department selection changes
    useEffect(() => {
        let result = employees || [];
        
        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(employee => 
                employee.name.toLowerCase().includes(term) || 
                employee.idno?.toString().includes(term)
            );
        }
        
        // Filter by department
        if (selectedDepartment) {
            result = result.filter(employee => employee.department === selectedDepartment);
        }
        
        setFilteredEmployees(result);
    }, [searchTerm, selectedDepartment, employees]);
    
    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };
    
    // Handle employee selection
    const handleEmployeeSelect = (employee) => {
        setFormData({
            ...formData,
            employee_id: employee.id
        });
        setSelectedEmployee(employee);
    };
    
    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate form
        if (!formData.employee_id) {
            alert('Please select an employee');
            return;
        }
        
        if (!formData.offset_type_id) {
            alert('Please select an offset type');
            return;
        }
        
        if (!formData.date || !formData.workday) {
            alert('Please specify both date and workday');
            return;
        }
        
        if (formData.date === formData.workday) {
            alert('Date and workday must be different');
            return;
        }
        
        if (!formData.hours || formData.hours <= 0) {
            alert('Please enter a valid number of hours');
            return;
        }
        
        if (!formData.reason.trim()) {
            alert('Please provide a reason for the offset');
            return;
        }
        
        // Additional validation for 'debit' transaction type
        if (formData.transaction_type === 'debit' && selectedEmployee) {
            if (formData.hours > selectedEmployee.remaining_hours) {
                alert(`Insufficient hours in offset bank. Employee only has ${selectedEmployee.remaining_hours} hours available.`);
                return;
            }
        }
        
        // Call the onSubmit prop with the form data
        onSubmit(formData);
        
        // Reset form after submission 
        setFormData({
            employee_id: '',
            offset_type_id: '',
            date: today,
            workday: '',
            hours: '',
            reason: '',
            transaction_type: 'credit'
        });
        setSelectedEmployee(null);
        setSearchTerm('');
        setSelectedDepartment('');
    };
    
    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Request Offset</h3>
                <p className="text-sm text-gray-500">Create offset request for employee</p>
            </div>
            
            <form onSubmit={handleSubmit}>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Employee Selection Section */}
                    <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">Select Employee</h4>
                        
                        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-4">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Search by name or ID"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex-1">
                                <select
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                >
                                    <option value="">All Departments</option>
                                    {departments.map((department, index) => (
                                        <option key={index} value={department}>{department}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="border rounded-md overflow-hidden max-h-60 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            ID
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Department
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Position
                                        </th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Offset Hours
                                        </th>
                                    </tr>
                                </thead>
                                
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredEmployees.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-3 text-center text-sm text-gray-500">
                                                No employees match your search criteria
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredEmployees.map(employee => (
                                            <tr 
                                                key={employee.id} 
                                                className={`hover:bg-gray-50 cursor-pointer ${
                                                    formData.employee_id === employee.id ? 'bg-indigo-50' : ''
                                                }`}
                                                onClick={() => handleEmployeeSelect(employee)}
                                            >
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                    {employee.idno}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {employee.name}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                    {employee.department}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                    {employee.position}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                                                    <span className={`font-medium ${employee.remaining_hours > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                                        {employee.remaining_hours} hrs
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="mt-2 text-sm text-gray-600">
                            {selectedEmployee ? (
                                <div className="flex justify-between">
                                    <span className="font-medium">Selected: {selectedEmployee.name}</span>
                                    <span className="font-medium">
                                        Available Offset Hours: 
                                        <span className={`ml-1 ${selectedEmployee.remaining_hours > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {selectedEmployee.remaining_hours} hrs
                                        </span>
                                    </span>
                                </div>
                            ) : (
                                <span className="text-yellow-600">No employee selected</span>
                            )}
                        </div>
                    </div>
                    
                    {/* Offset Details Section */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">Offset Details</h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="offset_type_id" className="block text-sm font-medium text-gray-700 mb-1">
                                    Offset Type <span className="text-red-600">*</span>
                                </label>
                                <select
                                    id="offset_type_id"
                                    name="offset_type_id"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={formData.offset_type_id}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Offset Type</option>
                                    {offsetTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label htmlFor="transaction_type" className="block text-sm font-medium text-gray-700 mb-1">
                                    Transaction Type <span className="text-red-600">*</span>
                                </label>
                                <div className="flex space-x-4">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            name="transaction_type"
                                            value="credit"
                                            className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                            checked={formData.transaction_type === 'credit'}
                                            onChange={handleChange}
                                        />
                                        <span className="ml-2">Credit (Add to Bank)</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            name="transaction_type"
                                            value="debit"
                                            className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                            checked={formData.transaction_type === 'debit'}
                                            onChange={handleChange}
                                            disabled={!selectedEmployee || selectedEmployee.remaining_hours <= 0}
                                        />
                                        <span className="ml-2">Debit (Use from Bank)</span>
                                    </label>
                                </div>
                                {formData.transaction_type === 'debit' && !selectedEmployee && (
                                    <p className="mt-1 text-xs text-red-500">
                                        Please select an employee first
                                    </p>
                                )}
                                {formData.transaction_type === 'debit' && selectedEmployee && selectedEmployee.remaining_hours <= 0 && (
                                    <p className="mt-1 text-xs text-red-500">
                                        Employee has no hours in offset bank
                                    </p>
                                )}
                            </div>
                            
                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                                    Date <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="date"
                                    id="date"
                                    name="date"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    {formData.transaction_type === 'credit' ? 
                                        'The date when the work was performed' : 
                                        'The date of the offset request'
                                    }
                                </p>
                            </div>
                            
                            <div>
                                <label htmlFor="workday" className="block text-sm font-medium text-gray-700 mb-1">
                                    Workday <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="date"
                                    id="workday"
                                    name="workday"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={formData.workday}
                                    onChange={handleChange}
                                    required
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    {formData.transaction_type === 'credit' ? 
                                        'The date to be credited as offset' : 
                                        'The date when the employee will be using the offset'
                                    }
                                </p>
                            </div>
                            
                            <div>
                                <label htmlFor="hours" className="block text-sm font-medium text-gray-700 mb-1">
                                    Hours <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="hours"
                                    name="hours"
                                    min="0.5"
                                    max={formData.transaction_type === 'debit' && selectedEmployee ? selectedEmployee.remaining_hours : '24'}
                                    step="0.5"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={formData.hours}
                                    onChange={handleChange}
                                    required
                                />
                                {formData.transaction_type === 'debit' && selectedEmployee && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Max: {selectedEmployee.remaining_hours} hours available
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">Reason</h4>
                        
                        <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                                Reason <span className="text-red-600">*</span>
                            </label>
                            <textarea
                                id="reason"
                                name="reason"
                                rows="5"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                placeholder="Provide a detailed reason for the offset request"
                                value={formData.reason}
                                onChange={handleChange}
                                required
                            ></textarea>
                            <p className="mt-1 text-xs text-gray-500">
                                {formData.transaction_type === 'credit' ? 
                                    'Please provide details about the work performed' : 
                                    'Please explain why the offset is being used'
                                }
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 border-t">
                    <button
                        type="submit"
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Submit Offset Request
                    </button>
                </div>
            </form>
        </div>
    );
};

export default OffsetForm;