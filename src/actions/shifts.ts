'use server';

import { db } from '@/db';
import { shifts, amAssignments } from '@/db/schema';
import { eq, and, like, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { ShiftType } from '@/constants';
import { getSession } from '@/lib/session';

export async function getMonthlyShifts(year: number, month: number) {
    // SQLite date format is YYYY-MM-DD
    // We want to find all shifts where date starts with YYYY-MM
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    try {
        const data = await db.select()
            .from(shifts)
            .where(like(shifts.date, `${monthStr}%`));
        return { success: true, data };
    } catch (error) {
        console.error('Failed to fetch shifts:', error);
        return { success: false, error: 'シフトの取得に失敗しました' };
    }
}

export async function saveShift(
    data: { employeeId: number; date: string; type: ShiftType },
    options?: { forceOverride?: boolean }
) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: '認証されていません' };
        if (session.role !== 'admin' && data.employeeId.toString() !== session.id) {
            return { success: false, error: '他の従業員のシフトは編集できません' };
        }

        const typeStr = data.type as string;
        // AM tasks are affected if the shift means absent in the morning
        const isRestAM = [
            '休日(1日)', '休日(午前)',
            '希望休(1日)', '希望休(午前)',
            '出張(1日)', '出張(午前)',
            '特別休暇'
        ].includes(typeStr);

        if (!options?.forceOverride && isRestAM) {
            const hasAMTaskRequest = await db.select().from(amAssignments)
                .where(and(eq(amAssignments.employeeId, data.employeeId), eq(amAssignments.date, data.date)))
                .limit(1);
            if (hasAMTaskRequest.length > 0) {
                const assignedTask = hasAMTaskRequest[0].taskName;
                if (assignedTask && assignedTask !== '休' && assignedTask !== '出張' && assignedTask !== '特別休暇') {
                    return {
                        success: false,
                        conflict: true,
                        message: `この日（${data.date}）の午前中タスクに「${assignedTask}」が設定されています。\nシフト「${data.type}」で登録してタスクを上書きしますか？`
                    };
                }
            }
        }

        // 2. Normal Shift Save logic
        const existing = await db.select()
            .from(shifts)
            .where(and(
                eq(shifts.employeeId, data.employeeId),
                eq(shifts.date, data.date)
            ))
            .limit(1);

        if (existing.length > 0) {
            await db.update(shifts)
                .set({ type: data.type })
                .where(eq(shifts.id, existing[0].id));
        } else {
            await db.insert(shifts).values({
                employeeId: data.employeeId,
                date: data.date,
                type: data.type,
            });
        }

        // 3. Mirror to AM Tasks if it implies an AM task change
        const isRestAMTask = [
            '休日(1日)', '休日(午前)',
            '希望休(1日)', '希望休(午前)',
            '出張(1日)', '出張(午前)',
            '特別休暇'
        ].includes(data.type);

        let newAMTask = '';
        if (data.type.includes('休日出勤') || data.type.includes('出勤')) newAMTask = data.type;
        else if (isRestAMTask) {
            if (data.type.includes('出張')) newAMTask = '出張';
            else if (data.type.includes('特別休暇')) newAMTask = '特別休暇';
            else newAMTask = '休';
        }

        if (newAMTask) {
            const existingAM = await db.select().from(amAssignments)
                .where(and(eq(amAssignments.employeeId, data.employeeId), eq(amAssignments.date, data.date)))
                .limit(1);
            if (existingAM.length > 0) {
                await db.update(amAssignments)
                    .set({ taskName: newAMTask, isAutoAssigned: false })
                    .where(eq(amAssignments.id, existingAM[0].id));
            } else {
                await db.insert(amAssignments).values({
                    employeeId: data.employeeId, date: data.date, taskName: newAMTask, isAutoAssigned: false
                });
            }
        } else {
            // If the new shift is not an AM rest shift, but there was a previous AM rest assignment mapped to a resting type, we might want to clean it up depending on how it was previously handled.
            // For now, if no newAMTask is needed, we don't automatically delete existing AM tasks unless they were '休' etc, which may conflict with user intent. Let's do a basic cleanup if it was '休'.
            const existingAM = await db.select().from(amAssignments)
                .where(and(eq(amAssignments.employeeId, data.employeeId), eq(amAssignments.date, data.date)))
                .limit(1);
            if (existingAM.length > 0) {
                const taskName = existingAM[0].taskName;
                if (taskName === '休' || taskName === '出張' || taskName === '特別休暇' || taskName.includes('出勤')) {
                    await db.delete(amAssignments).where(eq(amAssignments.id, existingAM[0].id));
                }
            }
        }

        // If the saved shift is a holiday work shift, set '休' for other employees on this date (only if not already manually assigned)
        if (data.type.includes('出勤')) {
            const { getEmployees } = await import('@/actions/employees');
            const empRes = await getEmployees({ excludeOther: true });
            if (empRes.success && empRes.data) {
                const employees = empRes.data;
                const existingAssignments = await db.select().from(amAssignments)
                    .where(eq(amAssignments.date, data.date));

                type AssignmentRow = typeof existingAssignments[number];
                const assignmentMap = new Map<number, AssignmentRow>(existingAssignments.map((a: AssignmentRow) => [a.employeeId, a]));

                const newRests: { employeeId: number; date: string; taskName: string; isAutoAssigned: boolean }[] = [];
                for (const emp of employees) {
                    if (emp.id === data.employeeId) continue;

                    const existing = assignmentMap.get(emp.id);
                    if (!existing) {
                        newRests.push({ employeeId: emp.id, date: data.date, taskName: '休', isAutoAssigned: true });
                    } else if (existing.isAutoAssigned && existing.taskName !== '休') {
                        await db.update(amAssignments)
                            .set({ taskName: '休' })
                            .where(eq(amAssignments.id, existing.id));
                    }
                }

                if (newRests.length > 0) {
                    await db.insert(amAssignments).values(newRests);
                }
            }
        }

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to save shift:', error);
        return { success: false, error: 'シフトの保存に失敗しました' };
    }
}

