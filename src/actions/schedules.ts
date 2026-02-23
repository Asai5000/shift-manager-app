'use server';

import { db } from '@/db';
import { schedules } from '@/db/schema';
import { eq, or, and, like } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { startOfMonth, getDay, setDate, addWeeks, isSameMonth, format } from 'date-fns';

export async function getMonthlySchedules(year: number, month: number) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const startDate = new Date(year, month - 1, 1);

    try {
        // Get date-specific schedules for this month OR monthly recurring schedules
        const data = await db.select()
            .from(schedules)
            .where(or(
                and(
                    eq(schedules.type, 'date_specific'),
                    like(schedules.date, `${monthStr}%`)
                ),
                eq(schedules.type, 'monthly_recurring')
            ));

        // Expand recurring schedules
        const expandedData = data.map((schedule: typeof data[number]) => {
            if (schedule.type === 'date_specific') {
                return schedule;
            }

            // Calculate date for recurring schedule
            if (schedule.weekNumber && schedule.dayOfWeek !== null) {
                // Find the first occurrence of the dayOfWeek in the month
                let current = startOfMonth(startDate);
                while (getDay(current) !== schedule.dayOfWeek) {
                    current = setDate(current, current.getDate() + 1);
                }

                // Add weeks to get to the Nth occurrence
                // weekNumber 1 = 1st occurrence (add 0 weeks)
                const targetDate = addWeeks(current, schedule.weekNumber - 1);

                // Check if still in the same month
                if (isSameMonth(targetDate, startDate)) {
                    return {
                        ...schedule,
                        date: format(targetDate, 'yyyy-MM-dd'),
                        originalId: schedule.id, // Keep track of real ID
                        // We might want to mark it as virtual/recurring for UI to disallow direct date edit
                        isRecurring: true
                    };
                }
            }
            return null;
        }).filter(Boolean) as typeof data;

        return { success: true, data: expandedData };
    } catch (error) {
        console.error('Failed to fetch schedules:', error);
        return { success: false, error: '予定の取得に失敗しました' };
    }
}

export async function getRecurringSchedules() {
    try {
        const data = await db.select()
            .from(schedules)
            .where(eq(schedules.type, 'monthly_recurring'));
        return { success: true, data };
    } catch (error) {
        console.error('Failed to fetch recurring schedules:', error);
        return { success: false, error: '繰り返し予定の取得に失敗しました' };
    }
}

export type AddScheduleData = {
    employeeId?: number | null;
    type: 'date_specific' | 'monthly_recurring';
    date?: string;
    weekNumber?: number;
    dayOfWeek?: number;
    text: string;
    shortText?: string;
    isVisible: boolean;
    displayType: 'full' | 'short';
};

export async function addSchedule(data: AddScheduleData) {
    try {
        await db.insert(schedules).values({
            employeeId: data.employeeId || null, // Ensure valid null
            type: data.type,
            date: data.date,
            weekNumber: data.weekNumber,
            dayOfWeek: data.dayOfWeek,
            text: data.text,
            shortText: data.shortText,
            isVisible: data.isVisible,
            displayType: data.displayType,
        });

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to add schedule:', error);
        return { success: false, error: '予定の追加に失敗しました' };
    }
}

export async function deleteSchedule(id: number) {
    try {
        await db.delete(schedules).where(eq(schedules.id, id));
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete schedule:', error);
        return { success: false, error: '予定の削除に失敗しました' };
    }
}

export async function updateSchedule(id: number, data: AddScheduleData) {
    try {
        await db.update(schedules)
            .set({
                employeeId: data.employeeId || null,
                type: data.type,
                date: data.date,
                weekNumber: data.weekNumber,
                dayOfWeek: data.dayOfWeek,
                text: data.text,
                shortText: data.shortText,
                isVisible: data.isVisible,
                displayType: data.displayType,
            })
            .where(eq(schedules.id, id));

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to update schedule:', error);
        return { success: false, error: '予定の更新に失敗しました' };
    }
}
