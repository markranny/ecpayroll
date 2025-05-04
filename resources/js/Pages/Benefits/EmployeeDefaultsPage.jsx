import React, { useState, useEffect, useCallback } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    Search, 
    Save,
    Plus,
    Edit,
    CheckCircle,
    ArrowLeft,
    Star,
    Loader
} from 'lucide-react';
import { debounce } from 'lodash';
import axios from 'axios';

const EditableCell = ({ value, isEditing, onChange, onSave, field, onKeyDown }) => {
    const [localValue, setLocalValue] = useState(value ? value.toString() : "0.00");
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    React.useEffect(() => {
        setLocalValue(value ? value.toString() : "0.00");
    }, [value]);

    const handleChange = (e) => {
        setLocalValue(e.target.value);
        if (onChange) {
            onChange(e.target.value);
        }
    };

    const handleBlur = () => {
        if (onSave) {
            onSave(localValue);
        }
    };

    const handleKeyDown = (e) => {
        // Handle Enter key to save
        if (e.key === 'Enter') {
            if (onSave) {
                onSave(localValue);
            }
            e.preventDefault();
        }
        
        // Pass keyboard events up to parent for navigation
        if (onKeyDown) {
            onKeyDown(e, field);
        }
    };

    return isEditing ? (
        <input
            ref={inputRef}
            type="number"
            step="0.01"
            min="0"
            className="w-full p-1 border rounded text-right"
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            data-field={field}
        />
    ) : (
        <div className="p-2 text-right text-gray-700 cursor-pointer hover:bg-gray-100">
            {parseFloat(value || 0).toFixed(2)}
        </div>
    );
};

