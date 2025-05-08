import React, { useState, useEffect, useRef } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import axios from 'axios';
import Swal from 'sweetalert2'; // Import SweetAlert
import { 
    Plus, 
    Search, 
    Edit2, 
    Trash2,
    Calendar,
    Eye,
    X,
    Check,
    Users,
    AlertCircle,
    Clock,
    MapPin,
    User,
    XCircle,
    CheckCircle,
    AlertTriangle,
    Globe,
    FileText,
    CalendarPlus
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Modal from '@/Components/Modal';
import ConfirmModal from '@/Components/ConfirmModal';

// Simple Tabs Component
const Tabs = ({ children, defaultValue, className = "", onValueChange }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  useEffect(() => {
    if (onValueChange) {
      onValueChange(activeTab);
    }
  }, [activeTab, onValueChange]);
  
  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (child && (child.type === TabsList || child.type === TabsContent)) {
          return React.cloneElement(child, { activeTab, setActiveTab });
        }
        return child;
      })}
    </div>
  );
};

// TabsList Component
const TabsList = ({ children, activeTab, setActiveTab, className = "" }) => {
  return (
    <div className={`grid grid-cols-5 w-full ${className}`}>
      {React.Children.map(children, child => {
        if (child && child.type === TabsTrigger) {
          return React.cloneElement(child, { activeTab, setActiveTab });
        }
        return child;
      })}
    </div>
  );
};

