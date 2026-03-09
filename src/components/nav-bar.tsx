'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CalendarDays, Users, Menu, X, Settings, CalendarClock, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useUnsavedChanges } from '@/components/providers/unsaved-changes-provider';
import { logOut } from '@/actions/auth';
import type { SessionPayload } from '@/lib/session';

interface NavBarProps {
    session: SessionPayload | null;
}

export function NavBar({ session }: NavBarProps) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { handleNavigation } = useUnsavedChanges();

    let routes = [
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
            href: '/manual',
            label: 'マニュアル',
            icon: BookOpen,
            active: pathname === '/manual',
        },
        ...(session?.role === 'admin' ? [{
            href: '/settings',
            label: 'システム設定',
            icon: Settings,
            active: pathname.startsWith('/settings'),
        }] : []),
    ];

    if (pathname === '/login') {
        routes = [];
    }

    return (
        <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 w-full">
            <div className="w-full px-4">
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
                        {session && (
                            <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-slate-200">
                                <Link href="/settings/profile" className="flex items-center group cursor-pointer hover:bg-slate-50 p-1.5 rounded-md transition-colors">
                                    <div className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                                        {session.name} <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full ml-1">{session.role === 'admin' ? '管理者' : '従業員'}</span>
                                    </div>
                                    <Settings className="w-4 h-4 ml-2 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </Link>
                                <form action={logOut}>
                                    <Button variant="ghost" size="sm" type="submit" className="text-slate-500 hover:text-red-600 hover:bg-red-50">
                                        ログアウト
                                    </Button>
                                </form>
                            </div>
                        )}
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
                        {session && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <div
                                    className="flex items-center justify-between mb-2 px-3 py-2 cursor-pointer hover:bg-slate-50 rounded-md transition-colors"
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        handleNavigation('/settings/profile');
                                    }}
                                >
                                    <div className="flex items-center">
                                        <span className="text-sm font-medium text-slate-700 mr-2">{session.name}</span>
                                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{session.role === 'admin' ? '管理者' : '従業員'}</span>
                                    </div>
                                    <Settings className="w-4 h-4 text-slate-400" />
                                </div>
                                <form action={logOut}>
                                    <Button variant="ghost" type="submit" className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 px-3">
                                        ログアウト
                                    </Button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
