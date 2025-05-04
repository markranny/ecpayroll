// resources/js/Pages/Roles/Create.jsx
import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';

const Create = ({ auth, errors }) => {
    const [formData, setFormData] = useState({
        name: '',
        slug: ''
    });
    
    // Handle form data change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Auto-generate slug from name if name field is being updated
        if (name === 'name') {
            setFormData(prev => ({
                ...prev,
                slug: value.toLowerCase().replace(/\s+/g, '-')
            }));
        }
    };
    
    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.slug) {
            toast.error('Please fill in all fields');
            return;
        }
        
        router.post(route('roles.store'), formData, {
            onError: (errors) => {
                if (errors.name) {
                    toast.error(errors.name);
                }
                if (errors.slug) {
                    toast.error(errors.slug);
                }
            }
        });
    };
    
    return (
        <Layout>
            <Head title="Create New Role" />
            
            <div className="flex min-h-screen bg-gray-50/50">
                {/* Sidebar */}
                <div className="fixed h-screen">
                    <Sidebar />
                </div>
                
                {/* Main Content */}
                <div className="flex-1 p-8 ml-64">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    Create New Role
                                </h1>
                                <p className="text-gray-600">
                                    Add a new user role to the system
                                </p>
                            </div>
                        </div>
                        
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <div className="p-6">
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-4">
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                            Role Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            placeholder="e.g., Super Admin, HR Manager, Finance Officer"
                                            required
                                        />
                                        {errors.name && (
                                            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                                        )}
                                    </div>
                                    
                                    <div className="mb-6">
                                        <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                                            Role Slug <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="slug"
                                            name="slug"
                                            value={formData.slug}
                                            onChange={handleChange}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            placeholder="e.g., superadmin, hr-manager, finance-officer"
                                            required
                                        />
                                        {errors.slug && (
                                            <p className="mt-1 text-sm text-red-600">{errors.slug}</p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-500">
                                            This is the identifier used in the system. Auto-generated from the role name.
                                        </p>
                                    </div>
                                    
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => router.get(route('roles.index'))}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Create Role
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <ToastContainer position="top-right" autoClose={3000} />
        </Layout>
    );
};

export default Create;