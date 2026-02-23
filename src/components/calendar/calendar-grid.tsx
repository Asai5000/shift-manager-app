'use client';

import { useState } from 'react';
import { CalendarDay, DAYS_OF_WEEK } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { matchesRecurringSchedule } from '@/lib/date-utils';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/modal';
import { ShiftForm } from '@/components/shifts/shift-form';
import { ScheduleForm } from '@/components/schedules/schedule-form';
import { Plus } from 'lucide-react';
import { ShiftType } from '@/constants';

interface Employee {
    id: number;
    name: string;
    jobType: string;
    alias: string | null;
    displayOrder: number;
}

interface Shift {
    id: number;
    employeeId: number;
    date: string;
    type: string;
}

interface Schedule {
    id: number;
    employeeId: number | null;
    type: 'date_specific' | 'monthly_recurring';
    date: string | null;
    weekNumber: number | null;
    dayOfWeek: number | null;
    text: string;
    shortText: string | null;
    isVisible: boolean;
    displayType: 'full' | 'short';
}

interface CalendarGridProps {
    days: CalendarDay[];
    shifts: Shift[];
    schedules: Schedule[];
    employees: Employee[];
}

export function CalendarGrid({ days, shifts, schedules, employees }: CalendarGridProps) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [modalType, setModalType] = useState<'shift' | 'schedule' | null>(null);
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | undefined>(undefined);
    const [selectedShiftForEdit, setSelectedShiftForEdit] = useState<{ employeeId: number, type: ShiftType } | undefined>(undefined);

    const handleOpenShiftModal = (dateStr: string, shiftData?: { employeeId: number, type: string }, e?: React.MouseEvent) => {
        // If e is present, stop propagation to prevent double firing if nested
        if (e) e.stopPropagation();

        setSelectedDate(dateStr);

        if (shiftData) {
            // Cast type string to ShiftType. 
            // In real app we might want to validate this, but for now assuming DB data is valid enum.
            setSelectedShiftForEdit({
                employeeId: shiftData.employeeId,
                type: shiftData.type as ShiftType
            });
        } else {
            setSelectedShiftForEdit(undefined);
        }

        setModalType('shift');
    };

    const handleOpenAddScheduleModal = (dateStr: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedDate(dateStr);
        setSelectedSchedule(undefined);
        setModalType('schedule');
    };

    const handleOpenEditScheduleModal = (schedule: Schedule, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedDate(schedule.date || '');
        setSelectedSchedule(schedule);
        setModalType('schedule');
    };

    const handleCloseModal = () => {
        setModalType(null);
        setSelectedDate(null);
        setSelectedSchedule(undefined);
        setSelectedShiftForEdit(undefined);
    };

    const getShiftsForDay = (dateStr: string) => {
        return shifts.filter(s => s.date === dateStr);
    };

    const getSchedulesForDay = (day: CalendarDay) => {
        return schedules.filter(s => {
            if (!s.isVisible) return false;

            // If we have a computed date from backend (for recurring) or specifically set date
            if (s.date) {
                return s.date === day.dateStr;
            }

            // Fallback for client-side recurrence calculation if needed (legacy or backup)
            if (s.type === 'monthly_recurring') {
                return matchesRecurringSchedule(day.date, s);
            }
            return false;
        });
    };

    const getEmployeeName = (id: number) => {
        const emp = employees.find(e => e.id === id);
        return emp ? (emp.alias || emp.name) : 'Unknown';
    };

    return (
        <>
            <div className="border border-slate-300 bg-white shadow-sm">
                {/* Weekday Header */}
                <div className="grid grid-cols-7 border-b border-slate-300">
                    {DAYS_OF_WEEK.map((day, index) => (
                        <div
                            key={day}
                            className={cn(
                                "py-2 text-center text-sm font-bold bg-slate-50 border-r border-slate-300 last:border-r-0",
                                index === 0 ? "text-red-600" :
                                    index === 6 ? "text-blue-600" :
                                        "text-slate-700"
                            )}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid - Fixed 6 Rows */}
                <div className="grid grid-cols-7 auto-rows-fr border-b border-slate-300">
                    {days.map((day, dayIdx) => {
                        const dayShifts = getShiftsForDay(day.dateStr);
                        const daySchedules = getSchedulesForDay(day);
                        const isCurrentMonth = day.isCurrentMonth;

                        const hasWorkShift = dayShifts.some(s => {
                            const t = s.type;
                            return !t.includes('休み') && !t.includes('希望');
                        });
                        const isRedBackground = day.holidayName || hasWorkShift;

                        return (
                            <div
                                key={day.dateStr}
                                className={cn(
                                    "p-1 border-r border-b border-slate-300 relative hover:bg-slate-50 transition-colors flex flex-col",
                                    !isCurrentMonth && "bg-slate-100/50 text-slate-400",
                                    isCurrentMonth && isRedBackground && "bg-red-50",
                                    (dayIdx + 1) % 7 === 0 && "border-r-0",
                                )}
                                onClick={() => handleOpenShiftModal(day.dateStr)}
                            >
                                {/* Date Header */}
                                <div className="flex items-center justify-between mb-1 h-6 shrink-0">
                                    <div className="flex items-center">
                                        <span
                                            className={cn(
                                                "text-sm font-bold px-1.5 py-0.5 rounded",
                                                day.isToday && "bg-blue-600 text-white",
                                                !day.isToday && day.isSunday && "text-red-600",
                                                !day.isToday && day.isSaturday && "text-blue-600",
                                                !day.isToday && !day.isSunday && !day.isSaturday && "text-slate-700"
                                            )}
                                        >
                                            {format(day.date, 'd')}
                                        </span>
                                        {day.holidayName && (
                                            <span className="hidden xl:inline ml-1 text-[10px] text-red-600 font-medium truncate max-w-[80px]" title={day.holidayName}>
                                                {day.holidayName}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                                        onClick={(e) => handleOpenAddScheduleModal(day.dateStr, e)}
                                        title="予定を追加"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Schedules Area */}
                                <div className="flex flex-col gap-0.5 min-h-[66px] mb-1">
                                    {daySchedules.map(schedule => (
                                        <div
                                            key={schedule.id}
                                            className="text-[11px] bg-green-100 text-green-900 px-1 py-0.5 rounded border border-green-200 cursor-pointer hover:bg-green-200 truncate h-[20px] leading-tight"
                                            title={schedule.text}
                                            onClick={(e) => handleOpenEditScheduleModal(schedule, e)}
                                        >
                                            {schedule.shortText || schedule.text}
                                        </div>
                                    ))}
                                </div>

                                {/* Shifts Area - All Bottom Aligned */}
                                {/* Added flex-grow and justify-end to force content to bottom of the cell */}
                                {/* Shifts Area - All Bottom Aligned */}
                                {/* Added flex-grow and justify-end to force content to bottom of the cell */}
                                <div className="flex flex-col flex-grow justify-end gap-px min-h-[110px]">
                                    {dayShifts.map(shift => {
                                        const type = shift.type;
                                        let styleClass = "";

                                        if (type.includes('希望')) {
                                            // Hope: Amber (Suggestion)
                                            styleClass = "bg-amber-50 border-amber-200 text-amber-700 opacity-90";
                                        } else if (type.includes('休み') || type.includes('午前休み') || type.includes('午後休み')) {
                                            // Rest: White (User request)
                                            styleClass = "bg-white border-slate-200 text-slate-500";
                                        } else {
                                            // Work/Trip/Special: Red base (User request)
                                            styleClass = "bg-red-50 border-red-200 text-red-700";
                                        }

                                        return (
                                            <div
                                                key={shift.id}
                                                className={cn(
                                                    "flex items-center justify-between text-[11px] px-1 py-0.5 rounded h-[20px] leading-tight cursor-pointer hover:opacity-80 transition-opacity border",
                                                    styleClass
                                                )}
                                                onClick={(e) => handleOpenShiftModal(day.dateStr, shift, e)}
                                            >
                                                <span className="font-medium truncate">{getEmployeeName(shift.employeeId)}</span>
                                                <span className="hidden xl:inline text-[10px] truncate opacity-90 ml-1">{type.replace(/\(.*\)/, '')}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div >

            <Modal
                isOpen={modalType === 'shift' && !!selectedDate}
                onClose={handleCloseModal}
                title={`シフト登録`}
                description={selectedDate ? format(new Date(selectedDate), 'yyyy年MM月dd日') : ''}
            >
                {selectedDate && (
                    <ShiftForm
                        dateStr={selectedDate}
                        employees={employees}
                        existingShifts={getShiftsForDay(selectedDate)}
                        onSuccess={handleCloseModal}
                        initialValues={selectedShiftForEdit}
                    />
                )}
            </Modal>

            <Modal
                isOpen={modalType === 'schedule'}
                onClose={handleCloseModal}
                title={selectedSchedule ? '予定の編集' : `予定の追加`}
                description={selectedDate ? format(new Date(selectedDate), 'yyyy年MM月dd日') : ''}
            >
                <ScheduleForm
                    dateStr={selectedDate || ''}
                    existingSchedule={selectedSchedule}
                    onSuccess={handleCloseModal}
                    employees={employees}
                    shifts={shifts}
                />
            </Modal>
        </>
    );
}
