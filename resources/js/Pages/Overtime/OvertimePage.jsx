// resources/js/Pages/Overtime/OvertimePage.jsx
import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import OvertimeList from './OvertimeList';
import OvertimeForm from './OvertimeForm';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Clock, Plus, ListFilter } from 'lucide-react';

const OvertimePage = () => {
    const { props } = usePage();
    const { auth, flash = {}, userRoles = {}, overtimes = [], employees = [], departments = [], rateMultipliers = [] } = props;
    
    // State to manage component data
    const [overtimeData, setOvertimeData] = useState(overtimes);
    const [activeTab, setActiveTab] = useState('create'); // Changed from 'list' to 'create'
    const [processing, setProcessing] = useState(false);
    
    // Display flash messages with proper null checking
    useEffect(() => {
        if (flash && flash.message) {
            toast.success(flash.message);
        }
        if (flash && flash.error) {
            toast.error(flash.error);
        }
    }, [flash]);
    
    // Handle form submission
    const handleSubmitOvertime = (formData) => {
        router.post(route('overtimes.store'), formData, {
            onSuccess: (page) => {
                // Update overtimes list with the new data from the response
                if (page.props.overtimes) {
                    setOvertimeData(page.props.overtimes);
                }
                toast.success('Overtime requests created successfully');
                setActiveTab('list'); // Switch to list view after successful submission
            },
            onError: (errors) => {
                if (errors && typeof errors === 'object') {
                    Object.keys(errors).forEach(key => {
                        toast.error(errors[key]);
                    });
                } else {
                    toast.error('An error occurred while submitting form');
                }
            }
        });
    };

    const handleBulkStatusUpdate = (status, remarks) => {
        setProcessing(true);
        
        // Create data for bulk update
        const data = {
            overtime_ids: selectedIds,
            status: status,
            remarks: remarks
        };
        
        // Make a direct API call
        router.post(route('overtimes.bulkUpdateStatus'), data, {
            preserveScroll: true,
            onSuccess: (page) => {
                // Clear selections after successful update
                setSelectedIds([]);
                setSelectAll(false);
                
                // Get the response from page.props
                const response = page.props.flash?.json_response;
                
                if (response) {
                    if (response.success) {
                        toast.success(response.message);
                    } else {
                        toast.error(response.message);
                    }
                    
                    if (response.errors && response.errors.length > 0) {
                        response.errors.forEach(error => {
                            toast.error(error);
                        });
                    }
                } else {
                    // Default message if response is not available
                    const actionText = status === 'rejected' 
                        ? 'rejected' 
                        : status === 'force_approved' 
                            ? 'force approved' 
                            : 'approved';
                    
                    toast.success(`Successfully ${actionText} ${selectedIds.length} overtime requests`);
                }
                
                // Refresh the data
                router.reload({
                    only: ['overtimes'],
                    preserveScroll: true,
                    onFinish: () => {
                        setProcessing(false);
                    }
                });
            },
            onError: (errors) => {
                console.error('Error during bulk update:', errors);
                toast.error('Failed to update overtime requests: ' + 
                    (errors?.message || 'Unknown error'));
                setProcessing(false);
            }
        });
        
        // Close the modal
        handleCloseBulkActionModal();
    };
    
    // Handle status updates (approve/reject)
    const handleStatusUpdate = (id, data) => {
        if (processing) return;
        
        // For batch updates, we need to manage the processing state differently
        const isBatch = Array.isArray(id);
        if (!isBatch) {
            console.log("Status update called with:", id, data);
        } else {
            console.log(`Batch status update for ${id.length} items`);
            setProcessing(true);
        }

        // Function to process a single update
        const processSingleUpdate = (overtimeId, updateData) => {
            return new Promise((resolve, reject) => {
                router.post(route('overtimes.updateStatus', overtimeId), updateData, {
                    preserveScroll: true,
                    onSuccess: (page) => {
                        // Update overtimes list with the new data for individual updates
                        if (!isBatch && page.props.overtimes) {
                            setOvertimeData(page.props.overtimes);
                        }
                        resolve(page);
                    },
                    onError: (errors) => {
                        let errorMessage = 'An error occurred while updating status';
                        if (errors && typeof errors === 'object') {
                            errorMessage = Object.values(errors).join(', ');
                        }
                        reject(errorMessage);
                    }
                });
            });
        };

        // Handle single update
        if (!isBatch) {
            processSingleUpdate(id, data)
                .then(() => {
                    toast.success('Overtime status updated successfully');
                })
                .catch(error => {
                    toast.error(error);
                });
        } 
        // Handle batch update
        else {
            const promises = id.map(overtimeId => processSingleUpdate(overtimeId, data));
            
            Promise.all(promises)
                .then(responses => {
                    // Get the latest overtime data from the last response
                    if (responses.length > 0 && responses[responses.length - 1].props.overtimes) {
                        setOvertimeData(responses[responses.length - 1].props.overtimes);
                    }
                    toast.success(`Successfully updated ${id.length} overtime requests`);
                    setProcessing(false);
                })
                .catch(error => {
                    toast.error(`Error updating some overtime requests: ${error}`);
                    setProcessing(false);
                });
        }
    };
    
    // Handle overtime deletion
    const handleDeleteOvertime = (id) => {
        if (confirm('Are you sure you want to delete this overtime request?')) {
            router.delete(route('overtimes.destroy', id), {
                preserveScroll: true,
                onSuccess: (page) => {
                    // Update overtimes list with the new data
                    if (page.props.overtimes) {
                        setOvertimeData(page.props.overtimes);
                    } else {
                        // Remove the deleted item from the current state if not provided in response
                        setOvertimeData(overtimeData.filter(ot => ot.id !== id));
                    }
                    toast.success('Overtime deleted successfully');
                },
                onError: () => toast.error('Failed to delete overtime')
            });
        }
    };
    
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Overtime Management" />
            
            <div className="flex min-h-screen bg-gray-50">
                {/* Include the Sidebar */}
                <Sidebar />
                
                {/* Main Content */}
                <div className="flex-1 p-8 ml-0">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    <Clock className="inline-block w-7 h-7 mr-2 text-indigo-600" />
                                    Overtime Management
                                </h1>
                                <p className="text-gray-600">
                                    Manage employee overtime requests and approvals
                                </p>
                            </div>
                        </div>
                
                        <div className="bg-white overflow-hidden shadow-sm rounded-lg">
                            <div className="p-6 bg-white border-b border-gray-200">
                                <div className="mb-6">
                                    <div className="border-b border-gray-200">
                                        <nav className="-mb-px flex space-x-8">
                                            <button
                                                className={`${
                                                    activeTab === 'list'
                                                        ? 'border-indigo-500 text-indigo-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                                                onClick={() => setActiveTab('list')}
                                            >
                                                <ListFilter className="w-4 h-4 mr-2" />
                                                View Overtimes
                                            </button>
                                            <button
                                                className={`${
                                                    activeTab === 'create'
                                                        ? 'border-indigo-500 text-indigo-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                                                onClick={() => setActiveTab('create')}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                File New Overtime
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                                
                                {activeTab === 'list' ? (
                                    <OvertimeList 
                                        overtimes={overtimeData} 
                                        onStatusUpdate={handleStatusUpdate}
                                        onDelete={handleDeleteOvertime}
                                        userRoles={userRoles}
                                    />
                                ) : (
                                    <OvertimeForm 
                                        employees={employees} 
                                        departments={departments} 
                                        rateMultipliers={rateMultipliers}
                                        onSubmit={handleSubmitOvertime}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <ToastContainer position="top-right" autoClose={3000} />
        </AuthenticatedLayout>
    );
};

export default OvertimePage;