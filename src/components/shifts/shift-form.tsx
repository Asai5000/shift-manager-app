'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SHIFT_TYPES, ShiftType } from '@/constants';
import { saveShift, deleteShift, bulkDeleteShifts } from '@/actions/shifts';

interface Employee {
    id: number;
    name: string;
    jobType: string;
    alias: string | null;
    displayOrder: number;
}

interface ShiftFormProps {
    dateStr: string;
    employees: Employee[];
    existingShifts: { id: number; employeeId: number; type: string }[];
    onSuccess: () => void;
    initialValues?: { employeeId: number; type: ShiftType };
}

export function ShiftForm({ dateStr, employees, existingShifts, onSuccess, initialValues }: ShiftFormProps) {
    const [loading, setLoading] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | string>(initialValues?.employeeId || '');
    const [selectedType, setSelectedType] = useState<ShiftType>(initialValues?.type || '休み(終日)');

    async function handleAdd() {
        if (!selectedEmployeeId) return;
        setLoading(true);
        try {
            const result = await saveShift({
                employeeId: Number(selectedEmployeeId),
                date: dateStr,
                type: selectedType,
            });

            if (!result.success && result.conflict) {
                if (window.confirm(result.message)) {
                    await saveShift({
                        employeeId: Number(selectedEmployeeId),
                        date: dateStr,
                        type: selectedType,
                    }, { forceOverride: true });
                } else {
                    setLoading(false);
                    return;
                }
            } else if (!result.success) {
                alert(result.error || '保存に失敗しました');
                setLoading(false);
                return;
            }

            // Reset after add to allow continuous adding
            setSelectedEmployeeId('');
        } catch (e) {
            alert('保存に失敗しました');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('このシフトを削除しますか？')) return;
        setLoading(true);
        try {
            await deleteShift(id);
        } catch (e) {
            alert('削除に失敗しました');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold mb-3">新しいシフトを追加</h3>
                <div className="grid grid-cols-1 gap-3">
                    <select
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    >
                        <option value="">従業員を選択</option>
                        {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                                {emp.name}
                            </option>
                        ))}
                    </select>

                    <select
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as ShiftType)}
                    >
                        {SHIFT_TYPES.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>

                    <Button onClick={handleAdd} disabled={!selectedEmployeeId || loading} isLoading={loading}>
                        追加
                    </Button>
                </div>
            </div>

            <div>
                <h3 className="text-sm font-semibold mb-3">登録済みシフト ({dateStr})</h3>
                {existingShifts.length === 0 ? (
                    <p className="text-sm text-slate-500">シフトは登録されていません</p>
                ) : (
                    <div className="space-y-2">
                        {existingShifts.map((shift) => {
                            const emp = employees.find(e => e.id === shift.employeeId);
                            return (
                                <div key={shift.id} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded text-sm">
                                    <div>
                                        <span className="font-medium mr-2">{emp?.name || '不明'}</span>
                                        <span className="text-slate-500 text-xs">{shift.type}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDelete(shift.id)}
                                        disabled={loading}
                                    >
                                        ×
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-2">
                <Button variant="secondary" onClick={onSuccess}>
                    閉じる
                </Button>
            </div>
        </div>
    );
}
