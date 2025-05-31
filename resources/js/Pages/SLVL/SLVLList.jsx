import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Download, Search, X, Filter } from 'lucide-react';
import SLVLStatusBadge from './SLVLStatusBadge';
import SLVLDetailModal from './SLVLDetailModal';
import SLVLBulkActionModal from './SLVLBulkActionModal';
import SLVLForceApproveButton from './SLVLForceApproveButton';
import { router } from '@inertiajs/react';
import { toast } from 'react-toastify';

const SLVLList = ({ 
    slvls, 
    onStatusUpdate, 
    onDelete, 
    userRoles = {}
}) => {
    const [selectedSLVL, setSelectedSLVL] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filteredSLVLs, setFilteredSLVLs] = useState(slvls || []);
    const [localSLVLs, setLocalSLVLs] = useState(slvls || []);
    
    // Add processing state
    const [processing, setProcessing] = useState(false);
    
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
        if (!slvls) return;
        setLocalSLVLs(slvls);
        applyFilters(slvls, filterStatus, filterType, searchTerm, dateRange);
    }, [slvls]);
    
    // Function to apply all filters
    const applyFilters = (data, status, type, search, dates) => {
        let result = [...data];
        
        // Apply status filter
        if (status) {
            result = result.filter(slvl => slvl.status === status);
        }
        
        // Apply type filter
        if (type) {
            result = result.filter(slvl => slvl.type === type);
        }
        
        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(slvl => 
                // Search by employee name
                (slvl.employee && 
                    ((slvl.employee.Fname && slvl.employee.Fname.toLowerCase().includes(searchLower)) || 
                     (slvl.employee.Lname && slvl.employee.Lname.toLowerCase().includes(searchLower)))) ||
                // Search by employee ID
                (slvl.employee && slvl.employee.idno && slvl.employee.idno.toString().includes(searchLower)) ||
                // Search by department
                (slvl.employee && slvl.employee.Department && slvl.employee.Department.toLowerCase().includes(searchLower)) ||
                // Search by reason
                (slvl.reason && slvl.reason.toLowerCase().includes(searchLower))
            );
        }
        
        // Apply date range filter
        if (dates.from && dates.to) {
            result = result.filter(slvl => {
                if (!slvl.start_date) return false;
                const slvlDate = new Date(slvl.start_date);
                const fromDate = new Date(dates.from);
                const toDate = new Date(dates.to);
                toDate.setHours(23, 59, 59);
                
                return slvlDate >= fromDate && slvlDate <= toDate;
            });
        } else if (dates.from) {
            result = result.filter(slvl => {
                if (!slvl.start_date) return false;
                const slvlDate = new Date(slvl.start_date);
                const fromDate = new Date(dates.from);
                return slvlDate >= fromDate;
            });
        } else if (dates.to) {
            result = result.filter(slvl => {
                if (!slvl.start_date) return false;
                const slvlDate = new Date(slvl.start_date);
                const toDate = new Date(dates.to);
                toDate.setHours(23, 59, 59);
                return slvlDate <= toDate;
            });
        }
        
        setFilteredSLVLs(result);
        return result;
    };
    
    // Handle status filter change
    const handleStatusFilterChange = (e) => {
        const status = e.target.value;
        setFilterStatus(status);
        applyFilters(localSLVLs, status, filterType, searchTerm, dateRange);
    };
    
    // Handle type filter change
    const handleTypeFilterChange = (e) => {
        const type = e.target.value;
        setFilterType(type);
        applyFilters(localSLVLs, filterStatus, type, searchTerm, dateRange);
    };
    
    // Handle search input change
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        applyFilters(localSLVLs, filterStatus, filterType, value, dateRange);
    };
    
    // Handle date range changes
    const handleDateRangeChange = (field, value) => {
        const newDateRange = { ...dateRange, [field]: value };
        setDateRange(newDateRange);
        applyFilters(localSLVLs, filterStatus, filterType, searchTerm, newDateRange);
    };
    
    // Clear all filters
    const clearFilters = () => {
        setFilterStatus('');
        setFilterType('');
        setSearchTerm('');
        setDateRange({ from: '', to: '' });
        applyFilters(localSLVLs, '', '', '', { from: '', to: '' });
    };
    
    // Open detail modal
    const handleViewDetail = (slvl) => {
        setSelectedSLVL(slvl);
        setShowModal(true);
    };
    
    // Close detail modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedSLVL(null);
    };
    
    // Handle status update (from modal)
    const handleStatusUpdate = (id, data) => {
        if (typeof onStatusUpdate === 'function') {
            onStatusUpdate(id, data);
        }
        handleCloseModal();
    };
    
    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this SLVL request?')) {
            setProcessing(true);
            
            router.post(route('slvl.destroy', id), {
                _method: 'DELETE'
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('SLVL request deleted successfully');
                    
                    // Update the local state instead of reloading the page
                    const updatedLocalSLVLs = localSLVLs.filter(item => item.id !== id);
                    setLocalSLVLs(updatedLocalSLVLs);
                    
                    // Also update filtered SLVLs
                    setFilteredSLVLs(prev => prev.filter(item => item.id !== id));
                    
                    // Clear selection if the deleted item was selected
                    if (selectedIds.includes(id)) {
                        setSelectedIds(prev => prev.filter(itemId => itemId !== id));
                    }
                    
                    setProcessing(false);
                },
                onError: (errors) => {
                    console.error('Error deleting:', errors);
                    toast.error('Failed to delete SLVL request');
                    setProcessing(false);
                }
            });
        }
    }
    
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
        setSelectAll(!selectAll);
        if (!selectAll) {
            let selectableIds = [];
            
            if (userRoles.isDepartmentManager || userRoles.isHrdManager || userRoles.isSuperAdmin) {
                selectableIds = filteredSLVLs
                    .filter(slvl => slvl.status === 'pending')
                    .map(slvl => slvl.id);
            }
            
            setSelectedIds(selectableIds);
        } else {
            setSelectedIds([]);
        }
    };

    const toggleSelectItem = (id) => {
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
            alert('Please select at least one SLVL request');
            return;
        }
        setShowBulkActionModal(true);
    };

    const handleCloseBulkActionModal = () => {
        setShowBulkActionModal(false);
    };

    const handleBulkStatusUpdate = (status, remarks) => {
        setProcessing(true);
        
        const data = {
            slvl_ids: selectedIds,
            status: status,
            remarks: remarks
        };
        
        router.post(route('slvl.bulkUpdateStatus'), data, {
            preserveScroll: true,
            onSuccess: (page) => {
                // Update local state instead of reloading the page
                const updatedSLVLs = localSLVLs.map(item => {
                    if (selectedIds.includes(item.id)) {
                        return {
                            ...item,
                            status: status,
                            remarks: remarks,
                            approved_at: new Date().toISOString(),
                            approver: page.props?.auth?.user ? {
                                id: page.props.auth.user.id,
                                name: page.props.auth.user.name
                            } : null
                        };
                    }
                    return item;
                });
                
                // Update both local and filtered states
                setLocalSLVLs(updatedSLVLs);
                
                // Re-apply current filters to the updated data
                applyFilters(updatedSLVLs, filterStatus, filterType, searchTerm, dateRange);
                
                // Show success message
                if (page.props?.flash?.message) {
                    toast.success(page.props.flash.message);
                } else {
                    toast.success(`Successfully ${status} ${selectedIds.length} SLVL requests`);
                }
                
                // Clear selected items
                setSelectedIds([]);
                setSelectAll(false);
                
                // Close modal and reset processing state
                handleCloseBulkActionModal();
                setProcessing(false);
            },
            onError: (errors) => {
                console.error('Error during bulk update:', errors);
                toast.error('Failed to update SLVL requests');
                setProcessing(false);
            }
        });
    }
    
    // Export to Excel functionality
    const exportToExcel = () => {
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
        window.open(exportUrl, '_blank');
    };

    const canSelectSLVL = (slvl) => {
        if (userRoles.isSuperAdmin || userRoles.isHrdManager) {
            return slvl.status === 'pending';
        } else if (userRoles.isDepartmentManager) {
            return slvl.status === 'pending' && 
                   userRoles.managedDepartments?.includes(slvl.employee?.Department);
        }
        return false;
    };

    // Get selectable items count
    const selectableItemsCount = filteredSLVLs.filter(slvl => canSelectSLVL(slvl)).length;

    const getLeaveTypeLabel = (type) => {
        const leaveType = leaveTypes.find(t => t.value === type);
        return leaveType ? leaveType.label : type?.charAt(0).toUpperCase() + type?.slice(1);
    };

    // Get pay type label
    const getPayTypeLabel = (slvl) => {
        if (slvl.pay_type) {
            return slvl.pay_type === 'with_pay' ? 'With Pay' : 'Non Pay';
        }
        // Fallback to legacy with_pay field
        return slvl.with_pay ? 'With Pay' : 'Non Pay';
    };

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col h-[62vh]">
            <div className="p-4 border-b">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <h3 className="text-lg font-semibold">SLVL Requests</h3>
                    
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        {/* Export Button */}
                        <button
                            onClick={exportToExcel}
                            className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
                            title="Export to Excel"
                        >
                            <Download className="h-4 w-4 mr-1" />
                            Export
                        </button>

                        {/* Force Approve Button - Only visible for SuperAdmin */}
                        {userRoles.isSuperAdmin && (
                            <SLVLForceApproveButton 
                                selectedIds={selectedIds} 
                                disabled={processing}
                            />
                        )}
                        
                        {/* Bulk Action Button */}
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleOpenBulkActionModal}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                disabled={processing}
                            >
                                Bulk Action ({selectedIds.length})
                            </button>
                        )}
                        
                        {/* Status Filter */}
                        <div className="flex items-center">
                            <select
                                id="statusFilter"
                                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                value={filterStatus}
                                onChange={handleStatusFilterChange}
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        
                        {/* Type Filter */}
                        <div className="flex items-center">
                            <select
                                id="typeFilter"
                                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                value={filterType}
                                onChange={handleTypeFilterChange}
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
                            />
                        </div>
                        
                        {/* Clear filters button */}
                        {(filterStatus || filterType || searchTerm || dateRange.from || dateRange.to) && (
                            <button
                                onClick={clearFilters}
                                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm flex items-center"
                                title="Clear all filters"
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
                                Start Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                End Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Days
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Pay Type
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Approved By
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredSLVLs.length === 0 ? (
                            <tr>
                                <td colSpan={selectableItemsCount > 0 ? "10" : "9"} className="px-6 py-4 text-center text-sm text-gray-500">
                                    No SLVL records found
                                </td>
                            </tr>
                        ) : (
                            filteredSLVLs.map(slvl => (
                                <tr key={slvl.id} className="hover:bg-gray-50">
                                    {selectableItemsCount > 0 && (
                                        <td className="px-4 py-4">
                                            {canSelectSLVL(slvl) && (
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                    checked={selectedIds.includes(slvl.id)}
                                                    onChange={() => toggleSelectItem(slvl.id)}
                                                />
                                            )}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {slvl.employee ? 
                                                `${slvl.employee.Lname}, ${slvl.employee.Fname}` : 
                                                'Unknown employee'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {slvl.employee?.idno || 'N/A'} • {slvl.employee?.Department || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            slvl.type === 'sick' ? 'bg-red-100 text-red-800' :
                                            slvl.type === 'vacation' ? 'bg-green-100 text-green-800' :
                                            slvl.type === 'emergency' ? 'bg-orange-100 text-orange-800' :
                                            slvl.type === 'maternity' || slvl.type === 'paternity' ? 'bg-pink-100 text-pink-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {getLeaveTypeLabel(slvl.type)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {slvl.start_date ? formatDate(slvl.start_date) : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {slvl.end_date ? formatDate(slvl.end_date) : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {slvl.total_days} {slvl.total_days === 1 ? 'day' : 'days'}
                                        {slvl.half_day && (
                                            <div className="text-xs text-gray-500">
                                                ({slvl.am_pm} half-day)
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            (slvl.pay_type === 'with_pay' || (!slvl.pay_type && slvl.with_pay)) 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {getPayTypeLabel(slvl)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <SLVLStatusBadge status={slvl.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {slvl.approver ? slvl.approver.name : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleViewDetail(slvl)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                        >
                                            View
                                        </button>
                                        
                                        {(slvl.status === 'pending' && 
                                          (userRoles.isSuperAdmin || 
                                           slvl.employee_id === userRoles.employeeId || 
                                           (userRoles.isDepartmentManager && 
                                            userRoles.managedDepartments?.includes(slvl.employee?.Department)))) && (
                                            <button
                                                onClick={() => handleDelete(slvl.id)}
                                                className="text-red-600 hover:text-red-900"
                                                disabled={processing}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Detail Modal */}
            {showModal && selectedSLVL && (
                <SLVLDetailModal
                    slvl={selectedSLVL}
                    onClose={handleCloseModal}
                    onStatusUpdate={handleStatusUpdate}
                    userRoles={userRoles}
                />
            )}

            {/* Bulk Action Modal */}
            {showBulkActionModal && (
                <SLVLBulkActionModal
                    selectedCount={selectedIds.length} 
                    onClose={handleCloseBulkActionModal}
                    onSubmit={handleBulkStatusUpdate}
                    userRoles={userRoles}
                />
            )}
        </div>
    );
};

export default SLVLList;