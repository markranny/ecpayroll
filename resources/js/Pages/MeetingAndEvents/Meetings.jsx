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
    CalendarPlus,
    Eye,
    X,
    Shield,
    ShieldOff,
    Check,
    Calendar,
    Users,
    AlertCircle,
    Clock,
    MapPin,
    User,
    FileText,
    XCircle,
    CheckCircle,
    AlertTriangle,
    Video,
    Link
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
const handleReschedule = (meeting) => {
    console.log('Rescheduling meeting:', meeting);
    // First set the selected meeting
    setSelectedMeeting(meeting);
    // Then open the modal in the next render cycle to ensure meeting is set
    setTimeout(() => {
        setRescheduleModalOpen(true);
        console.log('Modal should be open:', true);
    }, 10);
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

// ViewMeetingModal Component
const ViewMeetingModal = ({ isOpen, onClose, meeting }) => {
    if (!isOpen || !meeting) return null;

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
            title="Meeting Details"
        >
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <div>
                    <h2 className="text-xl font-bold mb-2">{meeting.title}</h2>
                    <div className="flex items-center text-gray-600 mb-2">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                            {formatDate(meeting.start_time)} - {formatDate(meeting.end_time)}
                        </span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 mb-2">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{meeting.location || 'No location specified'}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 mb-2">
                        <User className="h-4 w-4 mr-2" />
                        <span>Organizer: {meeting.organizer}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 mb-4">
                        <Users className="h-4 w-4 mr-2" />
                        <span>Department: {meeting.department || 'All Departments'}</span>
                    </div>

                    <div className="mb-4">
                        {(() => {
                            switch(meeting.status) {
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
                                        {meeting.status}
                                    </span>;
                            }
                        })()}
                        
                        {meeting.is_recurring && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 ml-2">
                                <Calendar className="w-3 h-3 mr-1" />
                                Recurring
                            </span>
                        )}
                    </div>

                    <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-1">Agenda</h3>
                        <p className="text-gray-700 whitespace-pre-line">{meeting.agenda || 'No agenda provided.'}</p>
                    </div>

                    {meeting.is_recurring && meeting.recurrence_pattern && (
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold mb-1">Recurrence Pattern</h3>
                            <p className="text-gray-700">{meeting.recurrence_pattern}</p>
                        </div>
                    )}

                    {meeting.meeting_link && (
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold mb-1">Meeting Link</h3>
                            <a 
                                href={meeting.meeting_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center"
                            >
                                <Video className="h-4 w-4 mr-1" />
                                Join Meeting
                            </a>
                        </div>
                    )}

                    <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-2">Participants ({meeting.participants_count || 0})</h3>
                        {meeting.participants && meeting.participants.length > 0 ? (
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
                                        {meeting.participants.map((participant) => (
                                            <tr key={participant.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {`${participant.Lname}, ${participant.Fname}`}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {participant.Department || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${participant.pivot.attendance_status === 'Attended' ? 'bg-green-100 text-green-800' : 
                                                        participant.pivot.attendance_status === 'Absent' ? 'bg-red-100 text-red-800' :
                                                        participant.pivot.attendance_status === 'Confirmed' ? 'bg-blue-100 text-blue-800' :
                                                        participant.pivot.attendance_status === 'Declined' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'}`}
                                                    >
                                                        {participant.pivot.attendance_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500">No participants added to this meeting.</p>
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

// MeetingForm Component with employee search implementation from TravelOrderModal
const MeetingForm = ({ isOpen, onClose, meeting = null, mode = 'create' }) => {
    const [formData, setFormData] = useState({
        title: '',
        agenda: '',
        start_time: '',
        end_time: '',
        location: '',
        organizer: '',
        department: '',
        status: 'Scheduled',
        is_recurring: false,
        recurrence_pattern: '',
        meeting_link: '',
        participants: []
    });
    const [errors, setErrors] = useState({});
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [availableEmployees, setAvailableEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);

    // Fetch employees and departments when modal opens
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
                console.log('Employee response:', response.data);
                if (response.data && response.data.data) {
                    const emps = response.data.data;
                    setAvailableEmployees(emps);
                    setFilteredEmployees(emps);
                    
                    // Extract departments from employee data as fallback
                    const uniqueDepartments = [...new Set(
                        emps
                            .map(e => e.Department)
                            .filter(Boolean)
                    )];
                    setDepartments(uniqueDepartments);
                    console.log(`Extracted ${uniqueDepartments.length} unique departments from employee data`);
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
            
            // Also try to fetch departments separately
            axios.get('/departments', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                if (response.data && response.data.data) {
                    setDepartments(response.data.data);
                }
            })
            .catch(error => {
                console.error('Error fetching departments:', error);
                // This is ok, we already have departments extracted from employees as fallback
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
        
        console.log(`Filtered employees: ${filtered.length} matches`);
        setFilteredEmployees(filtered);
    }, [searchTerm, departmentFilter, availableEmployees]);

    useEffect(() => {
        if (meeting) {
            // Format dates for input fields
            const startTime = meeting.start_time ? new Date(meeting.start_time) : '';
            const endTime = meeting.end_time ? new Date(meeting.end_time) : '';
            
            setFormData({
                ...meeting,
                start_time: startTime ? startTime.toISOString().slice(0, 16) : '',
                end_time: endTime ? endTime.toISOString().slice(0, 16) : '',
                participants: meeting.participants ? meeting.participants.map(p => p.id) : []
            });
            
            if (meeting.participants) {
                setSelectedEmployees(meeting.participants);
            }
        } else {
            // Default for new meeting
            setFormData({
                title: '',
                agenda: '',
                start_time: '',
                end_time: '',
                location: '',
                organizer: '',
                department: '',
                status: 'Scheduled',
                is_recurring: false,
                recurrence_pattern: '',
                meeting_link: '',
                participants: []
            });
            setSelectedEmployees([]);
        }
    }, [meeting]);

  // In your MeetingForm component, replace the existing SweetAlert success notification:
// For the handleSubmit function in MeetingForm component
const handleSubmit = (e) => {
    e.preventDefault();
    
    // Clone formData to include participants
    const submitData = {
        ...formData,
        participants: selectedEmployees.map(emp => emp.id)
    };
    
    if (mode === 'create') {
        router.post('/meetings', submitData, {
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
                    text: 'Meeting scheduled successfully.',
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
        router.post(`/meetings/${meeting.id}`, {
            ...submitData,
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
                    text: 'Meeting updated successfully.',
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
                participants: [...prev.participants, employee.id]
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
                title: `${employee.Fname} ${employee.Lname} added to participants`
            });
        }
        setSearchTerm('');
    };

    const handleRemoveEmployee = (employeeId) => {
        const employeeToRemove = selectedEmployees.find(e => e.id === employeeId);
        setSelectedEmployees(selectedEmployees.filter(e => e.id !== employeeId));
        setFormData(prev => ({
            ...prev,
            participants: prev.participants.filter(id => id !== employeeId)
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
                title: `${employeeToRemove.Fname} ${employeeToRemove.Lname} removed from participants`
            });
        }
    };

    // Format employee name from Fname and Lname
    const getEmployeeName = (employee) => {
        return `${employee.Fname || ''} ${employee.Lname || ''}`.trim();
    };

    return (
        <Modal 
            show={isOpen} 
            onClose={onClose}
            title={mode === 'create' ? 'Schedule New Meeting' : 'Edit Meeting'}
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
                        <label htmlFor="agenda" className="block text-sm font-medium mb-1">
                            Agenda
                        </label>
                        <textarea
                            id="agenda"
                            name="agenda"
                            rows={3}
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.agenda}
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

                    <div className="col-span-2">
                        <div className="flex items-center mb-2">
                            <input
                                id="is_recurring"
                                name="is_recurring"
                                type="checkbox"
                                checked={formData.is_recurring}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-900">
                                This is a recurring meeting
                            </label>
                        </div>
                        
                        {formData.is_recurring && (
                            <div>
                                <select
                                    id="recurrence_pattern"
                                    name="recurrence_pattern"
                                    className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={formData.recurrence_pattern}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Recurrence Pattern</option>
                                    <option value="Daily">Daily</option>
                                    <option value="Weekly">Weekly</option>
                                    <option value="Bi-weekly">Bi-weekly</option>
                                    <option value="Monthly">Monthly</option>
                                    <option value="Quarterly">Quarterly</option>
                                    <option value="Custom">Custom</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="col-span-2">
                        <label htmlFor="meeting_link" className="block text-sm font-medium mb-1">
                            Meeting Link
                        </label>
                        <input
                            id="meeting_link"
                            name="meeting_link"
                            type="url"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.meeting_link}
                            onChange={handleChange}
                            placeholder="https://"
                        />
                    </div>

                    {/* Meeting Details */}
                    <div className="col-span-2">
                        <h3 className="text-lg font-semibold mb-3 mt-4">Meeting Details</h3>
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
                        <input
                            id="department"
                            name="department"
                            type="text"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.department}
                            onChange={handleChange}
                        />
                    </div>
                    
                    {/* Participants Section */}
                    <div className="col-span-2">
                        <h3 className="text-lg font-semibold mb-3 mt-4">Participants</h3>
                    </div>

                    <div className="col-span-2">
                        <div className="border rounded-lg p-4">
                            <div className="mb-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {/* Search Input */}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg 
                                            xmlns="http://www.w3.org/2000/svg" 
                                            className="h-4 w-4 text-gray-400" 
                                            fill="none" 
                                            viewBox="0 0 24 24" 
                                            stroke="currentColor"
                                        >
                                            <path 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round" 
                                                strokeWidth={2} 
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                                            />
                                        </svg>
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
                                                <option key={`dept-${deptId}`} value={deptName}>
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
                                                    <svg 
                                                        xmlns="http://www.w3.org/2000/svg" 
                                                        className="h-4 w-4" 
                                                        fill="none" 
                                                        viewBox="0 0 24 24" 
                                                        stroke="currentColor"
                                                    >
                                                        <path 
                                                            strokeLinecap="round" 
                                                            strokeLinejoin="round" 
                                                            strokeWidth={2} 
                                                            d="M12 4v16m8-8H4" 
                                                        />
                                                    </svg>
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
                                <h4 className="text-sm font-medium mb-2">Selected Participants ({selectedEmployees.length})</h4>
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
                                                                <svg 
                                                                    xmlns="http://www.w3.org/2000/svg" 
                                                                    className="h-4 w-4" 
                                                                    fill="none" 
                                                                    viewBox="0 0 24 24" 
                                                                    stroke="currentColor"
                                                                >
                                                                    <path 
                                                                        strokeLinecap="round" 
                                                                        strokeLinejoin="round" 
                                                                        strokeWidth={2} 
                                                                        d="M6 18L18 6M6 6l12 12" 
                                                                    />
                                                                </svg>
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No participants selected.</p>
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
                        {mode === 'create' ? 'Schedule Meeting' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
// RescheduleModal Component
const RescheduleModal = ({ isOpen, onClose, meeting, onReschedule }) => {
    const [formData, setFormData] = useState({
        start_time: '',
        end_time: '',
        status: 'Scheduled'
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (meeting) {
            // Format dates for input fields
            const startTime = meeting.start_time ? new Date(meeting.start_time) : '';
            const endTime = meeting.end_time ? new Date(meeting.end_time) : '';
            
            setFormData({
                start_time: startTime ? startTime.toISOString().slice(0, 16) : '',
                end_time: endTime ? endTime.toISOString().slice(0, 16) : '',
                status: 'Scheduled'
            });
        }
    }, [meeting]);

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
        
        // Use the router to update the meeting
        router.post(`/meetings/${meeting.id}/reschedule`, {
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
                    text: 'Meeting rescheduled successfully.',
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
            title="Reschedule Meeting"
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
                                    This will notify all participants about the schedule change. 
                                    The meeting status will be set to "Scheduled".
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
                        Reschedule Meeting
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
// Meeting List Component
const MeetingList = ({ meetings, onEdit, onDelete, onView, onMarkCompleted, onMarkCancelled, onMarkScheduled, onReschedule }) => {
    if (!meetings?.length) {
        return <div className="p-4 text-center text-gray-500">No meetings found</div>;
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
                            Participants
                        </th>
                    </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                    {meetings.map((meeting) => (
                        <tr key={meeting.id} className={`hover:bg-gray-50 ${
                            meeting.status === 'Cancelled' ? 'bg-red-50' : 
                            meeting.status === 'Postponed' ? 'bg-yellow-50' : ''
                        }`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-2">
                                    <Button 
                                        variant="outline"
                                        className="p-2"
                                        onClick={() => onView(meeting)}
                                        title="View Meeting"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>

                                    <Button 
                                        variant="secondary" 
                                        className="p-2"
                                        onClick={() => onEdit(meeting)}
                                        title="Edit Meeting"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    
                                    {/* Add Reschedule button for meetings that can be rescheduled */}
                                    {(meeting.status === 'Scheduled' || meeting.status === 'Postponed') && (
                                        <Button 
                                            variant="default"
                                            className="p-2 bg-purple-500 hover:bg-purple-600 text-white"
                                            onClick={() => onReschedule(meeting)}
                                            title="Reschedule Meeting"
                                        >
                                            <CalendarPlus className="h-4 w-4" />
                                        </Button>
                                    )}
                                    
                                    {meeting.status !== 'Completed' && (
                                        <Button 
                                            variant="default"
                                            className="p-2 bg-blue-500 hover:bg-blue-600 text-white"
                                            onClick={() => onMarkCompleted(meeting.id)}
                                            title="Mark as Completed"
                                        >
                                            <CheckCircle className="h-4 w-4" />
                                        </Button>
                                    )}
                                    
                                    {meeting.status !== 'Cancelled' && (
                                        <Button 
                                            variant="destructive"
                                            className="p-2"
                                            onClick={() => onMarkCancelled(meeting.id)}
                                            title="Cancel Meeting"
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    )}
                                   {(meeting.status === 'Cancelled' || meeting.status === 'Postponed') && (
    <Button 
        variant="default"
        className="p-2 bg-green-500 hover:bg-green-600 text-white"
        onClick={() => onReschedule(meeting)}
        title="Reschedule Meeting"
    >
        <CalendarPlus className="h-4 w-4" />
    </Button>
)}
                                    <Button 
                                        variant="destructive"
                                        className="p-2"
                                        onClick={() => onDelete(meeting.id)}
                                        title="Delete Meeting"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{meeting.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(meeting.start_time)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {getStatusBadge(meeting.status)}
                                {meeting.is_recurring && 
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 ml-1">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        Recurring
                                    </span>
                                }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {meeting.location || (meeting.meeting_link ? 
                                    <span className="inline-flex items-center text-blue-600">
                                        <Video className="h-4 w-4 mr-1" />
                                        Virtual
                                    </span> : '-')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meeting.organizer}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meeting.participants_count || 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
const MeetingPage = ({ meetings: initialMeetings, counts = {}, currentStatus = 'all', flash }) => {
    console.log('Initial meetings received:', initialMeetings);
    console.log('Current status:', currentStatus);
    
    // Using usePage() to get the auth user from the global Inertia page props
    const { auth: pageAuth } = usePage().props;
    const user = pageAuth?.user || {};
    
    // Ensure initialMeetings is always an array
    const safeMeetings = Array.isArray(initialMeetings) ? initialMeetings : [];
    
    const [filteredMeetings, setFilteredMeetings] = useState(safeMeetings);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [formMode, setFormMode] = useState('create');
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '',
        confirmVariant: 'destructive',
        onConfirm: () => {}
    });
    
    // Add a ref to track initialMeetings changes to avoid loops
    const previousMeetingsRef = useRef(null);
    
    // Fix: Properly initialize meetingCounts with defaults in case counts is undefined
    const meetingCounts = {
        total: (counts?.total !== undefined) ? counts.total : (safeMeetings.length || 0),
        scheduled: (counts?.scheduled !== undefined) ? counts.scheduled : (safeMeetings.filter(m => m?.status === 'Scheduled')?.length || 0),
        completed: (counts?.completed !== undefined) ? counts.completed : (safeMeetings.filter(m => m?.status === 'Completed')?.length || 0),
        cancelled: (counts?.cancelled !== undefined) ? counts.cancelled : (safeMeetings.filter(m => m?.status === 'Cancelled')?.length || 0),
        postponed: (counts?.postponed !== undefined) ? counts.postponed : (safeMeetings.filter(m => m?.status === 'Postponed')?.length || 0)
    };
    
    const [activeTab, setActiveTab] = useState(currentStatus || 'all');
    
    // Fix: Tracking if we've already fetched meetings via API
    const hasAttemptedFetch = useRef(false);

    // Debug state changes for modal visibility
    useEffect(() => {
        console.log('rescheduleModalOpen state changed:', rescheduleModalOpen);
        console.log('selectedMeeting:', selectedMeeting);
    }, [rescheduleModalOpen, selectedMeeting]);

    // If we don't have meetings data, fetch it directly - but only once
    useEffect(() => {
        // This check prevents the effect from running repeatedly
        if ((!initialMeetings || !Array.isArray(initialMeetings) || initialMeetings.length === 0) && !hasAttemptedFetch.current) {
            console.log('No meetings data from props, fetching directly...');
            hasAttemptedFetch.current = true; // Mark that we've attempted a fetch
            
            axios.get('/meetings/list', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                console.log('Direct API response:', response.data);
                if (response.data && response.data.meetings && Array.isArray(response.data.meetings)) {
                    setFilteredMeetings(response.data.meetings);
                }
            })
            .catch(error => {
                console.error('Error fetching meetings via API:', error);
            });
        }
    }, []); // Empty dependency array to run only once

    // Fix: Improved filtering effect with better dependency tracking
    useEffect(() => {
        // Check if initialMeetings has actually changed
        const meetingsChanged = JSON.stringify(previousMeetingsRef.current) !== JSON.stringify(safeMeetings);
        
        if (meetingsChanged || searchTerm !== '' || activeTab !== 'all') {
            console.log('Filtering meetings based on:', { searchTerm, activeTab });
            
            let filtered = [...safeMeetings];
            
            // Filter by status tab
            if (activeTab !== 'all') {
                filtered = filtered.filter(meeting => meeting.status === activeTab);
            }
            
            // Filter by search term
            if (searchTerm) {
                filtered = filtered.filter(meeting => 
                    (meeting.title && meeting.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (meeting.location && meeting.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (meeting.organizer && meeting.organizer.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (meeting.department && meeting.department.toLowerCase().includes(searchTerm.toLowerCase()))
                );
            }
            
            setFilteredMeetings(filtered);
            
            // Update the ref to current meetings
            previousMeetingsRef.current = safeMeetings;
        }
    }, [searchTerm, activeTab]); // Remove safeMeetings from dependencies
    
    // Add a separate effect to update filteredMeetings when initialMeetings changes
    useEffect(() => {
        if (JSON.stringify(previousMeetingsRef.current) !== JSON.stringify(safeMeetings)) {
            console.log('Meetings data changed, updating filtered meetings');
            previousMeetingsRef.current = safeMeetings;
            
            let filtered = [...safeMeetings];
            
            // Apply existing filters
            if (activeTab !== 'all') {
                filtered = filtered.filter(meeting => meeting.status === activeTab);
            }
            
            if (searchTerm) {
                filtered = filtered.filter(meeting => 
                    (meeting.title && meeting.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (meeting.location && meeting.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (meeting.organizer && meeting.organizer.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (meeting.department && meeting.department.toLowerCase().includes(searchTerm.toLowerCase()))
                );
            }
            
            setFilteredMeetings(filtered);
        }
    }, [safeMeetings]);

    const handleView = (meeting) => {
        setSelectedMeeting(meeting);
        setViewModalOpen(true);
    };

    // Add handle function for rescheduling
    const handleReschedule = (meeting) => {
        console.log('Rescheduling meeting:', meeting);
        setSelectedMeeting(meeting);
        setRescheduleModalOpen(true);
        console.log('Modal should be open:', true);
    };

    // For handleDelete function
    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Meeting',
            message: 'Are you sure you want to delete this meeting? This action cannot be undone.',
            confirmText: 'Delete',
            confirmVariant: 'destructive',
            onConfirm: () => {
                // Using POST with _method: 'DELETE' for method spoofing
                router.post(`/meetings/${id}`, {
                    _method: 'DELETE'
                }, {
                    onSuccess: () => {
                        setConfirmModal({...confirmModal, isOpen: false});
                        
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
                            title: 'Meeting deleted successfully',
                            iconHtml: '<div class="rounded-full bg-green-100 p-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg></div>',
                            customClass: {
                                popup: 'px-6 py-4 rounded-lg shadow-md flex items-start',
                                title: 'text-gray-700 ml-3 font-medium'
                            }
                        });
                    },
                    onError: (error) => {
                        console.error('Delete failed:', error);
                        
                        // Error toast notification
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'error',
                            title: 'Failed to delete meeting',
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
            title: 'Mark Meeting as Completed',
            message: 'Are you sure you want to mark this meeting as completed?',
            confirmText: 'Mark Completed',
            confirmVariant: 'default',
            onConfirm: () => {
                // Make sure this route exists in your Laravel routes
                axios.post(`/meetings/${id}/mark-completed`)
                    .then(response => {
                        setConfirmModal({...confirmModal, isOpen: false});
                        
                        // Show success notification
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
                            title: 'Meeting marked as completed',
                            iconHtml: '<div class="rounded-full bg-green-100 p-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg></div>',
                            customClass: {
                                popup: 'px-6 py-4 rounded-lg shadow-md flex items-start',
                                title: 'text-gray-700 ml-3 font-medium'
                            }
                        });
                        
                        // Refresh the meetings data
                        window.location.reload();
                    })
                    .catch(error => {
                        console.error('Failed to mark meeting as completed:', error);
                        
                        // Show error notification
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'error',
                            title: 'Failed to update meeting status',
                            showConfirmButton: false,
                            timer: 3000
                        });
                    });
            }
        });
    };

    // For the handleMarkCancelled function
    const handleMarkCancelled = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancel Meeting',
            message: 'Are you sure you want to cancel this meeting?',
            confirmText: 'Cancel Meeting',
            confirmVariant: 'destructive',
            onConfirm: () => {
                // Make sure this route exists in your Laravel routes
                axios.post(`/meetings/${id}/mark-cancelled`)
                    .then(response => {
                        setConfirmModal({...confirmModal, isOpen: false});
                        
                        // Show success notification
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
                            title: 'Meeting cancelled successfully',
                            iconHtml: '<div class="rounded-full bg-green-100 p-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg></div>',
                            customClass: {
                                popup: 'px-6 py-4 rounded-lg shadow-md flex items-start',
                                title: 'text-gray-700 ml-3 font-medium'
                            }
                        });
                        
                        // Refresh the meetings data
                        window.location.reload();
                    })
                    .catch(error => {
                        console.error('Failed to cancel meeting:', error);
                        
                        // Show error notification
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'error',
                            title: 'Failed to cancel meeting',
                            showConfirmButton: false,
                            timer: 3000
                        });
                    });
            }
        });
    };
    
    // For handleMarkScheduled function (corrected to use the proper meetings endpoint)
    const handleMarkScheduled = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Reschedule Meeting',
            message: 'Are you sure you want to mark this meeting as scheduled?',
            confirmText: 'Schedule',
            confirmVariant: 'default',
            onConfirm: () => {
                // Fixed to use the correct endpoint for meetings
                router.post(`/meetings/${id}/mark-scheduled`, {
                    status: 'Scheduled'
                }, {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        setConfirmModal({...confirmModal, isOpen: false});
                        
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
                            title: 'Meeting rescheduled successfully',
                            iconHtml: '<div class="rounded-full bg-green-100 p-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg></div>',
                            customClass: {
                                popup: 'px-6 py-4 rounded-lg shadow-md flex items-start',
                                title: 'text-gray-700 ml-3 font-medium'
                            }
                        });
                    },
                    onError: () => {
                        // Error toast notification
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'error',
                            title: 'Failed to reschedule meeting',
                            showConfirmButton: false,
                            timer: 3000
                        });
                    }
                });
            }
        });
    };

    // Fix: Prevent unnecessary router calls
    const handleTabChange = (value) => {
        if (value !== activeTab) {
            setActiveTab(value);
            
            // Debounce the router call to prevent rapid state changes
            const timeoutId = setTimeout(() => {
                router.visit(`/meetings?status=${value}`, {
                    preserveState: true,
                    preserveScroll: true,
                    only: ['meetings', 'currentStatus']
                });
            }, 300);
            
            return () => clearTimeout(timeoutId);
        }
    };

    return (
        <AuthenticatedLayout user={user}>
            <Head title="Meeting Management" />
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
                                    Meeting Management
                                </h1>
                                <p className="text-gray-600">
                                    Schedule and manage company meetings.
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <Button
                                    onClick={() => {
                                        setFormMode('create');
                                        setSelectedMeeting(null);
                                        setIsFormOpen(true);
                                    }}
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                                >
                                    <CalendarPlus className="w-5 h-5 mr-2" />
                                    Schedule Meeting
                                </Button>
                            </div>
                        </div>
                        
                        {/* Status Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <StatusCard 
                                title="Total Meetings" 
                                count={meetingCounts.total}
                                icon={<Calendar className="h-6 w-6 text-indigo-600" />}
                                bgColor="bg-white"
                                textColor="text-gray-600"
                            />
                            <StatusCard 
                                title="Scheduled" 
                                count={meetingCounts.scheduled}
                                icon={<Clock className="h-6 w-6 text-green-600" />}
                                bgColor="bg-white"
                                textColor="text-gray-600"
                            />
                            <StatusCard 
                                title="Completed" 
                                count={meetingCounts.completed}
                                icon={<CheckCircle className="h-6 w-6 text-blue-600" />}
                                bgColor="bg-white" 
                                textColor="text-gray-600"
                            />
                            <StatusCard 
                                title="Cancelled" 
                                count={meetingCounts.cancelled}
                                icon={<XCircle className="h-6 w-6 text-red-600" />}
                                bgColor="bg-white"
                                textColor="text-gray-600"
                            />
                        </div>
                        <div className="flex gap-4 mb-6">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search meetings..."
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        {/* Tabs for filtering by status */}
                        <Tabs defaultValue={activeTab} className="mb-6" onValueChange={handleTabChange}>
                            <TabsList className="grid grid-cols-5 w-full">
                                <TabsTrigger value="all">All Meetings</TabsTrigger>
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
                            <MeetingList
                                meetings={filteredMeetings}
                                onView={handleView}
                                onEdit={(meeting) => {
                                    setSelectedMeeting(meeting);
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

                        <ViewMeetingModal
                            isOpen={viewModalOpen}
                            onClose={() => {
                                setViewModalOpen(false);
                                setSelectedMeeting(null);
                            }}
                            meeting={selectedMeeting}
                        />

                        <MeetingForm
                            isOpen={isFormOpen}
                            onClose={() => {
                                setIsFormOpen(false);
                                setSelectedMeeting(null);
                            }}
                            meeting={selectedMeeting}
                            mode={formMode}
                        />
                        
                        {/* Make sure RescheduleModal is rendered correctly */}
                        {/* Adding a direct console.log to check if this part of JSX is being rendered */}
                        {console.log("Rendering RescheduleModal with props:", { 
                            isOpen: rescheduleModalOpen, 
                            meeting: selectedMeeting 
                        })}
                        <RescheduleModal
                            isOpen={rescheduleModalOpen}
                            onClose={() => {
                                console.log("Closing reschedule modal");
                                setRescheduleModalOpen(false);
                                setSelectedMeeting(null);
                            }}
                            meeting={selectedMeeting}
                            onReschedule={() => {
                                // Reload or refresh meetings after rescheduling
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

export default MeetingPage; 