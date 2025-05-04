import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';

const BackgroundPattern = () => (
    <>
        {/* Abstract wave pattern */}
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

        <div className="fixed inset-0 z-0 overflow-hidden">
            {[...Array(5)].map((_, i) => (
                <div
                    key={i}
                    className="absolute rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-500/10 
                              animate-float backdrop-blur-3xl"
                    style={{
                        width: `${Math.random() * 200 + 100}px`,
                        height: `${Math.random() * 200 + 100}px`,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${i * 1.5}s`,
                        animationDuration: `${Math.random() * 10 + 20}s`
                    }}
                />
            ))}
        </div>
    </>
);

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        remember: false
    });
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        // Check for flash messages from session
        const flashStatus = document.querySelector('meta[name="status"]')?.getAttribute('content');
        if (flashStatus) {
            setStatus(flashStatus);
        }
        
        // Check for success message from session storage (after redirect)
        const loginSuccess = sessionStorage.getItem('loginSuccess');
        if (loginSuccess) {
            setStatus('Successfully logged in!');
            sessionStorage.removeItem('loginSuccess');
        }
    }, []);

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!validateEmail(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        }

        return newErrors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        setStatus('');

        const newErrors = validateForm();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setProcessing(false);
            return;
        }

        // Get CSRF token
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        // Create standard form submission (more reliable than fetch)
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/login';
        form.style.display = 'none';
        
        // Add CSRF token
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = '_token';
        csrfInput.value = token;
        form.appendChild(csrfInput);
        
        // Add email
        const emailInput = document.createElement('input');
        emailInput.type = 'hidden';
        emailInput.name = 'email';
        emailInput.value = formData.email;
        form.appendChild(emailInput);
        
        // Add password
        const passwordInput = document.createElement('input');
        passwordInput.type = 'hidden';
        passwordInput.name = 'password';
        passwordInput.value = formData.password;
        form.appendChild(passwordInput);
        
        // Add remember checkbox if checked
        if (formData.remember) {
            const rememberInput = document.createElement('input');
            rememberInput.type = 'hidden';
            rememberInput.name = 'remember';
            rememberInput.value = '1';
            form.appendChild(rememberInput);
        }
        
        // Submit the form
        document.body.appendChild(form);
        form.submit();
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    return (
        <div className="min-h-screen relative bg-gradient-to-br from-gray-50 via-gray-100 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4 py-12 overflow-hidden">
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
                            Welcome Back
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {status && (
                            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center text-green-600 dark:text-green-400">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                <span className="text-sm">{status}</span>
                            </div>
                        )}

                        {errors.submit && (
                            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center text-red-600 dark:text-red-400">
                                <AlertCircle className="h-5 w-5 mr-2" />
                                <span className="text-sm">{errors.submit}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                    autoComplete="username"
                                    autoFocus
                                />
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                    autoComplete="current-password"
                                />
                                {errors.password && (
                                    <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                                )}
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    name="remember"
                                    checked={formData.remember}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="remember" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                    Remember me
                                </label>
                            </div>

                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => window.location.href = '/forgot-password'}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    Forgot your password?
                                </button>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    {processing ? 'Logging in...' : 'Log in'}
                                </button>
                            </div>
                            
                            <div className="text-center pt-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Don't have an account? </span>
                                <button
                                    type="button"
                                    onClick={() => window.location.href = route('employee.register')}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline ml-1"
                                >
                                    Register as an employee
                                </button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Login;