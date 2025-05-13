import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Zap } from 'lucide-react';

const TimeScheduleForceApproveButton = ({ selectedIds, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [remarks, setRemarks] = useState('');
    const [processing, setProcessing] = useState(false);
    const [showSuccessImage, setShowSuccessImage] = useState(false);

    // Open modal
    const openModal = () => {
        if (selectedIds.length === 0) {
            alert('Please select at least one time schedule change request to force approve');
            return;
        }
        setIsOpen(true);
    };

    // Close modal
    const closeModal = () => {
        setIsOpen(false);
        setRemarks('');
        setShowSuccessImage(false);
    };

    // Handle force approve
    const handleForceApprove = () => {
        if (processing) return;
        
        setProcessing(true);
        
        router.post(route('time-schedules.force-approve'), {
            time_schedule_ids: selectedIds,
            remarks: remarks
        }, {
            preserveScroll: true,
            onSuccess: () => {
                // Show success image before closing modal
                setShowSuccessImage(true);
                
                // Close the modal and reload after a delay
                setTimeout(() => {
                    closeModal();
                    window.location.href = route('time-schedules.index');
                }, 2000); // 2 second delay to show success image
                
                setProcessing(false);
            },
            onError: (errors) => {
                console.error('Error force approving:', errors);
                alert('Failed to force approve. Please try again.');
                setProcessing(false);
            }
        });
    };

    return (
        <>
            <button
                onClick={openModal}
                disabled={disabled || selectedIds.length === 0}
                className={`px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center ${
                    (disabled || selectedIds.length === 0) ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                title="Force Approve Selected Time Schedule Changes"
            >
                <Zap className="h-4 w-4 mr-1" />
                Force Approve {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
            </button>

            {/* Force Approve Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            {showSuccessImage ? (
                                // Success image displayed here
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 text-center">
                                    <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 mb-4">
                                        <svg className="h-16 w-16 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                                        Force Approval Successful!
                                    </h3>
                                    <p className="mt-2 text-sm text-gray-500">
                                        The selected time schedule change requests have been approved.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                        <div className="sm:flex sm:items-start">
                                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 sm:mx-0 sm:h-10 sm:w-10">
                                                <Zap className="h-6 w-6 text-purple-600" />
                                            </div>
                                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                    Force Approve {selectedIds.length} Time Schedule Change Request{selectedIds.length !== 1 ? 's' : ''}
                                                </h3>
                                                <div className="mt-2">
                                                    <p className="text-sm text-gray-500">
                                                        This will bypass the normal approval workflow and immediately approve the selected time schedule change request(s). This action cannot be undone.
                                                    </p>
                                                </div>
                                                <div className="mt-4">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Administrator Remarks
                                                    </label>
                                                    <textarea
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                        rows={3}
                                                        value={remarks}
                                                        onChange={(e) => setRemarks(e.target.value)}
                                                        placeholder="Enter any remarks for this forced approval"
                                                    ></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                        <button
                                            type="button"
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
                                            onClick={handleForceApprove}
                                            disabled={processing}
                                        >
                                            {processing ? 'Processing...' : 'Force Approve'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                            onClick={closeModal}
                                            disabled={processing}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TimeScheduleForceApproveButton;