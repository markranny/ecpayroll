import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import { Search, Calendar, Filter, Edit, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AttendanceEditModal from './AttendanceEditModal';

const ProcessedAttendanceList = () => {
  const { auth, attendances: initialAttendances = [], pagination = {} } = usePage().props;
  const [attendances, setAttendances] = useState(initialAttendances);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(pagination.current_page || 1);
  const [totalPages, setTotalPages] = useState(pagination.last_page || 1);
  const [perPage, setPerPage] = useState(pagination.per_page || 25);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [editsOnlyFilter, setEditsOnlyFilter] = useState(false);
  
  // Modal state
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Date formatting with error handling
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      
      // Validate date
      if (isNaN(date.getTime())) return '-';
      
      // Consistent date formatting
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return '-';
    }
  };

  // Calculate duration between two times
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '-';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffInMs = end - start;
    
    // If negative or invalid, return dash
    if (diffInMs < 0) return '-';
    
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours.toFixed(2);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    
    try {
      let timeOnly;
      // Handle ISO 8601 format
      if (timeString.includes('T')) {
        const [, time] = timeString.split('T');
        timeOnly = time.slice(0, 5); // Extract HH:MM
      } else {
        // If the time includes a date (like "2024-04-10 14:30:00"), split and take the time part
        const timeParts = timeString.split(' ');
        timeOnly = timeParts[timeParts.length - 1].slice(0, 5);
      }
      
      // Parse hours and minutes
      const [hours, minutes] = timeOnly.split(':');
      const hourNum = parseInt(hours, 10);
      
      // Convert to 12-hour format with AM/PM
      const ampm = hourNum >= 12 ? 'PM' : 'AM';
      const formattedHours = hourNum % 12 || 12; // handle midnight and noon
      
      return `${formattedHours}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Time formatting error:', error);
      return '-';
    }
  };

  // Process attendance data to ensure employee, dept, and day are always present
  const processAttendanceData = (data) => {
    return data.map(attendance => {
      // Ensure employee name is always available
      if (!attendance.employee_name && attendance.employee) {
        attendance.employee_name = `${attendance.employee.Fname || ''} ${attendance.employee.Lname || ''}`.trim();
      } else if (!attendance.employee_name) {
        attendance.employee_name = 'Unknown Employee';
      }
      
      // Ensure department is always available
      if (!attendance.department && attendance.employee) {
        attendance.department = attendance.employee.Department || 'N/A';
      } else if (!attendance.department) {
        attendance.department = 'N/A';
      }
      
      // Ensure ID number is always available
      if (!attendance.idno && attendance.employee) {
        attendance.idno = attendance.employee.idno || 'N/A';
      } else if (!attendance.idno) {
        attendance.idno = 'N/A';
      }
      
      // Ensure day of week is always available
      if (!attendance.day && attendance.attendance_date) {
        const date = new Date(attendance.attendance_date);
        if (!isNaN(date.getTime())) {
          attendance.day = date.toLocaleDateString('en-US', { weekday: 'long' });
        }
      }
      
      return attendance;
    });
  };

  // Load attendance data
  const loadAttendanceData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('per_page', perPage);
      
      if (searchTerm) params.append('search', searchTerm);
      if (dateFilter) params.append('date', dateFilter);
      if (departmentFilter) params.append('department', departmentFilter);
      if (editsOnlyFilter) params.append('edits_only', 'true');
      
      const response = await fetch('/attendance/list?' + params.toString(), {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Process data to ensure employee, dept and day are always available
        const processedData = processAttendanceData(data.data);
        setAttendances(processedData);
        setTotalPages(data.pagination.last_page);
        setCurrentPage(data.pagination.current_page);
      } else {
        setError('Failed to load attendance data');
      }
    } catch (err) {
      console.error('Error loading attendance data:', err);
      setError('Error loading attendance data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    // Process initial data to ensure employee, dept and day fields
    if (initialAttendances.length > 0) {
      const processedInitialData = processAttendanceData(initialAttendances);
      setAttendances(processedInitialData);
    } else {
      loadAttendanceData();
    }
  }, []);

  // Load when page changes
  useEffect(() => {
    if (currentPage !== pagination.current_page) {
      loadAttendanceData();
    }
  }, [currentPage]);

  // Handle filter application
  const applyFilters = () => {
    setCurrentPage(1); // Reset to first page when applying filters
    loadAttendanceData();
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setDepartmentFilter('');
    setEditsOnlyFilter(false);
    setCurrentPage(1);
    
    // Need to wait for state update
    setTimeout(() => {
      loadAttendanceData();
    }, 0);
  };

  // Handle edit button click
  const handleEditClick = (attendance) => {
    setSelectedAttendance(attendance);
    setShowEditModal(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowEditModal(false);
    setSelectedAttendance(null);
  };

  const handleAttendanceUpdate = async (updatedAttendance) => {
    try {
      setError('');
      setSuccess('');
      
      const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
      
      // Create a new object with only time-related fields
      const timeUpdatePayload = {
        id: updatedAttendance.id,
        time_in: updatedAttendance.time_in,
        break_in: updatedAttendance.break_in,
        break_out: updatedAttendance.break_out,
        time_out: updatedAttendance.time_out,
        next_day_timeout: updatedAttendance.next_day_timeout
      };
      
      const response = await fetch(`/attendance/${updatedAttendance.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        },
        body: JSON.stringify(timeUpdatePayload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Attendance time records updated successfully');
        
        // Process the updated record to ensure all fields are present
        const processedRecord = {
          ...data.data,
          source: 'manual_edit',
          is_edited: true
        };
        
        // Update the local state to reflect changes
        setAttendances(prevAttendances => 
          prevAttendances.map(att => 
            att.id === updatedAttendance.id ? processedRecord : att
          )
        );
        
        setShowEditModal(false);
      } else {
        setError('Failed to update attendance: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error updating attendance:', err);
      setError('Error updating attendance: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <AuthenticatedLayout user={auth.user}>
      <Head title="Processed Attendance List" />
      <div className="flex min-h-screen bg-gray-50/50">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Processed Attendance Records
                </h1>
                <p className="text-gray-600">
                  View and manage processed attendance records with edit history tracking.
                </p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search by ID or Name..."
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="date"
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <select
                      className="w-full pl-4 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                    >
                      <option value="">All Departments</option>
                      <option value="Production">Production</option>
                      <option value="HR">HR</option>
                      <option value="IT">IT</option>
                      <option value="Finance">Finance</option>
                      <option value="Engineering">Engineering</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        checked={editsOnlyFilter}
                        onChange={(e) => setEditsOnlyFilter(e.target.checked)}
                      />
                      <span className="text-gray-700">Edited Records Only</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={resetFilters}>Reset</Button>
                  <Button onClick={applyFilters}>
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-lg">Loading...</span>
                </div>
              ) : attendances.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No attendance records found</h3>
                  <p className="text-gray-500">Try adjusting your filters or adding new attendance data.</p>
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In</th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Break Out</th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Break In</th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out</th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Day</th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendances.map((attendance) => (
                        <tr key={attendance.id} className={attendance.source === 'manual_edit' ? 'bg-red-50' : ''}>
                          <td className="px-2 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {attendance.employee_name || 'Unknown Employee'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {attendance.idno || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {attendance.department || 'N/A'}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(attendance.attendance_date)}
                            {attendance.day && <span className="block text-xs mt-1 text-gray-400">{attendance.day}</span>}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatTime(attendance.time_in)}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatTime(attendance.break_out)}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatTime(attendance.break_in)}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatTime(attendance.time_out)}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {attendance.is_nightshift && attendance.next_day_timeout ? (
                              <span className="text-purple-600">{formatTime(attendance.next_day_timeout)}</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {attendance.hours_worked ? attendance.hours_worked.toFixed(2) : 
                              calculateDuration(attendance.time_in, attendance.time_out)}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              attendance.source === 'import' ? 'bg-blue-100 text-blue-800' : 
                              attendance.source === 'manual' ? 'bg-yellow-100 text-yellow-800' : 
                              attendance.source === 'biometric' ? 'bg-green-100 text-green-800' : 
                              attendance.source === 'manual_edit' ? 'bg-red-100 text-red-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {attendance.source === 'manual_edit' ? 'Edited' : 
                              attendance.source ? (attendance.source.charAt(0).toUpperCase() + attendance.source.slice(1)) : 'Unknown'}
                            </span>
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditClick(attendance)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <Button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="sm"
                      >
                        Next
                      </Button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing page <span className="font-medium">{currentPage}</span> of{' '}
                          <span className="font-medium">{totalPages}</span>
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <Button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            variant="outline"
                            size="sm"
                            className="rounded-l-md"
                          >
                            First
                          </Button>
                          <Button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            variant="outline"
                            size="sm"
                          >
                            Previous
                          </Button>
                          
                          {/* Page numbers */}
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = currentPage <= 3 
                              ? i + 1 
                              : (currentPage >= totalPages - 2 
                                ? totalPages - 4 + i 
                                : currentPage - 2 + i);
                            
                            if (pageNum > 0 && pageNum <= totalPages) {
                              return (
                                <Button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  className={currentPage === pageNum ? "bg-blue-500 text-white" : ""}
                                >
                                  {pageNum}
                                </Button>
                              );
                            }
                            return null;
                          })}
                          
                          <Button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            variant="outline"
                            size="sm"
                          >
                            Next
                          </Button>
                          <Button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            variant="outline"
                            size="sm"
                            className="rounded-r-md"
                          >
                            Last
                          </Button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Modal */}
      {showEditModal && selectedAttendance && (
        <AttendanceEditModal
          isOpen={showEditModal}
          attendance={selectedAttendance}
          onClose={handleCloseModal}
          onSave={handleAttendanceUpdate}
        />
      )}
    </AuthenticatedLayout>
  );
};

export default ProcessedAttendanceList;