import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import OffsetList from './OffsetList';
import OffsetForm from './OffsetForm';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { RefreshCw, Plus, ListFilter, Database } from 'lucide-react';

const OffsetPage = () => {
    const { props } = usePage();
    const { auth, flash = {}, userRoles = {}, offsets = [], employees = [], offsetTypes = [], departments = [] } = props;
    
    // State to manage component data
    const [offsetData, setOffsetData] = useState(offsets);
    const [activeTab, setActiveTab] = useState('list');
    const [processing, setProcessing] = useState(false);
    
    // Display flash messages
    useEffect(() => {
        if (flash && flash.message) {
            toast.success(flash.message);
        }
        if (flash && flash.error) {
            toast.error(flash.error);
        }
        if (flash && flash.errors && Array.isArray(flash.errors)) {
            flash.errors.forEach(error => toast.error(error));
        }
    }, [flash]);
    
    // Handle form submission
    const handleSubmitOffset = (formData) => {
        router.post(route('offsets.store'), formData, {
            onSuccess: (page) => {
                // Update offset list with the new data from the response
                if (page.props.offsets) {
                    setOffsetData(page.props.offsets);
                }
                toast.success('Offset request created successfully');
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
        
        setProcessing(true);
        
        router.post(route('offsets.updateStatus', id), data, {
            preserveScroll: true,
            onSuccess: (page) => {
                // Update offset list
                if (page.props.offsets) {
                    setOffsetData(page.props.offsets);
                }
                toast.success('Offset status updated successfully');
                setProcessing(false);
            },
            onError: (errors) => {
                let errorMessage = 'An error occurred while updating status';
                if (errors && typeof errors === 'object') {
                    errorMessage = Object.values(errors).join(', ');
                }
                toast.error(errorMessage);
                setProcessing(false);
            }
        });
    };
    
    // Handle deletion
    const handleDeleteOffset = (id) => {
        if (confirm('Are you sure you want to delete this offset request?')) {
            router.delete(route('offsets.destroy', id), {
                preserveScroll: true,
                onSuccess: (page) => {
                    // Update offset list
                    if (page.props.offsets) {
                        setOffsetData(page.props.offsets);
                    } else {
                        // Remove the deleted item from the current state
                        setOffsetData(offsetData.filter(offset => offset.id !== id));
                    }
                    toast.success('Offset request deleted successfully');
                },
                onError: () => toast.error('Failed to delete offset request')
            });
        }
    };

    // Handle adding hours to bank
    const handleAddHoursToBank = (data) => {
        router.post(route('offsets.addHoursToBank'), data, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Successfully added ${data.hours} hours to ${data.employee_name}'s offset bank`);
                // Refresh offset data
                router.reload({ only: ['offsets', 'employees'] });
            },
            onError: (errors) => {
                if (errors && typeof errors === 'object') {
                    Object.keys(errors).forEach(key => {
                        toast.error(errors[key]);
                    });
                } else {
                    toast.error('An error occurred while adding hours');
                }
            }
        });
    };
    
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Offset Management" />
            
            <div className="flex min-h-screen bg-gray-50">
                {/* Include the Sidebar */}
                <Sidebar />
                
                {/* Main Content */}
                <div className="flex-1 p-8 ml-0">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    <RefreshCw className="inline-block w-7 h-7 mr-2 text-indigo-600" />
                                    Offset Management
                                </h1>
                                <p className="text-gray-600">
                                    Manage employee offset requests and offset bank
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
                                                View Offset Requests
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
                                                New Offset Request
                                            </button>
                                            {(userRoles.isHrdManager || userRoles.isSuperAdmin) && (
                                                <button
                                                    className={`${
                                                        activeTab === 'bank'
                                                            ? 'border-indigo-500 text-indigo-600'
                                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                                                    onClick={() => setActiveTab('bank')}
                                                >
                                                    <Database className="w-4 h-4 mr-2" />
                                                    Offset Bank
                                                </button>
                                            )}
                                        </nav>
                                    </div>
                                </div>
                                
                                {activeTab === 'list' && (
                                    <OffsetList 
                                        offsets={offsetData} 
                                        onStatusUpdate={handleStatusUpdate}
                                        onDelete={handleDeleteOffset}
                                        userRoles={userRoles}
                                    />
                                )}
                                
                                {activeTab === 'create' && (
                                    <OffsetForm 
                                        employees={employees} 
                                        offsetTypes={offsetTypes}
                                        departments={departments} 
                                        onSubmit={handleSubmitOffset}
                                    />
                                )}

                                {activeTab === 'bank' && (
                                    <OffsetBankManager 
                                        employees={employees}
                                        onAddHours={handleAddHoursToBank}
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

export default OffsetPage;