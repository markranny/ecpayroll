// ForceApproveButton.jsx with enhanced loading states

import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Zap, Loader2 } from 'lucide-react';

const ForceApproveButton = ({ selectedIds, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [remarks, setRemarks] = useState('');
    const [processing, setProcessing] = useState(false);
    const [showSuccessImage, setShowSuccessImage] = useState(false);

    // Open modal
    const openModal = () => {
        if (selectedIds.length === 0) {
            alert('Please select at least one overtime request to force approve');
            return;
        }
        if (processing) return;
        setIsOpen(true);
    };

    // Close modal
    const closeModal = () => {
        if (processing) return; // Prevent closing during processing
        setIsOpen(false);
        setRemarks('');
        setShowSuccessImage(false);
    };

    // Handle force approve
    const handleForceApprove = () => {
        if (processing) return;
        
        setProcessing(true);
        
        router.post(route('overtimes.force-approve'), {
            overtime_ids: selectedIds,
            remarks: remarks
        }, {
            preserveScroll: true,
            onSuccess: () => {
                // Show success image before closing modal
                setShowSuccessImage(true);
                
                // Close the modal and reload after a delay
                setTimeout(() => {
                    closeModal();
                    window.location.href = route('overtimes.index');
                }, 2000); // 2 second delay to show success image
            },
            onError: (errors) => {
                console.error('Error force approving:', errors);
                alert('Failed to force approve. Please try again.');
                setProcessing(false);
            },
            onFinish: () => {
                // Only reset processing if we're not showing success
                if (!showSuccessImage) {
                    setProcessing(false);
                }
            }
        });
    };

    return (
        <>
            <button
                onClick={openModal}
                disabled={disabled || selectedIds.length === 0 || processing}
                className={`px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center transition-all duration-200 ${
                    (disabled || selectedIds.length === 0 || processing) ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                title="Force Approve Selected Overtimes"
            >
                {processing ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <Zap className="h-4 w-4 mr-1" />
                        Force Approve {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                    </>
                )}
            </button>

            {/* Force Approve Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative">
                            
                            {/* Processing Overlay */}
                            {processing && !showSuccessImage && (
                                <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
                                    <div className="text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-purple-600" />
                                        <p className="text-sm text-gray-600">Force approving overtime requests...</p>
                                        <p className="text-xs text-gray-500 mt-1">Please wait, this may take a moment.</p>
                                    </div>
                                </div>
                            )}
                            
                            {showSuccessImage ? (
                                // Success state
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
                                        The selected overtime requests have been approved.
                                    </p>
                                    <div className="mt-3">
                                        <div className="bg-green-50 p-3 rounded-md">
                                            <p className="text-sm text-green-700">
                                                Redirecting to the overtime list...
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Form state
                                <>
                                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                        <div className="sm:flex sm:items-start">
                                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 sm:mx-0 sm:h-10 sm:w-10">
                                                <Zap className="h-6 w-6 text-purple-600" />
                                            </div>
                                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                    Force Approve {selectedIds.length} Overtime Request{selectedIds.length !== 1 ? 's' : ''}
                                                </h3>
                                                <div className="mt-2">
                                                    <p className="text-sm text-gray-500">
                                                        This will bypass the normal approval workflow and immediately approve the selected overtime request(s). This action cannot be undone.
                                                    </p>
                                                </div>
                                                
                                                {/* Warning box */}
                                                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                                    <div className="flex">
                                                        <div className="flex-shrink-0">
                                                            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                        <div className="ml-3">
                                                            <h3 className="text-sm font-medium text-yellow-800">
                                                                Administrative Override
                                                            </h3>
                                                            <div className="mt-1 text-sm text-yellow-700">
                                                                <p>This action will be logged and auditable.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-4">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Administrator Remarks <span className="text-red-500">*</span>
                                                    </label>
                                                    <textarea
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                        rows={3}
                                                        value={remarks}
                                                        onChange={(e) => setRemarks(e.target.value)}
                                                        placeholder="Enter the reason for this forced approval (required)"
                                                        disabled={processing}
                                                    ></textarea>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Please provide a clear justification for this administrative action.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                        <button
                                            type="button"
                                            className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                            onClick={handleForceApprove}
                                            disabled={processing || !remarks.trim()}
                                        >
                                            {processing ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                'Force Approve'
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 transition-all duration-200"
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

export default ForceApproveButton;