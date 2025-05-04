import React, { useState, useEffect, useCallback } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import BenefitsTable from './BenefitsTable';
import BenefitsFilters from './BenefitsFilters';
import BenefitsStatusCards from './BenefitsStatusCards';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    Search, 
    Calendar,
    FileText,
    Download,
    Upload,
    Plus,
    Save,
    Settings,
    AlertCircle
} from 'lucide-react';
import ConfirmModal from '@/Components/ConfirmModal';
import axios from 'axios';
import { debounce } from 'lodash';
import * as XLSX from 'xlsx';

const BenefitsPage = ({ employees: initialEmployees, cutoff: initialCutoff, month: initialMonth, year: initialYear, search: initialSearch, status, dateRange, flash }) => {
    // Make sure we safely access auth and user
    const { auth } = usePage().props || {};
    const user = auth?.user || {};
    
    const [employees, setEmployees] = useState(initialEmployees?.data || []);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        cutoff: initialCutoff || '1st',
        month: initialMonth || new Date().getMonth() + 1,
        year: initialYear || new Date().getFullYear(),
        search: initialSearch || '',
    });
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '',
        confirmVariant: 'destructive',
        onConfirm: () => {}
    });
    const [alertMessage, setAlertMessage] = useState(flash?.message || null);
    const [pagination, setPagination] = useState({
        currentPage: initialEmployees?.current_page || 1,
        perPage: initialEmployees?.per_page || 50,
        total: initialEmployees?.total || 0,
    });

    // Update pagination when initialEmployees changes
    useEffect(() => {
        if (initialEmployees) {
            setPagination({
                currentPage: initialEmployees.current_page || 1,
                perPage: initialEmployees.per_page || 50,
                total: initialEmployees.total || 0,
            });
            setEmployees(initialEmployees.data || []);
        }
    }, [initialEmployees]);

    // Handle filter changes
    const handleFilterChange = (name, value) => {
        setFilters(prev => {
            const newFilters = {
                ...prev,
                [name]: value
            };
            
            // Reset page to 1 when filters change
            if (name !== 'page') {
                return {
                    ...newFilters,
                    page: 1
                };
            }
            
            return newFilters;
        });
    };

    // Debounced search to prevent too many requests
    const debouncedSearch = useCallback(
        debounce((value) => {
            handleFilterChange('search', value);
        }, 300), // Reduced debounce time for better responsiveness
        []
    );

    // Apply filters and reload data
    const applyFilters = () => {
        setLoading(true);
        router.visit(
            `/benefits?cutoff=${filters.cutoff}&month=${filters.month}&year=${filters.year}&search=${filters.search}`,
            {
                preserveState: true,
                preserveScroll: true,
                only: ['employees', 'status', 'dateRange'],
                onFinish: () => setLoading(false)
            }
        );
    };

    // Watch for filter changes and apply them
    useEffect(() => {
        applyFilters();
    }, [filters.cutoff, filters.month, filters.year, filters.search]);

    // Handle table cell update
    const handleCellUpdate = async (benefitId, field, value) => {
        try {
            const response = await axios.patch(`/benefits/${benefitId}/field`, { 
                field: field,
                value: value
            });
            
            // Update the employees state to reflect the change
            setEmployees(currentEmployees => 
                currentEmployees.map(employee => {
                    if (employee.benefits && employee.benefits.length > 0 && employee.benefits[0].id === benefitId) {
                        const updatedBenefits = [...employee.benefits];
                        updatedBenefits[0] = response.data;
                        return { ...employee, benefits: updatedBenefits };
                    }
                    return employee;
                })
            );
            
            // Update status count if needed - don't show message to avoid UI clutter during editing
            // setAlertMessage('Benefit updated successfully');
            // setTimeout(() => setAlertMessage(null), 3000);
        } catch (error) {
            console.error('Error updating benefit:', error);
            setAlertMessage(error.response?.data?.message || 'Error updating benefit');
            setTimeout(() => setAlertMessage(null), 3000);
        }
    };

    // Modified createBenefit method to better handle async creation
