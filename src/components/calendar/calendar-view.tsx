'use client';

import { getCalendarDays } from '@/lib/date-utils';
import { CalendarHeader } from './calendar-header';
import { CalendarGrid } from './calendar-grid';
import type { SessionPayload } from '@/lib/session';

interface CalendarViewProps {
    year: number;
    month: number;
    shifts: any[];
    schedules: any[];
    employees: any[];
    session: SessionPayload | null;
}

export function CalendarView({ year, month, shifts, schedules, employees, session }: CalendarViewProps) {
    const days = getCalendarDays(year, month);

    return (
        <div className="space-y-4 print:space-y-0 print:h-screen print:flex print:flex-col" id="calendar-print-view">
            <CalendarHeader year={year} month={month} />
            <CalendarGrid
                days={days}
                shifts={shifts}
                schedules={schedules}
                employees={employees}
                session={session}
            />
        </div>
    );
}
