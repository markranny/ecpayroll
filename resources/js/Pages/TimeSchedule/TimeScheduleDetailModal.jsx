// resources/js/Pages/TimeSchedule/TimeScheduleDetailModal.jsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import TimeScheduleStatusBadge from './TimeScheduleStatusBadge';

const TimeScheduleDetailModal = ({ scheduleChange, onClose, onStatusUpdate }) => {
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
            onStatusUpdate(scheduleChange.id, data);
        } else {
            console.error('onStatusUpdate is not a function');
            alert('Error: Unable to update status. Please try again later.');
            setProcessing(false);
        }
    };
    
    // Format date safely
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'yyyy-MM-dd');
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid date';
        }
    };
    
    // Format time safely
    const formatTime = (timeString) => {
        if (!timeString) return 'N/A';
        try {
            return format(new Date(timeString), 'h:mm a');
        } catch (error) {
            console.error('Error formatting time:', error);
            return 'Invalid time';
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
                                    Schedule Change Request #{scheduleChange.id}
                                </h3>
                                
                                <div className="mt-4 bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-2 sm:gap-4 sm:px-6 rounded-md">
                                    <div className="text-sm font-medium text-gray-500">Employee ID</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {scheduleChange.employee?.idno || 'N/A'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Employee Name</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {scheduleChange.employee ? 
                                            `${scheduleChange.employee.Lname}, ${scheduleChange.employee.Fname} ${scheduleChange.employee.MName || ''}` 
                                            : 'N/A'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Department</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {scheduleChange.employee?.Department || 'N/A'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Job Title</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {scheduleChange.employee?.Jobtitle || 'N/A'}
                                    </div>
                                </div>
                                
                                <div className="mt-4 bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-2 sm:gap-4 sm:px-6 rounded-md">
                                    <div className="text-sm font-medium text-gray-500">Schedule Type</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {scheduleChange.schedule_type?.name || 'N/A'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Effective Date</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {formatDate(scheduleChange.effective_date)}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">End Date</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {scheduleChange.end_date ? formatDate(scheduleChange.end_date) : 'Permanent Change'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Current Schedule</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {scheduleChange.current_schedule || 'Not specified'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">New Schedule</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {scheduleChange.new_schedule || 'Custom Schedule'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">New Working Hours</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {scheduleChange.new_start_time && scheduleChange.new_end_time ? 
                                            `${formatTime(scheduleChange.new_start_time)} - ${formatTime(scheduleChange.new_end_time)}` 
                                            : 'Not specified'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Status</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        <TimeScheduleStatusBadge status={scheduleChange.status} />
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Filed Date</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {scheduleChange.created_at ? 
                                            format(new Date(scheduleChange.created_at), 'yyyy-MM-dd h:mm a') 
                                            : 'N/A'}
                                    </div>
                                </div>
                                
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason:</label>
                                    <div className="border rounded-md p-3 bg-gray-50 text-sm text-gray-900">
                                        {scheduleChange.reason || 'No reason provided'}
                                    </div>
                                </div>
                                
                                {scheduleChange.remarks && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks:</label>
                                        <div className="border rounded-md p-3 bg-gray-50 text-sm text-gray-900">
                                            {scheduleChange.remarks}
                                        </div>
                                    </div>
                                )}
                                
                                {scheduleChange.approved_at && (
                                    <div className="mt-4 text-sm text-gray-500">
                                        {scheduleChange.status && scheduleChange.status.charAt(0).toUpperCase() + scheduleChange.status.slice(1)} on {' '}
                                        {scheduleChange.approved_at ? 
                                            format(new Date(scheduleChange.approved_at), 'yyyy-MM-dd h:mm a') 
                                            : 'N/A'}
                                        {scheduleChange.approver && ` by ${scheduleChange.approver.name}`}
                                    </div>
                                )}
                                
                                {/* Approval Form */}
                                {scheduleChange.status === 'pending' && (
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

export default TimeScheduleDetailModal;