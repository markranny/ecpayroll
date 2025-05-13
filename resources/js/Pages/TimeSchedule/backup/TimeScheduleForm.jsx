// resources/js/Pages/TimeSchedule/TimeScheduleForm.jsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const TimeScheduleForm = ({ employees, departments, scheduleTypes, onSubmit }) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Form state
    const [formData, setFormData] = useState({
        employee_ids: [],
        effective_date: today,
        end_date: '',
        current_schedule: '',
        new_schedule: '',
        new_start_time: '08:00',
        new_end_time: '17:00',
        reason: '',
        schedule_type: scheduleTypes.length > 0 ? scheduleTypes[0].id : ''
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
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
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
    
    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate form
        if (formData.employee_ids.length === 0) {
            alert('Please select at least one employee');
            return;
        }
        
        if (!formData.effective_date || !formData.schedule_type || !formData.new_start_time || !formData.new_end_time) {
            alert('Please fill in all required fields');
            return;
        }
        
        if (formData.new_start_time >= formData.new_end_time) {
            alert('End time must be after start time');
            return;
        }
        
        if (!formData.reason.trim()) {
            alert('Please provide a reason for the schedule change');
            return;
        }
        
        // Call the onSubmit prop with the form data
        onSubmit(formData);
        
        // Reset form after submission
        setFormData({
            employee_ids: [],
            effective_date: today,
            end_date: '',
            current_schedule: '',
            new_schedule: '',
            new_start_time: '08:00',
            new_end_time: '17:00',
            reason: '',
            schedule_type: scheduleTypes.length > 0 ? scheduleTypes[0].id : ''
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
                <h3 className="text-lg font-semibold">Change Time Schedule Request</h3>
                <p className="text-sm text-gray-500">Request schedule changes for one or multiple employees</p>
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
                    
                    {/* Schedule Change Details Section */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">Schedule Change Details</h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="schedule_type" className="block text-sm font-medium text-gray-700 mb-1">
                                    Schedule Type <span className="text-red-600">*</span>
                                </label>
                                <select
                                    id="schedule_type"
                                    name="schedule_type"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={formData.schedule_type}
                                    onChange={handleChange}
                                    required
                                >
                                    {scheduleTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label htmlFor="effective_date" className="block text-sm font-medium text-gray-700 mb-1">
                                    Effective Date <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="date"
                                    id="effective_date"
                                    name="effective_date"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={formData.effective_date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                                    End Date (Optional)
                                </label>
                                <input
                                    type="date"
                                    id="end_date"
                                    name="end_date"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={formData.end_date}
                                    onChange={handleChange}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Leave blank for permanent schedule change
                                </p>
                            </div>
                            
                            <div>
                                <label htmlFor="current_schedule" className="block text-sm font-medium text-gray-700 mb-1">
                                    Current Schedule
                                </label>
                                <input
                                    type="text"
                                    id="current_schedule"
                                    name="current_schedule"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={formData.current_schedule}
                                    onChange={handleChange}
                                    placeholder="e.g., Regular 8AM-5PM"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">New Schedule</h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="new_schedule" className="block text-sm font-medium text-gray-700 mb-1">
                                    New Schedule Name
                                </label>
                                <input
                                    type="text"
                                    id="new_schedule"
                                    name="new_schedule"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={formData.new_schedule}
                                    onChange={handleChange}
                                    placeholder="e.g., Night Shift, Custom Schedule"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="new_start_time" className="block text-sm font-medium text-gray-700 mb-1">
                                        Start Time <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        id="new_start_time"
                                        name="new_start_time"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        value={formData.new_start_time}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label htmlFor="new_end_time" className="block text-sm font-medium text-gray-700 mb-1">
                                        End Time <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        id="new_end_time"
                                        name="new_end_time"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        value={formData.new_end_time}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                                    Reason <span className="text-red-600">*</span>
                                </label>
                                <textarea
                                    id="reason"
                                    name="reason"
                                    rows="5"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    placeholder="Provide a detailed reason for the schedule change request"
                                    value={formData.reason}
                                    onChange={handleChange}
                                    required
                                ></textarea>
                                <p className="mt-1 text-xs text-gray-500">
                                    Please provide a clear justification for the schedule change.
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
                        Submit Schedule Change Request
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TimeScheduleForm;