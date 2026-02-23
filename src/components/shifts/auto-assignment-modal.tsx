'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Calculator, AlertTriangle, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { generateAutoAssignments } from '@/actions/auto-assignment';
import { toast } from 'sonner';

interface Employee {
    id: number;
    name: string;
    jobType: string; // "Pharmacist" | "Assistant"
}

interface AutoAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    employees: Employee[];
    year: number;
    month: number;
    currentRestCounts: { [empId: number]: number }; // Current rest days count per employee
    pendingShifts: Record<string, string>; // Added
    onApply: (results: any[]) => void;
}

type Step = 'settings' | 'preview';

interface AssignmentResult {
    employeeId: number;
    name: string;
    current: number;
    added: number;
    total: number;
    goalMin: number;
    goalMax: number;
    isGoalReached: boolean;
    messages: string[];
}

export function AutoAssignmentModal({
    isOpen,
    onClose,
    employees,
    year,
    month,
    currentRestCounts,
    pendingShifts,
    onApply
}: AutoAssignmentModalProps) {
    const [step, setStep] = useState<Step>('settings');
    const [maxRestPharmacist, setMaxRestPharmacist] = useState(3); // Default 3 (updated based on user request)
    const [maxRestAssistant, setMaxRestAssistant] = useState(2);   // Default 2
    const [employeeSettings, setEmployeeSettings] = useState<{ [id: number]: { min: number, max: number } }>({});
    const [results, setResults] = useState<AssignmentResult[]>([]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [generatedShifts, setGeneratedShifts] = useState<any[]>([]);

    // Initialize/Sync defaults when employees are loaded
    useEffect(() => {
        if (employees.length > 0 && Object.keys(employeeSettings).length === 0) {
            setEmployeeSettings(
                Object.fromEntries(employees.map(e => [e.id, { min: 10, max: 12 }]))
            );
        }
    }, [employees]);

    const handleBulkSet = () => {
        const min = prompt('目標最小休日数を入力してください', '10');
        const max = prompt('目標最大休日数を入力してください', '12');
        if (min && max) {
            const newSettings = { ...employeeSettings };
            employees.forEach(e => {
                newSettings[e.id] = { min: parseInt(min), max: parseInt(max) };
            });
            setEmployeeSettings(newSettings);
        }
    };

    const runSimulation = async () => {
        setIsSimulating(true);
        try {
            const res = await generateAutoAssignments({
                year,
                month,
                employees,
                maxRestPharmacist,
                maxRestAssistant,
                employeeSettings,
                pendingShifts
            });

            if (res.success && res.data) {
                setResults(res.data.results);
                setGeneratedShifts(res.data.newShifts);
                setStep('preview');
            } else {
                toast.error(res.error || 'シミュレーションに失敗しました');
            }
        } catch (e) {
            console.error(e);
            toast.error('シミュレーションに失敗しました');
        } finally {
            setIsSimulating(false);
        }
    };

    const handleApply = () => {
        onApply(generatedShifts);
        onClose();
        setStep('settings');
        setGeneratedShifts([]);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="シフト自動振り分け"
            description={step === 'settings' ? '振り分けの条件を設定してください。' : 'シミュレーション結果を確認して反映してください。'}
            className="max-w-3xl"
        >
            <div className="max-h-[90vh] overflow-y-auto py-4"> {/* Added padding and overflow from DialogContent */}
                {step === 'settings' && (
                    <div className="space-y-6">
                        {/* Basic Settings */}
                        <Card className="p-4 bg-slate-50 border-slate-200">
                            <h3 className="font-semibold text-sm mb-3 text-slate-700 flex items-center">
                                <Calculator className="h-4 w-4 mr-2" />
                                基本設定
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>対象月</Label>
                                    <div className="p-2 bg-white border border-slate-200 rounded text-sm font-medium">
                                        {year}年 {month}月
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>1日の最大休み人数</Label>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <Label htmlFor="maxRestPh" className="text-xs text-slate-500 mb-1 block">薬剤師</Label>
                                            <Input
                                                id="maxRestPh"
                                                type="number"
                                                value={maxRestPharmacist}
                                                onChange={e => setMaxRestPharmacist(parseInt(e.target.value))}
                                                min={0}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Label htmlFor="maxRestAs" className="text-xs text-slate-500 mb-1 block">助手</Label>
                                            <Input
                                                id="maxRestAs"
                                                type="number"
                                                value={maxRestAssistant}
                                                onChange={e => setMaxRestAssistant(parseInt(e.target.value))}
                                                min={0}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Employee Settings */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-sm text-slate-700">従業員別設定 (休日日数目標)</h3>
                                <Button size="sm" variant="outline" onClick={handleBulkSet}>
                                    一括設定
                                </Button>
                            </div>
                            <div className="border border-slate-200 rounded-md overflow-hidden">
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-500 grid grid-cols-12 gap-2">
                                    <div className="col-span-4">氏名</div>
                                    <div className="col-span-2 text-center">現在</div>
                                    <div className="col-span-6 text-center">目標 (最小 〜 最大)</div>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto bg-white">
                                    {employees.map(emp => (
                                        <div key={emp.id} className="px-4 py-3 border-b border-slate-100 last:border-0 grid grid-cols-12 gap-2 items-center text-sm">
                                            <div className="col-span-4 font-medium">{emp.name}</div>
                                            <div className="col-span-2 text-center text-slate-500">
                                                {currentRestCounts[emp.id] || 0}日
                                            </div>
                                            <div className="col-span-6 flex items-center justify-center gap-2">
                                                <Input
                                                    className="w-16 h-8 text-center"
                                                    type="number"
                                                    value={employeeSettings[emp.id]?.min ?? ''}
                                                    onChange={e => {
                                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                        setEmployeeSettings(prev => ({
                                                            ...prev,
                                                            [emp.id]: { ...(prev[emp.id] || { max: 0 }), min: val }
                                                        }))
                                                    }}
                                                />
                                                <span>〜</span>
                                                <Input
                                                    className="w-16 h-8 text-center"
                                                    type="number"
                                                    value={employeeSettings[emp.id]?.max ?? ''}
                                                    onChange={e => {
                                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                        setEmployeeSettings(prev => ({
                                                            ...prev,
                                                            [emp.id]: { ...(prev[emp.id] || { min: 0 }), max: val }
                                                        }))
                                                    }}
                                                />
                                                <span>日</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'preview' && (
                    <div className="space-y-6 py-4">
                        <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div>
                                <h3 className="font-bold text-blue-800">シミュレーション結果</h3>
                                <p className="text-sm text-blue-600 mt-1">まだ保存されていません。「反映する」を押すと調整画面に仮反映されます。</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setStep('settings')}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                設定に戻る
                            </Button>
                        </div>

                        <div className="border border-slate-200 rounded-md overflow-hidden">
                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-500 grid grid-cols-12 gap-2">
                                <div className="col-span-4">氏名</div>
                                <div className="col-span-4 text-center">休日数推移</div>
                                <div className="col-span-4 text-right">判定</div>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto bg-white">
                                {results.map(r => (
                                    <div key={r.employeeId} className="px-4 py-3 border-b border-slate-100 last:border-0 grid grid-cols-12 gap-2 items-center text-sm">
                                        <div className="col-span-4 font-medium">{r.name}</div>
                                        <div className="col-span-4 text-center flex items-center justify-center gap-2">
                                            <span className="text-slate-500">{r.current}</span>
                                            <ArrowRight className="h-3 w-3 text-slate-300" />
                                            <span className="font-bold text-slate-900">{r.total}</span>
                                            <span className="text-xs text-green-600 font-medium">(+{r.added})</span>
                                        </div>
                                        <div className="col-span-4 text-right flex items-center justify-end gap-2">
                                            {r.isGoalReached ? (
                                                <div className="flex items-center text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    OK
                                                </div>
                                            ) : (
                                                <div className="flex items-center text-amber-600 text-xs font-bold bg-amber-50 px-2 py-1 rounded">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    {r.messages[0] || '調整必要'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                    <Button variant="outline" onClick={onClose}>キャンセル</Button>
                    {step === 'settings' ? (
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={runSimulation}
                            disabled={isSimulating}
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            {isSimulating ? '計算中...' : '自動振り分け実行'}
                        </Button>
                    ) : (
                        <Button onClick={handleApply}>
                            調整画面に反映する
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
