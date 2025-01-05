import React, { useState } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { Bell, Search, Menu, X, UserCircle, Settings, LogOut } from 'lucide-react';

const TopNavigation = ({ user, showingNavigationDropdown, setShowingNavigationDropdown }) => (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50">
        <div className="px-4">
            <div className="flex justify-between h-16">
                {/* Left section */}
                <div className="flex items-center">
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/">
                            <ApplicationLogo className="block h-9 w-auto fill-current text-gray-800" />
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden sm:flex sm:ml-10">
                        <NavLink
                            href={route('dashboard')}
                            active={route().current('dashboard')}
                            className="inline-flex items-center px-4 h-16 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors duration-200"
                        >
                            Dashboard
                        </NavLink>
                    </div>
                </div>

                {/* Search Bar - Desktop */}
                <div className="hidden sm:flex flex-1 max-w-md ml-8 items-center">
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors duration-200"
                            placeholder="Search..."
                        />
                    </div>
                </div>

                {/* Right section */}
                <div className="hidden sm:flex items-center space-x-4">
                    {/* Notification Bell */}
                    <button className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg">
                        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
                        <Bell className="h-6 w-6" />
                    </button>

                    {/* User Dropdown */}
                    <Dropdown>
                        <Dropdown.Trigger>
                            <button className="flex items-center space-x-3 text-sm focus:outline-none">
                                <div className="relative">
                                    <img
                                        className="h-9 w-9 rounded-full object-cover border-2 border-white shadow-sm"
                                        src={`https://ui-avatars.com/api/?name=${user.name}&color=7F9CF5&background=EBF4FF`}
                                        alt={user.name}
                                    />
                                    <div className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white"></div>
                                </div>
                                <div className="hidden md:block text-left">
                                    <p className="text-sm font-medium text-gray-700">{user.name}</p>
                                    <p className="text-xs text-gray-500">Administrator</p>
                                </div>
                            </button>
                        </Dropdown.Trigger>

                        <Dropdown.Content width="48" className="mt-1">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-sm text-gray-600">Signed in as</p>
                                <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                            </div>
                            <Dropdown.Link href={route('profile.edit')} className="flex items-center">
                                <UserCircle className="mr-2 h-4 w-4" />
                                Profile
                            </Dropdown.Link>
                            <Dropdown.Link href="/settings" className="flex items-center">
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Dropdown.Link>
                            <Dropdown.Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="flex items-center w-full"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Log Out
                            </Dropdown.Link>
                        </Dropdown.Content>
                    </Dropdown>
                </div>

                {/* Mobile menu button */}
                <div className="flex items-center sm:hidden">
                    <button
                        onClick={() => setShowingNavigationDropdown(!showingNavigationDropdown)}
                        className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors duration-200"
                    >
                        {showingNavigationDropdown ? (
                            <X className="h-6 w-6" />
                        ) : (
                            <Menu className="h-6 w-6" />
                        )}
                    </button>
                </div>
            </div>
        </div>

        {/* Mobile menu */}
        <div className={`${showingNavigationDropdown ? 'block' : 'hidden'} sm:hidden border-b border-gray-200`}>
            <div className="pt-2 pb-3 space-y-1">
                <ResponsiveNavLink
                    href={route('dashboard')}
                    active={route().current('dashboard')}
                    className="block pl-3 pr-4 py-2 text-base font-medium transition-colors duration-200"
                >
                    Dashboard
                </ResponsiveNavLink>
            </div>

            {/* Mobile search */}
            <div className="px-4 pb-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                        placeholder="Search..."
                    />
                </div>
            </div>

            <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="flex items-center px-4">
                    <div className="flex-shrink-0">
                        <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={`https://ui-avatars.com/api/?name=${user.name}&color=7F9CF5&background=EBF4FF`}
                            alt={user.name}
                        />
                    </div>
                    <div className="ml-3">
                        <div className="text-base font-medium text-gray-800">{user.name}</div>
                        <div className="text-sm font-medium text-gray-500">{user.email}</div>
                    </div>
                </div>

                <div className="mt-3 space-y-1">
                    <ResponsiveNavLink href={route('profile.edit')} className="flex items-center">
                        <UserCircle className="mr-2 h-4 w-4" />
                        Profile
                    </ResponsiveNavLink>
                    <ResponsiveNavLink href="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </ResponsiveNavLink>
                    <ResponsiveNavLink
                        method="post"
                        href={route('logout')}
                        as="button"
                        className="flex items-center w-full"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Log Out
                    </ResponsiveNavLink>
                </div>
            </div>
        </div>
    </nav>
);

export default function AuthenticatedLayout({ header, children }) {
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const { auth } = usePage().props;

    return (
        <div className="min-h-screen bg-gray-50">
            <TopNavigation
                user={auth.user}
                showingNavigationDropdown={showingNavigationDropdown}
                setShowingNavigationDropdown={setShowingNavigationDropdown}
            />

            <div className="pt-16"> {/* Add padding top to account for fixed navbar */}
                {header && (
                    <header className="bg-white shadow-sm">
                        <div className="px-4 py-4">
                            {header}
                        </div>
                    </header>
                )}

                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}