const EmployeeDefaultsPage = () => {
    // Make sure we safely access auth and user
    const { auth } = usePage().props || {};
    const user = auth?.user || {};
    
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [alertMessage, setAlertMessage] = useState(null);
    const [editingCell, setEditingCell] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    // Define benefit fields for keyboard navigation and editing
    const benefitFields = [
        'mf_shares', 'mf_loan',
        'sss_loan', 'hmdf_loan', 'hmdf_prem', 'sss_prem', 'philhealth'
    ];

    const loadEmployeeDefaults = useCallback(async () => {
        setLoading(true);
        setAlertMessage(null);
        
        try {
            // Use absolute URL to ensure proper routing
            // Add query parameters for search and pagination
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            params.append('page', currentPage);
            
            const url = `/api/employee-defaults?${params.toString()}`;
            console.log('Requesting URL:', url);
            
            const response = await axios.get(url);
            
            console.log('API Response:', response);
            
            // More robust data validation
            if (response.data && Array.isArray(response.data.data)) {
                // Valid paginated response
                setEmployees(response.data.data);
                setCurrentPage(response.data.current_page || 1);
                setLastPage(response.data.last_page || 1);
                setTotal(response.data.total || 0);
            } else if (response.data && Array.isArray(response.data)) {
                // Handle case where the response is a direct array
                setEmployees(response.data);
                setCurrentPage(1);
                setLastPage(1);
                setTotal(response.data.length);
            } else {
                console.error('Invalid response format:', response.data);
                setAlertMessage('Error: Invalid data format received from server');
                setEmployees([]);
            }
        } catch (error) {
            console.error('Error loading employee defaults:', error);
            
            // More detailed error logging and user-friendly messages
            let errorMessage = 'Error loading employee defaults. ';
            
            if (error.response) {
                console.error('Error status:', error.response.status);
                console.error('Error data:', error.response.data);
                
                if (error.response.status === 401) {
                    errorMessage += 'Authentication required. Please log in again.';
                } else if (error.response.status === 403) {
                    errorMessage += 'You do not have permission to access this resource.';
                } else if (error.response.status === 404) {
                    errorMessage += 'API endpoint not found. Please contact support.';
                } else if (error.response.status >= 500) {
                    errorMessage += 'Server error. Please try again later.';
                } else {
                    errorMessage += error.response.data.message || 'Unknown error occurred.';
                }
            } else if (error.request) {
                console.error('Error request:', error.request);
                errorMessage += 'No response from server. Please check your connection.';
            } else {
                console.error('Error message:', error.message);
                errorMessage += error.message || 'Unknown error occurred.';
            }
            
            setAlertMessage(errorMessage);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, currentPage]);

    // Load data on component mount and when dependencies change
    useEffect(() => {
        loadEmployeeDefaults();
    }, [loadEmployeeDefaults]);

    // Debounced search to prevent too many requests
    const debouncedSearch = useCallback(
        debounce((value) => {
            setSearchTerm(value);
            setCurrentPage(1); // Reset to first page on new search
        }, 300),
        []
    );

    const handleSearch = (e) => {
        debouncedSearch(e.target.value);
    };

    const handleEditCell = (employeeId, benefitId, field) => {
        if (!benefitId) return; // No benefit to edit
        
        setEditingCell({
            employeeId,
            benefitId,
            field
        });
    };

    // Handle keyboard navigation
    const handleKeyNavigation = (e, currentField) => {
        if (!editingCell) return;
        
        const { employeeId, benefitId } = editingCell;
        const fieldIndex = benefitFields.indexOf(currentField);
        
        if (fieldIndex === -1) return;
        
        let newFieldIndex = fieldIndex;
        
        // Handle navigation
        switch (e.key) {
            case 'ArrowRight':
                newFieldIndex = Math.min(fieldIndex + 1, benefitFields.length - 1);
                e.preventDefault();
                break;
            case 'ArrowLeft':
                newFieldIndex = Math.max(0, fieldIndex - 1);
                e.preventDefault();
                break;
            case 'Tab':
                if (e.shiftKey) {
                    // Shift+Tab (move left)
                    newFieldIndex = Math.max(0, fieldIndex - 1);
                } else {
                    // Tab (move right)
                    newFieldIndex = Math.min(fieldIndex + 1, benefitFields.length - 1);
                }
                e.preventDefault();
                break;
            case 'ArrowUp':
            case 'ArrowDown':
                // Find current employee index
                const employeeIndex = employees.findIndex(emp => emp.id === employeeId);
                if (employeeIndex === -1) return;
                
                // Determine next employee index
                const nextEmployeeIndex = e.key === 'ArrowUp' 
                    ? Math.max(0, employeeIndex - 1) 
                    : Math.min(employees.length - 1, employeeIndex + 1);
                
                // Don't do anything if we're at the edge
                if (nextEmployeeIndex === employeeIndex) return;
                
                // Save current field before moving
                const inputElement = document.querySelector(`input[data-field="${currentField}"]`);
                if (inputElement && editingCell) {
                    handleCellSave(benefitId, currentField, inputElement.value);
                }
                
                // Get next employee and its benefit
                const nextEmployee = employees[nextEmployeeIndex];
                const nextBenefit = getEmployeeDefaultBenefit(nextEmployee);
                
                if (nextBenefit) {
                    // Move to same field in next employee
                    setEditingCell({
                        employeeId: nextEmployee.id,
                        benefitId: nextBenefit.id,
                        field: currentField
                    });
                }
                e.preventDefault();
                return;
            default:
                return; // Don't navigate for other keys
        }
        
        // Move to new field if changed
        if (newFieldIndex !== fieldIndex) {
            // Save current field first
            const inputElement = document.querySelector(`input[data-field="${currentField}"]`);
            if (inputElement) {
                handleCellSave(benefitId, currentField, inputElement.value);
            }
            
            // Set new editing field
            setEditingCell({
                employeeId,
                benefitId,
                field: benefitFields[newFieldIndex]
            });
        }
    };

    // Improved cell saving functionality
    const handleCellSave = async (benefitId, field, value) => {
        try {
            // Show loading indicator for better UX
            setLoading(true);
            
            const response = await axios.patch(`/benefits/${benefitId}/field`, { 
                field: field,
                value: value
            });
            
            // Update the employees state to reflect the change
            setEmployees(currentEmployees => 
                currentEmployees.map(employee => {
                    if (employee.benefits && employee.benefits.length > 0 && employee.benefits[0].id === benefitId) {
                        const updatedBenefits = [...employee.benefits];
                        updatedBenefits[0] = response.data;
                        return { ...employee, benefits: updatedBenefits };
                    }
                    return employee;
                })
            );
            
            setAlertMessage('Default benefit updated successfully');
            setTimeout(() => setAlertMessage(null), 3000);
        } catch (error) {
            console.error('Error updating benefit:', error);
            
            // More descriptive error message
            let errorMessage = 'Error updating benefit: ';
            if (error.response && error.response.data && error.response.data.message) {
                errorMessage += error.response.data.message;
            } else if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Unknown error occurred';
            }
            
            setAlertMessage(errorMessage);
            setTimeout(() => setAlertMessage(null), 5000);
        } finally {
            setLoading(false);
            setEditingCell(null);
        }
    };

    // Improved create default benefit functionality
    const createDefaultBenefit = async (employeeId) => {
        try {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];
            
            // Show temporary message
            setAlertMessage('Creating default benefit...');
            
            const response = await axios.post('/benefits', {
                employee_id: employeeId,
                cutoff: '1st', // Doesn't matter for defaults
                date: today,
                is_default: true
            });
            
            // Update the employees state to add the new benefit
            setEmployees(currentEmployees => 
                currentEmployees.map(employee => {
                    if (employee.id === employeeId) {
                        return { 
                            ...employee, 
                            benefits: [response.data, ...(employee.benefits || [])] 
                        };
                    }
                    return employee;
                })
            );
            
            setAlertMessage('New default benefit created');
            setTimeout(() => setAlertMessage(null), 3000);
        } catch (error) {
            console.error('Error creating default benefit:', error);
            
            // More descriptive error message
            let errorMessage = 'Error creating default benefit: ';
            if (error.response && error.response.data && error.response.data.message) {
                errorMessage += error.response.data.message;
            } else if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Unknown error occurred';
            }
            
            setAlertMessage(errorMessage);
            setTimeout(() => setAlertMessage(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    // Format employee name
    const formatEmployeeName = (employee) => {
        return `${employee.Lname}, ${employee.Fname} ${employee.MName || ''}`.trim();
    };

    // Get default benefit for an employee or null if none exists
    const getEmployeeDefaultBenefit = (employee) => {
        return employee.benefits && employee.benefits.length > 0 ? employee.benefits[0] : null;
    };

    // Handle pagination
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Refresh data function
    const refreshData = () => {
        loadEmployeeDefaults();
    };

    return (
        <AuthenticatedLayout user={user}>
            <Head title="Employee Default Benefits" />
            <div className="flex min-h-screen bg-gray-50/50">
                <Sidebar />
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        {alertMessage && (
                            <Alert className="mb-4">
                                <AlertDescription>{alertMessage}</AlertDescription>
                            </Alert>
                        )}

                        {/* Header Section */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    Employee Default Benefits
                                </h1>
                                <p className="text-gray-600">
                                    Manage default benefit values that will be used for new benefit entries.
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <Button
                                    onClick={refreshData}
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                                    disabled={loading}
                                >
                                    {loading ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Edit className="w-5 h-5 mr-2" />}
                                    Refresh Data
                                </Button>
                                <Button
                                    onClick={() => router.visit('/benefits')}
                                    className="px-5 py-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors duration-200 flex items-center"
                                >
                                    <ArrowLeft className="w-5 h-5 mr-2" />
                                    Back to Benefits
                                </Button>
                            </div>
                        </div>

                        {/* Search Field */}
                        <div className="flex gap-4 mb-6">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    onChange={handleSearch}
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-lg shadow">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Employee
                                            </th>
                                            {benefitFields.map((field) => (
                                                <th key={field} scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    {field.replace('_', ' ')}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={9} className="px-4 py-4 text-center text-gray-500">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <Loader className="h-5 w-5 animate-spin text-blue-500" />
                                                        <span>Loading employee data...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : employees.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="px-4 py-4 text-center text-gray-500">
                                                    No employees found
                                                </td>
                                            </tr>
                                        ) : (
                                            employees.map((employee) => {
                                                const benefit = getEmployeeDefaultBenefit(employee);
                                                
                                                return (
                                                    <tr key={employee.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex space-x-2">
                                                                {benefit ? (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="p-2 bg-yellow-50"
                                                                        title="Default Values Set"
                                                                    >
                                                                        <Star className="h-4 w-4 text-yellow-500" />
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="p-2"
                                                                        onClick={() => createDefaultBenefit(employee.id)}
                                                                        title="Create Default Values"
                                                                        disabled={loading}
                                                                    >
                                                                        <Plus className="h-4 w-4 text-blue-600" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {formatEmployeeName(employee)}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    {employee.Department || 'N/A'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        
                                                        {/* Benefit cells */}
                                                        {benefitFields.map((field) => (
                                                            <td 
                                                                key={field} 
                                                                className="px-4 py-3 whitespace-nowrap relative"
                                                                onClick={() => benefit && handleEditCell(employee.id, benefit.id, field)}
                                                            >
                                                                {benefit ? (
                                                                    <EditableCell 
                                                                        value={benefit[field] || 0}
                                                                        isEditing={
                                                                            editingCell?.employeeId === employee.id && 
                                                                            editingCell?.benefitId === benefit.id && 
                                                                            editingCell?.field === field
                                                                        }
                                                                        onSave={(value) => handleCellSave(benefit.id, field, value)}
                                                                        onKeyDown={handleKeyNavigation}
                                                                        field={field}
                                                                    />
                                                                ) : (
                                                                    <div className="p-2 text-right text-gray-400">0.00</div>
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination */}
                            {total > 0 && (
                                <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Showing <span className="font-medium">{(currentPage - 1) * 50 + 1}</span> to{' '}
                                                <span className="font-medium">
                                                    {Math.min(currentPage * 50, total)}
                                                </span>{' '}
                                                of <span className="font-medium">{total}</span> results
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                {/* Previous Page Button */}
                                                <button
                                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                                    disabled={currentPage === 1 || loading}
                                                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                                                        currentPage === 1 || loading
                                                            ? 'text-gray-300 cursor-not-allowed'
                                                            : 'text-gray-500 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    Previous
                                                </button>
                                                
                                                {/* Page Numbers */}
                                                {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                                                    // Show pages around current page
                                                    const pageOffset = Math.max(0, currentPage - 3);
                                                    const pageNum = i + 1 + pageOffset;
                                                    if (pageNum > lastPage) return null;
                                                    
                                                    return (
                                                        <button
                                                            key={pageNum}
                                                            onClick={() => handlePageChange(pageNum)}
                                                            disabled={loading}
                                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                                currentPage === pageNum
                                                                    ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                })}
                                                
                                                {/* Next Page Button */}
                                                <button
                                                    onClick={() => handlePageChange(Math.min(lastPage, currentPage + 1))}
                                                    disabled={currentPage === lastPage || loading}
                                                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                                                        currentPage === lastPage || loading
                                                            ? 'text-gray-300 cursor-not-allowed'
                                                            : 'text-gray-500 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    Next
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
};

export default EmployeeDefaultsPage;