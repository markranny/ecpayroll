import React, { useState, useEffect } from 'react';
import { X, Save, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formatTime = (timeString) => {
  if (!timeString) return '-';
  
  try {
    // First check if timeString is valid
    if (typeof timeString !== 'string') {
      console.log('Invalid time format, not a string:', timeString);
      return '-';
    }
    
    let timeOnly;
    // Handle ISO 8601 format
    if (timeString.includes('T')) {
      const [, time] = timeString.split('T');
      timeOnly = time.slice(0, 5); // Extract HH:MM
    } else if (timeString.includes(' ') && timeString.includes(':')) {
      // If the time includes a date (like "2024-04-10 14:30:00"), split and take the time part
      const timeParts = timeString.split(' ');
      timeOnly = timeParts[timeParts.length - 1].slice(0, 5);
    } else if (timeString.includes(':')) {
      // Handle just time format "14:30:00" or "14:30"
      timeOnly = timeString.slice(0, 5);
    } else {
      console.log('Unrecognized time format:', timeString);
      return '-';
    }
    
    // Parse hours and minutes - add robust parsing
    const parts = timeOnly.split(':');
    if (parts.length < 2) {
      console.log('Invalid time format, missing colon:', timeString);
      return '-';
    }
    
    const hours = parts[0];
    const minutes = parts[1];
    
    // Make sure hours and minutes are valid numbers
    const hourNum = parseInt(hours, 10);
    const minNum = parseInt(minutes, 10);
    
    if (isNaN(hourNum) || isNaN(minNum)) {
      console.log('Invalid hour or minute values:', hours, minutes);
      return '-';
    }
    
    // Convert to 12-hour format with AM/PM
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const formattedHours = hourNum % 12 || 12; // handle midnight and noon
    
    return `${formattedHours}:${minutes.padStart(2, '0')} ${ampm}`;
  } catch (error) {
    console.error('Time formatting error:', error, 'for timeString:', timeString);
    return '-';
  }
};

// Native Select TimePicker component for standard HTML selects
const TimePicker = ({ value, onChange, name, placeholder, required }) => {
  // Parse the existing time value (if any) more robustly
  const parseTime = (timeStr) => {
    // Default/empty values
    if (!timeStr) return { hour: '', minute: '', period: 'AM' };
    
    try {
      // For debugging
      console.log(`Parsing time string: "${timeStr}"`);
      
      // Handle null, undefined, or empty strings
      if (timeStr === null || timeStr === undefined || timeStr === '') {
        return { hour: '', minute: '', period: 'AM' };
      }
      
      // Check if it's already in "12:34 AM/PM" format
      if (typeof timeStr === 'string' && timeStr.includes(':') && (timeStr.includes('AM') || timeStr.includes('PM'))) {
        const [timePart, periodPart] = timeStr.split(' ');
        const [hourPart, minutePart] = timePart.split(':');
        
        return {
          hour: hourPart ? hourPart.trim() : '',
          minute: minutePart ? minutePart.trim() : '',
          period: periodPart ? periodPart.trim() : 'AM'
        };
      }
      
      // Handle ISO date string (2023-04-10T14:30:00Z)
      if (typeof timeStr === 'string' && timeStr.includes('T')) {
        const date = new Date(timeStr);
        if (!isNaN(date)) {
          let hours = date.getHours();
          const period = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12 || 12; // Convert to 12-hour format
          
          return {
            hour: hours.toString(),
            minute: date.getMinutes().toString().padStart(2, '0'),
            period
          };
        }
      }
      
      // Handle 24-hour time format (14:30)
      if (typeof timeStr === 'string' && timeStr.includes(':')) {
        const [hourPart, minutePart] = timeStr.split(':');
        const hourNum = parseInt(hourPart, 10);
        
        if (!isNaN(hourNum)) {
          const period = hourNum >= 12 ? 'PM' : 'AM';
          const hour12 = hourNum % 12 || 12;
          
          return {
            hour: hour12.toString(),
            minute: minutePart ? minutePart.substring(0, 2) : '00',
            period
          };
        }
      }
      
      // Handle time with date (2023-04-10 14:30:00)
      if (typeof timeStr === 'string' && timeStr.includes(' ') && timeStr.includes(':')) {
        const parts = timeStr.split(' ');
        const timePart = parts[parts.length - 1];
        const [hourPart, minutePart] = timePart.split(':');
        const hourNum = parseInt(hourPart, 10);
        
        if (!isNaN(hourNum)) {
          const period = hourNum >= 12 ? 'PM' : 'AM';
          const hour12 = hourNum % 12 || 12;
          
          return {
            hour: hour12.toString(),
            minute: minutePart || '00',
            period
          };
        }
      }
      
      // Try to parse as date as last resort
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        let hours = date.getHours();
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12; // Convert to 12-hour format
        
        return {
          hour: hours.toString(),
          minute: date.getMinutes().toString().padStart(2, '0'),
          period
        };
      }
      
      // If we can't parse it, return empty values
      console.warn(`Could not parse time: "${timeStr}"`);
      return { hour: '', minute: '', period: 'AM' };
      
    } catch (error) {
      console.error('Time parsing error:', error, 'for value:', timeStr);
      return { hour: '', minute: '', period: 'AM' };
    }
  };

  // Get the current values
  const { hour, minute, period } = parseTime(value);

  // Handle individual selection changes with better logging
  const handleTimeChange = (type, e) => {
    const newValue = e.target.value;
    
    let updatedHour = hour;
    let updatedMinute = minute;
    let updatedPeriod = period;
    
    if (type === 'hour') updatedHour = newValue === '' ? '' : newValue;
    if (type === 'minute') updatedMinute = newValue === '' ? '' : newValue;
    if (type === 'period') updatedPeriod = newValue;
    
    console.log(`Time change - Type: ${type}, New value: ${newValue}, Current values:`, {
      hour: updatedHour,
      minute: updatedMinute,
      period: updatedPeriod
    });
    
    // Only create time string if we have both hour and minute components
    if (updatedHour && updatedMinute) {
      const timeString = `${updatedHour}:${updatedMinute} ${updatedPeriod}`;
      console.log(`Setting complete time: ${timeString}`);
      onChange({ target: { name, value: timeString } });
    } else if (!updatedHour && !updatedMinute) {
      // Clear the time value if both hour and minute are empty
      console.log('Clearing time value');
      onChange({ target: { name, value: '' } });
    } else {
      // If we have partial data (only hour or only minute), fill in defaults
      let partialTimeString = '';
      if (updatedHour) {
        partialTimeString = `${updatedHour}:${updatedMinute || '00'} ${updatedPeriod}`;
      } else if (updatedMinute) {
        partialTimeString = `12:${updatedMinute} ${updatedPeriod}`;
      }
      
      if (partialTimeString) {
        console.log(`Setting partial time: ${partialTimeString}`);
        onChange({ target: { name, value: partialTimeString } });
      }
    }
  };

  // Create hours options (1-12)
  const hoursOptions = () => {
    const options = [];
    options.push(<option key="hour-default" value="">Hour</option>);
    for (let i = 1; i <= 12; i++) {
      options.push(<option key={`hour-${i}`} value={i}>{i}</option>);
    }
    return options;
  };
  
  // Create minutes options (00-59)
  const minutesOptions = () => {
    const options = [];
    options.push(<option key="minute-default" value="">Min</option>);
    for (let i = 0; i < 60; i++) {
      const minuteStr = i.toString().padStart(2, '0');
      options.push(<option key={`minute-${i}`} value={minuteStr}>{minuteStr}</option>);
    }
    return options;
  };

  return (
    <div className="flex space-x-2 items-center">
      {/* Hour dropdown */}
      <div className="w-1/3">
        <select
          value={hour || ""}
          onChange={(e) => handleTimeChange('hour', e)}
          className="w-full py-2 pl-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {hoursOptions()}
        </select>
      </div>
      
      <span>:</span>
      
      {/* Minute dropdown */}
      <div className="w-1/3">
        <select
          value={minute || ""}
          onChange={(e) => handleTimeChange('minute', e)}
          className="w-full py-2 pl-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {minutesOptions()}
        </select>
      </div>
      
      {/* AM/PM dropdown */}
      <div className="w-1/4">
        <select
          value={period}
          onChange={(e) => handleTimeChange('period', e)}
          className="w-full py-2 pl-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
};

const AttendanceEditModal = ({ isOpen, attendance, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    id: '',
    time_in: '',
    time_out: '',
    break_in: '',
    break_out: '',
    next_day_timeout: '',
    is_nightshift: false
  });
  
  const [error, setError] = useState('');

  // Add the missing formatTimeForInput function
  const formatTimeForInput = (timeString) => {
    if (!timeString) return '';
    
    try {
      // First check if timeString is valid
      if (typeof timeString !== 'string') {
        console.log('Invalid time format, not a string:', timeString);
        return '';
      }
      
      let timeOnly;
      // Handle ISO 8601 format
      if (timeString.includes('T')) {
        const [, time] = timeString.split('T');
        timeOnly = time.slice(0, 5); // Extract HH:MM
      } else if (timeString.includes(' ') && timeString.includes(':')) {
        // If the time includes a date (like "2024-04-10 14:30:00"), split and take the time part
        const timeParts = timeString.split(' ');
        timeOnly = timeParts[timeParts.length - 1].slice(0, 5);
      } else if (timeString.includes(':')) {
        // Handle just time format "14:30:00" or "14:30"
        timeOnly = timeString.slice(0, 5);
      } else {
        console.log('Unrecognized time format:', timeString);
        return '';
      }
      
      // Parse hours and minutes
      const parts = timeOnly.split(':');
      if (parts.length < 2) {
        console.log('Invalid time format, missing colon:', timeString);
        return '';
      }
      
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      
      if (isNaN(hours)) {
        console.log('Invalid hour value:', parts[0]);
        return '';
      }
      
      // Convert to 12-hour format with AM/PM
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12; // handle midnight and noon
      
      return `${formattedHours}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Time formatting error for input:', error, 'for timeString:', timeString);
      return '';
    }
  };

  // Initialize form data when attendance changes with improved time handling
  useEffect(() => {
    if (attendance) {
      console.log('Initializing form with attendance data:', attendance);
      setFormData({
        id: attendance.id,
        time_in: formatTimeForInput(attendance.time_in),
        time_out: formatTimeForInput(attendance.time_out),
        break_in: formatTimeForInput(attendance.break_in),
        break_out: formatTimeForInput(attendance.break_out),
        next_day_timeout: formatTimeForInput(attendance.next_day_timeout),
        is_nightshift: attendance.is_nightshift || false
      });
    }
  }, [attendance]);

  // Improved conversion to 24-hour format
  const convertTo24Hour = (timeStr) => {
    if (!timeStr) return '';
    
    try {
      // Handle case where timeStr is already in 24-hour format
      if (!timeStr.includes(' ')) {
        return timeStr; // Assume it's already in 24-hour format
      }
      
      const [timePart, periodPart] = timeStr.split(' ');
      const [hoursPart, minutesPart] = timePart.split(':');
      
      let hours = parseInt(hoursPart, 10);
      const minutes = minutesPart;
      
      // Convert hours based on AM/PM
      if (periodPart === 'PM' && hours !== 12) {
        hours += 12;
      } else if (periodPart === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    } catch (error) {
      console.error('Error converting to 24-hour format:', error, 'for value:', timeStr);
      return '';
    }
  };

  // Improved date-time combination
  const combineDateTime = (originalDateTimeStr, timeStr) => {
    if (!originalDateTimeStr || !timeStr) return '';
    
    try {
      console.log('Combining date and time:', { originalDateTimeStr, timeStr });
      
      // Try to extract just the date part from the original datetime string
      let datePart;
      
      if (typeof originalDateTimeStr === 'string') {
        // Handle ISO format (2023-04-10T14:30:00Z)
        if (originalDateTimeStr.includes('T')) {
          datePart = originalDateTimeStr.split('T')[0];
        } 
        // Handle format like "2023-04-10 14:30:00"
        else if (originalDateTimeStr.includes(' ')) {
          datePart = originalDateTimeStr.split(' ')[0];
        } 
        // Assume it's just a date
        else {
          datePart = originalDateTimeStr;
        }
      } else {
        // If it's not a string, try to use it as a Date object
        const originalDate = new Date(originalDateTimeStr);
        if (!isNaN(originalDate.getTime())) {
          datePart = originalDate.toISOString().split('T')[0];
        } else {
          throw new Error('Could not extract date part from originalDateTimeStr');
        }
      }
      
      // Get the time values
      const time24 = convertTo24Hour(timeStr);
      console.log('Converted to 24-hour format:', time24);
      
      if (!time24) {
        throw new Error('Could not convert time to 24-hour format');
      }
      
      // Combine date and time
      const combinedDateTime = `${datePart}T${time24}:00`;
      console.log('Combined date and time:', combinedDateTime);
      
      return combinedDateTime;
    } catch (error) {
      console.error('Error combining date and time:', error, {
        originalDateTimeStr,
        timeStr
      });
      return '';
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle form submission with improved validation
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    try {
      console.log('Form submission - Current data:', formData);
      
      // Basic validation - make sure we have at least time in and time out
      if (!formData.time_in || !formData.time_out) {
        setError('Time In and Time Out are required');
        return;
      }
      
      // Prepare data with original dates from attendance
      const submissionData = {
        ...formData,
        id: attendance.id,
        time_in: formData.time_in ? combineDateTime(attendance.attendance_date, formData.time_in) : null,
        time_out: formData.time_out ? combineDateTime(attendance.attendance_date, formData.time_out) : null,
        break_in: formData.break_in ? combineDateTime(attendance.attendance_date, formData.break_in) : null,
        break_out: formData.break_out ? combineDateTime(attendance.attendance_date, formData.break_out) : null,
        next_day_timeout: formData.is_nightshift && formData.next_day_timeout 
          ? combineDateTime(getNextDay(attendance.attendance_date), formData.next_day_timeout) 
          : null,
        is_nightshift: !!formData.is_nightshift
      };
      
      console.log('Prepared submission data:', submissionData);
      
      // Validate time sequence for non-nightshift
      if (submissionData.time_in && submissionData.time_out && !formData.is_nightshift) {
        const timeIn = new Date(submissionData.time_in);
        const timeOut = new Date(submissionData.time_out);
        
        if (timeOut <= timeIn) {
          setError('Time Out must be after Time In for regular shifts');
          return;
        }
      }
      
      // Validate break times if BOTH are provided
      if (submissionData.break_out && submissionData.break_in) {
        const breakOut = new Date(submissionData.break_out);
        const breakIn = new Date(submissionData.break_in);
        
        // Check if the dates are valid
        if (isNaN(breakOut.getTime()) || isNaN(breakIn.getTime())) {
          console.error('Invalid break time dates:', {
            breakOut: submissionData.break_out,
            breakIn: submissionData.break_in,
            parsedBreakOut: breakOut,
            parsedBreakIn: breakIn
          });
          setError('Invalid break time format. Please check your entries.');
          return;
        }
        
        // The employee goes on break (Break Out) and then comes back from break (Break In)
        // So Break In should be AFTER Break Out
        if (breakOut >= breakIn) {
          setError('Break In must be after Break Out - employee returns from break after leaving for break');
          return;
        }
      }
      
      // Additional validation - breaks should be between time in and time out
      if (submissionData.time_in && submissionData.time_out) {
        const timeIn = new Date(submissionData.time_in);
        const timeOut = new Date(submissionData.time_out);
        
        // Check break_out is after time_in if provided
        if (submissionData.break_out) {
          const breakOut = new Date(submissionData.break_out);
          if (breakOut <= timeIn) {
            setError('Break Out must be after Time In');
            return;
          }
        }
        
        // Check break_in is before time_out for non-nightshift
        if (submissionData.break_in && !formData.is_nightshift) {
          const breakIn = new Date(submissionData.break_in);
          if (breakIn >= timeOut) {
            setError('Break In must be before Time Out for regular shifts');
            return;
          }
        }
      }
      
      // All validations passed, call onSave with the updated data
      onSave(submissionData);
    } catch (error) {
      console.error('Error in form submission:', error);
      setError('An error occurred while processing the form. Please check all entries and try again.');
    }
  };
  
  // Helper to get next day for night shift
  const getNextDay = (dateStr) => {
    try {
      const date = new Date(dateStr);
      date.setDate(date.getDate() + 1);
      return date.toISOString().split('T')[0]; // Return just the date part in YYYY-MM-DD format
    } catch (error) {
      console.error('Error calculating next day:', error);
      return dateStr; // Return original if error
    }
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-lg max-w-xl w-full mx-4 md:mx-0">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Edit Attendance Times</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1 mb-4">
            <div className="font-medium text-gray-700 mb-2">
              {attendance?.employee_name} (ID: {attendance?.idno})
            </div>
            <div className="text-sm text-gray-500">
              Department: {attendance?.department || 'N/A'}
            </div>
            <div className="text-sm text-gray-500">
              Date: {attendance?.attendance_date ? new Date(attendance.attendance_date).toLocaleDateString() : 'N/A'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="time_in" className="block text-sm font-medium text-gray-700 mb-1">
                Time In
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                <div className="pl-10">
                  <TimePicker
                    name="time_in"
                    value={formData.time_in}
                    onChange={handleChange}
                    placeholder="9:30 AM"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="time_out" className="block text-sm font-medium text-gray-700 mb-1">
                Time Out
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                <div className="pl-10">
                  <TimePicker
                    name="time_out"
                    value={formData.time_out}
                    onChange={handleChange}
                    placeholder="5:30 PM"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="break_out" className="block text-sm font-medium text-gray-700 mb-1">
                Break Out
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                <div className="pl-10">
                  <TimePicker
                    name="break_out"
                    value={formData.break_out}
                    onChange={handleChange}
                    placeholder="12:00 PM"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="break_in" className="block text-sm font-medium text-gray-700 mb-1">
                Break In
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                <div className="pl-10">
                  <TimePicker
                    name="break_in"
                    value={formData.break_in}
                    onChange={handleChange}
                    placeholder="1:00 PM"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="is_nightshift"
                name="is_nightshift"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.is_nightshift}
                onChange={handleChange}
              />
              <label htmlFor="is_nightshift" className="ml-2 block text-sm text-gray-900">
                Night Shift
              </label>
            </div>

            {formData.is_nightshift && (
              <div>
                <label htmlFor="next_day_timeout" className="block text-sm font-medium text-gray-700 mb-1">
                  Next Day Timeout
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                  <div className="pl-10">
                    <TimePicker
                      name="next_day_timeout"
                      value={formData.next_day_timeout}
                      onChange={handleChange}
                      placeholder="6:00 AM"
                    />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  For night shifts, specify when the employee clocked out on the following day.
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 -mx-6 -mb-6 mt-6 flex justify-end space-x-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceEditModal;