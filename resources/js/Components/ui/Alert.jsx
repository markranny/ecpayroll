import React from 'react';

export const Alert = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 border-gray-200 text-gray-800',
    destructive: 'bg-red-100 border-red-200 text-red-800',
    warning: 'bg-yellow-100 border-yellow-200 text-yellow-800',
    success: 'bg-green-100 border-green-200 text-green-800'
  };

  return (
    <div className={`p-4 rounded-lg border ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};

export const AlertTitle = ({ children }) => (
  <h5 className="font-medium mb-1">{children}</h5>
);

export const AlertDescription = ({ children }) => (
  <div className="text-sm">{children}</div>
);