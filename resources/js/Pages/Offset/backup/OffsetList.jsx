// resources/js/Pages/Offset/OffsetList.jsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Download, Search, X, Filter } from 'lucide-react';
import OffsetStatusBadge from './OffsetStatusBadge';
import OffsetDetailModal from './OffsetDetailModal';
import OffsetBulkActionModal from './OffsetBulkActionModal';
import OffsetForceApproveButton from './OffsetForceApproveButton';
import { router } from '@inertiajs/react';
import { toast } from 'react-toastify';

const OffsetList = ({ 
    offsets, 
    onStatusUpdate, 
    onDelete, 
    userRoles = {}
}) => {
    const [selectedOffset, setSelectedOffset] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filteredOffsets, setFilteredOffsets] = useState(offsets || []);
    const [localOffsets, setLocalOffsets] = useState(offsets || []);
    
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
        if (!offsets) return;
        setLocalOffsets(offsets);
        applyFilters(offsets, filterStatus, searchTerm, dateRange);
    }, [offsets]);
    
    // Function to apply all filters
    const applyFilters = (data, status, search, dates) => {
        let result = [...data];
        
        // Apply status filter
        if (status) {
            result = result.filter(offset => offset.status === status);
        }
        
        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(offset => 
                // Search by employee name
                (offset.employee && 
                    ((offset.employee.Fname && offset.employee.Fname.toLowerCase().includes(searchLower)) || 
                     (offset.employee.Lname && offset.employee.Lname.toLowerCase().includes(searchLower)))) ||
                // Search by employee ID
                (offset.employee && offset.employee.idno && offset.employee.idno.toString().includes(searchLower)) ||
                // Search by department
                (offset.employee && offset.employee.Department && offset.employee.Department.toLowerCase().includes(searchLower)) ||
                // Search by reason
                (offset.reason && offset.reason.toLowerCase().includes(searchLower))
            );
        }
        
        // Apply date range filter
        if (dates.from && dates.to) {
            result = result.filter(offset => {
                if (!offset.date) return false;
                const offsetDate = new Date(offset.date);
                const fromDate = new Date(dates.from);
                const toDate = new Date(dates.to);
                toDate.setHours(23, 59, 59);
                
                return offsetDate >= fromDate && offsetDate <= toDate;
            });
        } else if (dates.from) {
            result = result.filter(offset => {
                if (!offset.date) return false;
                const offsetDate = new Date(offset.date);
                const fromDate = new Date(dates.from);
                return offsetDate >= fromDate;
            });
        } else if (dates.to) {
            result = result.filter(offset => {
                if (!offset.date) return false;
                const offsetDate = new Date(offset.date);
                const toDate = new Date(dates.to);
                toDate.setHours(23, 59, 59);
                return offsetDate <= toDate;
            });
        }
        
        setFilteredOffsets(result);
        return result;
    };
    
    // Handle status filter change
    const handleStatusFilterChange = (e) => {
        const status = e.target.value;
        setFilterStatus(status);
        applyFilters(localOffsets, status, searchTerm, dateRange);
    };
    
    // Handle search input change
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        applyFilters(localOffsets, filterStatus, value, dateRange);
    };
    
    // Handle date range changes
    const handleDateRangeChange = (field, value) => {
        const newDateRange = { ...dateRange, [field]: value };
        setDateRange(newDateRange);
        applyFilters(localOffsets, filterStatus, searchTerm, newDateRange);
    };
    
    // Clear all filters
    const clearFilters = () => {
        setFilterStatus('');
        setSearchTerm('');
        setDateRange({ from: '', to: '' });
        applyFilters(localOffsets, '', '', { from: '', to: '' });
    };
    
    // Open detail modal
    const handleViewDetail = (offset) => {
        setSelectedOffset(offset);
        setShowModal(true);
    };
    
    // Close detail modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedOffset(null);
    };
    
    // Handle status update (from modal)
    const handleStatusUpdate = (id, data) => {
        if (typeof onStatusUpdate === 'function') {
            onStatusUpdate(id, data);
        }
        handleCloseModal();
    };
    
    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this offset request?')) {
            setProcessing(true);
            
            router.post(route('offsets.destroy', id), {
                _method: 'DELETE'
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Offset request deleted successfully');
                    
                    // Update the local state instead of reloading the page
                    const updatedLocalOffsets = localOffsets.filter(item => item.id !== id);
                    setLocalOffsets(updatedLocalOffsets);
                    
                    // Also update filtered offsets
                    setFilteredOffsets(prev => prev.filter(item => item.id !== id));
                    
                    // Clear selection if the deleted item was selected
                    if (selectedIds.includes(id)) {
                        setSelectedIds(prev => prev.filter(itemId => itemId !== id));
                    }
                    
                    setProcessing(false);
                },
                onError: (errors) => {
                    console.error('Error deleting:', errors);
                    toast.error('Failed to delete offset request');
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
                selectableIds = filteredOffsets
                    .filter(offset => offset.status === 'pending')
                    .map(offset => offset.id);
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
            alert('Please select at least one offset request');
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
            offset_ids: selectedIds,
            status: status,
            remarks: remarks
        };
        
        router.post(route('offsets.bulkUpdateStatus'), data, {
            preserveScroll: true,
            onSuccess: (page) => {
                // Update local state instead of reloading the page
                const updatedOffsets = localOffsets.map(item => {
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
                setLocalOffsets(updatedOffsets);
                
                // Re-apply current filters to the updated data
                applyFilters(updatedOffsets, filterStatus, searchTerm, dateRange);
                
                // Show success message
                if (page.props?.flash?.message) {
                    toast.success(page.props.flash.message);
                } else {
                    toast.success(`Successfully ${status} ${selectedIds.length} offset requests`);
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
                toast.error('Failed to update offset requests');
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
        
        const exportUrl = `/offsets/export?${queryParams.toString()}`;
        window.open(exportUrl, '_blank');
    };

    const canSelectOffset = (offset) => {
        if (userRoles.isSuperAdmin || userRoles.isHrdManager) {
            return offset.status === 'pending';
        } else if (userRoles.isDepartmentManager) {
            return offset.status === 'pending' && 
                   userRoles.managedDepartments?.includes(offset.employee?.Department);
        }
        return false;
    };

    // Get selectable items count
    const selectableItemsCount = filteredOffsets.filter(offset => canSelectOffset(offset)).length;

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col h-[62vh]">
            <div className="p-4 border-b">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <h3 className="text-lg font-semibold">Offset Requests</h3>
                    
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
                            <OffsetForceApproveButton 
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
                                Type
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Workday
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hours
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Transaction
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
                        {filteredOffsets.length === 0 ? (
                            <tr>
                                <td colSpan={selectableItemsCount > 0 ? "10" : "9"} className="px-6 py-4 text-center text-sm text-gray-500">
                                    No offset records found
                                </td>
                            </tr>
                        ) : (
                            filteredOffsets.map(offset => (
                                <tr key={offset.id} className="hover:bg-gray-50">
                                    {selectableItemsCount > 0 && (
                                        <td className="px-4 py-4">
                                            {canSelectOffset(offset) && (
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                    checked={selectedIds.includes(offset.id)}
                                                    onChange={() => toggleSelectItem(offset.id)}
                                                />
                                            )}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {offset.employee ? 
                                                `${offset.employee.Lname}, ${offset.employee.Fname}` : 
                                                'Unknown employee'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {offset.employee?.idno || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {offset.offset_type?.name || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {offset.date ? formatDate(offset.date) : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {offset.workday ? formatDate(offset.workday) : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {offset.hours} hrs
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            offset.transaction_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {offset.transaction_type === 'credit' ? 'Credit' : 'Debit'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <OffsetStatusBadge status={offset.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {offset.approver ? offset.approver.name : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleViewDetail(offset)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                        >
                                            View
                                        </button>
                                        
                                        {(offset.status === 'pending' && 
                                          (userRoles.isSuperAdmin || 
                                           offset.employee_id === userRoles.employeeId || 
                                           (userRoles.isDepartmentManager && 
                                            userRoles.managedDepartments?.includes(offset.employee?.Department)))) && (
                                            <button
                                                onClick={() => handleDelete(offset.id)}
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
            {showModal && selectedOffset && (
                <OffsetDetailModal
                    offset={selectedOffset}
                    onClose={handleCloseModal}
                    onStatusUpdate={handleStatusUpdate}
                    userRoles={userRoles}
                />
            )}

            {/* Bulk Action Modal */}
            {showBulkActionModal && (
                <OffsetBulkActionModal
                    selectedCount={selectedIds.length} 
                    onClose={handleCloseBulkActionModal}
                    onSubmit={handleBulkStatusUpdate}
                    userRoles={userRoles}
                />
            )}
        </div>
    );
};

export default OffsetList;