// TabsTrigger Component
const TabsTrigger = ({ children, value, activeTab, setActiveTab }) => {
  const isActive = activeTab === value;
  
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${
        isActive
          ? value === 'all' 
            ? 'border-indigo-500 text-indigo-600' 
            : value === 'Scheduled' 
              ? 'border-green-500 text-green-600'
              : value === 'Completed'
                ? 'border-blue-500 text-blue-600'
                : value === 'Cancelled'
                  ? 'border-red-500 text-red-600'
                  : value === 'Postponed'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-indigo-500 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
};

// TabsContent Component
const TabsContent = ({ children, value, activeTab }) => {
  if (activeTab !== value) return null;
  
  return (
    <div className="mt-2">
      {children}
    </div>
  );
};

// StatusCard Component
const StatusCard = ({ title, count, icon, bgColor = 'bg-white', textColor = 'text-gray-600' }) => {
  return (
    <div className={`${bgColor} shadow rounded-lg p-5 flex items-center justify-between`}>
      <div>
        <p className={`text-sm ${textColor} font-medium`}>{title}</p>
        <p className="text-3xl font-bold">{count}</p>
      </div>
      <div className="rounded-full p-3">
        {icon}
      </div>
    </div>
  );
};

// ViewEventModal Component
const ViewEventModal = ({ isOpen, onClose, event }) => {
    if (!isOpen || !event) return null;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Modal 
            show={isOpen} 
            onClose={onClose}
            title="Event Details"
        >
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <div>
                    <h2 className="text-xl font-bold mb-2">{event.title}</h2>
                    <div className="flex items-center text-gray-600 mb-2">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                            {formatDate(event.start_time)} - {formatDate(event.end_time)}
                        </span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 mb-2">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{event.location || 'No location specified'}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 mb-2">
                        <User className="h-4 w-4 mr-2" />
                        <span>Organizer: {event.organizer}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 mb-4">
                        <Users className="h-4 w-4 mr-2" />
                        <span>Department: {event.department || 'All Departments'}</span>
                    </div>

                    <div className="mb-4">
                        {(() => {
                            switch(event.status) {
                                case 'Scheduled':
                                    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        Scheduled
                                    </span>;
                                case 'Completed':
                                    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Completed
                                    </span>;
                                case 'Cancelled':
                                    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Cancelled
                                    </span>;
                                case 'Postponed':
                                    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Postponed
                                    </span>;
                                default:
                                    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        {event.status}
                                    </span>;
                            }
                        })()}
                        
                        {event.is_public && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 ml-2">
                                <Globe className="w-3 h-3 mr-1" />
                                Public Event
                            </span>
                        )}
                    </div>

                    <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-1">Description</h3>
                        <p className="text-gray-700 whitespace-pre-line">{event.description || 'No description provided.'}</p>
                    </div>

                    {event.event_type && (
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold mb-1">Event Type</h3>
                            <p className="text-gray-700">{event.event_type}</p>
                        </div>
                    )}

                    {event.website_url && (
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold mb-1">Website</h3>
                            <a 
                                href={event.website_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center"
                            >
                                <Globe className="h-4 w-4 mr-1" />
                                Visit Event Website
                            </a>
                        </div>
                    )}

                    {event.image_url && (
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold mb-1">Event Image</h3>
                            <div className="mt-2 border rounded-lg overflow-hidden">
                                <img 
                                    src={event.image_url} 
                                    alt={event.title} 
                                    className="w-full h-auto max-h-64 object-cover"
                                />
                            </div>
                        </div>
                    )}

                    {event.notes && (
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold mb-1">Notes</h3>
                            <p className="text-gray-700 whitespace-pre-line">{event.notes}</p>
                        </div>
                    )}

                    <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-2">Attendees ({event.attendees_count || 0})</h3>
                        {event.attendees && event.attendees.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {event.attendees.map((attendee) => (
                                            <tr key={attendee.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {`${attendee.Lname}, ${attendee.Fname}`}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {attendee.Department || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${attendee.pivot.attendance_status === 'Attended' ? 'bg-green-100 text-green-800' : 
                                                        attendee.pivot.attendance_status === 'Absent' ? 'bg-red-100 text-red-800' :
                                                        attendee.pivot.attendance_status === 'Confirmed' ? 'bg-blue-100 text-blue-800' :
                                                        attendee.pivot.attendance_status === 'Declined' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'}`}
                                                    >
                                                        {attendee.pivot.attendance_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500">No attendees added to this event.</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                <Button 
                    onClick={onClose}
                    className="w-full sm:w-auto"
                >
                    Close
                </Button>
            </div>
        </Modal>
    );
};

// EventForm Component with Employee Loading Fix
const EventForm = ({ isOpen, onClose, event = null, mode = 'create', departments = [] }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        location: '',
        organizer: '',
        department: '',
        status: 'Scheduled',
        event_type: '',
        is_public: false,
        image_url: '',
        website_url: '',
        notes: '',
        attendees: []
    });
    const [errors, setErrors] = useState({});
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [availableEmployees, setAvailableEmployees] = useState([]);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

    // Fetch employees when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsLoadingEmployees(true);
            
            // Fetch employee data
            axios.get('/employees', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                if (response.data && response.data.data) {
                    const emps = response.data.data;
                    setAvailableEmployees(emps);
                    setFilteredEmployees(emps);
                } else {
                    console.error('Unexpected response format:', response.data);
                    setAvailableEmployees([]);
                    setFilteredEmployees([]);
                }
                setIsLoadingEmployees(false);
            })
            .catch(error => {
                console.error('Error fetching employees:', error);
                setIsLoadingEmployees(false);
                setAvailableEmployees([]);
                setFilteredEmployees([]);
                
                // Show SweetAlert error notification
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to load employees. Please try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            });
        }
    }, [isOpen]);

    // Filter employees based on search term and department
    useEffect(() => {
        // Ensure employees is an array
        if (!Array.isArray(availableEmployees)) {
            console.warn('availableEmployees is not an array:', availableEmployees);
            setFilteredEmployees([]);
            return;
        }
        
        let filtered = [...availableEmployees];
        
        // Apply department filter if selected
        if (departmentFilter) {
            filtered = filtered.filter(employee => employee.Department === departmentFilter);
        }
        
        // Apply search filter if provided
        if (searchTerm.trim()) {
            const searchTermLower = searchTerm.toLowerCase();
            filtered = filtered.filter(employee => {
                const firstName = (employee.Fname || '').toLowerCase();
                const lastName = (employee.Lname || '').toLowerCase();
                const idNo = (employee.idno || '').toLowerCase();
                const fullName = `${firstName} ${lastName}`.toLowerCase();
                const fullNameReversed = `${lastName} ${firstName}`.toLowerCase();
                
                return firstName.includes(searchTermLower) || 
                       lastName.includes(searchTermLower) || 
                       idNo?.includes(searchTermLower) ||
                       fullName.includes(searchTermLower) ||
                       fullNameReversed.includes(searchTermLower);
            });
        }
        
        setFilteredEmployees(filtered);
    }, [searchTerm, departmentFilter, availableEmployees]);

    useEffect(() => {
        if (event) {
            // Format dates for input fields
            const startTime = event.start_time ? new Date(event.start_time) : '';
            const endTime = event.end_time ? new Date(event.end_time) : '';
            
            setFormData({
                ...event,
                start_time: startTime ? startTime.toISOString().slice(0, 16) : '',
                end_time: endTime ? endTime.toISOString().slice(0, 16) : '',
                attendees: event.attendees ? event.attendees.map(p => p.id) : []
            });
            
            if (event.attendees) {
                setSelectedEmployees(event.attendees);
            }
        } else {
            // Default for new event
            setFormData({
                title: '',
                description: '',
                start_time: '',
                end_time: '',
                location: '',
                organizer: '',
                department: '',
                status: 'Scheduled',
                event_type: '',
                is_public: false,
                image_url: '',
                website_url: '',
                notes: '',
                attendees: []
            });
            setSelectedEmployees([]);
        }
    }, [event]);

   // Updated handleSubmit function for the EventForm component
const handleSubmit = (e) => {
    e.preventDefault();
    
    // Clone formData to include attendees
    const submitData = {
        ...formData,
        attendees: selectedEmployees.map(emp => emp.id)
    };
    
    if (mode === 'create') {
        router.post('/events', submitData, {
            onError: (errors) => {
                setErrors(errors);
                
                // Show SweetAlert error toast notification
                Swal.fire({
                    toast: true,
                    position: 'top',
                    icon: 'error',
                    title: 'Please check the form for errors.',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });
            },
            onSuccess: () => {
                onClose();
                
                // Show SweetAlert toast notification
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.addEventListener('mouseenter', Swal.stopTimer)
                        toast.addEventListener('mouseleave', Swal.resumeTimer)
                    }
                });
                
                Toast.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Event created successfully.',
                    iconHtml: '<div class="rounded-full bg-green-100 p-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg></div>',
                    customClass: {
                        popup: 'px-6 py-4 rounded-lg shadow-md',
                        title: 'text-gray-700 font-medium'
                    }
                });
            },
        });
    } else {
        // For edit mode, use POST with _method: 'PUT' instead of direct PUT
        router.post(`/events/${event.id}`, {
            ...submitData,
            _method: 'PUT'  // This is the key change for Laravel's method spoofing
        }, {
            onError: (errors) => {
                setErrors(errors);
                
                // Show SweetAlert error toast notification
                Swal.fire({
                    toast: true,
                    position: 'top',
                    icon: 'error',
                    title: 'Please check the form for errors.',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });
            },
            onSuccess: () => {
                onClose();
                
                // Show SweetAlert toast notification
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.addEventListener('mouseenter', Swal.stopTimer)
                        toast.addEventListener('mouseleave', Swal.resumeTimer)
                    }
                });
                
                Toast.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Event updated successfully.',
                    iconHtml: '<div class="rounded-full bg-green-100 p-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg></div>',
                    customClass: {
                        popup: 'px-6 py-4 rounded-lg shadow-md',
                        title: 'text-gray-700 font-medium'
                    }
                });
            },
        });
    }
};

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }
    };

    const handleAddEmployee = (employee) => {
        if (!selectedEmployees.find(e => e.id === employee.id)) {
            setSelectedEmployees([...selectedEmployees, employee]);
            setFormData(prev => ({
                ...prev,
                attendees: [...prev.attendees, employee.id]
            }));
            
            // Show SweetAlert toast notification
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            });
            
            Toast.fire({
                icon: 'success',
                title: `${employee.Fname} ${employee.Lname} added to attendees`
            });
        }
        setSearchTerm('');
    };

    const handleRemoveEmployee = (employeeId) => {
        const employeeToRemove = selectedEmployees.find(e => e.id === employeeId);
        setSelectedEmployees(selectedEmployees.filter(e => e.id !== employeeId));
        setFormData(prev => ({
            ...prev,
            attendees: prev.attendees.filter(id => id !== employeeId)
        }));
        
        if (employeeToRemove) {
            // Show SweetAlert toast notification
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            });
            
            Toast.fire({
                icon: 'info',
                title: `${employeeToRemove.Fname} ${employeeToRemove.Lname} removed from attendees`
            });
        }
    };

    return (
        <Modal 
            show={isOpen} 
            onClose={onClose}
            title={mode === 'create' ? 'Create New Event' : 'Edit Event'}
        >
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                    {/* Basic Information */}
                    <div className="col-span-2">
                        <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                    </div>
                    
                    <div className="col-span-2">
                        <label htmlFor="title" className="block text-sm font-medium mb-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="title"
                            name="title"
                            type="text"
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                            value={formData.title}
                            onChange={handleChange}
                        />
                        {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
                    </div>

                    <div className="col-span-2">
                        <label htmlFor="description" className="block text-sm font-medium mb-1">
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            rows={3}
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Scheduling Information */}
                    <div className="col-span-2">
                        <h3 className="text-lg font-semibold mb-3 mt-4">Scheduling</h3>
                    </div>
                    
                    <div>
                        <label htmlFor="start_time" className="block text-sm font-medium mb-1">
                            Start Date & Time <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="start_time"
                            name="start_time"
                            type="datetime-local"
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.start_time ? 'border-red-500' : 'border-gray-300'}`}
                            value={formData.start_time}
                            onChange={handleChange}
                        />
                        {errors.start_time && <p className="mt-1 text-sm text-red-500">{errors.start_time}</p>}
                    </div>

                    <div>
                        <label htmlFor="end_time" className="block text-sm font-medium mb-1">
                            End Date & Time <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="end_time"
                            name="end_time"
                            type="datetime-local"
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.end_time ? 'border-red-500' : 'border-gray-300'}`}
                            value={formData.end_time}
                            onChange={handleChange}
                        />
                        {errors.end_time && <p className="mt-1 text-sm text-red-500">{errors.end_time}</p>}
                    </div>

                    <div>
                        <label htmlFor="location" className="block text-sm font-medium mb-1">
                            Location
                        </label>
                        <input
                            id="location"
                            name="location"
                            type="text"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.location}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium mb-1">
                            Status
                        </label>
                        <select
                            id="status"
                            name="status"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.status}
                            onChange={handleChange}
                        >
                            <option value="Scheduled">Scheduled</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                            <option value="Postponed">Postponed</option>
                        </select>
                    </div>

                    {/* Event Details */}
                    <div className="col-span-2">
                        <h3 className="text-lg font-semibold mb-3 mt-4">Event Details</h3>
                    </div>

                    <div>
                        <label htmlFor="organizer" className="block text-sm font-medium mb-1">
                            Organizer <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="organizer"
                            name="organizer"
                            type="text"
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.organizer ? 'border-red-500' : 'border-gray-300'}`}
                            value={formData.organizer}
                            onChange={handleChange}
                        />
                        {errors.organizer && <p className="mt-1 text-sm text-red-500">{errors.organizer}</p>}
                    </div>

                    <div>
                        <label htmlFor="department" className="block text-sm font-medium mb-1">
                            Department
                        </label>
                        <select
                            id="department"
                            name="department"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.department}
                            onChange={handleChange}
                        >
                            <option value="">Select Department</option>
                            {Array.isArray(departments) && departments.map((dept, index) => {
                                // Handle both string departments and object departments
                                const deptName = typeof dept === 'string' ? dept : dept.name || dept.code || '';
                                const deptId = typeof dept === 'string' ? dept : dept.id || index;
                                
                                return (
                                    <option key={`dept-${deptId}`} value={deptName}>
                                        {deptName}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="event_type" className="block text-sm font-medium mb-1">
                            Event Type
                        </label>
                        <select
                            id="event_type"
                            name="event_type"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.event_type}
                            onChange={handleChange}
                        >
                            <option value="">Select Event Type</option>
                            <option value="Conference">Conference</option>
                            <option value="Workshop">Workshop</option>
                            <option value="Seminar">Seminar</option>
                            <option value="Training">Training</option>
                            <option value="Team Building">Team Building</option>
                            <option value="Celebration">Celebration</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            id="is_public"
                            name="is_public"
                            type="checkbox"
                            checked={formData.is_public}
                            onChange={handleChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_public" className="block text-sm font-medium">
                            Public Event
                        </label>
                    </div>

                    <div className="col-span-2">
                        <label htmlFor="image_url" className="block text-sm font-medium mb-1">
                            Image URL
                        </label>
                        <input
                            id="image_url"
                            name="image_url"
                            type="url"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.image_url}
                            onChange={handleChange}
                            placeholder="https://"
                        />
                    </div>

                    <div className="col-span-2">
                        <label htmlFor="website_url" className="block text-sm font-medium mb-1">
                            Website URL
                        </label>
                        <input
                            id="website_url"
                            name="website_url"
                            type="url"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.website_url}
                            onChange={handleChange}
                            placeholder="https://"
                        />
                    </div>

                    <div className="col-span-2">
                        <label htmlFor="notes" className="block text-sm font-medium mb-1">
                            Notes
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            rows={2}
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.notes}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Attendees Section */}
                    <div className="col-span-2">
                        <h3 className="text-lg font-semibold mb-3 mt-4">Attendees</h3>
                    </div>

                    <div className="col-span-2">
                        <div className="border rounded-lg p-4">
                            <div className="mb-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {/* Search Input */}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        placeholder="Search employees by name or ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        disabled={isLoadingEmployees}
                                    />
                                </div>
                                
                                {/* Department Filter */}
                                <div>
                                    <select
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        value={departmentFilter}
                                        onChange={(e) => setDepartmentFilter(e.target.value)}
                                        disabled={isLoadingEmployees}
                                    >
                                        <option value="">All Departments</option>
                                        {Array.isArray(departments) && departments.map((dept, index) => {
                                            // Handle both string departments and object departments
                                            const deptName = typeof dept === 'string' ? dept : dept.name || dept.code || '';
                                            const deptId = typeof dept === 'string' ? dept : dept.id || index;
                                            
                                            return (
                                                <option key={`dept-filter-${deptId}`} value={deptName}>
                                                    {deptName}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="text-xs text-gray-500 mb-2">
                                {isLoadingEmployees ? (
                                    "Loading employees..."
                                ) : (
                                    filteredEmployees.length === 0 ? 
                                        "No matching employees found" : 
                                        filteredEmployees.length === 1 ? 
                                            "1 employee found" : 
                                            `${filteredEmployees.length} employees found`
                                )}
                                {selectedEmployees.length > 0 && 
                                    ` - ${selectedEmployees.length} employee${selectedEmployees.length > 1 ? 's' : ''} selected`
                                }
                            </div>
                            
                            {/* Employee List */}
                            <div className="max-h-40 overflow-y-auto border rounded-md">
                                {isLoadingEmployees ? (
                                    <div className="p-3 text-center text-gray-500 text-sm">
                                        Loading employees...
                                    </div>
                                ) : filteredEmployees.length > 0 ? (
                                    <div className="divide-y divide-gray-200">
                                        {filteredEmployees.map(employee => (
                                            <div 
                                                key={employee.id} 
                                                className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                                                onClick={() => handleAddEmployee(employee)}
                                            >
                                                <div className="ml-3 flex-grow">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {employee.Lname}, {employee.Fname} {employee.MName || ''}
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex space-x-2">
                                                        <span>{employee.idno || 'No ID'}</span>
                                                        <span>•</span>
                                                        <span>{employee.Department || 'No Dept'}</span>
                                                        <span>•</span>
                                                        <span>{employee.Jobtitle || 'No Title'}</span>
                                                    </div>
                                                </div>
                                                <Button 
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 rounded-full"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-3 text-center text-gray-500 text-sm">
                                        No employees found matching your criteria
                                    </div>
                                )}
                            </div>

                            <div className="mt-4">
                                <h4 className="text-sm font-medium mb-2">Selected Attendees ({selectedEmployees.length})</h4>
                                {selectedEmployees.length > 0 ? (
                                    <div className="border rounded-md overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                                    <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {selectedEmployees.map(employee => (
                                                    <tr key={employee.id}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {employee.Lname}, {employee.Fname}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                            {employee.Department || '-'}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                                            <Button 
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-800"
                                                                onClick={() => handleRemoveEmployee(employee.id)}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No attendees selected.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit buttons */}
                <div className="flex justify-end space-x-3 mt-6">
                    <Button 
                        type="button" 
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        {mode === 'create' ? 'Create Event' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

// RescheduleModal Component
const RescheduleModal = ({ isOpen, onClose, event, onReschedule }) => {
    const [formData, setFormData] = useState({
        start_time: '',
        end_time: '',
        status: 'Scheduled'
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (event) {
            // Format dates for input fields
            const startTime = event.start_time ? new Date(event.start_time) : '';
            const endTime = event.end_time ? new Date(event.end_time) : '';
            
            setFormData({
                start_time: startTime ? startTime.toISOString().slice(0, 16) : '',
                end_time: endTime ? endTime.toISOString().slice(0, 16) : '',
                status: 'Scheduled'
            });
        }
    }, [event]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate that end time is after start time
        if (new Date(formData.end_time) <= new Date(formData.start_time)) {
            setErrors({
                ...errors,
                end_time: 'End time must be after start time'
            });
            return;
        }
        
        // Use the router to update the event
        router.post(`/events/${event.id}/reschedule`, {
            ...formData,
            _method: 'PUT'  // Add method spoofing for Laravel compatibility
        }, {
            onError: (errors) => {
                setErrors(errors);
                
                // Show SweetAlert error toast notification
                Swal.fire({
                    toast: true,
                    position: 'top',
                    icon: 'error',
                    title: 'Please check the form for errors.',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });
            },
            onSuccess: () => {
                onClose();
                
                // Show SweetAlert toast notification
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.addEventListener('mouseenter', Swal.stopTimer)
                        toast.addEventListener('mouseleave', Swal.resumeTimer)
                    }
                });
                
                Toast.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Event rescheduled successfully.',
                    iconHtml: '<div class="rounded-full bg-green-100 p-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg></div>',
                    customClass: {
                        popup: 'px-6 py-4 rounded-lg shadow-md',
                        title: 'text-gray-700 font-medium'
                    }
                });
                
                if (onReschedule) {
                    onReschedule();
                }
            },
        });
    };

    return (
        <Modal 
            show={isOpen} 
            onClose={onClose}
            title="Reschedule Event"
        >
            <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="start_time" className="block text-sm font-medium mb-1">
                            New Start Date & Time <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="start_time"
                            name="start_time"
                            type="datetime-local"
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.start_time ? 'border-red-500' : 'border-gray-300'}`}
                            value={formData.start_time}
                            onChange={handleChange}
                            required
                        />
                        {errors.start_time && <p className="mt-1 text-sm text-red-500">{errors.start_time}</p>}
                    </div>

                    <div>
                        <label htmlFor="end_time" className="block text-sm font-medium mb-1">
                            New End Date & Time <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="end_time"
                            name="end_time"
                            type="datetime-local"
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.end_time ? 'border-red-500' : 'border-gray-300'}`}
                            value={formData.end_time}
                            onChange={handleChange}
                            required
                        />
                        {errors.end_time && <p className="mt-1 text-sm text-red-500">{errors.end_time}</p>}
                    </div>
                    
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                        <div className="flex items-start">
                            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
                            <div>
                                <p className="text-sm font-medium text-yellow-800">Rescheduling Notice</p>
                                <p className="text-sm text-yellow-700">
                                    This will notify all attendees about the schedule change. 
                                    The event status will be set to "Scheduled".
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <Button 
                        type="button" 
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Reschedule Event
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

// Event List Component
const EventList = ({ events, onEdit, onDelete, onView, onMarkCompleted, onMarkCancelled, onMarkScheduled, onReschedule }) => {
    if (!events) {
        return <div className="p-4 text-center text-gray-500">No events data received</div>;
    }

    if (!Array.isArray(events)) {
        console.error('Events is not an array:', events);
        return <div className="p-4 text-center text-gray-500">Invalid events data</div>;
    }

    if (events.length === 0) {
        return <div className="p-4 text-center text-gray-500">No events found</div>;
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'Scheduled':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Calendar className="w-3 h-3 mr-1" />
                    Scheduled
                </span>;
            case 'Completed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                </span>;
            case 'Cancelled':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 mr-1" />
                    Cancelled
                </span>;
            case 'Postponed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Postponed
                </span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {status}
                </span>;
        }
    };

    return (
        <div className="overflow-x-auto" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Title
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Organizer
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Attendees
                        </th>
                    </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                    {events.map((event) => (
                        <tr key={event.id} className={`hover:bg-gray-50 ${
                            event.status === 'Cancelled' ? 'bg-red-50' : 
                            event.status === 'Postponed' ? 'bg-yellow-50' : ''
                        }`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-2">
                                    <Button 
                                        variant="outline"
                                        className="p-2"
                                        onClick={() => onView(event)}
                                        title="View Event"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>

                                    <Button 
                                        variant="secondary" 
                                        className="p-2"
                                        onClick={() => onEdit(event)}
                                        title="Edit Event"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    
                                    {/* Add Reschedule button for events that can be rescheduled */}
                                    {(event.status === 'Scheduled' || event.status === 'Postponed') && (
                                        <Button 
                                            variant="default"
                                            className="p-2 bg-purple-500 hover:bg-purple-600 text-white"
                                            onClick={() => onReschedule(event)}
                                            title="Reschedule Event"
                                        >
                                            <CalendarPlus className="h-4 w-4" />
                                        </Button>
                                    )}
                                    
                                    {event.status !== 'Completed' && (
                                        <Button 
                                            variant="default"
                                            className="p-2 bg-blue-500 hover:bg-blue-600 text-white"
                                            onClick={() => onMarkCompleted(event.id)}
                                            title="Mark as Completed"
                                        >
                                            <CheckCircle className="h-4 w-4" />
                                        </Button>
                                    )}
                                    
                                    {event.status !== 'Cancelled' && (
                                        <Button 
                                            variant="destructive"
                                            className="p-2"
                                            onClick={() => onMarkCancelled(event.id)}
                                            title="Cancel Event"
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    )}
                                    
                                    {(event.status === 'Cancelled' || event.status === 'Postponed') && (
                                        <Button 
                                            variant="default"
                                            className="p-2 bg-green-500 hover:bg-green-600 text-white"
                                            onClick={() => onReschedule(event)}
                                            title="Reschedule Event"
                                        >
                                            <CalendarPlus className="h-4 w-4" />
                                        </Button>
                                    )}
                                    
                                    <Button 
                                        variant="destructive"
                                        className="p-2"
                                        onClick={() => onDelete(event.id)}
                                        title="Delete Event"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{event.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(event.start_time)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatTime(event.start_time)} - {formatTime(event.end_time)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {getStatusBadge(event.status)}
                                {event.is_public && 
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 ml-1">
                                        <Globe className="w-3 h-3 mr-1" />
                                        Public
                                    </span>
                                }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {event.location || (event.website_url ? 
                                    <span className="inline-flex items-center text-blue-600">
                                        <Globe className="h-4 w-4 mr-1" />
                                        Virtual
                                    </span> : '-')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.organizer}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.attendees_count || 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const EventPage = ({ events: initialEvents, counts = {}, currentStatus = 'all', flash, employees = [], departments = [] }) => {
    // Ensure initialEvents is always an array
    const safeInitialEvents = Array.isArray(initialEvents) ? initialEvents : [];

    const { auth } = usePage().props;
    const [filteredEvents, setFilteredEvents] = useState(safeInitialEvents);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [formMode, setFormMode] = useState('create');
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [activeTab, setActiveTab] = useState(currentStatus || 'all');
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '',
        confirmVariant: 'destructive',
        onConfirm: () => {}
    });

    // Add refs to track state changes and prevent loops
    const hasAttemptedFetch = useRef(false);
    const previousEventsRef = useRef(null);
    const lastFilterState = useRef({
        searchTerm: '',
        activeTab: 'all',
        fromDate: '',
        toDate: ''
    });

    // Fix: Properly initialize eventCounts with defaults in case counts is undefined
    const eventCounts = {
        total: (counts?.total !== undefined) ? counts.total : (safeInitialEvents.length || 0),
        scheduled: (counts?.scheduled !== undefined) ? counts.scheduled : (safeInitialEvents.filter(m => m?.status === 'Scheduled').length || 0),
        completed: (counts?.completed !== undefined) ? counts.completed : (safeInitialEvents.filter(m => m?.status === 'Completed').length || 0),
        cancelled: (counts?.cancelled !== undefined) ? counts.cancelled : (safeInitialEvents.filter(m => m?.status === 'Cancelled').length || 0),
        postponed: (counts?.postponed !== undefined) ? counts.postponed : (safeInitialEvents.filter(m => m?.status === 'Postponed').length || 0)
    };

    // Debug state changes for modal visibility
    useEffect(() => {
        console.log('rescheduleModalOpen state changed:', rescheduleModalOpen);
        console.log('selectedEvent:', selectedEvent);
    }, [rescheduleModalOpen, selectedEvent]);

    // If we don't have events data, fetch it directly - but only once
    useEffect(() => {
        if (!initialEvents || !Array.isArray(initialEvents) || initialEvents.length === 0) {
            // Only attempt to fetch once
            if (!hasAttemptedFetch.current) {
                hasAttemptedFetch.current = true;

                axios.get('/events/list', {
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => {
                    if (response.data && response.data.events && Array.isArray(response.data.events)) {
                        setFilteredEvents(response.data.events);
                        previousEventsRef.current = response.data.events;
                    }
                })
                .catch(error => {
                    console.error('Error fetching events via API:', error);

                    // Show SweetAlert error notification
                    Swal.fire({
                        title: 'Error!',
                        text: 'Failed to load events. Please refresh the page or try again later.',
                        icon: 'error',
                        confirmButtonText: 'OK'
                    });
                });
            }
        } else {
            // Store initial events in the ref
            previousEventsRef.current = safeInitialEvents;
        }
    }, []); // Empty dependency array so it only runs once

    // Effect to track initialEvents changes separately
    useEffect(() => {
        // Compare initialEvents with previous value using deep comparison
        if (JSON.stringify(previousEventsRef.current) !== JSON.stringify(safeInitialEvents)) {
            previousEventsRef.current = safeInitialEvents;

            // Re-apply filters
            applyFilters();
        }
    }, [safeInitialEvents]);

    // Function to apply filters consistently
    const applyFilters = () => {
        // Skip if no events data yet
        if (!previousEventsRef.current || !Array.isArray(previousEventsRef.current)) {
            return;
        }

        let filtered = [...previousEventsRef.current];

        // Filter by status tab
        if (activeTab !== 'all') {
            filtered = filtered.filter(event => event.status === activeTab);
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(event => 
                (event.title && event.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (event.organizer && event.organizer.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (event.department && event.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Filter by date range
        if (fromDate) {
            filtered = filtered.filter(event => {
                if (!event.start_time) return false;
                const eventDate = new Date(event.start_time);
                const filterDate = new Date(fromDate);
                return eventDate >= filterDate;
            });
        }

        if (toDate) {
            filtered = filtered.filter(event => {
                if (!event.start_time) return false;
                const eventDate = new Date(event.start_time);
                const filterDate = new Date(toDate);
                // Set time to end of day for inclusive filtering
                filterDate.setHours(23, 59, 59, 999);
                return eventDate <= filterDate;
            });
        }

        setFilteredEvents(filtered);
    };

    // Debounced filter effect to avoid excessive re-filtering
    useEffect(() => {
        // Check if filter state actually changed to avoid unnecessary updates
        const currentFilterState = {
            searchTerm,
            activeTab,
            fromDate,
            toDate
        };

        if (JSON.stringify(lastFilterState.current) !== JSON.stringify(currentFilterState)) {
            lastFilterState.current = currentFilterState;

            // Use debounce to prevent rapid fire updates
            const timeoutId = setTimeout(() => {
                applyFilters();
            }, 300);

            return () => clearTimeout(timeoutId);
        }
    }, [searchTerm, activeTab, fromDate, toDate]);

    const handleView = (event) => {
        setSelectedEvent(event);
        setViewModalOpen(true);
    };

    // Add handle function for rescheduling
    const handleReschedule = (event) => {
        console.log('Rescheduling event:', event);
        setSelectedEvent(event);
        setRescheduleModalOpen(true);
        console.log('Modal should be open:', true);
    };

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Event',
            message: 'Are you sure you want to delete this event? This action cannot be undone.',
            confirmText: 'Delete',
            confirmVariant: 'destructive',
            onConfirm: () => {
                // Use the post method with the _method parameter instead of direct delete
                router.post(`/events/${id}`, {
                    _method: 'DELETE'
                }, {
                    onSuccess: () => {
                        setConfirmModal({...confirmModal, isOpen: false});
                        
                        // Show SweetAlert toast notification with top-end position
                        const Toast = Swal.mixin({
                            toast: true,
                            position: 'top-end', // Changed from 'top' to 'top-end'
                            showConfirmButton: false,
                            timer: 3000,
                            timerProgressBar: true,
                            didOpen: (toast) => {
                                toast.addEventListener('mouseenter', Swal.stopTimer)
                                toast.addEventListener('mouseleave', Swal.resumeTimer)
                            }
                        });
                        
                        Toast.fire({
                            icon: 'success',
                            title: 'Event deleted successfully',
                            iconHtml: '<div class="rounded-full bg-green-100 p-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg></div>',
                            customClass: {
                                popup: 'px-6 py-4 rounded-lg shadow-md flex items-start',
                                title: 'text-gray-700 ml-3 font-medium'
                            }
                        });
                    },
                    onError: (error) => {
                        console.error('Delete failed:', error);
                        
                        // Error toast notification with top-end position
                        Swal.fire({
                            toast: true,
                            position: 'top-end', // Changed from 'top' to 'top-end'
                            icon: 'error',
                            title: 'Failed to delete event',
                            showConfirmButton: false,
                            timer: 3000
                        });
                    }
                });
            }
        });
    };

    // For the handleMarkCompleted function
    const handleMarkCompleted = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Mark Event as Completed',
            message: 'Are you sure you want to mark this event as completed?',
            confirmText: 'Mark Completed',
            confirmVariant: 'default',
            onConfirm: () => {
                // Use the events/{id}/status route with POST method
                router.post(`/events/${id}/status`, {
                    status: 'Completed'
                }, {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        setConfirmModal({...confirmModal, isOpen: false});
                        
                        // Show SweetAlert toast notification with top-end position
                        const Toast = Swal.mixin({
                            toast: true,
                            position: 'top-end', 
                            showConfirmButton: false,
                            timer: 3000,
                            timerProgressBar: true,
                            didOpen: (toast) => {
                                toast.addEventListener('mouseenter', Swal.stopTimer)
                                toast.addEventListener('mouseleave', Swal.resumeTimer)
                            }
                        });
                        
                        Toast.fire({
                            icon: 'success',
                            title: 'Event marked as completed',
                            iconHtml: '<div class="rounded-full bg-green-100 p-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg></div>',
                            customClass: {
                                popup: 'px-6 py-4 rounded-lg shadow-md flex items-start',
                                title: 'text-gray-700 ml-3 font-medium'
                            }
                        });
                    },
                    onError: () => {
                        // Error toast notification with top-end position
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'error',
                            title: 'Failed to update event status',
                            showConfirmButton: false,
                            timer: 3000
                        });
                    }
                });
            }
        });
    };

    // For the handleMarkCancelled function
    const handleMarkCancelled = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancel Event',
            message: 'Are you sure you want to cancel this event?',
            confirmText: 'Cancel Event',
            confirmVariant: 'destructive',
            onConfirm: () => {
                // Use the events/{id}/status route with POST method
                router.post(`/events/${id}/status`, {
                    status: 'Cancelled'
                }, {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        setConfirmModal({...confirmModal, isOpen: false});
                        
                        // Show SweetAlert toast notification with top-end position
                        const Toast = Swal.mixin({
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3000,
                            timerProgressBar: true,
                            didOpen: (toast) => {
                                toast.addEventListener('mouseenter', Swal.stopTimer)
                                toast.addEventListener('mouseleave', Swal.resumeTimer)
                            }
                        });
                        
                        Toast.fire({
                            icon: 'success',
                            title: 'Event cancelled successfully',
                            iconHtml: '<div class="rounded-full bg-green-100 p-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg></div>',
                            customClass: {
                                popup: 'px-6 py-4 rounded-lg shadow-md flex items-start',
                                title: 'text-gray-700 ml-3 font-medium'
                            }
                        });
                    },
                    onError: () => {
                        // Error toast notification with top-end position
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'error',
                            title: 'Failed to cancel event',
                            showConfirmButton: false,
                            timer: 3000
                        });
                    }
                });
            }
        });
    };

    // For the handleMarkScheduled function
    const handleMarkScheduled = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Reschedule Event',
            message: 'Are you sure you want to mark this event as scheduled?',
            confirmText: 'Schedule',
            confirmVariant: 'default',
            onConfirm: () => {
                // Use the events/{id}/status route with POST method
                router.post(`/events/${id}/status`, {
                    status: 'Scheduled'
                }, {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        setConfirmModal({...confirmModal, isOpen: false});
                        
                        // Show SweetAlert toast notification with top-end position
                        const Toast = Swal.mixin({
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3000,
                            timerProgressBar: true,
                            didOpen: (toast) => {
                                toast.addEventListener('mouseenter', Swal.stopTimer)
                                toast.addEventListener('mouseleave', Swal.resumeTimer)
                            }
                        });
                        
                        Toast.fire({
                            icon: 'success',
                            title: 'Event rescheduled successfully',
                            iconHtml: '<div class="rounded-full bg-green-100 p-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg></div>',
                            customClass: {
                                popup: 'px-6 py-4 rounded-lg shadow-md flex items-start',
                                title: 'text-gray-700 ml-3 font-medium'
                            }
                        });
                    },
                    onError: () => {
                        // Error toast notification with top-end position
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'error',
                            title: 'Failed to reschedule event',
                            showConfirmButton: false,
                            timer: 3000
                        });
                    }
                });
            }
        });
    };

    // Fix: Prevent unnecessary router calls by checking if tab changed
    const handleTabChange = (value) => {
        if (value !== activeTab) {
            setActiveTab(value);

            // Debounce the router call to prevent rapid state changes
            const timeoutId = setTimeout(() => {
                router.visit(`/events?status=${value}`, {
                    preserveState: true,
                    preserveScroll: true,
                    only: ['events', 'currentStatus']
                });
            }, 300);

            return () => clearTimeout(timeoutId);
        }
    };

    const handleExport = () => {
        const queryParams = new URLSearchParams();

        if (activeTab !== 'all') {
            queryParams.append('status', activeTab);
        }

        if (searchTerm) {
            queryParams.append('search', searchTerm);
        }

        if (fromDate) {
            queryParams.append('from_date', fromDate);
        }

        if (toDate) {
            queryParams.append('to_date', toDate);
        }

        window.location.href = `/events/export?${queryParams.toString()}`;

        // Show SweetAlert toast notification
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
        });

        Toast.fire({
            icon: 'info',
            title: 'Exporting events data...',
            text: 'Your download will begin shortly',
            iconHtml: '<div class="rounded-full bg-blue-100 p-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>',
            customClass: {
                popup: 'px-6 py-4 rounded-lg shadow-md flex items-start',
                title: 'text-gray-700 ml-3 font-medium'
            }
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Event Management" />
            <div className="flex min-h-screen bg-gray-50/50">
                <Sidebar />
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        {flash?.message && (
                            <Alert className="mb-4">
                                <AlertDescription>{flash.message}</AlertDescription>
                            </Alert>
                        )}

                        {/* Header Section */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    Event Management
                                </h1>
                                <p className="text-gray-600">
                                    Create and manage company events.
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <Button
                                    onClick={handleExport}
                                    className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors duration-200 flex items-center"
                                >
                                    <FileText className="w-5 h-5 mr-2" />
                                    Export to Excel
                                </Button>
                                
                                <Button
                                    onClick={() => {
                                        setFormMode('create');
                                        setSelectedEvent(null);
                                        setIsFormOpen(true);
                                    }}
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                                >
                                    <Plus className="w-5 h-5 mr-2" />
                                    Create Event
                                </Button>
                            </div>
                        </div>
                        
                        {/* Status Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <StatusCard 
                                title="Total Events" 
                                count={eventCounts.total}
                                icon={<Calendar className="h-6 w-6 text-indigo-600" />}
                                bgColor="bg-white"
                                textColor="text-gray-600"
                            />
                            <StatusCard 
                                title="Scheduled" 
                                count={eventCounts.scheduled}
                                icon={<Clock className="h-6 w-6 text-green-600" />}
                                bgColor="bg-white"
                                textColor="text-gray-600"
                            />
                            <StatusCard 
                                title="Completed" 
                                count={eventCounts.completed}
                                icon={<CheckCircle className="h-6 w-6 text-blue-600" />}
                                bgColor="bg-white" 
                                textColor="text-gray-600"
                            />
                            <StatusCard 
                                title="Cancelled" 
                                count={eventCounts.cancelled}
                                icon={<XCircle className="h-6 w-6 text-red-600" />}
                                bgColor="bg-white"
                                textColor="text-gray-600"
                            />
                        </div>

                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="md:col-span-2 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search events..."
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            
                            <div>
                                <input
                                    type="date"
                                    placeholder="From Date"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                />
                            </div>
                            
                            <div>
                                <input
                                    type="date"
                                    placeholder="To Date"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        {/* Tabs for filtering by status */}
                        <Tabs defaultValue={activeTab} className="mb-6" onValueChange={handleTabChange}>
                            <TabsList className="grid grid-cols-5 w-full">
                                <TabsTrigger value="all">All Events</TabsTrigger>
                                <TabsTrigger value="Scheduled">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Scheduled
                                </TabsTrigger>
                                <TabsTrigger value="Completed">
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Completed
                                </TabsTrigger>
                                <TabsTrigger value="Cancelled">
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancelled
                                </TabsTrigger>
                                <TabsTrigger value="Postponed">
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    Postponed
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="bg-white rounded-lg shadow">
                            <EventList
                                events={filteredEvents}
                                onView={handleView}
                                onEdit={(event) => {
                                    setSelectedEvent(event);
                                    setFormMode('edit');
                                    setIsFormOpen(true);
                                }}
                                onDelete={handleDelete}
                                onMarkCompleted={handleMarkCompleted}
                                onMarkCancelled={handleMarkCancelled}
                                onMarkScheduled={handleMarkScheduled}
                                onReschedule={handleReschedule}
                            />
                        </div>

                        <ViewEventModal
                            isOpen={viewModalOpen}
                            onClose={() => {
                                setViewModalOpen(false);
                                setSelectedEvent(null);
                            }}
                            event={selectedEvent}
                        />

                        <EventForm
                            isOpen={isFormOpen}
                            onClose={() => {
                                setIsFormOpen(false);
                                setSelectedEvent(null);
                            }}
                            event={selectedEvent}
                            mode={formMode}
                            employees={employees}
                            departments={departments}
                        />
                        
                        {/* Add RescheduleModal here */}
                        {console.log("Rendering RescheduleModal with props:", { 
                            isOpen: rescheduleModalOpen, 
                            event: selectedEvent 
                        })}
                        <RescheduleModal
                            isOpen={rescheduleModalOpen}
                            onClose={() => {
                                console.log("Closing reschedule modal");
                                setRescheduleModalOpen(false);
                                setSelectedEvent(null);
                            }}
                            event={selectedEvent}
                            onReschedule={() => {
                                // Reload or refresh events after rescheduling
                                window.location.reload();
                            }}
                        />
                        
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

export default EventPage;