import React, { useState, useEffect, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import { Button } from '@/components/ui/button';
import { 
    Search, 
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    Building,
    Layers,
    Eye,
    ToggleLeft,
    ToggleRight,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Check
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

// Line Modal Component
const LineModal = ({ 
    isOpen, 
    onClose, 
    title, 
    line, 
    departments,
    onChange, 
    onSubmit, 
    mode = 'create',
    errorMessages = {}
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Line Code</label>
                            <input
                                type="text"
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.code ? 'border-red-500' : ''}`}
                                value={line.code || ''}
                                onChange={(e) => onChange({...line, code: e.target.value})}
                                placeholder="e.g. L001, L002"
                                required
                                disabled={isViewMode}
                            />
                            {errorMessages.code && <p className="mt-1 text-sm text-red-600">{errorMessages.code}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Line Name</label>
                            <input
                                type="text"
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.name ? 'border-red-500' : ''}`}
                                value={line.name || ''}
                                onChange={(e) => onChange({...line, name: e.target.value})}
                                placeholder="e.g. Production Line 1"
                                required
                                disabled={isViewMode}
                            />
                            {errorMessages.name && <p className="mt-1 text-sm text-red-600">{errorMessages.name}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <select
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.department_id ? 'border-red-500' : ''}`}
                            value={line.department_id || ''}
                            onChange={(e) => onChange({...line, department_id: e.target.value})}
                            required
                            disabled={isViewMode}
                        >
                            <option value="">Select Department</option>
                            {departments.filter(dept => dept.is_active).map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                        {errorMessages.department_id && <p className="mt-1 text-sm text-red-600">{errorMessages.department_id}</p>}
                    </div>

                    {!isViewMode && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="active-status"
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                    checked={line.is_active}
                                    onChange={(e) => onChange({...line, is_active: e.target.checked})}
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
                                {mode === 'create' ? 'Save Line' : 'Update Line'}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// Section Modal Component
const SectionModal = ({ 
    isOpen, 
    onClose, 
    title, 
    section, 
    lines,
    onChange, 
    onSubmit, 
    mode = 'create',
    errorMessages = {}
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Section Code</label>
                            <input
                                type="text"
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.code ? 'border-red-500' : ''}`}
                                value={section.code || ''}
                                onChange={(e) => onChange({...section, code: e.target.value})}
                                placeholder="e.g. S001, S002"
                                required
                                disabled={isViewMode}
                            />
                            {errorMessages.code && <p className="mt-1 text-sm text-red-600">{errorMessages.code}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Section Name</label>
                            <input
                                type="text"
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.name ? 'border-red-500' : ''}`}
                                value={section.name || ''}
                                onChange={(e) => onChange({...section, name: e.target.value})}
                                placeholder="e.g. Assembly Section"
                                required
                                disabled={isViewMode}
                            />
                            {errorMessages.name && <p className="mt-1 text-sm text-red-600">{errorMessages.name}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Line</label>
                        <select
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewMode ? 'bg-gray-100' : ''} ${errorMessages.line_id ? 'border-red-500' : ''}`}
                            value={section.line_id || ''}
                            onChange={(e) => onChange({...section, line_id: e.target.value})}
                            required
                            disabled={isViewMode}
                        >
                            <option value="">Select Line</option>
                            {lines.filter(line => line.is_active).map(line => (
                                <option key={line.id} value={line.id}>{line.name}</option>
                            ))}
                        </select>
                        {errorMessages.line_id && <p className="mt-1 text-sm text-red-600">{errorMessages.line_id}</p>}
                    </div>

                    {!isViewMode && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="active-status"
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                    checked={section.is_active}
                                    onChange={(e) => onChange({...section, is_active: e.target.checked})}
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
                                {mode === 'create' ? 'Save Section' : 'Update Section'}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// Main Lines and Sections Component
const LinesAndSections = () => {
    // Safely get user from page props
    const { auth } = usePage().props;
    const user = auth?.user || { name: 'User', email: '' };
    
    const [activeTab, setActiveTab] = useState('lines');
    const [lines, setLines] = useState([]);
    const [sections, setSections] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    
    // Line and section states
    const [currentLine, setCurrentLine] = useState({ name: '', code: '', department_id: '', is_active: true });
    const [currentSection, setCurrentSection] = useState({ name: '', code: '', line_id: '', is_active: true });
    
    // Modal states
    const [isCreateLineModalOpen, setIsCreateLineModalOpen] = useState(false);
    const [isEditLineModalOpen, setIsEditLineModalOpen] = useState(false);
    const [isViewLineModalOpen, setIsViewLineModalOpen] = useState(false);
    const [isCreateSectionModalOpen, setIsCreateSectionModalOpen] = useState(false);
    const [isEditSectionModalOpen, setIsEditSectionModalOpen] = useState(false);
    const [isViewSectionModalOpen, setIsViewSectionModalOpen] = useState(false);
    
    // Error states for validation
    const [lineErrors, setLineErrors] = useState({});
    const [sectionErrors, setSectionErrors] = useState({});
    
    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '',
        confirmVariant: 'destructive',
        onConfirm: () => {}
    });
    
    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [filteredLines, setFilteredLines] = useState([]);
    const [filteredSections, setFilteredSections] = useState([]);

    // Load data function
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [linesResponse, sectionsResponse, departmentsResponse] = await Promise.all([
                axios.get('/lines'),
                axios.get('/sections'),
                axios.get('/departments')
            ]);
            
            setLines(linesResponse.data.data || []);
            setSections(sectionsResponse.data.data || []);
            setDepartments(departmentsResponse.data.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Error loading data: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // Load data on component mount
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Calculate statistics
    const totalLines = lines.length;
    const activeLines = lines.filter(line => line.is_active).length;
    const inactiveLines = lines.filter(line => !line.is_active).length;
    
    const totalSections = sections.length;
    const activeSections = sections.filter(section => section.is_active).length;
    const inactiveSections = sections.filter(section => !section.is_active).length;
    
    // Filter lines based on status filter and search term
    useEffect(() => {
        let results = [...lines];
        
        // Apply status filter
        if (activeFilter === 'Active') {
            results = results.filter(line => line.is_active);
        } else if (activeFilter === 'Inactive') {
            results = results.filter(line => !line.is_active);
        }
        
        // Apply search filter
        if (searchTerm.trim() !== '') {
            const lowercasedSearchTerm = searchTerm.toLowerCase();
            results = results.filter(line => 
                line.name.toLowerCase().includes(lowercasedSearchTerm) || 
                line.code.toLowerCase().includes(lowercasedSearchTerm)
            );
        }
        
        // Add department name to each line
        results = results.map(line => {
            const department = departments.find(dept => dept.id === line.department_id);
            return {
                ...line,
                department: department || null
            };
        });
        
        setFilteredLines(results);
    }, [lines, departments, activeFilter, searchTerm]);

    // Filter sections based on status filter and search term
    useEffect(() => {
        let results = [...sections];
        
        // Apply status filter
        if (activeFilter === 'Active') {
            results = results.filter(section => section.is_active);
        } else if (activeFilter === 'Inactive') {
            results = results.filter(section => !section.is_active);
        }
        
        // Apply search filter
        if (searchTerm.trim() !== '') {
            const lowercasedSearchTerm = searchTerm.toLowerCase();
            results = results.filter(section => 
                section.name.toLowerCase().includes(lowercasedSearchTerm) || 
                section.code.toLowerCase().includes(lowercasedSearchTerm)
            );
        }
        
        // Add line name to each section
        results = results.map(section => {
            const line = lines.find(line => line.id === section.line_id);
            return {
                ...section,
                line: line || null
            };
        });
        
        setFilteredSections(results);
    }, [sections, lines, activeFilter, searchTerm]);

    // Show toast notification
    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
    };

    // Line handlers
    const handleCreateLineClick = () => {
        setCurrentLine({ name: '', code: '', department_id: '', is_active: true });
        setLineErrors({});
        setIsCreateLineModalOpen(true);
    };

    const handleEditLineClick = (line) => {
        setCurrentLine({...line});
        setLineErrors({});
        setIsEditLineModalOpen(true);
    };

    const handleViewLineClick = (line) => {
        setCurrentLine({...line});
        setIsViewLineModalOpen(true);
    };

    // Verify active department before line creation/update
    const handleCreateLineSubmit = async (e) => {
        e.preventDefault();
        setLineErrors({});
        
        // Validate
        if (!currentLine.name || !currentLine.code || !currentLine.department_id) {
            const errors = {};
            if (!currentLine.name) errors.name = 'Line name is required';
            if (!currentLine.code) errors.code = 'Line code is required';
            if (!currentLine.department_id) errors.department_id = 'Department is required';
            
            setLineErrors(errors);
            return;
        }
        
        // Verify that selected department is active
        const selectedDepartment = departments.find(dept => dept.id === parseInt(currentLine.department_id));
        if (!selectedDepartment || !selectedDepartment.is_active) {
            setLineErrors({
                department_id: 'Please select an active department'
            });
            return;
        }
        
        try {
            // Using the correct non-API route
            const response = await axios.post('/lines', currentLine);
            
            // Update lines list
            await loadData();
            
            // Reset form and close modal
            setCurrentLine({ name: '', code: '', department_id: '', is_active: true });
            setIsCreateLineModalOpen(false);
            
            showToast('Line created successfully');
        } catch (error) {
            console.error('Error creating line:', error);
            
            // Handle validation errors
            if (error.response?.status === 422 && error.response?.data?.errors) {
                setLineErrors(error.response.data.errors);
            } else {
                showToast(error.response?.data?.message || 'Error creating line', 'error');
            }
        }
    };

    const handleUpdateLineSubmit = async (e) => {
        e.preventDefault();
        setLineErrors({});
        
        // Validate
        if (!currentLine.name || !currentLine.code || !currentLine.department_id) {
            const errors = {};
            if (!currentLine.name) errors.name = 'Line name is required';
            if (!currentLine.code) errors.code = 'Line code is required';
            if (!currentLine.department_id) errors.department_id = 'Department is required';
            
            setLineErrors(errors);
            return;
        }
        
        // Verify that selected department is active
        const selectedDepartment = departments.find(dept => dept.id === parseInt(currentLine.department_id));
        if (!selectedDepartment || !selectedDepartment.is_active) {
            setLineErrors({
                department_id: 'Please select an active department'
            });
            return;
        }
        
        try {
            // Using the correct non-API route
            const response = await axios.put(`/lines/${currentLine.id}`, currentLine);
            
            // Update lines list through refetch
            await loadData();
            
            // Reset editing state and close modal
            setCurrentLine({ name: '', code: '', department_id: '', is_active: true });
            setIsEditLineModalOpen(false);
            
            showToast('Line updated successfully');
        } catch (error) {
            console.error('Error updating line:', error);
            
            // Handle validation errors
            if (error.response?.status === 422 && error.response?.data?.errors) {
                setLineErrors(error.response.data.errors);
            } else {
                showToast(error.response?.data?.message || 'Error updating line', 'error');
            }
        }
    };

    const handleDeleteLine = (line) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Line',
            message: `Are you sure you want to delete the line "${line.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            confirmVariant: 'destructive',
            onConfirm: async () => {
                try {
                    // Using the correct non-API route
                    await axios.delete(`/lines/${line.id}`);
                    
                    // Update lines list through refetch
                    await loadData();
                    
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    showToast('Line deleted successfully');
                } catch (error) {
                    console.error('Error deleting line:', error);
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    showToast(error.response?.data?.message || 'Error deleting line', 'error');
                }
            }
        });
    };

    const handleToggleActiveLine = async (line) => {
        try {
            // Using the correct non-API route
            const response = await axios.patch(`/lines/${line.id}/toggle-active`);
            
            // Update lines list through refetch
            await loadData();
            
            showToast('Line status updated successfully');
        } catch (error) {
            console.error('Error toggling line status:', error);
            showToast(error.response?.data?.message || 'Error updating line status', 'error');
        }
    };

    // Section handlers
    const handleCreateSectionClick = () => {
        setCurrentSection({ name: '', code: '', line_id: '', is_active: true });
        setSectionErrors({});
        setIsCreateSectionModalOpen(true);
    };

    const handleEditSectionClick = (section) => {
        setCurrentSection({...section});
        setSectionErrors({});
        setIsEditSectionModalOpen(true);
    };

    const handleViewSectionClick = (section) => {
        setCurrentSection({...section});
        setIsViewSectionModalOpen(true);
    };

    // Verify active line before section creation/update
    const handleCreateSectionSubmit = async (e) => {
        e.preventDefault();
        setSectionErrors({});
        
        // Validate
        if (!currentSection.name || !currentSection.code || !currentSection.line_id) {
            const errors = {};
            if (!currentSection.name) errors.name = 'Section name is required';
            if (!currentSection.code) errors.code = 'Section code is required';
            if (!currentSection.line_id) errors.line_id = 'Line is required';
            
            setSectionErrors(errors);
            return;
        }
        
        // Verify that selected line is active
        const selectedLine = lines.find(line => line.id === parseInt(currentSection.line_id));
        if (!selectedLine || !selectedLine.is_active) {
            setSectionErrors({
                line_id: 'Please select an active line'
            });
            return;
        }
        
        try {
            // Using the correct non-API route
            const response = await axios.post('/sections', currentSection);
            
            // Update sections list
            await loadData();
            
            // Reset form and close modal
            setCurrentSection({ name: '', code: '', line_id: '', is_active: true });
            setIsCreateSectionModalOpen(false);
            
            showToast('Section created successfully');
        } catch (error) {
            console.error('Error creating section:', error);
            
            // Handle validation errors
            if (error.response?.status === 422 && error.response?.data?.errors) {
                setSectionErrors(error.response.data.errors);
            } else {
                showToast(error.response?.data?.message || 'Error creating section', 'error');
            }
        }
    };

    const handleUpdateSectionSubmit = async (e) => {
        e.preventDefault();
        setSectionErrors({});
        
        // Validate
        if (!currentSection.name || !currentSection.code || !currentSection.line_id) {
            const errors = {};
            if (!currentSection.name) errors.name = 'Section name is required';
            if (!currentSection.code) errors.code = 'Section code is required';
            if (!currentSection.line_id) errors.line_id = 'Line is required';
            
            setSectionErrors(errors);
            return;
        }
        
        // Verify that selected line is active
        const selectedLine = lines.find(line => line.id === parseInt(currentSection.line_id));
        if (!selectedLine || !selectedLine.is_active) {
            setSectionErrors({
                line_id: 'Please select an active line'
            });
            return;
        }
        
        try {
            // Using the correct non-API route
            const response = await axios.put(`/sections/${currentSection.id}`, currentSection);
            
            // Update sections list through refetch
            await loadData();
            
            // Reset editing state and close modal
            setCurrentSection({ name: '', code: '', line_id: '', is_active: true });
            setIsEditSectionModalOpen(false);
            
            showToast('Section updated successfully');
        } catch (error) {
            console.error('Error updating section:', error);
            
            // Handle validation errors
            if (error.response?.status === 422 && error.response?.data?.errors) {
                setSectionErrors(error.response.data.errors);
            } else {
                showToast(error.response?.data?.message || 'Error updating section', 'error');
            }
        }
    };

    const handleDeleteSection = (section) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Section',
            message: `Are you sure you want to delete the section "${section.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            confirmVariant: 'destructive',
            onConfirm: async () => {
                try {
                    // Using the correct non-API route
                    await axios.delete(`/sections/${section.id}`);
                    
                    // Update sections list through refetch
                    await loadData();
                    
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    showToast('Section deleted successfully');
                } catch (error) {
                    console.error('Error deleting section:', error);
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    showToast(error.response?.data?.message || 'Error deleting section', 'error');
                }
            }
        });
    };

    const handleToggleActiveSection = async (section) => {
        try {
            // Using the correct non-API route
            const response = await axios.patch(`/sections/${section.id}/toggle-active`);
            
            // Update sections list through refetch
            await loadData();
            
            showToast('Section status updated successfully');
        } catch (error) {
            console.error('Error toggling section status:', error);
            showToast(error.response?.data?.message || 'Error updating section status', 'error');
        }
    };

    // Debounced search handler
    const debouncedSearch = debounce((value) => {
        setSearchTerm(value);
    }, 300);

    return (
        <AuthenticatedLayout>
            <Head title="Lines and Sections Management" />
            <div className="flex min-h-screen bg-gray-50/50">
                <Sidebar />
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Toast Notification */}
                        {toast.visible && (
                            <Toast 
                                message={toast.message}
                                type={toast.type}
                                onClose={() => setToast({...toast, visible: false})}
                            />
                        )}

                        {/* Header Section */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    {activeTab === 'lines' ? 'Line Management' : 'Section Management'}
                                </h1>
                                <p className="text-gray-600">
                                    Create, edit, and organize {activeTab === 'lines' ? 'production lines' : 'production sections'}.
                                </p>
                            </div>
                            <Button
                                onClick={activeTab === 'lines' ? handleCreateLineClick : handleCreateSectionClick}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                Add {activeTab === 'lines' ? 'Line' : 'Section'}
                            </Button>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="border-b border-gray-200 mb-6">
                            <div className="flex">
                                <button
                                    className={`px-4 py-3 text-sm font-medium text-center border-b-2 ${activeTab === 'lines' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                    onClick={() => {
                                        setActiveTab('lines');
                                        setActiveFilter('All');
                                        setSearchTerm('');
                                    }}
                                >
                                    <Building className="w-4 h-4 inline-block mr-2" />
                                    Lines
                                </button>
                                <button
                                    className={`px-4 py-3 text-sm font-medium text-center border-b-2 ${activeTab === 'sections' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                    onClick={() => {
                                        setActiveTab('sections');
                                        setActiveFilter('All');
                                        setSearchTerm('');
                                    }}
                                >
                                    <Layers className="w-4 h-4 inline-block mr-2" />
                                    Sections
                                </button>
                            </div>
                        </div>

                        {/* Lines Content */}
                        {activeTab === 'lines' && (
                            <>
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    <div className="bg-white shadow rounded-lg p-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Total Lines</p>
                                            <p className="text-3xl font-bold">{totalLines}</p>
                                        </div>
                                        <div className="rounded-full p-3 bg-indigo-100">
                                            <Building className="h-6 w-6 text-indigo-600" />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white shadow rounded-lg p-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Active Lines</p>
                                            <p className="text-3xl font-bold">{activeLines}</p>
                                        </div>
                                        <div className="rounded-full p-3 bg-green-100">
                                            <CheckCircle className="h-6 w-6 text-green-600" />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white shadow rounded-lg p-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Inactive Lines</p>
                                            <p className="text-3xl font-bold">{inactiveLines}</p>
                                        </div>
                                        <div className="rounded-full p-3 bg-yellow-100">
                                            <AlertTriangle className="h-6 w-6 text-yellow-600" />
                                        </div>
                                    </div>
                                </div>

                                {/* Action Bar - Full width search */}
                                <div className="mb-6">
                                    <div className="relative w-full">
                                        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                            <Search className="w-4 h-4 text-gray-500" />
                                        </div>
                                        <input 
                                            type="search" 
                                            className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500" 
                                            placeholder="Search lines..." 
                                            onChange={(e) => debouncedSearch(e.target.value)}
                                            defaultValue={searchTerm}
                                        />
                                    </div>
                                </div>

                                {/* Status Filter Tabs */}
                                <div className="mb-6">
                                    <div className="flex border-b border-gray-200">
                                        <button
                                            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${activeFilter === 'All' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                            onClick={() => setActiveFilter('All')}
                                        >
                                            All Lines
                                        </button>
                                        <button
                                            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${activeFilter === 'Active' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                            onClick={() => setActiveFilter('Active')}
                                        >
                                            <CheckCircle className="w-4 h-4 inline-block mr-1.5 text-green-500" />
                                            Active
                                        </button>
                                        <button
                                            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${activeFilter === 'Inactive' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                            onClick={() => setActiveFilter('Inactive')}
                                        >
                                            <AlertTriangle className="w-4 h-4 inline-block mr-1.5 text-yellow-500" />
                                            Inactive
                                        </button>
                                    </div>
                                </div>

                                {/* Lines Table */}
                                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                                    {/* Table header - Equal sized columns */}
                                    <div className="grid grid-cols-5 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="px-6 py-3">Actions</div>
                                        <div className="px-6 py-3">Status</div>
                                        <div className="px-6 py-3">Code</div>
                                        <div className="px-6 py-3">Name</div>
                                        <div className="px-6 py-3">Department</div>
                                    </div>

                                    {/* Table Body - Loading State */}
                                    {loading && (
                                        <div className="py-16 text-center text-gray-500">
                                            Loading...
                                        </div>
                                    )}

                                    {/* Table Body - No Results */}
                                    {!loading && filteredLines.length === 0 && (
                                        <div className="py-16 text-center text-gray-500">
                                            {searchTerm ? 'No lines found matching your search.' : 'No lines found. Add a line to get started.'}
                                        </div>
                                    )}

                                    {/* Table Body - Results with equal columns */}
                                    {!loading && filteredLines.length > 0 && (
                                        <div className="divide-y divide-gray-200">
                                            {filteredLines.map((line) => (
                                                <div 
                                                    key={line.id}
                                                    className={`grid grid-cols-5 items-center hover:bg-gray-50 ${!line.is_active ? 'bg-yellow-50' : ''}`}
                                                >
                                                    {/* Actions cell */}
                                                    <div className="px-6 py-4">
                                                        <div className="flex space-x-3">
                                                            <button
                                                                onClick={() => handleViewLineClick(line)}
                                                                className="text-gray-400 hover:text-gray-500"
                                                                title="View"
                                                                type="button"
                                                            >
                                                                <Eye className="h-5 w-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleEditLineClick(line)}
                                                                className="text-gray-400 hover:text-gray-500"
                                                                title="Edit"
                                                                type="button"
                                                            >
                                                                <Edit className="h-5 w-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleActiveLine(line)}
                                                                className="text-gray-400 hover:text-gray-500"
                                                                title={line.is_active ? "Deactivate" : "Activate"}
                                                                type="button"
                                                            >
                                                                {line.is_active ? (
                                                                    <ToggleRight className="h-5 w-5 text-green-500" />
                                                                ) : (
                                                                    <ToggleLeft className="h-5 w-5 text-gray-400" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteLine(line)}
                                                                className="text-gray-400 hover:text-red-500"
                                                                title="Delete"
                                                                type="button"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Status cell */}
                                                    <div className="px-6 py-4">
                                                        <StatusBadge isActive={line.is_active} />
                                                    </div>
                                                    
                                                    {/* Code cell */}
                                                    <div className="px-6 py-4 font-medium text-gray-900">
                                                        {line.code}
                                                    </div>
                                                    
                                                    {/* Name cell */}
                                                    <div className="px-6 py-4 text-gray-900">
                                                        {line.name}
                                                    </div>
                                                    
                                                    {/* Department cell */}
                                                    <div className="px-6 py-4 text-gray-500">
                                                        {line.department?.name || 'No department assigned'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Sections Content */}
                        {activeTab === 'sections' && (
                            <>
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    <div className="bg-white shadow rounded-lg p-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Total Sections</p>
                                            <p className="text-3xl font-bold">{totalSections}</p>
                                        </div>
                                        <div className="rounded-full p-3 bg-indigo-100">
                                            <Layers className="h-6 w-6 text-indigo-600" />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white shadow rounded-lg p-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Active Sections</p>
                                            <p className="text-3xl font-bold">{activeSections}</p>
                                        </div>
                                        <div className="rounded-full p-3 bg-green-100">
                                            <CheckCircle className="h-6 w-6 text-green-600" />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white shadow rounded-lg p-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Inactive Sections</p>
                                            <p className="text-3xl font-bold">{inactiveSections}</p>
                                        </div>
                                        <div className="rounded-full p-3 bg-yellow-100">
                                            <AlertTriangle className="h-6 w-6 text-yellow-600" />
                                        </div>
                                    </div>
                                </div>

                                {/* Action Bar - Full width search */}
                                <div className="mb-6">
                                    <div className="relative w-full">
                                        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                            <Search className="w-4 h-4 text-gray-500" />
                                        </div>
                                        <input 
                                            type="search" 
                                            className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500" 
                                            placeholder="Search sections..." 
                                            onChange={(e) => debouncedSearch(e.target.value)}
                                            defaultValue={searchTerm}
                                        />
                                    </div>
                                </div>

                                {/* Status Filter Tabs */}
                                <div className="mb-6">
                                    <div className="flex border-b border-gray-200">
                                        <button
                                            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${activeFilter === 'All' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                            onClick={() => setActiveFilter('All')}
                                        >
                                            All Sections
                                        </button>
                                        <button
                                            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${activeFilter === 'Active' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                            onClick={() => setActiveFilter('Active')}
                                        >
                                            <CheckCircle className="w-4 h-4 inline-block mr-1.5 text-green-500" />
                                            Active
                                        </button>
                                        <button
                                            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${activeFilter === 'Inactive' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                            onClick={() => setActiveFilter('Inactive')}
                                        >
                                            <AlertTriangle className="w-4 h-4 inline-block mr-1.5 text-yellow-500" />
                                            Inactive
                                        </button>
                                    </div>
                                </div>

                                {/* Sections Table */}
                                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                                    {/* Table header - Equal sized columns */}
                                    <div className="grid grid-cols-5 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="px-6 py-3">Actions</div>
                                        <div className="px-6 py-3">Status</div>
                                        <div className="px-6 py-3">Code</div>
                                        <div className="px-6 py-3">Name</div>
                                        <div className="px-6 py-3">Line</div>
                                    </div>

                                    {/* Table Body - Loading State */}
                                    {loading && (
                                        <div className="py-16 text-center text-gray-500">
                                            Loading...
                                        </div>
                                    )}

                                    {/* Table Body - No Results */}
                                    {!loading && filteredSections.length === 0 && (
                                        <div className="py-16 text-center text-gray-500">
                                            {searchTerm ? 'No sections found matching your search.' : 'No sections found. Add a section to get started.'}
                                        </div>
                                    )}

                                    {/* Table Body - Results with equal columns */}
                                    {!loading && filteredSections.length > 0 && (
                                        <div className="divide-y divide-gray-200">
                                            {filteredSections.map((section) => (
                                                <div 
                                                    key={section.id}
                                                    className={`grid grid-cols-5 items-center hover:bg-gray-50 ${!section.is_active ? 'bg-yellow-50' : ''}`}
                                                >
                                                    {/* Actions cell */}
                                                    <div className="px-6 py-4">
                                                        <div className="flex space-x-3">
                                                            <button
                                                                onClick={() => handleViewSectionClick(section)}
                                                                className="text-gray-400 hover:text-gray-500"
                                                                title="View"
                                                                type="button"
                                                            >
                                                                <Eye className="h-5 w-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleEditSectionClick(section)}
                                                                className="text-gray-400 hover:text-gray-500"
                                                                title="Edit"
                                                                type="button"
                                                            >
                                                                <Edit className="h-5 w-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleActiveSection(section)}
                                                                className="text-gray-400 hover:text-gray-500"
                                                                title={section.is_active ? "Deactivate" : "Activate"}
                                                                type="button"
                                                            >
                                                                {section.is_active ? (
                                                                    <ToggleRight className="h-5 w-5 text-green-500" />
                                                                ) : (
                                                                    <ToggleLeft className="h-5 w-5 text-gray-400" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteSection(section)}
                                                                className="text-gray-400 hover:text-red-500"
                                                                title="Delete"
                                                                type="button"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Status cell */}
                                                    <div className="px-6 py-4">
                                                        <StatusBadge isActive={section.is_active} />
                                                    </div>
                                                    
                                                    {/* Code cell */}
                                                    <div className="px-6 py-4 font-medium text-gray-900">
                                                        {section.code}
                                                    </div>
                                                    
                                                    {/* Name cell */}
                                                    <div className="px-6 py-4 text-gray-900">
                                                        {section.name}
                                                    </div>
                                                    
                                                    {/* Line cell */}
                                                    <div className="px-6 py-4 text-gray-500">
                                                        {section.line?.name || 'No line assigned'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Line Modals */}
            <LineModal
                isOpen={isCreateLineModalOpen}
                onClose={() => setIsCreateLineModalOpen(false)}
                title="Add New Line"
                line={currentLine}
                departments={departments}
                onChange={setCurrentLine}
                onSubmit={handleCreateLineSubmit}
                mode="create"
                errorMessages={lineErrors}
            />

            <LineModal
                isOpen={isEditLineModalOpen}
                onClose={() => setIsEditLineModalOpen(false)}
                title="Edit Line"
                line={currentLine}
                departments={departments}
                onChange={setCurrentLine}
                onSubmit={handleUpdateLineSubmit}
                mode="edit"
                errorMessages={lineErrors}
            />

            <LineModal
                isOpen={isViewLineModalOpen}
                onClose={() => setIsViewLineModalOpen(false)}
                title="View Line Details"
                line={currentLine}
                departments={departments}
                onChange={setCurrentLine}
                onSubmit={() => {}} // No submit action for view mode
                mode="view"
            />

            {/* Section Modals */}
            <SectionModal
                isOpen={isCreateSectionModalOpen}
                onClose={() => setIsCreateSectionModalOpen(false)}
                title="Add New Section"
                section={currentSection}
                lines={lines}
                onChange={setCurrentSection}
                onSubmit={handleCreateSectionSubmit}
                mode="create"
                errorMessages={sectionErrors}
            />

            <SectionModal
                isOpen={isEditSectionModalOpen}
                onClose={() => setIsEditSectionModalOpen(false)}
                title="Edit Section"
                section={currentSection}
                lines={lines}
                onChange={setCurrentSection}
                onSubmit={handleUpdateSectionSubmit}
                mode="edit"
                errorMessages={sectionErrors}
            />

            <SectionModal
                isOpen={isViewSectionModalOpen}
                onClose={() => setIsViewSectionModalOpen(false)}
                title="View Section Details"
                section={currentSection}
                lines={lines}
                onChange={setCurrentSection}
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

export default LinesAndSections;