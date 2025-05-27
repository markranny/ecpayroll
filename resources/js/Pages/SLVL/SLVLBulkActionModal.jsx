// resources/js/Pages/SLVL/SLVLBulkActionModal.jsx
import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';

const SLVLBulkActionModal = ({ selectedCount, onClose, onSubmit, approvalLevel, userRoles = {} }) => {
    const [status, setStatus] = useState(approvalLevel === 'department' ? 'manager_approved' : 'approved');
    const [remarks, setRemarks] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleSubmit = () => {
        if (processing) return;

        // Validation for rejected status
        if (status === 'rejected' && !remarks.trim()) {
            alert('Please provide remarks for rejection');
            return;
        }

        setProcessing(true);
        
        // Make the API call directly using router.post
        const leaveIds = Array.isArray(selectedCount) ? selectedCount : 
                           typeof selectedCount === 'string' && selectedCount.startsWith('[') ? 
                           JSON.parse(selectedCount) : [selectedCount];
        
        router.post(route('slvl.bulkUpdateStatus'), {
            leave_ids: leaveIds,
            status: status,
            remarks: remarks
        }, {
            preserveScroll: true,
            onSuccess: () => {
                // Display success message based on the status
                const actionText = status === 'rejected' 
                    ? 'rejected' 
                    : status === 'force_approved' 
                        ? 'force approved' 
                        : approvalLevel === 'department' 
                            ? 'approved (Dept. Level)' 
                            : 'approved';
                    
                // Show success toast with the appropriate message
                toast.success(`Successfully ${actionText} ${Array.isArray(leaveIds) ? leaveIds.length : 1} leave request${Array.isArray(leaveIds) && leaveIds.length !== 1 ? 's' : ''}`);
                
                // Close modal and reset processing state
                onClose();
                setProcessing(false);
                
                // Reload the page to refresh data
                window.location.reload();
            },
            onError: (errors) => {
                console.error('Error in bulk action:', errors);
                toast.error('Failed to process bulk action. Please try again.');
                setProcessing(false);
            }
        });
    }; // <- This closing brace was missing!

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative">
                    
                    {/* Loading Overlay */}
                    {processing && (
                        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-600" />
                                <p className="text-sm text-gray-600">Processing bulk action...</p>
                            </div>
                        </div>
                    )}
                    
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                                <svg className="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    Bulk Update {Array.isArray(selectedCount) ? selectedCount.length : 
                                              typeof selectedCount === 'string' && selectedCount.startsWith('[') ? 
                                              JSON.parse(selectedCount).length : selectedCount} Leave Request{selectedCount !== 1 ? 's' : ''}
                                </h3>
                                <div className="mt-4">
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {approvalLevel === 'department' ? 'Department Manager Action' : 'HRD Manager Action'}
                                        </label>
                                        <div className="flex flex-col space-y-2">
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="radio"
                                                    className="form-radio text-indigo-600"
                                                    name="status"
                                                    value={approvalLevel === 'department' ? 'manager_approved' : 'approved'}
                                                    checked={status === (approvalLevel === 'department' ? 'manager_approved' : 'approved')}
                                                    onChange={() => setStatus(approvalLevel === 'department' ? 'manager_approved' : 'approved')}
                                                    disabled={processing}
                                                />
                                                <span className="ml-2 text-gray-700">
                                                    {approvalLevel === 'department' ? 'Approve (Dept. Level)' : 'Final Approve'}
                                                </span>
                                            </label>
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="radio"
                                                    className="form-radio text-red-600"
                                                    name="status"
                                                    value="rejected"
                                                    checked={status === 'rejected'}
                                                    onChange={() => setStatus('rejected')}
                                                    disabled={processing}
                                                />
                                                <span className="ml-2 text-gray-700">Reject</span>
                                            </label>
                                            
                                            {/* Force Approve option for superadmins only */}
                                            {userRoles && userRoles.isSuperAdmin && (
                                                <label className="inline-flex items-center">
                                                    <input
                                                        type="radio"
                                                        className="form-radio text-purple-600"
                                                        name="status"
                                                        value="force_approved"
                                                        checked={status === "force_approved"}
                                                        onChange={() => setStatus("force_approved")}
                                                        disabled={processing}
                                                    />
                                                    <span className="ml-2 text-gray-700">Force Approve (Admin Override)</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Warning message for force approval */}
                                    {status === 'force_approved' && (
                                        <div className="mb-4 bg-yellow-50 p-3 rounded-md">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm text-yellow-700">
                                                        Force approving will bypass the normal approval workflow. This action will be logged.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Remarks {(status === 'rejected' || status === 'force_approved') && <span className="text-red-500">*</span>}
                                        </label>
                                        <textarea
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            rows={3}
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            placeholder={`Enter remarks for leave requests`}
                                            disabled={processing}
                                        ></textarea>
                                        {status === 'rejected' && (
                                            <p className="mt-1 text-sm text-gray-500">
                                                Remarks are required when rejecting leave requests
                                            </p>
                                        )}
                                        {status === 'force_approved' && (
                                            <p className="mt-1 text-sm text-gray-500">
                                                Please provide a reason for the administrative override
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 ${
                                status === 'rejected' 
                                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                                    : status === 'force_approved'
                                    ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
                                    : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                            } text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                            onClick={handleSubmit}
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                status === 'rejected' ? 'Reject All' : 
                                status === 'force_approved' ? 'Force Approve All' :
                                approvalLevel === 'department' ? 'Approve All (Dept. Level)' : 'Final Approve All'
                            )}
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                            onClick={onClose}
                            disabled={processing}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SLVLBulkActionModal;