// resources/js/Pages/SLVL/SLVLForm.jsx
import React, { useState, useEffect } from 'react';
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { HelpCircle, Loader2, Calendar, AlertCircle } from 'lucide-react';
import SLVLBankModal from './SLVLBankModal';

const SLVLForm = ({ employees, departments, leaveTypes, onSubmit }) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Form state
    const [formData, setFormData] = useState({
        employee_ids: [],
        type: 'sick',
        start_date: today,
        end_date: today,
        half_day: false,
        am_pm: 'am',
        with_pay: true,
        reason: '',
        documents: null
    });
    
    // Loading and processing states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    
    // Filtered employees state
    const [displayedEmployees, setDisplayedEmployees] = useState(employees || []);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    
    // SLVL bank states
    const [showBankModal, setShowBankModal] = useState(false);
    const [selectedEmployeeForBank, setSelectedEmployeeForBank] = useState(null);
    const [employeeBanks, setEmployeeBanks] = useState({});
    
    // Calculated days
    const [calculatedDays, setCalculatedDays] = useState(0);
    
    // Update displayed employees when search or department selection changes
    useEffect(() => {
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
                    matchesSearch = 
                        employee.Fname.toLowerCase().includes(term) || 
                        employee.Lname.toLowerCase().includes(term) || 
                        employee.idno?.toString().includes(term);
                }
            }
            
            // Check department match
            let matchesDepartment = true;
            if (selectedDepartment) {
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
        
        const result = [
            ...exactSearchMatches,
            ...partialSearchMatches,
            ...selectedButNotMatched,
            ...otherEmployees
        ];
        
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
    
    // Calculate leave days when dates change
    useEffect(() => {
        if (formData.start_date && formData.end_date) {
            const startDate = new Date(formData.start_date);
            const endDate = new Date(formData.end_date);
            let totalDays = 0;
            
            // Calculate business days (excluding weekends)
            let current = new Date(startDate);
            while (current <= endDate) {
                // Skip weekends (Saturday = 6, Sunday = 0)
                if (current.getDay() !== 0 && current.getDay() !== 6) {
                    totalDays++;
                }
                current = addDays(current, 1);
            }
            
            // Adjust for half day
            if (formData.half_day && totalDays === 1) {
                totalDays = 0.5;
            }
            
            setCalculatedDays(totalDays);
        }
    }, [formData.start_date, formData.end_date, formData.half_day]);
    
    // Fetch SLVL bank data for selected employees
    useEffect(() => {
        if (formData.employee_ids.length > 0 && (formData.type === 'sick' || formData.type === 'vacation')) {
            formData.employee_ids.forEach(employeeId => {
                if (!employeeBanks[employeeId]) {
                    fetchEmployeeBank(employeeId);
                }
            });
        }
    }, [formData.employee_ids, formData.type]);
    
    const fetchEmployeeBank = async (employeeId) => {
        try {
            const response = await fetch(`/slvl/bank/${employeeId}`);
            const bankData = await response.json();
            setEmployeeBanks(prev => ({
                ...prev,
                [employeeId]: bankData
            }));
        } catch (error) {
            console.error('Error fetching SLVL bank data:', error);
        }
    };
    
    // Handle input changes
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };
    
    // Handle file input
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFormData({
            ...formData,
            documents: file
        });
    };
    
    // Handle employee selection
    const handleEmployeeSelection = (employeeId) => {
        const numericId = parseInt(employeeId, 10);
        setFormData(prevData => {
            if (prevData.employee_ids.includes(numericId)) {
                return {
                    ...prevData,
                    employee_ids: prevData.employee_ids.filter(id => id !== numericId)
                };
            } else {
                return {
                    ...prevData,
                    employee_ids: [...prevData.employee_ids, numericId]
                };
            }
        });
    };
    
    // Handle checkbox change
    const handleCheckboxChange = (e, employeeId) => {
        e.stopPropagation();
        handleEmployeeSelection(employeeId);
    };
    
    // Handle select all employees
    const handleSelectAll = () => {
        setFormData(prevData => {
            const displayedIds = displayedEmployees.map(emp => emp.id);
            const allSelected = displayedIds.every(id => prevData.employee_ids.includes(id));
            
            if (allSelected) {
                return {
                    ...prevData,
                    employee_ids: prevData.employee_ids.filter(id => !displayedIds.includes(id))
                };
            } else {
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
        const departmentEmployees = employees.filter(emp => {
            const employeeDepartment = emp.department?.name || emp.Department;
            return employeeDepartment === department;
        });
        const departmentIds = departmentEmployees.map(emp => emp.id);
        
        setFormData(prevData => {
            const allDeptSelected = departmentIds.every(id => prevData.employee_ids.includes(id));
            
            if (allDeptSelected) {
                return {
                    ...prevData,
                    employee_ids: prevData.employee_ids.filter(id => !departmentIds.includes(id))
                };
            } else {
                const remainingIds = prevData.employee_ids.filter(id => !departmentIds.includes(id));
                return {
                    ...prevData,
                    employee_ids: [...remainingIds, ...departmentIds]
                };
            }
        });
    };
    
    // Show SLVL bank for employee
    const showEmployeeBank = (employee) => {
        setSelectedEmployeeForBank(employee);
        setShowBankModal(true);
    };
    
    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isSubmitting) return;
        
        // Validate form
        if (formData.employee_ids.length === 0) {
            alert('Please select at least one employee');
            return;
        }
        
        if (!formData.start_date || !formData.end_date) {
            alert('Please select start and end dates');
            return;
        }
        
        if (new Date(formData.start_date) > new Date(formData.end_date)) {
            alert('End date must be after or equal to start date');
            return;
        }
        
        if (!formData.reason.trim()) {
            alert('Please provide a reason for the leave');
            return;
        }
        
        // Check SLVL bank balance for paid leaves
        if (formData.with_pay && (formData.type === 'sick' || formData.type === 'vacation')) {
            for (const employeeId of formData.employee_ids) {
                const bank = employeeBanks[employeeId];
                if (bank && bank[formData.type]) {
                    const remaining = bank[formData.type].remaining_days;
                    if (remaining < calculatedDays) {
                        const employee = employees.find(emp => emp.id === employeeId);
                        const employeeName = employee ? `${employee.Fname} ${employee.Lname}` : `Employee ${employeeId}`;
                        alert(`${employeeName} has insufficient ${formData.type} leave balance (${remaining} days available, ${calculatedDays} days requested)`);
                        return;
                    }
                }
            }
        }
        
        setIsSubmitting(true);
        setLoadingMessage(`Processing leave request for ${formData.employee_ids.length} employee${formData.employee_ids.length > 1 ? 's' : ''}...`);
        
        try {
            // Create FormData for file upload
            const submitData = new FormData();
            
            // Append form fields
            formData.employee_ids.forEach(id => {
                submitData.append('employee_ids[]', id);
            });
            
            submitData.append('type', formData.type);
            submitData.append('start_date', formData.start_date);
            submitData.append('end_date', formData.end_date);
            submitData.append('half_day', formData.half_day ? '1' : '0');
            if (formData.half_day) {
                submitData.append('am_pm', formData.am_pm);
            }
            submitData.append('with_pay', formData.with_pay ? '1' : '0');
            submitData.append('reason', formData.reason);
            
            if (formData.documents) {
                submitData.append('documents', formData.documents);
            }
            
            await onSubmit(submitData);
            
            // Reset form after successful submission
            setFormData({
                employee_ids: [],
                type: 'sick',
                start_date: today,
                end_date: today,
                half_day: false,
                am_pm: 'am',
                with_pay: true,
                reason: '',
                documents: null
            });
            
            // Reset filters and file input
            setSearchTerm('');
            setSelectedDepartment('');
            document.getElementById('documents').value = '';
            
            setLoadingMessage('Leave requests submitted successfully!');
            
            setTimeout(() => {
                setLoadingMessage('');
            }, 2000);
            
        } catch (error) {
            console.error('Error submitting leave:', error);
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
    
    // Check for insufficient balance warning
    const hasInsufficientBalance = formData.with_pay && 
        (formData.type === 'sick' || formData.type === 'vacation') &&
        formData.employee_ids.some(employeeId => {
            const bank = employeeBanks[employeeId];
            return bank && bank[formData.type] && bank[formData.type].remaining_days < calculatedDays;
        });

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">File New Leave Request</h3>
                <p className="text-sm text-gray-500">Create leave request for one or multiple employees</p>
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
                                        {(formData.type === 'sick' || formData.type === 'vacation') && formData.with_pay && (
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {formData.type === 'sick' ? 'SL' : 'VL'} Balance
                                            </th>
                                        )}
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
                                        displayedEmployees.map(employee => {
                                            const bank = employeeBanks[employee.id];
                                            const currentTypeBank = bank && bank[formData.type];
                                            const hasInsufficient = formData.with_pay && 
                                                currentTypeBank && 
                                                currentTypeBank.remaining_days < calculatedDays;
                                            
                                            return (
                                                <tr 
                                                    key={employee.id} 
                                                    className={`hover:bg-gray-50 cursor-pointer ${
                                                        formData.employee_ids.includes(employee.id) ? 'bg-indigo-50' : ''
                                                    } ${isSubmitting ? 'opacity-50' : ''} ${
                                                        hasInsufficient ? 'bg-red-50' : ''
                                                    }`}
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
                                                    {(formData.type === 'sick' || formData.type === 'vacation') && formData.with_pay && (
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                            {currentTypeBank ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        showEmployeeBank(employee);
                                                                    }}
                                                                    className={`text-xs px-2 py-1 rounded ${
                                                                        hasInsufficient 
                                                                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                    }`}
                                                                >
                                                                    {currentTypeBank.remaining_days} days
                                                                    {hasInsufficient && (
                                                                        <AlertCircle className="inline w-3 h-3 ml-1" />
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs text-gray-400">Loading...</span>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
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
                        
                        {hasInsufficientBalance && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                <div className="flex">
                                    <AlertCircle className="h-5 w-5 text-red-400" />
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">
                                            Insufficient Leave Balance
                                        </h3>
                                        <div className="mt-1 text-sm text-red-700">
                                            <p>Some selected employees have insufficient {formData.type} leave balance for {calculatedDays} days.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
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
                                    disabled={isSubmitting}
                                    required
                                >
                                    {leaveTypes.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
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
                                        disabled={isSubmitting}
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
                                        disabled={isSubmitting}
                                        required
                                    />
                                </div>
                            </div>
                            
                            {/* Calculated Days Display */}
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <div className="flex items-center">
                                    <Calendar className="h-5 w-5 text-blue-400" />
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-blue-800">
                                            Total Leave Days: {calculatedDays} {calculatedDays === 1 ? 'day' : 'days'}
                                        </p>
                                        <p className="text-xs text-blue-600">
                                            (Excluding weekends)
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Half Day Option */}
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="half_day"
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        checked={formData.half_day}
                                        onChange={handleChange}
                                        disabled={isSubmitting || calculatedDays !== 1}
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Half Day</span>
                                </label>
                                
                                {formData.half_day && (
                                    <div className="flex space-x-2">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="am_pm"
                                                value="am"
                                                className="form-radio text-indigo-600"
                                                checked={formData.am_pm === 'am'}
                                                onChange={handleChange}
                                                disabled={isSubmitting}
                                            />
                                            <span className="ml-1 text-sm text-gray-700">AM</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="am_pm"
                                                value="pm"
                                                className="form-radio text-indigo-600"
                                                checked={formData.am_pm === 'pm'}
                                                onChange={handleChange}
                                                disabled={isSubmitting}
                                            />
                                            <span className="ml-1 text-sm text-gray-700">PM</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                            
                            {/* With Pay Option */}
                            {(formData.type === 'sick' || formData.type === 'vacation') && (
                                <div>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="with_pay"
                                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            checked={formData.with_pay}
                                            onChange={handleChange}
                                            disabled={isSubmitting}
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                            With Pay (deduct from {formData.type === 'sick' ? 'Sick' : 'Vacation'} Leave bank)
                                        </span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Reason and Documents Section */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">Additional Information</h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                                    Reason <span className="text-red-600">*</span>
                                </label>
                                <textarea
                                    id="reason"
                                    name="reason"
                                    rows="4"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    placeholder="Provide a detailed reason for the leave request"
                                    value={formData.reason}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    required
                                ></textarea>
                            </div>
                            
                            <div>
                                <label htmlFor="documents" className="block text-sm font-medium text-gray-700 mb-1">
                                    Supporting Documents (Optional)
                                </label>
                                <input
                                    type="file"
                                    id="documents"
                                    name="documents"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    onChange={handleFileChange}
                                    disabled={isSubmitting}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max: 10MB)
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 border-t">
                    <button
                        type="submit"
                        className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSubmitting || hasInsufficientBalance}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Submit Leave Request'
                        )}
                    </button>
                </div>
            </form>
            
            {/* SLVL Bank Modal */}
            <SLVLBankModal 
                isOpen={showBankModal && !isSubmitting}
                onClose={() => setShowBankModal(false)}
                employee={selectedEmployeeForBank}
                bankData={selectedEmployeeForBank ? employeeBanks[selectedEmployeeForBank.id] : null}
                onRefresh={(employeeId) => fetchEmployeeBank(employeeId)}
            />
        </div>
    );
};

export default SLVLForm;