import React, { useState, useEffect, useCallback } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    Search, 
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    Users,
    UserCheck,
    Shield,
    Check,
    Lock
} from 'lucide-react';
import { debounce } from 'lodash';
import axios from 'axios';
import ConfirmModal from '@/Components/ConfirmModal';
import { Checkbox } from '@/components/ui/checkbox';

const RolesAndAccess = () => {
    // Make sure we safely access auth and user
    const { auth } = usePage().props || {};
    const user = auth?.user || {};
    
    const [activeTab, setActiveTab] = useState('roles');
    const [roles, setRoles] = useState([]);
    const [users, setUsers] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [alertMessage, setAlertMessage] = useState(null);
    const [alertType, setAlertType] = useState('default'); // 'default', 'success', 'error'
    
    // Role state
    const [editingRole, setEditingRole] = useState(null);
    const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] });
    const [isCreatingRole, setIsCreatingRole] = useState(false);
    
    // User role assignment state
    const [editingUserRoles, setEditingUserRoles] = useState(null);
    const [isViewingPermissions, setIsViewingPermissions] = useState(false);
    const [viewingPermissionsForRole, setViewingPermissionsForRole] = useState(null);
    
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '',
        confirmVariant: 'destructive',
        onConfirm: () => {}
    });

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // This is just a placeholder - you'll need to implement the API endpoints
            const [rolesResponse, usersResponse, permissionsResponse] = await Promise.all([
                axios.get(`/api/roles?search=${searchTerm}`),
                axios.get(`/api/users?search=${searchTerm}`),
                axios.get('/api/permissions')
            ]);
            
            setRoles(rolesResponse.data.data || []);
            setUsers(usersResponse.data.data || []);
            setPermissions(permissionsResponse.data.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
            showAlert('Error loading data', 'error');
        } finally {
            setLoading(false);
        }
    }, [searchTerm]);

    // Load data on component mount
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Show alert message
    const showAlert = (message, type = 'default') => {
        setAlertMessage(message);
        setAlertType(type);
        setTimeout(() => setAlertMessage(null), 3000);
    };

    // Debounced search
    const debouncedSearch = useCallback(
        debounce((value) => {
            setSearchTerm(value);
        }, 300),
        []
    );

    const handleSearch = (e) => {
        debouncedSearch(e.target.value);
    };

    // ===== ROLE HANDLERS =====
    
    // Handle toggle permission selection
    const handlePermissionToggle = (permissionId) => {
        if (isCreatingRole) {
            setNewRole(prev => {
                const permissions = [...prev.permissions];
                if (permissions.includes(permissionId)) {
                    return { ...prev, permissions: permissions.filter(id => id !== permissionId) };
                } else {
                    return { ...prev, permissions: [...permissions, permissionId] };
                }
            });
        } else if (editingRole) {
            setEditingRole(prev => {
                const permissions = [...prev.permissions];
                if (permissions.includes(permissionId)) {
                    return { ...prev, permissions: permissions.filter(id => id !== permissionId) };
                } else {
                    return { ...prev, permissions: [...permissions, permissionId] };
                }
            });
        }
    };

    // Handle creating new role
    const handleCreateRoleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate
        if (!newRole.name) {
            showAlert('Role name is required', 'error');
            return;
        }
        
        try {
            // This is just a placeholder - you'll need to implement the API endpoint
            const response = await axios.post('/api/roles', newRole);
            
            // Update roles list
            setRoles([...roles, response.data]);
            
            // Reset form
            setNewRole({ name: '', description: '', permissions: [] });
            setIsCreatingRole(false);
            
            showAlert('Role created successfully', 'success');
        } catch (error) {
            console.error('Error creating role:', error);
            showAlert(error.response?.data?.message || 'Error creating role', 'error');
        }
    };

    // Handle updating role
    const handleUpdateRoleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate
        if (!editingRole.name) {
            showAlert('Role name is required', 'error');
            return;
        }
        
        try {
            // This is just a placeholder - you'll need to implement the API endpoint
            const response = await axios.put(`/api/roles/${editingRole.id}`, editingRole);
            
            // Update roles list
            setRoles(roles.map(role => 
                role.id === editingRole.id ? response.data : role
            ));
            
            // Reset editing state
            setEditingRole(null);
            
            showAlert('Role updated successfully', 'success');
        } catch (error) {
            console.error('Error updating role:', error);
            showAlert(error.response?.data?.message || 'Error updating role', 'error');
        }
    };

    // Handle deleting role
    const handleDeleteRole = (role) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Role',
            message: `Are you sure you want to delete the role "${role.name}"? This will remove this role from all users who have it. This action cannot be undone.`,
            confirmText: 'Delete',
            confirmVariant: 'destructive',
            onConfirm: async () => {
                try {
                    // This is just a placeholder - you'll need to implement the API endpoint
                    await axios.delete(`/api/roles/${role.id}`);
                    
                    // Update roles list
                    setRoles(roles.filter(r => r.id !== role.id));
                    
                    // Also update any users who had this role
                    setUsers(users.map(user => ({
                        ...user,
                        roles: user.roles.filter(r => r.id !== role.id)
                    })));
                    
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    showAlert('Role deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting role:', error);
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    showAlert(error.response?.data?.message || 'Error deleting role', 'error');
                }
            }
        });
    };

    // ===== USER ROLE ASSIGNMENT HANDLERS =====
    
    // Handle toggle role assignment
    const handleRoleAssignmentToggle = (roleId) => {
        setEditingUserRoles(prev => {
            const roles = [...prev.roles];
            if (roles.includes(roleId)) {
                return { ...prev, roles: roles.filter(id => id !== roleId) };
            } else {
                return { ...prev, roles: [...roles, roleId] };
            }
        });
    };

    // Handle updating user roles
    const handleUpdateUserRoles = async (e) => {
        e.preventDefault();
        
        try {
            // This is just a placeholder - you'll need to implement the API endpoint
            const response = await axios.put(`/api/users/${editingUserRoles.id}/roles`, {
                roles: editingUserRoles.roles
            });
            
            // Update users list
            setUsers(users.map(user => 
                user.id === editingUserRoles.id ? response.data : user
            ));
            
            // Reset editing state
            setEditingUserRoles(null);
            
            showAlert('User roles updated successfully', 'success');
        } catch (error) {
            console.error('Error updating user roles:', error);
            showAlert(error.response?.data?.message || 'Error updating user roles', 'error');
        }
    };

    // Group permissions by category
    const getPermissionsByCategory = () => {
        const categories = {};
        
        permissions.forEach(permission => {
            const category = permission.category || 'General';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(permission);
        });
        
        return categories;
    };

    // Get permission name by ID
    const getPermissionName = (permissionId) => {
        const permission = permissions.find(p => p.id === permissionId);
        return permission ? permission.name : 'Unknown Permission';
    };

    // Get role name by ID
    const getRoleName = (roleId) => {
        const role = roles.find(r => r.id === roleId);
        return role ? role.name : 'Unknown Role';
    };

    // Check if a permission is included in a role
    const isPermissionInRole = (permissionId, role) => {
        return role.permissions.includes(permissionId);
    };

    // Format user name
    const formatUserName = (user) => {
        return `${user.name} ${user.surname || ''}`.trim();
    };

    // View role permissions
    const handleViewPermissions = (role) => {
        setViewingPermissionsForRole(role);
        setIsViewingPermissions(true);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Roles and Access Management" />
            <div className="flex min-h-screen bg-gray-50/50">
                <Sidebar />
                <div className="flex-1 p-8">
                    <div className="max-w-6xl mx-auto">
                        {alertMessage && (
                            <Alert className={`mb-4 ${alertType === 'success' ? 'bg-green-50 border-green-200' : alertType === 'error' ? 'bg-red-50 border-red-200' : ''}`}>
                                <AlertDescription className={alertType === 'success' ? 'text-green-700' : alertType === 'error' ? 'text-red-700' : ''}>{alertMessage}</AlertDescription>
                            </Alert>
                        )}

                        {/* Header Section */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    Roles and Access Management
                                </h1>
                                <p className="text-gray-600">
                                    Manage user roles and permissions for system access.
                                </p>
                            </div>
                        </div>

                        {/* Add the rest of your component here */}
                        {/* This follows the same structure as in the original code */}
                    </div>
                </div>
            </div>

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({...confirmModal, isOpen: false})}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                confirmVariant={confirmModal.confirmVariant}
                onConfirm={confirmModal.onConfirm}
            />
        </AuthenticatedLayout>
    );
};

export default RolesAndAccess;