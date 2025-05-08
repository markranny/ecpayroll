    import React, { useState, useEffect, useCallback } from 'react';
    import { Head, usePage } from '@inertiajs/react';
    import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
    import Sidebar from '@/Components/Sidebar';
    import { Button } from '@/components/ui/button';
    import { 
        Plus, Edit, Trash2, Save, X, Eye, ToggleLeft, ToggleRight,
        Briefcase, CheckCircle, XCircle, AlertTriangle, Check
    } from 'lucide-react';
    import { debounce } from 'lodash';
    import axios from 'axios';
    import Modal from '@/Components/Modal';
    import ConfirmModal from '@/Components/ConfirmModal';
    // Import react-window for virtualization
    import { FixedSizeList as List } from 'react-window';

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
        const icon = type === 'success' ? <Check className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-red-500" />;
        
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

    // Department Modal Component
    const DepartmentModal = ({ 
        isOpen, 
        onClose, 
        title, 
        department, 
        onChange, 
        onSubmit, 
        mode = 'create' 
    }) => {
        const isViewMode = mode === 'view';
        
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department Code</label>
                                <input
                                    type="text"
                                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''}`}
                                    value={department.code || ''}
                                    onChange={(e) => onChange({...department, code: e.target.value})}
                                    placeholder="e.g. HR, FIN, IT"
                                    required
                                    disabled={isViewMode}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
                                <input
                                    type="text"
                                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''}`}
                                    value={department.name || ''}
                                    onChange={(e) => onChange({...department, name: e.target.value})}
                                    placeholder="e.g. Human Resources"
                                    required
                                    disabled={isViewMode}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''}`}
                                value={department.description || ''}
                                onChange={(e) => onChange({...department, description: e.target.value})}
                                placeholder="Brief description of the department's function"
                                rows="3"
                                disabled={isViewMode}
                            />
                        </div>

                        {!isViewMode && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="active-status"
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                        checked={department.is_active}
                                        onChange={(e) => onChange({...department, is_active: e.target.checked})}
                                        disabled={isViewMode}
                                    />
                                    <label htmlFor="active-status" className="text-sm text-gray-700">Active</label>
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
                                    {mode === 'create' ? 'Save Department' : 'Update Department'}
                                </Button>
                            )}
                        </div>
                    </form>
                </div>
            </Modal>
        );
    };

    // Status Badge Component
    const StatusBadge = ({ isActive }) => {
        if (isActive) {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <span className="mr-1.5 h-2 w-2 bg-green-400 rounded-full"></span>
                    Active
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <span className="mr-1.5 h-2 w-2 bg-yellow-400 rounded-full"></span>
                    Inactive
                </span>
            );
        }
    };

    // Virtualized Departments Table using react-window
    const VirtualizedDepartmentsTable = ({ 
        loading, 
        filteredDepartments, 
        handleViewClick, 
        handleEditClick, 
        handleToggleActive, 
        handleDelete 
    }) => {
        // Table headers
        const tableHeaders = [
            { id: 'actions', title: 'ACTIONS', width: '150px' },
            { id: 'status', title: 'STATUS', width: '100px' },
            { id: 'code', title: 'CODE', width: '120px' },
            { id: 'name', title: 'DEPARTMENT NAME', width: '200px' },
            { id: 'description', title: 'DESCRIPTION', width: 'auto' }
        ];
        
        // If loading or no departments, show message
        if (loading) {
            return (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="border-b border-gray-200">
                        <div className="flex bg-gray-50 text-gray-500">
                            {tableHeaders.map(header => (
                                <div 
                                    key={header.id}
                                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider flex-1"
                                >
                                    {header.title}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="py-4 text-center text-gray-500">
                        Loading departments...
                    </div>
                </div>
            );
        }
        
        if (!loading && filteredDepartments.length === 0) {
            return (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="border-b border-gray-200">
                        <div className="flex bg-gray-50 text-gray-500">
                            {tableHeaders.map(header => (
                                <div 
                                    key={header.id}
                                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider flex-1"
                                >
                                    {header.title}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="py-4 text-center text-gray-500">
                        No departments found. Add a new department to get started.
                    </div>
                </div>
            );
        }

        // Define row height
        const ROW_HEIGHT = 64;
        
        // Row renderer function
        const Row = React.memo(({ index, style }) => {
            const department = filteredDepartments[index];
            const rowColor = !department.is_active ? 'bg-yellow-50' : '';
            
            return (
                <div 
                    className={`flex items-center w-full border-b border-gray-200 ${rowColor} hover:bg-gray-50`}
                    style={style}
                >
                    {/* Actions cell */}
                    <div className="px-6 flex-1">
                        <div className="flex space-x-3">
                            <button
                                onClick={() => handleViewClick(department)}
                                className="text-gray-400 hover:text-gray-500"
                                title="View"
                                type="button"
                            >
                                <Eye className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => handleEditClick(department)}
                                className="text-gray-400 hover:text-gray-500"
                                title="Edit"
                                type="button"
                            >
                                <Edit className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => handleToggleActive(department)}
                                className="text-gray-400 hover:text-gray-500"
                                title={department.is_active ? "Deactivate" : "Activate"}
                                type="button"
                            >
                                {department.is_active ? (
                                    <ToggleRight className="h-5 w-5 text-green-500" />
                                ) : (
                                    <ToggleLeft className="h-5 w-5 text-gray-400" />
                                )}
                            </button>
                            <button
                                onClick={() => handleDelete(department)}
                                className="text-gray-400 hover:text-red-500"
                                title="Delete"
                                type="button"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Status cell */}
                    <div className="px-6 flex-1">
                        {department.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <span className="mr-1.5 h-2 w-2 bg-green-400 rounded-full"></span>
                                Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <span className="mr-1.5 h-2 w-2 bg-yellow-400 rounded-full"></span>
                                Inactive
                            </span>
                        )}
                    </div>
                    
                    {/* Code cell */}
                    <div className="px-6 flex-1 text-sm font-medium text-gray-900">
                        {department.code}
                    </div>
                    
                    {/* Name cell */}
                    <div className="px-6 flex-1 text-sm text-gray-900">
                        {department.name}
                    </div>
                    
                    {/* Description cell */}
                    <div className="px-6 flex-1 text-sm text-gray-500 overflow-hidden">
                        {department.description || 'No description provided'}
                    </div>
                </div>
            );
        });
        
        return (
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {/* Fixed header */}
                <div className="border-b border-gray-200">
                    <div className="flex bg-gray-50 text-gray-500">
                        {tableHeaders.map(header => (
                            <div 
                                key={header.id}
                                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider flex-1"
                            >
                                {header.title}
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Virtualized list */}
                <List
                    height={600} // equivalent to 60vh
                    width="100%"
                    itemCount={filteredDepartments.length}
                    itemSize={ROW_HEIGHT}
                    className="overflow-auto"
                >
                    {Row}
                </List>
            </div>
        );
    };

    // Main Departments Component
    const Departments = () => {
        // Make sure we safely access auth and user
        const { auth } = usePage().props || {};
        const user = auth?.user || {};
        
        const [departments, setDepartments] = useState([]);
        const [loading, setLoading] = useState(true);
        const [filteredDepartments, setFilteredDepartments] = useState([]);
        const [activeFilter, setActiveFilter] = useState('All Departments');
        
        // Toast state
        const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
        
        // Department state
        const emptyDepartment = { name: '', code: '', description: '', is_active: true };
        const [currentDepartment, setCurrentDepartment] = useState(emptyDepartment);
        
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

        // Load departments
        const loadDepartments = useCallback(async () => {
            setLoading(true);
            try {
                // Using the correct non-API route as defined in web.php
                const response = await axios.get('/departments');
                setDepartments(response.data.data || []);
            } catch (error) {
                console.error('Error loading departments:', error);
                showToast('Error loading departments: ' + (error.response?.data?.message || error.message), 'error');
            } finally {
                setLoading(false);
            }
        }, []);

        // Load data on component mount
        useEffect(() => {
            loadDepartments();
        }, [loadDepartments]);

        // Calculate statistics
        const totalDepartments = departments.length;
        const activeDepartments = departments.filter(dept => dept.is_active).length;
        const inactiveDepartments = departments.filter(dept => !dept.is_active).length;
        
        // State for search term
        const [searchTerm, setSearchTerm] = useState('');
        
        // Filter departments based on status filter and search term
        useEffect(() => {
            let results = [...departments];
            
            // Apply status filter
            if (activeFilter === 'Active') {
                results = results.filter(department => department.is_active);
            } else if (activeFilter === 'Inactive') {
                results = results.filter(department => !department.is_active);
            }
            
            // Apply search filter if search term exists
            if (searchTerm.trim() !== '') {
                const lowercasedSearchTerm = searchTerm.toLowerCase();
                results = results.filter(department => 
                    department.name.toLowerCase().includes(lowercasedSearchTerm) || 
                    department.code.toLowerCase().includes(lowercasedSearchTerm) ||
                    (department.description && department.description.toLowerCase().includes(lowercasedSearchTerm))
                );
            }
            
            setFilteredDepartments(results);
        }, [departments, activeFilter, searchTerm]);

        // Show toast notification
        const showToast = (message, type = 'success') => {
            setToast({ visible: true, message, type });
        };

        // Close toast notification
        const closeToast = () => {
            setToast({ ...toast, visible: false });
        };

        // Open create modal
        const handleCreateClick = () => {
            setCurrentDepartment(emptyDepartment);
            setIsCreateModalOpen(true);
        };

        // Open edit modal
        const handleEditClick = (department) => {
            setCurrentDepartment({...department});
            setIsEditModalOpen(true);
        };

        // Open view modal
        const handleViewClick = (department) => {
            setCurrentDepartment({...department});
            setIsViewModalOpen(true);
        };

        // Handle creating new department
        const handleCreateSubmit = async (e) => {
            e.preventDefault();
            
            // Validate
            if (!currentDepartment.name || !currentDepartment.code) {
                showToast('Department name and code are required', 'error');
                return;
            }
            
            try {
                // Using the correct non-API route
                const response = await axios.post('/departments', currentDepartment);
                
                // Update departments list
                await loadDepartments();
                
                // Reset form and close modal
                setCurrentDepartment(emptyDepartment);
                setIsCreateModalOpen(false);
                
                showToast('Department created successfully');
            } catch (error) {
                console.error('Error creating department:', error);
                showToast(error.response?.data?.message || 'Error creating department', 'error');
            }
        };

        // Handle updating department
        const handleUpdateSubmit = async (e) => {
            e.preventDefault();
            
            // Validate
            if (!currentDepartment.name || !currentDepartment.code) {
                showToast('Department name and code are required', 'error');
                return;
            }
            
            try {
                // Using the correct non-API route
                const response = await axios.put(`/departments/${currentDepartment.id}`, currentDepartment);
                
                // Update departments list through refetch
                await loadDepartments();
                
                // Reset editing state and close modal
                setCurrentDepartment(emptyDepartment);
                setIsEditModalOpen(false);
                
                showToast('Department updated successfully');
            } catch (error) {
                console.error('Error updating department:', error);
                showToast(error.response?.data?.message || 'Error updating department', 'error');
            }
        };

        // Handle deleting department
        const handleDelete = (department) => {
            setConfirmModal({
                isOpen: true,
                title: 'Delete Department',
                message: `Are you sure you want to delete the department "${department.name}"? This action cannot be undone.`,
                confirmText: 'Delete',
                confirmVariant: 'destructive',
                onConfirm: async () => {
                    try {
                        // Using the correct non-API route
                        await axios.delete(`/departments/${department.id}`);
                        
                        // Update departments list through refetch
                        await loadDepartments();
                        
                        setConfirmModal({ ...confirmModal, isOpen: false });
                        showToast('Department deleted successfully');
                    } catch (error) {
                        console.error('Error deleting department:', error);
                        setConfirmModal({ ...confirmModal, isOpen: false });
                        showToast(error.response?.data?.message || 'Error deleting department', 'error');
                    }
                }
            });
        };

        // Handle toggling active status
        const handleToggleActive = async (department) => {
            try {
                // Using the correct non-API route
                const response = await axios.patch(`/departments/${department.id}/toggle-active`);
                
                // Update departments list through refetch
                await loadDepartments();
                
                showToast('Department status updated successfully');
            } catch (error) {
                console.error('Error toggling department status:', error);
                showToast(error.response?.data?.message || 'Error updating department status', 'error');
            }
        };

        return (
            <AuthenticatedLayout>
                <Head title="Manage Departments" />
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
                                        Department Management
                                    </h1>
                                    <p className="text-gray-600">
                                        Create, edit, and organize company departments.
                                    </p>
                                </div>
                                <div>
                                    <Button
                                        onClick={handleCreateClick}
                                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                                    >
                                        <Plus className="w-5 h-5 mr-2" />
                                        Add Department
                                    </Button>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <div className="bg-white shadow rounded-lg p-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium">Total Departments</p>
                                        <p className="text-3xl font-bold">{totalDepartments}</p>
                                    </div>
                                    <div className="rounded-full p-3 bg-indigo-100">
                                        <Briefcase className="h-6 w-6 text-indigo-600" />
                                    </div>
                                </div>
                                
                                <div className="bg-white shadow rounded-lg p-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium">Active Departments</p>
                                        <p className="text-3xl font-bold">{activeDepartments}</p>
                                    </div>
                                    <div className="rounded-full p-3 bg-green-100">
                                        <CheckCircle className="h-6 w-6 text-green-600" />
                                    </div>
                                </div>
                                
                                <div className="bg-white shadow rounded-lg p-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium">Inactive Departments</p>
                                        <p className="text-3xl font-bold">{inactiveDepartments}</p>
                                    </div>
                                    <div className="rounded-full p-3 bg-yellow-100">
                                        <AlertTriangle className="h-6 w-6 text-yellow-600" />
                                    </div>
                                </div>
                            </div>

                            {/* Search Bar */}
                            <div className="mb-6">
                                <div className="relative">
                                    <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                        <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                                        </svg>
                                    </div>
                                    <input 
                                        type="search" 
                                        className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500" 
                                        placeholder="Search departments..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            {/* Status Filter Tabs */}
                            <div className="mb-6">
                                <div className="flex border-b border-gray-200">
                                    <button
                                        className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${activeFilter === 'All Departments' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                        onClick={() => setActiveFilter('All Departments')}
                                    >
                                        All Departments
                                    </button>
                                    <button
                                        className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${activeFilter === 'Active' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                        onClick={() => setActiveFilter('Active')}
                                    >
                                        <svg className="w-4 h-4 inline-block mr-1.5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Active
                                    </button>
                                    <button
                                        className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${activeFilter === 'Inactive' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                        onClick={() => setActiveFilter('Inactive')}
                                    >
                                        <svg className="w-4 h-4 inline-block mr-1.5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        Inactive
                                    </button>
                                </div>
                            </div>

                            {/* Virtualized table component */}
                            <VirtualizedDepartmentsTable
                                loading={loading}
                                filteredDepartments={filteredDepartments}
                                handleViewClick={handleViewClick}
                                handleEditClick={handleEditClick}
                                handleToggleActive={handleToggleActive}
                                handleDelete={handleDelete}
                            />
                        </div>
                    </div>
                </div>

                {/* Department Modals */}
                <DepartmentModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    title="Add New Department"
                    department={currentDepartment}
                    onChange={setCurrentDepartment}
                    onSubmit={handleCreateSubmit}
                    mode="create"
                />

                <DepartmentModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title="Edit Department"
                    department={currentDepartment}
                    onChange={setCurrentDepartment}
                    onSubmit={handleUpdateSubmit}
                    mode="edit"
                />

                <DepartmentModal
                    isOpen={isViewModalOpen}
                    onClose={() => setIsViewModalOpen(false)}
                    title="View Department Details"
                    department={currentDepartment}
                    onChange={setCurrentDepartment}
                    onSubmit={() => {}} // No submit action for view mode
                    mode="view"
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

    export default Departments;