'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CalendarDays, Users, Menu, X, Settings, CalendarClock } from 'lucide-react';
import { useState } from 'react';
import { useUnsavedChanges } from '@/components/providers/unsaved-changes-provider';

export function NavBar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { handleNavigation } = useUnsavedChanges();

    const routes = [
        {
            href: '/',
            label: 'カレンダー',
            icon: CalendarDays,
            active: pathname === '/',
        },
        {
            href: '/schedules',
            label: '予定管理',
            icon: CalendarClock,
            active: pathname.startsWith('/schedules'),
        },
        {
            href: '/settings',
            label: 'システム設定',
            icon: Settings,
            active: pathname.startsWith('/settings'),
        },
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 w-full">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center">
                        <div
                            onClick={() => handleNavigation('/')}
                            className="flex items-center space-x-2 cursor-pointer"
                        >
                            <span className="text-xl font-bold text-slate-900 tracking-tight">シフト管理システム</span>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden xl:flex items-center space-x-8">
                        {routes.map((route) => (
                            <div
                                key={route.href}
                                onClick={() => handleNavigation(route.href)}
                                className={cn(
                                    "flex items-center text-sm font-medium transition-colors border-b-2 py-5 cursor-pointer",
                                    route.active
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                                )}
                            >
                                <route.icon className="mr-2 h-4 w-4" />
                                {route.label}
                            </div>
                        ))}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="xl:hidden">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? (
                                <X className="h-6 w-6 text-slate-900" />
                            ) : (
                                <Menu className="h-6 w-6 text-slate-900" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="xl:hidden border-t border-slate-200 bg-white">
                    <div className="space-y-1 px-4 py-3">
                        {routes.map((route) => (
                            <div
                                key={route.href}
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    handleNavigation(route.href);
                                }}
                                className={cn(
                                    "flex items-center rounded-md px-3 py-2 text-base font-medium transition-colors cursor-pointer",
                                    route.active
                                        ? "bg-blue-50 text-blue-600"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <route.icon className="mr-3 h-5 w-5" />
                                {route.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
}
