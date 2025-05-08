import React, { useState, useEffect, useRef } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import Swal from 'sweetalert2';
import { 
    Calendar, 
    Search, 
    Filter, 
    ChevronDown, 
    Eye, 
    Edit2, 
    Trash2,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    Users,
    CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Modal from '@/Components/Modal';

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
    <div className={`flex space-x-1 rounded-lg bg-gray-100 p-1 ${className}`}>
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
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
        isActive
          ? 'bg-white text-gray-900 shadow-sm' 
          : 'text-gray-600 hover:text-gray-900'
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

// Event Details Modal Component
const EventDetailsModal = ({ isOpen, onClose, event, onEdit, onMarkCompleted, onMarkCancelled, onMarkScheduled }) => {
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

    const getEventTypeLabel = (type) => {
        return event.eventType === 'meeting' ? 'Meeting' : 'Event';
    };

    const getAttendeesList = () => {
        if (event.eventType === 'meeting') {
            return event.participants || [];
        } else {
            return event.attendees || [];
        }
    };

    const handleEdit = () => {
        onClose();
        onEdit(event);
    };

    const handleMarkCompleted = () => {
        onClose();
        onMarkCompleted(event.id, event.eventType);
    };

    const handleMarkCancelled = () => {
        onClose();
        onMarkCancelled(event.id, event.eventType);
    };

    const handleMarkScheduled = () => {
        onClose();
        onMarkScheduled(event.id, event.eventType);
    };

    const attendees = getAttendeesList();
    const attendeeCount = attendees ? attendees.length : 0;

    return (
        <Modal 
            show={isOpen} 
            onClose={onClose}
            title={`${getEventTypeLabel(event.eventType)} Details`}
        >
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <div>
                    <h2 className="text-xl font-bold mb-2 text-gray-900">{event.title}</h2>
                    <div className="flex items-center text-gray-600 mb-2">
                        <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
                        <span>
                            {formatDate(event.start)} - {formatDate(event.end)}
                        </span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 mb-4">
                        <Clock className="h-4 w-4 mr-2 text-indigo-500" />
                        <span>{event.eventType === 'meeting' ? 'Meeting' : 'Event'}</span>
                    </div>

                    <div className="mb-4">
                        {getStatusBadge(event.status)}
                    </div>

                    <div className="mb-4 bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-1 text-gray-800">Description</h3>
                        <p className="text-gray-700 whitespace-pre-line">
                            {event.eventType === 'meeting' ? (event.agenda || 'No agenda provided.') : (event.description || 'No description provided.')}
                        </p>
                    </div>

                    <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800 flex items-center">
                            <Users className="w-4 h-4 mr-2 text-indigo-500" />
                            {event.eventType === 'meeting' ? 'Participants' : 'Attendees'} ({attendeeCount})
                        </h3>
                        {attendeeCount > 0 ? (
                            <div className="border rounded-lg overflow-hidden shadow-sm">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {attendees.map((person) => (
                                            <tr key={person.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {`${person.Fname || ''} ${person.Lname || ''}`}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {person.Department || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">No {event.eventType === 'meeting' ? 'participants' : 'attendees'} added.</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg border-t">
                <div className="flex space-x-2">
                    {event.status !== 'Completed' && (
                        <Button 
                            onClick={handleMarkCompleted}
                            className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                        >
                            <CheckCircle className="h-4 w-4 mr-1" /> Mark as Completed
                        </Button>
                    )}
                    
                    {event.status !== 'Cancelled' && (
                        <Button 
                            onClick={handleMarkCancelled}
                            variant="destructive"
                            className="shadow-sm"
                        >
                            <XCircle className="h-4 w-4 mr-1" /> Cancel
                        </Button>
                    )}
                    
                    {(event.status === 'Cancelled' || event.status === 'Postponed') && (
                        <Button 
                            onClick={handleMarkScheduled}
                            className="bg-green-600 hover:bg-green-700 shadow-sm"
                        >
                            <Calendar className="h-4 w-4 mr-1" /> Mark as Scheduled
                        </Button>
                    )}
                    
                    <Button 
                        onClick={handleEdit}
                        variant="secondary"
                        className="shadow-sm"
                    >
                        <Edit2 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    
                    <Button 
                        onClick={onClose}
                        variant="outline"
                        className="shadow-sm"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// Legend Component for calendar colors
const CalendarLegend = () => (
    <div className="flex flex-wrap gap-4 mt-4 p-4 bg-white rounded-lg border border-gray-100 shadow-sm text-sm">
        <div className="flex items-center">
            <span className="inline-block w-4 h-4 mr-2 rounded-full bg-purple-500 shadow-sm"></span>
            <span className="text-gray-700">Events (Scheduled)</span>
        </div>
        <div className="flex items-center">
            <span className="inline-block w-4 h-4 mr-2 rounded-full bg-emerald-500 shadow-sm"></span>
            <span className="text-gray-700">Meetings (Scheduled)</span>
        </div>
        <div className="flex items-center">
            <span className="inline-block w-4 h-4 mr-2 rounded-full bg-blue-500 shadow-sm"></span>
            <span className="text-gray-700">Completed</span>
        </div>
        <div className="flex items-center">
            <span className="inline-block w-4 h-4 mr-2 rounded-full bg-red-500 shadow-sm"></span>
            <span className="text-gray-700">Cancelled</span>
        </div>
        <div className="flex items-center">
            <span className="inline-block w-4 h-4 mr-2 rounded-full bg-amber-500 shadow-sm"></span>
            <span className="text-gray-700">Postponed</span>
        </div>
    </div>
);

// Summary Card Component
const SummaryCard = ({ icon, title, count, color }) => (
    <Card className="border-t-4 shadow-md hover:shadow-lg transition-shadow duration-200" style={{ borderTopColor: color }}>
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <p className="text-2xl font-bold">{count}</p>
                </div>
                <div className={`p-3 rounded-full`} style={{ backgroundColor: `${color}20` }}>
                    {icon}
                </div>
            </div>
        </CardContent>
    </Card>
);

const HrCalendar = () => {
    const { auth, flash } = usePage().props;
    const [events, setEvents] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [departments, setDepartments] = useState([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const [eventDetailsModalOpen, setEventDetailsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [displayView, setDisplayView] = useState('calendar');
    const [error, setError] = useState(null);

    const calendarRef = useRef(null);

    // Fetch events and meetings when component mounts
    useEffect(() => {
        fetchData();
        fetchDepartments();
    }, []);

    // Fetch events and meetings from backend
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Use our new API endpoint that combines both events and meetings
            const response = await axios.get('/hr-calendar/data', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                params: {
                    search: searchTerm,
                    department: departmentFilter,
                    status: statusFilter
                }
            });

            const fetchedEvents = response.data.events || [];
            const fetchedMeetings = response.data.meetings || [];
            
            // Process data to handle multi-day events
            const processedData = processEventsForCalendar(fetchedEvents, fetchedMeetings);
            
            setEvents(fetchedEvents);
            setMeetings(fetchedMeetings);
            setCalendarEvents(processedData);
            
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to load calendar data. Please try again later.');
            // Show SweetAlert error notification
            Swal.fire({
                title: 'Error!',
                text: 'Failed to load calendar data. Please try again later.',
                icon: 'error',
                confirmButtonText: 'OK',
                customClass: {
                    confirmButton: 'btn btn-primary'
                }
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Process events for calendar display - handle multi-day events differently
    const processEventsForCalendar = (events, meetings) => {
        const processedEvents = [];
        
        // Process events
        events.forEach(event => {
            const startDate = new Date(event.start_time);
            const endDate = new Date(event.end_time);
            
            // Format time for display
            const formattedTime = formatTimeWithCode(startDate, event.code || 'dawd');
            
            // Convert to an entry for each day instead of spanning
            if (isSameDay(startDate, endDate)) {
                // Single day event
                processedEvents.push({
                    id: `event_${event.id}`,
                    title: formattedTime,
                    start: startDate,
                    end: endDate,
                    allDay: false,
                    extendedProps: {
                        type: 'event',
                        status: event.status,
                        originalEvent: event
                    },
                    backgroundColor: getEventColor('event', event.status),
                    display: 'block'
                });
            } else {
                // Multi-day event - create separate entries for each day
                const dayDiff = getDayDifference(startDate, endDate);
                
                for (let i = 0; i <= dayDiff; i++) {
                    const currentDate = new Date(startDate);
                    currentDate.setDate(startDate.getDate() + i);
                    
                    // For first day, use actual start time
                    // For last day, use actual end time
                    // For in-between days, use all day
                    
                    const isFirstDay = i === 0;
                    const isLastDay = i === dayDiff;
                    
                    let dayEntry = {
                        id: `event_${event.id}_day_${i}`,
                        title: formattedTime,
                        start: new Date(currentDate),
                        allDay: !(isFirstDay || isLastDay),
                        extendedProps: {
                            type: 'event',
                            status: event.status,
                            originalEvent: event,
                            isMultiDay: true,
                            dayPart: isFirstDay ? 'start' : isLastDay ? 'end' : 'middle'
                        },
                        backgroundColor: getEventColor('event', event.status),
                        display: 'block'
                    };
                    
                    if (isFirstDay) {
                        // First day: use start time from the event
                        dayEntry.start = startDate;
                        dayEntry.end = new Date(currentDate);
                        dayEntry.end.setHours(23, 59, 59);
                    } else if (isLastDay) {
                        // Last day: use end time from the event
                        dayEntry.start = new Date(currentDate);
                        dayEntry.start.setHours(0, 0, 0);
                        dayEntry.end = endDate;
                    } else {
                        // Middle days: all day
                        dayEntry.start = new Date(currentDate);
                        dayEntry.start.setHours(0, 0, 0);
                        dayEntry.end = new Date(currentDate);
                        dayEntry.end.setHours(23, 59, 59);
                    }
                    
                    processedEvents.push(dayEntry);
                }
            }
        });
        
        // Process meetings
        meetings.forEach(meeting => {
            const startDate = new Date(meeting.start_time);
            const endDate = new Date(meeting.end_time);
            
            // Format time for display
            const formattedTime = formatTimeWithCode(startDate, meeting.code || 'DAW');
            
            // Most meetings are single day, but handle multi-day meetings similarly
            if (isSameDay(startDate, endDate)) {
                // Single day meeting
                processedEvents.push({
                    id: `meeting_${meeting.id}`,
                    title: formattedTime,
                    start: startDate,
                    end: endDate,
                    allDay: false,
                    extendedProps: {
                        type: 'meeting',
                        status: meeting.status,
                        originalEvent: meeting
                    },
                    backgroundColor: getEventColor('meeting', meeting.status),
                    display: 'block'
                });
            } else {
                // Multi-day meeting - create separate entries for each day
                const dayDiff = getDayDifference(startDate, endDate);
                
                for (let i = 0; i <= dayDiff; i++) {
                    const currentDate = new Date(startDate);
                    currentDate.setDate(startDate.getDate() + i);
                    
                    const isFirstDay = i === 0;
                    const isLastDay = i === dayDiff;
                    
                    let dayEntry = {
                        id: `meeting_${meeting.id}_day_${i}`,
                        title: formattedTime,
                        start: new Date(currentDate),
                        allDay: !(isFirstDay || isLastDay),
                        extendedProps: {
                            type: 'meeting',
                            status: meeting.status,
                            originalEvent: meeting,
                            isMultiDay: true,
                            dayPart: isFirstDay ? 'start' : isLastDay ? 'end' : 'middle'
                        },
                        backgroundColor: getEventColor('meeting', meeting.status),
                        display: 'block'
                    };
                    
                    if (isFirstDay) {
                        // First day: use start time from the meeting
                        dayEntry.start = startDate;
                        dayEntry.end = new Date(currentDate);
                        dayEntry.end.setHours(23, 59, 59);
                    } else if (isLastDay) {
                        // Last day: use end time from the meeting
                        dayEntry.start = new Date(currentDate);
                        dayEntry.start.setHours(0, 0, 0);
                        dayEntry.end = endDate;
                    } else {
                        // Middle days: all day
                        dayEntry.start = new Date(currentDate);
                        dayEntry.start.setHours(0, 0, 0);
                        dayEntry.end = new Date(currentDate);
                        dayEntry.end.setHours(23, 59, 59);
                    }
                    
                    processedEvents.push(dayEntry);
                }
            }
        });
        
        return processedEvents;
    };

    // Helper functions for date handling
    const isSameDay = (date1, date2) => {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    };
    
    const getDayDifference = (date1, date2) => {
        const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
        // Clear time part for accurate day difference
        const d1 = new Date(date1);
        d1.setHours(0, 0, 0, 0);
        const d2 = new Date(date2);
        d2.setHours(0, 0, 0, 0);
        
        return Math.round(Math.abs((d2 - d1) / oneDay));
    };
    
    // Format time with code in the specific format: "04:10 PM DAW"
    const formatTimeWithCode = (date, code) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        
        return `${formattedHours}:${formattedMinutes} ${ampm} ${code}`;
    };

    // Fetch departments for filtering
    const fetchDepartments = async () => {
        try {
            const response = await axios.get('/hr-calendar/departments', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.data) {
                setDepartments(response.data);
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
            // Non-critical error, no need for user notification
        }
    };

    // Get color based on event type and status
    const getEventColor = (type, status) => {
        if (status === 'Cancelled') {
            return '#ef4444'; // Red for cancelled events/meetings
        } else if (status === 'Postponed') {
            return '#f59e0b'; // Amber for postponed events/meetings
        } else if (status === 'Completed') {
            return '#3b82f6'; // Blue for completed events/meetings
        } else {
            // Default colors for scheduled events based on type
            return type === 'event' ? '#8b5cf6' : '#10b981'; // Purple for events, Green for meetings
        }
    };

    // Apply filters by fetching new data from API
    useEffect(() => {
        if (searchTerm || departmentFilter || statusFilter) {
            // Only refetch if filters have actually been applied
            fetchData();
        }
    }, [searchTerm, departmentFilter, statusFilter]);
    
    // Custom render for event content
    const eventContent = (eventInfo) => {
        const { event } = eventInfo;
        const extendedProps = event.extendedProps;
        
        // Get the status color and type
        let backgroundColor = event.backgroundColor;
        let dotColor = backgroundColor; // Dot indicator for event type/status
        
        // Get any status indicators/badges
        let statusIndicator = null;
        if (extendedProps.status === 'Cancelled') {
            statusIndicator = <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>;
        } else if (extendedProps.status === 'Postponed') {
            statusIndicator = <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1"></span>;
        } else if (extendedProps.status === 'Completed') {
            statusIndicator = <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>;
        }
        
        return (
            <div className="fc-event-custom">
                <div className="flex items-center">
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: dotColor }}></span>
                    {statusIndicator}
                    <span className="truncate text-xs">{event.title}</span>
                </div>
            </div>
        );
    };

    // Handle clicking on an event in the calendar
    const handleEventClick = (info) => {
        const event = info.event;
        const extendedProps = event.extendedProps;
        const originalEvent = extendedProps.originalEvent;
        
        // If this is a multi-day split event, we need to get the original event
        if (extendedProps.isMultiDay) {
            const eventType = extendedProps.type;
            const eventId = originalEvent.id;
            
            // Find the original event from our state
            let fullEvent = null;
            if (eventType === 'event') {
                fullEvent = events.find(e => e.id === eventId);
            } else {
                fullEvent = meetings.find(m => m.id === eventId);
            }
            
            if (fullEvent) {
                // Format the event for the modal
                const adaptedEvent = {
                    ...fullEvent,
                    start: fullEvent.start_time,
                    end: fullEvent.end_time,
                    id: `${eventType}_${fullEvent.id}`,
                    eventType: eventType
                };
                
                setSelectedEvent(adaptedEvent);
                setEventDetailsModalOpen(true);
            }
        } else {
            // Regular event handling (non-split)
            const id = event.id; // This will be in the format "event_123" or "meeting_456"
            let selectedItem = null;
            
            // Check if this is an event or a meeting based on the ID format
            if (id.startsWith('event_')) {
                const eventId = id.split('_')[1];
                selectedItem = events.find(event => event.id === eventId);
                if (selectedItem) {
                    selectedItem.eventType = 'event';
                }
            } else if (id.startsWith('meeting_')) {
                const meetingId = id.split('_')[1];
                selectedItem = meetings.find(meeting => meeting.id === meetingId);
                if (selectedItem) {
                    selectedItem.eventType = 'meeting';
                }
            }
            
            if (selectedItem) {
                // Adapt the selectedItem to match the structure expected by the modal
                const adaptedItem = {
                    ...selectedItem,
                    start: selectedItem.start_time,
                    end: selectedItem.end_time,
                    id: id
                };
                
                setSelectedEvent(adaptedItem);
                setEventDetailsModalOpen(true);
            }
        }
    };

    // Navigate to the appropriate edit page
    const handleEditEvent = (event) => {
        if (event.eventType === 'event') {
            router.visit('/events', {
                data: { editEventId: event.id }
            });
        } else {
            router.visit('/meetings', {
                data: { editMeetingId: event.id }
            });
        }
    };

    // Handle marking an event as completed
    const handleMarkCompleted = (id, type) => {
        // Extract the actual ID from the format used in calendar (event_123 or meeting_456)
        const actualId = typeof id === 'string' && id.includes('_') ? id.split('_')[1] : id;
        
        const endpoint = type === 'event' 
            ? `/events/${actualId}/update-status` 
            : `/meetings/${actualId}/mark-completed`;
            
        const data = type === 'event' ? { status: 'Completed' } : {};
        
        axios.post(endpoint, data)
            .then(response => {
                // Show success notification
                Swal.fire({
                    title: 'Success!',
                    text: `${type === 'event' ? 'Event' : 'Meeting'} marked as completed.`,
                    icon: 'success',
                    confirmButtonText: 'OK',
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    }
                });
                
                // Refresh data
                fetchData();
            })
            .catch(error => {
                console.error('Error updating status:', error);
                
                // Show error notification
                Swal.fire({
                    title: 'Error!',
                    text: `Failed to mark ${type} as completed.`,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            });
    };

    // Handle marking an event as cancelled
    const handleMarkCancelled = (id, type) => {
        // Extract the actual ID from the format used in calendar (event_123 or meeting_456)
        const actualId = typeof id === 'string' && id.includes('_') ? id.split('_')[1] : id;
        
        const endpoint = type === 'event' 
            ? `/events/${actualId}/update-status` 
            : `/meetings/${actualId}/mark-cancelled`;
            
        const data = type === 'event' ? { status: 'Cancelled' } : {};
        
        axios.post(endpoint, data)
            .then(response => {
                // Show success notification
                Swal.fire({
                    title: 'Success!',
                    text: `${type === 'event' ? 'Event' : 'Meeting'} marked as cancelled.`,
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
                
                // Refresh data
                fetchData();
            })
            .catch(error => {
                console.error('Error updating status:', error);
                
                // Show error notification
                Swal.fire({
                    title: 'Error!',
                    text: `Failed to mark ${type} as cancelled.`,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            });
    };

    // Handle marking an event as scheduled
    const handleMarkScheduled = (id, type) => {
        // Extract the actual ID from the format used in calendar (event_123 or meeting_456)
        const actualId = typeof id === 'string' && id.includes('_') ? id.split('_')[1] : id;
        
        const endpoint = type === 'event' 
            ? `/events/${actualId}/update-status` 
            : `/meetings/${actualId}/mark-scheduled`;
            
        const data = type === 'event' ? { status: 'Scheduled' } : {};
        
        axios.post(endpoint, data)
            .then(response => {
                // Show success notification
                Swal.fire({
                    title: 'Success!',
                    text: `${type === 'event' ? 'Event' : 'Meeting'} marked as scheduled.`,
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
                
                // Refresh data
                fetchData();
            })
            .catch(error => {
                console.error('Error updating status:', error);
                
                // Show error notification
                Swal.fire({
                    title: 'Error!',
                    text: `Failed to mark ${type} as scheduled.`,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            });
    };

    // Calculate summary counts
    const getEventCountsByStatus = () => {
        const scheduled = events.filter(event => event.status === 'Scheduled').length + 
                          meetings.filter(meeting => meeting.status === 'Scheduled').length;
        const completed = events.filter(event => event.status === 'Completed').length + 
                          meetings.filter(meeting => meeting.status === 'Completed').length;
        const cancelled = events.filter(event => event.status === 'Cancelled').length + 
                          meetings.filter(meeting => meeting.status === 'Cancelled').length;
        const postponed = events.filter(event => event.status === 'Postponed').length + 
                          meetings.filter(meeting => meeting.status === 'Postponed').length;
        
        return {
            scheduled,
            completed,
            cancelled,
            postponed,
            total: events.length + meetings.length
        };
    };

    const counts = getEventCountsByStatus();

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="HR Calendar" />
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <div className="flex-1 p-6">
                    <div className="max-w-7xl mx-auto">
                        {flash?.message && (
                            <Alert className="mb-6">
                                <AlertDescription>{flash.message}</AlertDescription>
                            </Alert>
                        )}

                        {error && (
                            <Alert className="mb-6 bg-red-50 border border-red-200 text-red-800">
                                <AlertDescription className="text-red-700">{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Header Section */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center">
                                        <CalendarDays className="h-6 w-6 mr-2 text-indigo-600" />
                                        HR Calendar
                                    </h1>
                                    <p className="text-gray-600">
                                        View and manage all your meetings and events in one place.
                                    </p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <Button
                                        onClick={() => router.visit('/events', { data: { openEventForm: true } })}
                                        className="bg-purple-600 hover:bg-purple-700 shadow-sm"
                                    >
                                        <Calendar className="h-4 w-4 mr-2" />
                                        Create Event
                                    </Button>
                                    <Button
                                        onClick={() => router.visit('/meetings', { data: { openMeetingForm: true } })}
                                        className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                                    >
                                        <Users className="h-4 w-4 mr-2" />
                                        Schedule Meeting
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                            <SummaryCard 
                                icon={<Calendar className="h-5 w-5 text-indigo-600" />} 
                                title="Total Events" 
                                count={counts.total}
                                color="#6366f1" // indigo
                            />
                            <SummaryCard 
                                icon={<Calendar className="h-5 w-5 text-emerald-600" />} 
                                title="Scheduled" 
                                count={counts.scheduled}
                                color="#10b981" // emerald
                            />
                            <SummaryCard 
                                icon={<CheckCircle className="h-5 w-5 text-blue-600" />} 
                                title="Completed" 
                                count={counts.completed}
                                color="#3b82f6" // blue
                            />
                            <SummaryCard 
                                icon={<XCircle className="h-5 w-5 text-red-600" />} 
                                title="Cancelled" 
                                count={counts.cancelled}
                                color="#ef4444" // red
                            />
                            <SummaryCard 
                                icon={<AlertTriangle className="h-5 w-5 text-amber-600" />} 
                                title="Postponed" 
                                count={counts.postponed}
                                color="#f59e0b" // amber
                            />
                        </div>

                        {/* Filter Section */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <div className="relative flex-grow">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <input
                                        type="text"
                                        placeholder="Search events and meetings..."
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                
                                <div className="inline-flex">
                                    <Button
                                        variant="outline"
                                        onClick={() => setFilterOpen(!filterOpen)}
                                        className="flex items-center shadow-sm hover:bg-gray-50"
                                    >
                                        <Filter className="h-4 w-4 mr-2 text-indigo-500" />
                                        Filters
                                        <ChevronDown className={`h-4 w-4 ml-2 transform ${filterOpen ? 'rotate-180' : ''} text-indigo-500`} />
                                    </Button>
                                    
                                    <Tabs
                                        defaultValue={displayView}
                                        onValueChange={setDisplayView}
                                        className="ml-4"
                                    >
                                        <TabsList className="bg-gray-100 shadow-inner">
                                            <TabsTrigger value="calendar">Calendar</TabsTrigger>
                                            <TabsTrigger value="month">Month</TabsTrigger>
                                            <TabsTrigger value="week">Week</TabsTrigger>
                                            <TabsTrigger value="list">List</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>
                            </div>
                            
                            {filterOpen && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                                    <div>
                                        <label htmlFor="departmentFilter" className="block text-sm font-medium text-gray-700 mb-1">
                                            Department
                                        </label>
                                        <select
                                            id="departmentFilter"
                                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                            value={departmentFilter}
                                            onChange={(e) => setDepartmentFilter(e.target.value)}
                                        >
                                            <option value="">All Departments</option>
                                            {departments.map((dept, index) => (
                                                <option key={index} value={dept.name || dept}>
                                                    {dept.name || dept}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                                            Status
                                        </label>
                                        <select
                                            id="statusFilter"
                                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                        >
                                            <option value="">All Statuses</option>
                                            <option value="Scheduled">Scheduled</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Cancelled">Cancelled</option>
                                            <option value="Postponed">Postponed</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Calendar Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-hidden">
                        {isLoading ? (
                                <div className="h-96 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                                        <p className="mt-2 text-gray-600">Loading calendar...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-auto">
                                    {/* Calendar Component */}
                                    <div className="calendar-wrapper rounded-lg overflow-hidden">
                                        <FullCalendar
                                            ref={calendarRef}
                                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                                            initialView={
                                                displayView === 'calendar' ? 'dayGridMonth' :
                                                displayView === 'month' ? 'dayGridMonth' :
                                                displayView === 'week' ? 'timeGridWeek' :
                                                'listMonth'
                                            }
                                            headerToolbar={{
                                                left: 'prev,next today',
                                                center: 'title',
                                                right: ''
                                            }}
                                            events={calendarEvents}
                                            eventClick={handleEventClick}
                                            height="auto"
                                            allDaySlot={true}
                                            slotDuration="00:30:00"
                                            slotLabelInterval={{hours: 1}}
                                            navLinks={true}
                                            dayMaxEvents={5}
                                            eventTimeFormat={{
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                meridiem: true
                                            }}
                                            buttonText={{
                                                today: 'Today',
                                                month: 'Month',
                                                week: 'Week',
                                                day: 'Day',
                                                list: 'List'
                                            }}
                                            // Custom event rendering
                                            eventContent={eventContent}
                                            // Enhanced styling
                                            contentHeight={600}
                                            eventBorderColor="#ffffff"
                                            eventClassNames="time-event-item rounded-md py-1 px-2 text-white shadow-sm"
                                            dayHeaderClassNames="text-gray-700 uppercase text-xs font-semibold"
                                            slotLabelClassNames="text-gray-600 text-xs"
                                            // Prevent default multi-day event rendering
                                            eventDisplay="block"
                                        />
                                    </div>
                                    
                                    {/* Calendar Legend */}
                                    <CalendarLegend />
                                </div>
                            )}
                        </div>

                        {/* Event Details Modal */}
                        <EventDetailsModal
                            isOpen={eventDetailsModalOpen}
                            onClose={() => setEventDetailsModalOpen(false)}
                            event={selectedEvent}
                            onEdit={handleEditEvent}
                            onMarkCompleted={handleMarkCompleted}
                            onMarkCancelled={handleMarkCancelled}
                            onMarkScheduled={handleMarkScheduled}
                        />
                    </div>
                </div>
            </div>
            
            {/* Custom styles for FullCalendar */}
            <style jsx global>{`
                /* Calendar Styling */
                .fc .fc-button-primary {
                    background-color: #4f46e5;
                    border-color: #4f46e5;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                }
                
                .fc .fc-button-primary:hover {
                    background-color: #4338ca;
                    border-color: #4338ca;
                }
                
                .fc .fc-button-primary:disabled {
                    background-color: #6366f1;
                    border-color: #6366f1;
                    opacity: 0.7;
                }
                
                .fc .fc-daygrid-day-top {
                    padding: 6px;
                }
                
                .fc .fc-daygrid-day-number {
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                
                .fc .fc-toolbar-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #1f2937;
                }
                
                /* Improved event styling for time display format */
                .fc-event-custom {
                    margin: 1px 0;
                    padding: 1px 2px;
                    border-radius: 3px;
                    background-color: rgba(255, 255, 255, 0.9);
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                    color: #333;
                }
                
                /* Apply custom colors to specific events by type/status */
                .time-event-item {
                    border-left-width: 4px !important;
                    background-color: #ffffff !important;
                    color: #374151 !important;
                    font-size: 0.75rem !important;
                    line-height: 1.2 !important;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                /* Cancel and remove default background colors */
                .fc .fc-event, 
                .fc .fc-event .fc-event-main {
                    background-color: transparent !important;
                    border: none !important;
                }
                
                /* Event time style */
                .fc .fc-event-time {
                    font-weight: 600;
                    font-size: 0.75rem;
                }
                
                /* Fix for multi-day event display */
                .fc-event-main-frame {
                    display: flex !important;
                    align-items: center !important;
                }
                
                .fc .fc-day-today {
                    background-color: rgba(79, 70, 229, 0.06) !important;
                }
                
                .fc .fc-list-day-cushion {
                    background-color: #f3f4f6;
                }
                
                .fc .fc-timegrid-slot-label {
                    font-size: 0.8rem;
                }
                
                .fc-theme-standard td, .fc-theme-standard th {
                    border-color: #e5e7eb;
                }
                
                .fc-theme-standard .fc-scrollgrid {
                    border-color: #e5e7eb;
                }
                
                /* Enhanced "more" button styling */
                .fc-daygrid-more-link {
                    background-color: rgba(79, 70, 229, 0.1);
                    color: #4f46e5 !important;
                    font-weight: 500;
                    border-radius: 12px;
                    padding: 2px 6px;
                    margin-top: 2px;
                    text-align: center;
                    font-size: 0.7rem;
                }
                
                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .fc .fc-toolbar-title {
                        font-size: 1.1rem;
                    }
                    
                    .fc .fc-daygrid-day-number {
                        font-size: 0.8rem;
                    }
                    
                    .time-event-item {
                        font-size: 0.7rem !important;
                    }
                }
            `}</style>
        </AuthenticatedLayout>
    );
};

export default HrCalendar;