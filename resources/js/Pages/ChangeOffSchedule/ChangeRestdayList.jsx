import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Download, Search, X, Filter } from 'lucide-react';
import ChangeRestdayStatusBadge from './ChangeRestdayStatusBadge';
import ChangeRestdayDetailModal from './ChangeRestdayDetailModal';
import ChangeRestdayBulkActionModal from './ChangeRestdayBulkActionModal';
import ChangeRestdayForceApproveButton from './ChangeRestdayForceApproveButton';
import { router } from '@inertiajs/react';
import { toast } from 'react-toastify';

const ChangeRestdayList = ({ 
    changeOffs, 
    onStatusUpdate, 
    onDelete, 
    userRoles = {}
}) => {
    const [selectedChangeOff, setSelectedChangeOff] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filteredChangeOffs, setFilteredChangeOffs] = useState(changeOffs || []);
    const [localChangeOffs, setLocalChangeOffs] = useState(changeOffs || []);
    
    // Add processing state
    const [processing, setProcessing] = useState(false);
    
    // Search functionality
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    
    // For multiple selection
    const [selectedIds, setSelectedIds] = useState([]);
    const [showBulkActionModal, setShowBulkActionModal] = useState(false);
    const [selectAll, setSelectAll] = useState(false);
    
    // Update local state when props change
    useEffect(() => {
        if (!changeOffs) return;
        setLocalChangeOffs(changeOffs);
        applyFilters(changeOffs, filterStatus, searchTerm, dateRange);
    }, [changeOffs]);
    
    // Function to apply all filters
    const applyFilters = (data, status, search, dates) => {
        let result = [...data];
        
        // Apply status filter
        if (status) {
            result = result.filter(co => co.status === status);
        }
        
        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(co => 
                // Search by employee name
                (co.employee && 
                    ((co.employee.Fname && co.employee.Fname.toLowerCase().includes(searchLower)) || 
                     (co.employee.Lname && co.employee.Lname.toLowerCase().includes(searchLower)))) ||
                // Search by employee ID
                (co.employee && co.employee.idno && co.employee.idno.toString().includes(searchLower)) ||
                // Search by department
                (co.employee && co.employee.Department && co.employee.Department.toLowerCase().includes(searchLower)) ||
                // Search by reason
                (co.reason && co.reason.toLowerCase().includes(searchLower))
            );
        }
        
        // Apply date range filter
        if (dates.from && dates.to) {
            result = result.filter(co => {
                if (!co.original_date) return false;
                const originalDate = new Date(co.original_date);
                const fromDate = new Date(dates.from);
                const toDate = new Date(dates.to);
                toDate.setHours(23, 59, 59);
                
                return originalDate >= fromDate && originalDate <= toDate;
            });
        } else if (dates.from) {
            result = result.filter(co => {
                if (!co.original_date) return false;
                const originalDate = new Date(co.original_date);
                const fromDate = new Date(dates.from);
                return originalDate >= fromDate;
            });
        } else if (dates.to) {
            result = result.filter(co => {
                if (!co.original_date) return false;
                const originalDate = new Date(co.original_date);
                const toDate = new Date(dates.to);
                toDate.setHours(23, 59, 59);
                return originalDate <= toDate;
            });
        }
        
        setFilteredChangeOffs(result);
        return result;
    };
    
    // Handle status filter change
    const handleStatusFilterChange = (e) => {
        const status = e.target.value;
        setFilterStatus(status);
        applyFilters(localChangeOffs, status, searchTerm, dateRange);
    };
    
    // Handle search input change
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        applyFilters(localChangeOffs, filterStatus, value, dateRange);
    };
    
    // Handle date range changes
    const handleDateRangeChange = (field, value) => {
        const newDateRange = { ...dateRange, [field]: value };
        setDateRange(newDateRange);
        applyFilters(localChangeOffs, filterStatus, searchTerm, newDateRange);
    };
    
    // Clear all filters
    const clearFilters = () => {
        setFilterStatus('');
        setSearchTerm('');
        setDateRange({ from: '', to: '' });
        applyFilters(localChangeOffs, '', '', { from: '', to: '' });
    };
    
    // Open detail modal
    const handleViewDetail = (changeOff) => {
        setSelectedChangeOff(changeOff);
        setShowModal(true);
    };
    
    // Close detail modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedChangeOff(null);
    };
    
    // Handle status update (from modal)
    const handleStatusUpdate = (id, data) => {
        if (typeof onStatusUpdate === 'function') {
            onStatusUpdate(id, data);
        }
        handleCloseModal();
    };
    
    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this change rest day request?')) {
            setProcessing(true);
            
            router.post(route('change-off-schedules.destroy', id), {
                _method: 'DELETE'
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Change rest day request deleted successfully');
                    
                    // Update the local state instead of reloading the page
                    const updatedLocalChangeOffs = localChangeOffs.filter(item => item.id !== id);
                    setLocalChangeOffs(updatedLocalChangeOffs);
                    
                    // Also update filtered change offs
                    setFilteredChangeOffs(prev => prev.filter(item => item.id !== id));
                    
                    // Clear selection if the deleted item was selected
                    if (selectedIds.includes(id)) {
                        setSelectedIds(prev => prev.filter(itemId => itemId !== id));
                    }
                    
                    setProcessing(false);
                },
                onError: (errors) => {
                    console.error('Error deleting:', errors);
                    toast.error('Failed to delete change rest day request');
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
                selectableIds = filteredChangeOffs
                    .filter(co => co.status === 'pending')
                    .map(co => co.id);
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
            alert('Please select at least one change rest day request');
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
            change_off_ids: selectedIds,
            status: status,
            remarks: remarks
        };
        
        router.post(route('change-off-schedules.bulkUpdateStatus'), data, {
            preserveScroll: true,
            onSuccess: (page) => {
                // Update local state instead of reloading the page
                const updatedChangeOffs = localChangeOffs.map(item => {
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
                setLocalChangeOffs(updatedChangeOffs);
                
                // Re-apply current filters to the updated data
                applyFilters(updatedChangeOffs, filterStatus, searchTerm, dateRange);
                
                // Show success message
                if (page.props?.flash?.message) {
                    toast.success(page.props.flash.message);
                } else {
                    toast.success(`Successfully ${status} ${selectedIds.length} change rest day requests`);
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
                toast.error('Failed to update change rest day requests');
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
        
        if (searchTerm) {
            queryParams.append('search', searchTerm);
        }
        
        if (dateRange.from) {
            queryParams.append('from_date', dateRange.from);
        }
        
        if (dateRange.to) {
            queryParams.append('to_date', dateRange.to);
        }
        
        const exportUrl = `/change-off-schedules/export?${queryParams.toString()}`;
        window.open(exportUrl, '_blank');
    };

    const canSelectChangeOff = (changeOff) => {
        if (userRoles.isSuperAdmin || userRoles.isHrdManager) {
            return changeOff.status === 'pending';
        } else if (userRoles.isDepartmentManager) {
            return changeOff.status === 'pending' && 
                   userRoles.managedDepartments?.includes(changeOff.employee?.Department);
        }
        return false;
    };

    // Get selectable items count
    const selectableItemsCount = filteredChangeOffs.filter(co => canSelectChangeOff(co)).length;

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col h-[62vh]">
            <div className="p-4 border-b">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <h3 className="text-lg font-semibold">Change Rest Day Requests</h3>
                    
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
                            <ChangeRestdayForceApproveButton 
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
                        {(filterStatus || searchTerm || dateRange.from || dateRange.to) && (
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
                                Original Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Requested Date
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
                        {filteredChangeOffs.length === 0 ? (
                            <tr>
                                <td colSpan={selectableItemsCount > 0 ? "7" : "6"} className="px-6 py-4 text-center text-sm text-gray-500">
                                    No change rest day records found
                                </td>
                            </tr>
                        ) : (
                            filteredChangeOffs.map(changeOff => (
                                <tr key={changeOff.id} className="hover:bg-gray-50">
                                    {selectableItemsCount > 0 && (
                                        <td className="px-4 py-4">
                                            {canSelectChangeOff(changeOff) && (
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                    checked={selectedIds.includes(changeOff.id)}
                                                    onChange={() => toggleSelectItem(changeOff.id)}
                                                />
                                            )}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {changeOff.employee ? 
                                                `${changeOff.employee.Lname}, ${changeOff.employee.Fname}` : 
                                                'Unknown employee'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {changeOff.employee?.idno || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {changeOff.original_date ? formatDate(changeOff.original_date) : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {changeOff.requested_date ? formatDate(changeOff.requested_date) : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <ChangeRestdayStatusBadge status={changeOff.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {changeOff.approver ? changeOff.approver.name : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleViewDetail(changeOff)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                        >
                                            View
                                        </button>
                                        
                                        {(changeOff.status === 'pending' && 
                                          (userRoles.isSuperAdmin || 
                                           changeOff.employee_id === userRoles.employeeId || 
                                           (userRoles.isDepartmentManager && 
                                            userRoles.managedDepartments?.includes(changeOff.employee?.Department)))) && (
                                            <button
                                                onClick={() => handleDelete(changeOff.id)}
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
            {showModal && selectedChangeOff && (
                <ChangeRestdayDetailModal
                    changeOff={selectedChangeOff}
                    onClose={handleCloseModal}
                    onStatusUpdate={handleStatusUpdate}
                    userRoles={userRoles}
                />
            )}

            {/* Bulk Action Modal */}
            {showBulkActionModal && (
                <ChangeRestdayBulkActionModal
                    selectedCount={selectedIds.length} 
                    onClose={handleCloseBulkActionModal}
                    onSubmit={handleBulkStatusUpdate}
                    userRoles={userRoles}
                />
            )}
        </div>
    );
};

export default ChangeRestdayList;