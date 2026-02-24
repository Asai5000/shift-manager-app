'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CalendarClock, Settings, Calculator, LayoutList } from 'lucide-react';

export default function SchedulesLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const menuItems = [
        {
            href: '/schedules/recurring',
            label: '繰り返し',
            icon: CalendarClock,
            active: pathname.startsWith('/schedules/recurring'),
        },
        {
            href: '/schedules/aggregation',
            label: '集計表',
            icon: Calculator,
            active: pathname.startsWith('/schedules/aggregation'),
        },
        {
            href: '/schedules/tasks-am',
            label: 'AM',
            icon: LayoutList,
            active: pathname.startsWith('/schedules/tasks-am'),
        },
        {
            href: '/schedules/tasks-pm',
            label: 'PM',
            icon: LayoutList,
            active: pathname.startsWith('/schedules/tasks-pm'),
        },
        {
            href: '/schedules/adjust',
            label: '調整',
            icon: Settings,
            active: pathname.startsWith('/schedules/adjust'),
        },
    ];

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar (Desktop) */}
            <aside className="hidden xl:flex w-64 flex-col border-r border-slate-200 bg-white fixed top-16 bottom-0 z-30">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center mb-6">
                        <CalendarClock className="mr-2 h-5 w-5" />
                        予定管理
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
            <div className="flex-1 flex flex-col xl:pl-64 transition-all duration-300 min-w-0">
                {/* Mobile Tab Bar */}
                <div className="xl:hidden bg-white border-b border-slate-200 overflow-x-auto">
                    <div className="flex min-w-max">
                        {menuItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-1 px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors",
                                    item.active
                                        ? "border-blue-600 text-blue-600 bg-blue-50/50"
                                        : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                )}
                            >
                                <item.icon className="h-3.5 w-3.5 shrink-0" />
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>

                <main className="flex-1 p-3 xl:p-6 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
