import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Calendar, Plus, Eye } from 'lucide-react';
import { router } from '@inertiajs/react';

const SLVLBankManager = ({ employees }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState(employees || []);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [bankDetails, setBankDetails] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    // Add days form state
    const [addDaysForm, setAddDaysForm] = useState({
        employee_id: '',
        employee_name: '',
        leave_type: 'sick',
        days: '',
        year: new Date().getFullYear(),
        notes: ''
    });
    
    // Add Days modal
    const [showAddDaysModal, setShowAddDaysModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Generate year options (current year ± 3 years)
    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let year = currentYear - 3; year <= currentYear + 3; year++) {
        yearOptions.push(year);
    }
    
    // Update filtered employees when search term changes
    useEffect(() => {
        if (!employees) return;
        
        let result = [...employees];
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(employee => 
                employee.name.toLowerCase().includes(term) || 
                employee.idno?.toString().includes(term) ||
                employee.department?.toLowerCase().includes(term)
            );
        }
        
        setFilteredEmployees(result);
    }, [searchTerm, employees]);
    
    // Handle selecting an employee to view details
    const handleSelectEmployee = async (employee) => {
        setSelectedEmployee(employee);
        setIsLoading(true);
        
        try {
            // Fetch SLVL bank details for the employee
            const response = await fetch(`/slvl/bank/${employee.id}?year=${selectedYear}`);
            if (!response.ok) {
                throw new Error('Failed to fetch SLVL bank details');
            }
            
            const data = await response.json();
            setBankDetails(data);
        } catch (error) {
            console.error('Error fetching SLVL bank details:', error);
            alert('Failed to fetch SLVL bank details. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handle year change
    const handleYearChange = (year) => {
        setSelectedYear(year);
        if (selectedEmployee) {
            handleSelectEmployee(selectedEmployee);
        }
    };
    
    // Handle opening the add days modal
    const handleOpenAddDaysModal = (employee, leaveType = 'sick') => {
        setAddDaysForm({
            employee_id: employee.id,
            employee_name: employee.name,
            leave_type: leaveType,
            days: '',
            year: selectedYear,
            notes: ''
        });
        setShowAddDaysModal(true);
    };
    
    // Handle add days form change
    const handleAddDaysFormChange = (field, value) => {
        setAddDaysForm(prev => ({
            ...prev,
            [field]: value
        }));
    };
    
    // Handle add days form submission
    const handleAddDays = () => {
        if (!addDaysForm.days || addDaysForm.days <= 0) {
            alert('Please enter a valid number of days');
            return;
        }
        
        if (addDaysForm.days > 100) {
            alert('Maximum 100 days can be added at once');
            return;
        }
        
        setSubmitting(true);
        
        // Create form data object for Inertia
        const formData = {
            employee_id: parseInt(addDaysForm.employee_id),
            leave_type: addDaysForm.leave_type,
            days: parseFloat(addDaysForm.days),
            year: parseInt(addDaysForm.year),
            notes: addDaysForm.notes || ''
        };
        
        router.post(route('slvl.addDaysToBank'), formData, {
            preserveScroll: true,
            onSuccess: (page) => {
                setSubmitting(false);
                setShowAddDaysModal(false);
                
                // Show success message from flash
                if (page.props?.flash?.message) {
                    alert(page.props.flash.message);
                } else {
                    alert(`Successfully added ${addDaysForm.days} ${addDaysForm.leave_type} leave days to ${addDaysForm.employee_name}'s bank`);
                }
                
                // Refresh the bank details if viewing the same employee
                if (selectedEmployee && selectedEmployee.id === addDaysForm.employee_id) {
                    handleSelectEmployee(selectedEmployee);
                }
                
                // Reset form
                setAddDaysForm({
                    employee_id: '',
                    employee_name: '',
                    leave_type: 'sick',
                    days: '',
                    year: selectedYear,
                    notes: ''
                });
                
                // Reload the page to get fresh data
                window.location.reload();
            },
            onError: (errors) => {
                setSubmitting(false);
                console.error('Error adding days:', errors);
                
                if (errors && typeof errors === 'object') {
                    const errorMessages = Object.values(errors).flat();
                    alert('Error: ' + errorMessages.join(', '));
                } else {
                    alert('An error occurred while adding days');
                }
            }
        });
    };
    
    // Handle close modal
    const handleCloseModal = () => {
        if (submitting) return; // Prevent closing while submitting
        
        setShowAddDaysModal(false);
        setAddDaysForm({
            employee_id: '',
            employee_name: '',
            leave_type: 'sick',
            days: '',
            year: selectedYear,
            notes: ''
        });
    };
    
    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold">SLVL Bank Manager</h3>
                        <p className="text-sm text-gray-500">View and manage employees' sick leave and vacation leave bank</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="year-select" className="text-sm font-medium text-gray-700">Year:</label>
                        <select
                            id="year-select"
                            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            value={selectedYear}
                            onChange={(e) => handleYearChange(parseInt(e.target.value))}
                        >
                            {yearOptions.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            
            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Employee List */}
                <div className="lg:col-span-1 border rounded-lg overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b">
                        <h4 className="font-medium mb-3">Employees ({filteredEmployees.length})</h4>
                        
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search employees..."
                                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-auto max-h-[500px]">
                        {filteredEmployees.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                <p>No employees found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {filteredEmployees.map(employee => (
                                    <div 
                                        key={employee.id} 
                                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                            selectedEmployee?.id === employee.id ? 'bg-indigo-50 border-r-2 border-indigo-500' : ''
                                        }`}
                                        onClick={() => handleSelectEmployee(employee)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 truncate">
                                                    {employee.name}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    ID: {employee.idno}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {employee.department}
                                                </div>
                                            </div>
                                            <div className="ml-2 flex flex-col items-end space-y-1">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-gray-500">SL:</span>
                                                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                                                        employee.sick_leave_days > 0 
                                                            ? 'bg-blue-100 text-blue-800' 
                                                            : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {employee.sick_leave_days || 0}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-gray-500">VL:</span>
                                                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                                                        employee.vacation_leave_days > 0 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {employee.vacation_leave_days || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* SLVL Bank Details */}
                <div className="lg:col-span-2 border rounded-lg">
                    {!selectedEmployee ? (
                        <div className="h-full flex items-center justify-center text-gray-500 p-8">
                            <div className="text-center">
                                <Calendar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No employee selected</h3>
                                <p className="text-sm text-gray-500">
                                    Select an employee from the list to view their SLVL bank details.
                                </p>
                            </div>
                        </div>
                    ) : isLoading ? (
                        <div className="h-full flex items-center justify-center p-8">
                            <div className="text-center">
                                <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mx-auto mb-4" />
                                <span className="text-gray-600">Loading bank details...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        {selectedEmployee.name}
                                    </h3>
                                    <div className="text-sm text-gray-500 mt-1 space-y-1">
                                        <div>Employee ID: <span className="font-medium">{selectedEmployee.idno}</span></div>
                                        <div>Department: <span className="font-medium">{selectedEmployee.department}</span></div>
                                        <div>Position: <span className="font-medium">{selectedEmployee.position}</span></div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-500">Viewing Year</div>
                                    <div className="text-lg font-semibold text-gray-900">{selectedYear}</div>
                                </div>
                            </div>
                            
                            {/* Leave Banks */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {/* Sick Leave Bank */}
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h4 className="text-lg font-semibold text-blue-800">Sick Leave</h4>
                                                <p className="text-sm text-blue-600">Medical leave bank</p>
                                            </div>
                                        </div>
                                        <button
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm flex items-center space-x-1 transition-colors"
                                            onClick={() => handleOpenAddDaysModal(selectedEmployee, 'sick')}
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Add</span>
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-blue-700 font-medium">Total Days</span>
                                            <span className="text-2xl font-bold text-blue-900">
                                                {bankDetails?.slvl_banks?.sick?.total_days || 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-blue-600">Used Days</span>
                                            <span className="text-lg font-semibold text-blue-800">
                                                {bankDetails?.slvl_banks?.sick?.used_days || 0}
                                            </span>
                                        </div>
                                        <div className="border-t border-blue-300 pt-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-blue-800 font-semibold">Available</span>
                                                <span className="text-3xl font-bold text-blue-900">
                                                    {bankDetails?.slvl_banks?.sick?.remaining_days || 0}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Progress Bar */}
                                        <div className="mt-3">
                                            <div className="flex justify-between text-xs text-blue-600 mb-1">
                                                <span>Usage</span>
                                                <span>
                                                    {Math.round(((bankDetails?.slvl_banks?.sick?.used_days || 0) / 
                                                    Math.max(bankDetails?.slvl_banks?.sick?.total_days || 1, 1)) * 100)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-blue-200 rounded-full h-2">
                                                <div 
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                                    style={{
                                                        width: `${Math.min(((bankDetails?.slvl_banks?.sick?.used_days || 0) / 
                                                        Math.max(bankDetails?.slvl_banks?.sick?.total_days || 1, 1)) * 100, 100)}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Vacation Leave Bank */}
                                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h4 className="text-lg font-semibold text-green-800">Vacation Leave</h4>
                                                <p className="text-sm text-green-600">Rest and recreation</p>
                                            </div>
                                        </div>
                                        <button
                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm flex items-center space-x-1 transition-colors"
                                            onClick={() => handleOpenAddDaysModal(selectedEmployee, 'vacation')}
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Add</span>
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-green-700 font-medium">Total Days</span>
                                            <span className="text-2xl font-bold text-green-900">
                                                {bankDetails?.slvl_banks?.vacation?.total_days || 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-green-600">Used Days</span>
                                            <span className="text-lg font-semibold text-green-800">
                                                {bankDetails?.slvl_banks?.vacation?.used_days || 0}
                                            </span>
                                        </div>
                                        <div className="border-t border-green-300 pt-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-green-800 font-semibold">Available</span>
                                                <span className="text-3xl font-bold text-green-900">
                                                    {bankDetails?.slvl_banks?.vacation?.remaining_days || 0}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Progress Bar */}
                                        <div className="mt-3">
                                            <div className="flex justify-between text-xs text-green-600 mb-1">
                                                <span>Usage</span>
                                                <span>
                                                    {Math.round(((bankDetails?.slvl_banks?.vacation?.used_days || 0) / 
                                                    Math.max(bankDetails?.slvl_banks?.vacation?.total_days || 1, 1)) * 100)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-green-200 rounded-full h-2">
                                                <div 
                                                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                                                    style={{
                                                        width: `${Math.min(((bankDetails?.slvl_banks?.vacation?.used_days || 0) / 
                                                        Math.max(bankDetails?.slvl_banks?.vacation?.total_days || 1, 1)) * 100, 100)}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Bank Details */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                <h4 className="text-md font-medium text-gray-900 mb-3">Bank Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm font-medium text-gray-700 mb-1">Sick Leave Notes</div>
                                        <div className="text-sm text-gray-600 bg-white p-2 rounded border">
                                            {bankDetails?.slvl_banks?.sick?.notes || 'No notes available'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-700 mb-1">Vacation Leave Notes</div>
                                        <div className="text-sm text-gray-600 bg-white p-2 rounded border">
                                            {bankDetails?.slvl_banks?.vacation?.notes || 'No notes available'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Quick Actions */}
                            <div className="border-t pt-4">
                                <h4 className="text-md font-medium text-gray-900 mb-3">Quick Actions</h4>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-2 rounded-md text-sm flex items-center space-x-1 transition-colors"
                                        onClick={() => handleOpenAddDaysModal(selectedEmployee, 'sick')}
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Add Sick Leave</span>
                                    </button>
                                    <button
                                        className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-md text-sm flex items-center space-x-1 transition-colors"
                                        onClick={() => handleOpenAddDaysModal(selectedEmployee, 'vacation')}
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Add Vacation Leave</span>
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 mt-3">
                                    To view detailed leave history, go to the SLVL Requests tab.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Add Days Modal */}
            {showAddDaysModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <Calendar className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                                            Add Days to SLVL Bank
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                Add {addDaysForm.leave_type === 'sick' ? 'sick leave' : 'vacation leave'} days to <strong>{addDaysForm.employee_name}</strong>'s bank for year {addDaysForm.year}.
                                            </p>
                                        </div>
                                        
                                        <div className="mt-4 space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Leave Type <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                    value={addDaysForm.leave_type}
                                                    onChange={(e) => handleAddDaysFormChange('leave_type', e.target.value)}
                                                    disabled={submitting}
                                                >
                                                    <option value="sick">Sick Leave</option>
                                                    <option value="vacation">Vacation Leave</option>
                                                </select>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Days to Add <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0.5"
                                                    max="100"
                                                    step="0.5"
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                    value={addDaysForm.days}
                                                    onChange={(e) => handleAddDaysFormChange('days', e.target.value)}
                                                    placeholder="Enter number of days"
                                                    disabled={submitting}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Maximum 100 days can be added at once</p>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Year <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                    value={addDaysForm.year}
                                                    onChange={(e) => handleAddDaysFormChange('year', parseInt(e.target.value))}
                                                    disabled={submitting}
                                                >
                                                    {yearOptions.map(year => (
                                                        <option key={year} value={year}>{year}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Notes (Optional)
                                                </label>
                                                <textarea
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                    rows="3"
                                                    value={addDaysForm.notes}
                                                    onChange={(e) => handleAddDaysFormChange('notes', e.target.value)}
                                                    placeholder="Explain why these days are being added (e.g., Annual allocation, Adjustment, etc.)"
                                                    disabled={submitting}
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={handleAddDays}
                                    disabled={!addDaysForm.days || addDaysForm.days <= 0 || submitting}
                                >
                                    {submitting ? 'Adding Days...' : 'Add Days'}
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={handleCloseModal}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SLVLBankManager;