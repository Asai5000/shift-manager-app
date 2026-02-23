'use server';

import { getMonthlyShifts } from '@/actions/shifts';
import { getMonthlySchedules } from '@/actions/schedules';
import { getCalendarDays } from '@/lib/date-utils';
import { getRestCount, isEmployeeAbsent } from '@/lib/validation';

interface EmployeeSetting {
    min: number;
    max: number;
}

interface AutoAssignmentParams {
    year: number;
    month: number;
    employees: { id: number; name: string; jobType: string }[];
    maxRestPharmacist: number;
    maxRestAssistant: number;
    employeeSettings: { [id: number]: EmployeeSetting };
    pendingShifts?: Record<string, string>; // Added: Key "empId-date", Value type
}

export interface GeneratedShift {
    employeeId: number;
    date: string;
    type: string;
    reason?: string;
}

export interface SimulationResult {
    employeeId: number;
    name: string;
    current: number;
    added: number;
    total: number;
    goalMin: number;
    goalMax: number;
    isGoalReached: boolean;
    messages: string[];
}
export async function generateAutoAssignments(params: AutoAssignmentParams): Promise<{
    success: boolean;
    data?: { newShifts: GeneratedShift[]; results: SimulationResult[] };
    error?: string;
}> {
    try {
        const { year, month, employees, maxRestPharmacist, maxRestAssistant, employeeSettings, pendingShifts } = params;

        // 1. Fetch Existing Data
        const prevDate = new Date(year, month - 1 - 1, 1);
        const [currentShiftsRes, prevShiftsRes, schedulesRes] = await Promise.all([
            getMonthlyShifts(year, month),
            getMonthlyShifts(prevDate.getFullYear(), prevDate.getMonth() + 1),
            getMonthlySchedules(year, month)
        ]);

        const existingShifts = [
            ...(currentShiftsRes.data || []),
            ...(prevShiftsRes.data || [])
        ];

        // 2. Prepare Working Grid
        const nextDate = new Date(year, month - 1 + 1, 1);
        const allDaysCurrent = getCalendarDays(year, month);
        const allDaysPrev = getCalendarDays(prevDate.getFullYear(), prevDate.getMonth() + 1);
        const allDaysNext = getCalendarDays(nextDate.getFullYear(), nextDate.getMonth() + 1);

        const allDays = [...allDaysPrev, ...allDaysCurrent, ...allDaysNext];
        const dateStrings = allDaysCurrent.filter(d => d.isCurrentMonth).map(d => d.dateStr);

        // Identify Sundays and Holidays (Implicit Rests) - Used for filtering candidates later
        // Build holidayMap using ALL days so previous/next month padding days are correctly identified
        const holidayMap: Record<string, boolean> = {};
        allDays.forEach(d => {
            if (d.isSunday || d.isHoliday) {
                holidayMap[d.dateStr] = true;
            }
        });

        // Map: EmployeeID -> Date -> ShiftType | null
        const assignmentMap: Record<number, Record<string, string>> = {};
        const newShifts: GeneratedShift[] = [];

        // Initialize map with existing shifts
        employees.forEach(emp => {
            assignmentMap[emp.id] = {};
            // Fill existing shifts
            existingShifts.filter(s => s.employeeId === emp.id).forEach(s => {
                assignmentMap[emp.id][s.date] = s.type;
            });
        });

        // Apply Pending Shifts overrides
        if (pendingShifts) {
            Object.entries(pendingShifts).forEach(([key, type]) => {
                const [empIdStr, date] = key.split('-');
                const empId = parseInt(empIdStr);
                if (assignmentMap[empId]) {
                    assignmentMap[empId][date] = type;
                }
            });
        }

        // Determine Holiday Work Dates (days where ANYONE is working)
        const holidayWorkDates = new Set<string>();
        Object.keys(assignmentMap).forEach(empIdStr => {
            const empId = parseInt(empIdStr);
            Object.keys(assignmentMap[empId]).forEach(date => {
                const type = assignmentMap[empId][date];
                if (type && (type.includes('休日出勤') || type.includes('出勤'))) {
                    holidayWorkDates.add(date);
                }
            });
        });

        // Helper to check status
        const getShiftType = (empId: number, date: string): string | null => {
            return assignmentMap[empId]?.[date] || null;
        };

        // isRest: Checks if a day counts towards the Goal Rest Count (used for Daily Limits)
        const isRest = (empId: number, date: string): boolean => {
            const type = getShiftType(empId, date);
            if (!type) {
                if (holidayWorkDates.has(date)) {
                    return true;
                }
                return false;
            }
            return getRestCount(type) >= 1;
        };

        // getEffectiveRestCount: Calculates the numeric value of rest for the day (can be 0.5)
        const getEffectiveRestCount = (empId: number, date: string): number => {
            const type = getShiftType(empId, date);
            if (!type) {
                if (holidayWorkDates.has(date)) {
                    return 1;
                }
                return 0;
            }
            return getRestCount(type);
        };

        // isWorkingDay: Checks if a day is considered a working day for the consecutive streak
        const isWorkingDay = (empId: number, date: string): boolean => {
            const type = getShiftType(empId, date);
            if (type) {
                return getRestCount(type) < 1;
            }
            // No explicit shift.
            // It's closed/off if it's a Sunday/Holiday OR if someone else is working (Implicit Rest).
            if (holidayMap[date] || holidayWorkDates.has(date)) {
                return false;
            }
            return true; // Empty weekday means they are working
        };


        // Calculate Initial Counts (Before Auto-Assignment)
        const initialCounts: Record<number, number> = {};
        employees.forEach(emp => {
            const count = dateStrings.reduce((acc, date) => {
                return acc + getEffectiveRestCount(emp.id, date);
            }, 0);
            initialCounts[emp.id] = count;
        });

        // Record Scheduled Dates per Employee
        const scheduledDatesByEmp: Record<number, Set<string>> = {};
        employees.forEach(emp => scheduledDatesByEmp[emp.id] = new Set());
        if (schedulesRes.data) {
            schedulesRes.data.forEach(s => {
                if (s.employeeId && s.date && scheduledDatesByEmp[s.employeeId]) {
                    scheduledDatesByEmp[s.employeeId].add(s.date);
                }
            });
        }

        // 3. Logic Application

        // A. Enforce 6-day Consecutive Limit (Hard Constraint)
        employees.forEach(emp => {
            let hasViolations = true;
            let circuitBreaker = 0;

            while (hasViolations && circuitBreaker < 20) {
                hasViolations = false;
                circuitBreaker++;

                let currentStreak = 0;
                let streakDays: string[] = [];

                for (let i = 0; i < allDays.length; i++) {
                    const date = allDays[i].dateStr;

                    if (isWorkingDay(emp.id, date)) {
                        currentStreak++;
                        streakDays.push(date);

                        if (currentStreak >= 6) {
                            const candidatesToBreak = streakDays.filter(d =>
                                dateStrings.includes(d) &&
                                !getShiftType(emp.id, d) &&
                                !scheduledDatesByEmp[emp.id].has(d)
                            );

                            if (candidatesToBreak.length > 0) {
                                hasViolations = true;

                                // To evenly distribute these forced rests, pick the candidate that has the fewest rests assigned so far
                                let bestBreakDate = candidatesToBreak[0];
                                let minRests = Infinity;

                                // Shuffle to randomly break ties
                                const shuffledCandidates = [...candidatesToBreak].sort(() => Math.random() - 0.5);

                                for (const d of shuffledCandidates) {
                                    const peers = employees.filter(e => e.jobType === emp.jobType);
                                    let restCountToday = peers.filter(e => isRest(e.id, d)).length;
                                    let newlyAssignedRestsToday = newShifts.filter(s => s.date === d && peers.some(p => p.id === s.employeeId)).length;
                                    let totalRestsToday = restCountToday + newlyAssignedRestsToday;

                                    if (totalRestsToday < minRests) {
                                        minRests = totalRestsToday;
                                        bestBreakDate = d;
                                    }
                                }

                                assignmentMap[emp.id][bestBreakDate] = '休み(終日)';
                                newShifts.push({ employeeId: emp.id, date: bestBreakDate, type: '休み(終日)', reason: '連勤防止' });
                                break; // restart the scan
                            } else {
                                // If we can't break it here due to constraints, shift the window to keep looking
                                currentStreak--;
                                streakDays.shift();
                            }
                        }
                    } else {
                        currentStreak = 0;
                        streakDays = [];
                    }
                }
            }
        });

        // B. Fill to meet Target (Soft Constraint)
        const getCount = (empId: number) => {
            return dateStrings.reduce((acc, date) => {
                return acc + getEffectiveRestCount(empId, date);
            }, 0);
        };

        const wouldExceedMaxConsecutiveRest = (empId: number, targetDate: string): boolean => {
            let streakBefore = 0;
            for (let k = 1; k <= 5; k++) {
                const d = new Date(targetDate);
                d.setDate(d.getDate() - k);
                const dStr = d.toISOString().split('T')[0];
                if (!isWorkingDay(empId, dStr)) streakBefore++;
                else break;
            }

            let streakAfter = 0;
            for (let k = 1; k <= 5; k++) {
                const d = new Date(targetDate);
                d.setDate(d.getDate() + k);
                const dStr = d.toISOString().split('T')[0];
                if (!isWorkingDay(empId, dStr)) streakAfter++;
                else break;
            }

            return (streakBefore + 1 + streakAfter) >= 4;
        };

        const getWeeklyRestCount = (empId: number, targetDateStr: string) => {
            const targetDate = new Date(targetDateStr);
            const dayOfWeek = targetDate.getDay();
            let count = 0;
            for (let i = 0; i < 7; i++) {
                const d = new Date(targetDate);
                d.setDate(targetDate.getDate() - dayOfWeek + i);
                const dStr = d.toISOString().split('T')[0];
                if (!isWorkingDay(empId, dStr)) count++;
            }
            return count;
        };

        // Helper to shuffle array (Fisher-Yates)
        const shuffleArray = <T>(array: T[]): T[] => {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

        // Sort employees so that those who need the most rests are processed first.
        // This prevents them from being starved of slots by others.
        const sortedEmployees = [...employees].sort((a, b) => {
            const gapA = (employeeSettings[a.id]?.min || 0) - getCount(a.id);
            const gapB = (employeeSettings[b.id]?.min || 0) - getCount(b.id);
            // Additionally randomize for those with the same gap to avoid strict alphabetical starvation
            if (gapA === gapB) return Math.random() - 0.5;
            return gapB - gapA;
        });

        sortedEmployees.forEach(emp => {
            const setting = employeeSettings[emp.id];
            if (!setting) return;

            let safetyCounter = 0;
            while (getCount(emp.id) < setting.min && safetyCounter < 31) {
                safetyCounter++;
                const candidates = dateStrings.filter(date => {
                    const hasShift = !!getShiftType(emp.id, date);
                    const isHol = !!holidayMap[date];
                    const hasSchedule = scheduledDatesByEmp[emp.id].has(date);
                    const exceedsRestLimit = wouldExceedMaxConsecutiveRest(emp.id, date);
                    return !hasShift && !isHol && !hasSchedule && !exceedsRestLimit;
                });

                if (candidates.length === 0) break;

                let bestDate = null;

                // 1. Shuffle candidates randomly first to ensure uniform distribution
                const randomizedCandidates = shuffleArray(candidates);

                // 2. Prioritize dates to balance load globally and within week
                const peers = employees.filter(e => e.jobType === emp.jobType);
                const limit = emp.jobType === 'Pharmacist' ? maxRestPharmacist : maxRestAssistant;

                const sortedCandidates = randomizedCandidates.sort((a, b) => {
                    // Calculate total rests for peers on date A
                    const restsA_base = peers.filter(e => isRest(e.id, a)).length;
                    const newlyAssignedA = newShifts.filter(s => s.date === a && peers.some(p => p.id === s.employeeId)).length;
                    const totalRestsA = restsA_base + newlyAssignedA;

                    // Calculate total rests for peers on date B
                    const restsB_base = peers.filter(e => isRest(e.id, b)).length;
                    const newlyAssignedB = newShifts.filter(s => s.date === b && peers.some(p => p.id === s.employeeId)).length;
                    const totalRestsB = restsB_base + newlyAssignedB;

                    // Primary constraint: Days with fewer rests are preferred
                    if (totalRestsA !== totalRestsB) {
                        return totalRestsA - totalRestsB;
                    }

                    // Secondary constraint: Weeks with fewer rests are preferred
                    const weeklyA = getWeeklyRestCount(emp.id, a);
                    const weeklyB = getWeeklyRestCount(emp.id, b);
                    return weeklyA - weeklyB;
                });

                for (const date of sortedCandidates) {
                    const rests_base = peers.filter(e => isRest(e.id, date)).length;
                    const newlyAssigned = newShifts.filter(s => s.date === date && peers.some(p => p.id === s.employeeId)).length;
                    const totalRestsToday = rests_base + newlyAssigned;

                    if (totalRestsToday < limit) {
                        bestDate = date;
                        break;
                    }
                }

                // If no date found that respects the limit, we cannot assign more rests without breaking rules.
                if (!bestDate) break;

                if (bestDate) {
                    assignmentMap[emp.id][bestDate] = '休み(終日)';
                    newShifts.push({ employeeId: emp.id, date: bestDate, type: '休み(終日)', reason: '日数調整' });
                }
            }
        });

        // 4. Generate Results Summary
        const results: SimulationResult[] = employees.map(emp => {
            const originalCount = initialCounts[emp.id];
            const currentTotal = getCount(emp.id);
            const added = currentTotal - originalCount;
            const setting = employeeSettings[emp.id];
            const isReached = currentTotal >= setting.min && currentTotal <= setting.max;

            const messages = [];
            if (currentTotal < setting.min) messages.push(`${setting.min - currentTotal}日不足`);
            if (currentTotal > setting.max) messages.push(`${currentTotal - setting.max}日超過`);

            return {
                employeeId: emp.id,
                name: emp.name,
                current: originalCount,
                added,
                total: currentTotal,
                goalMin: setting.min,
                goalMax: setting.max,
                isGoalReached: isReached,
                messages
            };
        });

        return {
            success: true,
            data: {
                newShifts,
                results
            }
        };
    } catch (e) {
        console.error('Auto Assignment Error:', e);
        return { success: false, error: 'シフトシミュレーションに失敗しました。' };
    }
}