export async function deleteShift(id: number) {
    try {
        // Find the shift to get its date and employeeId
        const shiftRecord = await db.select().from(shifts).where(eq(shifts.id, id)).limit(1);

        if (shiftRecord.length > 0) {
            const shift = shiftRecord[0];

            const session = await getSession();
            if (!session) return { success: false, error: '認証されていません' };
            if (session.role !== 'admin' && shift.employeeId.toString() !== session.id) {
                return { success: false, error: '他の従業員のシフトは削除できません' };
            }

            const isRestAMTask = [
                '休日(1日)', '休日(午前)',
                '希望休(1日)', '希望休(午前)',
                '出張(1日)', '出張(午前)',
                '特別休暇'
            ].includes(shift.type);

            const isSpecialAMTask = shift.type.includes('出勤');
            const shouldCleanupAMTask = isRestAMTask || isSpecialAMTask;

            // Delete the shift
            await db.delete(shifts).where(eq(shifts.id, id));

            // If it was a resting shift or special shift that forced an AM task, remove the AM task so it goes back to '未設定'
            if (shouldCleanupAMTask) {
                const amTask = await db.select().from(amAssignments)
                    .where(and(eq(amAssignments.employeeId, shift.employeeId), eq(amAssignments.date, shift.date)))
                    .limit(1);

                if (amTask.length > 0) {
                    const taskName = amTask[0].taskName;
                    if (taskName === '休' || taskName === '出張' || taskName === '特別休暇' || taskName.includes('出勤')) {
                        await db.delete(amAssignments).where(eq(amAssignments.id, amTask[0].id));
                    }
                }
            }

            // If the deleted shift was a holiday work shift, clear auto-assigned '休' for other employees on this date
            // This resolves the issue where "休" persists for others after a holiday work shift is mistakenly added and then deleted.
            if (shift.type.includes('出勤')) {
                await db.delete(amAssignments)
                    .where(and(
                        eq(amAssignments.date, shift.date),
                        eq(amAssignments.isAutoAssigned, true),
                        eq(amAssignments.taskName, '休')
                    ));
            }
        } else {
            // Delete just in case
            await db.delete(shifts).where(eq(shifts.id, id));
        }

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete shift:', error);
        return { success: false, error: 'シフトの削除に失敗しました' };
    }
}



export async function bulkDeleteShifts(params: {
    year: number;
    month: number;
    employeeId?: number; // Optional: specific employee or all
    types?: string[];    // Optional: specific shift types or all
}) {
    const { year, month, employeeId, types } = params;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return { success: false, error: '一括削除は管理者のみ実行可能です' };
        }

        const filters = [like(shifts.date, `${monthStr}%`)];

        if (employeeId) {
            filters.push(eq(shifts.employeeId, employeeId));
        }

        if (types && types.length > 0) {
            filters.push(inArray(shifts.type, types as ShiftType[]));
        }

        // Fetch shifts to delete to cascade AM task cleanup
        const targetShifts = await db.select().from(shifts).where(and(...filters));

        if (targetShifts.length > 0) {
            const restingShifts = targetShifts.filter((s: typeof targetShifts[number]) => {
                const isRestAMTask = [
                    '休日(1日)', '休日(午前)',
                    '希望休(1日)', '希望休(午前)',
                    '出張(1日)', '出張(午前)',
                    '特別休暇'
                ].includes(s.type);
                return isRestAMTask || s.type.includes('出勤');
            });
            const holidayWorkDates = new Set<string>();

            // Delete shifts
            await db.delete(shifts).where(and(...filters));

            // Cleanup AM Tasks
            for (const shift of restingShifts) {
                // Remove direct AM task matches
                const amTask = await db.select().from(amAssignments)
                    .where(and(eq(amAssignments.employeeId, shift.employeeId), eq(amAssignments.date, shift.date)))
                    .limit(1);

                if (amTask.length > 0) {
                    const taskName = amTask[0].taskName;
                    if (taskName === '休' || taskName === '出張' || taskName === '特別休暇' || taskName.includes('出勤')) {
                        await db.delete(amAssignments).where(eq(amAssignments.id, amTask[0].id));
                    }
                }

                if (shift.type.includes('出勤')) {
                    holidayWorkDates.add(shift.date);
                }
            }

            // Cleanup auto-assigned '休' for dates where holiday work was deleted
            for (const date of holidayWorkDates) {
                await db.delete(amAssignments)
                    .where(and(
                        eq(amAssignments.date, date),
                        eq(amAssignments.isAutoAssigned, true),
                        eq(amAssignments.taskName, '休')
                    ));
            }
        }

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to bulk delete shifts:', error);
        return { success: false, error: '一括削除に失敗しました' };
    }
}
