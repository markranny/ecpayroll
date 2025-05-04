import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar, DollarSign, Users, Clock, ChevronRight, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Welcome({ auth, systemVersion }) {
    const [hoveredFeature, setHoveredFeature] = useState(null);
    const [showWelcome, setShowWelcome] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowWelcome(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const NavigationLink = ({ href, className, children }) => (
        <a href={href} className={`transition-all duration-300 ${className}`}>
            {children}
        </a>
    );

    const WavesSVG = () => (
        <div className="absolute bottom-0 left-0 w-full h-48 overflow-hidden">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-0 w-full h-48">
                <path 
                    d="M0,0 C150,90 400,0 500,90 C600,180 800,90 1200,120 L1200,120 L0,120 Z" 
                    className="fill-blue-100 dark:fill-blue-900 opacity-20">
                    <animate
                        attributeName="d"
                        dur="10s"
                        repeatCount="indefinite"
                        values="
                            M0,0 C150,90 400,0 500,90 C600,180 800,90 1200,120 L1200,120 L0,120 Z;
                            M0,0 C300,90 400,30 600,90 C800,150 900,90 1200,120 L1200,120 L0,120 Z;
                            M0,0 C150,90 400,0 500,90 C600,180 800,90 1200,120 L1200,120 L0,120 Z"
                    />
                </path>
            </svg>
        </div>
    );

    const CircleBackground = () => (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <svg className="absolute w-full h-full opacity-10" viewBox="0 0 100 100">
                <defs>
                    <pattern id="payrollPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                        {/* Dollar sign symbol */}
                        <path d="M10,4 L10,7 M10,13 L10,16 M8,6 C8,6 10,5 12,6 C14,7 14,9 12,10 C10,11 8,10 8,10 M8,10 C8,10 10,11 12,12 C14,13 14,15 12,16 C10,17 8,16 8,16" 
                              stroke="currentColor" 
                              fill="none" 
                              className="stroke-blue-200 dark:stroke-blue-800" 
                              strokeWidth="0.5"/>
                        
                        {/* Small percentage symbol */}
                        <path d="M2,18 L18,2 M4,4 A1,1 0 1,0 4,6 A1,1 0 1,0 4,4 M16,14 A1,1 0 1,0 16,16 A1,1 0 1,0 16,14" 
                              stroke="currentColor" 
                              fill="none" 
                              className="stroke-blue-200 dark:stroke-blue-800" 
                              strokeWidth="0.5"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#payrollPattern)" />
            </svg>
        </div>
    );

    const payrollFeatures = [
        {
            title: "Smart Payroll Processing",
            description: "Intelligent automation with real-time tax calculations and instant digital payslips",
            icon: DollarSign,
            bgColor: "from-blue-500 to-indigo-600",
            benefits: ["Auto-tax calculation", "Digital payslips", "Multi-currency support"]
        },
        {
            title: "Advanced Time Tracking",
            description: "Seamless attendance monitoring with AI-powered overtime detection",
            icon: Clock,
            bgColor: "from-emerald-500 to-teal-600",
            benefits: ["Biometric integration", "Leave management", "Shift planning"]
        },
        {
            title: "Employee Portal",
            description: "Self-service platform for document access and benefit management",
            icon: Users,
            bgColor: "from-purple-500 to-pink-600",
            benefits: ["Document center", "Benefits dashboard", "Training tracker"]
        },
        {
            title: "Smart Scheduling",
            description: "AI-powered payroll calendar with compliance monitoring",
            icon: Calendar,
            bgColor: "from-orange-500 to-red-600",
            benefits: ["Auto-scheduling", "Compliance checks", "Payment tracking"]
        },
    ];

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-all duration-500 overflow-hidden">
            <CircleBackground />
            
            {showWelcome && (
                <Alert 
                    className="fixed top-4 right-4 w-96 bg-gradient-to-r from-blue-500 to-indigo-600 text-white animate-slide-in-right z-50"
                >
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                        Welcome to EC Payroll - Your modern payroll management solution
                    </AlertDescription>
                </Alert>

            )}

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <header className="flex items-center justify-between py-8 animate-fade-in">
                    <div className="flex items-center space-x-4">
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform hover:scale-105 transition-all duration-300">
                            <span className="text-xl font-bold">EC</span>
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            PAYROLL
                        </h1>
                    </div>
                    <nav className="flex items-center space-x-6">
                        {auth?.user ? (
                            <NavigationLink
                                href="/dashboard"
                                className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            >
                                Dashboard
                            </NavigationLink>
                        ) : (
                            <>
                            <NavigationLink
                                href="/login"
                                className="relative z-0 rounded-lg px-6 py-3 text-md font-bold text-gray-700 hover:text-blue-600 dark:text-gray-300"
                            >
                                Log in
                            </NavigationLink>

                                {/* <NavigationLink
                                    href="/register"
                                    className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                >
                                    Register
                                </NavigationLink> */}
                            </>
                        )}
                    </nav>
                </header>

                <main className="relative py-20">
                    <div className="text-center space-y-8 animate-fade-in-up">
                        <h2 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent sm:text-6xl">
                            Intelligent Payroll Solutions
                        </h2>
                        <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                            Transform your payroll management with AI-powered automation. 
                            Experience faster processing, enhanced accuracy, and complete compliance.
                        </p>
                    </div>

                    <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {payrollFeatures.map((feature, index) => (
                            <Card 
                                key={feature.title}
                                className={`group transform transition-all duration-300 hover:scale-105 hover:shadow-xl
                                    animate-fade-in-up bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm`}
                                style={{ animationDelay: `${index * 150}ms` }}
                                onMouseEnter={() => setHoveredFeature(feature.title)}
                                onMouseLeave={() => setHoveredFeature(null)}
                            >
                                <CardHeader>
                                    <div className={`relative mb-4 h-16 w-16 rounded-xl bg-gradient-to-r ${feature.bgColor} 
                                        transform transition-all duration-300 group-hover:rotate-6 flex items-center justify-center`}>
                                        <feature.icon className="h-8 w-8 text-white" />
                                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                                    </div>
                                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                                        {feature.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                                    <ul className="mt-4 space-y-2">
                                        {feature.benefits.map((benefit, i) => (
                                            <li key={i} className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                                                {benefit}
                                            </li>
                                        ))}
                                    </ul>
                                    {/* <div className={`mt-6 flex items-center text-blue-600 dark:text-blue-300
                                        transform transition-all duration-300 ${hoveredFeature === feature.title ? 'translate-x-2' : ''}`}>
                                        <span className="text-sm font-medium">Learn more</span>
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </div> */}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </main>

                <footer className="relative py-[-10] text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        ECPayroll System v{systemVersion} • 1
                        <span className="inline-flex items-center ml-2">
                            Creator 
                            <span className="animate-pulse mx-1 text-red-500">❤️</span> 
                            MRPA
                        </span>
                    </p>
                </footer>
            </div>
            <WavesSVG />
        </div>
    );
}