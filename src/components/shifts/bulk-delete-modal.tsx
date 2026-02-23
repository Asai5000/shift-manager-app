import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, CheckCircle, CheckSquare, Square } from 'lucide-react';
import { bulkDeleteShifts } from '@/actions/shifts';
import { toast } from 'sonner';
import { SHIFT_TYPES } from '@/constants';

interface Employee {
    id: number;
    name: string;
}

interface BulkDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    year: number;
    month: number;
    employees: Employee[];
    onDeleted: () => void;
}

export function BulkDeleteModal({
    isOpen,
    onClose,
    year,
    month,
    employees,
    onDeleted
}: BulkDeleteModalProps) {
    const [targetEmployeeId, setTargetEmployeeId] = useState<string>('all');
    // Using Set for efficient lookup, but array is easier for form submission
    const [targetShiftTypes, setTargetShiftTypes] = useState<string[]>([]); // Empty means "All" or "None"? 
    // Let's say: Empty means "All" (default) or "None"?
    // User request: "Default All, but allow selecting multiple".
    // Better UX: Start with "All" selected? Or specific mode?
    // Let's handle "All" as a special state or just check all boxes.
    // Let's use a specific state for "Delete All Types" vs "Selected Types".
    const [isAllTypes, setIsAllTypes] = useState(true);

    const [isDeleting, setIsDeleting] = useState(false);

    const toggleType = (type: string) => {
        if (isAllTypes) {
            // Switch to specific mode, start with just this type? Or all minus this?
            // Usually unchecking "All" clears selection or keeps all?
            // Let's say if we are in "All" mode and click a specific type, we enter specific mode with just that type toggled?
            // Simpler: Uncheck "All" -> All checkboxes become active.
            // Let's implement independent checkboxes and a "Select All" toggle.
            setIsAllTypes(false);
            setTargetShiftTypes([type]);
        } else {
            setTargetShiftTypes(prev => {
                if (prev.includes(type)) {
                    return prev.filter(t => t !== type);
                } else {
                    return [...prev, type];
                }
            });
        }
    };

    const handleSelectAllTypes = () => {
        if (isAllTypes) {
            // Deselect all? Or verify intent?
            // If "All" is unchecked, maybe clear selection?
            setIsAllTypes(false);
            setTargetShiftTypes([]);
        } else {
            setIsAllTypes(true);
            setTargetShiftTypes([]); // Clear specific selection when All is on
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await bulkDeleteShifts({
                year,
                month,
                employeeId: targetEmployeeId === 'all' ? undefined : parseInt(targetEmployeeId),
                types: isAllTypes ? undefined : targetShiftTypes
            });

            if (res.success) {
                toast.success('シフトを一括削除しました');
                onDeleted();
                onClose();
            } else {
                toast.error('削除に失敗しました');
            }
        } catch (e) {
            console.error(e);
            toast.error('削除に失敗しました');
        } finally {
            setIsDeleting(false);
        }
    };

    const selectClassName = "flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ring-offset-white";

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="シフト一括削除"
            description={`${year}年${month}月のシフトを一括削除します。`}
            className="max-w-md"
        >
            <div className="space-y-6 py-4">
                <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-red-800">ご注意ください</h4>
                        <p className="text-xs text-red-700 mt-1">
                            選択した条件に一致するシフトが完全に削除されます。<br />
                            元に戻すことはできません。
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>対象従業員</Label>
                        <select
                            value={targetEmployeeId}
                            onChange={(e) => setTargetEmployeeId(e.target.value)}
                            className={selectClassName}
                        >
                            <option value="all">全員</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id.toString()}>
                                    {emp.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label>削除するシフト種別</Label>
                        <div className="border border-slate-200 rounded-md p-3 max-h-48 overflow-y-auto space-y-2 bg-white">
                            <label className="flex items-center space-x-2 cursor-pointer py-1 border-b border-slate-100 pb-2 mb-2 font-bold text-sm text-slate-800">
                                <input
                                    type="checkbox"
                                    checked={isAllTypes}
                                    onChange={handleSelectAllTypes}
                                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                                />
                                <span>すべてのシフト (全削除)</span>
                            </label>

                            <div className={`space-y-1 ${isAllTypes ? 'opacity-50 pointer-events-none' : ''}`}>
                                {Object.values(SHIFT_TYPES).map(type => (
                                    <label key={type} className="flex items-center space-x-2 cursor-pointer text-sm hover:bg-slate-50 p-1 rounded">
                                        <input
                                            type="checkbox"
                                            checked={!isAllTypes && targetShiftTypes.includes(type)}
                                            onChange={() => toggleType(type)}
                                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                                        />
                                        <span>{type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 text-right">
                            {isAllTypes ? 'すべてのシフトが削除されます' : `${targetShiftTypes.length}種類のシフトを選択中`}
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                    <Button variant="outline" onClick={onClose} disabled={isDeleting}>
                        キャンセル
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting || (!isAllTypes && targetShiftTypes.length === 0)}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isDeleting ? '削除中...' : '削除実行'}
                        {!isDeleting && <Trash2 className="h-4 w-4 ml-2" />}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
