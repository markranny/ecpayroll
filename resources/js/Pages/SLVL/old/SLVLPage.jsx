// resources/js/Pages/SLVL/SLVLPage.jsx
import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import Layout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import SLVLList from './SLVLList';
import SLVLForm from './SLVLForm';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SLVLPage = () => {
    const { props } = usePage();
    const { auth, flash = {} } = props;
    
    // State to manage component data
    const [leaves, setLeaves] = useState(props.leaves || []);
    const [activeTab, setActiveTab] = useState('list');
    const [processing, setProcessing] = useState(false);
    
    // Get static data from props
    const employees = props.employees || [];
    const departments = props.departments || [];
    const leaveTypes = [
        { value: 'sick', label: 'Sick Leave' },
        { value: 'vacation', label: 'Vacation Leave' },
        { value: 'emergency', label: 'Emergency Leave' },
        { value: 'bereavement', label: 'Bereavement Leave' },
        { value: 'maternity', label: 'Maternity Leave' },
        { value: 'paternity', label: 'Paternity Leave' },
    ];
    
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
    const handleSubmitLeave = (formData) => {
        router.post(route('slvl.store'), formData, {
            onSuccess: (page) => {
                // Update leaves list with the new data from the response
                if (page.props.leaves) {
                    setLeaves(page.props.leaves);
                }
                toast.success('Leave requests created successfully');
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
        const processSingleUpdate = (leaveId, updateData) => {
            return new Promise((resolve, reject) => {
                router.post(route('slvl.updateStatus', leaveId), updateData, {
                    preserveScroll: true,
                    onSuccess: (page) => {
                        // Update leaves list with the new data for individual updates
                        if (!isBatch && page.props.leaves) {
                            setLeaves(page.props.leaves);
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
                    toast.success('Leave status updated successfully');
                })
                .catch(error => {
                    toast.error(error);
                });
        } 
        // Handle batch update
        else {
            const promises = id.map(leaveId => processSingleUpdate(leaveId, data));
            
            Promise.all(promises)
                .then(responses => {
                    // Get the latest leave data from the last response
                    if (responses.length > 0 && responses[responses.length - 1].props.leaves) {
                        setLeaves(responses[responses.length - 1].props.leaves);
                    }
                    toast.success(`Successfully updated ${id.length} leave requests`);
                    setProcessing(false);
                })
                .catch(error => {
                    toast.error(`Error updating some leave requests: ${error}`);
                    setProcessing(false);
                });
        }
    };
    
    // Handle leave deletion
    const handleDeleteLeave = (id) => {
        if (confirm('Are you sure you want to delete this leave request?')) {
            router.delete(route('slvl.destroy', id), {
                preserveScroll: true,
                onSuccess: (page) => {
                    // Update leaves list with the new data
                    if (page.props.leaves) {
                        setLeaves(page.props.leaves);
                    } else {
                        // Remove the deleted item from the current state if not provided in response
                        setLeaves(leaves.filter(leave => leave.id !== id));
                    }
                    toast.success('Leave request deleted successfully');
                },
                onError: () => toast.error('Failed to delete leave request')
            });
        }
    };
    
    return (
        <Layout>
            <Head title="Leave Management" />
            
            <div className="flex min-h-screen bg-gray-50/50">
                {/* Fixed Sidebar */}
                <div className="fixed h-screen">
                    <Sidebar />
                </div>
                
                {/* Main Content - with margin to account for sidebar */}
                <div className="flex-1 p-8 ml-64">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    Leave Management
                                </h1>
                                <p className="text-gray-600">
                                    Manage employee sick leave and vacation leave requests.
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
                                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                                onClick={() => setActiveTab('list')}
                                            >
                                                View Leave Requests
                                            </button>
                                            <button
                                                className={`${
                                                    activeTab === 'create'
                                                        ? 'border-indigo-500 text-indigo-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                                onClick={() => setActiveTab('create')}
                                            >
                                                File New Leave
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                                
                                {activeTab === 'list' ? (
                                    <SLVLList 
                                        leaves={leaves} 
                                        onStatusUpdate={handleStatusUpdate}
                                        onDelete={handleDeleteLeave}
                                    />
                                ) : (
                                    <SLVLForm 
                                        employees={employees} 
                                        departments={departments} 
                                        leaveTypes={leaveTypes}
                                        onSubmit={handleSubmitLeave}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <ToastContainer position="top-right" autoClose={3000} />
        </Layout>
    );
};

export default SLVLPage;