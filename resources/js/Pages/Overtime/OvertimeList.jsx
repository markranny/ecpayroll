// resources/js/Pages/Overtime/OvertimeList.jsx
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Download, Search, X, Filter } from 'lucide-react';
import OvertimeStatusBadge from './OvertimeStatusBadge';
import OvertimeDetailModal from './OvertimeDetailModal';
import MultiBulkActionModal from './MultiBulkActionModal';
import ForceApproveButton from './ForceApproveButton';

const OvertimeList = ({ 
    overtimes, 
    onStatusUpdate, 
    onDelete, 
    refreshInterval = 5000,
    userRoles = {}
}) => {
    const [selectedOvertime, setSelectedOvertime] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filteredOvertimes, setFilteredOvertimes] = useState(overtimes || []);
    const [localOvertimes, setLocalOvertimes] = useState(overtimes || []);
    const timerRef = useRef(null);
    
    // Add processing state to track API operations
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
        setLocalOvertimes(overtimes || []);
        applyFilters(overtimes || [], filterStatus, searchTerm, dateRange);
    }, [overtimes]);
    
    // Set up auto-refresh timer
    useEffect(() => {
        // Function to fetch fresh data
        const refreshData = async () => {
            try {
                // Here you would typically fetch fresh data from your API
                if (typeof window.refreshOvertimes === 'function') {
                    const freshData = await window.refreshOvertimes();
                    setLocalOvertimes(freshData);
                    applyFilters(freshData, filterStatus, searchTerm, dateRange);
                }
            } catch (error) {
                console.error('Error refreshing overtime data:', error);
            }
        };
        
        // Set up interval
        timerRef.current = setInterval(refreshData, refreshInterval);
        
        // Clean up on component unmount
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [refreshInterval, filterStatus, searchTerm, dateRange]);
    
    // Function to apply all filters
    const applyFilters = (data, status, search, dates) => {
        let result = [...data];
        
        // Apply status filter
        if (status) {
            result = result.filter(ot => ot.status === status);
        }
        
        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(ot => 
                // Search by employee name
                (ot.employee && 
                    ((ot.employee.Fname && ot.employee.Fname.toLowerCase().includes(searchLower)) || 
                     (ot.employee.Lname && ot.employee.Lname.toLowerCase().includes(searchLower)))) ||
                // Search by employee ID
                (ot.employee && ot.employee.idno && ot.employee.idno.toString().includes(searchLower)) ||
                // Search by department
                (ot.employee && ot.employee.Department && ot.employee.Department.toLowerCase().includes(searchLower)) ||
                // Search by reason
                (ot.reason && ot.reason.toLowerCase().includes(searchLower))
            );
        }
        
        // Apply date range filter
        if (dates.from && dates.to) {
            result = result.filter(ot => {
                if (!ot.date) return false;
                const overtimeDate = new Date(ot.date);
                const fromDate = new Date(dates.from);
                const toDate = new Date(dates.to);
                toDate.setHours(23, 59, 59); // Include the entire "to" day
                
                return overtimeDate >= fromDate && overtimeDate <= toDate;
            });
        } else if (dates.from) {
            result = result.filter(ot => {
                if (!ot.date) return false;
                const overtimeDate = new Date(ot.date);
                const fromDate = new Date(dates.from);
                return overtimeDate >= fromDate;
            });
        } else if (dates.to) {
            result = result.filter(ot => {
                if (!ot.date) return false;
                const overtimeDate = new Date(ot.date);
                const toDate = new Date(dates.to);
                toDate.setHours(23, 59, 59); // Include the entire "to" day
                return overtimeDate <= toDate;
            });
        }
        
        setFilteredOvertimes(result);
    };
    
    // Handle status filter change
    const handleStatusFilterChange = (e) => {
        const status = e.target.value;
        setFilterStatus(status);
        applyFilters(localOvertimes, status, searchTerm, dateRange);
    };
    
    // Handle search input change
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        applyFilters(localOvertimes, filterStatus, value, dateRange);
    };
    
    // Handle date range changes
    const handleDateRangeChange = (field, value) => {
        const newDateRange = { ...dateRange, [field]: value };
        setDateRange(newDateRange);
        applyFilters(localOvertimes, filterStatus, searchTerm, newDateRange);
    };
    
    // Clear all filters
    const clearFilters = () => {
        setFilterStatus('');
        setSearchTerm('');
        setDateRange({ from: '', to: '' });
        applyFilters(localOvertimes, '', '', { from: '', to: '' });
    };
    
    // Open detail modal
    const handleViewDetail = (overtime) => {
        // Pause auto-refresh when modal is open
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        setSelectedOvertime(overtime);
        setShowModal(true);
    };
    
    // Close detail modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedOvertime(null);
        
        // Resume auto-refresh when modal is closed
        const refreshData = async () => {
            try {
                if (typeof window.refreshOvertimes === 'function') {
                    const freshData = await window.refreshOvertimes();
                    setLocalOvertimes(freshData);
                    applyFilters(freshData, filterStatus, searchTerm, dateRange);
                }
            } catch (error) {
                console.error('Error refreshing overtime data:', error);
            }
        };
        
        timerRef.current = setInterval(refreshData, refreshInterval);
    };
    
    // Handle status update (from modal)
    const handleStatusUpdate = (id, data) => {
        // Set processing state to true when starting the update
        setProcessing(true);
        
        // Check if onStatusUpdate is a function before calling it
        if (typeof onStatusUpdate === 'function') {
            // Pass the entire data object to the parent component
            try {
                onStatusUpdate(id, data);
            } catch (error) {
                console.error('Error updating status:', error);
                alert('Error: Unable to update status. Please try again.');
            } finally {
                // Set processing back to false when done
                setProcessing(false);
            }
        } else {
            console.error('onStatusUpdate prop is not a function');
            alert('Error: Unable to update status. Please refresh the page and try again.');
            setProcessing(false);
        }
        handleCloseModal();
    };
    
    // Handle overtime deletion
    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this overtime request?')) {
            setProcessing(true);
            try {
                onDelete(id);
            } finally {
                setProcessing(false);
            }
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
    
    const formatTime = (timeString) => {
        if (!timeString) return '-';
        
        try {
            let timeOnly;
            // Handle ISO 8601 format
            if (timeString.includes('T')) {
                const [, time] = timeString.split('T');
                timeOnly = time.slice(0, 5); // Extract HH:MM
            } else {
                // If the time includes a date (like "2024-04-10 14:30:00"), split and take the time part
                const timeParts = timeString.split(' ');
                timeOnly = timeParts[timeParts.length - 1].slice(0, 5);
            }
            
            // Parse hours and minutes
            const [hours, minutes] = timeOnly.split(':');
            const hourNum = parseInt(hours, 10);
            
            // Convert to 12-hour format with AM/PM
            const ampm = hourNum >= 12 ? 'PM' : 'AM';
            const formattedHours = hourNum % 12 || 12; // handle midnight and noon
            
            return `${formattedHours}:${minutes} ${ampm}`;
        } catch (error) {
            console.error('Time formatting error:', error);
            return '-';
        }
    };

    // Multiple selection handlers
    const toggleSelectAll = () => {
        setSelectAll(!selectAll);
        if (!selectAll) {
            // Only select appropriate overtimes based on user role
            let selectableIds = [];
            
            if (userRoles.isDepartmentManager) {
                // Department managers can only select pending overtimes they are responsible for
                selectableIds = filteredOvertimes
                    .filter(ot => ot.status === 'pending' && 
                           (ot.dept_manager_id === userRoles.userId || 
                            userRoles.managedDepartments?.includes(ot.employee?.Department)))
                    .map(ot => ot.id);
            } else if (userRoles.isHrdManager) {
                // HRD managers can select pending or manager_approved overtimes
                selectableIds = filteredOvertimes
                    .filter(ot => ot.status === 'manager_approved')
                    .map(ot => ot.id);
            } else if (userRoles.isSuperAdmin) {
                // Superadmins can select any pending or manager_approved overtime
                selectableIds = filteredOvertimes
                    .filter(ot => ot.status === 'pending' || ot.status === 'manager_approved')
                    .map(ot => ot.id);
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
            alert('Please select at least one overtime request');
            return;
        }
        setShowBulkActionModal(true);
    };

    const handleCloseBulkActionModal = () => {
        setShowBulkActionModal(false);
    };

    const handleBulkStatusUpdate = (status, remarks) => {
        setProcessing(true);
        
        if (typeof onStatusUpdate === 'function') {
            // Create a promise array for all updates
            const updatePromises = selectedIds.map(id => {
                return new Promise((resolve, reject) => {
                    try {
                        onStatusUpdate(id, { status, remarks });
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            // Execute all updates
            Promise.all(updatePromises)
                .then(() => {
                    // Clear selections after successful update
                    setSelectedIds([]);
                    setSelectAll(false);
                })
                .catch(error => {
                    console.error('Error during bulk update:', error);
                })
                .finally(() => {
                    setProcessing(false);
                });
        } else {
            setProcessing(false);
        }
        handleCloseBulkActionModal();
    };
    
    // Export to Excel functionality - Server-side implementation
    const exportToExcel = () => {
        // Build query parameters from current filters
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
        
        // Generate the export URL with the current filters
        const exportUrl = `/overtimes/export?${queryParams.toString()}`;
        
        // Open the URL in a new tab/window to download the file
        window.open(exportUrl, '_blank');
    };

    // Determine which overtimes can be selected based on user role and status
    const canSelectOvertime = (overtime) => {
        if (userRoles.isSuperAdmin) {
            // Superadmin can select any overtime that's pending or manager approved
            return overtime.status === 'pending' || overtime.status === 'manager_approved';
        } else if (userRoles.isDepartmentManager) {
            // Department managers can only select pending overtimes assigned to them
            return overtime.status === 'pending' && 
                   (overtime.dept_manager_id === userRoles.userId || 
                    userRoles.managedDepartments?.includes(overtime.employee?.Department));
        } else if (userRoles.isHrdManager) {
            // HRD managers can only select manager approved overtimes
            return overtime.status === 'manager_approved';
        }
        return false;
    };

    // Get selectable items count
    const selectableItemsCount = filteredOvertimes.filter(ot => canSelectOvertime(ot)).length;

    // Determine the approval level for bulk actions based on user role
    const bulkApprovalLevel = userRoles.isDepartmentManager ? 'department' : 'hrd';

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col h-[62vh]">
            <div className="p-4 border-b">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <h3 className="text-lg font-semibold">Overtime Requests</h3>
                    
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
                            <ForceApproveButton 
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
                                <option value="manager_approved">Dept. Approved</option>
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
                                Date & Time
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hours
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rate
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
                        {filteredOvertimes.length === 0 ? (
                            <tr>
                                <td colSpan={selectableItemsCount > 0 ? "8" : "7"} className="px-6 py-4 text-center text-sm text-gray-500">
                                    No overtime records found
                                </td>
                            </tr>
                        ) : (
                            filteredOvertimes.map(overtime => (
                                <tr key={overtime.id} className="hover:bg-gray-50">
                                    {selectableItemsCount > 0 && (
                                        <td className="px-4 py-4">
                                            {canSelectOvertime(overtime) && (
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                    checked={selectedIds.includes(overtime.id)}
                                                    onChange={() => toggleSelectItem(overtime.id)}
                                                />
                                            )}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {overtime.employee ? 
                                                `${overtime.employee.Lname}, ${overtime.employee.Fname}` : 
                                                'Unknown employee'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {overtime.employee?.idno || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {overtime.date ? formatDate(overtime.date) : 'N/A'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {overtime.start_time && overtime.end_time ? 
                                                `${formatTime(overtime.start_time)} - ${formatTime(overtime.end_time)}` : 
                                                'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {overtime.total_hours !== undefined ? 
                                            parseFloat(overtime.total_hours).toFixed(2) : 
                                            'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {overtime.rate_multiplier ? `${overtime.rate_multiplier}x` : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <OvertimeStatusBadge status={overtime.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {overtime.creator ? overtime.creator.name : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleViewDetail(overtime)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                        >
                                            View
                                        </button>
                                        
                                        {(overtime.status === 'pending' && 
                                          (userRoles.isSuperAdmin || 
                                           overtime.created_by === userRoles.userId || 
                                           (userRoles.isDepartmentManager && 
                                            (overtime.dept_manager_id === userRoles.userId || 
                                             userRoles.managedDepartments?.includes(overtime.employee?.Department))))) && (
                                            <button
                                                onClick={() => handleDelete(overtime.id)}
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
            {showModal && selectedOvertime && (
                <OvertimeDetailModal
                    overtime={selectedOvertime}
                    onClose={handleCloseModal}
                    onStatusUpdate={handleStatusUpdate}
                    userRoles={userRoles}
                />
            )}

            {/* Bulk Action Modal */}
            {showBulkActionModal && (
                <MultiBulkActionModal
                    selectedCount={selectedIds.length}
                    onClose={handleCloseBulkActionModal}
                    onSubmit={handleBulkStatusUpdate}
                    approvalLevel={bulkApprovalLevel}
                    userRoles={userRoles}
                />
            )}
        </div>
    );
};

export default OvertimeList;