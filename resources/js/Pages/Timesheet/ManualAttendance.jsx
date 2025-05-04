// resources/js/Pages/Timesheet/ManualAttendance.jsx
import React, { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Calendar, Clock, User, Save, AlertTriangle } from 'lucide-react';

const ManualAttendance = ({ auth, employees = [] }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { errors } = usePage().props;
    
    // Form state
    const [formData, setFormData] = useState({
        employee_id: '',
        attendance_date: new Date().toISOString().split('T')[0],
        time_in: '08:00',
        time_out: '17:00',
        remarks: ''
    });
    
    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };
    
    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.employee_id) {
            toast.error('Please select an employee');
            return;
        }
        
        if (!formData.attendance_date) {
            toast.error('Please select a date');
            return;
        }
        
        if (!formData.time_in || !formData.time_out) {
            toast.error('Please enter both time in and time out');
            return;
        }
        
        // Check if time_out is after time_in
        const timeIn = formData.time_in.split(':').map(Number);
        const timeOut = formData.time_out.split(':').map(Number);
        
        if (timeIn[0] > timeOut[0] || (timeIn[0] === timeOut[0] && timeIn[1] >= timeOut[1])) {
            toast.error('Time out must be after time in');
            return;
        }
        
        setIsSubmitting(true);
        
        // Use axios directly for debugging purposes
        axios.post(route('attendance.manual.store'), formData)
            .then(response => {
                setIsSubmitting(false);
                if (response.data.success) {
                    toast.success(response.data.message || 'Manual attendance entry saved successfully');
                    
                    // Reset form (keep date and times, but clear employee and remarks)
                    setFormData({
                        ...formData,
                        employee_id: '',
                        remarks: ''
                    });
                } else {
                    toast.error(response.data.message || 'Something went wrong');
                }
            })
            .catch(error => {
                setIsSubmitting(false);
                console.error('Error details:', error.response?.data);
                
                // Handle validation errors
                if (error.response?.status === 422 && error.response?.data?.errors) {
                    Object.values(error.response.data.errors).forEach(errorMessages => {
                        errorMessages.forEach(message => {
                            toast.error(message);
                        });
                    });
                } else {
                    toast.error(error.response?.data?.message || 'Failed to save attendance');
                }
            });
    };
    
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Manual Attendance Entry" />
            <div className="flex min-h-screen bg-gray-50/50">
                <Sidebar />
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6 bg-white border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-800 mb-6">Manual Attendance Entry</h2>
                                
                                {/* Debug Info - Remove in production */}
                                {process.env.NODE_ENV !== 'production' && errors && Object.keys(errors).length > 0 && (
                                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
                                        <h3 className="text-sm font-medium text-red-800">Validation Errors:</h3>
                                        <ul className="mt-2 text-sm text-red-700">
                                            {Object.entries(errors).map(([key, messages]) => (
                                                <li key={key}><strong>{key}:</strong> {messages}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Form Section */}
                                    <div className="md:col-span-2">
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <div>
                                                <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Employee
                                                </label>
                                                <div className="relative rounded-md shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <User className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                    <select
                                                        id="employee_id"
                                                        name="employee_id"
                                                        className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                        value={formData.employee_id}
                                                        onChange={handleChange}
                                                        required
                                                    >
                                                        <option value="">Select Employee</option>
                                                        {employees.map(emp => (
                                                            <option key={emp.id} value={emp.id}>
                                                                {emp.Fname} {emp.Lname} ({emp.idno}) - {emp.Department}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label htmlFor="attendance_date" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Date
                                                </label>
                                                <div className="relative rounded-md shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Calendar className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="date"
                                                        id="attendance_date"
                                                        name="attendance_date"
                                                        className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                        value={formData.attendance_date}
                                                        onChange={handleChange}
                                                        required
                                                        max={new Date().toISOString().split('T')[0]} // Can't select future dates
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="time_in" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Time In
                                                    </label>
                                                    <div className="relative rounded-md shadow-sm">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Clock className="h-5 w-5 text-gray-400" />
                                                        </div>
                                                        <input
                                                            type="time"
                                                            id="time_in"
                                                            name="time_in"
                                                            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                            value={formData.time_in}
                                                            onChange={handleChange}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <label htmlFor="time_out" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Time Out
                                                    </label>
                                                    <div className="relative rounded-md shadow-sm">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Clock className="h-5 w-5 text-gray-400" />
                                                        </div>
                                                        <input
                                                            type="time"
                                                            id="time_out"
                                                            name="time_out"
                                                            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                            value={formData.time_out}
                                                            onChange={handleChange}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Remarks (Optional)
                                                </label>
                                                <textarea
                                                    id="remarks"
                                                    name="remarks"
                                                    rows="3"
                                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                    placeholder="Add any notes or remarks here..."
                                                    value={formData.remarks}
                                                    onChange={handleChange}
                                                ></textarea>
                                            </div>
                                            
                                            <div className="flex justify-end">
                                                <button
                                                    type="submit"
                                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? (
                                                        <>
                                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="-ml-1 mr-2 h-5 w-5" />
                                                            Save Attendance
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                    
                                    {/* Instructions Section */}
                                    <div className="bg-gray-50 p-6 rounded-lg">
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Instructions</h3>
                                        
                                        <div className="space-y-4 text-sm text-gray-600">
                                            <p>
                                                Use this form to manually enter attendance records for employees when biometric data is not available.
                                            </p>
                                            
                                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                                <div className="flex">
                                                    <div className="flex-shrink-0">
                                                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                                                    </div>
                                                    <div className="ml-3">
                                                        <p className="text-sm text-yellow-700">
                                                            This should only be used for exceptional cases where the biometric system was not available or malfunctioning.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <h4 className="font-medium text-gray-700">Required Fields:</h4>
                                                <ul className="list-disc list-inside mt-2 space-y-1">
                                                    <li>Employee</li>
                                                    <li>Date</li>
                                                    <li>Time In</li>
                                                    <li>Time Out</li>
                                                </ul>
                                            </div>
                                            
                                            <div>
                                                <h4 className="font-medium text-gray-700">Notes:</h4>
                                                <ul className="list-disc list-inside mt-2 space-y-1">
                                                    <li>Time format is 24-hour (00:00 - 23:59)</li>
                                                    <li>Time out must be after time in</li>
                                                    <li>For overnight shifts, enter the next day's date and times separately</li>
                                                    <li>All manual entries are marked and can be identified in reports</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <ToastContainer />
        </AuthenticatedLayout>
    );
};

export default ManualAttendance;