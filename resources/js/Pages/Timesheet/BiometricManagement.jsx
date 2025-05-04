import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
    PlusCircle, 
    Edit, 
    Trash2, 
    ServerCrash, 
    RefreshCw, 
    CheckCircle, 
    XCircle, 
    Search, 
    Loader 
} from 'lucide-react';

const BiometricManagement = ({ auth, devices = [] }) => {
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentDevice, setCurrentDevice] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showTestModal, setShowTestModal] = useState(false);
    const [deviceToDelete, setDeviceToDelete] = useState(null);
    const [testResult, setTestResult] = useState(null);
    const [isTestingConnection, setIsTestingConnection] = useState(false);

    // New states for device discovery
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState([]);
    const [scanProgress, setScanProgress] = useState(0);
  

    // New state for fetch logs modal
    const [showFetchLogsModal, setShowFetchLogsModal] = useState(false);
    const [fetchLogsDevice, setFetchLogsDevice] = useState(null);
    const [fetchLogsData, setFetchLogsData] = useState({
        device_id: null,
        start_date: '',
        end_date: ''
    });

    // Form data state
    const [formData, setFormData] = useState({
        name: '',
        ip_address: '',
        port: '4370',
        location: '',
        model: '',
        serial_number: '',
        status: 'active'
    });

    // Test connection form data
    const [testConnectionData, setTestConnectionData] = useState({
        ip_address: '',
        port: '4370'
    });

    // Helper function to dynamically set class names for input fields
    const getFieldClassName = (fieldName) => {
        const baseClasses = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm";
        
        const requiredFields = ['name', 'ip_address', 'port', 'location'];
        const isRequired = requiredFields.includes(fieldName);
        const isEmpty = !formData[fieldName];
        
        if (isRequired && isEmpty) {
            return `${baseClasses} border-red-300 bg-red-50`;
        }
        
        return baseClasses;
    };

    // Handle input changes for date range
    const handleFetchLogsChange = (e) => {
        const { name, value } = e.target;
        setFetchLogsData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const submitFetchLogs = (e) => {
        e.preventDefault();
        
        // Validate date range if both dates are provided
        if (fetchLogsData.start_date && fetchLogsData.end_date) {
            const startDate = new Date(fetchLogsData.start_date);
            const endDate = new Date(fetchLogsData.end_date);
            
            if (startDate > endDate) {
                toast.error('Start date must be before or equal to end date');
                return;
            }
        }
        
        // Show a better toast with progress
        const toastId = toast.loading(`Connecting to ${fetchLogsDevice.name}...`, {
            autoClose: false
        });
        
        let progressInterval;
        let progressCounter = 0;
        
        // Simulate fetch progress updates
        progressInterval = setInterval(() => {
            const stages = [
                'Connecting to device...',
                'Authenticating...',
                'Retrieving attendance data...',
                'Processing records...',
                'Saving to database...'
            ];
            
            const currentStage = stages[Math.min(Math.floor(progressCounter / 20), stages.length - 1)];
            
            toast.update(toastId, {
                render: `${currentStage} (${Math.min(progressCounter, 95)}%)`,
                isLoading: true
            });
            
            progressCounter += 5;
            if (progressCounter > 95) {
                clearInterval(progressInterval);
            }
        }, 500);
        
        const requestPayload = {
            device_id: fetchLogsDevice.id,
            ...(fetchLogsData.start_date && { start_date: fetchLogsData.start_date }),
            ...(fetchLogsData.end_date && { end_date: fetchLogsData.end_date })
        };
        
        fetch(route('biometric-devices.fetch-logs'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify(requestPayload)
        })
        .then(response => {
            clearInterval(progressInterval);
            
            if (!response.ok) {
                throw new Error(`Network response: ${response.status}`);
            }
            
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const savedCount = data.log_summary?.processed_count || 'No';
                const dateRangeMessage = fetchLogsData.start_date && fetchLogsData.end_date
                    ? ` from ${fetchLogsData.start_date} to ${fetchLogsData.end_date}`
                    : '';
                    
                toast.update(toastId, {
                    render: `Successfully fetched logs${dateRangeMessage}: ${savedCount} records saved`,
                    type: 'success',
                    isLoading: false,
                    autoClose: 3000
                });
                
                setShowFetchLogsModal(false);
            } else {
                toast.update(toastId, {
                    render: `Failed: ${data.message || 'Unknown error'}`,
                    type: 'error',
                    isLoading: false,
                    autoClose: 3000
                });
            }
        })
        .catch(error => {
            clearInterval(progressInterval);
            
            toast.update(toastId, {
                render: `Error: ${error.message}`,
                type: 'error',
                isLoading: false,
                autoClose: 3000
            });
        });
    };

    // Render fetch logs modal
    const renderFetchLogsModal = () => (
        <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <form onSubmit={submitFetchLogs}>
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div className="sm:flex sm:items-start">
                                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                                    <RefreshCw className="h-6 w-6 text-green-600" />
                                </div>
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                                        Fetch Logs for {fetchLogsDevice.name}
                                    </h3>
                                    <div className="mt-4 space-y-4">
                                        <div>
                                            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                                                Start Date (Optional)
                                            </label>
                                            <input
                                                type="date"
                                                name="start_date"
                                                id="start_date"
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                value={fetchLogsData.start_date}
                                                onChange={handleFetchLogsChange}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                                                End Date (Optional)
                                            </label>
                                            <input
                                                type="date"
                                                name="end_date"
                                                id="end_date"
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                value={fetchLogsData.end_date}
                                                onChange={handleFetchLogsChange}
                                            />
                                        </div>
                                        
                                        <p className="text-xs text-gray-500 mt-2">
                                            Leave dates blank to fetch all available logs. 
                                            If both dates are provided, only logs within that range will be fetched.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button
                                type="submit"
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                Fetch Logs
                            </button>
                            <button
                                type="button"
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                onClick={() => setShowFetchLogsModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };
  
    // Handle test connection form input changes
    const handleTestConnectionChange = (e) => {
        const { name, value } = e.target;
        setTestConnectionData({ ...testConnectionData, [name]: value });
    };

    
    // Open modal for adding a new device
    const handleAddDevice = () => {
        setIsEditing(false);
        setCurrentDevice(null);
        setFormData({
            name: '',
            ip_address: '',
            port: '4370',
            location: '',
            model: '',
            serial_number: '',
            status: 'active'
        });
        setScanResults([]);
        setShowModal(true);
    };

    // Handle subnet input for scanning


    // Scanner for ZKTeco devices on the network
    const handleScanNetwork = async (fixedSubnet) => {
        setIsScanning(true);
        setScanResults([]);
        setScanProgress(0);
        
        try {
            const scanToastId = toast.loading(`Scanning subnet ${fixedSubnet}.0/24 for ZKTeco devices...`);
            
            const scanPayload = {
                subnet: fixedSubnet,
                port: 4370 // Default ZKTeco port
            };
            
            const response = await fetch(route('biometric-devices.scan-network'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify(scanPayload)
            });
            
            if (!response.ok) {
                throw new Error(`Network error: ${response.status}`);
            }
            
            const data = await response.json();
            
            setScanProgress(100);
            
            if (data.success && data.devices && data.devices.length > 0) {
                // Filter out devices that are already in the list
                const existingIPs = devices.map(device => device.ip_address);
                const newDevices = data.devices.filter(device => !existingIPs.includes(device.ip_address));
                
                setScanResults(newDevices);
                
                if (newDevices.length > 0) {
                    toast.update(scanToastId, {
                        render: `Found ${newDevices.length} new ZKTeco device(s) on the network`,
                        type: 'success',
                        isLoading: false,
                        autoClose: 3000
                    });
                } else {
                    toast.update(scanToastId, {
                        render: 'All ZKTeco devices on this network are already registered',
                        type: 'info',
                        isLoading: false,
                        autoClose: 3000
                    });
                }
            } else {
                toast.update(scanToastId, {
                    render: 'No ZKTeco devices found on the network',
                    type: 'info',
                    isLoading: false,
                    autoClose: 3000
                });
            }
        } catch (error) {
            console.error('Network scan error:', error);
            toast.error(`Scan failed: ${error.message}`);
        } finally {
            setIsScanning(false);
        }
    };
    // Enhanced device selection handler with completion reminder
    const handleSelectDevice = (device) => {
        setFormData({
            ...formData,
            name: device.name || `ZKTeco Device (${device.ip_address})`,
            ip_address: device.ip_address,
            port: device.port.toString() || '4370',
            model: device.model || '',
            serial_number: device.serial_number || '',
            // Maintain other form values if they exist
            location: formData.location || '',
            status: formData.status || 'active'
        });
        
        toast.info(
            <div>
                <p>Selected device: {device.name}</p>
                <p className="text-xs mt-1">Please complete all required fields, especially the Location field.</p>
            </div>, 
            { autoClose: 3000 }
        );
    };
    
    // Open modal for editing an existing device
    const handleEditDevice = (device) => {
        setIsEditing(true);
        setCurrentDevice(device);
        setFormData({
            name: device.name,
            ip_address: device.ip_address,
            port: device.port.toString(),
            location: device.location,
            model: device.model || '',
            serial_number: device.serial_number || '',
            status: device.status
        });
        setShowModal(true);
    };

    // Open confirmation modal for deleting a device
    const handleDeleteClick = (device) => {
        setDeviceToDelete(device);
        setShowDeleteConfirm(true);
    };

    // Updated handleSubmit function with validation prompt
    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Check if required fields are filled
        const requiredFields = ['name', 'ip_address', 'port', 'location'];
        const missingFields = requiredFields.filter(field => !formData[field]);
        
        if (missingFields.length > 0) {
            // Format field names for display (capitalize first letter, replace underscores with spaces)
            const formattedMissingFields = missingFields.map(field => 
                field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            ).join(', ');
            
            toast.error(
                <div>
                    <p><strong>Please complete all required fields:</strong></p>
                    <p>{formattedMissingFields}</p>
                    <p className="text-xs mt-1">Note: Device information obtained from scanning may need to be supplemented with additional details.</p>
                </div>, 
                { autoClose: 5000 }
            );
            return;
        }
        
        if (isEditing && currentDevice) {
            // Update existing device
            router.put(route('biometric-devices.update', currentDevice.id), formData, {
                onSuccess: () => {
                    setShowModal(false);
                    toast.success('Device updated successfully');
                },
                onError: (errors) => {
                    console.error(errors);
                    Object.keys(errors).forEach(key => {
                        toast.error(errors[key]);
                    });
                }
            });
        } else {
            // Create new device
            router.post(route('biometric-devices.store'), formData, {
                onSuccess: () => {
                    setShowModal(false);
                    toast.success('Device added successfully');
                },
                onError: (errors) => {
                    console.error(errors);
                    Object.keys(errors).forEach(key => {
                        toast.error(errors[key]);
                    });
                }
            });
        }
    };

    // Handle device deletion
    const confirmDelete = () => {
        if (deviceToDelete) {
            router.delete(route('biometric-devices.destroy', deviceToDelete.id), {
                onSuccess: () => {
                    setShowDeleteConfirm(false);
                    setDeviceToDelete(null);
                    toast.success('Device deleted successfully');
                },
                onError: (error) => {
                    console.error(error);
                    toast.error('Failed to delete device');
                }
            });
        }
    };

    // Open test connection modal
    const handleTestConnectionClick = (device = null) => {
        if (device) {
            setTestConnectionData({
                ip_address: device.ip_address,
                port: device.port.toString()
            });
        } else {
            setTestConnectionData({
                ip_address: '',
                port: '4370'
            });
        }
        setTestResult(null);
        setShowTestModal(true);
    };

   

    // Test Connection Method
    const handleTestConnection = async (e) => {
        e.preventDefault();
        setIsTestingConnection(true);
        setTestResult(null);
        
        try {
            // Dynamically generate connection payload
            const connectionPayload = {
                ip_address: testConnectionData.ip_address,
                port: testConnectionData.port,
                serial_number: '', // Consider making this dynamic
                device_pin: '', // Consider making this dynamic
                verbose: true,
                connection_timeout: 10000, // 10-second timeout
                retry_attempts: 2 // Allow retry mechanism
            };

            // Perform fetch request to test connection
            const response = await fetch(route('biometric-devices.test-connection'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify(connectionPayload)
            });
            
            // Validate response content type
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Unexpected response type: ${contentType}`);
            }
            
            // Parse response data
            const data = await response.json();
            
            // Comprehensive logging
            console.group('Connection Test Details');
            console.log('Connection Payload:', connectionPayload);
            console.log('Server Response:', {
                success: data.success,
                message: data.message,
                deviceDetails: data.device_info
            });
            console.groupEnd();
            
            // Update test result state
            setTestResult(data);
            
            // Sophisticated success/failure handling
            if (data.success) {
                toast.success('Device Connection Verified', {
                    description: 'Authentication and connectivity confirmed',
                    duration: 4000
                });
            } else {
                toast.error('Connection Verification Failed', {
                    description: data.message || 'Unable to establish device connection',
                    duration: 4000
                });
            }
        } catch (error) {
            // Comprehensive error handling
            console.group('Connection Test Error');
            console.error('Connection Authentication Error:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                connectionDetails: {
                    ipAddress: testConnectionData.ip_address,
                    port: testConnectionData.port
                }
            });
            console.groupEnd();
            
            // Update test result with detailed error
            setTestResult({
                success: false,
                message: `Connection Error: ${error.message}`,
                recommendations: [
                    'Verify device IP and port',
                    'Check network connectivity',
                    'Confirm device is powered on',
                    'Validate device authentication credentials'
                ],
                detailedError: {
                    name: error.name,
                    message: error.message,
                    // Limit stack trace to first few lines
                    stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : 'No stack trace available'
                }
            });
            
            // Enhanced error toast
            toast.error('Connection Test Failed', {
                description: `Detailed Error: ${error.message}\nCheck network, credentials, and device status`,
                duration: 5000
            });
        } finally {
            // Always reset testing state
            setIsTestingConnection(false);
        }
    };

    // Diagnostic Method
  

    // Render device actions (including fetch logs)
    const renderDeviceActions = (device) => {
        return (
            <div className="flex justify-end space-x-2">
                <button
                    onClick={() => handleTestConnectionClick(device)}
                    className="text-indigo-600 hover:text-indigo-900"
                    title="Test Connection"
                >
                    <ServerCrash className="w-5 h-5" />
                </button>
                
                <button
                    onClick={() => {
                        setFetchLogsDevice(device);
                        setFetchLogsData({
                            device_id: device.id,
                            start_date: '',
                            end_date: ''
                        });
                        setShowFetchLogsModal(true);
                    }}
                    className="text-green-600 hover:text-green-900"
                    title="Fetch Logs"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
                <button
                    onClick={() => handleEditDevice(device)}
                    className="text-blue-600 hover:text-blue-900"
                    title="Edit"
                >
                    <Edit className="w-5 h-5" />
                </button>
                <button
                    onClick={() => handleDeleteClick(device)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        );
    };

    // Safely display diagnostic results
    const renderDiagnosticResults = () => {
        if (!diagnosticResults || !diagnosticResults.results) {
            return null;
        }
        
        return (
            <div className="mt-4">
                <h4 className="font-medium text-gray-900">Diagnostic Results</h4>
                
                <div className="mt-2 space-y-3">
                    {Object.entries(diagnosticResults.results || {}).map(([test, result]) => (
                        <div key={test} className={`p-3 rounded-md ${
                            result.success ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                            <div className="flex items-center">
                                {result.success ? (
                                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />) : (
                                        <XCircle className="h-5 w-5 text-red-500 mr-2" />
                                    )}
                                    <span className="font-medium capitalize">{test.replace('_', ' ')}</span>
                                </div>
                                <p className="mt-1 text-sm text-gray-600">
                                    {typeof result.details === 'string' 
                                        ? result.details
                                        : test === 'device_info' && result.success && result.details
                                            ? Object.entries(result.details).map(([key, value]) => (
                                                <div key={key} className="flex justify-between mt-1">
                                                    <span className="text-xs text-gray-500 capitalize">{key.replace('_', ' ')}:</span>
                                                    <span className="text-xs font-medium">{value}</span>
                                                </div>
                                            ))
                                            : JSON.stringify(result.details || {})
                                    }
                                </p>
                            </div>
                        ))}
                    </div>
                    
                    {diagnosticResults.recommendations && diagnosticResults.recommendations.length > 0 && (
                        <div className="mt-4 bg-blue-50 p-3 rounded-md">
                            <h5 className="font-medium text-blue-700">Recommendations</h5>
                            <ul className="mt-2 list-disc list-inside text-sm text-blue-700 space-y-1">
                                {diagnosticResults.recommendations.map((rec, index) => (
                                    <li key={index}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            );
        };
    
        return (
            <AuthenticatedLayout user={auth.user}>
                <Head title="Biometric Device Management" />
                <div className="flex min-h-screen bg-gray-50/50">
                    <Sidebar />
                    <div className="flex-1 p-8">
                        <div className="max-w-7xl mx-auto">
                            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                <div className="p-6 bg-white border-b border-gray-200">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-semibold text-gray-800">Biometric Device Management</h2>
                                        <div className="flex space-x-2">
                                            <button
                                                className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-700 active:bg-green-900 focus:outline-none focus:border-green-900 focus:shadow-outline-gray transition ease-in-out duration-150"
                                                onClick={() => handleTestConnectionClick()}
                                            >
                                                <ServerCrash className="w-4 h-4 mr-2" />
                                                Test Connection
                                            </button>
                                           
                                            <button
                                                className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:border-indigo-900 focus:shadow-outline-gray transition ease-in-out duration-150"
                                                onClick={handleAddDevice}
                                            >
                                                <PlusCircle className="w-4 h-4 mr-2" />
                                                Add Device
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Devices Table */}
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Port</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sync</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {!devices || devices.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="7" className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                                                            No devices found. Click "Add Device" to add a new biometric device.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    devices.map(device => (
                                                        <tr key={device.id}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {device.name}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {device.ip_address}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {device.port}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {device.location}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {device.last_sync ? new Date(device.last_sync).toLocaleString() : 'Never'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                    device.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                    {device.status === 'active' ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                {renderDeviceActions(device)}
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
                        
                        {/* Fetch Logs Modal */}
                        {showFetchLogsModal && renderFetchLogsModal()}
    
                        {/* Add/Edit Device Modal with Device Discovery */}
                        {showModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
        {/* Overlay with blur effect */}
        <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setShowModal(false)}
        ></div>
        
        {/* Modal Container */}
        <div className="relative w-full max-w-2xl mx-4 my-6 transition-all duration-300 ease-in-out transform">
            <div className="relative flex flex-col w-full bg-white rounded-xl shadow-2xl border border-gray-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 rounded-t-xl bg-gray-50">
                    <h3 className="text-xl font-semibold text-gray-900">
                        {isEditing ? 'Edit Device' : 'Add New Device'}
                    </h3>
                    <button 
                        onClick={() => setShowModal(false)}
                        className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                        </svg>
                    </button>
                </div>
                
                {/* Modal Body */}
                <form id="device-form" onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Device Discovery Section */}
                    {!isEditing && (
                        <div className="mb-6">
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-indigo-800 font-medium">Network Device Discovery</h4>
                                    <button
                                        type="button"
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                        onClick={() => handleScanNetwork("10.151.5")}
                                        disabled={isScanning}
                                    >
                                        {isScanning ? (
                                            <>
                                                <Loader className="animate-spin w-4 h-4 mr-2" />
                                                Scanning...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-4 h-4 mr-2" />
                                                Scan Network
                                            </>
                                        )}
                                    </button>
                                </div>
                                
                                {/* Improved Progress Bar */}
                                {isScanning && (
                                    <div className="mt-3">
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                            <div 
                                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                                                style={{ width: `${scanProgress}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>Scanning...</span>
                                            <span>{Math.round(scanProgress)}% Complete</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Scan Results with Enhanced Design */}
                            {scanResults.length > 0 && (
                                <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                        <h5 className="text-sm font-semibold text-gray-700">
                                            Found {scanResults.length} Device{scanResults.length > 1 ? 's' : ''}
                                        </h5>
                                    </div>
                                    <div className="max-h-56 overflow-y-auto">
                                        {scanResults.map((device, index) => (
                                            <div 
                                                key={index}
                                                className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200 group"
                                            >
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-800 group-hover:text-indigo-600">
                                                        {device.name || `ZKTeco Device (${device.ip_address})`}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1 space-x-2">
                                                        <span>IP: {device.ip_address}</span>
                                                        <span>•</span>
                                                        <span>Port: {device.port || 4370}</span>
                                                    </div>
                                                    {(device.model || device.serial_number) && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {device.model && <span>Model: {device.model}</span>}
                                                            {device.serial_number && <span className="ml-2">S/N: {device.serial_number}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="ml-4 px-3 py-1.5 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-md hover:bg-indigo-200 transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectDevice(device);
                                                    }}
                                                >
                                                    Select
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Form Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Device Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                            {!formData.name && (
                                <p className="mt-1 text-xs text-red-500">Device name is required</p>
                            )}
                        </div>
                        
                        <div>
                            <label htmlFor="ip_address" className="block text-sm font-medium text-gray-700 mb-1">
                                IP Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="ip_address"
                                id="ip_address"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                                value={formData.ip_address}
                                onChange={handleChange}
                                placeholder="192.168.1.100"
                                required
                            />
                            {!formData.ip_address && (
                                <p className="mt-1 text-xs text-red-500">IP address is required</p>
                            )}
                        </div>
                        
                        <div>
                            <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-1">
                                Port <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="port"
                                id="port"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                                value={formData.port}
                                onChange={handleChange}
                                min="1"
                                max="65535"
                                placeholder="4370"
                                required
                            />
                            {!formData.port && (
                                <p className="mt-1 text-xs text-red-500">Port is required</p>
                            )}
                        </div>
                        
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                                Location <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="location"
                                id="location"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="Main Office"
                                required
                            />
                            {!formData.location && (
                                <p className="mt-1 text-xs text-red-500">Location is required</p>
                            )}
                        </div>
                        
                        <div>
                            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                                Model
                            </label>
                            <input
                                type="text"
                                name="model"
                                id="model"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                                value={formData.model}
                                onChange={handleChange}
                                placeholder="ZKTeco K40"
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700 mb-1">
                                Serial Number
                            </label>
                            <input
                                type="text"
                                name="serial_number"
                                id="serial_number"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                                value={formData.serial_number}
                                onChange={handleChange}
                                placeholder="ZK12345678"
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                Status <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="status"
                                id="status"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                                value={formData.status}
                                onChange={handleChange}
                                required
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Required Fields Note */}
                    <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center">
                        <svg className="w-5 h-5 text-yellow-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                        </svg>
                        <p className="text-xs text-yellow-800">
                            <span className="font-semibold">Note:</span> Fields marked with an asterisk (<span className="text-red-500">*</span>) are required. Ensure all mandatory fields are completed.
                        </p>
                    </div>
                </form>
                
                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 rounded-b-xl">
    <button
        type="button"
        className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
        onClick={() => setShowModal(false)}
    >
        Cancel
    </button>
    <button
        type="submit"
        form="device-form"
        className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors">
        {isEditing ? 'Update Device' : 'Add Device'}
    </button>
</div>
            </div>
        </div>
    </div>
)}
                        {/* Test Connection Modal */}
                        {showTestModal && (
                            <div className="fixed z-10 inset-0 overflow-y-auto">
                                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                    <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                                        <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                                    </div>
                                    
                                    <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                                    
                                    <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                        <form onSubmit={handleTestConnection}>
                                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                                <div className="sm:flex sm:items-start">
                                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                                        <ServerCrash className="h-6 w-6 text-blue-600" />
                                                    </div>
                                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                            Test Biometric Device Connection
                                                        </h3>
                                                        <div className="mt-4 space-y-4">
                                                            <div>
                                                                <label htmlFor="test_ip_address" className="block text-sm font-medium text-gray-700">
                                                                    IP Address
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    name="ip_address"
                                                                    id="test_ip_address"
                                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                                    value={testConnectionData.ip_address}
                                                                    onChange={handleTestConnectionChange}
                                                                    placeholder="192.168.1.100"
                                                                    required
                                                                />
                                                            </div>
                                                            
                                                            <div>
                                                                <label htmlFor="test_port" className="block text-sm font-medium text-gray-700">
                                                                    Port
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    name="port"
                                                                    id="test_port"
                                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                                    value={testConnectionData.port}
                                                                    onChange={handleTestConnectionChange}
                                                                    min="1"
                                                                    max="65535"
                                                                    placeholder="4370"
                                                                    required
                                                                />
                                                            </div>
                                                            
                                                            {testResult && (
                                                                <div className={`mt-4 p-3 rounded-md ${
                                                                    testResult.success ? 'bg-green-50' : 'bg-red-50'
                                                                }`}>
                                                                    <div className="flex items-center">
                                                                        {testResult.success ? (
                                                                            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                                                                        ) : (
                                                                            <XCircle className="h-5 w-5 text-red-500 mr-2" />
                                                                        )}
                                                                        <span className="font-medium">
                                                                            {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                                                                        </span>
                                                                    </div>
                                                                    {testResult.message && (
                                                                        <p className="mt-1 text-sm text-gray-600">
                                                                            {testResult.message}
                                                                        </p>
                                                                    )}
                                                                    {testResult.device_info && (
                                                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                                                            <h4 className="text-sm font-medium text-gray-700">Device Information</h4>
                                                                            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                                                                {Object.entries(testResult.device_info).map(([key, value]) => (
                                                                                    <div key={key}>
                                                                                        <dt className="text-gray-500 capitalize">{key.replace('_', ' ')}</dt>
                                                                                        <dd className="font-medium">{value}</dd>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                                <button
                                                    type="submit"
                                                    disabled={isTestingConnection}
                                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                                >
                                                    {isTestingConnection ? 'Testing...' : 'Test Connection'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                                    onClick={() => setShowTestModal(false)}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Diagnostic Modal */}
                        
                    
                    {/* Delete Confirmation Modal */}
                    {showDeleteConfirm && (
                        <div className="fixed z-10 inset-0 overflow-y-auto">
                            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                                </div>
                                
                                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                                
                                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                        <div className="sm:flex sm:items-start">
                                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                                <Trash2 className="h-6 w-6 text-red-600" />
                                            </div>
                                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                    Delete Biometric Device
                                                </h3>
                                                <div className="mt-2">
                                                    <p className="text-sm text-gray-500">
                                                        Are you sure you want to delete the device "{deviceToDelete?.name}"? 
                                                        This action cannot be undone and will remove all associated data.
                                                    </p>
                                                    <div className="mt-3 bg-gray-50 p-3 rounded-md">
                                                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                            <div>
                                                                <dt className="text-gray-500">Name</dt>
                                                                <dd className="font-medium">{deviceToDelete?.name}</dd>
                                                            </div>
                                                            <div>
                                                                <dt className="text-gray-500">IP Address</dt>
                                                                <dd className="font-medium">{deviceToDelete?.ip_address}</dd>
                                                            </div>
                                                            <div>
                                                                <dt className="text-gray-500">Location</dt>
                                                                <dd className="font-medium">{deviceToDelete?.location}</dd>
                                                            </div>
                                                            <div>
                                                                <dt className="text-gray-500">Status</dt>
                                                                <dd className="font-medium">
                                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                        deviceToDelete?.status === 'active' 
                                                                            ? 'bg-green-100 text-green-800' 
                                                                            : 'bg-red-100 text-red-800'
                                                                    }`}>
                                                                        {deviceToDelete?.status}
                                                                    </span>
                                                                </dd>
                                                            </div>
                                                        </dl>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                        <button
                                            type="button"
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                            onClick={confirmDelete}
                                        >
                                            Delete Device
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                            onClick={() => setShowDeleteConfirm(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <ToastContainer />
                </div>
            </div>
        </AuthenticatedLayout>
    );
};

export default BiometricManagement;