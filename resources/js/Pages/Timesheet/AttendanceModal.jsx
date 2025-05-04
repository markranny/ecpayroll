import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Base Modal component
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-lg max-w-2xl w-full">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button 
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

const FormField = ({ label, name, type = 'text', value, onChange, disabled, className = '', min, max }) => (
    <div className={className}>
        <label className="block text-sm font-medium mb-1" htmlFor={name}>
            {label}
        </label>
        <input
            id={name}
            type={type}
            name={name}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={value || ''} // Ensure we don't have "null" as a string value
            onChange={onChange}
            disabled={disabled}
            min={min}
            max={max}
        />
    </div>
);

const AttendanceModal = ({ isOpen, onClose, attendance, mode = 'view', onSave }) => {
    const [formData, setFormData] = useState({
        id: '',
        idno: '',
        employee_id: '',
        attendance_date: '',
        time_in: '',
        break_in: '',
        break_out: '',
        time_out: '',
        is_nightshift: false,
        next_day_timeout: '',
        hours_worked: ''
    });

    // Format datetime for datetime-local input
    const formatDateTimeForInput = (datetimeStr) => {
        if (!datetimeStr) return '';
        try {
            const date = new Date(datetimeStr);
            if (isNaN(date.getTime())) return '';
            
            // Format as YYYY-MM-DDThh:mm
            return date.toISOString().slice(0, 16);
        } catch (e) {
            console.error("Error formatting datetime:", e);
            return '';
        }
    };

    useEffect(() => {
        if (attendance) {
            // Deep copy to avoid reference issues
            const attendanceCopy = JSON.parse(JSON.stringify(attendance));
            
            // Format date fields for input
            setFormData({
                ...attendanceCopy,
                attendance_date: attendanceCopy.attendance_date?.split('T')[0] || '',
                time_in: formatDateTimeForInput(attendanceCopy.time_in),
                break_in: formatDateTimeForInput(attendanceCopy.break_in),
                break_out: formatDateTimeForInput(attendanceCopy.break_out),
                time_out: formatDateTimeForInput(attendanceCopy.time_out),
                next_day_timeout: formatDateTimeForInput(attendanceCopy.next_day_timeout),
                hours_worked: attendanceCopy.hours_worked || ''
            });
        }
    }, [attendance]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Handle hours worked calculation
    const calculateHoursWorked = () => {
        if (!formData.time_in) return;
        
        let endTime = formData.is_nightshift && formData.next_day_timeout ? 
            formData.next_day_timeout : formData.time_out;
            
        if (!endTime) return;
        
        // Calculate duration
        const start = new Date(formData.time_in);
        const end = new Date(endTime);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
        
        // Calculate duration in milliseconds
        let durationMs = end - start;
        
        // Subtract break duration if both break_in and break_out are set
        if (formData.break_in && formData.break_out) {
            const breakStart = new Date(formData.break_in);
            const breakEnd = new Date(formData.break_out);
            
            if (!isNaN(breakStart.getTime()) && !isNaN(breakEnd.getTime())) {
                const breakDurationMs = breakEnd - breakStart;
                if (breakDurationMs > 0) {
                    durationMs -= breakDurationMs;
                }
            }
        }
        
        // Convert to hours and update form
        if (durationMs > 0) {
            const hours = durationMs / (1000 * 60 * 60);
            setFormData(prev => ({
                ...prev,
                hours_worked: hours.toFixed(2)
            }));
        }
    };

    // Recalculate hours when time fields change
    useEffect(() => {
        if (mode === 'edit') {
            calculateHoursWorked();
        }
    }, [
        formData.time_in, 
        formData.time_out, 
        formData.break_in, 
        formData.break_out, 
        formData.next_day_timeout,
        formData.is_nightshift
    ]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'edit' && onSave) {
            // Create a new object with validated dates
            const processedData = {
                ...formData,
                // Ensure numeric values are properly handled
                hours_worked: formData.hours_worked ? parseFloat(formData.hours_worked) : null
            };
            onSave(processedData);
        }
    };

    // When the is_nightshift checkbox changes, ensure next_day_timeout is properly handled
    const handleNightShiftChange = (e) => {
        const isNightShift = e.target.checked;
        
        setFormData(prev => ({
            ...prev,
            is_nightshift: isNightShift,
            // If turning off night shift, clear the next day timeout
            next_day_timeout: isNightShift ? prev.next_day_timeout : ''
        }));
    };

    // Dynamic determination of next day date
    const getNextDayDate = () => {
        if (!formData.attendance_date) return '';
        
        const date = new Date(formData.attendance_date);
        date.setDate(date.getDate() + 1);
        return date.toISOString().split('T')[0];
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose}
            title={mode === 'view' ? 'View Attendance' : 'Edit Attendance'}
        >
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        label="Employee ID"
                        name="idno"
                        value={formData.idno}
                        onChange={handleChange}
                        disabled={true} // Always disabled since we don't change employee
                        className="col-span-2"
                    />
                    
                    <FormField
                        label="Date"
                        name="attendance_date"
                        type="date"
                        value={formData.attendance_date}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                    />

                    <div className="flex items-center mt-6">
                        <input
                            type="checkbox"
                            name="is_nightshift"
                            id="is_nightshift"
                            className="mr-2 h-4 w-4"
                            checked={formData.is_nightshift}
                            onChange={handleNightShiftChange}
                            disabled={mode === 'view'}
                        />
                        <label htmlFor="is_nightshift" className="text-sm font-medium">
                            Night Shift
                        </label>
                    </div>

                    <FormField
                        label="Time In"
                        name="time_in"
                        type="datetime-local"
                        value={formData.time_in}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        className="col-span-2"
                        min={`${formData.attendance_date}T00:00`}
                        max={`${formData.attendance_date}T23:59`}
                    />

                    <FormField
                        label="Break In"
                        name="break_in"
                        type="datetime-local"
                        value={formData.break_in}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        className="col-span-2"
                        min={formData.time_in || `${formData.attendance_date}T00:00`}
                        max={`${formData.attendance_date}T23:59`}
                    />

                    <FormField
                        label="Break Out"
                        name="break_out"
                        type="datetime-local"
                        value={formData.break_out}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        className="col-span-2"
                        min={formData.break_in || `${formData.attendance_date}T00:00`}
                        max={`${formData.attendance_date}T23:59`}
                    />

                    <FormField
                        label="Time Out"
                        name="time_out"
                        type="datetime-local"
                        value={formData.time_out}
                        onChange={handleChange}
                        disabled={mode === 'view' || (formData.is_nightshift && formData.next_day_timeout)}
                        className="col-span-2"
                        min={formData.break_out || formData.time_in || `${formData.attendance_date}T00:00`}
                        max={`${formData.attendance_date}T23:59`}
                    />

                    {formData.is_nightshift && (
                        <FormField
                            label="Next Day Timeout"
                            name="next_day_timeout"
                            type="datetime-local"
                            value={formData.next_day_timeout}
                            onChange={handleChange}
                            disabled={mode === 'view'}
                            className="col-span-2"
                            min={`${getNextDayDate()}T00:00`}
                            max={`${getNextDayDate()}T23:59`}
                        />
                    )}

                    <FormField
                        label="Hours Worked"
                        name="hours_worked"
                        type="number"
                        value={formData.hours_worked}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        className="col-span-2"
                        min="0"
                        step="0.01"
                    />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <Button 
                        variant="secondary" 
                        type="button" 
                        onClick={onClose}
                    >
                        Close
                    </Button>
                    {mode === 'edit' && (
                        <Button type="submit">
                            Save Changes
                        </Button>
                    )}
                </div>
            </form>
        </Modal>
    );
};

export default AttendanceModal;