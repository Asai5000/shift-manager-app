'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Users, Settings, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuItems = [
        {
            href: '/settings/employees',
            label: '従業員管理',
            icon: Users,
            active: pathname.startsWith('/settings/employees'),
        },
        // Future items can be added here
    ];

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white fixed top-16 bottom-0 z-30">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center mb-6">
                        <Settings className="mr-2 h-5 w-5" />
                        システム設定
                    </h2>
                    <nav className="space-y-1">
                        {menuItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                    item.active
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                                )}
                            >
                                <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Mobile Header & Content Wrapper */}
            <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300">
                {/* Mobile Header for Settings */}
                <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center">
                        <Settings className="mr-2 h-5 w-5" />
                        システム設定
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </Button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-1 absolute w-full z-40 shadow-lg top-[60px] left-0">
                        {/* Note: top offset depends on main navbar height (16 = 4rem) + local header height (~60px) */}
                        {/* Or we can just render it below header. */}
                        {menuItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                    "flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors",
                                    item.active
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                                )}
                            >
                                <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                                {item.label}
                            </Link>
                        ))}
                    </div>
                )}

                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
