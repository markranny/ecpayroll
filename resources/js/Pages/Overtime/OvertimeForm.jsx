// resources/js/Pages/Overtime/OvertimeForm.jsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { HelpCircle, Loader2 } from 'lucide-react';
import OvertimeRateHelpModal from './OvertimeRateHelpModal';

const OvertimeForm = ({ employees, departments, rateMultipliers, onSubmit }) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Form state
    const [formData, setFormData] = useState({
        employee_ids: [],
        date: today,
        start_time: '17:00',
        end_time: '20:00',
        overtime_hours: '3.00', // Add manual overtime hours field
        reason: '',
        rate_multiplier: rateMultipliers.length > 0 ? rateMultipliers[0].value : 1.25
    });
    
    // Loading and processing states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    
    // Filtered employees state
    const [displayedEmployees, setDisplayedEmployees] = useState(employees || []);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    
    // Rate help modal state
    const [showRateHelpModal, setShowRateHelpModal] = useState(false);
    
    // Update displayed employees when search or department selection changes
    useEffect(() => {
        // Define our categories of employees
        let exactSearchMatches = [];
        let partialSearchMatches = [];
        let selectedButNotMatched = [];
        let otherEmployees = [];
        
        employees.forEach(employee => {
            const isSelected = formData.employee_ids.includes(employee.id);
            
            // Check search match
            let matchesSearch = true;
            let exactMatch = false;
            
            if (searchTerm) {
                const term = searchTerm.toLowerCase().trim();
                const fullName = `${employee.Fname} ${employee.Lname}`.toLowerCase();
                const reverseName = `${employee.Lname} ${employee.Fname}`.toLowerCase();
                
                // Check for exact match first
                if (
                    employee.Lname.toLowerCase() === term || 
                    employee.Fname.toLowerCase() === term ||
                    fullName === term ||
                    reverseName === term ||
                    employee.idno?.toString() === term
                ) {
                    exactMatch = true;
                    matchesSearch = true;
                } else {
                    // Check for partial match
                    matchesSearch = 
                        employee.Fname.toLowerCase().includes(term) || 
                        employee.Lname.toLowerCase().includes(term) || 
                        employee.idno?.toString().includes(term);
                }
            }
            
            // Check department match - now using proper department relationship
            let matchesDepartment = true;
            if (selectedDepartment) {
                // Check if employee has department relationship
                const employeeDepartment = employee.department?.name || employee.Department;
                matchesDepartment = employeeDepartment === selectedDepartment;
            }
            
            // Categorize based on matches and selection status
            if (exactMatch && matchesDepartment) {
                exactSearchMatches.push(employee);
            } else if (matchesSearch && matchesDepartment) {
                partialSearchMatches.push(employee);
            } else if (isSelected) {
                selectedButNotMatched.push(employee);
            } else {
                otherEmployees.push(employee);
            }
        });
        
        // Combine all categories in priority order
        const result = [
            ...exactSearchMatches,
            ...partialSearchMatches,
            ...selectedButNotMatched,
            ...otherEmployees
        ];
        
        // When no search/filter applied, move selected to top
        if (!searchTerm && !selectedDepartment) {
            result.sort((a, b) => {
                const aSelected = formData.employee_ids.includes(a.id);
                const bSelected = formData.employee_ids.includes(b.id);
                
                if (aSelected && !bSelected) return -1;
                if (!aSelected && bSelected) return 1;
                return 0;
            });
        }
        
        setDisplayedEmployees(result);
    }, [searchTerm, selectedDepartment, employees, formData.employee_ids]);
    
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
    
    // Handle individual checkbox change - directly modify the checkbox without affecting the row click
    const handleCheckboxChange = (e, employeeId) => {
        e.stopPropagation(); // Prevent row click handler from firing
        handleEmployeeSelection(employeeId);
    };
    
    // Handle select all employees (currently displayed only)
    const handleSelectAll = () => {
        setFormData(prevData => {
            // Get IDs of all currently displayed employees
            const displayedIds = displayedEmployees.map(emp => emp.id);
            
            // Check if all displayed employees are already selected
            const allSelected = displayedIds.every(id => prevData.employee_ids.includes(id));
            
            if (allSelected) {
                // If all are selected, deselect them
                return {
                    ...prevData,
                    employee_ids: prevData.employee_ids.filter(id => !displayedIds.includes(id))
                };
            } else {
                // If not all are selected, select all displayed employees
                // First remove any existing displayed employees to avoid duplicates
                const remainingSelectedIds = prevData.employee_ids.filter(id => !displayedIds.includes(id));
                return {
                    ...prevData,
                    employee_ids: [...remainingSelectedIds, ...displayedIds]
                };
            }
        });
    };
    
    // Handle department selection for bulk operations
    const handleSelectByDepartment = (department) => {
        // Filter employees by department using proper relationship
        const departmentEmployees = employees.filter(emp => {
            const employeeDepartment = emp.department?.name || emp.Department;
            return employeeDepartment === department;
        });
        const departmentIds = departmentEmployees.map(emp => emp.id);
        
        setFormData(prevData => {
            // Check if all employees from this department are already selected
            const allDeptSelected = departmentIds.every(id => prevData.employee_ids.includes(id));
            
            if (allDeptSelected) {
                // If all are selected, deselect them
                return {
                    ...prevData,
                    employee_ids: prevData.employee_ids.filter(id => !departmentIds.includes(id))
                };
            } else {
                // Select all employees from this department
                const remainingIds = prevData.employee_ids.filter(id => !departmentIds.includes(id));
                return {
                    ...prevData,
                    employee_ids: [...remainingIds, ...departmentIds]
                };
            }
        });
    };
    
    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isSubmitting) return; // Prevent double submission
        
        // Validate form
        if (formData.employee_ids.length === 0) {
            alert('Please select at least one employee');
            return;
        }
        
        if (!formData.date || !formData.start_time || !formData.end_time) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Removed the time validation that was preventing overnight shifts
        // if (formData.start_time >= formData.end_time) {
        //     alert('End time must be after start time');
        //     return;
        // }
        
        if (!formData.reason.trim()) {
            alert('Please provide a reason for the overtime');
            return;
        }
        
        // Validate overtime hours
        const overtimeHours = parseFloat(formData.overtime_hours);
        if (isNaN(overtimeHours) || overtimeHours <= 0) {
            alert('Please enter a valid number of overtime hours');
            return;
        }
        
        if (overtimeHours > 24) {
            alert('Overtime hours cannot exceed 24 hours');
            return;
        }
        
        // Set loading state
        setIsSubmitting(true);
        setLoadingMessage(`Processing overtime for ${formData.employee_ids.length} employee${formData.employee_ids.length > 1 ? 's' : ''}...`);
        
        try {
            // Call the onSubmit prop with the form data
            await onSubmit(formData);
            
            // Reset form after successful submission 
            setFormData({
                employee_ids: [],
                date: today,
                start_time: '17:00',
                end_time: '20:00',
                overtime_hours: '3.00',
                reason: '',
                rate_multiplier: rateMultipliers.length > 0 ? rateMultipliers[0].value : 1.25
            });
            
            // Reset filters
            setSearchTerm('');
            setSelectedDepartment('');
            
            setLoadingMessage('Overtime requests submitted successfully!');
            
            // Clear success message after a delay
            setTimeout(() => {
                setLoadingMessage('');
            }, 2000);
            
        } catch (error) {
            console.error('Error submitting overtime:', error);
            setLoadingMessage('');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Calculate if all displayed employees are selected
    const allDisplayedSelected = displayedEmployees.length > 0 && 
        displayedEmployees.every(emp => formData.employee_ids.includes(emp.id));
    
    // Get selected employees details for display
    const selectedEmployees = employees.filter(emp => formData.employee_ids.includes(emp.id));
    
    // Get department statistics for quick selection
    const departmentStats = departments.map(dept => {
        // Filter employees by department using proper relationship
        const deptEmployees = employees.filter(emp => {
            const employeeDepartment = emp.department?.name || emp.Department;
            return employeeDepartment === dept;
        });
        const selectedFromDept = deptEmployees.filter(emp => formData.employee_ids.includes(emp.id));
        return {
            name: dept,
            total: deptEmployees.length,
            selected: selectedFromDept.length,
            allSelected: deptEmployees.length > 0 && selectedFromDept.length === deptEmployees.length
        };
    });

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">File New Overtime</h3>
                <p className="text-sm text-gray-500">Create overtime request for one or multiple employees</p>
            </div>
            
            {/* Loading Overlay */}
            {isSubmitting && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 rounded-lg">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-600" />
                        <p className="text-sm text-gray-600">{loadingMessage}</p>
                    </div>
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="relative">
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
                                    disabled={isSubmitting}
                                />
                            </div>
                            
                            <div className="flex-1">
                                <select
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                    disabled={isSubmitting}
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
                                        allDisplayedSelected 
                                            ? 'bg-indigo-700 hover:bg-indigo-800' 
                                            : 'bg-indigo-500 hover:bg-indigo-600'
                                    } text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50`}
                                    onClick={handleSelectAll}
                                    disabled={isSubmitting}
                                >
                                    {allDisplayedSelected ? 'Deselect All' : 'Select All'}
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
                                    {displayedEmployees.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-3 text-center text-sm text-gray-500">
                                                No employees match your search criteria
                                            </td>
                                        </tr>
                                    ) : (
                                        displayedEmployees.map(employee => (
                                            <tr 
                                                key={employee.id} 
                                                className={`hover:bg-gray-50 cursor-pointer ${
                                                    formData.employee_ids.includes(employee.id) ? 'bg-indigo-50' : ''
                                                } ${isSubmitting ? 'opacity-50' : ''}`}
                                                onClick={() => !isSubmitting && handleEmployeeSelection(employee.id)}
                                            >
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                        checked={formData.employee_ids.includes(employee.id)}
                                                        onChange={(e) => handleCheckboxChange(e, employee.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        disabled={isSubmitting}
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
                                                    {employee.department?.name || employee.Department || 'No Department'}
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
                                    disabled={isSubmitting}
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
                                        disabled={isSubmitting}
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
                                        disabled={isSubmitting}
                                        required
                                    />
                                </div>
                            </div>
                            
                            {/* New Manual Overtime Hours Field */}
                            <div>
                                <label htmlFor="overtime_hours" className="block text-sm font-medium text-gray-700 mb-1">
                                    Overtime Hours <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="overtime_hours"
                                    name="overtime_hours"
                                    step="0.25"
                                    min="0.25"
                                    max="24"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={formData.overtime_hours}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    required
                                    placeholder="Enter overtime hours (e.g., 3.5)"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Enter the actual overtime hours worked (0.25 to 24 hours, in 15-minute increments).
                                </p>
                            </div>
                            
                            <div>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="rate_multiplier" className="block text-sm font-medium text-gray-700 mb-1">
                                        Rate Type <span className="text-red-600">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowRateHelpModal(true)}
                                        className="text-indigo-600 hover:text-indigo-800 flex items-center text-xs focus:outline-none disabled:opacity-50"
                                        disabled={isSubmitting}
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
                                    disabled={isSubmitting}
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
                                disabled={isSubmitting}
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
                        className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Submit Overtime Request'
                        )}
                    </button>
                </div>
            </form>
            
            {/* Rate Help Modal */}
            <OvertimeRateHelpModal 
                isOpen={showRateHelpModal && !isSubmitting}
                onClose={() => setShowRateHelpModal(false)}
            />
        </div>
    );
};

export default OvertimeForm;