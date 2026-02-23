'use client';

import { useState, useEffect } from 'react';
import { getRecurringSchedules, deleteSchedule } from '@/actions/schedules';
import { getEmployees } from '@/actions/employees';
import { RecurringScheduleList } from '@/components/schedules/recurring-schedule-list';
import { RecurringScheduleForm } from '@/components/schedules/recurring-schedule-form';

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

export default function RecurringSchedulesPage() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedScheduleId, setSelectedScheduleId] = useState<number | 'new'>('new');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        // Optimistic UI updates or loading state could be improved here
        // If we are just refreshing data, maybe don't set full page loading if possible
        const [schedulesRes, employeesRes] = await Promise.all([
            getRecurringSchedules(),
            getEmployees()
        ]);

        if (schedulesRes.success && schedulesRes.data) {
            setSchedules(schedulesRes.data as Schedule[]);
        }
        if (employeesRes.success && employeesRes.data) {
            setEmployees(employeesRes.data);
        }
        setIsLoading(false);
    }

    async function handleDelete(id: number) {
        if (!confirm('本当に削除しますか？')) return;
        const res = await deleteSchedule(id);
        if (res.success) {
            if (selectedScheduleId === id) {
                setSelectedScheduleId('new');
            }
            loadData();
        } else {
            alert('削除に失敗しました');
        }
    }

    const selectedSchedule = typeof selectedScheduleId === 'number'
        ? schedules.find(s => s.id === selectedScheduleId)
        : undefined;

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">読み込み中...</div>;
    }

    return (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-200px)] min-h-[500px]">
            {/* Left Panel: List */}
            <RecurringScheduleList
                schedules={schedules}
                employees={employees}
                selectedScheduleId={selectedScheduleId}
                onSelectSchedule={setSelectedScheduleId}
                onDeleteSchedule={handleDelete}
            />

            {/* Right Panel: Form */}
            <div className="flex-1">
                {/* Key forces re-mount when switching between 'new' and edit mode to reset state properly if needed, 
                    though the component handles prop changes too. */}
                <RecurringScheduleForm
                    key={selectedScheduleId}
                    schedule={selectedSchedule}
                    employees={employees}
                    onSuccess={() => {
                        loadData();
                        if (selectedScheduleId === 'new') {
                            // Stay on new or switch? Usually stay on 'new' for rapid entry is nice, 
                            // but seeing the result is also good. user didn't specify.
                            // Let's keep it 'new' for now.
                        }
                    }}
                />
            </div>
        </div>
    );
}
