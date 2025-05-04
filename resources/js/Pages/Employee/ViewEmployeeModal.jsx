import React from 'react';
import { X, Shield, ShieldOff, UserX, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ViewEmployeeModal = ({ isOpen, onClose, employee }) => {
    if (!isOpen || !employee) return null;

    const renderStatusBadge = (status) => {
        switch(status) {
            case 'Active':
                return <div className="flex items-center text-green-600 font-medium">
                    <Check className="h-5 w-5 mr-1" />
                    Active
                </div>;
            case 'Inactive':
                return <div className="flex items-center text-yellow-600 font-medium">
                    <ShieldOff className="h-5 w-5 mr-1" />
                    Inactive
                </div>;
            case 'Blocked':
                return <div className="flex items-center text-red-600 font-medium">
                    <Lock className="h-5 w-5 mr-1" />
                    Blocked
                </div>;
            case 'On Leave':
                return <div className="flex items-center text-blue-600 font-medium">
                    On Leave
                </div>;
            default:
                return <div>{status}</div>;
        }
    };

    const renderSection = (title, fields) => (
        <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">{title}</h3>
            <div className="grid grid-cols-2 gap-4">
                {fields.map(([label, value, custom]) => (
                    <div key={label} className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">{label}</p>
                        {custom ? custom : <p className="text-sm text-gray-900">{value || '-'}</p>}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-lg max-w-2xl w-full">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold">Employee Details</h3>
                    <button 
                        onClick={onClose} 
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {renderSection('Personal Information', [
                        ['ID Number', employee.idno],
                        ['Business ID', employee.bid],
                        ['Last Name', employee.Lname],
                        ['First Name', employee.Fname],
                        ['Middle Name', employee.MName],
                        ['Suffix', employee.Suffix],
                        ['Gender', employee.Gender],
                        ['Civil Status', employee.CivilStatus],
                        ['Birthdate', employee.Birthdate]
                    ])}

                    {renderSection('Status Information', [
                        ['Employment Status', employee.EmpStatus],
                        ['Job Status', null, renderStatusBadge(employee.JobStatus)]
                    ])}

                    {renderSection('Educational Background', [
                        ['Educational Attainment', employee.EducationalAttainment],
                        ['Degree', employee.Degree]
                    ])}

                    {renderSection('Contact Information', [
                        ['Contact Number', employee.ContactNo],
                        ['Email', employee.Email],
                        ['Present Address', employee.PresentAddress],
                        ['Permanent Address', employee.PermanentAddress]
                    ])}

                    {renderSection('Emergency Contact', [
                        ['Contact Name', employee.EmerContactName],
                        ['Contact Number', employee.EmerContactNo],
                        ['Relationship', employee.EmerRelationship]
                    ])}

                    {renderSection('Employment Information', [
                        ['Rank/File', employee.RankFile],
                        ['Department', employee.Department],
                        ['Line', employee.Line],
                        ['Job Title', employee.Jobtitle],
                        ['Hired Date', employee.HiredDate],
                        ['End of Contract', employee.EndOfContract]
                    ])}

                    {renderSection('Compensation Information', [
                        ['Pay Type', employee.pay_type],
                        ['Pay Rate', employee.payrate],
                        ['Pay Allowance', employee.pay_allowance]
                    ])}

                    {renderSection('Government Information', [
                        ['SSS Number', employee.SSSNO],
                        ['PhilHealth Number', employee.PHILHEALTHNo],
                        ['HDMF Number', employee.HDMFNo],
                        ['Tax Number', employee.TaxNo],
                        ['Taxable', employee.Taxable],
                        ['Cost Center', employee.CostCenter]
                    ])}

                    <div className="flex justify-end mt-6">
                        <Button onClick={onClose}>Close</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewEmployeeModal;