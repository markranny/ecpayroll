// resources/js/Pages/Overtime/OvertimeRateHelpModal.jsx
import React from 'react';

const OvertimeRateHelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    Overtime Pay Rate Guide
                                </h3>
                                
                                <div className="mt-2 space-y-6">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Ordinary Working Day</h4>
                                        <p className="text-sm text-gray-600 mb-2">For work beyond 8 hours on a regular working day:</p>
                                        <ul className="list-disc list-inside text-sm text-gray-600 ml-2">
                                            <li>Ordinary Weekday Overtime: hourly rate × 125%</li>
                                            <li>With Night Differential (10pm-6am): hourly rate × 125% × 110% = 137.5%</li>
                                        </ul>
                                    </div>
                                    
                                    <div>
                                        <h4 className="font-medium text-gray-900">Rest Days and Special Non-Working Days</h4>
                                        <p className="text-sm text-gray-600 mb-2">For the first 8 hours of work:</p>
                                        <ul className="list-disc list-inside text-sm text-gray-600 ml-2">
                                            <li>Rest Day/Special Day: hourly rate × 130%</li>
                                            <li>Scheduled Rest Day: hourly rate × 150%</li>
                                        </ul>
                                        
                                        <p className="text-sm text-gray-600 mt-2 mb-2">For work beyond 8 hours:</p>
                                        <ul className="list-disc list-inside text-sm text-gray-600 ml-2">
                                            <li>Rest Day/Special Day Overtime: hourly rate × 130% × 130% = 169%</li>
                                            <li>Scheduled Rest Day Overtime: hourly rate × 150% × 130% = 195%</li>
                                        </ul>
                                        
                                        <p className="text-sm text-gray-600 mt-2 mb-2">With Night Differential (10pm-6am):</p>
                                        <ul className="list-disc list-inside text-sm text-gray-600 ml-2">
                                            <li>Rest Day/Special Day + Night Differential: hourly rate × 130% × 110% = 143%</li>
                                            <li>Scheduled Rest Day + Night Differential: hourly rate × 150% × 110% = 165%</li>
                                            <li>Rest Day/Special Day Overtime + Night Differential: hourly rate × 169% × 110% = 185.9%</li>
                                            <li>Scheduled Rest Day Overtime + Night Differential: hourly rate × 195% × 110% = 214.5%</li>
                                        </ul>
                                    </div>
                                    
                                    <div>
                                        <h4 className="font-medium text-gray-900">Regular Holidays</h4>
                                        <p className="text-sm text-gray-600 mb-2">For the first 8 hours of work:</p>
                                        <ul className="list-disc list-inside text-sm text-gray-600 ml-2">
                                            <li>Regular Holiday: hourly rate × 200%</li>
                                        </ul>
                                        
                                        <p className="text-sm text-gray-600 mt-2 mb-2">For work beyond 8 hours:</p>
                                        <ul className="list-disc list-inside text-sm text-gray-600 ml-2">
                                            <li>Regular Holiday Overtime: hourly rate × 200% × 130% = 260%</li>
                                        </ul>
                                        
                                        <p className="text-sm text-gray-600 mt-2 mb-2">With Night Differential (10pm-6am):</p>
                                        <ul className="list-disc list-inside text-sm text-gray-600 ml-2">
                                            <li>Regular Holiday + Night Differential: hourly rate × 200% × 110% = 220%</li>
                                            <li>Regular Holiday Overtime + Night Differential: hourly rate × 260% × 110% = 286%</li>
                                        </ul>
                                    </div>
                                    
                                    <div>
                                        <h4 className="font-medium text-gray-900">Night Shift Differential</h4>
                                        <p className="text-sm text-gray-600 mb-2">For work between 10PM and 6AM, add 10% to any rate:</p>
                                        <ul className="list-disc list-inside text-sm text-gray-600 ml-2">
                                            <li>Any rate type × 110%</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button 
                            type="button" 
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OvertimeRateHelpModal;