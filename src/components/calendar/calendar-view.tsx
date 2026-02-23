'use client';

import { getCalendarDays } from '@/lib/date-utils';
import { CalendarHeader } from './calendar-header';
import { CalendarGrid } from './calendar-grid';

interface CalendarViewProps {
    year: number;
    month: number;
    shifts: any[];
    schedules: any[];
    employees: any[];
}

export function CalendarView({ year, month, shifts, schedules, employees }: CalendarViewProps) {
    const days = getCalendarDays(year, month);

    return (
        <div className="space-y-4" id="calendar-print-view">
            <CalendarHeader year={year} month={month} />
            <CalendarGrid
                days={days}
                shifts={shifts}
                schedules={schedules}
                employees={employees}
            />
        </div>
    );
}
