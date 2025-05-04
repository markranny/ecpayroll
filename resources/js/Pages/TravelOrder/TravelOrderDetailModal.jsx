// resources/js/Pages/TravelOrder/TravelOrderDetailModal.jsx
import React, { useState } from 'react';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import StatusBadge from './StatusBadge';

const TravelOrderDetailModal = ({ travelOrder, onClose, onStatusUpdate }) => {
    const [remarks, setRemarks] = useState('');
    const [processing, setProcessing] = useState(false);
    
    const handleStatusChange = (status) => {
        if (processing) return;
        
        if (status === 'rejected' && !remarks.trim()) {
            alert('Please provide remarks for rejection');
            return;
        }
        
        setProcessing(true);
        
        // Create data object with status and remarks
        const data = {
            status: status,
            remarks: remarks
        };
        
        // Call the onStatusUpdate with id and data
        // Add safety check to ensure onStatusUpdate is a function
        if (typeof onStatusUpdate === 'function') {
            onStatusUpdate(travelOrder.id, data);
        } else {
            console.error('onStatusUpdate is not a function');
            alert('Error: Unable to update status. Please try again later.');
            setProcessing(false);
        }
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
    
    // Format currency
    const formatCurrency = (amount) => {
        if (!amount) return '₱0.00';
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    };
    
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    Travel Order Details #{travelOrder.id}
                                </h3>
                                
                                <div className="mt-4 bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-2 sm:gap-4 sm:px-6 rounded-md">
                                    <div className="text-sm font-medium text-gray-500">Employee ID</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {travelOrder.employee?.idno || 'N/A'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Employee Name</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {travelOrder.employee ? 
                                            `${travelOrder.employee.Lname}, ${travelOrder.employee.Fname} ${travelOrder.employee.MName || ''}` 
                                            : 'N/A'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Department</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {travelOrder.employee?.Department || 'N/A'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Job Title</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {travelOrder.employee?.Jobtitle || 'N/A'}
                                    </div>
                                </div>
                                
                                <div className="mt-4 bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-2 sm:gap-4 sm:px-6 rounded-md">
                                    <div className="text-sm font-medium text-gray-500">Destination</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {travelOrder.destination || 'N/A'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Date Range</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {travelOrder.start_date ? formatDate(travelOrder.start_date) : 'N/A'}
                                        {travelOrder.start_date !== travelOrder.end_date && travelOrder.end_date ? 
                                            ` to ${formatDate(travelOrder.end_date)}` : ''}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Duration</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {calculateDuration(travelOrder.start_date, travelOrder.end_date)}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Transportation Type</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {getTransportationTypeText(travelOrder.transportation_type)}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Accommodation Required</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {travelOrder.accommodation_required ? 'Yes' : 'No'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Meal Allowance</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {travelOrder.meal_allowance ? 'Yes' : 'No'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Estimated Cost</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {travelOrder.estimated_cost ? formatCurrency(travelOrder.estimated_cost) : 'N/A'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Status</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        <StatusBadge status={travelOrder.status} />
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Filed Date</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {travelOrder.created_at ? 
                                            format(parseISO(travelOrder.created_at), 'yyyy-MM-dd h:mm a') 
                                            : 'N/A'}
                                    </div>
                                </div>
                                
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Purpose:</label>
                                    <div className="border rounded-md p-3 bg-gray-50 text-sm text-gray-900">
                                        {travelOrder.purpose || 'No purpose provided'}
                                    </div>
                                </div>
                                
                                {travelOrder.other_expenses && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Other Expenses:</label>
                                        <div className="border rounded-md p-3 bg-gray-50 text-sm text-gray-900">
                                            {travelOrder.other_expenses}
                                        </div>
                                    </div>
                                )}
                                
                                {travelOrder.remarks && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks:</label>
                                        <div className="border rounded-md p-3 bg-gray-50 text-sm text-gray-900">
                                            {travelOrder.remarks}
                                        </div>
                                    </div>
                                )}
                                
                                {travelOrder.approved_at && (
                                    <div className="mt-4 text-sm text-gray-500">
                                        {travelOrder.status && travelOrder.status.charAt(0).toUpperCase() + travelOrder.status.slice(1)} on {' '}
                                        {travelOrder.approved_at ? 
                                            format(parseISO(travelOrder.approved_at), 'yyyy-MM-dd h:mm a') 
                                            : 'N/A'}
                                        {travelOrder.approver && ` by ${travelOrder.approver.name}`}
                                    </div>
                                )}
                                
                                {/* Approval Form */}
                                {travelOrder.status === 'pending' && (
                                    <div className="mt-6 border-t border-gray-200 pt-4">
                                        <h4 className="text-md font-medium text-gray-900 mb-3">Approval Decision</h4>
                                        
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Remarks (required for rejection)
                                            </label>
                                            <textarea
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                rows={3}
                                                value={remarks}
                                                onChange={(e) => setRemarks(e.target.value)}
                                                placeholder="Enter any comments or reasons for approval/rejection"
                                            ></textarea>
                                        </div>
                                        
                                        <div className="flex justify-end space-x-3">
                                            <button
                                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                                onClick={() => handleStatusChange('approved')}
                                                disabled={processing}
                                            >
                                                {processing ? 'Processing...' : 'Approve'}
                                            </button>
                                            <button
                                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                onClick={() => handleStatusChange('rejected')}
                                                disabled={processing}
                                            >
                                                {processing ? 'Processing...' : 'Reject'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button 
                            type="button" 
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onClose}
                            disabled={processing}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TravelOrderDetailModal;