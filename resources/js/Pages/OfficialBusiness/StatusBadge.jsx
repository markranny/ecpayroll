// resources/js/Pages/OfficialBusiness/StatusBadge.jsx
import React from 'react';

const StatusBadge = ({ status }) => {
    let bgColor = '';
    let textColor = 'text-white';
    
    switch(status) {
        case 'pending':
            bgColor = 'bg-yellow-500';
            break;
        case 'approved':
            bgColor = 'bg-green-500';
            break;
        case 'rejected':
            bgColor = 'bg-red-500';
            break;
        default:
            bgColor = 'bg-gray-500';
    }
    
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
            {status && status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

export default StatusBadge;