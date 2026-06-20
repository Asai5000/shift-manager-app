'use server';

import { db } from '@/db';
import { shifts } from '@/db/schema';
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm';
import { getEmployees } from '@/actions/employees';
import { getSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay, isAfter, isBefore } from 'date-fns';

import * as holiday_jp from '@holiday-jp/holiday_jp';

function isJapaneseHoliday(date: Date) {
    return holiday_jp.isHoliday(date);
}

function getHolidayName(date: Date): string | null {
    const holidays = holiday_jp.between(date, date);
    return holidays.length > 0 ? holidays[0].name : null;
}

export async function previewHolidayAssignment(
    startMonthStr: string, // YYYY-MM
    endMonthStr: string,   // YYYY-MM
    includeSundays: boolean,
    includeHolidays: boolean
) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return { success: false, message: '管理者権限がありません。' };
    }

    try {
        const startDate = startOfMonth(new Date(`${startMonthStr}-01`));
        const endDate = endOfMonth(new Date(`${endMonthStr}-01`));

        // 1. Get all dates in range
        const allDays = eachDayOfInterval({ start: startDate, end: endDate });

        // Filter target days (Sundays and/or Holidays)
        const targetDays = allDays.filter(day => {
            const isSun = getDay(day) === 0;
            const isHol = isJapaneseHoliday(day); // Placeholder
            return (includeSundays && isSun) || (includeHolidays && isHol);
        });

        // 3. 対象従業員（薬剤師のみ）の確保
        // TODO: We could query jobType='薬剤師' directly, but getEmployees is cached/shared and we already filter.
        const empRes = await getEmployees({ excludeOther: true });
        if (!empRes.success || !empRes.data) { throw new Error('従業員取得エラー'); }
        const pharmacists = empRes.data.filter((e: any) => e.jobType === 'Pharmacist');

        if (pharmacists.length === 0) {
            return { success: false, message: '薬剤師が登録されていません。' };
        }

        // 3. Check for existing shifts on target days to find exclusions/conflicts
        const startDateStr = format(startDate, 'yyyy-MM-dd');
        const endDateStr = format(endDate, 'yyyy-MM-dd');

        const existingShifts = await db.select().from(shifts).where(
            and(
                gte(shifts.date, startDateStr),
                lte(shifts.date, endDateStr)
            )
        );

        // Keep track of stats
        const empStats = pharmacists.map((p: any) => ({
            id: p.id,
            name: p.name,
            fullDayCount: 0,
            morningCount: 0,
            // Track dates assigned to avoid assigning them twice on the same day
            assignedDates: new Set<string>()
        }));

        const previews = [];
        let totalTargetDays = 0;

        for (const day of targetDays) {
            const dateStr = format(day, 'yyyy-MM-dd');

            // For this demo, let's treat it as a valid day.
            // Check if ALL pharmacists are excluded or if this particular day is explicitly excluded.
            // Assuming no global exclusions for now, just personal ones.
            const shiftsOnDay = existingShifts.filter((s: any) => s.date === dateStr);
            const holidayName = isJapaneseHoliday(day) ? getHolidayName(day) : null;

            // Find eligible candidate pool (pharmacists without a conflicting shift on this day)
            // Exclude if shift type contains 休み, 希望, or if they already have a shift and aren't available.
            // For simplicity, let's assume if they have ANY shift, they are unavailable for auto-assign.
            // This is a strict interpretation: "already have schedule -> exclude".
            const unavailableEmpIds = shiftsOnDay.map((s: any) => s.employeeId);
            let eligibleFullDay = empStats.filter((e: any) => !unavailableEmpIds.includes(e.id));

            // If we don't have enough people, skip
            if (eligibleFullDay.length < 2) {
                previews.push({
                    date: dateStr,
                    dayOfWeek: getDay(day),
                    isHoliday: isJapaneseHoliday(day),
                    holidayName,
                    fullDayEmpId: null,
                    fullDayEmpName: null,
                    morningEmpId: null,
                    morningEmpName: null,
                    status: 'skipped_no_staff'
                });
                continue;
            }

            totalTargetDays++;

            // ASSIGN FULL DAY (1日)
            // Sort by fullDayCount (ascending), then shuffle ties
            eligibleFullDay.sort((a: any, b: any) => {
                if (a.fullDayCount !== b.fullDayCount) return a.fullDayCount - b.fullDayCount;
                return Math.random() - 0.5; // Random tie-breaker
            });

            const selectedFullDayEmp = eligibleFullDay[0];

            // ASSIGN MORNING (午前)
            // Filter out the person who just got the full day
            let eligibleMorning = empStats.filter((e: any) => !unavailableEmpIds.includes(e.id) && e.id !== selectedFullDayEmp.id);

            // Sort by morningCount (ascending), then shuffle ties
            eligibleMorning.sort((a: any, b: any) => {
                if (a.morningCount !== b.morningCount) return a.morningCount - b.morningCount;
                return Math.random() - 0.5; // Random tie-breaker
            });

            const selectedMorningEmp = eligibleMorning[0];

            if (selectedFullDayEmp && selectedMorningEmp) {
                selectedFullDayEmp.fullDayCount++;
                selectedFullDayEmp.assignedDates.add(dateStr);

                selectedMorningEmp.morningCount++;
                selectedMorningEmp.assignedDates.add(dateStr);

                previews.push({
                    date: dateStr,
                    dayOfWeek: getDay(day),
                    isHoliday: isJapaneseHoliday(day),
                    holidayName,
                    fullDayEmpId: selectedFullDayEmp.id,
                    fullDayEmpName: selectedFullDayEmp.name,
                    morningEmpId: selectedMorningEmp.id,
                    morningEmpName: selectedMorningEmp.name,
                    status: 'assigned'
                });
            } else {
                previews.push({
                    date: dateStr,
                    dayOfWeek: getDay(day),
                    isHoliday: isJapaneseHoliday(day),
                    holidayName,
                    fullDayEmpId: null,
                    fullDayEmpName: null,
                    morningEmpId: null,
                    morningEmpName: null,
                    status: 'skipped_no_staff'
                });
            }
        }

        // Prepare return payload
        return {
            success: true,
            data: {
                previews,
                stats: empStats.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    fullDayCount: s.fullDayCount,
                    morningCount: s.morningCount
                })),
                totalTargetDays,
                exclusionDates: [] // Populate with dates fully skipped if applicable
            }
        };

    } catch (error) {
        console.error(error);
        return { success: false, message: 'シミュレーションエラー' };
    }
}

