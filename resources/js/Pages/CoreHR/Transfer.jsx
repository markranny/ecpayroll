
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
    ArrowLeftRight, // Changed from ArrowsRightLeft to ArrowLeftRight
    CheckCircle,
    XCircle,
    Clock,
    Check,
    Building
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

// Transfer Modal Component with Enhanced Employee Search
const TransferModal = ({ 
    isOpen, 
    onClose, 
    title, 
    transfer, 
    employees,
    departments,
    lines = [], // Provide default empty array
    onChange, 
    onSubmit, 
    mode = 'create',
    errorMessages = {}
}) => {
    const isViewMode = mode === 'view';
    const hasLinesData = Array.isArray(lines) && lines.length > 0;
    
    // State for employee search
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    
    // Filter employees when search term or employees list changes
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
        
        // Check for exact match to automatically select
        const exactMatch = filtered.find(employee => {
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
        
        // If exact match found and different from current selection, update - prevents infinite loop
        if (exactMatch && transfer.employee_id !== exactMatch.id) {
            onChange({...transfer, employee_id: exactMatch.id});
        }
        
        setFilteredEmployees(filtered);
    }, [employeeSearchTerm, employees, onChange, transfer.employee_id]); // Only depend on transfer.employee_id
    
    // Reset search term when modal opens
    useEffect(() => {
        if (isOpen) {
            setEmployeeSearchTerm('');
            setFilteredEmployees(employees || []);
        }
    }, [isOpen, employees]);
    
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
                
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                        {isViewMode ? (
                            <div className="p-2 border rounded bg-gray-100">
                                {transfer.employee ? `${transfer.employee.Lname || ''}, ${transfer.employee.Fname || ''} ${transfer.employee.idno ? `(${transfer.employee.idno})` : ''}` : 'Unknown Employee'}
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
                                    {transfer.employee_id && filteredEmployees.length > 0 && filteredEmployees.find(e => e.id === transfer.employee_id) && (
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
                                    {transfer.employee_id && filteredEmployees.find(e => e.id === transfer.employee_id) && 
                                        " - Employee selected"
                                    }
                                </div>
                                
                                <select
                                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.employee_id ? 'border-red-500' : ''}`}
                                    value={transfer.employee_id || ''}
                                    onChange={(e) => onChange({...transfer, employee_id: e.target.value})}
                                    required
                                    disabled={isViewMode}
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">From Department</label>
                            <select
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.from_department ? 'border-red-500' : ''}`}
                                value={transfer.from_department || ''}
                                onChange={(e) => onChange({...transfer, from_department: e.target.value})}
                                required
                                disabled={isViewMode}
                            >
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                                ))}
                            </select>
                            {errorMessages.from_department && <p className="mt-1 text-sm text-red-600">{errorMessages.from_department}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To Department</label>
                            <select
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.to_department ? 'border-red-500' : ''}`}
                                value={transfer.to_department || ''}
                                onChange={(e) => onChange({...transfer, to_department: e.target.value})}
                                required
                                disabled={isViewMode}
                            >
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                                ))}
                            </select>
                            {errorMessages.to_department && <p className="mt-1 text-sm text-red-600">{errorMessages.to_department}</p>}
                        </div>
                    </div>
                    
                    {/* Conditionally render line selection only if line data is available */}
                    {hasLinesData ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">From Line</label>
                                <select
                                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.from_line ? 'border-red-500' : ''}`}
                                    value={transfer.from_line || ''}
                                    onChange={(e) => onChange({...transfer, from_line: e.target.value})}
                                    disabled={isViewMode}
                                >
                                    <option value="">Select Line</option>
                                    {lines.map(line => (
                                        <option key={line.id} value={line.name}>{line.name}</option>
                                    ))}
                                </select>
                                {errorMessages.from_line && <p className="mt-1 text-sm text-red-600">{errorMessages.from_line}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To Line</label>
                                <select
                                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.to_line ? 'border-red-500' : ''}`}
                                    value={transfer.to_line || ''}
                                    onChange={(e) => onChange({...transfer, to_line: e.target.value})}
                                    disabled={isViewMode}
                                >
                                    <option value="">Select Line</option>
                                    {lines.map(line => (
                                        <option key={line.id} value={line.name}>{line.name}</option>
                                    ))}
                                </select>
                                {errorMessages.to_line && <p className="mt-1 text-sm text-red-600">{errorMessages.to_line}</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-2 mb-2">
                            <Alert>
                                <AlertDescription>
                                    Production line selection is currently unavailable. You can still create a transfer without specifying production lines.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Date</label>
                        <input
                            type="date"
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.transfer_date ? 'border-red-500' : ''}`}
                            value={transfer.transfer_date || ''}
                            onChange={(e) => onChange({...transfer, transfer_date: e.target.value})}
                            required
                            disabled={isViewMode}
                        />
                        {errorMessages.transfer_date && <p className="mt-1 text-sm text-red-600">{errorMessages.transfer_date}</p>}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                        <textarea
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.reason ? 'border-red-500' : ''}`}
                            value={transfer.reason || ''}
                            onChange={(e) => onChange({...transfer, reason: e.target.value})}
                            placeholder="Reason for transfer"
                            rows="3"
                            required
                            disabled={isViewMode}
                        />
                        {errorMessages.reason && <p className="mt-1 text-sm text-red-600">{errorMessages.reason}</p>}
                    </div>
                    
                    {/* View mode additional fields */}
                    {isViewMode && (
                        <>
                            {/* Status and other view-mode fields */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <div className="mt-1">
                                    <StatusBadge status={transfer.status} />
                                </div>
                            </div>
                            
                            {transfer.approved_by && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Approved By</label>
                                    <div className="mt-1 text-sm text-gray-900">
                                        {transfer.approver ? transfer.approver.name : 'Unknown User'}
                                    </div>
                                </div>
                            )}
                            
                            {transfer.approved_at && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Approved At</label>
                                    <div className="mt-1 text-sm text-gray-900">
                                        {new Date(transfer.approved_at).toLocaleString()}
                                    </div>
                                </div>
                            )}
                            
                            {transfer.remarks && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                                        {transfer.remarks}
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
                                {mode === 'create' ? 'Save Transfer' : 'Update Transfer'}
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
    transfer, 
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
                    <h2 className="text-lg font-semibold">Review Transfer Request</h2>
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
                            {transfer?.employee?.Fname} {transfer?.employee?.Lname} ({transfer?.employee?.idno})
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">From Department</label>
                            <div className="p-2 border rounded bg-gray-50">
                                {transfer?.from_department}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To Department</label>
                            <div className="p-2 border rounded bg-gray-50">
                                {transfer?.to_department}
                            </div>
                        </div>
                    </div>
                    
                    {(transfer?.from_line || transfer?.to_line) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {transfer?.from_line && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">From Line</label>
                                    <div className="p-2 border rounded bg-gray-50">
                                        {transfer?.from_line}
                                    </div>
                                </div>
                            )}
                            {transfer?.to_line && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">To Line</label>
                                    <div className="p-2 border rounded bg-gray-50">
                                        {transfer?.to_line}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Date</label>
                        <div className="p-2 border rounded bg-gray-50">
                            {new Date(transfer?.transfer_date).toLocaleDateString()}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                        <div className="p-2 border rounded bg-gray-50 whitespace-pre-line">
                            {transfer?.reason}
                        </div>
                    </div>
                    
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
                                    Approve Transfer
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject Transfer
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// Main Transfer Component with improved error handling
const Transfer = () => {
    // Safely get user from page props
    const { auth } = usePage().props;
    const user = auth?.user || {};
    
    const [transfers, setTransfers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [lines, setLines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
    
    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    
    // Transfer state
    const emptyTransfer = {
        employee_id: '',
        from_department: '',
        to_department: '',
        from_line: '',
        to_line: '',
        transfer_date: '',
        reason: ''
    };
    const [currentTransfer, setCurrentTransfer] = useState(emptyTransfer);
    
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

    // Modified loadData function with improved error handling
    const loadData = useCallback(async () => {
        setLoading(true);
        
        try {
            // Use Promise.allSettled to handle individual API failures
            const results = await Promise.allSettled([
                axios.get('/transfers/list', {
                    params: {
                        search: searchTerm,
                        status: statusFilter !== 'all' ? statusFilter : null,
                        date_from: dateFilter.from || null,
                        date_to: dateFilter.to || null
                    }
                }),
                axios.get('/employees/list', { params: { active_only: true } }),
                axios.get('/departments'),
                // Try to fetch lines data, but don't let it block other data
                axios.get('/lines').catch(error => {
                    console.error('Error loading lines:', error);
                    // Return an empty data structure
                    return { data: { data: [] } };
                })
            ]);
            
            // Process the results safely
            if (results[0].status === 'fulfilled') {
                setTransfers(results[0].value.data.data || []);
            } else {
                console.error('Error loading transfers:', results[0].reason);
                setTransfers([]);
                showToast('Error loading transfers. Please try again later.', 'error');
            }
            
            if (results[1].status === 'fulfilled') {
                setEmployees(results[1].value.data.data || []);
            } else {
                console.error('Error loading employees:', results[1].reason);
                setEmployees([]);
                showToast('Error loading employees. Please try again later.', 'error');
            }
            
            if (results[2].status === 'fulfilled') {
                setDepartments(results[2].value.data.data || []);
            } else {
                console.error('Error loading departments:', results[2].reason);
                setDepartments([]);
                showToast('Error loading departments. Please try again later.', 'error');
            }
            
            if (results[3].status === 'fulfilled') {
                setLines(results[3].value.data.data || []);
            } else {
                console.error('Error loading lines:', results[3].reason);
                // Set lines to empty array, which will disable line selection in the form
                setLines([]);
                
                // Show a non-blocking toast notification about lines
                if (results[0].status === 'fulfilled' && results[1].status === 'fulfilled' && results[2].status === 'fulfilled') {
                    showToast('Production line data is unavailable. Some features may be limited.', 'error');
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Error loading data: ' + (error.response?.data?.message || error.message), 'error');
            
            // Set all data to empty arrays as fallback
            setTransfers([]);
            setEmployees([]);
            setDepartments([]);
            setLines([]);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter, dateFilter]);

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

// Handle creating new transfer
const handleCreateClick = () => {
    setCurrentTransfer(emptyTransfer);
    setErrors({});
    setIsCreateModalOpen(true);
};

// Handle editing transfer
const handleEditClick = (transfer) => {
    setCurrentTransfer({...transfer});
    setErrors({});
    setIsEditModalOpen(true);
};

// Handle viewing transfer
const handleViewClick = (transfer) => {
    setCurrentTransfer({...transfer});
    setIsViewModalOpen(true);
};

// Handle approving/rejecting transfer
const handleApprovalClick = (transfer) => {
    setCurrentTransfer({...transfer});
    setIsApprovalModalOpen(true);
};

// Handle creating new transfer
const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    try {
        const response = await axios.post('/transfers', currentTransfer);
        
        // Update transfers list
        await loadData();
        
        // Reset form and close modal
        setCurrentTransfer(emptyTransfer);
        setIsCreateModalOpen(false);
        
        showToast('Transfer created successfully');
    } catch (error) {
        console.error('Error creating transfer:', error);
        
        // Handle validation errors
        if (error.response?.status === 422 && error.response?.data?.errors) {
            setErrors(error.response.data.errors);
        } else {
            showToast(error.response?.data?.message || 'Error creating transfer', 'error');
        }
    }
};

// Handle updating transfer
const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    try {
        const response = await axios.put(`/transfers/${currentTransfer.id}`, currentTransfer);
        
        // Update transfers list
        await loadData();
        
        // Reset form and close modal
        setCurrentTransfer(emptyTransfer);
        setIsEditModalOpen(false);
        
        showToast('Transfer updated successfully');
    } catch (error) {
        console.error('Error updating transfer:', error);
        
        // Handle validation errors
        if (error.response?.status === 422 && error.response?.data?.errors) {
            setErrors(error.response.data.errors);
        } else {
            showToast(error.response?.data?.message || 'Error updating transfer', 'error');
        }
    }
};

// Handle approving/rejecting transfer
const handleApprovalSubmit = async (data) => {
    try {
        const response = await axios.post(`/transfers/${currentTransfer.id}/status`, data);
        
        // Update transfers list
        await loadData();
        
        // Close modal
        setIsApprovalModalOpen(false);
        
        showToast(`Transfer ${data.status === 'approved' ? 'approved' : 'rejected'} successfully`);
    } catch (error) {
        console.error('Error updating transfer status:', error);
        showToast(error.response?.data?.message || 'Error updating transfer status', 'error');
    }
};

// Handle deleting transfer
const handleDeleteClick = (transfer) => {
    setConfirmModal({
        isOpen: true,
        title: 'Delete Transfer',
        message: `Are you sure you want to delete this transfer for ${transfer.employee.Fname} ${transfer.employee.Lname}? This action cannot be undone.`,
        confirmText: 'Delete',
        confirmVariant: 'destructive',
        onConfirm: async () => {
            try {
                await axios.delete(`/transfers/${transfer.id}`);
                
                // Update transfers list
                await loadData();
                
                setConfirmModal({ ...confirmModal, isOpen: false });
                showToast('Transfer deleted successfully');
            } catch (error) {
                console.error('Error deleting transfer:', error);
                setConfirmModal({ ...confirmModal, isOpen: false });
                showToast(error.response?.data?.message || 'Error deleting transfer', 'error');
            }
        }
    });
};

return (
    <AuthenticatedLayout>
    <Head title="Employee Transfers" />
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
                                Employee Transfers
                            </h1>
                            <p className="text-gray-600">
                                Manage employee department and line transfers.
                            </p>
                        </div>
                        <Button
                            onClick={handleCreateClick}
                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            New Transfer
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
                                        placeholder="Search by employee or department..."
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
                            
                            {/* Date Range Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Date</label>
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

                    {/* Transfers Table */}
                    <div className="bg-white shadow-md rounded-lg overflow-hidden">
                        {/* Table header */}
                        <div className="grid grid-cols-7 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="px-6 py-3 col-span-1">Actions</div>
                            <div className="px-6 py-3 col-span-1">Status</div>
                            <div className="px-6 py-3 col-span-1">Employee</div>
                            <div className="px-6 py-3 col-span-1">Transfer Date</div>
                            <div className="px-6 py-3 col-span-1">From</div>
                            <div className="px-6 py-3 col-span-1">To</div>
                            <div className="px-6 py-3 col-span-1">Reason</div>
                        </div>

                        {/* Table Body - Loading State */}
                        {loading && (
                            <div className="py-16 text-center text-gray-500">
                                Loading...
                            </div>
                        )}

                        {/* Table Body - No Results */}
                        {!loading && transfers.length === 0 && (
                            <div className="py-16 text-center text-gray-500">
                                {searchTerm || statusFilter !== 'all' || dateFilter.from || dateFilter.to
                                    ? 'No transfers found matching your filters.'
                                    : 'No transfers found. Create a new transfer to get started.'}
                            </div>
                        )}

                        {/* Table Body - Results */}
                        {!loading && transfers.length > 0 && (
                            <div className="divide-y divide-gray-200">
                                {transfers.map((transfer) => (
                                    <div 
                                        key={transfer.id}
                                        className="grid grid-cols-7 items-center hover:bg-gray-50"
                                    >
                                        {/* Actions cell */}
                                        <div className="px-6 py-4 col-span-1 whitespace-nowrap">
                                            <div className="flex space-x-3">
                                                <button
                                                    onClick={() => handleViewClick(transfer)}
                                                    className="text-gray-400 hover:text-gray-500"
                                                    title="View"
                                                    type="button"
                                                >
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                
                                                {transfer.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditClick(transfer)}
                                                            className="text-gray-400 hover:text-gray-500"
                                                            title="Edit"
                                                            type="button"
                                                        >
                                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        
                                                        <button
                                                            onClick={() => handleApprovalClick(transfer)}
                                                            className="text-gray-400 hover:text-gray-500"
                                                            title="Review"
                                                            type="button"
                                                        >
                                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </button>
                                                        
                                                        <button
                                                            onClick={() => handleDeleteClick(transfer)}
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
                                            <StatusBadge status={transfer.status} />
                                        </div>
                                        
                                        {/* Employee cell */}
                                        <div className="px-6 py-4 col-span-1 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">
                                                {transfer.employee?.Lname}, {transfer.employee?.Fname}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {transfer.employee?.idno}
                                            </div>
                                        </div>
                                        
                                        {/* Transfer Date cell */}
                                        <div className="px-6 py-4 col-span-1 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(transfer.transfer_date).toLocaleDateString()}
                                        </div>
                                        
                                        {/* From cell */}
                                        <div className="px-6 py-4 col-span-1 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {transfer.from_department}
                                            </div>
                                            {transfer.from_line && (
                                                <div className="text-xs text-gray-500">
                                                    {transfer.from_line}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* To cell */}
                                        <div className="px-6 py-4 col-span-1 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {transfer.to_department}
                                            </div>
                                            {transfer.to_line && (
                                                <div className="text-xs text-gray-500">
                                                    {transfer.to_line}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Reason cell */}
                                        <div className="px-6 py-4 col-span-1 text-sm text-gray-500 truncate">
                                            {transfer.reason}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Transfer Modals */}
        <TransferModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Transfer"
                transfer={currentTransfer}
                employees={employees}
                departments={departments}
                lines={lines}
                onChange={setCurrentTransfer}
                onSubmit={handleCreateSubmit}
                mode="create"
                errorMessages={errors}
            />


        <TransferModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            title="Edit Transfer"
            transfer={currentTransfer}
            employees={employees}
            departments={departments}
            lines={lines}
            onChange={setCurrentTransfer}
            onSubmit={handleUpdateSubmit}
            mode="edit"
            errorMessages={errors}
        />

        <TransferModal
            isOpen={isViewModalOpen}
            onClose={() => setIsViewModalOpen(false)}
            title="View Transfer Details"
            transfer={currentTransfer}
            employees={employees}
            departments={departments}
            lines={lines}
            onChange={setCurrentTransfer}
            onSubmit={() => {}}
            mode="view"
            errorMessages={{}}
        />

        <ApprovalModal
            isOpen={isApprovalModalOpen}
            onClose={() => setIsApprovalModalOpen(false)}
            transfer={currentTransfer}
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

export default Transfer;