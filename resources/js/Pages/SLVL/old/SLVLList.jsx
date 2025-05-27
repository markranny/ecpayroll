// resources/js/Pages/SLVL/SLVLList.jsx
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Download, Search, X } from 'lucide-react';
import SLVLStatusBadge from './SLVLStatusBadge';
import SLVLDetailModal from './SLVLDetailModal';
import MultiBulkActionModal from './MultiBulkActionModal';

const SLVLList = ({ leaves, onStatusUpdate, onDelete, refreshInterval = 5000 }) => {
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filteredLeaves, setFilteredLeaves] = useState(leaves || []);
    const [localLeaves, setLocalLeaves] = useState(leaves || []);
    const timerRef = useRef(null);
    
    // Search functionality
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    
    // For multiple selection
    const [selectedIds, setSelectedIds] = useState([]);
    const [showBulkActionModal, setShowBulkActionModal] = useState(false);
    const [selectAll, setSelectAll] = useState(false);
    
    // Update local state when props change
    useEffect(() => {
        setLocalLeaves(leaves || []);
        applyFilters(leaves || [], filterStatus, filterType, searchTerm, dateRange);
    }, [leaves]);
    
    // Set up auto-refresh timer
    useEffect(() => {
        // Function to fetch fresh data
        const refreshData = async () => {
            try {
                // Here you would typically fetch fresh data from your API
                if (typeof window.refreshLeaves === 'function') {
                    const freshData = await window.refreshLeaves();
                    setLocalLeaves(freshData);
                    applyFilters(freshData, filterStatus, filterType, searchTerm, dateRange);
                }
            } catch (error) {
                console.error('Error refreshing leave data:', error);
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
    }, [refreshInterval, filterStatus, filterType, searchTerm, dateRange]);
    
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
                // Search by employee name
                (leave.employee && 
                    ((leave.employee.Fname && leave.employee.Fname.toLowerCase().includes(searchLower)) || 
                     (leave.employee.Lname && leave.employee.Lname.toLowerCase().includes(searchLower)))) ||
                // Search by employee ID
                (leave.employee && leave.employee.idno && leave.employee.idno.toString().includes(searchLower)) ||
                // Search by department
                (leave.employee && leave.employee.Department && leave.employee.Department.toLowerCase().includes(searchLower)) ||
                // Search by reason
                (leave.reason && leave.reason.toLowerCase().includes(searchLower))
            );
        }
        
        // Apply date range filter (using start_date)
        if (dates.from && dates.to) {
            result = result.filter(leave => {
                if (!leave.start_date) return false;
                const leaveDate = new Date(leave.start_date);
                const fromDate = new Date(dates.from);
                const toDate = new Date(dates.to);
                toDate.setHours(23, 59, 59); // Include the entire "to" day
                
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
                toDate.setHours(23, 59, 59); // Include the entire "to" day
                return leaveDate <= toDate;
            });
        }
        
        setFilteredLeaves(result);
    };
    
    // Handle status filter change
    const handleStatusFilterChange = (e) => {
        const status = e.target.value;
        setFilterStatus(status);
        applyFilters(localLeaves, status, filterType, searchTerm, dateRange);
    };
    
    // Handle type filter change
    const handleTypeFilterChange = (e) => {
        const type = e.target.value;
        setFilterType(type);
        applyFilters(localLeaves, filterStatus, type, searchTerm, dateRange);
    };
    
    // Handle search input change
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        applyFilters(localLeaves, filterStatus, filterType, value, dateRange);
    };
    
    // Handle date range changes
    const handleDateRangeChange = (field, value) => {
        const newDateRange = { ...dateRange, [field]: value };
        setDateRange(newDateRange);
        applyFilters(localLeaves, filterStatus, filterType, searchTerm, newDateRange);
    };
    
    // Clear all filters
    const clearFilters = () => {
        setFilterStatus('');
        setFilterType('');
        setSearchTerm('');
        setDateRange({ from: '', to: '' });
        applyFilters(localLeaves, '', '', '', { from: '', to: '' });
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
    
    // Get leave type label
    const getLeaveTypeLabel = (type) => {
        switch (type) {
            case 'sick':
                return 'Sick Leave';
            case 'vacation':
                return 'Vacation Leave';
            case 'emergency':
                return 'Emergency Leave';
            case 'bereavement':
                return 'Bereavement Leave';
            case 'maternity':
                return 'Maternity Leave';
            case 'paternity':
                return 'Paternity Leave';
            default:
                return type ? type.charAt(0).toUpperCase() + type.slice(1) + ' Leave' : 'N/A';
        }
    };
    
    // Calculate total leave days for display
    const calculateLeaveDays = (leave) => {
        if (!leave.start_date || !leave.end_date) return 'N/A';
        
        try {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            
            // Calculate the difference in days
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
            
            // Adjust for half day if applicable
            if (leave.half_day) {
                return (diffDays - 0.5).toFixed(1);
            }
            
            return diffDays.toString();
        } catch (error) {
            console.error('Error calculating leave days:', error);
            return 'N/A';
        }
    };
    
    // Open detail modal
    const handleViewDetail = (leave) => {
        // Pause auto-refresh when modal is open
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
        
        // Resume auto-refresh when modal is closed
        const refreshData = async () => {
            try {
                if (typeof window.refreshLeaves === 'function') {
                    const freshData = await window.refreshLeaves();
                    setLocalLeaves(freshData);
                    applyFilters(freshData, filterStatus, filterType, searchTerm, dateRange);
                }
            } catch (error) {
                console.error('Error refreshing leave data:', error);
            }
        };
        
        timerRef.current = setInterval(refreshData, refreshInterval);
    };
    
    // Handle status update (from modal)
    const handleStatusUpdate = (id, data) => {
        // Check if onStatusUpdate is a function before calling it
        if (typeof onStatusUpdate === 'function') {
            // Pass the entire data object to the parent component
            onStatusUpdate(id, data);
        } else {
            console.error('onStatusUpdate prop is not a function');
            alert('Error: Unable to update status. Please refresh the page and try again.');
        }
        handleCloseModal();
    };
    
    // Handle leave deletion
    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this leave request?')) {
            onDelete(id);
        }
    };

    // Multiple selection handlers
    const toggleSelectAll = () => {
        setSelectAll(!selectAll);
        if (!selectAll) {
            // Only select pending leaves
            const pendingIds = filteredLeaves
                .filter(leave => leave.status === 'pending')
                .map(leave => leave.id);
            setSelectedIds(pendingIds);
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
            alert('Please select at least one leave request');
            return;
        }
        setShowBulkActionModal(true);
    };

    const handleCloseBulkActionModal = () => {
        setShowBulkActionModal(false);
    };

    const handleBulkStatusUpdate = (status, remarks) => {
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
                });
        }
        handleCloseBulkActionModal();
    };
    
    // Export to Excel functionality
    const exportToExcel = () => {
        // Build query parameters from current filters
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
        
        // Generate the export URL with the current filters
        const exportUrl = `/slvl/export?${queryParams.toString()}`;
        
        // Open the URL in a new tab/window to download the file
        window.open(exportUrl, '_blank');
    };

    // Get count of selectable (pending) items
    const pendingItemsCount = filteredLeaves.filter(leave => leave.status === 'pending').length;

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col h-[62vh]">
            <div className="p-4 border-b">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <h3 className="text-lg font-semibold">Leave Requests</h3>
                    
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
                        
                        {/* Bulk Action Button */}
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleOpenBulkActionModal}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                <option value="sick">Sick Leave</option>
                                <option value="vacation">Vacation Leave</option>
                                <option value="emergency">Emergency Leave</option>
                                <option value="bereavement">Bereavement Leave</option>
                                <option value="maternity">Maternity Leave</option>
                                <option value="paternity">Paternity Leave</option>
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
                            {pendingItemsCount > 0 && (
                                <th scope="col" className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        checked={selectAll && selectedIds.length === pendingItemsCount}
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
                                Date Range
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Days
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Pay
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredLeaves.length === 0 ? (
                            <tr>
                                <td colSpan={pendingItemsCount > 0 ? "8" : "7"} className="px-6 py-4 text-center text-sm text-gray-500">
                                    No leave records found
                                </td>
                            </tr>
                        ) : (
                            filteredLeaves.map(leave => (
                                <tr key={leave.id} className="hover:bg-gray-50">
                                    {pendingItemsCount > 0 && (
                                        <td className="px-4 py-4">
                                            {leave.status === 'pending' && (
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                    checked={selectedIds.includes(leave.id)}
                                                    onChange={() => toggleSelectItem(leave.id)}
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
                                            {leave.employee?.idno || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {getLeaveTypeLabel(leave.type)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {leave.start_date && leave.end_date ? 
                                                `${formatDate(leave.start_date)} - ${formatDate(leave.end_date)}` : 
                                                'N/A'}
                                        </div>
                                        {leave.half_day && (
                                            <div className="text-sm text-gray-500">
                                                {leave.am_pm.toUpperCase()} Half-Day
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {calculateLeaveDays(leave)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {leave.with_pay ? 'With Pay' : 'Without Pay'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <SLVLStatusBadge status={leave.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleViewDetail(leave)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                        >
                                            View
                                        </button>
                                        
                                        {leave.status === 'pending' && (
                                            <button
                                                onClick={() => handleDelete(leave.id)}
                                                className="text-red-600 hover:text-red-900"
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
            {showModal && selectedLeave && (
                <SLVLDetailModal
                    leave={selectedLeave}
                    onClose={handleCloseModal}
                    onStatusUpdate={handleStatusUpdate}
                />
            )}

            {/* Bulk Action Modal */}
            {showBulkActionModal && (
                <MultiBulkActionModal
                    selectedCount={selectedIds.length}
                    onClose={handleCloseBulkActionModal}
                    onSubmit={handleBulkStatusUpdate}
                />
            )}
        </div>
    );
};

export default SLVLList;