export async function applyHolidayAssignment(previews: any[]) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return { success: false, message: '管理者権限がありません。' };
    }

    try {
        const newShifts = [];
        for (const p of previews) {
            if (p.status !== 'assigned') continue;
            // Full Day
            if (p.fullDayEmpId) {
                newShifts.push({
                    employeeId: p.fullDayEmpId,
                    date: p.date,
                    type: '休日出勤(1日)'
                });
            }
            // Morning
            if (p.morningEmpId) {
                newShifts.push({
                    employeeId: p.morningEmpId,
                    date: p.date,
                    type: '休日出勤(午前)'
                });
            }
        }

        if (newShifts.length > 0) {
            await db.insert(shifts).values(newShifts);
            revalidatePath('/');
            revalidatePath('/settings/holiday-work');
        }

        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: '保存エラー' };
    }
}

export async function clearHolidayAssignment(startMonthStr: string, endMonthStr: string) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return { success: false, message: '管理者権限がありません。' };
    }

    try {
        const startDateDate = startOfMonth(new Date(`${startMonthStr}-01`));
        const endDateDate = endOfMonth(new Date(`${endMonthStr}-01`));
        const startDateStr = format(startDateDate, 'yyyy-MM-dd');
        const endDateStr = format(endDateDate, 'yyyy-MM-dd');

        await db.delete(shifts).where(
            and(
                gte(shifts.date, startDateStr),
                lte(shifts.date, endDateStr),
                inArray(shifts.type, ['休日出勤(1日)', '休日出勤(午前)'])
            )
        );

        revalidatePath('/');
        revalidatePath('/settings/holiday-work');

        return { success: true, message: `指定期間の休日出勤シフトを削除しました。` };
    } catch (error) {
        console.error(error);
        return { success: false, message: '削除エラー' };
    }
}
