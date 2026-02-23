'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { updateSchedule, addSchedule, AddScheduleData } from '@/actions/schedules';
import { CalendarClock, Save } from 'lucide-react';

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

interface RecurringScheduleFormProps {
    schedule?: Schedule;
    employees: Employee[];
    onSuccess: () => void;
}

export function RecurringScheduleForm({ schedule, employees, onSuccess }: RecurringScheduleFormProps) {
    const isEditing = !!schedule;
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        text: '',
        shortText: '',
        weekNumber: 1,
        dayOfWeek: 1, // Default Monday
        employeeId: '',
    });

    // Initialize form when schedule changes
    useEffect(() => {
        if (schedule) {
            setFormData({
                text: schedule.text,
                shortText: schedule.shortText || '',
                weekNumber: schedule.weekNumber || 1,
                dayOfWeek: schedule.dayOfWeek || 1,
                employeeId: schedule.employeeId ? String(schedule.employeeId) : '',
            });
        } else {
            setFormData({
                text: '',
                shortText: '',
                weekNumber: 1,
                dayOfWeek: 1,
                employeeId: '',
            });
        }
    }, [schedule]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);

        const data: AddScheduleData = {
            type: 'monthly_recurring',
            text: formData.text,
            shortText: formData.shortText || undefined,
            weekNumber: Number(formData.weekNumber),
            dayOfWeek: Number(formData.dayOfWeek),
            // Convert empty string to null/undefined
            employeeId: formData.employeeId ? Number(formData.employeeId) : null,
            isVisible: true,
            displayType: 'full',
        };

        let res;
        if (isEditing && schedule) {
            res = await updateSchedule(schedule.id, data);
        } else {
            res = await addSchedule(data);
        }

        setIsLoading(false);

        if (res.success) {
            if (!isEditing) {
                // Reset form if creating new
                setFormData({ text: '', shortText: '', weekNumber: 1, dayOfWeek: 1, employeeId: '' });
            }
            onSuccess();
        } else {
            alert(res.error || '保存に失敗しました');
        }
    }

    return (
        <Card className="h-full border-slate-200 shadow-sm flex flex-col">
            <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg flex items-center">
                    <CalendarClock className="w-5 h-5 mr-2 text-blue-600" />
                    {isEditing ? '予定の編集' : '新しい予定の登録'}
                </CardTitle>
                <CardDescription>
                    {isEditing
                        ? '登録済みの予定内容を変更します。'
                        : '毎月自動的に表示される繰り返し予定を作成します。'
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 overflow-y-auto flex-1">
                <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            予定のタイトル <span className="text-red-500">*</span>
                        </label>
                        <Input
                            required
                            placeholder="例: 定例会議"
                            value={formData.text}
                            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            略称 (カレンダー表示用)
                        </label>
                        <Input
                            placeholder="例: 会議 (未入力の場合はタイトルが表示されます)"
                            value={formData.shortText}
                            onChange={(e) => setFormData({ ...formData, shortText: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">週</label>
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.weekNumber}
                                onChange={(e) => setFormData({ ...formData, weekNumber: Number(e.target.value) })}
                            >
                                {WEEK_NUMBERS.map(w => (
                                    <option key={w.value} value={w.value}>{w.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">曜日</label>
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.dayOfWeek}
                                onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
                            >
                                {DAYS_OF_WEEK.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">担当者 (任意)</label>
                        <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.employeeId}
                            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                        >
                            <option value="">指定なし</option>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                            <Save className="w-4 h-4 mr-2" />
                            {isEditing ? '変更を保存' : '予定を作成'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
