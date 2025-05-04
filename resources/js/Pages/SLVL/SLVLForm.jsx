// resources/js/Pages/SLVL/SLVLForm.jsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const SLVLForm = ({ employees, departments, leaveTypes, onSubmit }) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Form state
    const [formData, setFormData] = useState({
        employee_ids: [],
        type: leaveTypes.length > 0 ? leaveTypes[0].value : 'sick',
        start_date: today,
        end_date: today,
        reason: '',
        half_day: false,
        am_pm: 'am',
        with_pay: true,
        documents: null
    });
    
    // Filtered employees state
    const [filteredEmployees, setFilteredEmployees] = useState(employees || []);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    
    // Update filtered employees when search or department selection changes
    useEffect(() => {
        let result = employees || [];
        
        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(employee => 
                employee.Fname.toLowerCase().includes(term) || 
                employee.Lname.toLowerCase().includes(term) || 
                employee.idno?.toString().includes(term)
            );
        }
        
        // Filter by department
        if (selectedDepartment) {
            result = result.filter(employee => employee.Department === selectedDepartment);
        }
        
        setFilteredEmployees(result);
    }, [searchTerm, selectedDepartment, employees]);
    
    // Handle input changes
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };
    
    // Handle file input changes
    const handleFileChange = (e) => {
        setFormData({
            ...formData,
            documents: e.target.files[0]
        });
    };
    
    // Handle employee selection
    const handleEmployeeSelection = (employeeId) => {
        const numericId = parseInt(employeeId, 10);
        setFormData(prevData => {
            // Check if employee is already selected
            if (prevData.employee_ids.includes(numericId)) {
                // Remove the employee
                return {
                    ...prevData,
                    employee_ids: prevData.employee_ids.filter(id => id !== numericId)
                };
            } else {
                // Add the employee
                return {
                    ...prevData,
                    employee_ids: [...prevData.employee_ids, numericId]
                };
            }
        });
    };
    
    // Handle select all employees (filtered ones only)
    const handleSelectAll = () => {
        setFormData(prevData => {
            // Get IDs of all filtered employees
            const filteredIds = filteredEmployees.map(emp => emp.id);
            
            // Check if all filtered employees are already selected
            const allSelected = filteredIds.every(id => prevData.employee_ids.includes(id));
            
            if (allSelected) {
                // If all are selected, deselect them
                return {
                    ...prevData,
                    employee_ids: prevData.employee_ids.filter(id => !filteredIds.includes(id))
                };
            } else {
                // If not all are selected, select all filtered employees
                // First remove any existing filtered employees to avoid duplicates
                const remainingSelectedIds = prevData.employee_ids.filter(id => !filteredIds.includes(id));
                return {
                    ...prevData,
                    employee_ids: [...remainingSelectedIds, ...filteredIds]
                };
            }
        });
    };
    
    // Calculate total leave days
    const calculateLeaveDays = () => {
        if (!formData.start_date || !formData.end_date) return 0;
        
        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);
        
        // If dates are invalid, return 0
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        
        // If end date is before start date, return 0
        if (end < start) return 0;
        
        // Calculate the difference in days
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
        
        // Adjust for half day if applicable
        if (formData.half_day) {
            return diffDays - 0.5;
        }
        
        return diffDays;
    };
    
    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate form
        if (formData.employee_ids.length === 0) {
            alert('Please select at least one employee');
            return;
        }
        
        if (!formData.start_date || !formData.end_date) {
            alert('Please fill in all required date fields');
            return;
        }
        
        if (new Date(formData.end_date) < new Date(formData.start_date)) {
            alert('End date must be on or after start date');
            return;
        }
        
        if (!formData.reason.trim()) {
            alert('Please provide a reason for the leave');
            return;
        }
        
        // Create FormData for file upload
        const submitData = new FormData();
        
        // Append all form fields
        for (const key in formData) {
            if (key === 'employee_ids') {
                // Handle array fields
                formData.employee_ids.forEach(id => {
                    submitData.append('employee_ids[]', id);
                });
            } else if (key === 'documents') {
                // Only append if file exists
                if (formData.documents) {
                    submitData.append('documents', formData.documents);
                }
            } else {
                submitData.append(key, formData[key]);
            }
        }
        
        // Call the onSubmit prop with the form data
        onSubmit(submitData);
        
        // Reset form after submission 
        setFormData({
            employee_ids: [],
            type: leaveTypes.length > 0 ? leaveTypes[0].value : 'sick',
            start_date: today,
            end_date: today,
            reason: '',
            half_day: false,
            am_pm: 'am',
            with_pay: true,
            documents: null
        });
        
        // Reset filters
        setSearchTerm('');
        setSelectedDepartment('');
    };
    
    // Calculate if all filtered employees are selected
    const allFilteredSelected = filteredEmployees.length > 0 && 
        filteredEmployees.every(emp => formData.employee_ids.includes(emp.id));
    
    // Get selected employees details for display
    const selectedEmployees = employees.filter(emp => formData.employee_ids.includes(emp.id));
    
    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">File New Leave</h3>
                <p className="text-sm text-gray-500">Create leave request for one or multiple employees</p>
            </div>
            
            <form onSubmit={handleSubmit}>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Employee Selection Section */}
                    <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">Select Employees</h4>
                        
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
                            
                            <div className="md:flex-initial">
                                <button
                                    type="button"
                                    className={`w-full px-4 py-2 rounded-md ${
                                        allFilteredSelected 
                                            ? 'bg-indigo-700 hover:bg-indigo-800' 
                                            : 'bg-indigo-500 hover:bg-indigo-600'
                                    } text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                                    onClick={handleSelectAll}
                                >
                                    {allFilteredSelected ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                        </div>
                        
                        <div className="border rounded-md overflow-hidden max-h-60 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                                            Select
                                        </th>
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
                                                    formData.employee_ids.includes(employee.id) ? 'bg-indigo-50' : ''
                                                }`}
                                                onClick={() => handleEmployeeSelection(employee.id)}
                                            >
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                        checked={formData.employee_ids.includes(employee.id)}
                                                        onChange={() => {}}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                    {employee.idno}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {employee.Lname}, {employee.Fname} {employee.MName || ''}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                    {employee.Department}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                    {employee.Jobtitle}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="mt-2 text-sm text-gray-600">
                            {formData.employee_ids.length > 0 ? (
                                <div>
                                    <span className="font-medium">{formData.employee_ids.length} employee(s) selected</span>
                                    {formData.employee_ids.length <= 5 && (
                                        <span className="ml-2">
                                            ({selectedEmployees.map(emp => emp.Lname).join(', ')})
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <span className="text-yellow-600">No employees selected</span>
                            )}
                        </div>
                    </div>
                    
                    {/* Leave Details Section */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">Leave Details</h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                                    Leave Type <span className="text-red-600">*</span>
                                </label>
                                <select
                                    id="type"
                                    name="type"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={formData.type}
                                    onChange={handleChange}
                                    required
                                >
                                    {leaveTypes.map((type, index) => (
                                        <option key={index} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                                        Start Date <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        id="start_date"
                                        name="start_date"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        value={formData.start_date}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                                        End Date <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        id="end_date"
                                        name="end_date"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        value={formData.end_date}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="half_day"
                                    name="half_day"
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    checked={formData.half_day}
                                    onChange={handleChange}
                                />
                                <label htmlFor="half_day" className="ml-2 text-sm text-gray-700">
                                    Half Day
                                </label>
                            </div>
                            
                            {formData.half_day && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Specify Half-Day
                                    </label>
                                    <div className="flex space-x-4">
                                        <label className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                className="form-radio text-indigo-600"
                                                name="am_pm"
                                                value="am"
                                                checked={formData.am_pm === 'am'}
                                                onChange={handleChange}
                                            />
                                            <span className="ml-2 text-gray-700">AM</span>
                                        </label>
                                        <label className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                className="form-radio text-indigo-600"
                                                name="am_pm"
                                                value="pm"
                                                checked={formData.am_pm === 'pm'}
                                                onChange={handleChange}
                                            />
                                            <span className="ml-2 text-gray-700">PM</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="with_pay"
                                    name="with_pay"
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    checked={formData.with_pay}
                                    onChange={handleChange}
                                />
                                <label htmlFor="with_pay" className="ml-2 text-sm text-gray-700">
                                    With Pay
                                </label>
                            </div>
                            
                            <div className="pt-2 border-t">
                                <p className="text-sm font-medium text-gray-700">
                                    Total Days: <span className="font-bold">{calculateLeaveDays()}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">Reason and Supporting Documents</h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                                    Reason <span className="text-red-600">*</span>
                                </label>
                                <textarea
                                    id="reason"
                                    name="reason"
                                    rows="5"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    placeholder="Provide a detailed reason for the leave request"
                                    value={formData.reason}
                                    onChange={handleChange}
                                    required
                                ></textarea>
                                <p className="mt-1 text-xs text-gray-500">
                                    Please provide a clear reason for your leave request.
                                </p>
                            </div>
                            
                            <div>
                                <label htmlFor="documents" className="block text-sm font-medium text-gray-700 mb-1">
                                    Supporting Documents {formData.type === 'sick' && <span className="text-red-600">*</span>}
                                </label>
                                <input
                                    type="file"
                                    id="documents"
                                    name="documents"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    required={formData.type === 'sick'}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    {formData.type === 'sick' 
                                        ? 'Medical certificate is required for sick leave.' 
                                        : 'Upload any relevant supporting documents.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 border-t">
                    <button
                        type="submit"
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Submit Leave Request
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SLVLForm;