const createBenefit = async (employeeId) => {
    try {
        setLoading(true);
        const response = await axios.post('/benefits/create-from-default', {
            employee_id: employeeId,
            cutoff: filters.cutoff,
            date: new Date(`${filters.year}-${filters.month}-${filters.cutoff === '1st' ? 15 : 28}`).toISOString().split('T')[0]
        });
        
        // Update the employees state to add the new benefit
        setEmployees(currentEmployees => 
            currentEmployees.map(employee => {
                if (employee.id === employeeId) {
                    return { 
                        ...employee, 
                        benefits: [response.data, ...(employee.benefits || [])] 
                    };
                }
                return employee;
            })
        );
        
        // Optional user notification - kept quiet for better UX when just editing cells
        //setAlertMessage('New benefit created from default values');
        //setTimeout(() => setAlertMessage(null), 3000);
        return response.data;
    } catch (error) {
        console.error('Error creating benefit:', error);
        setAlertMessage(error.response?.data?.message || 'Error creating benefit');
        setTimeout(() => setAlertMessage(null), 3000);
        return null;
    } finally {
        setLoading(false);
    }
};

    // Post a single benefit
    const postBenefit = async (benefitId) => {
        try {
            const response = await axios.post(`/benefits/${benefitId}/post`);
            
            // Update the employees state to reflect the posted benefit
            setEmployees(currentEmployees => 
                currentEmployees.map(employee => {
                    if (employee.benefits && employee.benefits.length > 0 && employee.benefits[0].id === benefitId) {
                        const updatedBenefits = [...employee.benefits];
                        updatedBenefits[0] = response.data;
                        return { ...employee, benefits: updatedBenefits };
                    }
                    return employee;
                })
            );
            
            // Also update the status counts
            applyFilters();
            
            setAlertMessage('Benefit posted successfully');
            setTimeout(() => setAlertMessage(null), 3000);
        } catch (error) {
            console.error('Error posting benefit:', error);
            setAlertMessage(error.response?.data?.message || 'Error posting benefit');
            setTimeout(() => setAlertMessage(null), 3000);
        }
    };

    // Bulk post benefits
    const bulkPostBenefits = async (benefitIds) => {
        if (!benefitIds || benefitIds.length === 0) return;
        
        try {
            setLoading(true);
            
            const response = await axios.post('/benefits/bulk-post', {
                benefit_ids: benefitIds
            });
            
            // Refresh data instead of manual state update
            applyFilters();
            
            setAlertMessage(`Successfully posted ${benefitIds.length} benefits`);
            setTimeout(() => setAlertMessage(null), 3000);
        } catch (error) {
            console.error('Error posting benefits in bulk:', error);
            setAlertMessage(error.response?.data?.message || 'Error posting benefits');
            setTimeout(() => setAlertMessage(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    // Bulk set default benefits
    const bulkSetDefaultBenefits = async (benefitIds) => {
        if (!benefitIds || benefitIds.length === 0) return;
        
        try {
            setLoading(true);
            
            const response = await axios.post('/benefits/bulk-set-default', {
                benefit_ids: benefitIds
            });
            
            // Refresh data
            applyFilters();
            
            setAlertMessage(`Successfully set ${benefitIds.length} benefits as default`);
            setTimeout(() => setAlertMessage(null), 3000);
        } catch (error) {
            console.error('Error setting default benefits in bulk:', error);
            setAlertMessage(error.response?.data?.message || 'Error setting default benefits');
            setTimeout(() => setAlertMessage(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    // Post all benefits
    const postAllBenefits = () => {
        // We're removing the condition that checks if there are pending benefits
        // This ensures the button works even if the status is not properly loaded
        
        setConfirmModal({
            isOpen: true,
            title: 'Post All Benefits',
            message: `Are you sure you want to post all benefits for the ${filters.cutoff} cutoff of ${filters.month}/${filters.year}? This action cannot be undone.`,
            confirmText: 'Post All',
            confirmVariant: 'destructive',
            onConfirm: async () => {
                try {
                    setLoading(true);
                    
                    const response = await axios.post('/benefits/post-all', {
                        cutoff: filters.cutoff,
                        start_date: dateRange.start,
                        end_date: dateRange.end
                    });
                    
                    // Reload data after posting
                    applyFilters();
                    
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    setAlertMessage(`${response.data.updated_count} benefits posted successfully`);
                    setTimeout(() => setAlertMessage(null), 3000);
                } catch (error) {
                    console.error('Error posting all benefits:', error);
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    setAlertMessage(error.response?.data?.message || 'Error posting benefits');
                    setTimeout(() => setAlertMessage(null), 3000);
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    // Create benefits for all active employees
    const createBulkBenefits = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Create Benefits for All Employees',
            message: `This will create benefit entries for all active employees for the ${filters.cutoff} cutoff of ${filters.month}/${filters.year} using their default values.`,
            confirmText: 'Create Benefits',
            confirmVariant: 'default',
            onConfirm: async () => {
                try {
                    setLoading(true);
                    
                    const response = await axios.post('/benefits/bulk-create', {
                        cutoff: filters.cutoff,
                        date: new Date(`${filters.year}-${filters.month}-${filters.cutoff === '1st' ? 15 : 28}`).toISOString().split('T')[0]
                    });
                    
                    // Reload data after creating
                    applyFilters();
                    
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    setAlertMessage(`${response.data.created_count} benefit entries created successfully`);
                    setTimeout(() => setAlertMessage(null), 3000);
                } catch (error) {
                    console.error('Error creating bulk benefits:', error);
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    setAlertMessage(error.response?.data?.message || 'Error creating benefits');
                    setTimeout(() => setAlertMessage(null), 3000);
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    // Set a benefit as default
    const setDefaultBenefit = async (benefitId) => {
        try {
            const response = await axios.post(`/benefits/${benefitId}/set-default`);
            
            // Update employees state to reflect the change
            setEmployees(currentEmployees => 
                currentEmployees.map(employee => {
                    if (employee.benefits && employee.benefits.length > 0 && employee.benefits[0].id === benefitId) {
                        const updatedBenefits = [...employee.benefits];
                        updatedBenefits[0] = response.data;
                        return { ...employee, benefits: updatedBenefits };
                    }
                    return employee;
                })
            );
            
            setAlertMessage('Default benefit set successfully');
            setTimeout(() => setAlertMessage(null), 3000);
        } catch (error) {
            console.error('Error setting default benefit:', error);
            setAlertMessage(error.response?.data?.message || 'Error setting default benefit');
            setTimeout(() => setAlertMessage(null), 3000);
        }
    };

    // Handle pagination
    const handlePageChange = (page) => {
        setLoading(true);
        router.visit(
            `/benefits?cutoff=${filters.cutoff}&month=${filters.month}&year=${filters.year}&search=${filters.search}&page=${page}`,
            {
                preserveState: true,
                preserveScroll: true,
                only: ['employees'],
                onFinish: () => setLoading(false)
            }
        );
    };

    // Export to Excel
    const exportToExcel = (selectedEmployees) => {
        if (!selectedEmployees || selectedEmployees.length === 0) return;
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        
        // Create data for export
        const exportData = selectedEmployees.map(employee => {
            const benefit = employee.benefits && employee.benefits.length > 0 ? employee.benefits[0] : null;
            
            // Create a record for each employee with their benefit data
            const record = {
                'Employee ID': employee.idno || '',
                'Employee Name': `${employee.Lname}, ${employee.Fname} ${employee.MName || ''}`.trim(),
                'Department': employee.Department || ''
            };
            
            // Add benefit fields
            const benefitFields = [
                'advances', 'charges', 'uniform', 'mf_shares', 'mf_loan',
                'sss_loan', 'hmdf_loan', 'hmdf_prem', 'sss_prem', 'philhealth'
            ];
            
            benefitFields.forEach(field => {
                record[field.replace('_', ' ').toUpperCase()] = benefit ? parseFloat(benefit[field] || 0).toFixed(2) : '0.00';
            });
            
            return record;
        });
        
        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Set column widths
        const columnWidths = [
            { wch: 15 }, // Employee ID
            { wch: 30 }, // Employee Name
            { wch: 20 }, // Department
        ];
        
        // Add column widths for benefit fields
        for (let i = 0; i < 10; i++) {
            columnWidths.push({ wch: 15 });
        }
        
        ws['!cols'] = columnWidths;
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, "Benefits");
        
        // Create date string for filename
        const date = new Date();
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        // Generate Excel file and trigger download
        XLSX.writeFile(wb, `employee_benefits_${dateString}.xlsx`);
    };

    // Generate months
    const months = [
        { id: 1, name: 'January' },
        { id: 2, name: 'February' },
        { id: 3, name: 'March' },
        { id: 4, name: 'April' },
        { id: 5, name: 'May' },
        { id: 6, name: 'June' },
        { id: 7, name: 'July' },
        { id: 8, name: 'August' },
        { id: 9, name: 'September' },
        { id: 10, name: 'October' },
        { id: 11, name: 'November' },
        { id: 12, name: 'December' }
    ];

    // Generate years (current year ± 2 years)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    // Navigate to defaults page
    const navigateToDefaults = () => {
        router.visit('/employee-defaults');
    };

    return (
        <AuthenticatedLayout user={user}>
            <Head title="Employee Benefits" />
            <div className="flex min-h-screen bg-gray-50/50">
                <Sidebar />
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        {alertMessage && (
                            <Alert className="mb-4">
                                <AlertDescription>{alertMessage}</AlertDescription>
                            </Alert>
                        )}

                        {/* Header Section */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    Employee Benefits Management
                                </h1>
                                <p className="text-gray-600">
                                    Manage employee benefits, loans, and deductions.
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <Button
                                    onClick={createBulkBenefits}
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                                >
                                    <Plus className="w-5 h-5 mr-2" />
                                    Create All Benefits
                                </Button>
                                <Button
                                    onClick={postAllBenefits}
                                    className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors duration-200 flex items-center"
                                    disabled={status?.pendingCount === 0}
                                >
                                    <Save className="w-5 h-5 mr-2" />
                                    Post All Benefits
                                </Button>
                                <Button
                                    onClick={navigateToDefaults}
                                    className="px-5 py-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors duration-200 flex items-center"
                                >
                                    <Settings className="w-5 h-5 mr-2" />
                                    Manage Defaults
                                </Button>
                            </div>
                        </div>
                        
                        {/* Status Cards */}
                        <BenefitsStatusCards 
                            total={status?.allCount || 0}
                            posted={status?.postedCount || 0}
                            pending={status?.pendingCount || 0}
                        />

                        {/* Filters */}
                        <BenefitsFilters 
                            filters={filters}
                            months={months}
                            years={years}
                            onFilterChange={handleFilterChange}
                            onSearch={debouncedSearch}
                        />

                        {/* Benefits Table */}
                        <div className="bg-white rounded-lg shadow mt-6">
                            <BenefitsTable
                                employees={employees}
                                loading={loading}
                                onCellUpdate={handleCellUpdate}
                                onCreateBenefit={createBenefit}
                                onPostBenefit={postBenefit}
                                onSetDefault={setDefaultBenefit}
                                onBulkPostBenefits={bulkPostBenefits}
                                onBulkSetDefaultBenefits={bulkSetDefaultBenefits}
                                onExportToExcel={exportToExcel}
                                pagination={{
                                    ...pagination,
                                    onPageChange: handlePageChange,
                                    links: initialEmployees?.links || []
                                }}
                            />
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
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
};

export default BenefitsPage;