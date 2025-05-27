// resources/js/Pages/SLVL/SLVLBankModal.jsx
import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Calendar, Plus, Minus, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const SLVLBankModal = ({ isOpen, onClose, employee, bankData, onRefresh }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [addFormData, setAddFormData] = useState({
        leave_type: 'sick',
        days: '',
        reason: ''
    });
    const [processing, setProcessing] = useState(false);

    if (!isOpen || !employee) return null;

    const handleAddDays = async (e) => {
        e.preventDefault();
        
        if (!addFormData.days || !addFormData.reason.trim()) {
            alert('Please fill in all fields');
            return;
        }

        setProcessing(true);

        try {
            const response = await fetch('/slvl/add-days-to-bank', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify({
                    employee_id: employee.id,
                    leave_type: addFormData.leave_type,
                    days: parseFloat(addFormData.days),
                    reason: addFormData.reason
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Refresh the bank data
                onRefresh(employee.id);
                
                // Reset form
                setAddFormData({
                    leave_type: 'sick',
                    days: '',
                    reason: ''
                });
                setShowAddForm(false);
                
                alert(result.message);
            } else {
                alert(result.message || 'Failed to add days to bank');
            }
        } catch (error) {
            console.error('Error adding days to bank:', error);
            alert('Error adding days to bank: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleModalClick = (e) => {
        e.stopPropagation();
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && !processing) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 overflow-y-auto" 
            onClick={handleBackdropClick}
        >
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                
                <div 
                    className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                    onClick={handleModalClick}
                >
                    {/* Processing overlay */}
                    {processing && (
                        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-600" />
                                <p className="text-sm text-gray-600">Processing...</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                                <Calendar className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    SLVL Bank - {employee.Fname} {employee.Lname}
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        Employee ID: {employee.idno} | Department: {employee.Department || 'N/A'}
                                    </p>
                                </div>
                                
                                {/* Bank Information */}
                                <div className="mt-4 space-y-4">
                                    {bankData ? (
                                        <>
                                            {/* Sick Leave Bank */}
                                            {bankData.sick && (
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-medium text-blue-900">Sick Leave Bank</h4>
                                                        <div className="flex items-center">
                                                            {bankData.sick.remaining_days > 5 ? (
                                                                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                                            ) : bankData.sick.remaining_days > 0 ? (
                                                                <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />
                                                            ) : (
                                                                <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                                                            )}
                                                            <span className={`text-sm font-bold ${
                                                                bankData.sick.remaining_days > 5 ? 'text-green-700' :
                                                                bankData.sick.remaining_days > 0 ? 'text-yellow-700' : 'text-red-700'
                                                            }`}>
                                                                {bankData.sick.remaining_days} days remaining
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex justify-between text-sm text-blue-700">
                                                        <span>Total: {bankData.sick.total_days} days</span>
                                                        <span>Used: {bankData.sick.used_days} days</span>
                                                    </div>
                                                    <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                                                        <div 
                                                            className="bg-blue-600 h-2 rounded-full" 
                                                            style={{
                                                                width: `${(bankData.sick.used_days / bankData.sick.total_days) * 100}%`
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Vacation Leave Bank */}
                                            {bankData.vacation && (
                                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-medium text-green-900">Vacation Leave Bank</h4>
                                                        <div className="flex items-center">
                                                            {bankData.vacation.remaining_days > 5 ? (
                                                                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                                            ) : bankData.vacation.remaining_days > 0 ? (
                                                                <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />
                                                            ) : (
                                                                <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                                                            )}
                                                            <span className={`text-sm font-bold ${
                                                                bankData.vacation.remaining_days > 5 ? 'text-green-700' :
                                                                bankData.vacation.remaining_days > 0 ? 'text-yellow-700' : 'text-red-700'
                                                            }`}>
                                                                {bankData.vacation.remaining_days} days remaining
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex justify-between text-sm text-green-700">
                                                        <span>Total: {bankData.vacation.total_days} days</span>
                                                        <span>Used: {bankData.vacation.used_days} days</span>
                                                    </div>
                                                    <div className="mt-2 w-full bg-green-200 rounded-full h-2">
                                                        <div 
                                                            className="bg-green-600 h-2 rounded-full" 
                                                            style={{
                                                                width: `${(bankData.vacation.used_days / bankData.vacation.total_days) * 100}%`
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center py-4">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
                                            <p className="text-sm text-gray-500">Loading bank information...</p>
                                        </div>
                                    )}
                                    
                                    {/* Add Days Form */}
                                    {showAddForm ? (
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                            <h4 className="text-sm font-medium text-gray-900 mb-3">Add Days to Bank</h4>
                                            <form onSubmit={handleAddDays} className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Leave Type
                                                    </label>
                                                    <select
                                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm"
                                                        value={addFormData.leave_type}
                                                        onChange={(e) => setAddFormData({...addFormData, leave_type: e.target.value})}
                                                        disabled={processing}
                                                    >
                                                        <option value="sick">Sick Leave</option>
                                                        <option value="vacation">Vacation Leave</option>
                                                    </select>
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Days to Add
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        min="0.5"
                                                        max="365"
                                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm"
                                                        value={addFormData.days}
                                                        onChange={(e) => setAddFormData({...addFormData, days: e.target.value})}
                                                        placeholder="e.g., 5 or 2.5"
                                                        disabled={processing}
                                                        required
                                                    />
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Reason
                                                    </label>
                                                    <textarea
                                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm"
                                                        rows="2"
                                                        value={addFormData.reason}
                                                        onChange={(e) => setAddFormData({...addFormData, reason: e.target.value})}
                                                        placeholder="Reason for adding days"
                                                        disabled={processing}
                                                        required
                                                    ></textarea>
                                                </div>
                                                
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        type="button"
                                                        className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                                                        onClick={() => {
                                                            setShowAddForm(false);
                                                            setAddFormData({leave_type: 'sick', days: '', reason: ''});
                                                        }}
                                                        disabled={processing}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                                                        disabled={processing}
                                                    >
                                                        {processing ? (
                                                            <>
                                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                                Adding...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus className="h-3 w-3 mr-1" />
                                                                Add Days
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center">
                                            <button
                                                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center disabled:opacity-50"
                                                onClick={() => setShowAddForm(true)}
                                                disabled={processing}
                                            >
                                                <Plus className="h-4 w-4 mr-1" />
                                                Add Days to Bank
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button 
                            type="button" 
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
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

export default SLVLBankModal;