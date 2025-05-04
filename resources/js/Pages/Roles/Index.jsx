// resources/js/Pages/Roles/Index.jsx
import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';

const Index = ({ users, roles, auth, flash }) => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedRole, setSelectedRole] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredUsers, setFilteredUsers] = useState(users);
    
    // Display flash messages
    useEffect(() => {
        if (flash && flash.message) {
            toast.success(flash.message);
        }
        if (flash && flash.error) {
            toast.error(flash.error);
        }
        if (flash && flash.info) {
            toast.info(flash.info);
        }
    }, [flash]);
    
    // Filter users when search term changes
    useEffect(() => {
        if (searchTerm) {
            const filtered = users.filter(user => 
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                user.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredUsers(filtered);
        } else {
            setFilteredUsers(users);
        }
    }, [searchTerm, users]);
    
    // Handle assign role
    const handleAssignRole = () => {
        if (!selectedUser || !selectedRole) {
            toast.error('Please select both user and role');
            return;
        }
        
        router.post(route('roles.assign'), {
            user_id: selectedUser,
            role_id: selectedRole
        }, {
            onSuccess: () => {
                setSelectedUser(null);
                setSelectedRole('');
            }
        });
    };
    
    // Handle role removal
    const handleRemoveRole = (userId, roleId) => {
        if (confirm('Are you sure you want to remove this role?')) {
            router.post(route('roles.remove'), {
                user_id: userId,
                role_id: roleId
            });
        }
    };
    
    return (
        <Layout>
            <Head title="User Role Management" />
            
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
                                    User Role Management
                                </h1>
                                <p className="text-gray-600">
                                    Assign or remove roles from users
                                </p>
                            </div>
                            
                            <Link
                                href={route('roles.create')}
                                className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                            >
                                Create New Role
                            </Link>
                        </div>
                        
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <div className="p-6">
                                {/* Role assignment form */}
                                <div className="mb-8 bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold mb-4">Assign Role to User</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Select User
                                            </label>
                                            <select
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                value={selectedUser || ''}
                                                onChange={(e) => setSelectedUser(e.target.value)}
                                            >
                                                <option value="">-- Select User --</option>
                                                {users.map(user => (
                                                    <option key={user.id} value={user.id}>
                                                        {user.name} ({user.email})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Select Role
                                            </label>
                                            <select
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                value={selectedRole || ''}
                                                onChange={(e) => setSelectedRole(e.target.value)}
                                            >
                                                <option value="">-- Select Role --</option>
                                                {roles.map(role => (
                                                    <option key={role.id} value={role.id}>
                                                        {role.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="flex items-end">
                                            <button
                                                onClick={handleAssignRole}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                Assign Role
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Users table */}
                                <div>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            className="w-full md:w-1/3 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Name
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Email
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Assigned Roles
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {filteredUsers.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                                                            No users found matching your search
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredUsers.map(user => (
                                                        <tr key={user.id}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {user.name}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {user.email}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                <div className="flex flex-wrap gap-2">
                                                                    {user.roles && user.roles.length > 0 ? (
                                                                        user.roles.map(role => (
                                                                            <span 
                                                                                key={role.id}
                                                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                                                                            >
                                                                                {role.name}
                                                                            </span>
                                                                        ))
                                                                    ) : (
                                                                        <span className="text-gray-400">No roles assigned</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                {user.roles && user.roles.length > 0 ? (
                                                                    user.roles.map(role => (
                                                                        <button
                                                                            key={role.id}
                                                                            onClick={() => handleRemoveRole(user.id, role.id)}
                                                                            className="text-red-600 hover:text-red-900 ml-2"
                                                                        >
                                                                            Remove {role.name}
                                                                        </button>
                                                                    ))
                                                                ) : null}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <ToastContainer position="top-right" autoClose={3000} />
        </Layout>
    );
};

export default Index;