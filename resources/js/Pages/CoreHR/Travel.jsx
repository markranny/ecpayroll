
import React, { useState, useEffect, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    Search, 
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    ArrowUp,
    CheckCircle,
    XCircle,
    Clock,
    Check,
    MapPin,
    Car,
    Calendar,
    DollarSign,
    User,
    Users
} from 'lucide-react';
import { debounce } from 'lodash';
import axios from 'axios';
import Modal from '@/Components/Modal';
import ConfirmModal from '@/Components/ConfirmModal';

// Toast Component
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        
        return () => clearTimeout(timer);
    }, [onClose]);
    
    const bgColor = type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
    const textColor = type === 'success' ? 'text-green-700' : 'text-red-700';
    const icon = type === 'success' ? <Check className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />;
    
    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center p-4 mb-4 rounded-lg shadow-md border ${bgColor}`} role="alert">
            <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg">
                {icon}
            </div>
            <div className={`ml-3 text-sm font-normal ${textColor}`}>{message}</div>
            <button 
                type="button" 
                className={`ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 p-1.5 inline-flex h-8 w-8 ${textColor} hover:bg-gray-100`} 
                onClick={onClose}
                aria-label="Close"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
    if (status === 'approved') {
        return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Approved
            </span>
        );
    } else if (status === 'rejected') {
        return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <XCircle className="w-3 h-3 mr-1" />
                Rejected
            </span>
        );
    } else if (status === 'completed') {
        return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Check className="w-3 h-3 mr-1" />
                Completed
            </span>
        );
    } else if (status === 'cancelled') {
        return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                <X className="w-3 h-3 mr-1" />
                Cancelled
            </span>
        );
    } else {
        return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <Clock className="w-3 h-3 mr-1" />
                Pending
            </span>
        );
    }
};

// Travel Order Modal Component
const TravelOrderModal = ({ 
    isOpen, 
    onClose, 
    title, 
    travelOrder, 
    employees = [],
    departments = [],
    onChange, 
    onSubmit, 
    mode = 'create',
    errorMessages = {}
}) => {
    const isViewMode = mode === 'view';
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [departmentFilter, setDepartmentFilter] = useState('');
    
    // Debug logging
    useEffect(() => {
        if (isOpen) {
            console.log('Modal opened with employees:', employees?.length || 0);
            console.log('Departments:', departments);
            console.log('Current travel order:', travelOrder);
        }
    }, [isOpen, employees, departments, travelOrder]);
    
    // Initialize filtered employees when modal opens or employees/departments change
    useEffect(() => {
        if (isOpen) {
            // Reset search and department filters
            setEmployeeSearchTerm('');
            setDepartmentFilter('');
            
            // Initialize employee selection from travel order
            if (travelOrder && travelOrder.employee_ids) {
                setSelectedEmployees(Array.isArray(travelOrder.employee_ids) ? 
                    travelOrder.employee_ids : 
                    []);
            } else {
                setSelectedEmployees([]);
            }
            
            // Set filtered employees based on current filters (none at this point)
            const emps = Array.isArray(employees) ? employees : [];
            console.log(`Setting filtered employees: ${emps.length} items`);
            setFilteredEmployees(emps);
        }
    }, [isOpen, employees, travelOrder]);
    
    // Filter employees based on search term and department
    useEffect(() => {
        // Ensure employees is an array
        if (!Array.isArray(employees)) {
            console.warn('employees is not an array:', employees);
            setFilteredEmployees([]);
            return;
        }
        
        let filtered = [...employees];
        
        // Apply department filter if selected
        if (departmentFilter) {
            filtered = filtered.filter(employee => employee.Department === departmentFilter);
        }
        
        // Apply search filter if provided
        if (employeeSearchTerm.trim()) {
            const searchTermLower = employeeSearchTerm.toLowerCase();
            filtered = filtered.filter(employee => {
                const firstName = (employee.Fname || '').toLowerCase();
                const lastName = (employee.Lname || '').toLowerCase();
                const idNo = (employee.idno || '').toLowerCase();
                const fullName = `${firstName} ${lastName}`.toLowerCase();
                const fullNameReversed = `${lastName} ${firstName}`.toLowerCase();
                
                return firstName.includes(searchTermLower) || 
                       lastName.includes(searchTermLower) || 
                       idNo.includes(searchTermLower) ||
                       fullName.includes(searchTermLower) ||
                       fullNameReversed.includes(searchTermLower);
            });
        }
        
        console.log(`Filtered employees: ${filtered.length} matches`);
        setFilteredEmployees(filtered);
    }, [employeeSearchTerm, departmentFilter, employees]);
    
    // Helper for transportation type display
    const getTransportationTypeLabel = (value) => {
        const types = {
            'company_vehicle': 'Company Vehicle',
            'personal_vehicle': 'Personal Vehicle',
            'public_transport': 'Public Transport',
            'plane': 'Plane',
            'other': 'Other'
        };
        return types[value] || value;
    };
    
    // Toggle employee selection
    const toggleEmployeeSelection = (employeeId) => {
        let newSelectedIds;
        
        if (selectedEmployees.includes(employeeId)) {
            newSelectedIds = selectedEmployees.filter(id => id !== employeeId);
        } else {
            newSelectedIds = [...selectedEmployees, employeeId];
        }
        
        setSelectedEmployees(newSelectedIds);
        onChange({...travelOrder, employee_ids: newSelectedIds});
    };
    
    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="2xl">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <form onSubmit={onSubmit} className="space-y-4">
                    {/* Employee Selection Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee(s)</label>
                        {isViewMode ? (
                            <div className="p-2 border rounded bg-gray-50">
                                {travelOrder.employee ? `${travelOrder.employee.Lname || ''}, ${travelOrder.employee.Fname || ''} ${travelOrder.employee.idno ? `(${travelOrder.employee.idno})` : ''}` : 'Unknown Employee'}
                            </div>
                        ) : (
                            <>
                                <div className="mb-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {/* Search Input */}
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            placeholder="Search employees by name or ID..."
                                            value={employeeSearchTerm}
                                            onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    
                                    {/* Department Filter */}
<div>
    <select
        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        value={departmentFilter}
        onChange={(e) => setDepartmentFilter(e.target.value)}
    >
        <option value="">All Departments</option>
        {Array.isArray(departments) && departments.map((dept, index) => (
            <option key={`dept-${dept.id || index}`} value={dept.name || dept}>
                {dept.name || dept}
            </option>
        ))}
    </select>
</div>
                                </div>
                                
                                <div className="text-xs text-gray-500 mb-2">
                                    {filteredEmployees.length === 0 ? 
                                        "No matching employees found" : 
                                        filteredEmployees.length === 1 ? 
                                            "1 employee found" : 
                                            `${filteredEmployees.length} employees found`
                                    }
                                    {selectedEmployees.length > 0 && 
                                        ` - ${selectedEmployees.length} employee${selectedEmployees.length > 1 ? 's' : ''} selected`
                                    }
                                </div>
                                
                                {/* Employee List */}
                                <div className="max-h-40 overflow-y-auto border rounded-md">
                                    {filteredEmployees.length > 0 ? (
                                        <div className="divide-y divide-gray-200">
                                            {filteredEmployees.map(employee => (
                                                <div 
                                                    key={employee.id} 
                                                    className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                                                    onClick={() => toggleEmployeeSelection(employee.id)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                        checked={selectedEmployees.includes(employee.id)}
                                                        onChange={() => {}}
                                                    />
                                                    <div className="ml-3">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {employee.Lname}, {employee.Fname} {employee.MName || ''}
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex space-x-2">
                                                            <span>{employee.idno || 'No ID'}</span>
                                                            <span>•</span>
                                                            <span>{employee.Department || 'No Dept'}</span>
                                                            <span>•</span>
                                                            <span>{employee.Jobtitle || 'No Title'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-3 text-center text-gray-500 text-sm">
                                            No employees found matching your criteria
                                        </div>
                                    )}
                                </div>
                                
                                {errorMessages.employee_ids && (
                                    <p className="mt-1 text-sm text-red-600">{errorMessages.employee_ids}</p>
                                )}
                            </>
                        )}
                    </div>
                    
                    {/* Form Date & Travel Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Form Date</label>
                            {isViewMode ? (
                                <div className="p-2 border rounded bg-gray-50">
                                    {travelOrder.date ? new Date(travelOrder.date).toLocaleDateString() : ''}
                                </div>
                            ) : (
                                <input
                                    type="date"
                                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.date ? 'border-red-500' : ''}`}
                                    value={travelOrder.date || ''}
                                    onChange={(e) => onChange({...travelOrder, date: e.target.value})}
                                    required
                                />
                            )}
                            {errorMessages.date && <p className="mt-1 text-sm text-red-600">{errorMessages.date}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            {isViewMode ? (
                                <div className="p-2 border rounded bg-gray-50">
                                    {travelOrder.start_date ? new Date(travelOrder.start_date).toLocaleDateString() : ''}
                                </div>
                            ) : (
                                <input
                                    type="date"
                                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.start_date ? 'border-red-500' : ''}`}
                                    value={travelOrder.start_date || ''}
                                    onChange={(e) => onChange({...travelOrder, start_date: e.target.value})}
                                    required
                                />
                            )}
                            {errorMessages.start_date && <p className="mt-1 text-sm text-red-600">{errorMessages.start_date}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            {isViewMode ? (
                                <div className="p-2 border rounded bg-gray-50">
                                    {travelOrder.end_date ? new Date(travelOrder.end_date).toLocaleDateString() : ''}
                                </div>
                            ) : (
                                <input
                                    type="date"
                                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.end_date ? 'border-red-500' : ''}`}
                                    value={travelOrder.end_date || ''}
                                    onChange={(e) => onChange({...travelOrder, end_date: e.target.value})}
                                    required
                                />
                            )}
                            {errorMessages.end_date && <p className="mt-1 text-sm text-red-600">{errorMessages.end_date}</p>}
                        </div>
                    </div>
                    
                    {/* Destination & Transportation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                            {isViewMode ? (
                                <div className="p-2 border rounded bg-gray-50">
                                    {travelOrder.destination || ''}
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.destination ? 'border-red-500' : ''}`}
                                    value={travelOrder.destination || ''}
                                    onChange={(e) => onChange({...travelOrder, destination: e.target.value})}
                                    placeholder="e.g. Manila, Philippines"
                                    required
                                />
                            )}
                            {errorMessages.destination && <p className="mt-1 text-sm text-red-600">{errorMessages.destination}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Transportation Type</label>
                            {isViewMode ? (
                                <div className="p-2 border rounded bg-gray-50">
                                    {getTransportationTypeLabel(travelOrder.transportation_type) || ''}
                                </div>
                            ) : (
                                <select
                                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.transportation_type ? 'border-red-500' : ''}`}
                                    value={travelOrder.transportation_type || ''}
                                    onChange={(e) => onChange({...travelOrder, transportation_type: e.target.value})}
                                    required
                                >
                                    <option value="">Select Transportation</option>
                                    <option value="company_vehicle">Company Vehicle</option>
                                    <option value="personal_vehicle">Personal Vehicle</option>
                                    <option value="public_transport">Public Transport</option>
                                    <option value="plane">Plane</option>
                                    <option value="other">Other</option>
                                </select>
                            )}
                            {errorMessages.transportation_type && <p className="mt-1 text-sm text-red-600">{errorMessages.transportation_type}</p>}
                        </div>
                    </div>
                    
                    {/* Purpose */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                        {isViewMode ? (
                            <div className="p-2 border rounded bg-gray-50 whitespace-pre-line min-h-[80px]">
                                {travelOrder.purpose || ''}
                            </div>
                        ) : (
                            <textarea
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.purpose ? 'border-red-500' : ''}`}
                                value={travelOrder.purpose || ''}
                                onChange={(e) => onChange({...travelOrder, purpose: e.target.value})}
                                placeholder="Detailed purpose of travel"
                                rows="3"
                                required
                            />
                        )}
                        {errorMessages.purpose && <p className="mt-1 text-sm text-red-600">{errorMessages.purpose}</p>}
                    </div>
                    
                    {/* Allowances & Requirements */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Accommodation Required</label>
                            {isViewMode ? (
                                <div className="p-2 border rounded bg-gray-50">
                                    {travelOrder.accommodation_required ? 'Yes' : 'No'}
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="accommodation_required"
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        checked={travelOrder.accommodation_required || false}
                                        onChange={(e) => onChange({...travelOrder, accommodation_required: e.target.checked})}
                                    />
                                    <label htmlFor="accommodation_required" className="text-sm text-gray-700">
                                        Required
                                    </label>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Meal Allowance</label>
                            {isViewMode ? (
                                <div className="p-2 border rounded bg-gray-50">
                                    {travelOrder.meal_allowance ? 'Yes' : 'No'}
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="meal_allowance"
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        checked={travelOrder.meal_allowance || false}
                                        onChange={(e) => onChange({...travelOrder, meal_allowance: e.target.checked})}
                                    />
                                    <label htmlFor="meal_allowance" className="text-sm text-gray-700">
                                        Required
                                    </label>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost</label>
                            {isViewMode ? (
                                <div className="p-2 border rounded bg-gray-50">
                                    {travelOrder.estimated_cost ? `₱${parseFloat(travelOrder.estimated_cost).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '₱0.00'}
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500">₱</span>
                                    </div>
                                    <input
                                        type="number"
                                        className={`w-full pl-8 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.estimated_cost ? 'border-red-500' : ''}`}
                                        value={travelOrder.estimated_cost || ''}
                                        onChange={(e) => onChange({...travelOrder, estimated_cost: e.target.value})}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            )}
                            {errorMessages.estimated_cost && <p className="mt-1 text-sm text-red-600">{errorMessages.estimated_cost}</p>}
                        </div>
                    </div>
                    
                    {/* Other Expenses */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Other Expenses</label>
                        {isViewMode ? (
                            <div className="p-2 border rounded bg-gray-50 whitespace-pre-line min-h-[60px]">
                                {travelOrder.other_expenses || 'None'}
                            </div>
                        ) : (
                            <textarea
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.other_expenses ? 'border-red-500' : ''}`}
                                value={travelOrder.other_expenses || ''}
                                onChange={(e) => onChange({...travelOrder, other_expenses: e.target.value})}
                                placeholder="Detail any other expenses expected"
                                rows="2"
                            />
                        )}
                        {errorMessages.other_expenses && <p className="mt-1 text-sm text-red-600">{errorMessages.other_expenses}</p>}
                    </div>
                    
                    {/* Status-specific information (only in view mode) */}
                    {isViewMode && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <div className="mt-1">
                                    <StatusBadge status={travelOrder.status} />
                                </div>
                            </div>
                            
                            {travelOrder.total_days && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Days</label>
                                    <div className="mt-1 text-sm text-gray-900">
                                        {travelOrder.total_days} day{travelOrder.total_days !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            )}
                            
                            {travelOrder.approved_by && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Approved By</label>
                                    <div className="mt-1 text-sm text-gray-900">
                                        {travelOrder.approver ? travelOrder.approver.name : 'Unknown User'}
                                    </div>
                                </div>
                            )}
                            
                            {travelOrder.approved_at && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Approved At</label>
                                    <div className="mt-1 text-sm text-gray-900">
                                        {new Date(travelOrder.approved_at).toLocaleString()}
                                    </div>
                                </div>
                            )}
                            
                            {travelOrder.remarks && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                                        {travelOrder.remarks}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    
                    <div className="flex justify-end mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="mr-2"
                        >
                            {isViewMode ? 'Close' : 'Cancel'}
                        </Button>
                        
                        {!isViewMode && (
                            <Button
                                type="submit"
                                className="bg-blue-600 text-white hover:bg-blue-700"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {mode === 'create' ? 'Create Travel Order' : 'Update Travel Order'}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// Status Update Modal Component
const StatusUpdateModal = ({ 
    isOpen, 
    onClose, 
    travelOrder, 
    onSubmit
}) => {
    const [status, setStatus] = useState('approved');
    const [remarks, setRemarks] = useState('');
    
    useEffect(() => {
        if (isOpen) {
            if (travelOrder && travelOrder.status === 'approved') {
                setStatus('completed');
                setRemarks('');
            } else {
                setStatus('approved');
                setRemarks('');
            }
        }
    }, [isOpen, travelOrder]);
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ status, remarks });
    };
    
    // Display different options based on current status
    const renderStatusOptions = () => {
        if (travelOrder && travelOrder.status === 'approved') {
            return (
                <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            name="status"
                            value="completed"
                            checked={status === 'completed'}
                            onChange={() => setStatus('completed')}
                            className="form-radio h-4 w-4 text-green-600"
                        />
                        <span className="ml-2 text-sm text-gray-700">Mark as Completed</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            name="status"
                            value="cancelled"
                            checked={status === 'cancelled'}
                            onChange={() => setStatus('cancelled')}
                            className="form-radio h-4 w-4 text-red-600"
                        />
                        <span className="ml-2 text-sm text-gray-700">Cancel</span>
                    </label>
                </div>
            );
        } else {
            return (
                <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            name="status"
                            value="approved"
                            checked={status === 'approved'}
                            onChange={() => setStatus('approved')}
                            className="form-radio h-4 w-4 text-green-600"
                        />
                        <span className="ml-2 text-sm text-gray-700">Approve</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            name="status"
                            value="rejected"
                            checked={status === 'rejected'}
                            onChange={() => setStatus('rejected')}
                            className="form-radio h-4 w-4 text-red-600"
                        />
                        <span className="ml-2 text-sm text-gray-700">Reject</span>
                    </label>
                </div>
            );
        }
    };
    
    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">
                        {travelOrder && travelOrder.status === 'approved' ? 'Update Travel Order Status' : 'Review Travel Order Request'}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                        <div className="p-2 border rounded bg-gray-50">
                            {travelOrder?.employee?.Fname} {travelOrder?.employee?.Lname} ({travelOrder?.employee?.idno})
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Travel Dates</label>
                            <div className="p-2 border rounded bg-gray-50">
                                {travelOrder?.start_date ? new Date(travelOrder.start_date).toLocaleDateString() : ''} - {travelOrder?.end_date ? new Date(travelOrder.end_date).toLocaleDateString() : ''}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                            <div className="p-2 border rounded bg-gray-50">
                                {travelOrder?.destination}
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                        <div className="p-2 border rounded bg-gray-50 whitespace-pre-line">
                            {travelOrder?.purpose}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status Decision</label>
                        {renderStatusOptions()}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                        <textarea
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Add your comments or reasons for the decision"
                            rows="3"
                        />
                    </div>
                    
                    <div className="flex justify-end mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="mr-2"
                        >
                            Cancel
                        </Button>
                        
                        <Button
                            type="submit"
                            className={
                                status === 'approved' ? "bg-green-600 text-white hover:bg-green-700" : 
                                status === 'completed' ? "bg-blue-600 text-white hover:bg-blue-700" :
                                "bg-red-600 text-white hover:bg-red-700"
                            }
                        >
                            {status === 'approved' && (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve Travel Order
                                </>
                            )}
                            {status === 'rejected' && (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject Travel Order
                                </>
                            )}
                            {status === 'completed' && (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Mark as Completed
                                </>
                            )}
                            {status === 'cancelled' && (
                                <>
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel Travel Order
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// Main Travel Component
const Travel = () => {
    // Safely get data from page props with better defensive checks and defaults
    const { auth, travelOrders = [], employees = [], departments = [] } = usePage().props;
    const user = auth?.user || {};
    
    const [allTravelOrders, setAllTravelOrders] = useState(travelOrders);
    const [allEmployees, setAllEmployees] = useState(employees);
    const [allDepartments, setAllDepartments] = useState(departments);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
    
    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    
    // Travel order state
    const emptyTravelOrder = {
        employee_ids: [],
        date: new Date().toISOString().split('T')[0],
        start_date: '',
        end_date: '',
        destination: '',
        transportation_type: '',
        purpose: '',
        accommodation_required: false,
        meal_allowance: false,
        other_expenses: '',
        estimated_cost: ''
    };
    const [currentTravelOrder, setCurrentTravelOrder] = useState(emptyTravelOrder);
    
    // Error state
    const [errors, setErrors] = useState({});
    
    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    
    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '',
        confirmVariant: 'destructive',
        onConfirm: () => {}
    });

    // Add an initialization effect to ensure we have employee data
    useEffect(() => {
        const initializeData = async () => {
            if (!allEmployees || allEmployees.length === 0) {
                try {
                    setLoading(true);
                    console.log('Initializing employee data...');
                    const response = await axios.get('/employees/list');
                    console.log(`Loaded ${response.data.data?.length || 0} employees`);
                    setAllEmployees(response.data.data || []);
                } catch (error) {
                    console.error('Failed to load employees:', error);
                } finally {
                    setLoading(false);
                }
            }
        };
        
        initializeData();
    }, []);

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load travel orders with applied filters
            const travelOrdersResponse = await axios.get('/travel-orders', {
                params: {
                    search: searchTerm,
                    status: statusFilter !== 'all' ? statusFilter : null,
                    from_date: dateFilter.from || null,
                    to_date: dateFilter.to || null
                }
            });
            
            setAllTravelOrders(travelOrdersResponse.data.travelOrders || []);
            
            // Check if we need to load employee data
            if (!allEmployees || allEmployees.length === 0) {
                try {
                    const employeesResponse = await axios.get('/employees/list');
                    setAllEmployees(employeesResponse.data.data || []);
                    console.log(`Loaded ${employeesResponse.data.data?.length || 0} employees in loadData`);
                } catch (employeeError) {
                    console.error('Error loading employees:', employeeError);
                }
            }
            
        // Check if we need to load department data
if (!allDepartments || allDepartments.length === 0) {
    try {
        // Use the correct endpoint: /departments instead of /departments/list
        const departmentsResponse = await axios.get('/departments');
        if (departmentsResponse.data.data && Array.isArray(departmentsResponse.data.data)) {
            // Extract just the names or use the full objects depending on your needs
            setAllDepartments(departmentsResponse.data.data);
            console.log(`Loaded ${departmentsResponse.data.data.length} departments`);
        } else {
            setAllDepartments([]);
        }
    } catch (departmentError) {
        console.error('Error loading departments:', departmentError);
        // Fallback: Extract departments from employee data if available
        if (allEmployees && allEmployees.length > 0) {
            console.log('Extracting departments from employee data as fallback');
            const uniqueDepartments = [...new Set(
                allEmployees
                    .map(e => e.Department)
                    .filter(Boolean)
            )];
            console.log(`Extracted ${uniqueDepartments.length} unique departments from employee data`);
            setAllDepartments(uniqueDepartments);
        } else {
            setAllDepartments([]);
        }
    }
}
        } catch (error) {
            console.error('Error loading travel orders:', error);
            showToast('Error loading travel orders: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter, dateFilter, allEmployees, allDepartments]);

    // Load data on component mount and when filters change
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Show toast notification
    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
    };

    // Close toast notification
    const closeToast = () => {
        setToast({ ...toast, visible: false });
    };

    // Debounced search handler
    const debouncedSearch = debounce((value) => {
        setSearchTerm(value);
    }, 300);

    // Handle creating new travel order
    const handleCreateClick = () => {
        setCurrentTravelOrder(emptyTravelOrder);
        setErrors({});
        setIsCreateModalOpen(true);
    };

    // Handle viewing travel order
    const handleViewClick = (travelOrder) => {
        setCurrentTravelOrder({...travelOrder});
        setIsViewModalOpen(true);
    };

    // Handle status update
    const handleStatusClick = (travelOrder) => {
        setCurrentTravelOrder({...travelOrder});
        setIsStatusModalOpen(true);
    };

    // Handle creating new travel order
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        
        try {
            const response = await axios.post('/travel-orders', currentTravelOrder);
            
            // Update travel orders list
            await loadData();
            
            // Reset form and close modal
            setCurrentTravelOrder(emptyTravelOrder);
            setIsCreateModalOpen(false);
            
            showToast(response.data.message || 'Travel order created successfully');
        } catch (error) {
            console.error('Error creating travel order:', error);
            
            // Handle validation errors
            if (error.response?.status === 422 && error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                showToast(error.response?.data?.message || 'Error creating travel order', 'error');
            }
        }
    };

    // Handle status update
    const handleStatusSubmit = async (data) => {
        try {
            const response = await axios.post(`/travel-orders/${currentTravelOrder.id}/status`, data);
            
            // Update travel orders list
            await loadData();
            
            // Close modal
            setIsStatusModalOpen(false);
            
            showToast(response.data.message || `Travel order status updated successfully`);
        } catch (error) {
            console.error('Error updating travel order status:', error);
            showToast(error.response?.data?.message || 'Error updating travel order status', 'error');
        }
    };

    // Handle deleting travel order
    const handleDeleteClick = (travelOrder) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Travel Order',
            message: `Are you sure you want to delete this travel order? This action cannot be undone.`,
            confirmText: 'Delete',
            confirmVariant: 'destructive',
            onConfirm: async () => {
                try {
                    const response = await axios.delete(`/travel-orders/${travelOrder.id}`);
                    
                    // Update travel orders list
                    await loadData();
                    
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    showToast(response.data.message || 'Travel order deleted successfully');
                } catch (error) {
                    console.error('Error deleting travel order:', error);
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    showToast(error.response?.data?.message || 'Error deleting travel order', 'error');
                }
            }
        });
    };

    // Handle export to Excel
    const handleExport = async () => {
        try {
            // Create the export URL with current filters
            const params = new URLSearchParams({
                search: searchTerm || '',
                status: statusFilter !== 'all' ? statusFilter : '',
                from_date: dateFilter.from || '',
                to_date: dateFilter.to || ''
            });
            
            // Create a URL for the export endpoint with the filters
            const exportUrl = `/travel-orders/export?${params.toString()}`;
            
            // Open the URL in a new window or trigger a download
            window.open(exportUrl, '_blank');
        } catch (error) {
            console.error('Error exporting travel orders:', error);
            showToast('Error exporting travel orders: ' + error.message, 'error');
        }
    };

    // Helper to get transportation type display value
    const getTransportationTypeDisplay = (type) => {
        const types = {
            'company_vehicle': 'Company Vehicle',
            'personal_vehicle': 'Personal Vehicle',
            'public_transport': 'Public Transport',
            'plane': 'Plane',
            'other': 'Other'
        };
        return types[type] || type;
    };

    return (
        <AuthenticatedLayout>
            <Head title="Travel Orders" />
            <div className="flex min-h-screen bg-gray-50/50">
                <Sidebar />
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Toast Notification */}
                        {toast.visible && (
                            <Toast 
                                message={toast.message}
                                type={toast.type}
                                onClose={closeToast}
                            />
                        )}

                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    Travel Orders
                                </h1>
                                <p className="text-gray-600">
                                    Manage employee official travel requests and approvals.
                                </p>
                            </div>
                            <div className="flex gap-3 mt-4 md:mt-0">
                                <Button
                                    onClick={handleExport}
                                    variant="outline"
                                    className="px-4 py-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center"
                                >
                                    <ArrowUp className="w-4 h-4 mr-2" />
                                    Export to Excel
                                </Button>
                                <Button
                                    onClick={handleCreateClick}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Travel Order
                                </Button>
                            </div>
                        </div>

                        {/* Filters Section */}
                        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Search */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            placeholder="Search by name, destination..."
                                            onChange={(e) => debouncedSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                
                                {/* Status Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                
                                {/* Date Range Filter - From */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={dateFilter.from}
                                        onChange={(e) => setDateFilter({...dateFilter, from: e.target.value})}
                                    />
                                </div>
                                
                                {/* Date Range Filter - To */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={dateFilter.to}
                                        onChange={(e) => setDateFilter({...dateFilter, to: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Travel Orders Table */}
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            {/* Table header */}
                            <div className="grid grid-cols-9 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <div className="px-6 py-3 col-span-1">Actions</div>
                                <div className="px-6 py-3 col-span-1">Status</div>
                                <div className="px-6 py-3 col-span-2">Employee</div>
                                <div className="px-6 py-3 col-span-1">Travel Dates</div>
                                <div className="px-6 py-3 col-span-1">Duration</div>
                                <div className="px-6 py-3 col-span-1">Destination</div>
                                <div className="px-6 py-3 col-span-1">Transportation</div>
                                <div className="px-6 py-3 col-span-1">Purpose</div>
                            </div>

                            {/* Table Body - Loading State */}
                            {loading && (
                                <div className="py-16 text-center text-gray-500">
                                    Loading...
                                </div>
                            )}

                            {/* Table Body - No Results */}
                            {!loading && allTravelOrders.length === 0 && (
                                <div className="py-16 text-center text-gray-500">
                                    {searchTerm || statusFilter !== 'all' || dateFilter.from || dateFilter.to
                                        ? 'No travel orders found matching your filters.'
                                        : 'No travel orders found. Create a new travel order to get started.'}
                                </div>
                            )}

                            {/* Table Body - Results */}
                            {!loading && allTravelOrders.length > 0 && (
                                <div className="divide-y divide-gray-200">
                                    {allTravelOrders.map((travelOrder) => (
                                        <div 
                                            key={travelOrder.id}
                                            className="grid grid-cols-9 items-center hover:bg-gray-50"
                                        >
                                            {/* Actions cell */}
                                            <div className="px-6 py-4 col-span-1 whitespace-nowrap">
                                                <div className="flex space-x-3">
                                                    <button
                                                        onClick={() => handleViewClick(travelOrder)}
                                                        className="text-gray-400 hover:text-gray-500"
                                                        title="View"
                                                        type="button"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    
                                                    {travelOrder.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleStatusClick(travelOrder)}
                                                                className="text-gray-400 hover:text-gray-500"
                                                                title="Update Status"
                                                                type="button"
                                                            >
                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </button>
                                                            
                                                            <button
                                                                onClick={() => handleDeleteClick(travelOrder)}
                                                                className="text-gray-400 hover:text-red-500"
                                                                title="Delete"
                                                                type="button"
                                                            >
                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </>
                                                    )}
                                                    
                                                    {travelOrder.status === 'approved' && (
                                                        <button
                                                            onClick={() => handleStatusClick(travelOrder)}
                                                            className="text-gray-400 hover:text-gray-500"
                                                            title="Update Status"
                                                            type="button"
                                                        >
                                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Status cell */}
                                            <div className="px-6 py-4 col-span-1 whitespace-nowrap">
                                                <StatusBadge status={travelOrder.status} />
                                            </div>
                                            
                                            {/* Employee cell */}
                                            <div className="px-6 py-4 col-span-2 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">
                                                    {travelOrder.employee?.Lname}, {travelOrder.employee?.Fname}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {travelOrder.employee?.idno} • {travelOrder.employee?.Department}
                                                </div>
                                            </div>
                                            
                                            {/* Travel Dates cell */}
                                            <div className="px-6 py-4 col-span-1 whitespace-nowrap text-sm text-gray-500">
                                                <div>
                                                    {new Date(travelOrder.start_date).toLocaleDateString()}
                                                </div>
                                                <div>
                                                    {new Date(travelOrder.end_date).toLocaleDateString()}
                                                </div>
                                            </div>
                                            
                                            {/* Duration cell */}
                                            <div className="px-6 py-4 col-span-1 whitespace-nowrap text-sm text-gray-500">
                                                {travelOrder.total_days} day{travelOrder.total_days !== 1 ? 's' : ''}
                                            </div>
                                            
                                            {/* Destination cell */}
                                            <div className="px-6 py-4 col-span-1 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <MapPin className="h-3.5 w-3.5 text-gray-400 mr-1 flex-shrink-0" />
                                                    <span className="truncate max-w-[120px]" title={travelOrder.destination}>
                                                        {travelOrder.destination}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Transportation cell */}
                                            <div className="px-6 py-4 col-span-1 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <Car className="h-3.5 w-3.5 text-gray-400 mr-1 flex-shrink-0" />
                                                    <span>{getTransportationTypeDisplay(travelOrder.transportation_type)}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Purpose cell */}
                                            <div className="px-6 py-4 col-span-1 text-sm text-gray-500">
                                                <div className="truncate max-w-[150px]" title={travelOrder.purpose}>
                                                    {travelOrder.purpose}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Travel Order Modals */}
            <TravelOrderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Travel Order"
                travelOrder={currentTravelOrder}
                employees={allEmployees}
                departments={allDepartments}
                onChange={setCurrentTravelOrder}
                onSubmit={handleCreateSubmit}
                mode="create"
                errorMessages={errors}
            />

            <TravelOrderModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title="View Travel Order Details"
                travelOrder={currentTravelOrder}
                employees={allEmployees}
                departments={allDepartments}
                onChange={setCurrentTravelOrder}
                onSubmit={() => {}} // No submit action for view mode
                mode="view"
                errorMessages={{}}
            />

            <StatusUpdateModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                travelOrder={currentTravelOrder}
                onSubmit={handleStatusSubmit}
            />

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({...confirmModal, isOpen: false})}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                confirmVariant={confirmModal.confirmVariant}
                onConfirm={confirmModal.onConfirm}
            />
        </AuthenticatedLayout>
    );
};

export default Travel;