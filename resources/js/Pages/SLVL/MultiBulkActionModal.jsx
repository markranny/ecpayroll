// resources/js/Pages/SLVL/MultiBulkActionModal.jsx
import React, { useState } from 'react';

const MultiBulkActionModal = ({ selectedCount, onClose, onSubmit }) => {
    const [status, setStatus] = useState('approved');
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
        onSubmit(status, remarks);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                                <svg className="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    Bulk Update {selectedCount} Leave Request{selectedCount !== 1 ? 's' : ''}
                                </h3>
                                <div className="mt-4">
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Status
                                        </label>
                                        <div className="flex space-x-4">
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="radio"
                                                    className="form-radio text-indigo-600"
                                                    name="status"
                                                    value="approved"
                                                    checked={status === 'approved'}
                                                    onChange={() => setStatus('approved')}
                                                />
                                                <span className="ml-2 text-gray-700">Approve</span>
                                            </label>
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="radio"
                                                    className="form-radio text-red-600"
                                                    name="status"
                                                    value="rejected"
                                                    checked={status === 'rejected'}
                                                    onChange={() => setStatus('rejected')}
                                                />
                                                <span className="ml-2 text-gray-700">Reject</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Remarks {status === 'rejected' && <span className="text-red-500">*</span>}
                                        </label>
                                        <textarea
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            rows={3}
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            placeholder={`Enter remarks for ${selectedCount} leave request${selectedCount !== 1 ? 's' : ''}`}
                                        ></textarea>
                                        {status === 'rejected' && (
                                            <p className="mt-1 text-sm text-gray-500">
                                                Remarks are required when rejecting leave requests
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
                            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${
                                status === 'approved' 
                                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                            } text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm`}
                            onClick={handleSubmit}
                            disabled={processing}
                        >
                            {processing ? 'Processing...' : (status === 'approved' ? 'Approve All' : 'Reject All')}
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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

export default MultiBulkActionModal;