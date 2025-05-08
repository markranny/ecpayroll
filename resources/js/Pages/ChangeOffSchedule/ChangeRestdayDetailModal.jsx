// resources/js/Pages/ChangeOffSchedule/ChangeRestdayDetailModal.jsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import ChangeRestdayStatusBadge from './ChangeRestdayStatusBadge';

const ChangeRestdayDetailModal = ({ changeOff, onClose, onStatusUpdate, userRoles = {} }) => {
    const [remarks, setRemarks] = useState('');
    const [processing, setProcessing] = useState(false);
    
    const handleStatusChange = (status) => {
        if (processing) return;
        
        if (status === 'rejected' && !remarks.trim()) {
            alert('Please provide remarks for rejection');
            return;
        }
        
        setProcessing(true);
        
        const data = {
            status: status,
            remarks: remarks
        };
        
        if (typeof onStatusUpdate === 'function') {
            onStatusUpdate(changeOff.id, data);
        }
        setProcessing(false);
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
    
    // Format datetime safely
    const formatDateTime = (dateTimeString) => {
        try {
            return format(new Date(dateTimeString), 'yyyy-MM-dd h:mm a');
        } catch (error) {
            console.error('Error formatting datetime:', error);
            return 'Invalid datetime';
        }
    };
    
    // Check if user can approve/reject
    const canApprove = userRoles.isSuperAdmin || 
                      userRoles.isHrdManager || 
                      (userRoles.isDepartmentManager && 
                       userRoles.managedDepartments?.includes(changeOff.employee?.Department));

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
                                    Change Rest Day Details #{changeOff.id}
                                </h3>
                                
                                {/* Employee details section */}
                                <div className="mt-4 bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-2 sm:gap-4 sm:px-6 rounded-md">
                                    <div className="text-sm font-medium text-gray-500">Employee ID</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {changeOff.employee?.idno || 'N/A'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Employee Name</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {changeOff.employee ? 
                                            `${changeOff.employee.Lname}, ${changeOff.employee.Fname} ${changeOff.employee.MName || ''}` 
                                            : 'N/A'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Department</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {changeOff.employee?.Department || 'N/A'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Job Title</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {changeOff.employee?.Jobtitle || 'N/A'}
                                    </div>
                                </div>
                                
                                {/* Change rest day details section */}
                                <div className="mt-4 bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-2 sm:gap-4 sm:px-6 rounded-md">
                                    <div className="text-sm font-medium text-gray-500">Original Rest Day</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {changeOff.original_date ? formatDate(changeOff.original_date) : 'N/A'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Requested Rest Day</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {changeOff.requested_date ? formatDate(changeOff.requested_date) : 'N/A'}
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Status</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        <ChangeRestdayStatusBadge status={changeOff.status} />
                                    </div>
                                    
                                    <div className="text-sm font-medium text-gray-500">Filed Date</div>
                                    <div className="mt-1 text-sm text-gray-900 sm:mt-0">
                                        {changeOff.created_at ? 
                                            formatDateTime(changeOff.created_at) 
                                            : 'N/A'}
                                    </div>
                                </div>
                                
                                {/* Reason section */}
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason:</label>
                                    <div className="border rounded-md p-3 bg-gray-50 text-sm text-gray-900">
                                        {changeOff.reason || 'No reason provided'}
                                    </div>
                                </div>
                                
                                {/* Approval Status Section */}
                                {changeOff.approved_at && (
                                    <div className="mt-4 border-t border-gray-200 pt-4">
                                        <h4 className="text-md font-medium text-gray-900 mb-3">Approval Information</h4>
                                        
                                        <div className="bg-gray-50 rounded-md p-4 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-700">Approved/Rejected By</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-medium">
                                                        {changeOff.approver ? changeOff.approver.name : 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {formatDateTime(changeOff.approved_at)}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {changeOff.remarks && (
                                                <div className="border border-gray-200 rounded p-2 text-sm text-gray-700 bg-white">
                                                    <span className="font-medium">Remarks:</span> {changeOff.remarks}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Approval Form - only show if pending and user can approve */}
                                {canApprove && changeOff.status === 'pending' && (
                                    <div className="mt-6 border-t border-gray-200 pt-4">
                                        <h4 className="text-md font-medium text-gray-900 mb-3">Take Action</h4>
                                        
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

                                {/* Force Approve Button (Superadmin Only) */}
                                {userRoles.isSuperAdmin && changeOff.status === 'pending' && (
                                    <div className="mt-6 border-t border-gray-200 pt-4">
                                        <h4 className="text-md font-medium text-gray-900 mb-3">
                                            Administrative Actions
                                        </h4>
                                        
                                        <div className="mb-4">
                                            <div className="bg-yellow-50 p-4 rounded-md">
                                                <div className="flex">
                                                    <div className="flex-shrink-0">
                                                        <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <div className="ml-3">
                                                        <h3 className="text-sm font-medium text-yellow-800">
                                                            Administrative Override
                                                        </h3>
                                                        <div className="mt-2 text-sm text-yellow-700">
                                                            <p>
                                                                Force approving will bypass the normal approval workflow. Use with caution.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Admin Remarks
                                            </label>
                                            <textarea
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                rows={3}
                                                value={remarks}
                                                onChange={(e) => setRemarks(e.target.value)}
                                                placeholder="Enter remarks for this administrative action"
                                            ></textarea>
                                        </div>
                                        
                                        <div className="flex justify-end">
                                            <button
                                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                                onClick={() => handleStatusChange('force_approved')}
                                                disabled={processing}
                                            >
                                                {processing ? 'Processing...' : 'Force Approve'}
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

export default ChangeRestdayDetailModal;