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
import type { SessionPayload } from '@/lib/session';

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
    session: SessionPayload | null;
}

export function CalendarGrid({ days, shifts, schedules, employees, session }: CalendarGridProps) {
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
            <div className="border border-slate-300 bg-white shadow-sm print:flex-1 print:flex print:flex-col">
                {/* Weekday Header */}
                <div className="grid grid-cols-7 border-b border-slate-200">
                    {DAYS_OF_WEEK.map((day, index) => (
                        <div
                            key={day}
                            className={cn(
                                "py-1.5 xl:py-2 text-center text-[10px] xl:text-sm font-bold bg-slate-50 border-r border-slate-200 last:border-r-0",
                                index === 0 ? "text-red-600" :
                                    index === 6 ? "text-blue-600" :
                                        "text-slate-500"
                            )}
                        >
                            {/* Shorten weekday names on mobile if needed, though they are already short */}
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid - Fixed 6 Rows */}
                <div className="grid grid-cols-7 auto-rows-fr border-b border-slate-200 print:flex-1">
                    {days.map((day, dayIdx) => {
                        const dayShifts = getShiftsForDay(day.dateStr);
                        const daySchedules = getSchedulesForDay(day);
                        const isCurrentMonth = day.isCurrentMonth;

                        const hasWorkShift = dayShifts.some(s => {
                            return s.type.includes('休日出勤');
                        });
                        const isRedBackground = day.holidayName || day.isSunday || hasWorkShift;

                        return (
                            <div
                                key={day.dateStr}
                                className={cn(
                                    "p-0.5 xl:p-1 border-r border-b border-slate-200 relative hover:bg-slate-50 transition-colors flex flex-col min-h-[80px] xl:min-h-[120px]",
                                    !isCurrentMonth && "bg-slate-50/50 text-slate-300",
                                    isCurrentMonth && isRedBackground && "bg-red-50",
                                    (dayIdx + 1) % 7 === 0 && "border-r-0",
                                )}
                                onClick={() => handleOpenShiftModal(day.dateStr)}
                            >
                                {/* Date Header */}
                                <div className="flex items-center justify-between mb-0.5 xl:mb-1 h-5 xl:h-6 shrink-0">
                                    <div className="flex items-center gap-1 overflow-hidden">
                                        <span
                                            className={cn(
                                                "text-[10px] xl:text-sm font-bold px-1 xl:px-1.5 py-0.5 rounded",
                                                day.isToday && "bg-blue-600 text-white w-5 h-5 xl:w-7 xl:h-7 flex items-center justify-center rounded-full shrink-0",
                                                !day.isToday && (day.isSunday || day.holidayName) && "text-red-600",
                                                !day.isToday && day.isSaturday && "text-blue-600",
                                                !day.isToday && !day.isSunday && !day.isSaturday && !day.holidayName && "text-slate-700"
                                            )}
                                        >
                                            {format(day.date, 'd')}
                                        </span>
                                        {day.holidayName && (
                                            <span
                                                className="text-[8px] xl:text-[10px] text-red-600 font-medium truncate max-w-[40px] xl:max-w-[80px]"
                                                title={day.holidayName}
                                            >
                                                {day.holidayName}
                                            </span>
                                        )}
                                    </div>
                                    {!!session && (
                                        <button
                                            className="p-0.5 xl:p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                                            onClick={(e) => handleOpenAddScheduleModal(day.dateStr, e)}
                                            title="予定を追加"
                                        >
                                            <Plus className="w-3 h-3 xl:w-4 xl:h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Schedules Area */}
                                <div className="flex flex-col gap-0.5 mb-1 overflow-hidden">
                                    {daySchedules.map(schedule => {
                                        const baseText = schedule.shortText || schedule.text;
                                        const empText = schedule.employeeId ? `(${getEmployeeName(schedule.employeeId)})` : '';
                                        const displayText = empText ? `${baseText}${empText}` : baseText;

                                        return (
                                            <div
                                                key={schedule.id}
                                                className={cn("text-[9px] xl:text-[11px] bg-emerald-50 text-emerald-700 px-1 py-0.25 xl:py-0.5 rounded border border-emerald-100 truncate h-[14px] xl:h-[20px] leading-tight", !!session ? "cursor-pointer hover:bg-emerald-100" : "cursor-default")}
                                                title={schedule.text + (empText ? ` ${empText}` : '')}
                                                onClick={(e) => !!session && handleOpenEditScheduleModal(schedule, e)}
                                            >
                                                {displayText}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Shifts Area - All Bottom Aligned */}
                                <div className="flex flex-col flex-grow justify-end gap-0.5 xl:gap-px mt-auto">
                                    {dayShifts.map(shift => {
                                        const type = shift.type;
                                        let styleClass = "";

                                        if (type.includes('希望')) {
                                            styleClass = "bg-orange-100 border-transparent text-orange-800";
                                        } else if (type.includes('出勤') || type.includes('出張') || type.includes('休暇')) {
                                            styleClass = "bg-red-100 border-red-200 text-red-700";
                                        } else if (type.includes('休日') || type.includes('休み')) {
                                            styleClass = "bg-slate-100 border-transparent text-slate-500";
                                        } else {
                                            styleClass = "bg-blue-100 border-blue-200 text-blue-700";
                                        }

                                        const isOwnShift = shift.employeeId.toString() === session?.id;

                                        return (
                                            <div
                                                key={shift.id}
                                                className={cn(
                                                    "flex items-center justify-between text-[9px] xl:text-[11px] px-1 py-0.5 rounded h-[14px] xl:h-[20px] leading-tight transition-opacity border",
                                                    (session?.role === 'admin' || isOwnShift) ? "cursor-pointer hover:opacity-85" : "cursor-default opacity-50",
                                                    styleClass,
                                                    isOwnShift && "ring-2 ring-blue-500 ring-offset-1 border-transparent z-10"
                                                )}
                                                onClick={(e) => {
                                                    if (session?.role === 'admin' || isOwnShift) {
                                                        handleOpenShiftModal(day.dateStr, shift, e);
                                                    } else {
                                                        e.stopPropagation();
                                                    }
                                                }}
                                            >
                                                <span className="font-medium truncate min-w-0 flex-1">
                                                    {employees.find(e => e.id === shift.employeeId)?.name || 'Unknown'}
                                                </span>
                                                <span className="hidden xl:inline print:inline text-[10px] truncate opacity-90 ml-1 shrink-0">
                                                    {(() => {
                                                        if (type === '休日(1日)') return '休';
                                                        if (type === '休日(午前)') return '休(午前)';
                                                        if (type === '休日(午後)') return '休(午後)';
                                                        if (type === '希望休(1日)') return '希望休';
                                                        if (type === '希望休(午前)') return '希望休(午前)';
                                                        if (type === '希望休(午後)') return '希望休(午後)';
                                                        if (type === '出張(1日)') return '出張';
                                                        if (type === '出勤(1日)') return '出勤';
                                                        if (type.includes('休日出勤')) return type;
                                                        return type.replace('(1日)', '');
                                                    })()}
                                                </span>
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
                        session={session}
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
