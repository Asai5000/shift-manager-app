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
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-slate-900">
                    {year}年 {month}月
                </h2>
                <div className="flex items-center space-x-1 no-print">
                    <Button variant="outline" size="icon" onClick={handlePrev}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={handleToday}>
                        今日
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleNext}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <Button variant="outline" onClick={() => window.print()} className="no-print">
                <Printer className="h-4 w-4 mr-2" />
                印刷
            </Button>
        </div>
    );
}
