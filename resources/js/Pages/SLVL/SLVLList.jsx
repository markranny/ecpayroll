// resources/js/Pages/SLVL/SLVLList.jsx
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Download, Search, X, Filter, Loader2 } from 'lucide-react';
import SLVLStatusBadge from './SLVLStatusBadge';
import SLVLDetailModal from './SLVLDetailModal';
import SLVLBulkActionModal from './SLVLBulkActionModal';
import { router } from '@inertiajs/react';
import { toast } from 'react-toastify';

const SLVLList = ({ 
    leaves, 
    onStatusUpdate, 
    onDelete, 
    refreshInterval = 5000,
    userRoles = {},
    processing = false
}) => {
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filteredLeaves, setFilteredLeaves] = useState(leaves || []);
    const [localLeaves, setLocalLeaves] = useState(leaves || []);
    const timerRef = useRef(null);
    
    // Loading states for various operations
    const [localProcessing, setLocalProcessing] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [exporting, setExporting] = useState(false);
    
    // Search functionality
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    
    // For multiple selection
    const [selectedIds, setSelectedIds] = useState([]);
    const [showBulkActionModal, setShowBulkActionModal] = useState(false);
    const [selectAll, setSelectAll] = useState(false);
    
    // Leave types for filtering
    const leaveTypes = [
        { value: 'sick', label: 'Sick Leave' },
        { value: 'vacation', label: 'Vacation Leave' },
        { value: 'emergency', label: 'Emergency Leave' },
        { value: 'bereavement', label: 'Bereavement Leave' },
        { value: 'maternity', label: 'Maternity Leave' },
        { value: 'paternity', label: 'Paternity Leave' },
        { value: 'personal', label: 'Personal Leave' },
        { value: 'study', label: 'Study Leave' },
    ];
    
    // Update local state when props change
    useEffect(() => {
        if (!leaves) return;
        setLocalLeaves(leaves);
        applyFilters(leaves, filterStatus, filterType, searchTerm, dateRange);
    }, [leaves]);
    
    // Set up auto-refresh timer
    useEffect(() => {
        const refreshData = async () => {
            try {
                if (typeof window.refreshSLVL === 'function') {
                    const freshData = await window.refreshSLVL();
                    setLocalLeaves(freshData);
                    applyFilters(freshData, filterStatus, filterType, searchTerm, dateRange);
                }
            } catch (error) {
                console.error('Error refreshing SLVL data:', error);
            }
        };
        
        if (!processing && !localProcessing) {
            timerRef.current = setInterval(refreshData, refreshInterval);
        }
        
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [refreshInterval, filterStatus, filterType, searchTerm, dateRange, processing, localProcessing]);
    
    // Function to apply all filters
    const applyFilters = (data, status, type, search, dates) => {
        let result = [...data];
        
        // Apply status filter
        if (status) {
            result = result.filter(leave => leave.status === status);
        }
        
        // Apply type filter
        if (type) {
            result = result.filter(leave => leave.type === type);
        }
        
        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(leave => 
                (leave.employee && 
                    ((leave.employee.Fname && leave.employee.Fname.toLowerCase().includes(searchLower)) || 
                     (leave.employee.Lname && leave.employee.Lname.toLowerCase().includes(searchLower)))) ||
                (leave.employee && leave.employee.idno && leave.employee.idno.toString().includes(searchLower)) ||
                (leave.employee && leave.employee.Department && leave.employee.Department.toLowerCase().includes(searchLower)) ||
                (leave.reason && leave.reason.toLowerCase().includes(searchLower))
            );
        }
        
        // Apply date range filter
        if (dates.from && dates.to) {
            result = result.filter(leave => {
                if (!leave.start_date) return false;
                const leaveDate = new Date(leave.start_date);
                const fromDate = new Date(dates.from);
                const toDate = new Date(dates.to);
                toDate.setHours(23, 59, 59);
                
                return leaveDate >= fromDate && leaveDate <= toDate;
            });
        } else if (dates.from) {
            result = result.filter(leave => {
                if (!leave.start_date) return false;
                const leaveDate = new Date(leave.start_date);
                const fromDate = new Date(dates.from);
                return leaveDate >= fromDate;
            });
        } else if (dates.to) {
            result = result.filter(leave => {
                if (!leave.start_date) return false;
                const leaveDate = new Date(leave.start_date);
                const toDate = new Date(dates.to);
                toDate.setHours(23, 59, 59);
                return leaveDate <= toDate;
            });
        }
        
        setFilteredLeaves(result);
        return result;
    };
    
    // Handle filter changes
    const handleStatusFilterChange = (e) => {
        if (processing || localProcessing) return;
        const status = e.target.value;
        setFilterStatus(status);
        applyFilters(localLeaves, status, filterType, searchTerm, dateRange);
    };
    
    const handleTypeFilterChange = (e) => {
        if (processing || localProcessing) return;
        const type = e.target.value;
        setFilterType(type);
        applyFilters(localLeaves, filterStatus, type, searchTerm, dateRange);
    };
    
    const handleSearchChange = (e) => {
        if (processing || localProcessing) return;
        const value = e.target.value;
        setSearchTerm(value);
        applyFilters(localLeaves, filterStatus, filterType, value, dateRange);
    };
    
    const handleDateRangeChange = (field, value) => {
        if (processing || localProcessing) return;
        const newDateRange = { ...dateRange, [field]: value };
        setDateRange(newDateRange);
        applyFilters(localLeaves, filterStatus, filterType, searchTerm, newDateRange);
    };
    
    // Clear all filters
    const clearFilters = () => {
        if (processing || localProcessing) return;
        setFilterStatus('');
        setFilterType('');
        setSearchTerm('');
        setDateRange({ from: '', to: '' });
        applyFilters(localLeaves, '', '', '', { from: '', to: '' });
    };
    
    // Open detail modal
    const handleViewDetail = (leave) => {
        if (processing || localProcessing) return;
        
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        setSelectedLeave(leave);
        setShowModal(true);
    };
    
    // Close detail modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedLeave(null);
        
        if (!processing && !localProcessing) {
            const refreshData = async () => {
                try {
                    if (typeof window.refreshSLVL === 'function') {
                        const freshData = await window.refreshSLVL();
                        setLocalLeaves(freshData);
                        applyFilters(freshData, filterStatus, filterType, searchTerm, dateRange);
                    }
                } catch (error) {
                    console.error('Error refreshing SLVL data:', error);
                }
            };
            
            timerRef.current = setInterval(refreshData, refreshInterval);
        }
    };
    
    // Handle status update
    const handleStatusUpdate = (id, data) => {
        setUpdatingId(id);
        setLocalProcessing(true);
        
        if (typeof onStatusUpdate === 'function') {
            try {
                const result = onStatusUpdate(id, data);
                
                if (result && typeof result.then === 'function') {
                    result
                        .then(() => {
                            setUpdatingId(null);
                            setLocalProcessing(false);
                        })
                        .catch((error) => {
                            console.error('Error updating status:', error);
                            alert('Error: Unable to update status. Please try again.');
                            setUpdatingId(null);
                            setLocalProcessing(false);
                        });
                } else {
                    setUpdatingId(null);
                    setLocalProcessing(false);
                }
            } catch (error) {
                console.error('Error updating status:', error);
                alert('Error: Unable to update status. Please try again.');
                setUpdatingId(null);
                setLocalProcessing(false);
            }
        } else {
            console.error('onStatusUpdate prop is not a function');
            alert('Error: Unable to update status. Please refresh the page and try again.');
            setUpdatingId(null);
            setLocalProcessing(false);
        }
        handleCloseModal();
    };
    
    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this leave request?')) {
            setDeletingId(id);
            setLocalProcessing(true);
            
            router.delete(route('slvl.destroy', id), {
                preserveScroll: true,
                onSuccess: (page) => {
                    const updatedLeaves = localLeaves.filter(leave => leave.id !== id);
                    setLocalLeaves(updatedLeaves);
                    applyFilters(updatedLeaves, filterStatus, filterType, searchTerm, dateRange);
                    
                    toast.success('Leave request deleted successfully');
                    setDeletingId(null);
                    setLocalProcessing(false);
                },
                onError: (errors) => {
                    console.error('Error deleting leave:', errors);
                    toast.error('Failed to delete leave request');
                    setDeletingId(null);
                    setLocalProcessing(false);
                }
            });
        }
    };
    
    // Format date safely
    const formatDate = (dateString) => {
        try {
            return format(new Date(dateString), 'yyyy-MM-dd');
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid date';
        }
    };

    // Multiple selection handlers
    const toggleSelectAll = () => {
        if (processing || localProcessing) return;
        
        setSelectAll(!selectAll);
        if (!selectAll) {
            let selectableIds = [];
            
            if (userRoles.isDepartmentManager) {
                selectableIds = filteredLeaves
                    .filter(leave => leave.status === 'pending' && 
                           (leave.dept_manager_id === userRoles.userId || 
                            userRoles.managedDepartments?.includes(leave.employee?.Department)))
                    .map(leave => leave.id);
            } else if (userRoles.isHrdManager) {
                selectableIds = filteredLeaves
                    .filter(leave => leave.status === 'manager_approved')
                    .map(leave => leave.id);
            } else if (userRoles.isSuperAdmin) {
                selectableIds = filteredLeaves
                    .filter(leave => leave.status === 'pending' || leave.status === 'manager_approved')
                    .map(leave => leave.id);
            }
            
            setSelectedIds(selectableIds);
        } else {
            setSelectedIds([]);
        }
    };

    const toggleSelectItem = (id) => {
        if (processing || localProcessing) return;
        
        setSelectedIds(prevIds => {
            if (prevIds.includes(id)) {
                return prevIds.filter(itemId => itemId !== id);
            } else {
                return [...prevIds, id];
            }
        });
    };

    const handleOpenBulkActionModal = () => {
        if (selectedIds.length === 0) {
            alert('Please select at least one leave request');
            return;
        }
        if (processing || localProcessing) return;
        setShowBulkActionModal(true);
    };

    const handleCloseBulkActionModal = () => {
        setShowBulkActionModal(false);
    };

    const handleBulkStatusUpdate = (status, remarks) => {
        setLocalProcessing(true);
        
        const data = {
            leave_ids: selectedIds,
            status: status,
            remarks: remarks
        };
        
        router.post(route('slvl.bulkUpdateStatus'), data, {
            preserveScroll: true,
            onSuccess: (response) => {
                setSelectedIds([]);
                setSelectAll(false);
                
                router.reload({
                    only: ['leaves'],
                    preserveScroll: true,
                    onFinish: () => {
                        setLocalProcessing(false);
                    }
                });
            },
            onError: (errors) => {
                console.error('Error during bulk update:', errors);
                toast.error('Failed to update leave requests: ' + 
                    (errors?.message || 'Unknown error'));
                setLocalProcessing(false);
            }
        });
        
        handleCloseBulkActionModal();
    };
    
    // Export functionality
    const exportToExcel = () => {
        if (processing || localProcessing || exporting) return;
        
        setExporting(true);
        
        const queryParams = new URLSearchParams();
        
        if (filterStatus) {
            queryParams.append('status', filterStatus);
        }
        
        if (filterType) {
            queryParams.append('type', filterType);
        }
        
        if (searchTerm) {
            queryParams.append('search', searchTerm);
        }
        
        if (dateRange.from) {
            queryParams.append('from_date', dateRange.from);
        }
        
        if (dateRange.to) {
            queryParams.append('to_date', dateRange.to);
        }
        
        const exportUrl = `/slvl/export?${queryParams.toString()}`;
        
        const link = document.createElement('a');
        link.href = exportUrl;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
            setExporting(false);
        }, 2000);
    };

    const canSelectLeave = (leave) => {
        if (userRoles.isSuperAdmin) {
            return leave.status === 'pending' || leave.status === 'manager_approved';
        } else if (userRoles.isDepartmentManager) {
            return leave.status === 'pending' && 
                   (leave.dept_manager_id === userRoles.userId || 
                    userRoles.managedDepartments?.includes(leave.employee?.Department));
        } else if (userRoles.isHrdManager) {
            return leave.status === 'manager_approved';
        }
        return false;
    };

    const selectableItemsCount = filteredLeaves.filter(leave => canSelectLeave(leave)).length;
    const bulkApprovalLevel = userRoles.isDepartmentManager ? 'department' : 'hrd';

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col h-[62vh] relative">
            {/* Global loading overlay */}
            {(processing || localProcessing) && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-40">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-600" />
                        <p className="text-sm text-gray-600">
                            {processing ? 'Processing leave requests...' : 'Updating data...'}
                        </p>
                    </div>
                </div>
            )}
            
            <div className="p-4 border-b">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <h3 className="text-lg font-semibold">Leave Requests (SLVL)</h3>
                    
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        {/* Export Button */}
                        <button
                            onClick={exportToExcel}
                            className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            title="Export to Excel"
                            disabled={exporting || processing || localProcessing}
                        >
                            {exporting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4 mr-1" />
                                    Export
                                </>
                            )}
                        </button>
                        
                        {/* Bulk Action Button */}
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleOpenBulkActionModal}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                disabled={processing || localProcessing}
                            >
                                {(localProcessing || processing) ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    `Bulk Action (${selectedIds.length})`
                                )}
                            </button>
                        )}
                        
                        {/* Status Filter */}
                        <div className="flex items-center">
                            <select
                                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                value={filterStatus}
                                onChange={handleStatusFilterChange}
                                disabled={processing || localProcessing}
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="manager_approved">Dept. Approved</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        
                        {/* Type Filter */}
                        <div className="flex items-center">
                            <select
                                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                value={filterType}
                                onChange={handleTypeFilterChange}
                                disabled={processing || localProcessing}
                            >
                                <option value="">All Types</option>
                                {leaveTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                
                {/* Search and date filters */}
                <div className="mt-4 flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name, ID, department, or reason"
                            className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            disabled={processing || localProcessing}
                        />
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center">
                            <label htmlFor="fromDate" className="mr-2 text-sm font-medium text-gray-700">
                                From:
                            </label>
                            <input
                                id="fromDate"
                                type="date"
                                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                value={dateRange.from}
                                onChange={(e) => handleDateRangeChange('from', e.target.value)}
                                disabled={processing || localProcessing}
                            />
                        </div>
                        
                        <div className="flex items-center">
                            <label htmlFor="toDate" className="mr-2 text-sm font-medium text-gray-700">
                                To:
                            </label>
                            <input
                                id="toDate"
                                type="date"
                                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                value={dateRange.to}
                                onChange={(e) => handleDateRangeChange('to', e.target.value)}
                                disabled={processing || localProcessing}
                            />
                        </div>
                        
                        {/* Clear filters button */}
                        {(filterStatus || filterType || searchTerm || dateRange.from || dateRange.to) && (
                            <button
                                onClick={clearFilters}
                                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                title="Clear all filters"
                                disabled={processing || localProcessing}
                            >
                                <X className="h-4 w-4 mr-1" />
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="overflow-auto flex-grow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            {selectableItemsCount > 0 && (
                                <th scope="col" className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        checked={selectAll && selectedIds.length === selectableItemsCount}
                                        onChange={toggleSelectAll}
                                        disabled={processing || localProcessing}
                                    />
                                </th>
                            )}
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Employee
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Leave Type
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date Range
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Days
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Filed By
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredLeaves.length === 0 ? (
                            <tr>
                                <td colSpan={selectableItemsCount > 0 ? "8" : "7"} className="px-6 py-4 text-center text-sm text-gray-500">
                                    {processing || localProcessing ? 'Loading leave records...' : 'No leave records found'}
                                </td>
                            </tr>
                        ) : (
                            filteredLeaves.map(leave => (
                                <tr key={leave.id} className={`hover:bg-gray-50 transition-colors duration-200 ${
                                    (deletingId === leave.id || updatingId === leave.id) ? 'opacity-50' : ''
                                }`}>
                                    {selectableItemsCount > 0 && (
                                        <td className="px-4 py-4">
                                            {canSelectLeave(leave) && (
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                    checked={selectedIds.includes(leave.id)}
                                                    onChange={() => toggleSelectItem(leave.id)}
                                                    disabled={processing || localProcessing || deletingId === leave.id || updatingId === leave.id}
                                                />
                                            )}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {leave.employee ? 
                                                `${leave.employee.Lname}, ${leave.employee.Fname}` : 
                                                'Unknown employee'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {leave.employee?.idno || 'N/A'} • {leave.employee?.Department || 'No Dept.'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {leave.type ? leave.type.charAt(0).toUpperCase() + leave.type.slice(1) : 'N/A'} Leave
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {leave.with_pay ? 'With Pay' : 'Without Pay'}
                                            {leave.half_day && ` • ${leave.am_pm?.toUpperCase()} Half-Day`}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {leave.start_date ? formatDate(leave.start_date) : 'N/A'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            to {leave.end_date ? formatDate(leave.end_date) : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {leave.total_days !== undefined ? 
                                            `${parseFloat(leave.total_days)} day${parseFloat(leave.total_days) !== 1 ? 's' : ''}` : 
                                            'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <SLVLStatusBadge status={leave.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {leave.creator ? leave.creator.name : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => handleViewDetail(leave)}
                                                className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                                disabled={processing || localProcessing || updatingId === leave.id}
                                            >
                                                View
                                            </button>
                                            
                                            {(leave.status === 'pending' && 
                                              (userRoles.isSuperAdmin || 
                                               leave.created_by === userRoles.userId || 
                                               (userRoles.isDepartmentManager && 
                                                (leave.dept_manager_id === userRoles.userId || 
                                                 userRoles.managedDepartments?.includes(leave.employee?.Department))))) && (
                                                <button
                                                    onClick={() => handleDelete(leave.id)}
                                                    className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200"
                                                    disabled={processing || localProcessing || deletingId === leave.id}
                                                >
                                                    {deletingId === leave.id ? (
                                                        <>
                                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                            Deleting...
                                                        </>
                                                    ) : (
                                                        'Delete'
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Footer with summary information */}
            <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600">
                <div className="flex justify-between items-center">
                    <div>
                        Showing {filteredLeaves.length} of {localLeaves.length} leave requests
                        {selectedIds.length > 0 && (
                            <span className="ml-4 text-indigo-600 font-medium">
                                {selectedIds.length} selected
                            </span>
                        )}
                    </div>
                    
                    {/* Processing indicator */}
                    {(processing || localProcessing) && (
                        <div className="flex items-center text-indigo-600">
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            <span className="text-xs">
                                {processing ? 'Processing...' : 'Updating...'}
                            </span>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Detail Modal */}
            {showModal && selectedLeave && (
                <SLVLDetailModal
                    leave={selectedLeave}
                    onClose={handleCloseModal}
                    onStatusUpdate={handleStatusUpdate}
                    userRoles={userRoles}
                    viewOnly={processing || localProcessing}
                    processing={updatingId === selectedLeave.id}
                />
            )}

            {/* Bulk Action Modal */}
            {showBulkActionModal && (
                <SLVLBulkActionModal
                    selectedCount={selectedIds} 
                    onClose={handleCloseBulkActionModal}
                    onSubmit={handleBulkStatusUpdate}
                    approvalLevel={bulkApprovalLevel}
                    userRoles={userRoles}
                />
            )}
        </div>
    );
};

export default SLVLList;