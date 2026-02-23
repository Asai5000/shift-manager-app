'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addSchedule, updateSchedule, deleteSchedule } from '@/actions/schedules';

import { isEmployeeAbsent } from '@/lib/validation';

// Simple implementation: currently only handles adding date-specific schedules for now as per minimal requirement,
// but structure prepared for more.
// To fully replicate GAS app, we need tabs for "Date Specific" and "Monthly Recurring".
// Let's implement a simple tab switcher.

interface ScheduleFormProps {
    dateStr: string;
    onSuccess: () => void;
    existingSchedule?: any; // If editing
    employees: any[];
    shifts: any[];
}

export function ScheduleForm({ dateStr, onSuccess, existingSchedule, employees, shifts }: ScheduleFormProps) {
    const [date, setDate] = useState(dateStr);
    const [employeeId, setEmployeeId] = useState<number | null>(existingSchedule?.employeeId || null);
    const [loading, setLoading] = useState(false);
    const [text, setText] = useState(existingSchedule?.text || '');
    const [shortText, setShortText] = useState(existingSchedule?.shortText || '');
    const [isVisible, setIsVisible] = useState(existingSchedule?.isVisible ?? true);

    // Filter shifts for the selected date
    const isAbsent = employeeId ? isEmployeeAbsent(employeeId, date, shifts) : false;

    async function handleSubmit() {
        if (!text) return;
        setLoading(true);
        try {
            if (existingSchedule) {
                await updateSchedule(existingSchedule.id, {
                    ...existingSchedule,
                    text,
                    shortText,
                    isVisible,
                    employeeId,
                    date
                });
            } else {
                await addSchedule({
                    type: 'date_specific',
                    date,
                    text,
                    shortText,
                    isVisible,
                    displayType: 'full',
                    employeeId
                });
            }
            onSuccess();
        } catch (e) {
            alert('保存に失敗しました');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!existingSchedule || !confirm('この予定を削除しますか？')) return;
        setLoading(true);
        try {
            await deleteSchedule(existingSchedule.id);
            onSuccess();
        } catch (e) {
            alert('削除に失敗しました');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">日付</label>
                <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">担当者 (任意)</label>
                <select
                    className="w-full h-10 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={employeeId || ''}
                    onChange={(e) => setEmployeeId(e.target.value ? parseInt(e.target.value) : null)}
                >
                    <option value="">(担当者なし)</option>
                    {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                            {emp.name}
                        </option>
                    ))}
                </select>
                {isAbsent && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200 flex items-center">
                        <span className="font-bold mr-1">⚠ 警告:</span>
                        この日は以下の理由で「休み」扱いです
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">予定内容</label>
                <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="例: 会議, 研修"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">略称 (カレンダー表示用)</label>
                <Input
                    value={shortText}
                    onChange={(e) => setShortText(e.target.value)}
                    placeholder="例: 会, 研"
                />
            </div>

            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="isVisible"
                    checked={isVisible}
                    onChange={(e) => setIsVisible(e.target.checked)}
                    className="rounded border-slate-300"
                />
                <label htmlFor="isVisible" className="text-sm">カレンダーに表示する</label>
            </div>

            <div className="flex justify-between pt-4">
                {existingSchedule ? (
                    <Button variant="danger" type="button" onClick={handleDelete} disabled={loading} isLoading={loading}>
                        削除
                    </Button>
                ) : (
                    <div></div> // Spacer
                )}
                <div className="flex space-x-2">
                    <Button variant="secondary" onClick={onSuccess} disabled={loading}>
                        キャンセル
                    </Button>
                    <Button onClick={handleSubmit} disabled={!text || loading} isLoading={loading}>
                        保存
                    </Button>
                </div>
            </div>
        </div>
    );
}
