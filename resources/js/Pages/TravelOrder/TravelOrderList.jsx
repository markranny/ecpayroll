// resources/js/Pages/TravelOrder/TravelOrderList.jsx
import React, { useState, useEffect, useRef } from 'react';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { Download, Search, X } from 'lucide-react';
import StatusBadge from './StatusBadge';
import TravelOrderDetailModal from './TravelOrderDetailModal';
import MultiBulkActionModal from './MultiBulkActionModal';

const TravelOrderList = ({ travelOrders, onStatusUpdate, onDelete, refreshInterval = 5000 }) => {
    const [selectedTO, setSelectedTO] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filteredTOs, setFilteredTOs] = useState(travelOrders || []);
    const [localTOs, setLocalTOs] = useState(travelOrders || []);
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
        setLocalTOs(travelOrders || []);
        applyFilters(travelOrders || [], filterStatus, searchTerm, dateRange);
    }, [travelOrders]);
    
    // Set up auto-refresh timer
    useEffect(() => {
        // Function to fetch fresh data
        const refreshData = async () => {
            try {
                // Here you would typically fetch fresh data from your API
                if (typeof window.refreshTravelOrders === 'function') {
                    const freshData = await window.refreshTravelOrders();
                    setLocalTOs(freshData);
                    applyFilters(freshData, filterStatus, searchTerm, dateRange);
                }
            } catch (error) {
                console.error('Error refreshing travel order data:', error);
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
            result = result.filter(to => to.status === status);
        }
        
        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(to => 
                // Search by employee name
                (to.employee && 
                    ((to.employee.Fname && to.employee.Fname.toLowerCase().includes(searchLower)) || 
                     (to.employee.Lname && to.employee.Lname.toLowerCase().includes(searchLower)))) ||
                // Search by employee ID
                (to.employee && to.employee.idno && to.employee.idno.toString().includes(searchLower)) ||
                // Search by department
                (to.employee && to.employee.Department && to.employee.Department.toLowerCase().includes(searchLower)) ||
                // Search by destination
                (to.destination && to.destination.toLowerCase().includes(searchLower)) ||
                // Search by purpose
                (to.purpose && to.purpose.toLowerCase().includes(searchLower))
            );
        }
        
        // Apply date range filter
        if (dates.from && dates.to) {
            result = result.filter(to => {
                if (!to.start_date) return false;
                const startDate = new Date(to.start_date);
                const fromDate = new Date(dates.from);
                const toDate = new Date(dates.to);
                toDate.setHours(23, 59, 59); // Include the entire "to" day
                
                return startDate >= fromDate && startDate <= toDate;
            });
        } else if (dates.from) {
            result = result.filter(to => {
                if (!to.start_date) return false;
                const startDate = new Date(to.start_date);
                const fromDate = new Date(dates.from);
                return startDate >= fromDate;
            });
        } else if (dates.to) {
            result = result.filter(to => {
                if (!to.start_date) return false;
                const startDate = new Date(to.start_date);
                const toDate = new Date(dates.to);
                toDate.setHours(23, 59, 59); // Include the entire "to" day
                return startDate <= toDate;
            });
        }
        
        setFilteredTOs(result);
    };
    
    // Handle status filter change
    const handleStatusFilterChange = (e) => {
        const status = e.target.value;
        setFilterStatus(status);
        applyFilters(localTOs, status, searchTerm, dateRange);
    };
    
    // Handle search input change
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        applyFilters(localTOs, filterStatus, value, dateRange);
    };
    
    // Handle date range changes
    const handleDateRangeChange = (field, value) => {
        const newDateRange = { ...dateRange, [field]: value };
        setDateRange(newDateRange);
        applyFilters(localTOs, filterStatus, searchTerm, newDateRange);
    };
    
    // Clear all filters
    const clearFilters = () => {
        setFilterStatus('');
        setSearchTerm('');
        setDateRange({ from: '', to: '' });
        applyFilters(localTOs, '', '', { from: '', to: '' });
    };
    
    // Open detail modal
    const handleViewDetail = (to) => {
        // Pause auto-refresh when modal is open
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        setSelectedTO(to);
        setShowModal(true);
    };
    
    // Close detail modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedTO(null);
        
        // Resume auto-refresh when modal is closed
        const refreshData = async () => {
            try {
                if (typeof window.refreshTravelOrders === 'function') {
                    const freshData = await window.refreshTravelOrders();
                    setLocalTOs(freshData);
                    applyFilters(freshData, filterStatus, searchTerm, dateRange);
                }
            } catch (error) {
                console.error('Error refreshing travel order data:', error);
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
    
    // Handle travel order deletion
    const handleDelete = (id) => {
        onDelete(id);
    };
    
    // Format date safely
    const formatDate = (dateString) => {
        try {
            return format(parseISO(dateString), 'yyyy-MM-dd');
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid date';
        }
    };
    
    // Calculate duration in days
    const calculateDuration = (startDate, endDate) => {
        if (!startDate || !endDate) return 'N/A';
        try {
            const start = parseISO(startDate);
            const end = parseISO(endDate);
            const diffDays = differenceInDays(addDays(end, 1), start); // Add 1 to include both start and end days
            return diffDays === 1 ? '1 day' : `${diffDays} days`;
        } catch (error) {
            console.error('Error calculating duration:', error);
            return 'N/A';
        }
    };

    // Multiple selection handlers
    const toggleSelectAll = () => {
        setSelectAll(!selectAll);
        if (!selectAll) {
            // Only select pending travel orders
            const pendingIds = filteredTOs
                .filter(to => to.status === 'pending')
                .map(to => to.id);
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
            alert('Please select at least one travel order');
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
        const exportUrl = `/travel-orders/export?${queryParams.toString()}`;
        
        // Open the URL in a new tab/window to download the file
        window.open(exportUrl, '_blank');
    };

    // Get count of selectable (pending) items
    const pendingItemsCount = filteredTOs.filter(to => to.status === 'pending').length;

    // Get transportation type display text
    const getTransportationTypeText = (type) => {
        switch(type) {
            case 'company_vehicle':
                return 'Company Vehicle';
            case 'personal_vehicle':
                return 'Personal Vehicle';
            case 'public_transport':
                return 'Public Transport';
            case 'plane':
                return 'Plane';
            case 'other':
                return 'Other';
            default:
                return type || 'N/A';
        }
    };

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col h-[62vh]">
            <div className="p-4 border-b">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <h3 className="text-lg font-semibold">Travel Order Requests</h3>
                    
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
                                <option value="completed">Completed</option>
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
                            placeholder="Search by name, ID, department, destination, or purpose"
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
                                Destination
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date Range
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Duration
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Transport
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
                        {filteredTOs.length === 0 ? (
                            <tr>
                                <td colSpan={pendingItemsCount > 0 ? "8" : "7"} className="px-6 py-4 text-center text-sm text-gray-500">
                                    No travel order records found
                                </td>
                            </tr>
                        ) : (
                            filteredTOs.map(travelOrder => (
                                <tr key={travelOrder.id} className="hover:bg-gray-50">
                                    {pendingItemsCount > 0 && (
                                        <td className="px-4 py-4">
                                            {travelOrder.status === 'pending' && (
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                    checked={selectedIds.includes(travelOrder.id)}
                                                    onChange={() => toggleSelectItem(travelOrder.id)}
                                                />
                                            )}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {travelOrder.employee ? 
                                                `${travelOrder.employee.Lname}, ${travelOrder.employee.Fname}` : 
                                                'Unknown employee'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {travelOrder.employee?.idno || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {travelOrder.destination || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {travelOrder.start_date ? formatDate(travelOrder.start_date) : 'N/A'}
                                            {travelOrder.start_date !== travelOrder.end_date && travelOrder.end_date ? 
                                                ` to ${formatDate(travelOrder.end_date)}` : ''}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {calculateDuration(travelOrder.start_date, travelOrder.end_date)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {getTransportationTypeText(travelOrder.transportation_type)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={travelOrder.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleViewDetail(travelOrder)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                        >
                                            View
                                        </button>
                                        
                                        {travelOrder.status === 'pending' && (
                                            <button
                                                onClick={() => handleDelete(travelOrder.id)}
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
            {showModal && selectedTO && (
                <TravelOrderDetailModal
                    travelOrder={selectedTO}
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

export default TravelOrderList;