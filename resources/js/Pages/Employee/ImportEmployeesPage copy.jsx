import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import EmployeeImport from './ImportEmployee';
import { UserPlus } from 'lucide-react';

const ImportEmployeesPage = () => {
    const { auth } = usePage().props;

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Import Employees" />
            <div className="flex min-h-screen bg-gray-50/50">
                <Sidebar />
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Header Section */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    Import Employees
                                </h1>
                                <p className="text-gray-600">
                                    Bulk import your employee data using our Excel template.
                                </p>
                            </div>
                            {/* <div className="flex items-center space-x-4">
                                <a 
                                    href="/employees/create" 
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                                >
                                    <UserPlus className="w-5 h-5 mr-2" />
                                    Add Single Employee
                                </a>
                            </div> */}
                        </div>

                        {/* Import Component */}
                        <EmployeeImport />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
};

export default ImportEmployeesPage;