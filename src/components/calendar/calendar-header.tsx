'use client';

import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface CalendarHeaderProps {
    year: number;
    month: number;
}

export function CalendarHeader({ year, month }: CalendarHeaderProps) {
    const router = useRouter();

    const handlePrev = () => {
        let newYear = year;
        let newMonth = month - 1;
        if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }
        router.push(`/?year=${newYear}&month=${newMonth}`);
    };

    const handleNext = () => {
        let newYear = year;
        let newMonth = month + 1;
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        }
        router.push(`/?year=${newYear}&month=${newMonth}`);
    };

    const handleToday = () => {
        const now = new Date();
        router.push(`/?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
    };

    return (
        <div className="flex items-center justify-between mb-2 xl:mb-4 gap-2">
            <div className="flex items-center space-x-2 xl:space-x-4 overflow-hidden">
                <h2 className="text-lg xl:text-2xl font-bold text-slate-900 whitespace-nowrap">
                    {year}年 {month}月
                </h2>
                <div className="flex items-center space-x-1 no-print">
                    <Button variant="outline" size="sm" className="px-2 h-8 xl:h-10" onClick={handlePrev}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="px-2 xl:px-4 h-8 xl:h-10 text-xs xl:text-sm" onClick={handleToday}>
                        今日
                    </Button>
                    <Button variant="outline" size="sm" className="px-2 h-8 xl:h-10" onClick={handleNext}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print h-8 xl:h-10 px-2 xl:px-4">
                <Printer className="h-4 w-4 mr-1 xl:mr-2" />
                <span className="hidden sm:inline">印刷</span>
            </Button>
        </div>
    );
}
