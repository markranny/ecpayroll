import React, { useState, useEffect } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';

const SLVLForm = ({ employees, leaveTypes, payOptions, departments, onSubmit }) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Form state
    const [formData, setFormData] = useState({
        employee_id: '',
        type: '',
        start_date: today,
        end_date: today,
        half_day: false,
        am_pm: 'AM',
        pay_type: 'with_pay',
        reason: '',
        supporting_documents: null
    });
    
    // Filtered employees state
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [totalDays, setTotalDays] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // File upload state
    const [uploadedFile, setUploadedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    
    // Update filtered employees when search or department selection changes
    useEffect(() => {
        let result = employees || [];
        
        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(employee => 
                employee.name.toLowerCase().includes(term) || 
                employee.idno?.toString().includes(term)
            );
        }
        
        // Filter by department
        if (selectedDepartment) {
            result = result.filter(employee => employee.department === selectedDepartment);
        }
        
        setFilteredEmployees(result);
    }, [searchTerm, selectedDepartment, employees]);
    
    // Calculate total days when dates change
    useEffect(() => {
        if (formData.start_date && formData.end_date) {
            if (formData.half_day) {
                setTotalDays(0.5);
            } else {
                const start = new Date(formData.start_date);
                const end = new Date(formData.end_date);
                const days = differenceInDays(end, start) + 1;
                setTotalDays(days);
            }
        }
    }, [formData.start_date, formData.end_date, formData.half_day]);
    
    // Handle input changes
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        
        setFormData({
            ...formData,
            [name]: newValue
        });
        
        // If start date changes and end date is before start date, update end date
        if (name === 'start_date' && formData.end_date < value) {
            setFormData(prev => ({
                ...prev,
                [name]: newValue,
                end_date: value
            }));
        }
        
        // If half day is unchecked, reset am_pm
        if (name === 'half_day' && !checked) {
            setFormData(prev => ({
                ...prev,
                [name]: newValue,
                am_pm: 'AM'
            }));
        }
    };
    
    // Handle file upload
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                return;
            }
            
            // Validate file type
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'];
            if (!allowedTypes.includes(file.type)) {
                alert('Only PDF, DOC, DOCX, JPG, JPEG, and PNG files are allowed');
                return;
            }
            
            setUploadedFile(file);
            setFormData({
                ...formData,
                supporting_documents: file
            });
            
            // Create preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => setFilePreview(e.target.result);
                reader.readAsDataURL(file);
            } else {
                setFilePreview(null);
            }
        }
    };
    
    // Remove uploaded file
    const removeFile = () => {
        setUploadedFile(null);
        setFilePreview(null);
        setFormData({
            ...formData,
            supporting_documents: null
        });
        // Reset the file input
        const fileInput = document.getElementById('supporting_documents');
        if (fileInput) {
            fileInput.value = '';
        }
    };
    
    // Handle employee selection
    const handleEmployeeSelect = (employee) => {
        setFormData({
            ...formData,
            employee_id: employee.id
        });
        setSelectedEmployee(employee);
    };
    
    // Check if current leave type requires documents
    const requiresDocuments = () => {
        const selectedLeaveType = leaveTypes.find(type => type.value === formData.type);
        return selectedLeaveType ? selectedLeaveType.requires_documents : false;
    };
    
    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (isSubmitting) return;
        
        // Validate form
        if (!formData.employee_id) {
            alert('Please select an employee');
            return;
        }
        
        if (!formData.type) {
            alert('Please select a leave type');
            return;
        }
        
        if (!formData.start_date || !formData.end_date) {
            alert('Please specify both start and end dates');
            return;
        }
        
        if (formData.start_date > formData.end_date) {
            alert('End date must be after or equal to start date');
            return;
        }
        
        if (!formData.reason.trim()) {
            alert('Please provide a reason for the leave');
            return;
        }
        
        // Check if documents are required but not uploaded
        if (requiresDocuments() && !uploadedFile) {
            alert(`Supporting documents are required for ${formData.type} leave`);
            return;
        }
        
        // Check available leave days for sick and vacation leave (only for with_pay)
        if (selectedEmployee && ['sick', 'vacation'].includes(formData.type) && formData.pay_type === 'with_pay') {
            const availableDays = formData.type === 'sick' 
                ? selectedEmployee.sick_leave_days 
                : selectedEmployee.vacation_leave_days;
                
            if (totalDays > availableDays) {
                alert(`Insufficient ${formData.type} leave days. Employee only has ${availableDays} days available.`);
                return;
            }
        }
        
        setIsSubmitting(true);
        
        // Create FormData for file upload
        const submitData = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== undefined) {
                submitData.append(key, formData[key]);
            }
        });
        
        // Call the onSubmit prop with the form data
        onSubmit(submitData);
        
        // Reset form after submission 
        setFormData({
            employee_id: '',
            type: '',
            start_date: today,
            end_date: today,
            half_day: false,
            am_pm: 'AM',
            pay_type: 'with_pay',
            reason: '',
            supporting_documents: null
        });
        setSelectedEmployee(null);
        setSearchTerm('');
        setSelectedDepartment('');
        setUploadedFile(null);
        setFilePreview(null);
        setIsSubmitting(false);
    };
    
    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Request Leave (SLVL)</h3>
                <p className="text-sm text-gray-500">Create leave request for employee</p>
            </div>
            
            <form onSubmit={handleSubmit} encType="multipart/form-data">
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Employee Selection Section */}
                    <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">Select Employee</h4>
                        
                        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-4">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Search by name or ID"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex-1">
                                <select
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                >
                                    <option value="">All Departments</option>
                                    {departments.map((department, index) => (
                                        <option key={index} value={department}>{department}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="border rounded-md overflow-hidden max-h-60 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            ID
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Department
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Position
                                        </th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Sick Leave
                                        </th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Vacation Leave
                                        </th>
                                    </tr>
                                </thead>
                                
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredEmployees.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-3 text-center text-sm text-gray-500">
                                                No employees match your search criteria
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredEmployees.map(employee => (
                                            <tr 
                                                key={employee.id} 
                                                className={`hover:bg-gray-50 cursor-pointer ${
                                                    formData.employee_id === employee.id ? 'bg-indigo-50' : ''
                                                }`}
                                                onClick={() => handleEmployeeSelect(employee)}
                                            >
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                    {employee.idno}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {employee.name}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                    {employee.department}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                    {employee.position}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                                                    <span className={`font-medium ${employee.sick_leave_days > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                                        {employee.sick_leave_days} days
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                                                    <span className={`font-medium ${employee.vacation_leave_days > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                                        {employee.vacation_leave_days} days
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="mt-2 text-sm text-gray-600">
                            {selectedEmployee ? (
                                <div className="flex justify-between">
                                    <span className="font-medium">Selected: {selectedEmployee.name}</span>
                                    <div className="flex space-x-4">
                                        <span className="font-medium">
                                            Sick Leave: 
                                            <span className={`ml-1 ${selectedEmployee.sick_leave_days > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {selectedEmployee.sick_leave_days} days
                                            </span>
                                        </span>
                                        <span className="font-medium">
                                            Vacation Leave: 
                                            <span className={`ml-1 ${selectedEmployee.vacation_leave_days > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {selectedEmployee.vacation_leave_days} days
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-yellow-600">No employee selected</span>
                            )}
                        </div>
                    </div>
                    
                    {/* Leave Details Section */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">Leave Details</h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                                    Leave Type <span className="text-red-600">*</span>
                                </label>
                                <select
                                    id="type"
                                    name="type"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={formData.type}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Leave Type</option>
                                    {leaveTypes.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                                {formData.type && requiresDocuments() && (
                                    <div className="mt-1 flex items-center text-xs text-amber-600">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Supporting documents required for this leave type
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Date <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="date"
                                    id="start_date"
                                    name="start_date"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                                    End Date <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="date"
                                    id="end_date"
                                    name="end_date"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={formData.end_date}
                                    onChange={handleChange}
                                    min={formData.start_date}
                                    required
                                />
                            </div>
                            
                            <div className="flex items-center space-x-4">
                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        name="half_day"
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        checked={formData.half_day}
                                        onChange={handleChange}
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Half Day</span>
                                </label>
                                
                                {formData.half_day && (
                                    <div className="flex space-x-2">
                                        <label className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                name="am_pm"
                                                value="AM"
                                                className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                                checked={formData.am_pm === 'AM'}
                                                onChange={handleChange}
                                            />
                                            <span className="ml-1 text-sm text-gray-700">AM</span>
                                        </label>
                                        <label className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                name="am_pm"
                                                value="PM"
                                                className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                                checked={formData.am_pm === 'PM'}
                                                onChange={handleChange}
                                            />
                                            <span className="ml-1 text-sm text-gray-700">PM</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Pay Type <span className="text-red-600">*</span>
                                </label>
                                <div className="space-y-2">
                                    {payOptions.map(option => (
                                        <label key={option.value} className="inline-flex items-center mr-4">
                                            <input
                                                type="radio"
                                                name="pay_type"
                                                value={option.value}
                                                className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                                checked={formData.pay_type === option.value}
                                                onChange={handleChange}
                                            />
                                            <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                                {formData.pay_type === 'non_pay' && (
                                    <div className="mt-1 text-xs text-blue-600">
                                        Non-pay leave will not deduct from leave bank balance
                                    </div>
                                )}
                            </div>
                            
                            <div className="bg-blue-50 p-3 rounded-md">
                                <div className="text-sm font-medium text-blue-800">
                                    Total Days: {totalDays} {totalDays === 1 ? 'day' : 'days'}
                                </div>
                                {selectedEmployee && ['sick', 'vacation'].includes(formData.type) && formData.pay_type === 'with_pay' && (
                                    <div className="text-xs text-blue-700 mt-1">
                                        Available {formData.type} days: {
                                            formData.type === 'sick' 
                                                ? selectedEmployee.sick_leave_days 
                                                : selectedEmployee.vacation_leave_days
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Reason and Documents Section */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">Additional Information</h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                                    Reason <span className="text-red-600">*</span>
                                </label>
                                <textarea
                                    id="reason"
                                    name="reason"
                                    rows="4"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    placeholder="Please provide a detailed reason for your leave request"
                                    value={formData.reason}
                                    onChange={handleChange}
                                    required
                                ></textarea>
                            </div>
                            
                            {/* File Upload Section */}
                            <div>
                                <label htmlFor="supporting_documents" className="block text-sm font-medium text-gray-700 mb-1">
                                    Supporting Documents {requiresDocuments() && <span className="text-red-600">*</span>}
                                </label>
                                
                                {!uploadedFile ? (
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                                        <div className="space-y-1 text-center">
                                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="flex text-sm text-gray-600">
                                                <label
                                                    htmlFor="supporting_documents"
                                                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                                                >
                                                    <span>Upload a file</span>
                                                    <input
                                                        id="supporting_documents"
                                                        name="supporting_documents"
                                                        type="file"
                                                        className="sr-only"
                                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                        onChange={handleFileUpload}
                                                        required={requiresDocuments()}
                                                    />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                PDF, DOC, DOCX, JPG, JPEG, PNG up to 5MB
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-1 bg-white border border-gray-300 rounded-md p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="flex-shrink-0">
                                                    {uploadedFile.type.startsWith('image/') ? (
                                                        <img 
                                                            src={filePreview} 
                                                            alt="Preview" 
                                                            className="h-10 w-10 object-cover rounded border"
                                                        />
                                                    ) : (
                                                        <FileText className="h-10 w-10 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {uploadedFile.name}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={removeFile}
                                                className="ml-3 flex-shrink-0 bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                <p className="mt-1 text-xs text-gray-500">
                                    {requiresDocuments() 
                                        ? `Supporting documents are required for ${formData.type} leave`
                                        : 'Supporting documents are optional for this leave type'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 border-t">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SLVLForm;