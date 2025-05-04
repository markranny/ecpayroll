// resources/js/Pages/Overtime/DepartmentManagerForm.jsx
import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

const DepartmentManagerForm = ({ departments, users, existingManagers = [] }) => {
    const [formData, setFormData] = useState({
        department: '',
        manager_id: ''
    });
    
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Filter users for the manager selection based on search term
    useEffect(() => {
        if (!users) return;
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            setFilteredUsers(users.filter(user => 
                user.name.toLowerCase().includes(term) || 
                (user.email && user.email.toLowerCase().includes(term))
            ));
        } else {
            setFilteredUsers(users);
        }
    }, [searchTerm, users]);
    
    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };
    
    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.department || !formData.manager_id) {
            alert('Please select both a department and a manager');
            return;
        }
        
        router.post(route('department-managers.store'), formData, {
            preserveScroll: true,
            onSuccess: () => {
                // Reset form after successful submission
                setFormData({
                    department: '',
                    manager_id: ''
                });
                setSearchTerm('');
            },
            onError: (errors) => {
                if (errors && typeof errors === 'object') {
                    const errorMessages = Object.values(errors).join('\n');
                    alert(`Error: ${errorMessages}`);
                } else {
                    alert('An error occurred while saving department manager assignment');
                }
            }
        });
    };
    
    // Handle department manager deletion
    const handleDelete = (id) => {
        if (confirm('Are you sure you want to remove this department manager assignment?')) {
            router.delete(route('department-managers.destroy', id), {
                preserveScroll: true,
                onSuccess: () => {
                    // Nothing needed here as the page will be refreshed
                },
                onError: () => {
                    alert('Failed to remove department manager assignment');
                }
            });
        }
    };
    
    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Department Manager Assignments</h3>
                <p className="text-sm text-gray-500">Assign managers who will approve overtime requests for each department</p>
            </div>
            
            <div className="p-4 grid grid-cols-1 gap-6">
                {/* Current assignments table */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Current Assignments</h4>
                    
                    <div className="border rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Department
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Manager
                                    </th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {existingManagers.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-4 text-center text-sm text-gray-500">
                                            No department manager assignments found
                                        </td>
                                    </tr>
                                ) : (
                                    existingManagers.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                {item.department}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {item.manager?.name || 'Unknown'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {item.manager?.email || ''}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* Assignment form */}
                <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">New Assignment</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                                Department <span className="text-red-600">*</span>
                            </label>
                            <select
                                id="department"
                                name="department"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                value={formData.department}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select a Department</option>
                                {departments.map((dept, index) => (
                                    <option key={index} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label htmlFor="manager_id" className="block text-sm font-medium text-gray-700 mb-1">
                                Manager <span className="text-red-600">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search for a manager..."
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && filteredUsers.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md max-h-60 overflow-y-auto">
                                        {filteredUsers.map(user => (
                                            <div 
                                                key={user.id} 
                                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => {
                                                    setFormData({
                                                        ...formData,
                                                        manager_id: user.id
                                                    });
                                                    setSearchTerm(user.name);
                                                }}
                                            >
                                                <div className="font-medium">{user.name}</div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <input 
                                type="hidden" 
                                name="manager_id" 
                                value={formData.manager_id} 
                                required
                            />
                            {formData.manager_id && (
                                <div className="mt-2 text-sm text-gray-600">
                                    Selected: {users.find(u => u.id === parseInt(formData.manager_id))?.name || ''}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Assign Manager
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DepartmentManagerForm;