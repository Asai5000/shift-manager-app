'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, CalendarClock, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';


interface Schedule {
    id: number;
    text: string;
    shortText: string | null;
    weekNumber: number | null;
    dayOfWeek: number | null;
    employeeId: number | null;
}

interface Employee {
    id: number;
    name: string;
}

const WEEK_NUMBERS = [
    { value: 1, label: '第1' },
    { value: 2, label: '第2' },
    { value: 3, label: '第3' },
    { value: 4, label: '第4' },
    { value: 5, label: '第5' },
];

const DAYS_OF_WEEK = [
    { value: 0, label: '日曜日' },
    { value: 1, label: '月曜日' },
    { value: 2, label: '火曜日' },
    { value: 3, label: '水曜日' },
    { value: 4, label: '木曜日' },
    { value: 5, label: '金曜日' },
    { value: 6, label: '土曜日' },
];

interface RecurringScheduleListProps {
    schedules: Schedule[];
    employees: Employee[];
    selectedScheduleId: number | 'new';
    onSelectSchedule: (id: number | 'new') => void;
    onDeleteSchedule: (id: number) => void;
}

export function RecurringScheduleList({
    schedules,
    employees,
    selectedScheduleId,
    onSelectSchedule,
    onDeleteSchedule
}: RecurringScheduleListProps) {

    const getEmployeeName = (id: number | null) => {
        if (!id) return '指定なし';
        return employees.find(e => e.id === id)?.name || '不明';
    };

    return (
        <div className="w-full md:w-1/3 flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="p-4 border-b border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800 flex items-center">
                        <CalendarClock className="w-4 h-4 mr-2" />
                        繰り返し予定 ({schedules.length})
                    </h2>
                    <Button
                        size="sm"
                        variant={selectedScheduleId === 'new' ? 'default' : 'outline'}
                        onClick={() => onSelectSchedule('new')}
                        className="h-8"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        新規登録
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {schedules.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                        登録された予定はありません
                    </div>
                ) : (
                    schedules.map((schedule) => (
                        <div
                            key={schedule.id}
                            onClick={() => onSelectSchedule(schedule.id)}
                            className={cn(
                                "flex items-start justify-between p-3 rounded-md cursor-pointer transition-colors group select-none hover:bg-slate-50 border",
                                selectedScheduleId === schedule.id
                                    ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200"
                                    : "bg-white border-transparent"
                            )}
                        >
                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between">
                                    <h3 className={cn(
                                        "font-medium truncate",
                                        selectedScheduleId === schedule.id ? "text-blue-900" : "text-slate-900"
                                    )}>
                                        {schedule.text}
                                        {schedule.shortText && (
                                            <span className="ml-2 text-xs text-slate-500 font-normal">
                                                ({schedule.shortText})
                                            </span>
                                        )}
                                    </h3>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-slate-600 bg-slate-100">
                                        {WEEK_NUMBERS.find(w => w.value === schedule.weekNumber)?.label}
                                        {DAYS_OF_WEEK.find(d => d.value === schedule.dayOfWeek)?.label}
                                    </span>
                                    {schedule.employeeId && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-slate-600 bg-blue-50/50">
                                            {getEmployeeName(schedule.employeeId)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0 -mr-1 -mt-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteSchedule(schedule.id);
                                }}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
