// resources/js/Pages/TimeSchedule/TimeScheduleList.jsx
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Download, Search, X } from 'lucide-react';
import TimeScheduleStatusBadge from './TimeScheduleStatusBadge';
import TimeScheduleDetailModal from './TimeScheduleDetailModal';
import MultiBulkActionModal from '../Overtime/MultiBulkActionModal';

const TimeScheduleList = ({ scheduleChanges, onStatusUpdate, onDelete, refreshInterval = 5000 }) => {
    const [selectedScheduleChange, setSelectedScheduleChange] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filteredScheduleChanges, setFilteredScheduleChanges] = useState(scheduleChanges || []);
    const [localScheduleChanges, setLocalScheduleChanges] = useState(scheduleChanges || []);
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
        setLocalScheduleChanges(scheduleChanges || []);
        applyFilters(scheduleChanges || [], filterStatus, searchTerm, dateRange);
    }, [scheduleChanges]);
    
    // Set up auto-refresh timer
    useEffect(() => {
        // Function to fetch fresh data
        const refreshData = async () => {
            try {
                // Here you would typically fetch fresh data from your API
                if (typeof window.refreshTimeSchedules === 'function') {
                    const freshData = await window.refreshTimeSchedules();
                    setLocalScheduleChanges(freshData);
                    applyFilters(freshData, filterStatus, searchTerm, dateRange);
                }
            } catch (error) {
                console.error('Error refreshing schedule change data:', error);
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
            result = result.filter(sc => sc.status === status);
        }
        
        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(sc => 
                // Search by employee name
                (sc.employee && 
                    ((sc.employee.Fname && sc.employee.Fname.toLowerCase().includes(searchLower)) || 
                     (sc.employee.Lname && sc.employee.Lname.toLowerCase().includes(searchLower)))) ||
                // Search by employee ID
                (sc.employee && sc.employee.idno && sc.employee.idno.toString().includes(searchLower)) ||
                // Search by department
                (sc.employee && sc.employee.Department && sc.employee.Department.toLowerCase().includes(searchLower)) ||
                // Search by reason
                (sc.reason && sc.reason.toLowerCase().includes(searchLower)) ||
                // Search by schedule type
                (sc.schedule_type && sc.schedule_type.name && sc.schedule_type.name.toLowerCase().includes(searchLower))
            );
        }
        
        // Apply date range filter
        if (dates.from && dates.to) {
            result = result.filter(sc => {
                if (!sc.effective_date) return false;
                const effectiveDate = new Date(sc.effective_date);
                const fromDate = new Date(dates.from);
                const toDate = new Date(dates.to);
                toDate.setHours(23, 59, 59); // Include the entire "to" day
                
                return effectiveDate >= fromDate && effectiveDate <= toDate;
            });
        } else if (dates.from) {
            result = result.filter(sc => {
                if (!sc.effective_date) return false;
                const effectiveDate = new Date(sc.effective_date);
                const fromDate = new Date(dates.from);
                return effectiveDate >= fromDate;
            });
        } else if (dates.to) {
            result = result.filter(sc => {
                if (!sc.effective_date) return false;
                const effectiveDate = new Date(sc.effective_date);
                const toDate = new Date(dates.to);
                toDate.setHours(23, 59, 59); // Include the entire "to" day
                return effectiveDate <= toDate;
            });
        }
        
        setFilteredScheduleChanges(result);
    };
    
    // Handle status filter change
    const handleStatusFilterChange = (e) => {
        const status = e.target.value;
        setFilterStatus(status);
        applyFilters(localScheduleChanges, status, searchTerm, dateRange);
    };
    
    // Handle search input change
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        applyFilters(localScheduleChanges, filterStatus, value, dateRange);
    };
    
    // Handle date range changes
    const handleDateRangeChange = (field, value) => {
        const newDateRange = { ...dateRange, [field]: value };
        setDateRange(newDateRange);
        applyFilters(localScheduleChanges, filterStatus, searchTerm, newDateRange);
    };
    
    // Clear all filters
    const clearFilters = () => {
        setFilterStatus('');
        setSearchTerm('');
        setDateRange({ from: '', to: '' });
        applyFilters(localScheduleChanges, '', '', { from: '', to: '' });
    };
    
    // Open detail modal
    const handleViewDetail = (scheduleChange) => {
        // Pause auto-refresh when modal is open
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        setSelectedScheduleChange(scheduleChange);
        setShowModal(true);
    };
    
    // Close detail modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedScheduleChange(null);
        
        // Resume auto-refresh when modal is closed
        const refreshData = async () => {
            try {
                if (typeof window.refreshTimeSchedules === 'function') {
                    const freshData = await window.refreshTimeSchedules();
                    setLocalScheduleChanges(freshData);
                    applyFilters(freshData, filterStatus, searchTerm, dateRange);
                }
            } catch (error) {
                console.error('Error refreshing schedule change data:', error);
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
    
    // Handle schedule change deletion
    const handleDelete = (id) => {
        onDelete(id);
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
    
    // Format time safely
    const formatTime = (timeString) => {
        try {
            return format(new Date(timeString), 'h:mm a');
        } catch (error) {
            console.error('Error formatting time:', error);
            return 'Invalid time';
        }
    };

    // Multiple selection handlers
    const toggleSelectAll = () => {
        setSelectAll(!selectAll);
        if (!selectAll) {
            // Only select pending schedule changes
            const pendingIds = filteredScheduleChanges
                .filter(sc => sc.status === 'pending')
                .map(sc => sc.id);
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
            alert('Please select at least one schedule change request');
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
        const exportUrl = `/time-schedules/export?${queryParams.toString()}`;
        
        // Open the URL in a new tab/window to download the file
        window.open(exportUrl, '_blank');
    };

    // Get count of selectable (pending) items
    const pendingItemsCount = filteredScheduleChanges.filter(sc => sc.status === 'pending').length;

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col h-[62vh]">
            <div className="p-4 border-b">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <h3 className="text-lg font-semibold">Schedule Change Requests</h3>
                    
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
                                <option value="cancelled">Cancelled</option>
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
                                Schedule Type
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Effective Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                New Schedule
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
                        {filteredScheduleChanges.length === 0 ? (
                            <tr>
                                <td colSpan={pendingItemsCount > 0 ? "7" : "6"} className="px-6 py-4 text-center text-sm text-gray-500">
                                    No schedule change records found
                                </td>
                            </tr>
                        ) : (
                            filteredScheduleChanges.map(scheduleChange => (
                                <tr key={scheduleChange.id} className="hover:bg-gray-50">
                                    {pendingItemsCount > 0 && (
                                        <td className="px-4 py-4">
                                            {scheduleChange.status === 'pending' && (
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                    checked={selectedIds.includes(scheduleChange.id)}
                                                    onChange={() => toggleSelectItem(scheduleChange.id)}
                                                />
                                            )}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {scheduleChange.employee ? 
                                                `${scheduleChange.employee.Lname}, ${scheduleChange.employee.Fname}` : 
                                                'Unknown employee'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {scheduleChange.employee?.idno || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {scheduleChange.schedule_type?.name || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {scheduleChange.effective_date ? formatDate(scheduleChange.effective_date) : 'N/A'}
                                        </div>
                                        {scheduleChange.end_date && (
                                            <div className="text-sm text-gray-500">
                                                Until: {formatDate(scheduleChange.end_date)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {scheduleChange.new_schedule || 'Custom Schedule'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {scheduleChange.new_start_time && scheduleChange.new_end_time ? 
                                                `${formatTime(scheduleChange.new_start_time)} - ${formatTime(scheduleChange.new_end_time)}` : 
                                                'Hours not specified'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <TimeScheduleStatusBadge status={scheduleChange.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleViewDetail(scheduleChange)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                        >
                                            View
                                        </button>
                                        
                                        {scheduleChange.status === 'pending' && (
                                            <button
                                                onClick={() => handleDelete(scheduleChange.id)}
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
            {showModal && selectedScheduleChange && (
                <TimeScheduleDetailModal
                    scheduleChange={selectedScheduleChange}
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

export default TimeScheduleList;