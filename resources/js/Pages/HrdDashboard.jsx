import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function HrdDashboard({ auth }) {
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="HRD Dashboard" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <h2 className="text-2xl font-semibold mb-4">HRD Dashboard</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-blue-100 p-4 rounded-lg">
                                    <h3 className="font-bold">Total Employees</h3>
                                    <p className="text-2xl">45</p>
                                </div>
                                <div className="bg-green-100 p-4 rounded-lg">
                                    <h3 className="font-bold">New Applications</h3>
                                    <p className="text-2xl">12</p>
                                </div>
                                <div className="bg-yellow-100 p-4 rounded-lg">
                                    <h3 className="font-bold">Pending Reviews</h3>
                                    <p className="text-2xl">5</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}