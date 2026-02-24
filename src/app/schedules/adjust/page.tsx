'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Settings2, X, Sparkles, Trash2 } from 'lucide-react';
import { getEmployees } from '@/actions/employees';
import { getMonthlyShifts, saveShift, deleteShift } from '@/actions/shifts';
import { getMonthlySchedules } from '@/actions/schedules';
import { getCalendarDays } from '@/lib/date-utils';
import { SHIFT_TYPES } from '@/constants';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Toaster, toast } from 'sonner';
import { useUnsavedChanges } from '@/components/providers/unsaved-changes-provider';
import { AutoAssignmentModal } from '@/components/shifts/auto-assignment-modal';
import { BulkDeleteModal } from '@/components/shifts/bulk-delete-modal';

// Types
interface Employee {
    id: number;
    name: string;
    shortName?: string | null;
    displayOrder: number;
    jobType: string; // "Pharmacist" | "Assistant"
}

interface Shift {
    id: number;
    employeeId: number;
    date: string;
    type: string;
}

interface Schedule {
    id: number;
    date: string;
    text: string;
    employeeId?: number | null;
}

export default function ShiftAdjustmentPage() {
    // State
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);

    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
    const [showMobileActions, setShowMobileActions] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [pendingShifts, setPendingShifts] = useState<Record<string, string>>({}); // Key: "empId-date", Value: type (empty string = delete)
    const [selectedShiftType, setSelectedShiftType] = useState<string>('休み(終日)');
    const [isSaving, setIsSaving] = useState(false);

    const { setIsDirty } = useUnsavedChanges();

    // Helper to fetch 3 months of shifts
    const fetchAllShifts = async () => {
        const prevDate = new Date(year, month - 1 - 1, 1);
        const nextDate = new Date(year, month - 1 + 1, 1);

        const prevYear = prevDate.getFullYear();
        const prevMonth = prevDate.getMonth() + 1;
        const nextYear = nextDate.getFullYear();
        const nextMonth = nextDate.getMonth() + 1;

        const [shiftRes, prevShiftRes, nextShiftRes] = await Promise.all([
            getMonthlyShifts(year, month),
            getMonthlyShifts(prevYear, prevMonth),
            getMonthlyShifts(nextYear, nextMonth),
        ]);

        const allShifts: Shift[] = [];
        if (shiftRes.success && shiftRes.data) allShifts.push(...shiftRes.data);
        if (prevShiftRes.success && prevShiftRes.data) allShifts.push(...prevShiftRes.data);
        if (nextShiftRes.success && nextShiftRes.data) allShifts.push(...nextShiftRes.data);

        // Filter duplicates
        const uniqueShifts = Array.from(new Map(allShifts.map(item => [item.id, item])).values());
        setShifts(uniqueShifts);
    };

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            const [empRes, schedRes] = await Promise.all([
                getEmployees(),
                getMonthlySchedules(year, month)
            ]);

            if (empRes.success && empRes.data) setEmployees(empRes.data as Employee[]);
            if (schedRes.success && schedRes.data) setSchedules(schedRes.data as Schedule[]);

            await fetchAllShifts();
            setPendingShifts({});
        };
        loadData();
    }, [year, month]);

    // Unsaved Changes Warning
    useEffect(() => {
        const hasUnsavedChanges = Object.keys(pendingShifts).length > 0;
        setIsDirty(hasUnsavedChanges);

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = ''; // Trigger browser default warning
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            setIsDirty(false); // Cleanup on unmount
        };
    }, [pendingShifts, setIsDirty]);

    // Helpers
    const days = useMemo(() => getCalendarDays(year, month), [year, month]);

    // Get the effective shift for display/calculation (merges server data + local pending changes)
    const getEffectiveShift = (empId: number, date: string) => {
        const key = `${empId}-${date}`;
        if (key in pendingShifts) {
            const type = pendingShifts[key];
            // If type is empty, it means "deleted" locally, so return null
            return type ? { id: -1, employeeId: empId, date, type } : null;
        }
        return shifts.find(s => s.employeeId === empId && s.date === date) || null;
    };

    // Memoize dates that have "Holiday Work" based on EFFECTIVE shifts
    // This ensures that checking/unchecking a Holiday Work shift immediately updates the rest counts of others
    const holidayWorkDates = useMemo(() => {
        const dates = new Set<string>();
        // Check ALL days in current view (including padding)
        const allViewDates = days.map(d => d.dateStr);

        allViewDates.forEach(date => {
            const hasWork = employees.some(emp => {
                const s = getEffectiveShift(emp.id, date);
                return s && (s.type.includes('休日出勤') || s.type.includes('出勤'));
            });
            if (hasWork) dates.add(date);
        });
        return dates;
    }, [shifts, pendingShifts, employees, days]);

    const getRestCount = (type: string) => {
        // Full Rest (+1)
        if (type === '休み(終日)' || type === '希望休み(終日)') return 1;

        // Half Rest (+0.5)
        const halfRestTypes = [
            '午前休み', '午後休み',
            '希望午前休み', '希望午後休み',
            '休日出勤(午前)', '休日出勤(午後)', '出勤(午前)', '出勤(午後)',
            '出張(午前)', '出張(午後)'
        ];
        if (halfRestTypes.includes(type)) return 0.5;

        // Special Leave (+0)
        if (type === '特別休暇') return 0;

        // Full Work / Trip (+0)
        if (type === '休日出勤(1日)' || type === '出勤(1日)' || type === '出張(終日)') return 0;

        // Fallbacks
        if (type.includes('午前') || type.includes('午後')) return 0.5;
        if (type.includes('休み')) return 1;

        return 0;
    };

    // Validation State
    interface ValidationResult {
        type: 'error' | 'warning';
        message: string;
        date?: string;
        employeeId?: number;
    }
    const [validationErrors, setValidationErrors] = useState<ValidationResult[]>([]);

    // Run Validation
    useEffect(() => {
        const errors: ValidationResult[] = [];

        // 1. Check for Schedules assigned to Absent Employees
        schedules.forEach(sched => {
            if (sched.employeeId) {
                const shift = getEffectiveShift(sched.employeeId, sched.date);
                // Determine if absent: Explicit Rest Shift OR Implicit Rest (Holiday Work Day with no shift)
                const isExplicitRest = shift && getRestCount(shift.type) === 1;
                const isImplicitRest = !shift && holidayWorkDates.has(sched.date);

                if (isExplicitRest || isImplicitRest) {
                    const empName = employees.find(e => e.id === sched.employeeId)?.name || '不明';
                    errors.push({
                        type: 'error',
                        message: `${format(new Date(sched.date), 'M/d')}: ${empName}さんは休みですが予定「${sched.text}」が入っています`,
                        date: sched.date,
                        employeeId: sched.employeeId
                    });
                }
            }
        });

        // 2. Check for 6+ Consecutive Work Days
        employees.forEach(emp => {
            let consecutiveWork = 0;
            // Sort days by date to ensure chronological order
            // Evaluate across the whole calendar grid (including previous month padding) to catch streaks bridging months
            const sortedDays = [...days].sort((a, b) => a.dateStr.localeCompare(b.dateStr));

            sortedDays.forEach(day => {
                const shift = getEffectiveShift(emp.id, day.dateStr);

                let isWorkingDay = false;
                if (shift) {
                    // getRestCount < 1 means they worked at least half a day
                    isWorkingDay = getRestCount(shift.type) < 1;
                } else {
                    // No shift assigned
                    if (day.isSunday || day.isHoliday || holidayWorkDates.has(day.dateStr)) {
                        isWorkingDay = false; // Closed or implicit rest
                    } else {
                        isWorkingDay = true; // Implicit work on regular weekdays
                    }
                }

                if (!isWorkingDay) {
                    consecutiveWork = 0; // Streak broken
                } else {
                    consecutiveWork++;
                }

                if (consecutiveWork >= 6 && day.isCurrentMonth) {
                    // Only flag warning if the 6th+ day lands in the current month we are editing
                    if (consecutiveWork === 6) {
                        errors.push({
                            type: 'warning',
                            message: `${emp.name}さんが6日連続勤務になっています (${format(new Date(day.dateStr), 'M/d')}時点)`,
                            date: day.dateStr,
                            employeeId: emp.id
                        });
                    }
                }
            });
        });

        setValidationErrors(errors);
    }, [pendingShifts, shifts, schedules, employees, days, holidayWorkDates]);

    const countRestDays = (empId: number) => {
        const currentMonthDays = days.filter(d => d.isCurrentMonth).map(d => d.dateStr);
        let count = 0;

        currentMonthDays.forEach(date => {
            const shift = getEffectiveShift(empId, date);
            if (shift) {
                count += getRestCount(shift.type);
            } else {
                // Implicit Rest: If no shift, but someone else is working (Holiday Work), it counts as a Rest day
                if (holidayWorkDates.has(date)) {
                    count += 1;
                }
            }
        });
        return count;
    };

    const handleCellClick = (dateStr: string) => {
        setSelectedDate(dateStr);
    };

    const handleEmployeeSelect = (empId: number) => {
        setSelectedEmployeeId(empId);
    };

    const handleRegisterShift = () => {
        if (!selectedEmployeeId || !selectedDate) return;

        setPendingShifts(prev => ({
            ...prev,
            [`${selectedEmployeeId}-${selectedDate}`]: selectedShiftType
        }));
    };

    const handleDeleteShift = () => {
        if (!selectedEmployeeId || !selectedDate) return;

        setPendingShifts(prev => ({
            ...prev,
            [`${selectedEmployeeId}-${selectedDate}`]: '' // Empty string triggers deletion logic
        }));
    };

    const handleSave = async () => {
        if (Object.keys(pendingShifts).length === 0) return;
        setIsSaving(true);

        try {
            const promises = Object.entries(pendingShifts).map(async ([key, type]) => {
                const firstHyphenIndex = key.indexOf('-');
                const empIdStr = key.substring(0, firstHyphenIndex);
                const date = key.substring(firstHyphenIndex + 1);
                const employeeId = parseInt(empIdStr);

                // Check if shift actually exists on server to decide between delete vs ignore
                const existingShift = shifts.find(s => s.employeeId === employeeId && s.date === date);

                if (!type) {
                    // Deletion requested
                    if (existingShift) {
                        return deleteShift(existingShift.id);
                    }
                    // If it didn't exist, we just don't create it. Nothing to do.
                    return Promise.resolve();
                } else {
                    // Create or Update
                    return saveShift({
                        employeeId,
                        date,
                        type: type as any
                    }, { forceOverride: true });
                }
            });

            await Promise.all(promises);

            await fetchAllShifts();
            setPendingShifts({});
            toast.success('保存しました');
        } catch (e) {
            console.error(e);
            toast.error('保存に失敗しました');
        } finally {
            setIsSaving(false);
        }
    };

    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
    const selectedDaySchedule = schedules.filter(s => s.date === selectedDate);

    // Prepare data for the Details panel list
    // This MUST use getEffectiveShift to reflect pending changes immediately
    const selectedDayShifts = employees.reduce<{ emp: Employee; shift: Shift | { type: string } }[]>((acc, emp) => {
        const s = getEffectiveShift(emp.id, selectedDate || '');
        if (s) {
            acc.push({ emp, shift: s });
        }
        return acc;
    }, []);
    // ... (existing state)
    const [isAutoAssignModalOpen, setIsAutoAssignModalOpen] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    // ... (existing helper functions)

    const currentRestCounts = useMemo(() => {
        const counts: { [key: number]: number } = {};
        employees.forEach(emp => {
            counts[emp.id] = countRestDays(emp.id);
        });
        return counts;
    }, [employees, pendingShifts, shifts, holidayWorkDates, days]);

    const handleAutoAssignApply = (addedShifts: any[]) => {
        const newPending = { ...pendingShifts };
        addedShifts.forEach(shift => {
            const key = `${shift.employeeId}-${shift.date}`;
            // Only overwrite if not already modified locally? Or overwrite anyway?
            // Let's overwrite to reflect the auto-assign result.
            newPending[key] = shift.type;
        });
        setPendingShifts(newPending);
        toast.success(`自動振り分けを反映しました (${addedShifts.length}件)`);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            <AutoAssignmentModal
                isOpen={isAutoAssignModalOpen}
                onClose={() => setIsAutoAssignModalOpen(false)}
                employees={employees}
                year={year}
                month={month}
                currentRestCounts={currentRestCounts}
                pendingShifts={pendingShifts} // Added
                onApply={handleAutoAssignApply}
            />
            <BulkDeleteModal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                year={year}
                month={month}
                employees={employees}
                onDeleted={() => {
                    fetchAllShifts();
                    setPendingShifts({});
                }}
            />

            {/* Header */}
            <div className="flex items-center justify-between py-2 xl:py-4 px-3 xl:px-6 border-b border-slate-200 bg-white gap-2">
                <div className="flex items-center gap-2 xl:gap-4">
                    <h1 className="text-base xl:text-xl font-bold flex items-center text-slate-800 shrink-0">
                        <Settings2 className="mr-1.5 xl:mr-2 h-4 w-4 xl:h-6 xl:w-6 text-purple-600" />
                        <span className="hidden sm:inline">シフト</span>調整
                    </h1>
                    <div className="flex items-center gap-0.5 xl:gap-2 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            if (month === 1) { setYear(y => y - 1); setMonth(12); }
                            else setMonth(m => m - 1);
                        }}>
                            <ChevronLeft className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                        </Button>
                        <span className="font-bold text-[12px] xl:text-base whitespace-nowrap">
                            <span className="hidden xl:inline">{year}年 </span>{month}月
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            if (month === 12) { setYear(y => y + 1); setMonth(1); }
                            else setMonth(m => m + 1);
                        }}>
                            <ChevronRight className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                        </Button>
                    </div>
                </div>
                {/* Desktop: show buttons inline */}
                <div className="hidden xl:flex items-center gap-2">
                    <Button
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-100"
                        onClick={() => setIsBulkDeleteModalOpen(true)}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />一括削除
                    </Button>
                    <div className="w-px bg-slate-200 mx-1"></div>
                    <Button
                        variant="outline"
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        onClick={() => setIsAutoAssignModalOpen(true)}
                    >
                        <Sparkles className="h-4 w-4 mr-2" />自動振り分け
                    </Button>
                    <div className="w-px bg-slate-200 mx-1"></div>
                    <Button variant="outline" onClick={() => setPendingShifts({})}>キャンセル</Button>
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleSave}
                        disabled={isSaving || Object.keys(pendingShifts).length === 0}
                    >
                        {isSaving ? '保存中...' : '保存'}
                    </Button>
                </div>
                {/* Mobile: save button always visible, others in toggle */}
                <div className="xl:hidden flex items-center gap-1.5">
                    <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white font-bold h-7 text-xs px-2"
                        onClick={handleSave}
                        disabled={isSaving || Object.keys(pendingShifts).length === 0}
                    >
                        {isSaving ? '保存中' : '保存'}
                    </Button>
                </div>
            </div>
            {/* Mobile action toggle */}
            <div className="xl:hidden border-b border-slate-200 bg-white">
                <button
                    className="w-full flex items-center justify-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 py-1.5"
                    onClick={() => setShowMobileActions(!showMobileActions)}
                >
                    <ChevronRight className={`h-3 w-3 transition-transform ${showMobileActions ? 'rotate-90' : ''}`} />
                    操作メニュー
                </button>
                {showMobileActions && (
                    <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2">
                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 h-7 text-xs px-2" onClick={() => setIsBulkDeleteModalOpen(true)}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" />一括削除
                        </Button>
                        <Button size="sm" variant="outline" className="text-purple-600 border-purple-200 h-7 text-xs px-2" onClick={() => setIsAutoAssignModalOpen(true)}>
                            <Sparkles className="h-3.5 w-3.5 mr-1" />自動振分
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setPendingShifts({})}>キャンセル</Button>
                    </div>
                )}
            </div>

            {/* Shift Editor Bar */}
            <div className="border-b border-slate-200 bg-white px-3 xl:px-6 py-2 xl:py-0 xl:h-16 flex flex-col xl:flex-row xl:items-center justify-between shadow-sm z-20 gap-2 xl:gap-3">
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                    <div className="text-xs xl:text-sm shrink-0 flex items-center">
                        <span className="text-slate-500 mr-1 whitespace-nowrap">従業員:</span>
                        <span className="font-bold truncate max-w-[80px] xl:max-w-[120px]">{selectedEmployee ? (selectedEmployee.shortName || selectedEmployee.name) : '未選択'}</span>
                    </div>
                    <div className="h-3 w-px bg-slate-300 hidden sm:block"></div>
                    <div className="text-xs xl:text-sm shrink-0 flex items-center">
                        <span className="text-slate-500 mr-1 whitespace-nowrap">日付:</span>
                        <span className="font-bold whitespace-nowrap">
                            {selectedDate
                                ? format(new Date(selectedDate), 'M/d(E)', { locale: ja })
                                : '未選択'}
                        </span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 xl:gap-2">
                    <select
                        className="h-7 xl:h-9 rounded-md border border-slate-300 text-xs xl:text-sm px-1.5 xl:px-3 bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        value={selectedShiftType}
                        onChange={(e) => setSelectedShiftType(e.target.value)}
                    >
                        {SHIFT_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white font-bold h-7 xl:h-9 text-xs px-2 xl:px-3"
                        onClick={handleRegisterShift}
                        disabled={!selectedEmployeeId || !selectedDate}
                    >
                        登録
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        className="font-bold h-7 xl:h-9 text-xs px-2 xl:px-3"
                        onClick={handleDeleteShift}
                        disabled={!selectedEmployeeId || !selectedDate}
                    >
                        削除
                    </Button>
                </div>
            </div>

            {/* ... (Rest of the component remains largely the same) */}
            {/* Main Content (3 Columns) */}
            <div className="flex-1 flex flex-col xl:flex-row overflow-auto xl:overflow-hidden bg-slate-50">
                {/* Left: Employee Selection */}
                <div className="w-full xl:w-48 border-b xl:border-b-0 xl:border-r border-slate-200 bg-white flex flex-col shrink-0">
                    <div className="p-3 xl:p-4 border-b border-slate-100 font-semibold text-slate-700 bg-slate-50/50 hidden xl:block">
                        従業員選択
                    </div>
                    <div className="flex flex-row xl:flex-col xl:flex-1 overflow-x-auto xl:overflow-y-auto xl:overflow-x-hidden p-1.5 xl:p-2 space-x-1.5 xl:space-x-0 xl:space-y-2 custom-scrollbar">
                        {employees.map(emp => (
                            <div
                                key={emp.id}
                                className={`px-2 xl:px-3 py-1.5 xl:py-2 border rounded-lg cursor-pointer transition-colors flex items-center justify-between shadow-sm shrink-0 xl:shrink-auto min-w-[70px] xl:min-w-0 ${selectedEmployeeId === emp.id
                                    ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300'
                                    : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                onClick={() => handleEmployeeSelect(emp.id)}
                            >
                                <div className="font-bold text-slate-800 text-[11px] xl:text-sm truncate">
                                    <span className="hidden xl:inline">{emp.name}</span>
                                    <span className="xl:hidden">{emp.shortName || (emp.name.length > 4 ? emp.name.slice(0, 4) : emp.name)}</span>
                                </div>
                                <div className="text-[10px] xl:text-xs text-slate-500 shrink-0 ml-1 font-medium">
                                    ({countRestDays(emp.id)})
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center: Calendar */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-[300px] xl:min-h-[400px]">
                    <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-10 hidden xl:flex">
                        <span className="font-semibold text-slate-700">月間カレンダー</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 xl:p-4 custom-scrollbar">
                        <div className="overflow-x-auto custom-scrollbar -mx-2 px-2 xl:mx-0 xl:px-0">
                            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden shadow-sm min-w-0">
                                {/* Headers */}
                                {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                                    <div key={d} className={`p-1 xl:p-2 text-center text-[10px] xl:text-xs font-bold bg-slate-50 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-600'}`}>
                                        {d}
                                    </div>
                                ))}

                                {/* Days */}
                                {days.map(day => {
                                    const isSelected = selectedDate === day.dateStr;
                                    const isCurrentMonth = day.isCurrentMonth;
                                    const shift = selectedEmployeeId ? getEffectiveShift(selectedEmployeeId, day.dateStr) : null;

                                    // Calculate Rest Counts
                                    let totalOff = 0;
                                    let pharmacistOff = 0;
                                    let assistantOff = 0;

                                    employees.forEach(emp => {
                                        const s = getEffectiveShift(emp.id, day.dateStr);
                                        let restValue = 0;

                                        if (s) {
                                            restValue = getRestCount(s.type);
                                        } else {
                                            // Use effficient Set lookup (which respects pending shifts)
                                            if (holidayWorkDates.has(day.dateStr)) {
                                                restValue = 1;
                                            }
                                        }

                                        if (restValue > 0) {
                                            totalOff += restValue;
                                            if (emp.jobType === 'Pharmacist') pharmacistOff += restValue;
                                            else if (emp.jobType === 'Assistant') assistantOff += restValue;
                                        }
                                    });

                                    return (
                                        <div
                                            key={day.dateStr}
                                            className={`
                                            min-h-[60px] xl:min-h-[80px] bg-white p-0.5 xl:p-1 cursor-pointer transition-colors flex flex-col justify-between
                                            ${!isCurrentMonth ? 'bg-slate-50 text-slate-400' : ''}
                                            ${isSelected ? 'bg-amber-50 ring-2 ring-amber-400 z-10' : 'hover:bg-slate-50'}
                                            ${shift?.type && shift.type.includes('休み') ? 'bg-slate-100' : ''} 
                                        `}
                                            onClick={() => handleCellClick(day.dateStr)}
                                        >
                                            <div className="flex justify-center items-center">
                                                <span className={`text-sm font-bold ${day.isSunday || day.holidayName ? 'text-red-500' :
                                                    day.isSaturday ? 'text-blue-500' : 'text-slate-700'
                                                    }`}>
                                                    {format(day.date, 'd')}
                                                    {day.holidayName && (
                                                        <span className="ml-1 text-[8px] xl:text-[9px] text-red-500 font-medium truncate max-w-[40px] xl:max-w-[60px]" title={day.holidayName}>
                                                            {day.holidayName}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>

                                            <div className="flex flex-col items-center justify-start space-y-0.5 xl:space-y-1 mt-0.5 xl:mt-1 w-full flex-1 overflow-hidden">
                                                <div className="text-[9px] xl:text-[10px] text-slate-500 font-medium">
                                                    {totalOff}人
                                                </div>
                                                <div className="w-full space-y-0.5 xl:space-y-1 px-0.5 xl:px-1 flex flex-col items-center overflow-y-auto shrink-0 pb-1 custom-scrollbar">
                                                    {employees.map(emp => {
                                                        const s = getEffectiveShift(emp.id, day.dateStr);
                                                        if (!s) return null;

                                                        const isPending = `${emp.id}-${day.dateStr}` in pendingShifts;

                                                        let style = '';
                                                        if (isPending) {
                                                            style = 'border-none bg-orange-100 text-orange-800 font-bold ring-1 ring-orange-400';
                                                        } else {
                                                            if (s.type.includes('休み') && !s.type.includes('希望')) {
                                                                style = 'border-none bg-slate-200 text-slate-600';
                                                            } else if (s.type.includes('希望')) {
                                                                style = 'border-none bg-amber-100 text-amber-700';
                                                            } else if (s.type.includes('出勤') || s.type.includes('休日出勤')) {
                                                                style = 'border-red-200 bg-red-100 text-red-700 border';
                                                            } else {
                                                                style = 'border-blue-200 bg-blue-100 text-blue-700 border';
                                                            }
                                                        }

                                                        return (
                                                            <div
                                                                key={emp.id}
                                                                className={`text-[8px] xl:text-[10px] px-0.5 py-0.5 rounded ${style} truncate tracking-tighter w-full text-center shadow-sm select-none h-[14px] xl:h-[18px] flex items-center justify-center`}
                                                                title={`${emp.name}: ${s.type}`}
                                                            >
                                                                {emp.shortName || emp.name}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Details & Validation */}
                <div className="w-full xl:w-80 border-t xl:border-t-0 xl:border-l border-slate-200 bg-white flex flex-col shrink-0 min-h-[300px]">
                    <div className="p-4 border-b border-slate-100 font-semibold text-slate-700 bg-slate-50/50 hidden xl:block">
                        詳細情報
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <Card className="p-4 bg-blue-50/50 border-blue-100">
                            <h3 className="font-bold text-sm mb-2 text-slate-700">
                                {selectedDate
                                    ? format(new Date(selectedDate), 'yyyy年M月d日(E)', { locale: ja })
                                    : '月間情報'}
                                の詳細
                            </h3>

                            {selectedDate ? (
                                <div className="space-y-3">
                                    {selectedDaySchedule.length > 0 ? (
                                        <div className="space-y-1">
                                            <div className="text-xs text-slate-500 font-bold">登録済み予定:</div>
                                            {selectedDaySchedule.map(s => (
                                                <div key={s.id} className="text-xs bg-white p-1 rounded border border-slate-200">
                                                    {s.employeeId
                                                        ? `👤 ${employees.find(e => e.id === s.employeeId)?.name}: ${s.text}`
                                                        : `📅 ${s.text}`
                                                    }
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">登録されている予定はありません</p>
                                    )}

                                    <div className="border-t border-slate-200 pt-2">
                                        <div className="text-xs text-slate-500 font-bold mb-1">シフト状況 (編集可):</div>
                                        <div className="text-xs text-slate-600">
                                            {selectedDayShifts.length > 0 && (
                                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                                    {selectedDayShifts.map(({ emp, shift }) => (
                                                        <div key={emp.id} className="flex items-center justify-between gap-2 p-1 hover:bg-slate-50 rounded">
                                                            <span className="truncate w-20" title={emp.name}>{emp.name}</span>
                                                            <select
                                                                className="flex-1 h-7 text-[10px] sm:text-xs border-slate-200 rounded px-1 min-w-0"
                                                                value={shift.type}
                                                                onChange={(e) => {
                                                                    if (!selectedDate) return;
                                                                    setPendingShifts(prev => ({
                                                                        ...prev,
                                                                        [`${emp.id}-${selectedDate}`]: e.target.value
                                                                    }));
                                                                }}
                                                            >
                                                                {SHIFT_TYPES.map(type => (
                                                                    <option key={type} value={type}>{type}</option>
                                                                ))}
                                                            </select>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                                onClick={() => {
                                                                    if (!selectedDate) return;
                                                                    setPendingShifts(prev => ({
                                                                        ...prev,
                                                                        [`${emp.id}-${selectedDate}`]: '' // Mark for deletion
                                                                    }));
                                                                }}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">日付を選択すると詳細が表示されます</p>
                            )}
                        </Card>

                        <div className="border-t border-slate-100 pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-sm text-slate-700">月間最終チェック</h3>
                                <Button size="sm" variant="outline" className="h-6 text-xs">更新</Button>
                            </div>
                            <Card className="p-3 bg-slate-50 border-slate-200">
                                {validationErrors.length === 0 ? (
                                    <div className="text-xs text-green-600 font-bold flex items-center">
                                        <span className="mr-1">✓</span> 問題ありません
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-1 mb-1">
                                            検証結果 ({validationErrors.length})
                                        </div>
                                        {validationErrors.map((error, idx) => (
                                            <div
                                                key={idx}
                                                className={`text-[11px] p-2 rounded border ${error.type === 'error'
                                                    ? 'bg-red-50 text-red-700 border-red-200'
                                                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                    } cursor-pointer hover:opacity-80`}
                                                onClick={() => {
                                                    if (error.date) setSelectedDate(error.date);
                                                    if (error.employeeId) setSelectedEmployeeId(error.employeeId);
                                                }}
                                            >
                                                <div className="font-bold mb-0.5 flex items-center">
                                                    {error.type === 'error' ? '× エラー' : '⚠ 注意'}
                                                </div>
                                                {error.message}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
