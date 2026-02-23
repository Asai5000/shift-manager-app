import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, getDay, isSameMonth, isSameDay, getWeekOfMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
// @ts-ignore
import JapaneseHolidays from 'japanese-holidays';

export const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];

export type CalendarDay = {
    date: Date;
    dateStr: string; // YYYY-MM-DD
    isCurrentMonth: boolean;
    isToday: boolean;
    isHoliday: boolean;
    holidayName?: string;
    isSunday: boolean;
    isSaturday: boolean;
};

export function getCalendarDays(year: number, month: number): CalendarDay[] {
    // month is 1-indexed in UI, but 0-indexed in Date object for some constructors, 
    // but date-fns handles it well if we construct a date.
    // Let's use Date constructor: new Date(year, month - 1, 1)
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = endOfMonth(firstDayOfMonth);

    let startDate = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 }); // Sunday start

    // Check if the month spans exactly 4 weeks (standard calendar rows) to center it
    // e.g. Feb 2026 (Sun 1st - Sat 28th)
    const endDateOfMonth = endOfWeek(lastDayOfMonth, { weekStartsOn: 0 });
    const weekCount = Math.ceil((endDateOfMonth.getTime() - startDate.getTime() + 1) / (7 * 24 * 60 * 60 * 1000));

    if (weekCount === 4) {
        startDate.setDate(startDate.getDate() - 7); // Go back 1 week to pad before
    }

    // Always generate 42 days (6 weeks) to ensure fixed height
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 41);

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const today = new Date();

    return days.map((day) => {
        const holiday = JapaneseHolidays.isHoliday(day);
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOfWeek = getDay(day);

        return {
            date: day,
            dateStr,
            isCurrentMonth: isSameMonth(day, firstDayOfMonth),
            isToday: isSameDay(day, today),
            isHoliday: !!holiday,
            holidayName: holiday || undefined,
            isSunday: dayOfWeek === 0,
            isSaturday: dayOfWeek === 6,
        };
    });
}

// Check if a monthly recurring schedule matches a given date
export function matchesRecurringSchedule(date: Date, schedule: { weekNumber?: number | null; dayOfWeek?: number | null }) {
    if (schedule.weekNumber == null || schedule.dayOfWeek == null) return false;

    const dayOfWeek = getDay(date);
    if (dayOfWeek !== schedule.dayOfWeek) return false;

    // Calculate week number of the month (1st week, 2nd week, etc.)
    // Note: getWeekOfMonth from date-fns depends on configuration.
    // Standard definition: 
    // 1st occurrence of DayOfWeek in the month is week 1.

    const start = startOfMonth(date);
    let count = 0;
    for (let d = start; d <= date; d.setDate(d.getDate() + 1)) {
        if (getDay(d) === schedule.dayOfWeek) {
            count++;
        }
        if (isSameDay(d, date)) break;
    }

    return count === schedule.weekNumber;
}

export function formatDateJP(date: Date) {
    return format(date, 'yyyy年NM月d日(E)', { locale: ja });
}
