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
    Award as AwardIcon,
    Gift,
    Calendar,
    Check,
    Upload,
    Image,
    CheckCircle  // Add this import
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
    const icon = type === 'success' ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-red-500" />;
    
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
// Award Modal Component with Enhanced Employee Search
const AwardModal = ({ 
    isOpen, 
    onClose, 
    title, 
    award, 
    employees,
    onChange, 
    onSubmit,
    onFileChange, 
    mode = 'create',
    errorMessages = {}
}) => {
    const isViewMode = mode === 'view';
    
    // State for file preview
    const [filePreview, setFilePreview] = useState(null);
    // New state for employee search
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    
    // Filter employees when search term or employees list changes
    
// Fixed version:
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
    
    // If exact match found, select that employee - but with a check to prevent infinite loops
    if (exactMatch && award.employee_id !== exactMatch.id) {
        onChange({...award, employee_id: exactMatch.id});
    }
    
    setFilteredEmployees(filtered);
}, [employeeSearchTerm, employees, onChange, award.employee_id]);
    
    // Reset search term and file preview when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setEmployeeSearchTerm('');
            setFilteredEmployees(employees || []);
            
            if (award.photo_path && !filePreview) {
                setFilePreview(`/storage/${award.photo_path}`);
            }
        } else {
            setFilePreview(null);
        }
    }, [isOpen, award.photo_path, filePreview, employees]);
    
    // Handle file input change
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFilePreview(reader.result);
            };
            reader.readAsDataURL(file);
            onFileChange(file);
        }
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
                
                <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                    {isViewMode ? (
                        <div className="p-2 border rounded bg-gray-100">
                            {award.employee ? `${award.employee.Lname || ''}, ${award.employee.Fname || ''} ${award.employee.idno ? `(${award.employee.idno})` : ''}` : 'Unknown Employee'}
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
                                {award.employee_id && filteredEmployees.length > 0 && filteredEmployees.find(e => e.id === award.employee_id) && (
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
                                {award.employee_id && filteredEmployees.find(e => e.id === award.employee_id) && 
                                    " - Employee selected"
                                }
                            </div>
                            
                            <select
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errorMessages.employee_id ? 'border-red-500' : ''}`}
                                value={award.employee_id || ''}
                                onChange={(e) => onChange({...award, employee_id: e.target.value})}
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Award Name</label>
                            <input
                                type="text"
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.award_name ? 'border-red-500' : ''}`}
                                value={award.award_name || ''}
                                onChange={(e) => onChange({...award, award_name: e.target.value})}
                                placeholder="e.g. Employee of the Month"
                                required
                                disabled={isViewMode}
                            />
                            {errorMessages.award_name && <p className="mt-1 text-sm text-red-600">{errorMessages.award_name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Award Type</label>
                            <input
                                type="text"
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.award_type ? 'border-red-500' : ''}`}
                                value={award.award_type || ''}
                                onChange={(e) => onChange({...award, award_type: e.target.value})}
                                placeholder="e.g. Performance, Service, Recognition"
                                required
                                disabled={isViewMode}
                            />
                            {errorMessages.award_type && <p className="mt-1 text-sm text-red-600">{errorMessages.award_type}</p>}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gift</label>
                            <input
                                type="text"
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.gift ? 'border-red-500' : ''}`}
                                value={award.gift || ''}
                                onChange={(e) => onChange({...award, gift: e.target.value})}
                                placeholder="e.g. Certificate, Trophy, Watch"
                                disabled={isViewMode}
                            />
                            {errorMessages.gift && <p className="mt-1 text-sm text-red-600">{errorMessages.gift}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cash Prize</label>
                            <input
                                type="number"
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.cash_price ? 'border-red-500' : ''}`}
                                value={award.cash_price || ''}
                                onChange={(e) => onChange({...award, cash_price: e.target.value})}
                                placeholder="e.g. 5000"
                                min="0"
                                step="0.01"
                                disabled={isViewMode}
                            />
                            {errorMessages.cash_price && <p className="mt-1 text-sm text-red-600">{errorMessages.cash_price}</p>}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Award Date</label>
                        <input
                            type="date"
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.award_date ? 'border-red-500' : ''}`}
                            value={award.award_date || ''}
                            onChange={(e) => onChange({...award, award_date: e.target.value})}
                            required
                            disabled={isViewMode}
                        />
                        {errorMessages.award_date && <p className="mt-1 text-sm text-red-600">{errorMessages.award_date}</p>}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.description ? 'border-red-500' : ''}`}
                            value={award.description || ''}
                            onChange={(e) => onChange({...award, description: e.target.value})}
                            placeholder="Details about the award and achievement"
                            rows="3"
                            disabled={isViewMode}
                        />
                        {errorMessages.description && <p className="mt-1 text-sm text-red-600">{errorMessages.description}</p>}
                    </div>
                    
                    {!isViewMode && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Award Photo</label>
                            <div className="mt-1 flex items-center">
                                <label className="w-full flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50">
                                    <div className="space-y-1 text-center">
                                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                                                <span>Upload a file</span>
                                                <input 
                                                    id="file-upload" 
                                                    name="file-upload" 
                                                    type="file" 
                                                    className="sr-only"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    disabled={isViewMode}
                                                />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 2MB</p>
                                    </div>
                                </label>
                            </div>
                            {errorMessages.photo && <p className="mt-1 text-sm text-red-600">{errorMessages.photo}</p>}
                        </div>
                    )}
                    
                    {/* File Preview */}
                    {filePreview && (
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Photo Preview</label>
                            <div className="mt-1 flex justify-center">
                                <img
                                    src={filePreview}
                                    alt="Award Photo Preview"
                                    className="object-cover h-48 w-auto rounded-md shadow"
                                />
                            </div>
                        </div>
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
                                {mode === 'create' ? 'Save Award' : 'Update Award'}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// Main Award Component
const Award = () => {
    // Safely get user from page props
    const { auth } = usePage().props;
    const user = auth?.user || {};
    
    const [awards, setAwards] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [awardTypeFilter, setAwardTypeFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
    
    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    
    // Award state
    const emptyAward = {
        employee_id: '',
        award_name: '',
        award_type: '',
        gift: '',
        cash_price: '',
        award_date: '',
        description: '',
        photo_path: ''
    };
    const [currentAward, setCurrentAward] = useState(emptyAward);
    const [awardFile, setAwardFile] = useState(null);
    
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
            const [awardsResponse, employeesResponse] = await Promise.all([
                axios.get('/awards/list', {
                    params: {
                        search: searchTerm,
                        award_type: awardTypeFilter !== 'all' ? awardTypeFilter : null,
                        date_from: dateFilter.from || null,
                        date_to: dateFilter.to || null
                    }
                }),
                axios.get('/employees/list', { params: { active_only: true } })
            ]);
            
            setAwards(awardsResponse.data.data || []);
            setEmployees(employeesResponse.data.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Error loading data: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, awardTypeFilter, dateFilter]);

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

    // Handle search input change
    const handleSearchChange = (e) => {
        const value = e.target.value;
        debouncedSearch(value);
    };

    // Debounced search handler
    const debouncedSearch = debounce((value) => {
        setSearchTerm(value);
    }, 300);

    // Handle creating new award
    const handleCreateClick = () => {
        setCurrentAward(emptyAward);
        setAwardFile(null);
        setErrors({});
        setIsCreateModalOpen(true);
    };

    // Handle editing award
    const handleEditClick = (award) => {
        setCurrentAward({...award});
        setAwardFile(null);
        setErrors({});
        setIsEditModalOpen(true);
    };

    // Handle viewing award
    const handleViewClick = (award) => {
        setCurrentAward({...award});
        setIsViewModalOpen(true);
    };

    // Handle file change
    const handleFileChange = (file) => {
        setAwardFile(file);
    };

    // Handle creating new award
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        
        const formData = new FormData();
        
        // Append award data to form data
        for (const key in currentAward) {
            if (currentAward[key] !== null && currentAward[key] !== undefined) {
                formData.append(key, currentAward[key]);
            }
        }
        
        // Append file if selected
        if (awardFile) {
            formData.append('photo', awardFile);
        }
        
        try {
            const response = await axios.post('/awards', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            // Update awards list
            await loadData();
            
            // Reset form and close modal
            setCurrentAward(emptyAward);
            setAwardFile(null);
            setIsCreateModalOpen(false);
            
            showToast('Award created successfully');
        } catch (error) {
            console.error('Error creating award:', error);
            
            // Handle validation errors
            if (error.response?.status === 422 && error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                showToast(error.response?.data?.message || 'Error creating award', 'error');
            }
        }
    };

    // Handle updating award
    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        
        const formData = new FormData();
        
        // Append award data to form data
        for (const key in currentAward) {
            if (currentAward[key] !== null && currentAward[key] !== undefined) {
                formData.append(key, currentAward[key]);
            }
        }
        
        // Append file if selected
        if (awardFile) {
            formData.append('photo', awardFile);
        }
        
        // Use PUT method with FormData
        formData.append('_method', 'PUT');
        
        try {
            const response = await axios.post(`/awards/${currentAward.id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            // Update awards list
            await loadData();
            
            // Reset form and close modal
            setCurrentAward(emptyAward);
            setAwardFile(null);
            setIsEditModalOpen(false);
            
            showToast('Award updated successfully');
        } catch (error) {
            console.error('Error updating award:', error);
            
            // Handle validation errors
            if (error.response?.status === 422 && error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                showToast(error.response?.data?.message || 'Error updating award', 'error');
            }
        }
    };

    // Handle deleting award
    const handleDeleteClick = (award) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Award',
            message: `Are you sure you want to delete the award "${award.award_name}" for ${award.employee.Fname} ${award.employee.Lname}? This action cannot be undone.`,
            confirmText: 'Delete',
            confirmVariant: 'destructive',
            onConfirm: async () => {
                try {
                    await axios.delete(`/awards/${award.id}`);
                    
                    // Update awards list
                    await loadData();
                    
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    showToast('Award deleted successfully');
                } catch (error) {
                    console.error('Error deleting award:', error);
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    showToast(error.response?.data?.message || 'Error deleting award', 'error');
                }
            }
        });
    };

    // Get unique award types for filter
    const getUniqueAwardTypes = () => {
        const types = [...new Set(awards.map(award => award.award_type))].filter(Boolean);
        return types;
    };

    // Handle reset filters
    const handleResetFilters = () => {
        setSearchTerm('');
        setAwardTypeFilter('all');
        setDateFilter({ from: '', to: '' });
        
        // Reset the search input field
        const searchInput = document.querySelector('input[placeholder="Search by name or award..."]');
        if (searchInput) {
            searchInput.value = '';
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Employee Awards" />
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
                                    Employee Awards
                                </h1>
                                <p className="text-gray-600">
                                    Recognize and celebrate employee achievements.
                                </p>
                            </div>
                            <Button
                                onClick={handleCreateClick}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                New Award
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
                                            placeholder="Search by name or award..."
                                            onChange={handleSearchChange}
                                        />
                                    </div>
                                </div>
                                
                                {/* Award Type Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Award Type</label>
                                    <select
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={awardTypeFilter}
                                        onChange={(e) => setAwardTypeFilter(e.target.value)}
                                    >
                                        <option value="all">All Award Types</option>
                                        {getUniqueAwardTypes().map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* Date Range Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Award Date</label>
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
                            
                            {/* Reset Filters Button */}
                            {(searchTerm || awardTypeFilter !== 'all' || dateFilter.from || dateFilter.to) && (
                                <div className="mt-4 flex justify-end">
                                    <Button
                                        onClick={handleResetFilters}
                                        variant="outline"
                                        className="text-sm"
                                    >
                                        Reset Filters
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Awards List/Grid */}
                        <div className="mb-8">
                            {/* Loading State */}
                            {loading && (
                                <div className="py-16 text-center text-gray-500">
                                    Loading...
                                </div>
                            )}

                            {/* No Results */}
                            {!loading && awards.length === 0 && (
                                <div className="py-16 text-center text-gray-500">
                                    {searchTerm || awardTypeFilter !== 'all' || dateFilter.from || dateFilter.to
                                        ? 'No awards found matching your filters.'
                                        : 'No awards found. Create a new award to get started.'}
                                </div>
                            )}

                            {/* Awards Grid */}
                            {!loading && awards.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {awards.map(award => (
                                        <div 
                                            key={award.id}
                                            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
                                        >
                                            {/* Award Image */}
                                            <div className="h-48 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                                                {award.photo_path ? (
                                                    <img 
                                                        src={`/storage/${award.photo_path}`}
                                                        alt={award.award_name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <AwardIcon className="h-20 w-20 text-white opacity-75" />
                                                )}
                                            </div>
                                            
                                            {/* Award Details */}
                                            <div className="p-5">
                                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                    {award.award_name}
                                                </h3>
                                                
                                                <div className="text-sm text-gray-700 mb-2">
                                                    Awarded to: <span className="font-medium">{award.employee?.Lname}, {award.employee?.Fname}</span>
                                                </div>
                                                
                                                <div className="flex items-center text-sm text-gray-600 mb-2">
                                                    <AwardIcon className="h-4 w-4 mr-1" />
                                                    <span>{award.award_type}</span>
                                                </div>
                                                
                                                <div className="flex items-center text-sm text-gray-600 mb-2">
                                                    <Calendar className="h-4 w-4 mr-1" />
                                                    <span>{new Date(award.award_date).toLocaleDateString()}</span>
                                                </div>
                                                
                                                {award.gift && (
                                                    <div className="flex items-center text-sm text-gray-600 mb-2">
                                                        <Gift className="h-4 w-4 mr-1" />
                                                        <span>{award.gift}</span>
                                                    </div>
                                                )}
                                                
                                                {award.cash_price && (
                                                    <div className="flex items-center text-sm text-gray-600 mb-4">
                                                        <span className="material-icons-outlined text-sm mr-1">monetization_on</span>
                                                        <span>${parseFloat(award.cash_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                )}
                                                
                                                {award.description && (
                                                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                                        {award.description}
                                                    </p>
                                                )}
                                                
                                                {/* Actions */}
                                                <div className="mt-4 flex justify-end space-x-2">
                                                    <button
                                                        onClick={() => handleViewClick(award)}
                                                        className="p-1 text-gray-400 hover:text-gray-500"
                                                        title="View Details"
                                                        type="button"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => handleEditClick(award)}
                                                        className="p-1 text-gray-400 hover:text-gray-500"
                                                        title="Edit"
                                                        type="button"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => handleDeleteClick(award)}
                                                        className="p-1 text-gray-400 hover:text-red-500"
                                                        title="Delete"
                                                        type="button"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
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

            {/* Award Modals */}
            <AwardModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Award"
                award={currentAward}
                employees={employees}
                onChange={setCurrentAward}
                onFileChange={handleFileChange}
                onSubmit={handleCreateSubmit}
                mode="create"
                errorMessages={errors}
            />

            <AwardModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Award"
                award={currentAward}
                employees={employees}
                onChange={setCurrentAward}
                onFileChange={handleFileChange}
                onSubmit={handleUpdateSubmit}
                mode="edit"
                errorMessages={errors}
            />

            <AwardModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title="View Award Details"
                award={currentAward}
                employees={employees}
                onChange={setCurrentAward}
                onFileChange={() => {}}
                onSubmit={() => {}}
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

export default Award;