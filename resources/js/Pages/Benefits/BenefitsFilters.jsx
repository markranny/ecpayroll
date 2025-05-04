import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BenefitsFilters = ({ filters, months, years, onFilterChange, onSearch }) => {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    // Update searchTerm when filters.search changes from parent
    useEffect(() => {
        setSearchTerm(filters.search || '');
    }, [filters.search]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        onSearch(value);
    };

    return (
        <div className="flex flex-wrap gap-4 mb-6">
            {/* Cutoff Selection */}
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Cutoff:</span>
                <div className="inline-flex rounded-md shadow-sm">
                    <Button
                        type="button"
                        className={`px-4 py-2 text-sm rounded-l-md ${
                            filters.cutoff === '1st'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => onFilterChange('cutoff', '1st')}
                    >
                        1st (1-15)
                    </Button>
                    <Button
                        type="button"
                        className={`px-4 py-2 text-sm rounded-r-md ${
                            filters.cutoff === '2nd'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => onFilterChange('cutoff', '2nd')}
                    >
                        2nd (16-31)
                    </Button>
                </div>
            </div>

            {/* Month Dropdown */}
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Month:</span>
                <select
                    className="w-40 px-4 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.month}
                    onChange={(e) => onFilterChange('month', e.target.value)}
                >
                    {months.map((month) => (
                        <option key={month.id} value={month.id}>
                            {month.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Year Dropdown */}
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Year:</span>
                <select
                    className="w-28 px-4 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.year}
                    onChange={(e) => onFilterChange('year', e.target.value)}
                >
                    {years.map((year) => (
                        <option key={year} value={year}>
                            {year}
                        </option>
                    ))}
                </select>
            </div>

            {/* Search Field */}
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                    type="text"
                    placeholder="Search employees..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
            </div>
        </div>
    );
};

export default BenefitsFilters;