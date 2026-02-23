'use client';

import { useFormStatus } from 'react-dom';
import { addEmployee, updateEmployee } from '@/actions/employees';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { JOB_TYPES, JOB_TYPE_LABELS, WARD_DAYS, JobType } from '@/constants';
import { useState } from 'react';

// Submit button component to handle pending state
function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending} isLoading={pending}>
            {isEditing ? '更新する' : '追加する'}
        </Button>
    );
}

interface EmployeeFormProps {
    employee?: {
        id: number;
        name: string;
        jobType: string;
        alias?: string | null;
        wardDay?: string | null;
    };
    onSuccess: () => void;
}

export function EmployeeForm({ employee, onSuccess }: EmployeeFormProps) {
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setError(null);
        let result;

        if (employee) {
            result = await updateEmployee(employee.id, formData);
            if (result.success) {
                onSuccess();
            } else {
                setError(result.error || 'エラーが発生しました');
            }
        } else {
            // For add, we use the state-based action wrapper or just call it directly if not using useFormState
            // modifying the action signature slightly to be compatible with direct calls for simplicity here
            // simplified: assume addEmployee returns similarly
            // Note: addEmployee signature in actions.tsx was designed for useFormState
            // Let's wrap it here or adjust action.
            // Adjusting action usage:
            const res = await addEmployee({}, formData);
            if (res.message === '従業員を追加しました') {
                onSuccess();
            } else {
                setError(res.message || 'エラーが発生しました');
            }
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
                    {error}
                </div>
            )}

            <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    名前 <span className="text-red-500">*</span>
                </label>
                <Input
                    id="name"
                    name="name"
                    defaultValue={employee?.name}
                    required
                    placeholder="山田 太郎"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="jobType" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    職種
                </label>
                <div className="relative">
                    <select
                        id="jobType"
                        name="jobType"
                        defaultValue={employee?.jobType || 'Pharmacist'}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {JOB_TYPES.map((type) => (
                            <option key={type} value={type}>
                                {JOB_TYPE_LABELS[type]}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="alias" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    略称 (任意)
                </label>
                <Input
                    id="alias"
                    name="alias"
                    defaultValue={employee?.alias || ''}
                    placeholder="ヤマダ"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="wardDay" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    病棟担当曜日 (任意)
                </label>
                <select
                    id="wardDay"
                    name="wardDay"
                    defaultValue={employee?.wardDay || ''}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <option value="">選択なし</option>
                    {Object.entries(WARD_DAYS).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="pt-4">
                <SubmitButton isEditing={!!employee} />
            </div>
        </form>
    );
}
