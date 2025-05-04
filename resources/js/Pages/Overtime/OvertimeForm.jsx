// resources/js/Pages/Overtime/OvertimeForm.jsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { HelpCircle } from 'lucide-react';
import OvertimeRateHelpModal from './OvertimeRateHelpModal';

const OvertimeForm = ({ employees, departments, rateMultipliers, onSubmit }) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Form state
    const [formData, setFormData] = useState({
        employee_ids: [],
        date: today,
        start_time: '17:00',
        end_time: '20:00',
        reason: '',
        rate_multiplier: rateMultipliers.length > 0 ? rateMultipliers[0].value : 1.25
    });
    
    // Filtered employees state
    const [filteredEmployees, setFilteredEmployees] = useState(employees || []);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    
    // Rate help modal state
    const [showRateHelpModal, setShowRateHelpModal] = useState(false);
    
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
        
        if (!formData.date || !formData.start_time || !formData.end_time) {
            alert('Please fill in all required fields');
            return;
        }
        
        if (formData.start_time >= formData.end_time) {
            alert('End time must be after start time');
            return;
        }
        
        if (!formData.reason.trim()) {
            alert('Please provide a reason for the overtime');
            return;
        }
        
        // Call the onSubmit prop with the form data
        onSubmit(formData);
        
        // Reset form after submission 
        setFormData({
            employee_ids: [],
            date: today,
            start_time: '17:00',
            end_time: '20:00',
            reason: '',
            rate_multiplier: rateMultipliers.length > 0 ? rateMultipliers[0].value : 1.25
        });
        
        // Reset filters
        setSearchTerm('');
        setSelectedDepartment('');
        
        // Note: removed window.location.reload() to prevent full page refresh
    };
    
    // Calculate if all filtered employees are selected
    const allFilteredSelected = filteredEmployees.length > 0 && 
        filteredEmployees.every(emp => formData.employee_ids.includes(emp.id));
    
    // Get selected employees details for display
    const selectedEmployees = employees.filter(emp => formData.employee_ids.includes(emp.id));
    
    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">File New Overtime</h3>
                <p className="text-sm text-gray-500">Create overtime request for one or multiple employees</p>
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
                    
                    {/* Overtime Details Section */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">Overtime Details</h4>
                        
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
                                    value={formData.date}
                                    onChange={handleChange}
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
                                        value={formData.start_time}
                                        onChange={handleChange}
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
                                        value={formData.end_time}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="rate_multiplier" className="block text-sm font-medium text-gray-700 mb-1">
                                        Rate Type <span className="text-red-600">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowRateHelpModal(true)}
                                        className="text-indigo-600 hover:text-indigo-800 flex items-center text-xs focus:outline-none"
                                    >
                                        <HelpCircle className="h-4 w-4 mr-1" />
                                        Rate Guide
                                    </button>
                                </div>
                                <select
                                    id="rate_multiplier"
                                    name="rate_multiplier"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={formData.rate_multiplier}
                                    onChange={handleChange}
                                    required
                                >
                                    <optgroup label="Regular Work Hours">
                                        <option value="1.25">Ordinary Weekday Overtime (125%)</option>
                                    </optgroup>
                                    
                                    <optgroup label="Special Days - Regular Hours">
                                        <option value="1.30">Rest Day/Special Day (130%)</option>
                                        <option value="1.50">Scheduled Rest Day (150%)</option>
                                        <option value="2.00">Regular Holiday (200%)</option>
                                    </optgroup>
                                    
                                    <optgroup label="Special Days - Overtime">
                                        <option value="1.69">Rest Day/Special Day Overtime (169%)</option>
                                        <option value="1.95">Scheduled Rest Day Overtime (195%)</option>
                                        <option value="2.60">Regular Holiday Overtime (260%)</option>
                                    </optgroup>
                                    
                                    <optgroup label="Night Shift Differential">
                                        <option value="1.375">Ordinary Weekday Overtime + Night Differential (137.5%)</option>
                                        <option value="1.43">Rest Day/Special Day + Night Differential (143%)</option>
                                        <option value="1.65">Scheduled Rest Day + Night Differential (165%)</option>
                                        <option value="2.20">Regular Holiday + Night Differential (220%)</option>
                                        <option value="1.859">Rest Day/Special Day Overtime + Night Differential (185.9%)</option>
                                        <option value="2.145">Scheduled Rest Day Overtime + Night Differential (214.5%)</option>
                                        <option value="2.86">Regular Holiday Overtime + Night Differential (286%)</option>
                                    </optgroup>
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    Select the appropriate rate type based on when the overtime was performed.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">Reason for Overtime</h4>
                        
                        <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                                Reason <span className="text-red-600">*</span>
                            </label>
                            <textarea
                                id="reason"
                                name="reason"
                                rows="5"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                placeholder="Provide a detailed reason for the overtime request"
                                value={formData.reason}
                                onChange={handleChange}
                                required
                            ></textarea>
                            <p className="mt-1 text-xs text-gray-500">
                                Please provide a clear justification for the overtime work.
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 border-t">
                    <button
                        type="submit"
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Submit Overtime Request
                    </button>
                </div>
            </form>
            
            {/* Rate Help Modal */}
            <OvertimeRateHelpModal 
                isOpen={showRateHelpModal}
                onClose={() => setShowRateHelpModal(false)}
            />
        </div>
    );
};

export default OvertimeForm;