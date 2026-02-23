'use client';

import { useState, useEffect } from 'react';
import { deleteEmployee, reorderEmployees } from '@/actions/employees';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmployeeForm } from '@/components/employee-form';
import { JOB_TYPE_LABELS, JobType } from '@/constants';
import { Trash2, UserPlus, Search, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Reorder } from 'framer-motion';

interface Employee {
    id: number;
    name: string;
    jobType: string;
    alias: string | null;
    wardDay: string | null;
    displayOrder: number;
}

export function EmployeeList({ employees }: { employees: Employee[] }) {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | 'new'>('new');
    const [searchTerm, setSearchTerm] = useState('');
    const [orderedEmployees, setOrderedEmployees] = useState(employees);

    // Sync orderedEmployees when prop changes
    useEffect(() => {
        setOrderedEmployees(employees);
    }, [employees]);

    // Filter from the ORDERED list
    const filteredEmployees = orderedEmployees.filter(emp =>
        emp.name.includes(searchTerm) ||
        (emp.alias && emp.alias.includes(searchTerm))
    );

    const isSearching = searchTerm.length > 0;

    const selectedEmployee = typeof selectedEmployeeId === 'number'
        ? employees.find(e => e.id === selectedEmployeeId)
        : null;

    const handleReorder = (newOrder: Employee[]) => {
        setOrderedEmployees(newOrder);
    };

    const handleDragEnd = async () => {
        // Prepare updates based on current index
        const updates = orderedEmployees.map((emp, index) => ({
            id: emp.id,
            displayOrder: index
        }));
        await reorderEmployees(updates);
    };

    async function handleDelete(id: number, e: React.MouseEvent) {
        e.stopPropagation();
        if (confirm('本当に削除しますか？\nこの従業員のシフトデータもすべて削除されます。')) {
            const res = await deleteEmployee(id);
            if (res.success) {
                if (selectedEmployeeId === id) {
                    setSelectedEmployeeId('new');
                }
            } else {
                alert('削除に失敗しました');
            }
        }
    }

    return (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-200px)] min-h-[500px]">
            {/* Left Panel: Employee List */}
            <div className="w-full md:w-1/3 flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-slate-800">従業員一覧 ({employees.length})</h2>
                        <Button
                            size="sm"
                            variant={selectedEmployeeId === 'new' ? 'default' : 'outline'}
                            onClick={() => setSelectedEmployeeId('new')}
                            className="h-8"
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            新規登録
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="名前で検索..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {filteredEmployees.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            該当する従業員がいません
                        </div>
                    ) : (
                        <Reorder.Group axis="y" values={orderedEmployees} onReorder={handleReorder} className="space-y-1">
                            {filteredEmployees.map((employee) => (
                                <Reorder.Item
                                    key={employee.id}
                                    value={employee}
                                    dragListener={!isSearching}
                                    onDragEnd={handleDragEnd}
                                    className="relative"
                                >
                                    <div
                                        onClick={() => setSelectedEmployeeId(employee.id)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors group select-none",
                                            selectedEmployeeId === employee.id
                                                ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200"
                                                : "bg-white hover:bg-slate-50 border border-transparent"
                                        )}
                                    >
                                        <div className="flex items-center space-x-3 overflow-hidden">
                                            {/* Drag Handle - Only show if not searching */}
                                            {!isSearching && (
                                                <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 flex-shrink-0">
                                                    <GripVertical className="w-4 h-4" />
                                                </div>
                                            )}

                                            <Avatar className="h-9 w-9 border border-slate-200 bg-white flex-shrink-0">
                                                <AvatarFallback className={cn(
                                                    "text-xs font-medium",
                                                    selectedEmployeeId === employee.id ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                                                )}>
                                                    {employee.name.slice(0, 2)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className={cn(
                                                    "text-sm font-medium truncate",
                                                    selectedEmployeeId === employee.id ? "text-blue-900" : "text-slate-900"
                                                )}>
                                                    {employee.name}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate">
                                                    {JOB_TYPE_LABELS[employee.jobType as JobType]}
                                                    {employee.alias && ` • ${employee.alias}`}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                                            onClick={(e) => handleDelete(employee.id, e)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>
                    )}
                </div>
            </div>

            {/* Right Panel: Edit Form */}
            <div className="flex-1">
                <Card className="h-full border-slate-200 shadow-sm flex flex-col">
                    <CardHeader className="border-b border-slate-100 pb-4">
                        <CardTitle className="text-lg flex items-center">
                            {selectedEmployeeId === 'new' ? (
                                <>
                                    <UserPlus className="w-5 h-5 mr-2 text-blue-600" />
                                    新規従業員の登録
                                </>
                            ) : (
                                <>
                                    <div className="w-1.5 h-5 bg-blue-600 rounded-full mr-2" />
                                    従業員情報の編集
                                </>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {selectedEmployeeId === 'new'
                                ? '新しい従業員情報を入力してください。'
                                : `${selectedEmployee?.name} さんの情報を編集しています。`
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 overflow-y-auto flex-1">
                        <div className="max-w-md mx-auto">
                            {/* Key prop ensures form resets when selection changes */}
                            <EmployeeForm
                                key={selectedEmployeeId}
                                employee={selectedEmployee || undefined}
                                onSuccess={() => {
                                    if (selectedEmployeeId === 'new') {
                                        // Keeping in new mode or logic
                                    }
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
