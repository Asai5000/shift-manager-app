'use server';

import { db } from '@/db';
import { amTaskOptions, amAssignments } from '@/db/schema';
import { eq, and, gte, lte, lt, gt, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// --- Types ---
export interface TaskOption {
    id: string;
    name: string;
    bgColor: string;
    textColor: string;
    order: number;
    isFallback?: boolean;
    excludeFromAuto?: boolean;
}

export interface AMAssignment {
    id: number;
    employeeId: number;
    date: string;
    taskName: string;
    isAutoAssigned: boolean;
}

// --- AM Task Options ---

export async function getAMTaskOptions(): Promise<{ success: boolean; data?: TaskOption[]; error?: string }> {
    try {
        const options = await db.select().from(amTaskOptions).orderBy(amTaskOptions.displayOrder);

        if (options.length === 0) {
            const defaults: TaskOption[] = [
                { id: 't1', name: '院外監査', bgColor: 'bg-slate-100', textColor: 'text-slate-800', order: 1, isFallback: false, excludeFromAuto: false },
                { id: 't2', name: '注射監査', bgColor: 'bg-yellow-50', textColor: 'text-slate-800', order: 2, isFallback: false, excludeFromAuto: false },
                { id: 't3', name: 'ミキシング・散剤', bgColor: 'bg-orange-400', textColor: 'text-white', order: 3, isFallback: false, excludeFromAuto: false },
                { id: 't4', name: '処方薬調剤', bgColor: 'bg-yellow-300', textColor: 'text-slate-800', order: 4, isFallback: false, excludeFromAuto: false },
                { id: 't5', name: '外来', bgColor: 'bg-white', textColor: 'text-red-500', order: 5, isFallback: false, excludeFromAuto: false },
                { id: 't6', name: '病棟', bgColor: 'bg-blue-500', textColor: 'text-white', order: 6, isFallback: false, excludeFromAuto: false },
                { id: 't7', name: '散剤混注', bgColor: 'bg-amber-500', textColor: 'text-white', order: 7, isFallback: false, excludeFromAuto: false }
            ];
            await saveAMTaskOptions(defaults);
            return { success: true, data: defaults };
        }

        // Map to expected structure
        const mapped = options.map((opt: typeof options[number]) => ({
            id: opt.id,
            name: opt.name,
            bgColor: opt.bgColor,
            textColor: opt.textColor,
            order: opt.displayOrder,
            isFallback: opt.isFallback ?? false,
            excludeFromAuto: opt.excludeFromAuto ?? false
        }));
        return { success: true, data: mapped };
    } catch (error) {
        console.error('Failed to get AM task options:', error);
        return { success: false, error: 'Failed to retrieve task options' };
    }
}

export async function saveAMTaskOptions(options: TaskOption[]): Promise<{ success: boolean; error?: string }> {
    try {
        // First, clear existing options
        await db.delete(amTaskOptions);

        // Then insert new ones if any exist
        if (options.length > 0) {
            const values = options.map(opt => ({
                id: opt.id,
                name: opt.name,
                bgColor: opt.bgColor,
                textColor: opt.textColor,
                displayOrder: opt.order,
                isFallback: opt.isFallback ?? false,
                excludeFromAuto: opt.excludeFromAuto ?? false
            }));
            await db.insert(amTaskOptions).values(values);
        }

        revalidatePath('/schedules/tasks-am');
        return { success: true };
    } catch (error) {
        console.error('Failed to save AM task options:', error);
        return { success: false, error: 'Failed to save task options' };
    }
}

// --- AM Assignments ---

export async function getAMAssignments(startDate: string, endDate: string): Promise<{ success: boolean; data?: AMAssignment[]; error?: string }> {
    try {
        const assignments = await db
            .select()
            .from(amAssignments)
            .where(
                and(
                    gte(amAssignments.date, startDate),
                    lte(amAssignments.date, endDate)
                )
            );
        return { success: true, data: assignments };
    } catch (error) {
        console.error('Failed to get AM assignments:', error);
        return { success: false, error: 'Failed to retrieve assignments' };
    }
}

export async function saveAMAssignment(employeeId: number, date: string, taskName: string, isAutoAssigned: boolean = false): Promise<{ success: boolean; error?: string }> {
    try {
        if (!taskName) {
            // Delete if task is empty
            await db.delete(amAssignments)
                .where(and(eq(amAssignments.employeeId, employeeId), eq(amAssignments.date, date)));
        } else {
            // Upsert: check if exists, then update or insert
            const existing = await db.select().from(amAssignments)
                .where(and(eq(amAssignments.employeeId, employeeId), eq(amAssignments.date, date)))
                .limit(1);

            if (existing.length > 0) {
                await db.update(amAssignments)
                    .set({ taskName, isAutoAssigned })
                    .where(eq(amAssignments.id, existing[0].id));
            } else {
                await db.insert(amAssignments)
                    .values({ employeeId, date, taskName, isAutoAssigned });
            }
        }

        revalidatePath('/schedules/tasks-am');
        return { success: true };
    } catch (error) {
        console.error('Failed to save AM assignment:', error);
        return { success: false, error: 'Failed to save assignment' };
    }
}

export async function clearAMAssignments(startDate: string, endDate: string): Promise<{ success: boolean; error?: string }> {
    try {
        await db.delete(amAssignments)
            .where(
                and(
                    gte(amAssignments.date, startDate),
                    lte(amAssignments.date, endDate)
                )
            );
        revalidatePath('/schedules/tasks-am');
        return { success: true };
    } catch (error) {
        console.error('Failed to clear AM assignments:', error);
        return { success: false, error: 'Failed to clear assignments' };
    }
}

export async function clearAutoAMAssignments(startDate: string, endDate: string): Promise<{ success: boolean; error?: string }> {
    try {
        await db.delete(amAssignments)
            .where(
                and(
                    gte(amAssignments.date, startDate),
                    lte(amAssignments.date, endDate),
                    eq(amAssignments.isAutoAssigned, true)
                )
            );
        revalidatePath('/schedules/tasks-am');
        return { success: true };
    } catch (error) {
        console.error('Failed to clear auto AM assignments:', error);
        return { success: false, error: 'Failed to clear auto assignments' };
    }
}

export async function generateAMAutoAssignments(year: number, month: number): Promise<{ success: boolean; error?: string }> {
    try {
        const { getEmployees } = await import('@/actions/employees');
        const { getMonthlyShifts } = await import('@/actions/shifts');
        const { getCalendarDays } = await import('@/lib/date-utils');

        const [empRes, optRes, shiftsRes, asgRes] = await Promise.all([
            getEmployees(),
            getAMTaskOptions(),
            getMonthlyShifts(year, month),
            getAMAssignments(`${year}-${String(month).padStart(2, '0')}-01`, `${year}-${String(month).padStart(2, '0')}-31`)
        ]);

        if (!empRes.success || !empRes.data) return { success: false, error: 'Failed to fetch employees' };
        if (!optRes.success || !optRes.data) return { success: false, error: 'Failed to fetch options' };

        // Exclusively use Pharmacists for auto-assignment. Other staff are displayed but untouched.
        const pharmacists = empRes.data.filter((e: any) => e.jobType === 'Pharmacist') as { id: number, name: string }[];
        const taskOptions = optRes.data;
        const shifts = shiftsRes.data || [];
        const dbAssignments = asgRes.data || [];

        const days = getCalendarDays(year, month).filter((d: any) => d.isCurrentMonth);

        // Manual assignments are locked. Auto-assigned will be cleared and regenerated.
        const manualMap: Record<string, string> = {};
        dbAssignments.forEach((a) => {
            if (!a.isAutoAssigned) {
                manualMap[`${a.employeeId}-${a.date}`] = a.taskName;
            }
        });

        // Determine days with holiday work
        const holidayWorkDays = new Set<string>();
        shifts.forEach((s: any) => {
            if (s.type.includes('休日出勤') || s.type.includes('出勤')) {
                holidayWorkDays.add(s.date);
            }
        });

        const taskCounts: Record<number, Record<string, number>> = {};
        pharmacists.forEach(p => taskCounts[p.id] = {});

        const shiftMap: Record<string, string> = {};
        shifts.forEach((s: any) => {
            shiftMap[`${s.employeeId}-${s.date}`] = s.type;
        });

        // Pre-count manual tasks so we balance fairly
        Object.entries(manualMap).forEach(([key, taskName]) => {
            const [empIdStr] = key.split('-');
            const empId = parseInt(empIdStr);
            if (taskCounts[empId]) {
                taskCounts[empId][taskName] = (taskCounts[empId][taskName] || 0) + 1;
            }
        });

        const newAssignments: { employeeId: number, date: string, taskName: string, isAutoAssigned: boolean }[] = [];

        days.forEach((day: any) => {
            const d = day.dateStr;
            const isHolidayWorkDay = holidayWorkDays.has(d);
            const availableEmpIds = new Set<number>();

            pharmacists.forEach(emp => {
                const key = `${emp.id}-${d}`;

                const manual = manualMap[key];
                const shift = shiftMap[key];

                let isAbsent = false;

                // 1. Determine absent state solely from shifts
                if (shift) {
                    if (shift.includes('休') && !shift.includes('休日出勤')) {
                        isAbsent = true;
                    } else if (shift.includes('出張') || shift.includes('特別休暇')) {
                        isAbsent = true;
                    }
                }

                // Make people implicitly absent if there's holiday work they are NOT doing
                if (!isAbsent && isHolidayWorkDay && !(shift && (shift.includes('休日出勤') || shift.includes('出勤')))) {
                    isAbsent = true;
                }

                // If pharmacy is completely closed
                if (!isAbsent && (day.isSunday || !!day.holidayName) && !isHolidayWorkDay) {
                    isAbsent = true;
                }

                // 2. If absent, they cannot take any AM Task. Period. 
                // We do not save an amAssignment for "休" anymore. The UI will just merge with shift data.
                if (isAbsent) {
                    // Do nothing. They are absent.
                } else if (manual) {
                    // They have a manual task assigned. DO NOT put them in pool, but keep their manually assigned task counted.
                } else {
                    // Not absent and no manual task -> available for auto assignment
                    availableEmpIds.add(emp.id);
                }
            });

            // Assign standard tasks
            const regularTasks = taskOptions.filter(t => !t.isFallback && !t.excludeFromAuto).sort((a, b) => a.order - b.order);
            const fallbackTask = taskOptions.find(t => t.isFallback);

            regularTasks.forEach(task => {
                if (availableEmpIds.size > 0) {
                    let minCount = Infinity;
                    let candidates: number[] = [];

                    availableEmpIds.forEach(eid => {
                        const count = taskCounts[eid][task.name] || 0;
                        if (count < minCount) {
                            minCount = count;
                            candidates = [eid];
                        } else if (count === minCount) {
                            candidates.push(eid);
                        }
                    });

                    if (candidates.length > 0) {
                        // Pick randomly from tied candidates to introduce variety and fair fallback distribution
                        const chosenEmpId = candidates[Math.floor(Math.random() * candidates.length)];
                        newAssignments.push({ employeeId: chosenEmpId, date: d, taskName: task.name, isAutoAssigned: true });
                        taskCounts[chosenEmpId][task.name] = (taskCounts[chosenEmpId][task.name] || 0) + 1;
                        availableEmpIds.delete(chosenEmpId);
                    }
                }
            });

            // Assign fallback to remaining
            if (fallbackTask && availableEmpIds.size > 0) {
                availableEmpIds.forEach(eid => {
                    newAssignments.push({ employeeId: eid, date: d, taskName: fallbackTask.name, isAutoAssigned: true });
                    taskCounts[eid][fallbackTask.name] = (taskCounts[eid][fallbackTask.name] || 0) + 1;
                });
                availableEmpIds.clear();
            }
        });

        // Transactional clear & insert for auto-assigned
        // Using sequential operations instead of db.transaction as better-sqlite3 doesn't support async transactions
        const yearStr = String(year);
        const monthStr = String(month).padStart(2, '0');

        // 1. Delete ALL auto-assigned records for this month.
        // Since this function completely regenerates the month's auto-assignments (including syncing latest '休' from shifts),
        // it is safe and necessary to clear them all out first to avoid duplicates.
        await db.delete(amAssignments)
            .where(
                and(
                    gte(amAssignments.date, `${yearStr}-${monthStr}-01`),
                    lte(amAssignments.date, `${yearStr}-${monthStr}-31`),
                    eq(amAssignments.isAutoAssigned, true)
                )
            );

        // 2. Insert the completely fresh set of auto-assignments for this month.
        if (newAssignments.length > 0) {
            await db.insert(amAssignments).values(newAssignments);
        }

        revalidatePath('/schedules/tasks-am');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to generate AM auto assignments:', error);
        return { success: false, error: error.message || 'Failed to generate automatic assignments' };
    }
}

export async function getEarlyShiftStats(year: number, excludedMonth: number): Promise<{ success: boolean; data?: Record<number, number>; error?: string }> {
    try {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        const excludedStart = `${year}-${String(excludedMonth).padStart(2, '0')}-01`;
        const excludedEnd = `${year}-${String(excludedMonth).padStart(2, '0')}-31`;

        const assignments = await db.query.amAssignments.findMany({
            where: and(
                gte(amAssignments.date, startDate),
                lte(amAssignments.date, endDate),
                eq(amAssignments.taskName, '早出'),
                or(
                    lt(amAssignments.date, excludedStart),
                    gt(amAssignments.date, excludedEnd)
                )
            )
        });

        const stats: Record<number, number> = {};
        assignments.forEach(a => {
            stats[a.employeeId] = (stats[a.employeeId] || 0) + 1;
        });

        return { success: true, data: stats };
    } catch (error) {
        console.error('Failed to get early shift stats:', error);
        return { success: false, error: 'Failed to retrieve statistics' };
    }
}
