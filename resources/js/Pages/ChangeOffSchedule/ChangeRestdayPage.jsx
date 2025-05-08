import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import ChangeRestdayList from './ChangeRestdayList';
import ChangeRestdayForm from './ChangeRestdayForm';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { RefreshCw, Plus, ListFilter } from 'lucide-react';

const ChangeRestdayPage = () => {
    const { props } = usePage();
    const { auth, flash = {}, userRoles = {}, changeOffs = [], employees = [], departments = [] } = props;
    
    // State to manage component data
    const [changeOffData, setChangeOffData] = useState(changeOffs);
    const [activeTab, setActiveTab] = useState('create');
    const [processing, setProcessing] = useState(false);
    
    // Display flash messages
    useEffect(() => {
        if (flash && flash.message) {
            toast.success(flash.message);
        }
        if (flash && flash.error) {
            toast.error(flash.error);
        }
    }, [flash]);
    
    // Handle form submission
    const handleSubmitChangeOff = (formData) => {
        router.post(route('change-off-schedules.store'), formData, {
            onSuccess: (page) => {
                // Update change offs list with the new data from the response
                if (page.props.changeOffs) {
                    setChangeOffData(page.props.changeOffs);
                }
                toast.success('Change rest day requests created successfully');
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
        
        router.post(route('change-off-schedules.updateStatus', id), data, {
            preserveScroll: true,
            onSuccess: (page) => {
                // Update change offs list
                if (page.props.changeOffs) {
                    setChangeOffData(page.props.changeOffs);
                }
                toast.success('Change rest day status updated successfully');
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
    const handleDeleteChangeOff = (id) => {
        if (confirm('Are you sure you want to delete this change rest day request?')) {
            router.delete(route('change-off-schedules.destroy', id), {
                preserveScroll: true,
                onSuccess: (page) => {
                    // Update change offs list
                    if (page.props.changeOffs) {
                        setChangeOffData(page.props.changeOffs);
                    } else {
                        // Remove the deleted item from the current state
                        setChangeOffData(changeOffData.filter(co => co.id !== id));
                    }
                    toast.success('Change rest day request deleted successfully');
                },
                onError: () => toast.error('Failed to delete change rest day request')
            });
        }
    };
    
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Change Rest Day Management" />
            
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
                                    Change Rest Day Management
                                </h1>
                                <p className="text-gray-600">
                                    Manage employee rest day change requests
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
                                                View Change Rest Days
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
                                                New Change Rest Day
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                                
                                {activeTab === 'list' ? (
                                    <ChangeRestdayList 
                                        changeOffs={changeOffData} 
                                        onStatusUpdate={handleStatusUpdate}
                                        onDelete={handleDeleteChangeOff}
                                        userRoles={userRoles}
                                    />
                                ) : (
                                    <ChangeRestdayForm 
                                        employees={employees} 
                                        departments={departments} 
                                        onSubmit={handleSubmitChangeOff}
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

export default ChangeRestdayPage;