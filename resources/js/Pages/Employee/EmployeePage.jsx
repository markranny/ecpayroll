import React, { useState, useEffect } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Sidebar from '@/Components/Sidebar';
import ViewEmployeeModal from './ViewEmployeeModal';
import { 
    Search, 
    Edit2, 
    Trash2,
    UserPlus,
    Eye,
    X,
    ShieldOff,
    Check,
    Lock,
    Users
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className="bg-white rounded-lg max-w-2xl w-full">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 id="modal-title" className="text-lg font-semibold">{title}</h3>
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

// Confirm Modal Component
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, confirmVariant = "destructive" }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={
                            confirmVariant === "destructive" 
                            ? "px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700" 
                            : confirmVariant === "warning"
                            ? "px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                            : "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        }
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Employee Form Component - Defined BEFORE it's used
const EmployeeForm = ({ isOpen, onClose, employee = null, mode = 'create' }) => {
    const [formData, setFormData] = useState({
        idno: '',
        bid: '',
        Lname: '',
        Fname: '',
        MName: '',
        Suffix: '',
        Gender: '',
        EducationalAttainment: '',
        Degree: '',
        CivilStatus: '',
        Birthdate: '',
        ContactNo: '',
        Email: '',
        PresentAddress: '',
        PermanentAddress: '',
        EmerContactName: '',
        EmerContactNo: '',
        EmerRelationship: '',
        EmpStatus: '',
        JobStatus: 'Active', // Default to Active for new employees
        RankFile: '',
        Department: '',
        Line: '',
        Jobtitle: '',
        HiredDate: '',
        EndOfContract: '',
        pay_type: '',
        payrate: '',
        pay_allowance: '',
        SSSNO: '',
        PHILHEALTHNo: '',
        HDMFNo: '',
        TaxNo: '',
        Taxable: false, // Set a default boolean value
        CostCenter: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (employee) {
            // Convert string 'Yes'/'No' to boolean if needed
            const taxableValue = typeof employee.Taxable === 'boolean' 
                ? employee.Taxable 
                : employee.Taxable === 'Yes' || employee.Taxable === '1';
                
            setFormData({
                ...employee,
                Taxable: taxableValue
            });
        } else {
            setFormData({
                idno: '',
                bid: '',
                Lname: '',
                Fname: '',
                MName: '',
                Suffix: '',
                Gender: '',
                EducationalAttainment: '',
                Degree: '',
                CivilStatus: '',
                Birthdate: '',
                ContactNo: '',
                Email: '',
                PresentAddress: '',
                PermanentAddress: '',
                EmerContactName: '',
                EmerContactNo: '',
                EmerRelationship: '',
                EmpStatus: '',
                JobStatus: 'Active', // Default to Active for new employees
                RankFile: '',
                Department: '',
                Line: '',
                Jobtitle: '',
                HiredDate: '',
                EndOfContract: '',
                pay_type: '',
                payrate: '',
                pay_allowance: '',
                SSSNO: '',
                PHILHEALTHNo: '',
                HDMFNo: '',
                TaxNo: '',
                Taxable: false, // Default boolean value
                CostCenter: '',
            });
        }
    }, [employee]);

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted with data:', formData);
        
        // Ensure Taxable is a boolean value
        const processedData = {
            ...formData,
            Taxable: Boolean(formData.Taxable)
        };
        
        if (mode === 'create') {
            router.post('/employees', processedData, {
                onError: (errors) => {
                    console.error('Validation errors:', errors);
                    setErrors(errors);
                },
                onSuccess: () => {
                    console.log('Employee created successfully');
                    onClose();
                },
                preserveScroll: true,
            });
        } else {
            // Make sure employee object exists and has an id
            if (!employee || !employee.id) {
                console.error('Employee object or ID is missing');
                setErrors({ general: 'Unable to update: Employee ID is missing' });
                return;
            }
            
            // Use the route with the employee ID
            router.put(`/employees/${employee.id}`, processedData, {
                headers: {
                    'Accept': 'application/json',
                },
                onError: (errors) => {
                    console.error('Validation errors:', errors);
                    setErrors(errors);
                },
                onSuccess: () => {
                    console.log('Employee updated successfully');
                    onClose();
                },
                preserveScroll: true,
            });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Special handling for Taxable field
        if (name === 'Taxable') {
            setFormData(prev => ({
                ...prev,
                [name]: value === '1' || value === 'true'
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
        
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose}
            title={mode === 'create' ? 'Add New Employee' : 'Edit Employee'}
        >
            <form onSubmit={handleSubmit} className="p-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                    {/* Personal Information */}
                    <div className="col-span-2">
                        <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                    </div>
                    
                    {/* ID Information */}
                    <div>
                        <label htmlFor="idno" className="block text-sm font-medium mb-1">
                            ID Number
                        </label>
                        <input
                            id="idno"
                            name="idno"
                            type="text"
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.idno ? 'border-red-500' : 'border-gray-300'}`}
                            value={formData.idno}
                            onChange={handleChange}
                        />
                        {errors.idno && <p className="mt-1 text-sm text-red-500">{errors.idno}</p>}
                    </div>

                    <div>
                        <label htmlFor="bid" className="block text-sm font-medium mb-1">
                            Biometrics ID
                        </label>
                        <input
                            id="bid"
                            name="bid"
                            type="text"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.bid}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Name Fields */}
                    <div>
                        <label htmlFor="Lname" className="block text-sm font-medium mb-1">
                            Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="Lname"
                            name="Lname"
                            type="text"
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.Lname ? 'border-red-500' : 'border-gray-300'}`}
                            value={formData.Lname}
                            onChange={handleChange}
                            required
                        />
                        {errors.Lname && <p className="mt-1 text-sm text-red-500">{errors.Lname}</p>}
                    </div>

                    <div>
                        <label htmlFor="Fname" className="block text-sm font-medium mb-1">
                            First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="Fname"
                            name="Fname"
                            type="text"
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.Fname ? 'border-red-500' : 'border-gray-300'}`}
                            value={formData.Fname}
                            onChange={handleChange}
                            required
                        />
                        {errors.Fname && <p className="mt-1 text-sm text-red-500">{errors.Fname}</p>}
                    </div>

                    <div>
                        <label htmlFor="MName" className="block text-sm font-medium mb-1">
                            Middle Name
                        </label>
                        <input
                            id="MName"
                            name="MName"
                            type="text"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.MName}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label htmlFor="Suffix" className="block text-sm font-medium mb-1">
                            Suffix
                        </label>
                        <input
                            id="Suffix"
                            name="Suffix"
                            type="text"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.Suffix}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Personal Details */}
                    <div>
                        <label htmlFor="Gender" className="block text-sm font-medium mb-1">
                            Gender
                        </label>
                        <select
                            id="Gender"
                            name="Gender"
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.Gender ? 'border-red-500' : 'border-gray-300'}`}
                            value={formData.Gender}
                            onChange={handleChange}
                        >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                        {errors.Gender && <p className="mt-1 text-sm text-red-500">{errors.Gender}</p>}
                    </div>

                    <div>
                        <label htmlFor="CivilStatus" className="block text-sm font-medium mb-1">
                            Civil Status
                        </label>
                        <select
                            id="CivilStatus"
                            name="CivilStatus"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.CivilStatus}
                            onChange={handleChange}
                        >
                            <option value="">Select Status</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Widowed">Widowed</option>
                            <option value="Divorced">Divorced</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="Birthdate" className="block text-sm font-medium mb-1">
                            Birthdate
                        </label>
                        <input
                            id="Birthdate"
                            name="Birthdate"
                            type="date"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.Birthdate}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Contact Information */}
                    <div className="col-span-2">
                        <h3 className="text-lg font-semibold mb-3 mt-4">Contact Information</h3>
                    </div>

                    <div>
                        <label htmlFor="ContactNo" className="block text-sm font-medium mb-1">
                            Contact Number
                        </label>
                        <input
                            id="ContactNo"
                            name="ContactNo"
                            type="tel"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.ContactNo}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label htmlFor="Email" className="block text-sm font-medium mb-1">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="Email"
                            name="Email"
                            type="email"
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.Email ? 'border-red-500' : 'border-gray-300'}`}
                            value={formData.Email}
                            onChange={handleChange}
                            required
                        />
                        {errors.Email && <p className="mt-1 text-sm text-red-500">{errors.Email}</p>}
                    </div>

                    {/* Employment Information */}
                    <div className="col-span-2">
                        <h3 className="text-lg font-semibold mb-3 mt-4">Employment Information</h3>
                    </div>

                    <div>
                        <label htmlFor="EmpStatus" className="block text-sm font-medium mb-1">
                            Employment Status
                        </label>
                        <select
                            id="EmpStatus"
                            name="EmpStatus"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.EmpStatus}
                            onChange={handleChange}
                        >
                            <option value="">Select Status</option>
                            <option value="Regular">Regular</option>
                            <option value="Contractual">Contractual</option>
                            <option value="Probationary">Probationary</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="JobStatus" className="block text-sm font-medium mb-1">
                            Job Status
                        </label>
                        <select
                            id="JobStatus"
                            name="JobStatus"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.JobStatus}
                            onChange={handleChange}
                        >
                            <option value="">Select Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Blocked">Blocked</option>
                            <option value="On Leave">On Leave</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="Department" className="block text-sm font-medium mb-1">
                            Department <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="Department"
                            name="Department"
                            type="text"
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.Department ? 'border-red-500' : 'border-gray-300'}`}
                            value={formData.Department}
                            onChange={handleChange}
                            required
                        />
                        {errors.Department && <p className="mt-1 text-sm text-red-500">{errors.Department}</p>}
                    </div>

                    <div>
                        <label htmlFor="Jobtitle" className="block text-sm font-medium mb-1">
                            Job Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="Jobtitle"
                            name="Jobtitle"
                            type="text"
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.Jobtitle ? 'border-red-500' : 'border-gray-300'}`}
                            value={formData.Jobtitle}
                            onChange={handleChange}
                            required
                        />
                        {errors.Jobtitle && <p className="mt-1 text-sm text-red-500">{errors.Jobtitle}</p>}
                    </div>

                    <div>
                        <label htmlFor="HiredDate" className="block text-sm font-medium mb-1">
                            Hired Date
                        </label>
                        <input
                            id="HiredDate"
                            name="HiredDate"
                            type="date"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.HiredDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label htmlFor="EndOfContract" className="block text-sm font-medium mb-1">
                            End of Contract
                        </label>
                        <input
                            id="EndOfContract"
                            name="EndOfContract"
                            type="date"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.EndOfContract}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Compensation Information */}
                    <div className="col-span-2">
                        <h3 className="text-lg font-semibold mb-3 mt-4">Compensation Information</h3>
                    </div>

                    <div>
                        <label htmlFor="pay_type" className="block text-sm font-medium mb-1">
                            Pay Type
                        </label>
                        <select
                            id="pay_type"
                            name="pay_type"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.pay_type}
                            onChange={handleChange}
                        >
                            <option value="">Select Pay Type</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Daily">Daily</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="payrate" className="block text-sm font-medium mb-1">
                            Pay Rate
                        </label>
                        <input
                            id="payrate"
                            name="payrate"
                            type="number"
                            step="0.01"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.payrate}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Government IDs - Simplified for brevity */}
                    <div className="col-span-2">
                        <h3 className="text-lg font-semibold mb-3 mt-4">Government Information</h3>
                    </div>

                    <div>
                        <label htmlFor="SSSNO" className="block text-sm font-medium mb-1">
                            SSS Number
                        </label>
                        <input
                            id="SSSNO"
                            name="SSSNO"
                            type="text"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.SSSNO}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label htmlFor="PHILHEALTHNo" className="block text-sm font-medium mb-1">
                            PhilHealth Number
                        </label>
                        <input
                            id="PHILHEALTHNo"
                            name="PHILHEALTHNo"
                            type="text"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.PHILHEALTHNo}
                            onChange={handleChange}
                        />
                    </div>
                    
                    {/* Taxable Field - Key fix for the SQL error */}
                    <div>
                        <label htmlFor="Taxable" className="block text-sm font-medium mb-1">
                            Taxable <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="Taxable"
                            name="Taxable"
                            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.Taxable ? "1" : "0"}
                            onChange={handleChange}
                            required
                        >
                            <option value="1">Yes</option>
                            <option value="0">No</option>
                        </select>
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
                        {mode === 'create' ? 'Add Employee' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

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
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 ${className}`}>
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
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all 
      ${isActive 
        ? "bg-white text-gray-950 shadow-sm" 
        : "hover:bg-gray-200 hover:text-gray-900"
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

// EmployeeList Component
// EmployeeList Component
const EmployeeList = ({ employees, onView, onEdit, onDelete, onMarkInactive, onMarkBlocked, onMarkActive }) => {
    if (!employees?.length) {
        return <div className="p-4 text-center text-gray-500">No employees found</div>;
    }
    
    const getStatusBadge = (status) => {
        switch(status) {
            case 'Active':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Check className="w-3 h-3 mr-1" />
                    Active
                </span>;
            case 'Inactive':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <ShieldOff className="w-3 h-3 mr-1" />
                    Inactive
                </span>;
            case 'Blocked':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <Lock className="w-3 h-3 mr-1" />
                    Blocked
                </span>;
            case 'On Leave':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    On Leave
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
                            ID No.
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            BID
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Job Title
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact No.
                        </th>
                    </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map((employee) => (
                        <tr key={employee.id} className={`hover:bg-gray-50 ${
                            employee.JobStatus === 'Inactive' ? 'bg-yellow-50' : 
                            employee.JobStatus === 'Blocked' ? 'bg-red-50' : ''
                        }`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-2">
                                    <Button 
                                        variant="outline"
                                        className="p-2"
                                        onClick={() => onView(employee)}
                                        title="View Employee"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>

                                    <Button 
                                        variant="secondary" 
                                        className="p-2"
                                        onClick={() => onEdit(employee)}
                                        title="Edit Employee"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    
                                    {employee.JobStatus !== 'Inactive' && (
                                        <Button 
                                            variant="warning"
                                            className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white"
                                            onClick={() => onMarkInactive(employee.id)}
                                            title="Mark as Inactive"
                                        >
                                            <ShieldOff className="h-4 w-4" />
                                        </Button>
                                    )}
                                    
                                    {employee.JobStatus !== 'Blocked' && (
                                        <Button 
                                            variant="destructive"
                                            className="p-2"
                                            onClick={() => onMarkBlocked(employee.id)}
                                            title="Block Employee"
                                        >
                                            <Lock className="h-4 w-4" />
                                        </Button>
                                    )}
                                    
                                    {(employee.JobStatus === 'Inactive' || employee.JobStatus === 'Blocked') && (
                                        <Button 
                                            variant="default"
                                            className="p-2 bg-green-500 hover:bg-green-600 text-white"
                                            onClick={() => onMarkActive(employee.id)}
                                            title="Mark as Active"
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                    )}
                                    
                                    <Button 
                                        variant="destructive"
                                        className="p-2"
                                        onClick={() => onDelete(employee.id)}
                                        title="Delete Employee"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{employee.idno}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">{employee.bid || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {`${employee.Lname}, ${employee.Fname} ${employee.MName || ''}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {getStatusBadge(employee.JobStatus)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{employee.Department}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{employee.Jobtitle}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{employee.Email || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{employee.ContactNo || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Status Card Component
const StatusCard = ({ title, count, icon, bgColor, textColor }) => (
    <Card className={`${bgColor} shadow-sm`}>
        <CardContent className="p-6 flex justify-between items-center">
            <div>
                <p className={`text-sm font-medium ${textColor}`}>{title}</p>
                <p className="text-2xl font-bold">{count}</p>
            </div>
            <div className={`p-3 rounded-full ${bgColor.replace("bg-", "bg-opacity-20")}`}>
                {icon}
            </div>
        </CardContent>
    </Card>
);

// Main EmployeePage Component
const EmployeePage = ({ employees: initialEmployees, currentStatus = 'all', flash }) => {
    const { auth } = usePage().props;
    const [filteredEmployees, setFilteredEmployees] = useState(initialEmployees || []);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [formMode, setFormMode] = useState('create');
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '',
        confirmVariant: 'destructive',
        onConfirm: () => {}
    });
    
    const [statusCounts, setStatusCounts] = useState({
        total: initialEmployees?.length || 0,
        active: initialEmployees?.filter(e => e.JobStatus === 'Active').length || 0,
        inactive: initialEmployees?.filter(e => e.JobStatus === 'Inactive').length || 0,
        blocked: initialEmployees?.filter(e => e.JobStatus === 'Blocked').length || 0
    });
    const [activeTab, setActiveTab] = useState(currentStatus || 'all');

    useEffect(() => {
        let filtered = initialEmployees || [];
        
        // Filter by status tab
        if (activeTab !== 'all') {
            filtered = filtered.filter(employee => employee.JobStatus === activeTab);
        }
        
        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(employee => 
                (employee.Lname?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (employee.Fname?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (employee.Email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (employee.Department?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (employee.idno?.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        
        setFilteredEmployees(filtered);
    }, [searchTerm, initialEmployees, activeTab]);
    
    useEffect(() => {
        if (initialEmployees) {
            setStatusCounts({
                total: initialEmployees.length,
                active: initialEmployees.filter(e => e.JobStatus === 'Active').length,
                inactive: initialEmployees.filter(e => e.JobStatus === 'Inactive').length,
                blocked: initialEmployees.filter(e => e.JobStatus === 'Blocked').length
            });
        }
    }, [initialEmployees]);

    const handleView = (employee) => {
        setSelectedEmployee(employee);
        setViewModalOpen(true);
    };

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Employee',
            message: 'Are you sure you want to delete this employee? This action cannot be undone.',
            confirmText: 'Delete',
            confirmVariant: 'destructive',
            onConfirm: () => {
                router.delete(`/employees/${id}`, {
                    onSuccess: () => {
                        setConfirmModal({...confirmModal, isOpen: false});
                    },
                    preserveScroll: true,
                });
            }
        });
    };
    
    const handleMarkInactive = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Mark Employee as Inactive',
            message: 'Are you sure you want to mark this employee as inactive?',
            confirmText: 'Mark Inactive',
            confirmVariant: 'warning',
            onConfirm: () => {
                router.post(`/employees/${id}/mark-inactive`, {}, { 
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        // Update the employee status locally to avoid reload
                        setFilteredEmployees(prev => 
                            prev.map(emp => emp.id === id ? {...emp, JobStatus: 'Inactive'} : emp)
                        );
                        
                        // Update status counts
                        setStatusCounts(prev => {
                            const employee = initialEmployees.find(e => e.id === id);
                            const prevStatus = employee?.JobStatus;
                            
                            return {
                                ...prev,
                                active: prevStatus === 'Active' ? prev.active - 1 : prev.active,
                                inactive: prev.inactive + 1
                            };
                        });
                        
                        setConfirmModal({...confirmModal, isOpen: false});
                    }
                });
            }
        });
    };

    const handleMarkBlocked = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Block Employee',
            message: 'Are you sure you want to block this employee? Blocked employees will not be able to access any company resources.',
            confirmText: 'Block',
            confirmVariant: 'destructive',
            onConfirm: () => {
                router.post(`/employees/${id}/mark-blocked`, {}, {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        // Update the employee status locally to avoid reload
                        setFilteredEmployees(prev => 
                            prev.map(emp => emp.id === id ? {...emp, JobStatus: 'Blocked'} : emp)
                        );
                        
                        // Update status counts
                        setStatusCounts(prev => {
                            const employee = initialEmployees.find(e => e.id === id);
                            const prevStatus = employee?.JobStatus;
                            
                            return {
                                ...prev,
                                active: prevStatus === 'Active' ? prev.active - 1 : prev.active,
                                inactive: prevStatus === 'Inactive' ? prev.inactive - 1 : prev.inactive,
                                blocked: prev.blocked + 1
                            };
                        });
                        
                        setConfirmModal({...confirmModal, isOpen: false});
                    }
                });
            }
        });
    };

    const handleMarkActive = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Activate Employee',
            message: 'Are you sure you want to mark this employee as active?',
            confirmText: 'Activate',
            confirmVariant: 'default',
            onConfirm: () => {
                router.post(`/employees/${id}/mark-active`, {}, {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        // Update the employee status locally to avoid reload
                        setFilteredEmployees(prev => 
                            prev.map(emp => emp.id === id ? {...emp, JobStatus: 'Active'} : emp)
                        );
                        
                        // Update status counts
                        setStatusCounts(prev => {
                            const employee = initialEmployees.find(e => e.id === id);
                            const prevStatus = employee?.JobStatus;
                            
                            return {
                                ...prev,
                                active: prev.active + 1,
                                inactive: prevStatus === 'Inactive' ? prev.inactive - 1 : prev.inactive,
                                blocked: prevStatus === 'Blocked' ? prev.blocked - 1 : prev.blocked
                            };
                        });
                        
                        setConfirmModal({...confirmModal, isOpen: false});
                    }
                });
            }
        });
    };
    
    const handleTabChange = (value) => {
        setActiveTab(value);
        
        // Use router.visit with preserveState and preserveScroll to avoid full page reload
        router.visit(`/employees?status=${value}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['employees', 'currentStatus']
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Employee Management" />
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
                                    Employee Management
                                </h1>
                                <p className="text-gray-600">
                                    Manage your employee records and information.
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <Button
                                    onClick={() => {
                                        setFormMode('create');
                                        setSelectedEmployee(null);
                                        setIsFormOpen(true);
                                    }}
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                                >
                                    <UserPlus className="w-5 h-5 mr-2" />
                                    Add Employee
                                </Button>
                            </div>
                        </div>
                        
                        {/* Status Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <StatusCard 
                                title="Total Employees" 
                                count={statusCounts.total}
                                icon={<Users className="h-6 w-6 text-indigo-600" />}
                                bgColor="bg-white"
                                textColor="text-gray-600"
                            />
                            <StatusCard 
                                title="Active Employees" 
                                count={statusCounts.active}
                                icon={<Check className="h-6 w-6 text-green-600" />}
                                bgColor="bg-white"
                                textColor="text-gray-600"
                            />
                            <StatusCard 
                                title="Inactive Employees" 
                                count={statusCounts.inactive}
                                icon={<ShieldOff className="h-6 w-6 text-yellow-600" />}
                                bgColor="bg-white" 
                                textColor="text-gray-600"
                            />
                            <StatusCard 
                                title="Blocked Employees" 
                                count={statusCounts.blocked}
                                icon={<Lock className="h-6 w-6 text-red-600" />}
                                bgColor="bg-white"
                                textColor="text-gray-600"
                            />
                        </div>

                        {/* Search Bar */}
                        <div className="flex gap-4 mb-6">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        {/* Tabs for filtering by status */}
                        <Tabs defaultValue={activeTab} className="mb-6" onValueChange={handleTabChange}>
                            <TabsList className="grid grid-cols-5 w-full">
                                <TabsTrigger value="all">All Employees</TabsTrigger>
                                <TabsTrigger value="Active">
                                    <Check className="h-4 w-4 mr-2" />
                                    Active
                                </TabsTrigger>
                                <TabsTrigger value="Inactive">
                                    <ShieldOff className="h-4 w-4 mr-2" />
                                    Inactive
                                </TabsTrigger>
                                <TabsTrigger value="Blocked">
                                    <Lock className="h-4 w-4 mr-2" />
                                    Blocked
                                </TabsTrigger>
                                <TabsTrigger value="On Leave">On Leave</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Employee List */}
                        <div className="bg-white rounded-lg shadow">
                            <EmployeeList
                                employees={filteredEmployees}
                                onView={handleView}
                                onEdit={(employee) => {
                                    setSelectedEmployee(employee);
                                    setFormMode('edit');
                                    setIsFormOpen(true);
                                }}
                                onDelete={handleDelete}
                                onMarkInactive={handleMarkInactive}
                                onMarkBlocked={handleMarkBlocked}
                                onMarkActive={handleMarkActive}
                            />
                        </div>

                        {/* Modals */}
                        <ViewEmployeeModal
                            isOpen={viewModalOpen}
                            onClose={() => {
                                setViewModalOpen(false);
                                setSelectedEmployee(null);
                            }}
                            employee={selectedEmployee}
                        />

                        <EmployeeForm
                            isOpen={isFormOpen}
                            onClose={() => {
                                setIsFormOpen(false);
                                setSelectedEmployee(null);
                            }}
                            employee={selectedEmployee}
                            mode={formMode}
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

export default EmployeePage;