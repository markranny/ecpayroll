// resources/js/components/overtime/OvertimeIndex.jsx
import React, { useState } from 'react';
import OvertimeForm from './OvertimeForm';
import OvertimeList from './OvertimeList';

const OvertimeIndex = () => {
    const [activeTab, setActiveTab] = useState('list');
    
    return (
        <div className="container-fluid py-4">
            <h2 className="mb-4">Overtime Management</h2>
            
            <div className="mb-4">
                <ul className="nav nav-tabs">
                    <li className="nav-item">
                        <button 
                            className={`nav-link ${activeTab === 'list' ? 'active' : ''}`}
                            onClick={() => setActiveTab('list')}
                        >
                            View Overtimes
                        </button>
                    </li>
                    <li className="nav-item">
                        <button 
                            className={`nav-link ${activeTab === 'create' ? 'active' : ''}`}
                            onClick={() => setActiveTab('create')}
                        >
                            File New Overtime
                        </button>
                    </li>
                </ul>
            </div>
            
            {activeTab === 'list' ? (
                <OvertimeList />
            ) : (
                <OvertimeForm />
            )}
        </div>
    );
};

export default OvertimeIndex;