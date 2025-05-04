import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

const BackgroundPattern = () => (
    <>
        <div className="fixed inset-0 z-0">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.2 }} />
                        <stop offset="100%" style={{ stopColor: '#4f46e5', stopOpacity: 0.3 }} />
                    </linearGradient>
                    
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" 
                              className="stroke-blue-200/20 dark:stroke-blue-800/20" />
                    </pattern>
                </defs>

                <rect width="100" height="100" fill="url(#grid)" />
                
                <path className="translate-y-1/2" fill="url(#grad1)">
                    <animate attributeName="d" 
                            dur="20s" 
                            repeatCount="indefinite" 
                            values="
                                M 0 50 C 20 40, 40 60, 60 50 S 80 40, 100 50 L 100 100 L 0 100 Z;
                                M 0 50 C 30 45, 50 55, 70 45 S 90 45, 100 50 L 100 100 L 0 100 Z;
                                M 0 50 C 20 40, 40 60, 60 50 S 80 40, 100 50 L 100 100 L 0 100 Z"
                    />
                </path>
                
                <path className="translate-y-1/3" fill="url(#grad1)" opacity="0.7">
                    <animate attributeName="d" 
                            dur="15s" 
                            repeatCount="indefinite" 
                            values="
                                M 0 60 C 30 55, 50 65, 70 55 S 90 55, 100 60 L 100 100 L 0 100 Z;
                                M 0 60 C 20 50, 40 70, 60 60 S 80 50, 100 60 L 100 100 L 0 100 Z;
                                M 0 60 C 30 55, 50 65, 70 55 S 90 55, 100 60 L 100 100 L 0 100 Z"
                    />
                </path>
            </svg>
        </div>
    </>
);

const EmployeeRegister = () => {
    const { data, setData, post, processing, errors, reset, setError } = useForm({
        idno: '',
        email: '',
        password: '',
        password_confirmation: '',
    });
    const [status, setStatus] = useState('');
    const [generalError, setGeneralError] = useState('');

    // Check for flash messages from session
    useEffect(() => {
        const flashStatus = document.querySelector('meta[name="status"]')?.getAttribute('content');
        if (flashStatus) {
            setStatus(flashStatus);
        }
    }, []);

    // Reset error message when form data changes
    useEffect(() => {
        setGeneralError('');
    }, [data]);

    const validateForm = () => {
        let hasErrors = false;
        
        if (!data.idno || data.idno.trim() === '') {
            setError('idno', 'Employee ID is required');
            hasErrors = true;
        }
        
        if (!data.email || data.email.trim() === '') {
            setError('email', 'Email is required');
            hasErrors = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            setError('email', 'Please enter a valid email address');
            hasErrors = true;
        }
        
        if (!data.password || data.password.trim() === '') {
            setError('password', 'Password is required');
            hasErrors = true;
        } else if (data.password.length < 8) {
            setError('password', 'Password must be at least 8 characters');
            hasErrors = true;
        }
        
        if (data.password !== data.password_confirmation) {
            setError('password_confirmation', 'Passwords do not match');
            hasErrors = true;
        }
        
        return !hasErrors;
    };

    const submit = (e) => {
        e.preventDefault();
        
        // Clear any previous status/errors
        setStatus('');
        setGeneralError('');
        
        // Do client-side validation first
        if (!validateForm()) {
            return;
        }
        
        post(route('employee.register'), {
            onSuccess: (page) => {
                reset('password', 'password_confirmation');
                // If there's a session status from redirect
                if (page?.props?.flash?.status) {
                    setStatus(page.props.flash.status);
                } else {
                    setStatus('Registration successful! You can now log in.');
                }
            },
            onError: (errors) => {
                console.log("Registration errors:", errors);
                
                if (errors.error) {
                    setGeneralError(errors.error);
                } else if (errors.idno) {
                    setGeneralError(errors.idno);
                } else if (errors.email) {
                    setGeneralError(errors.email);
                } else if (errors.password) {
                    setGeneralError(errors.password);
                } else {
                    // If we have an unexpected error
                    setGeneralError('An error occurred during registration. Please try again.');
                }
            }
        });
    };

    return (
        <div className="min-h-screen relative bg-gradient-to-br from-gray-50 via-gray-100 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4 py-12 overflow-hidden">
            <Head title="Employee Registration" />
            <BackgroundPattern />
            
            <div className="w-full max-w-md z-10">
                <div className="flex justify-center mb-8">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform hover:scale-105 transition-all duration-300">
                        <span className="text-2xl font-bold">EC</span>
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-30"></div>
                    </div>
                </div>

                <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                            Employee Registration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {status && (
                            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center text-green-600 dark:text-green-400">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                <span className="text-sm">{status}</span>
                            </div>
                        )}

                        {generalError && (
                            <Alert variant="destructive" className="mb-4 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800">
                                <AlertCircle className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />
                                <AlertDescription className="text-red-600 dark:text-red-400">{generalError}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={submit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Employee ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="idno"
                                    value={data.idno}
                                    onChange={(e) => setData('idno', e.target.value)}
                                    className={`w-full px-4 py-2 rounded-lg border ${errors.idno ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-all duration-200`}
                                    autoFocus
                                    required
                                />
                                {errors.idno && (
                                    <p className="mt-1 text-sm text-red-500">{errors.idno}</p>
                                )}
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Enter your employee ID as provided by HR
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className={`w-full px-4 py-2 rounded-lg border ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-all duration-200`}
                                    required
                                />
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                                )}
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Must match the email in your employee record
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className={`w-full px-4 py-2 rounded-lg border ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-all duration-200`}
                                    required
                                    minLength="8"
                                />
                                {errors.password && (
                                    <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                                )}
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Minimum 8 characters
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Confirm Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    name="password_confirmation"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    className={`w-full px-4 py-2 rounded-lg border ${errors.password_confirmation ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-all duration-200`}
                                    required
                                />
                                {errors.password_confirmation && (
                                    <p className="mt-1 text-sm text-red-500">{errors.password_confirmation}</p>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-4">
                                <Link
                                    href={route('login')}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    Already have an account?
                                </Link>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    {processing ? 'Registering...' : 'Register'}
                                </button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default EmployeeRegister;