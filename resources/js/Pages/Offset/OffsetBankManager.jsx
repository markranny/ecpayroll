import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, RefreshCw, Loader2 } from 'lucide-react';
import { router } from '@inertiajs/react';

const OffsetBankManager = ({ employees }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState(employees || []);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [bankDetails, setBankDetails] = useState(null);
    
    // Add hours form state
    const [addHoursForm, setAddHoursForm] = useState({
        employee_id: '',
        employee_name: '',
        hours: '',
        notes: ''
    });
    
    // Add Hours modal
    const [showAddHoursModal, setShowAddHoursModal] = useState(false);
    const [isSubmittingHours, setIsSubmittingHours] = useState(false);
    
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
            // Fetch offset bank details for the employee
            const response = await fetch(`/offsets/bank/${employee.id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch offset bank details');
            }
            
            const data = await response.json();
            setBankDetails(data);
        } catch (error) {
            console.error('Error fetching offset bank details:', error);
            alert('Failed to fetch offset bank details. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handle opening the add hours modal
    const handleOpenAddHoursModal = (employee) => {
        setAddHoursForm({
            employee_id: employee.id,
            employee_name: employee.name,
            hours: '',
            notes: ''
        });
        setShowAddHoursModal(true);
    };
    
    // Handle add hours form submission
    const handleAddHours = () => {
        if (!addHoursForm.hours || addHoursForm.hours <= 0) {
            alert('Please enter a valid number of hours');
            return;
        }
        
        setIsSubmittingHours(true);
        
        router.post(route('offsets.addHoursToBank'), addHoursForm, {
            onSuccess: (page) => {
                setShowAddHoursModal(false);
                setIsSubmittingHours(false);
                
                // Refresh the bank details
                if (selectedEmployee && selectedEmployee.id === addHoursForm.employee_id) {
                    handleSelectEmployee(selectedEmployee);
                }
                
                // Show success message if available in response
                if (page.props?.flash?.message) {
                    // Success message will be handled by toast in parent component
                }
            },
            onError: (errors) => {
                setIsSubmittingHours(false);
                
                if (errors && typeof errors === 'object') {
                    Object.keys(errors).forEach(key => {
                        alert(errors[key]);
                    });
                } else {
                    alert('An error occurred while adding hours');
                }
            },
            onFinish: () => {
                setIsSubmittingHours(false);
            }
        });
    };
    
    // Format date safely
    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        
        try {
            return format(new Date(dateString), 'yyyy-MM-dd h:mm a');
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid date';
        }
    };
    
    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Offset Bank Manager</h3>
                <p className="text-sm text-gray-500">View and manage employees' offset hours bank</p>
            </div>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Employee List */}
                <div className="md:col-span-1 border rounded-lg overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b">
                        <h4 className="font-medium mb-3">Employees</h4>
                        
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
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Hours Available
                                    </th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-3 text-center text-sm text-gray-500">
                                            No employees found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmployees.map(employee => (
                                        <tr 
                                            key={employee.id} 
                                            className={`hover:bg-gray-50 cursor-pointer ${
                                                selectedEmployee?.id === employee.id ? 'bg-indigo-50' : ''
                                            }`}
                                            onClick={() => handleSelectEmployee(employee)}
                                        >
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {employee.name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {employee.idno} • {employee.department}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                                <span className={`font-medium ${employee.remaining_hours > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {employee.remaining_hours} hrs
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenAddHoursModal(employee);
                                                    }}
                                                >
                                                    Add Hours
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* Offset Bank Details */}
                <div className="md:col-span-2 border rounded-lg">
                    {!selectedEmployee ? (
                        <div className="h-full flex items-center justify-center text-gray-500 p-8">
                            <div className="text-center">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No employee selected</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Select an employee from the list to view their offset bank details.
                                </p>
                            </div>
                        </div>
                    ) : isLoading ? (
                        <div className="h-full flex items-center justify-center p-8">
                            <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
                            <span className="ml-2 text-gray-600">Loading bank details...</span>
                        </div>
                    ) : (
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {selectedEmployee.name} - Offset Bank
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Employee ID: {selectedEmployee.idno} • Department: {selectedEmployee.department}
                                    </p>
                                </div>
                                <button
                                    className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    onClick={() => handleOpenAddHoursModal(selectedEmployee)}
                                >
                                    Add Hours
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="text-sm text-green-700 mb-1">Total Hours Added</div>
                                    <div className="text-2xl font-bold text-green-800">
                                        {bankDetails?.offset_bank?.total_hours || 0} hrs
                                    </div>
                                </div>
                                
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="text-sm text-blue-700 mb-1">Hours Used</div>
                                    <div className="text-2xl font-bold text-blue-800">
                                        {bankDetails?.offset_bank?.used_hours || 0} hrs
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <div className="text-sm text-gray-700 mb-1">Remaining Hours</div>
                                    <div className="text-2xl font-bold text-gray-800">
                                        {bankDetails?.offset_bank?.remaining_hours || 0} hrs
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mb-6">
                                <h4 className="text-md font-medium text-gray-900 mb-2">Bank Details</h4>
                                <div className="border rounded-md overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-sm font-medium text-gray-500">Last Updated</div>
                                            <div className="text-sm text-gray-900">
                                                {formatDate(bankDetails?.offset_bank?.last_updated)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-500">Notes</div>
                                            <div className="text-sm text-gray-900">
                                                {bankDetails?.offset_bank?.notes || 'No notes available'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="text-md font-medium text-gray-900 mb-2">Recent Offset Activity</h4>
                                <p className="text-sm text-gray-500 mb-4">
                                    To view detailed offset activity, go to the Offset Requests tab.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Add Hours Modal */}
            {showAddHoursModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                                            Add Hours to Offset Bank
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                Add hours to {addHoursForm.employee_name}'s offset bank.
                                            </p>
                                        </div>
                                        
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Hours to Add
                                            </label>
                                            <input
                                                type="number"
                                                min="0.5"
                                                step="0.5"
                                                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full"
                                                value={addHoursForm.hours}
                                                onChange={(e) => setAddHoursForm({
                                                    ...addHoursForm,
                                                    hours: e.target.value
                                                })}
                                                disabled={isSubmittingHours}
                                            />
                                        </div>
                                        
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Notes (Optional)
                                            </label>
                                            <textarea
                                                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full"
                                                rows="3"
                                                value={addHoursForm.notes}
                                                onChange={(e) => setAddHoursForm({
                                                    ...addHoursForm,
                                                    notes: e.target.value
                                                })}
                                                placeholder="Explain why these hours are being added"
                                                disabled={isSubmittingHours}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                                        isSubmittingHours 
                                            ? 'bg-gray-400 cursor-not-allowed' 
                                            : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                                    }`}
                                    onClick={handleAddHours}
                                    disabled={isSubmittingHours}
                                >
                                    {isSubmittingHours ? (
                                        <>
                                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                            Adding...
                                        </>
                                    ) : (
                                        'Add Hours'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setShowAddHoursModal(false)}
                                    disabled={isSubmittingHours}
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

export default OffsetBankManager;