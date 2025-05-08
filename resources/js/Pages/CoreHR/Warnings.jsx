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
    AlertTriangle,
    FileText,
    Check,
    XCircle
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

// Warning Type Badge Component
const WarningTypeBadge = ({ type }) => {
    const getColor = () => {
        switch (type) {
            case 'Verbal Warning':
                return 'bg-yellow-100 text-yellow-800';
            case 'Written Warning':
                return 'bg-orange-100 text-orange-800';
            case 'Final Warning':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getColor()}`}>
            <AlertTriangle className="w-3 h-3 mr-1" />
            {type}
        </span>
    );
};

// WarningModal Component with Enhanced Employee Search
const WarningModal = ({ 
    isOpen, 
    onClose, 
    title, 
    warning, 
    employees,
    onChange, 
    onSubmit, 
    mode = 'create',
    errorMessages = {}
}) => {
    const isViewMode = mode === 'view';
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [documentFile, setDocumentFile] = useState(null);
    
    // First useEffect - Filter employees based on search term
    useEffect(() => {
        if (!Array.isArray(employees)) {
            setFilteredEmployees([]);
            return;
        }
        
        if (!employeeSearchTerm.trim()) {
            setFilteredEmployees(employees);
            return;
        }
        
        const searchTermLower = employeeSearchTerm.toLowerCase();
        const filtered = employees.filter(employee => {
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
        
        setFilteredEmployees(filtered);
    }, [employeeSearchTerm, employees]);
    
    // Second useEffect - Handle exact match selection separately
    useEffect(() => {
        if (!employeeSearchTerm.trim() || !Array.isArray(filteredEmployees) || filteredEmployees.length === 0) {
            return;
        }
        
        const searchTermLower = employeeSearchTerm.toLowerCase();
        
        // Check for exact match only when search term changes
        const exactMatch = filteredEmployees.find(employee => {
            const firstName = (employee.Fname || '').toLowerCase();
            const lastName = (employee.Lname || '').toLowerCase();
            const idNo = (employee.idno || '').toLowerCase();
            const fullName = `${firstName} ${lastName}`.toLowerCase();
            const fullNameReversed = `${lastName} ${firstName}`.toLowerCase();
            const fullNameWithId = `${lastName}, ${firstName} (${idNo})`.toLowerCase();
            
            return firstName === searchTermLower || 
                   lastName === searchTermLower || 
                   idNo === searchTermLower ||
                   fullName === searchTermLower ||
                   fullNameReversed === searchTermLower ||
                   fullNameWithId === searchTermLower;
        });
        
        // If exact match found and it's different from current selection, update it
        if (exactMatch && exactMatch.id !== warning.employee_id) {
            onChange({...warning, employee_id: exactMatch.id});
        }
    }, [employeeSearchTerm, filteredEmployees, warning.employee_id, onChange]);
    
    // Reset search term when modal opens
    useEffect(() => {
        if (isOpen) {
            setEmployeeSearchTerm('');
            setFilteredEmployees(employees || []);
            setDocumentFile(null);
        }
    }, [isOpen, employees]);

    // Handle file selection
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setDocumentFile(e.target.files[0]);
        }
    };
    
    // Handle form submission with file upload
    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Create form data for file upload
        const formData = new FormData();
        
        // Add all warning data to form data
        Object.keys(warning).forEach(key => {
            if (warning[key] !== null && warning[key] !== undefined) {
                formData.append(key, warning[key]);
            }
        });
        
        // Add document file if selected
        if (documentFile) {
            formData.append('document', documentFile);
        }
        
        // Call the onSubmit handler with form data
        onSubmit(e, formData);
    };
    
    
    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button 
                        onClick={() => onClose(false)}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                        {isViewMode ? (
                            <div className="p-2 border rounded bg-gray-50">
                                {warning.employee ? `${warning.employee.Lname || ''}, ${warning.employee.Fname || ''} ${warning.employee.idno ? `(${warning.employee.idno})` : ''}` : 'Unknown Employee'}
                            </div>
                        ) : (
                            <>
                                {/* Employee Search Field - Only show in create/edit mode */}
                                <div className="relative mb-2">
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
                                  {warning.employee_id && filteredEmployees.length > 0 && filteredEmployees.find(e => e.id === warning.employee_id) && (
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                            <Check className="h-4 w-4 text-green-500" />
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 mb-2">
                                    {filteredEmployees.length === 0 ? 
                                        "No matching employees found" : 
                                        filteredEmployees.length === 1 ? 
                                            "1 employee found" : 
                                            `${filteredEmployees.length} employees found`
                                    }
                                    {warning.employee_id && filteredEmployees.find(e => e.id === warning.employee_id) && 
                                        " - Employee selected"
                                    }
                                </div>
                                
                                <select
                                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.employee_id ? 'border-red-500' : ''}`}
                                    value={warning.employee_id || ''}
                                    onChange={(e) => onChange({...warning, employee_id: e.target.value})}
                                    required
                                >
                                    <option value="">Select Employee</option>
                                    {Array.isArray(filteredEmployees) && filteredEmployees.length > 0 ? (
                                        filteredEmployees.map(employee => (
                                            <option key={employee.id || `emp-${Math.random()}`} value={employee.id}>
                                                {employee.Lname || ''}, {employee.Fname || ''} {employee.idno ? `(${employee.idno})` : ''}
                                            </option>
                                        ))
                                    ) : employeeSearchTerm ? (
                                        <option value="" disabled>No matching employees found</option>
                                    ) : (
                                        <option value="" disabled>No employees available</option>
                                    )}
                                </select>
                            </>
                        )}
                        {errorMessages.employee_id && <p className="mt-1 text-sm text-red-600">{errorMessages.employee_id}</p>}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Warning Type</label>
                        {isViewMode ? (
                            <div className="p-2 border rounded bg-gray-50">
                                <WarningTypeBadge type={warning.warning_type || ''} />
                            </div>
                        ) : (
                            <select
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.warning_type ? 'border-red-500' : ''}`}
                                value={warning.warning_type || ''}
                                onChange={(e) => onChange({...warning, warning_type: e.target.value})}
                                required
                            >
                                <option value="">Select Warning Type</option>
                                <option value="Verbal Warning">Verbal Warning</option>
                                <option value="Written Warning">Written Warning</option>
                                <option value="Final Warning">Final Warning</option>
                                <option value="Performance Improvement Plan">Performance Improvement Plan</option>
                            </select>
                        )}
                        {errorMessages.warning_type && <p className="mt-1 text-sm text-red-600">{errorMessages.warning_type}</p>}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        {isViewMode ? (
                            <div className="p-2 border rounded bg-gray-50">
                                {warning.subject || ''}
                            </div>
                        ) : (
                            <input
                                type="text"
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.subject ? 'border-red-500' : ''}`}
                                value={warning.subject || ''}
                                onChange={(e) => onChange({...warning, subject: e.target.value})}
                                placeholder="e.g. Attendance Issues, Performance Concerns"
                                required
                            />
                        )}
                        {errorMessages.subject && <p className="mt-1 text-sm text-red-600">{errorMessages.subject}</p>}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Warning Date</label>
                        {isViewMode ? (
                            <div className="p-2 border rounded bg-gray-50">
                                {warning.warning_date ? new Date(warning.warning_date).toLocaleDateString() : ''}
                            </div>
                        ) : (
                            <input
                                type="date"
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.warning_date ? 'border-red-500' : ''}`}
                                value={warning.warning_date || ''}
                                onChange={(e) => onChange({...warning, warning_date: e.target.value})}
                                required
                            />
                        )}
                        {errorMessages.warning_date && <p className="mt-1 text-sm text-red-600">{errorMessages.warning_date}</p>}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Warning Description</label>
                        {isViewMode ? (
                            <div className="p-2 border rounded bg-gray-50 whitespace-pre-line min-h-[100px]">
                                {warning.warning_description || ''}
                            </div>
                        ) : (
                            <textarea
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.warning_description ? 'border-red-500' : ''}`}
                                value={warning.warning_description || ''}
                                onChange={(e) => onChange({...warning, warning_description: e.target.value})}
                                placeholder="Detailed explanation of the issue and expected improvements"
                                rows="4"
                                required
                            />
                        )}
                        {errorMessages.warning_description && <p className="mt-1 text-sm text-red-600">{errorMessages.warning_description}</p>}
                    </div>
                    
                    {isViewMode && warning.employee_response && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Employee Response</label>
                            <div className="p-2 border rounded bg-gray-50 whitespace-pre-line min-h-[80px]">
                                {warning.employee_response || ''}
                            </div>
                        </div>
                    )}
                    
                    {isViewMode && warning.acknowledgement_date && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Acknowledged On</label>
                            <div className="p-2 border rounded bg-gray-50">
                                {new Date(warning.acknowledgement_date).toLocaleDateString()}
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supporting Document</label>
                        {isViewMode ? (
                            warning.document_path ? (
                                <div className="p-2 border rounded bg-gray-50 flex items-center">
                                    <FileText className="h-5 w-5 text-gray-500 mr-2" />
                                    <a 
                                        href={`/storage/${warning.document_path}`} 
                                        target="_blank" 
                                        className="text-blue-600 hover:underline"
                                    >
                                        View Document
                                    </a>
                                </div>
                            ) : (
                                <div className="p-2 border rounded bg-gray-50">
                                    No document attached
                                </div>
                            )
                        ) : (
                            <div className="mt-1 flex items-center">
                                <input
                                    type="file"
                                    className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${errorMessages.document ? 'border-red-500' : ''}`}
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx"
                                />
                                {documentFile && (
                                    <span className="ml-2 text-xs text-gray-500">
                                        {documentFile.name}
                                    </span>
                                )}
                                {warning.document_path && !documentFile && (
                                    <div className="ml-2 flex items-center">
                                        <FileText className="h-4 w-4 text-gray-400 mr-1" />
                                        <span className="text-xs text-gray-500">Current document will be kept unless replaced</span>
                                    </div>
                                )}
                            </div>
                        )}
                        {errorMessages.document && <p className="mt-1 text-sm text-red-600">{errorMessages.document}</p>}
                    </div>
                    
                    <div className="flex justify-end mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onClose(false)}
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
                                {mode === 'create' ? 'Issue Warning' : 'Update Warning'}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// Main Warnings Component
const Warnings = () => {
    // Safely get user from page props
    const { auth } = usePage().props;
    const user = auth?.user || {};
    
    const [warnings, setWarnings] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [warningTypeFilter, setWarningTypeFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
    
    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    
    // Warning state
    const emptyWarning = {
        employee_id: '',
        warning_type: '',
        subject: '',
        warning_description: '',
        warning_date: ''
    };
    const [currentWarning, setCurrentWarning] = useState(emptyWarning);
    
    // Error state
    const [errors, setErrors] = useState({});
    
    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    
    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '',
        confirmVariant: 'destructive',
        onConfirm: () => {}
    });

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [warningsResponse, employeesResponse] = await Promise.all([
                axios.get('/warnings/list', {
                    params: {
                        search: searchTerm,
                        warning_type: warningTypeFilter !== 'all' ? warningTypeFilter : null,
                        date_from: dateFilter.from || null,
                        date_to: dateFilter.to || null
                    }
                }),
                axios.get('/employees/list', { params: { active_only: true } })
            ]);
            
            setWarnings(warningsResponse.data.data || []);
            setEmployees(employeesResponse.data.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Error loading data: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, warningTypeFilter, dateFilter]);

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

    // Handle creating new warning
    const handleCreateClick = () => {
        setCurrentWarning(emptyWarning);
        setErrors({});
        setIsCreateModalOpen(true);
    };

    // Handle editing warning
    const handleEditClick = (warning) => {
        setCurrentWarning({...warning});
        setErrors({});
        setIsEditModalOpen(true);
    };

    // Handle viewing warning
    const handleViewClick = (warning) => {
        setCurrentWarning({...warning});
        setIsViewModalOpen(true);
    };

    // Handle creating new warning
    const handleCreateSubmit = async (e, formData) => {
        e.preventDefault();
        setErrors({});
        
        try {
            const response = await axios.post('/warnings', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            // Update warnings list
            await loadData();
            
            // Reset form and close modal
            setCurrentWarning(emptyWarning);
            setIsCreateModalOpen(false);
            
            showToast('Warning issued successfully');
        } catch (error) {
            console.error('Error creating warning:', error);
            
            // Handle validation errors
            if (error.response?.status === 422 && error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                showToast(error.response?.data?.message || 'Error issuing warning', 'error');
            }
        }
    };

    // Handle updating warning
    const handleUpdateSubmit = async (e, formData) => {
        e.preventDefault();
        setErrors({});
        
        try {
            const response = await axios.post(`/warnings/${currentWarning.id}?_method=PUT`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            // Update warnings list
            await loadData();
            
            // Reset form and close modal
            setCurrentWarning(emptyWarning);
            setIsEditModalOpen(false);
            
            showToast('Warning updated successfully');
        } catch (error) {
            console.error('Error updating warning:', error);
            
            // Handle validation errors
            if (error.response?.status === 422 && error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                showToast(error.response?.data?.message || 'Error updating warning', 'error');
            }
        }
    };

    // Handle deleting warning
    const handleDeleteClick = (warning) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Warning',
            message: `Are you sure you want to delete this warning for ${warning.employee.Fname} ${warning.employee.Lname}? This action cannot be undone.`,
            confirmText: 'Delete',
            confirmVariant: 'destructive',
            onConfirm: async () => {
                try {
                    await axios.delete(`/warnings/${warning.id}`);
                    
                    // Update warnings list
                    await loadData();
                    
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    showToast('Warning deleted successfully');
                } catch (error) {
                    console.error('Error deleting warning:', error);
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    showToast(error.response?.data?.message || 'Error deleting warning', 'error');
                }
            }
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Employee Warnings" />
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
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    Employee Warnings
                                </h1>
                                <p className="text-gray-600">
                                    Track and manage employee warnings and disciplinary actions.
                                </p>
                            </div>
                            <Button
                                onClick={handleCreateClick}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                Issue Warning
                            </Button>
                        </div>

                        {/* Filters Section */}
                        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Search */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            placeholder="Search by employee or subject..."
                                            onChange={(e) => debouncedSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                
                                {/* Warning Type Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Warning Type</label>
                                    <select
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={warningTypeFilter}
                                        onChange={(e) => setWarningTypeFilter(e.target.value)}
                                    >
                                        <option value="all">All Types</option>
                                        <option value="Verbal Warning">Verbal Warning</option>
                                        <option value="Written Warning">Written Warning</option>
                                        <option value="Final Warning">Final Warning</option>
                                        <option value="Performance Improvement Plan">Performance Improvement Plan</option>
                                    </select>
                                </div>
                                
                                {/* Date Range Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Warning Date</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <input
                                                type="date"
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                value={dateFilter.from}
                                                onChange={(e) => setDateFilter({...dateFilter, from: e.target.value})}
                                                placeholder="From"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="date"
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                value={dateFilter.to}
                                                onChange={(e) => setDateFilter({...dateFilter, to: e.target.value})}
                                                placeholder="To"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Warnings Table */}
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            {/* Table header */}
                            <div className="grid grid-cols-7 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <div className="px-6 py-3 col-span-1">Actions</div>
                                <div className="px-6 py-3 col-span-2">Employee</div>
                                <div className="px-6 py-3 col-span-1">Type</div>
                                <div className="px-6 py-3 col-span-1">Date</div>
                                <div className="px-6 py-3 col-span-1">Subject</div>
                                <div className="px-6 py-3 col-span-1">Issued By</div>
                            </div>

                            {/* Table Body - Loading State */}
                            {loading && (
                                <div className="py-16 text-center text-gray-500">
                                    Loading...
                                </div>
                            )}

                            {/* Table Body - No Results */}
                            {!loading && warnings.length === 0 && (
                                <div className="py-16 text-center text-gray-500">
                                    {searchTerm || warningTypeFilter !== 'all' || dateFilter.from || dateFilter.to
                                        ? 'No warnings found matching your filters.'
                                        : 'No warnings found. Issue a new warning to get started.'}
                                </div>
                            )}

                            {/* Table Body - Results */}
                            {!loading && warnings.length > 0 && (
                                <div className="divide-y divide-gray-200">
                                    {warnings.map((warning) => (
                                        <div 
                                            key={warning.id}
                                            className="grid grid-cols-7 items-center hover:bg-gray-50"
                                        >
                                            {/* Actions cell */}
                                            <div className="px-6 py-4 col-span-1 whitespace-nowrap">
                                                <div className="flex space-x-3">
                                                    <button
                                                        onClick={() => handleViewClick(warning)}
                                                        className="text-gray-400 hover:text-gray-500"
                                                        title="View"
                                                        type="button"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => handleEditClick(warning)}
                                                        className="text-gray-400 hover:text-gray-500"
                                                        title="Edit"
                                                        type="button"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => handleDeleteClick(warning)}
                                                        className="text-gray-400 hover:text-red-500"
                                                        title="Delete"
                                                        type="button"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Employee cell */}
                                            <div className="px-6 py-4 col-span-2 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">
                                                    {warning.employee?.Lname}, {warning.employee?.Fname}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {warning.employee?.idno}
                                                </div>
                                            </div>
                                            
                                            {/* Type cell */}
                                            <div className="px-6 py-4 col-span-1 whitespace-nowrap">
                                                <WarningTypeBadge type={warning.warning_type} />
                                            </div>
                                            
                                            {/* Date cell */}
                                            <div className="px-6 py-4 col-span-1 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(warning.warning_date).toLocaleDateString()}
                                            </div>
                                            
                                            {/* Subject cell */}
                                            <div className="px-6 py-4 col-span-1 text-sm text-gray-500 truncate">
                                                {warning.subject}
                                            </div>
                                            
                                            {/* Issued By cell */}
                                            <div className="px-6 py-4 col-span-1 whitespace-nowrap text-sm text-gray-500">
                                                {warning.issuer?.name || 'N/A'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Warning Modals */}
            <WarningModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Issue New Warning"
                warning={currentWarning}
                employees={employees}
                onChange={setCurrentWarning}
                onSubmit={handleCreateSubmit}
                mode="create"
                errorMessages={errors}
            />

            <WarningModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Warning"
                warning={currentWarning}
                employees={employees}
                onChange={setCurrentWarning}
                onSubmit={handleUpdateSubmit}
                mode="edit"
                errorMessages={errors}
            />

            <WarningModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title="View Warning Details"
                warning={currentWarning}
                employees={employees}
                onChange={setCurrentWarning}
                onSubmit={() => {}} // No submit action for view mode
                mode="view"
                errorMessages={{}}
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

export default Warnings;