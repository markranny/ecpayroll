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

const FormField = ({ label, name, type = 'text', value, onChange, disabled, className = '' }) => (
    <div className={className}>
        <label className="block text-sm font-medium mb-1" htmlFor={name}>
            {label}
        </label>
        <input
            id={name}
            type={type}
            name={name}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={value}
            onChange={onChange}
            disabled={disabled}
        />
    </div>
);

const AttendanceModal = ({ isOpen, onClose, attendance, mode = 'view', onSave }) => {
    const [formData, setFormData] = useState({
        idno: '',
        attendance_date: '',
        time_in: '',
        break_in: '',
        break_out: '',
        time_out: '',
        is_nightshift: false,
        next_day_timeout: ''
    });

    useEffect(() => {
        if (attendance) {
            setFormData({
                ...attendance,
                attendance_date: attendance.attendance_date?.split('T')[0] || '',
                time_in: attendance.time_in ? new Date(attendance.time_in).toISOString().slice(0, 16) : '',
                break_in: attendance.break_in ? new Date(attendance.break_in).toISOString().slice(0, 16) : '',
                break_out: attendance.break_out ? new Date(attendance.break_out).toISOString().slice(0, 16) : '',
                time_out: attendance.time_out ? new Date(attendance.time_out).toISOString().slice(0, 16) : '',
                next_day_timeout: attendance.next_day_timeout ? new Date(attendance.next_day_timeout).toISOString().slice(0, 16) : ''
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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'edit' && onSave) {
            // Create a new object with validated dates
            const processedData = {
                ...formData,
                // Ensure all date fields are properly formatted
                attendance_date: formData.attendance_date || null,
                time_in: formData.time_in || null,
                break_in: formData.break_in || null,
                break_out: formData.break_out || null,
                time_out: formData.time_out || null,
                next_day_timeout: formData.next_day_timeout || null
            };
            onSave(processedData);
        }
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
                        disabled={mode === 'view'}
                    />
                    
                    <FormField
                        label="Date"
                        name="attendance_date"
                        type="date"
                        value={formData.attendance_date}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                    />

                    <FormField
                        label="Time In"
                        name="time_in"
                        type="datetime-local"
                        value={formData.time_in}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                    />

                    <FormField
                        label="Break In"
                        name="break_in"
                        type="datetime-local"
                        value={formData.break_in}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                    />

                    <FormField
                        label="Break Out"
                        name="break_out"
                        type="datetime-local"
                        value={formData.break_out}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                    />

                    <FormField
                        label="Time Out"
                        name="time_out"
                        type="datetime-local"
                        value={formData.time_out}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                    />

                    <FormField
                        label="Next Day Timeout"
                        name="next_day_timeout"
                        type="datetime-local"
                        value={formData.next_day_timeout}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                    />

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            name="is_nightshift"
                            id="is_nightshift"
                            className="mr-2 h-4 w-4"
                            checked={formData.is_nightshift}
                            onChange={handleChange}
                            disabled={mode === 'view'}
                        />
                        <label htmlFor="is_nightshift" className="text-sm font-medium">
                            Night Shift
                        </label>
                    </div>
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