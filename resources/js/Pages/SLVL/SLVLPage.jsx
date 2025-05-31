import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import SLVLList from './SLVLList';
import SLVLForm from './SLVLForm';
import SLVLBankManager from './SLVLBankManager';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Calendar, Plus, ListFilter, Database } from 'lucide-react';

const SLVLPage = () => {
    const { props } = usePage();
    const { auth, flash = {}, userRoles = {}, slvls = [], employees = [], leaveTypes = [], departments = [] } = props;
    
    // State to manage component data
    const [slvlData, setSLVLData] = useState(slvls);
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
    
    // Handle form submission with file upload
    const handleSubmitSLVL = (formData) => {
        if (processing) return;
        
        setProcessing(true);
        
        // Log the form data for debugging
        console.log('Submitting SLVL form data:', formData);
        
        // Submit the form data (FormData object for file upload)
        router.post(route('slvl.store'), formData, {
            forceFormData: true, // Force multipart/form-data for file upload
            preserveScroll: true,
            onSuccess: (page) => {
                console.log('SLVL submission successful:', page);
                
                // Update SLVL list with the new data from the response
                if (page.props.slvls) {
                    setSLVLData(page.props.slvls);
                }
                
                toast.success('SLVL request created successfully');
                setActiveTab('list'); // Switch to list view after successful submission
                setProcessing(false);
            },
            onError: (errors) => {
                console.error('SLVL submission errors:', errors);
                
                if (errors && typeof errors === 'object') {
                    Object.keys(errors).forEach(key => {
                        if (Array.isArray(errors[key])) {
                            errors[key].forEach(error => toast.error(error));
                        } else {
                            toast.error(errors[key]);
                        }
                    });
                } else {
                    toast.error('An error occurred while submitting form');
                }
                setProcessing(false);
            },
            onFinish: () => {
                setProcessing(false);
            }
        });
    };
    
    // Handle status updates (approve/reject)
    const handleStatusUpdate = (id, data) => {
        if (processing) return;
        
        setProcessing(true);
        
        router.post(route('slvl.updateStatus', id), data, {
            preserveScroll: true,
            onSuccess: (page) => {
                // Update SLVL list
                if (page.props.slvls) {
                    setSLVLData(page.props.slvls);
                }
                toast.success('SLVL status updated successfully');
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
    const handleDeleteSLVL = (id) => {
        if (confirm('Are you sure you want to delete this SLVL request?')) {
            setProcessing(true);
            
            router.delete(route('slvl.destroy', id), {
                preserveScroll: true,
                onSuccess: (page) => {
                    // Update SLVL list
                    if (page.props.slvls) {
                        setSLVLData(page.props.slvls);
                    } else {
                        // Remove the deleted item from the current state
                        setSLVLData(slvlData.filter(slvl => slvl.id !== id));
                    }
                    toast.success('SLVL request deleted successfully');
                    setProcessing(false);
                },
                onError: () => {
                    toast.error('Failed to delete SLVL request');
                    setProcessing(false);
                }
            });
        }
    };

    // Handle adding days to bank
    const handleAddDaysToBank = (data) => {
        router.post(route('slvl.addDaysToBank'), data, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Successfully added ${data.days} ${data.leave_type} leave days to ${data.employee_name}'s bank`);
                // Refresh SLVL data
                router.reload({ only: ['slvls', 'employees'] });
            },
            onError: (errors) => {
                if (errors && typeof errors === 'object') {
                    Object.keys(errors).forEach(key => {
                        toast.error(errors[key]);
                    });
                } else {
                    toast.error('An error occurred while adding days');
                }
            }
        });
    };
    
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="SLVL Management" />
            
            <div className="flex min-h-screen bg-gray-50">
                {/* Include the Sidebar */}
                <Sidebar />
                
                {/* Main Content */}
                <div className="flex-1 p-8 ml-0">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    <Calendar className="inline-block w-7 h-7 mr-2 text-indigo-600" />
                                    SLVL Management
                                </h1>
                                <p className="text-gray-600">
                                    Manage employee sick leave and vacation leave requests
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
                                                View SLVL Requests
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
                                                New SLVL Request
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
                                                    SLVL Bank
                                                </button>
                                            )}
                                        </nav>
                                    </div>
                                </div>
                                
                                {activeTab === 'list' && (
                                    <SLVLList 
                                        slvls={slvlData} 
                                        onStatusUpdate={handleStatusUpdate}
                                        onDelete={handleDeleteSLVL}
                                        userRoles={userRoles}
                                    />
                                )}
                                
                                {activeTab === 'create' && (
                                    <SLVLForm 
                                        employees={employees} 
                                        leaveTypes={leaveTypes}
                                        departments={departments} 
                                        onSubmit={handleSubmitSLVL}
                                    />
                                )}

                                {activeTab === 'bank' && (
                                    <SLVLBankManager 
                                        employees={employees}
                                        onAddDays={handleAddDaysToBank}
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

export default SLVLPage;