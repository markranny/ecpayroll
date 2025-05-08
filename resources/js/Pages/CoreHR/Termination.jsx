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
    CheckCircle,
    XCircle,
    Clock,
    Check,
    FileText
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
    } else {
        return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <Clock className="w-3 h-3 mr-1" />
                Pending
            </span>
        );
    }
};

// Termination Modal Component with Enhanced Employee Search
const TerminationModal = ({ 
    isOpen, 
    onClose, 
    title, 
    termination, 
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
    
    // Filter employees when search term or employees list changes
  // Filter employees when search term or employees list changes - first useEffect
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

// Handle exact match selection - second useEffect
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
    if (exactMatch && exactMatch.id !== termination.employee_id) {
        onChange({...termination, employee_id: exactMatch.id});
    }
}, [employeeSearchTerm, filteredEmployees, termination.employee_id, onChange]);
    
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
        
        // Add all termination data to form data
        Object.keys(termination).forEach(key => {
            if (termination[key] !== null && termination[key] !== undefined) {
                formData.append(key, termination[key]);
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
                                {termination.employee ? `${termination.employee.Lname || ''}, ${termination.employee.Fname || ''} ${termination.employee.idno ? `(${termination.employee.idno})` : ''}` : 'Unknown Employee'}
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
                                    {termination.employee_id && filteredEmployees.length > 0 && filteredEmployees.find(e => e.id === termination.employee_id) && (
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
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
                                    {termination.employee_id && filteredEmployees.find(e => e.id === termination.employee_id) && 
                                        " - Employee selected"
                                    }
                                </div>
                                
                                <select
                                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.employee_id ? 'border-red-500' : ''}`}
                                    value={termination.employee_id || ''}
                                    onChange={(e) => onChange({...termination, employee_id: e.target.value})}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Termination Type</label>
                        {isViewMode ? (
                            <div className="p-2 border rounded bg-gray-50">
                                {termination.termination_type || ''}
                            </div>
                        ) : (
                            <select
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.termination_type ? 'border-red-500' : ''}`}
                                value={termination.termination_type || ''}
                                onChange={(e) => onChange({...termination, termination_type: e.target.value})}
                                required
                            >
                                <option value="">Select Termination Type</option>
                                <option value="Voluntary Resignation">Voluntary Resignation</option>
                                <option value="Contract Completion">Contract Completion</option>
                                <option value="Performance Issues">Performance Issues</option>
                                <option value="Code of Conduct Violation">Code of Conduct Violation</option>
                                <option value="Layoff">Layoff</option>
                                <option value="Retirement">Retirement</option>
                                <option value="Other">Other</option>
                            </select>
                        )}
                        {errorMessages.termination_type && <p className="mt-1 text-sm text-red-600">{errorMessages.termination_type}</p>}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notice Date</label>
                            {isViewMode ? (
                                <div className="p-2 border rounded bg-gray-50">
                                    {termination.notice_date ? new Date(termination.notice_date).toLocaleDateString() : ''}
                                </div>
                            ) : (
                                <input
                                    type="date"
                                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.notice_date ? 'border-red-500' : ''}`}
                                    value={termination.notice_date || ''}
                                    onChange={(e) => onChange({...termination, notice_date: e.target.value})}
                                    required
                                />
                            )}
                            {errorMessages.notice_date && <p className="mt-1 text-sm text-red-600">{errorMessages.notice_date}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Termination Date</label>
                            {isViewMode ? (
                                <div className="p-2 border rounded bg-gray-50">
                                    {termination.termination_date ? new Date(termination.termination_date).toLocaleDateString() : ''}
                                </div>
                            ) : (
                                <input
                                    type="date"
                                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.termination_date ? 'border-red-500' : ''}`}
                                    value={termination.termination_date || ''}
                                    onChange={(e) => onChange({...termination, termination_date: e.target.value})}
                                    required
                                />
                            )}
                            {errorMessages.termination_date && <p className="mt-1 text-sm text-red-600">{errorMessages.termination_date}</p>}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                        {isViewMode ? (
                            <div className="p-2 border rounded bg-gray-50 whitespace-pre-line min-h-[100px]">
                                {termination.reason || ''}
                            </div>
                        ) : (
                            <textarea
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.reason ? 'border-red-500' : ''}`}
                                value={termination.reason || ''}
                                onChange={(e) => onChange({...termination, reason: e.target.value})}
                                placeholder="Detailed explanation for termination"
                                rows="3"
                                required
                            />
                        )}
                        {errorMessages.reason && <p className="mt-1 text-sm text-red-600">{errorMessages.reason}</p>}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supporting Document</label>
                        {isViewMode ? (
                            termination.document_path ? (
                                <div className="p-2 border rounded bg-gray-50 flex items-center">
                                    <FileText className="h-5 w-5 text-gray-500 mr-2" />
                                    <a 
                                        href={`/storage/${termination.document_path}`} 
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
                                {termination.document_path && !documentFile && (
                                    <div className="ml-2 flex items-center">
                                        <FileText className="h-4 w-4 text-gray-400 mr-1" />
                                        <span className="text-xs text-gray-500">Current document will be kept unless replaced</span>
                                    </div>
                                )}
                            </div>
                        )}
                        {errorMessages.document && <p className="mt-1 text-sm text-red-600">{errorMessages.document}</p>}
                    </div>
                    
                    {isViewMode && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <div className="mt-1">
                                    <StatusBadge status={termination.status} />
                                </div>
                            </div>
                            
                            {termination.approved_by && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Approved By</label>
                                    <div className="mt-1 text-sm text-gray-900">
                                        {termination.approver ? termination.approver.name : 'Unknown User'}
                                    </div>
                                </div>
                            )}
                            
                            {termination.approved_at && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Approved At</label>
                                    <div className="mt-1 text-sm text-gray-900">
                                        {new Date(termination.approved_at).toLocaleString()}
                                    </div>
                                </div>
                            )}
                            
                            {termination.remarks && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                                        {termination.remarks}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    
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
                                {mode === 'create' ? 'Submit Termination' : 'Update Termination'}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// Approval Modal Component
const ApprovalModal = ({ 
    isOpen, 
    onClose, 
    termination, 
    onSubmit
}) => {
    const [status, setStatus] = useState('approved');
    const [remarks, setRemarks] = useState('');
    
    useEffect(() => {
        if (isOpen) {
            setStatus('approved');
            setRemarks('');
        }
    }, [isOpen]);
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ status, remarks });
    };
    
    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Review Termination Request</h2>
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
                            {termination?.employee?.Fname} {termination?.employee?.Lname} ({termination?.employee?.idno})
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Termination Type</label>
                            <div className="p-2 border rounded bg-gray-50">
                                {termination?.termination_type}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Termination Date</label>
                            <div className="p-2 border rounded bg-gray-50">
                                {termination?.termination_date ? new Date(termination.termination_date).toLocaleDateString() : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                        <div className="p-2 border rounded bg-gray-50 whitespace-pre-line">
                            {termination?.reason}
                        </div>
                    </div>
                    
                    {termination?.document_path && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Supporting Document</label>
                            <div className="p-2 border rounded bg-gray-50 flex items-center">
                                <FileText className="h-5 w-5 text-gray-500 mr-2" />
                                <a 
                                    href={`/storage/${termination.document_path}`} 
                                    target="_blank" 
                                    className="text-blue-600 hover:underline"
                                >
                                    View Document
                                </a>
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
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
                            className={status === 'approved' ? "bg-green-600 text-white hover:bg-green-700" : "bg-red-600 text-white hover:bg-red-700"}
                        >
                            {status === 'approved' ? (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve Termination
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject Termination
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// Main Termination Component
const Termination = () => {
    // Safely get user from page props
    const { auth } = usePage().props;
    const user = auth?.user || {};
    
    const [terminations, setTerminations] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
    
    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    
    // Termination state
    const emptyTermination = {
        employee_id: '',
        termination_type: '',
        notice_date: '',
        termination_date: '',
        reason: ''
    };
    const [currentTermination, setCurrentTermination] = useState(emptyTermination);
    
    // Error state
    const [errors, setErrors] = useState({});
    
    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    
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
            const [terminationsResponse, employeesResponse] = await Promise.all([
                axios.get('/terminations/list', {
                    params: {
                        search: searchTerm,
                        status: statusFilter !== 'all' ? statusFilter : null,
                        termination_type: typeFilter !== 'all' ? typeFilter : null,
                        date_from: dateFilter.from || null,
                        date_to: dateFilter.to || null
                    }
                }),
                axios.get('/employees/list', { params: { active_only: true } })
            ]);
            
            setTerminations(terminationsResponse.data.data || []);
            setEmployees(employeesResponse.data.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Error loading data: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter, typeFilter, dateFilter]);

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

    // Handle creating new termination
    const handleCreateClick = () => {
        setCurrentTermination(emptyTermination);
        setErrors({});
        setIsCreateModalOpen(true);
    };

    // Handle editing termination
    const handleEditClick = (termination) => {
        setCurrentTermination({...termination});
        setErrors({});
        setIsEditModalOpen(true);
    };

    // Handle viewing termination
    const handleViewClick = (termination) => {
        setCurrentTermination({...termination});
        setIsViewModalOpen(true);
    };

    // Handle approving/rejecting termination
    const handleApprovalClick = (termination) => {
        setCurrentTermination({...termination});
        setIsApprovalModalOpen(true);
    };

    // Handle creating new termination
    const handleCreateSubmit = async (e, formData) => {
        e.preventDefault();
        setErrors({});
        
        try {
            const response = await axios.post('/terminations', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            // Update terminations list
            await loadData();
            
            // Reset form and close modal
            setCurrentTermination(emptyTermination);
            setIsCreateModalOpen(false);
            
            showToast('Termination request submitted successfully');
        } catch (error) {
            console.error('Error creating termination:', error);
            
            // Handle validation errors
            if (error.response?.status === 422 && error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                showToast(error.response?.data?.message || 'Error submitting termination request', 'error');
            }
        }
    };

    // Handle updating termination
    const handleUpdateSubmit = async (e, formData) => {
        e.preventDefault();
        setErrors({});
        
        try {
            const response = await axios.post(`/terminations/${currentTermination.id}?_method=PUT`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            // Update terminations list
            await loadData();
            
            // Reset form and close modal
            setCurrentTermination(emptyTermination);
            setIsEditModalOpen(false);
            
            showToast('Termination request updated successfully');
        } catch (error) {
            console.error('Error updating termination:', error);
            
            // Handle validation errors
            if (error.response?.status === 422 && error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                showToast(error.response?.data?.message || 'Error updating termination request', 'error');
            }
        }
    };

    // Handle approving/rejecting termination
    const handleApprovalSubmit = async (data) => {
        try {
            const response = await axios.post(`/terminations/${currentTermination.id}/status`, data);
            
            // Update terminations list
            await loadData();
            
            // Close modal
            setIsApprovalModalOpen(false);
            
            showToast(`Termination request ${data.status === 'approved' ? 'approved' : 'rejected'} successfully`);
        } catch (error) {
            console.error('Error updating termination status:', error);
            showToast(error.response?.data?.message || 'Error updating termination status', 'error');
        }
    };

    // Handle deleting termination
    const handleDeleteClick = (termination) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Termination Request',
            message: `Are you sure you want to delete this termination request for ${termination.employee.Fname} ${termination.employee.Lname}? This action cannot be undone.`,
            confirmText: 'Delete',
            confirmVariant: 'destructive',
            onConfirm: async () => {
                try {
                    await axios.delete(`/terminations/${termination.id}`);
                    
                    // Update terminations list
                    await loadData();
                    
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    showToast('Termination request deleted successfully');
                } catch (error) {
                    console.error('Error deleting termination:', error);
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    showToast(error.response?.data?.message || 'Error deleting termination request', 'error');
                }
            }
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Employee Terminations" />
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
                                    Employee Terminations
                                </h1>
                                <p className="text-gray-600">
                                    Manage employee termination requests and exit procedures.
                                </p>
                            </div>
                            <Button
                                onClick={handleCreateClick}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                New Termination
                            </Button>
                        </div>

                        {/* Filters Section */}
                        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                                            placeholder="Search by employee or reason..."
                                            onChange={(e) => debouncedSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                
                                {/* Status Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>

                                {/* Type Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Termination Type</label>
                                    <select
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                    >
                                        <option value="all">All Types</option>
                                        <option value="Voluntary Resignation">Voluntary Resignation</option>
                                        <option value="Contract Completion">Contract Completion</option>
                                        <option value="Performance Issues">Performance Issues</option>
                                        <option value="Code of Conduct Violation">Code of Conduct Violation</option>
                                        <option value="Layoff">Layoff</option>
                                        <option value="Retirement">Retirement</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                
                                {/* Date Range Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Termination Date</label>
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

                        {/* Terminations Table */}
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            {/* Table header */}
                            <div className="grid grid-cols-8 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <div className="px-6 py-3 col-span-1">Actions</div>
                                <div className="px-6 py-3 col-span-1">Status</div>
                                <div className="px-6 py-3 col-span-2">Employee</div>
                                <div className="px-6 py-3 col-span-1">Type</div>
                                <div className="px-6 py-3 col-span-1">Notice Date</div>
                                <div className="px-6 py-3 col-span-1">Termination Date</div>
                                <div className="px-6 py-3 col-span-1">Reason</div>
                            </div>

                            {/* Table Body - Loading State */}
                            {loading && (
                                <div className="py-16 text-center text-gray-500">
                                    Loading...
                                </div>
                            )}

                            {/* Table Body - No Results */}
                            {!loading && terminations.length === 0 && (
                                <div className="py-16 text-center text-gray-500">
                                    {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter.from || dateFilter.to
                                        ? 'No terminations found matching your filters.'
                                        : 'No termination requests found. Create a new termination request to get started.'}
                                </div>
                            )}

                            {/* Table Body - Results */}
                            {!loading && terminations.length > 0 && (
                                <div className="divide-y divide-gray-200">
                                    {terminations.map((termination) => (
                                        <div 
                                            key={termination.id}
                                            className="grid grid-cols-8 items-center hover:bg-gray-50"
                                        >
                                            {/* Actions cell */}
                                            <div className="px-6 py-4 col-span-1 whitespace-nowrap">
                                                <div className="flex space-x-3">
                                                    <button
                                                        onClick={() => handleViewClick(termination)}
                                                        className="text-gray-400 hover:text-gray-500"
                                                        title="View"
                                                        type="button"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    
                                                    {termination.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleEditClick(termination)}
                                                                className="text-gray-400 hover:text-gray-500"
                                                                title="Edit"
                                                                type="button"
                                                            >
                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                            
                                                            <button
                                                                onClick={() => handleApprovalClick(termination)}
                                                                className="text-gray-400 hover:text-gray-500"
                                                                title="Review"
                                                                type="button"
                                                            >
                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </button>
                                                            
                                                            <button
                                                                onClick={() => handleDeleteClick(termination)}
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
                                                </div>
                                            </div>
                                            
                                            {/* Status cell */}
                                            <div className="px-6 py-4 col-span-1 whitespace-nowrap">
                                                <StatusBadge status={termination.status} />
                                            </div>
                                            
                                            {/* Employee cell */}
                                            <div className="px-6 py-4 col-span-2 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">
                                                    {termination.employee?.Lname}, {termination.employee?.Fname}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {termination.employee?.idno}
                                                </div>
                                            </div>
                                            
                                            {/* Type cell */}
                                            <div className="px-6 py-4 col-span-1 whitespace-nowrap text-sm text-gray-500">
                                                {termination.termination_type}
                                            </div>
                                            
                                            {/* Notice Date cell */}
                                            <div className="px-6 py-4 col-span-1 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(termination.notice_date).toLocaleDateString()}
                                            </div>
                                            
                                            {/* Termination Date cell */}
                                            <div className="px-6 py-4 col-span-1 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(termination.termination_date).toLocaleDateString()}
                                            </div>
                                            
                                            {/* Reason cell */}
                                            <div className="px-6 py-4 col-span-1 text-sm text-gray-500 truncate">
                                                {termination.reason}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Termination Modals */}
            <TerminationModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Termination"
                termination={currentTermination}
                employees={employees}
                onChange={setCurrentTermination}
                onSubmit={handleCreateSubmit}
                mode="create"
                errorMessages={errors}
            />

            <TerminationModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Termination"
                termination={currentTermination}
                employees={employees}
                onChange={setCurrentTermination}
                onSubmit={handleUpdateSubmit}
                mode="edit"
                errorMessages={errors}
            />

            <TerminationModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title="View Termination Details"
                termination={currentTermination}
                employees={employees}
                onChange={setCurrentTermination}
                onSubmit={() => {}} // No submit action for view mode
                mode="view"
                errorMessages={{}}
            />

            <ApprovalModal
                isOpen={isApprovalModalOpen}
                onClose={() => setIsApprovalModalOpen(false)}
                termination={currentTermination}
                onSubmit={handleApprovalSubmit}
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

export default Termination;