'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getEmployees } from '@/actions/employees';
import { getAMTaskOptions, saveAMTaskOptions, getAMAssignments, saveAMAssignment, clearAMAssignments, clearAutoAMAssignments, generateAMAutoAssignments, getEarlyShiftStats } from '@/actions/am-tasks';
import { getMonthlyShifts } from '@/actions/shifts';
import { getCalendarDays } from '@/lib/date-utils';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Play, Trash2, XCircle, ArrowRightLeft, AlertTriangle, FilePenLine, Users, Settings, Plus, X, ArrowUp, ArrowDown, Pill, ClipboardList, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { QRCodeDisplay } from '@/components/qrcode-display';
import { Input } from '@/components/ui/input';
import { getCurrentSession } from '@/actions/session';
import type { SessionPayload } from '@/lib/session';

// --- Types ---
interface Employee {
    id: number;
    name: string;
    shortName?: string | null;
    displayOrder: number;
    jobType: string;
}

interface TaskOption {
    id: string;
    name: string;
    bgColor: string;
    textColor: string;
    order: number;
    isFallback?: boolean;
    excludeFromAuto?: boolean;
}

// --- Constants ---
const BG_COLOR_PALETTE = [
    { label: 'グレー', value: 'bg-slate-100 border-slate-300' },
    { label: 'ブルー', value: 'bg-blue-500 border-blue-600' },
    { label: 'ライトブルー', value: 'bg-blue-100 border-blue-300' },
    { label: 'レッド', value: 'bg-red-500 border-red-600' },
    { label: 'イエロー', value: 'bg-yellow-300 border-yellow-400' },
    { label: 'ライトイエロー', value: 'bg-yellow-50 border-yellow-200' },
    { label: 'オレンジ', value: 'bg-orange-400 border-orange-500' },
    { label: 'アンバー', value: 'bg-amber-500 border-amber-600' },
    { label: 'ピンク', value: 'bg-pink-100 border-pink-300' },
    { label: 'ホワイト', value: 'bg-white border-slate-300' },
];

const TEXT_COLOR_PALETTE = [
    { label: '標準 (濃いグレー)', value: 'text-slate-800' },
    { label: 'ブラック', value: 'text-black font-bold' },
    { label: 'ホワイト', value: 'text-white' },
    { label: 'レッド', value: 'text-red-600 font-bold' },
    { label: 'ブラウン', value: 'text-amber-900 font-bold' },
];

const DEFAULT_TASK_OPTIONS: TaskOption[] = [
    { id: 't1', name: '院外監査', bgColor: 'bg-slate-100 border-slate-300', textColor: 'text-slate-800', order: 1 },
    { id: 't2', name: '注射監査', bgColor: 'bg-yellow-50 border-yellow-200', textColor: 'text-slate-800', order: 2 },
    { id: 't3', name: 'ミキシング・散剤', bgColor: 'bg-orange-400 border-orange-500', textColor: 'text-white', order: 3 },
    { id: 't4', name: '処方薬調剤', bgColor: 'bg-yellow-300 border-yellow-400', textColor: 'text-slate-800', order: 4 },
    { id: 't5', name: '外来', bgColor: 'bg-white border-slate-300', textColor: 'text-red-600 font-bold', order: 5 },
    { id: 't6', name: '病棟', bgColor: 'bg-blue-500 border-blue-600', textColor: 'text-white', order: 6 },
    { id: 't7', name: '散剤混注', bgColor: 'bg-amber-500 border-amber-600', textColor: 'text-white', order: 7 },
];

export default function ScheduleTasksAMPage() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showStats, setShowStats] = useState(false);

    // Pagination State
    const [weekOffset, setWeekOffset] = useState(0);

    // Hydration and Session state
    const [isMounted, setIsMounted] = useState(false);
    const [session, setSession] = useState<SessionPayload | null>(null);

    useEffect(() => {
        setIsMounted(true);
        getCurrentSession().then(setSession);
    }, []);

    // Confirmation Modals State
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
    const [showClearAutoConfirm, setShowClearAutoConfirm] = useState(false);
    const [showMobileActions, setShowMobileActions] = useState(false);

    const [assignments, setAssignments] = useState<Record<string, string>>({});

    // Free Input mode state: { [empId-dateStr]: boolean }
    const [freeInputCells, setFreeInputCells] = useState<Record<string, boolean>>({});

    // Exchange Mode State
    const [isExchangeMode, setIsExchangeMode] = useState(false);
    const [exchangeSelection, setExchangeSelection] = useState<{ empId: number, dateStr: string } | null>(null);

    // Task Options State
    const [taskOptions, setTaskOptions] = useState<TaskOption[]>(DEFAULT_TASK_OPTIONS);
    const [showTaskModal, setShowTaskModal] = useState(false);

    // Shift Context State mapped by `${empId}-${dateStr}` -> `type`
    const [shifts, setShifts] = useState<Record<string, string>>({});
    // Set of dates that have SOME holiday work
    const [holidayWorkDates, setHolidayWorkDates] = useState<Set<string>>(new Set());

    // Yearly stats state mapped by `empId` -> count
    const [yearlyEarlyShiftCounts, setYearlyEarlyShiftCounts] = useState<Record<number, number>>({});

    const allDays = useMemo(() => getCalendarDays(year, month), [year, month]);

    // Extract Mon-Sat sets for weeks containing the current month
    const allWeeks = useMemo(() => {
        const weeks = [];
        for (let w = 0; w < 6; w++) {
            const monToSat = allDays.slice(w * 7 + 1, w * 7 + 7);
            if (monToSat.some(d => d.isCurrentMonth)) {
                weeks.push(monToSat);
            }
        }
        return weeks;
    }, [allDays]);

    const maxWeekOffset = Math.max(0, allWeeks.length - 1);

    const displayDays = useMemo(() => {
        if (!allWeeks.length) return [];
        return allWeeks[Math.min(weekOffset, maxWeekOffset)];
    }, [allWeeks, weekOffset, maxWeekOffset]);

    const loadAssignments = async (weeksToLoad = allWeeks, currentTaskOptions = taskOptions) => {
        if (weeksToLoad.length === 0) return;
        const startStr = weeksToLoad[0][0].dateStr;
        const endStr = weeksToLoad[weeksToLoad.length - 1][5].dateStr;
        const asgRes = await getAMAssignments(startStr, endStr);
        if (asgRes.success && asgRes.data) {
            const loaded: Record<string, string> = {};
            asgRes.data.forEach(a => {
                loaded[`${a.employeeId}-${a.date}`] = a.taskName;
            });
            setAssignments(loaded);

            console.log('[DEBUG] exact loaded map examples: ', Object.entries(loaded).slice(0, 5));
            console.log('[DEBUG] taskOptions names:', currentTaskOptions.map(o => o.name));

            const newFreeInputCells: Record<string, boolean> = {};
            Object.keys(loaded).forEach(key => {
                const taskName = loaded[key];
                const isRest = taskName === '休';
                // Also check other un-editable generated terms that aren't custom tasks
                const isSystemManaged = ['休', '出張', '特別休暇', '有給休暇', '休日出勤', '出勤', '休日(1日)'].includes(taskName);
                const isCustomTask = taskName !== '' && !isSystemManaged && !currentTaskOptions.some(o => o.name === taskName);
                if (isCustomTask) {
                    newFreeInputCells[key] = true;
                }
            });
            setFreeInputCells(newFreeInputCells);
        }
    };

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const empRes = await getEmployees();
            if (empRes.success && empRes.data) {
                const filteredEmps = empRes.data.filter((e: any) => e.jobType !== 'Other');
                setEmployees(filteredEmps as Employee[]);
            }

            let currentOptions = taskOptions;
            const optRes = await getAMTaskOptions();
            if (optRes.success && optRes.data && optRes.data.length > 0) {
                setTaskOptions(optRes.data);
                currentOptions = optRes.data;
            }

            const shiftRes = await getMonthlyShifts(year, month);
            if (shiftRes.success && shiftRes.data) {
                const shiftMap: Record<string, string> = {};
                const hwDates = new Set<string>();
                shiftRes.data.forEach((s: any) => {
                    shiftMap[`${s.employeeId}-${s.date}`] = s.type;
                    if (s.type.includes('休日出勤') || s.type.includes('出勤')) {
                        hwDates.add(s.date);
                    }
                });
                setShifts(shiftMap);
                setHolidayWorkDates(hwDates);
            }

            if (allWeeks.length > 0) {
                await loadAssignments(allWeeks, currentOptions);
            }

            const statsRes = await getEarlyShiftStats(year, month);
            if (statsRes.success && statsRes.data) {
                setYearlyEarlyShiftCounts(statsRes.data);
            }

            setIsLoading(false);
        };
        load();
    }, [year, month, allWeeks]);

    const handlePrevMonth = () => {
        if (month === 1) {
            setYear(year - 1);
            setMonth(12);
        } else {
            setMonth(month - 1);
        }
        setWeekOffset(0);
    };

    const handleNextMonth = () => {
        if (month === 12) {
            setYear(year + 1);
            setMonth(1);
        } else {
            setMonth(month + 1);
        }
        setWeekOffset(0);
    };

    const handlePrevWeek = () => {
        setWeekOffset(prev => Math.max(0, prev - 1));
    };

    const handleNextWeek = () => {
        setWeekOffset(prev => Math.min(maxWeekOffset, prev + 1));
    };

    const handleCellChange = async (empId: number, dateStr: string, value: string) => {
        setAssignments(prev => ({
            ...prev,
            [`${empId}-${dateStr}`]: value
        }));
        await saveAMAssignment(empId, dateStr, value, false);
    };

    const getCellColor = (taskName: string) => {
        if (!taskName) return 'bg-transparent text-slate-800 border-transparent hover:border-slate-300';
        if (taskName === '休') return 'bg-slate-200 text-slate-500 border-slate-300 pointer-events-none';

        const option = taskOptions.find(o => o.name === taskName);
        if (option) return `${option.bgColor} ${option.textColor}`;

        // フリーテキストのフォールバック色
        return 'bg-white text-slate-800 border-slate-300';
    };

    // オーバーレイ用: colorClassからテキスト色のみ抽出（bg-/border-を除外）
    const getTextColorOnly = (colorClass: string) => {
        return colorClass.split(' ').filter(c => c.startsWith('text-') || c.startsWith('font-')).join(' ') || 'text-slate-800';
    };

    // モバイルselect用: colorClassからbg/borderのみ抽出（text-/font-を除外）
    const getBgColorOnly = (colorClass: string) => {
        return colorClass.split(' ').filter(c => !c.startsWith('text-') && !c.startsWith('font-')).join(' ');
    };

    // Task Management Actions
    const handleUpdateOptions = async (newOptions: TaskOption[]) => {
        setTaskOptions(newOptions);
        await saveAMTaskOptions(newOptions);
    };

    const addTask = () => {
        const newId = `t${Date.now()}`;
        const newOrder = taskOptions.length > 0 ? Math.max(...taskOptions.map(t => t.order)) + 1 : 1;
        handleUpdateOptions([...taskOptions, { id: newId, name: '新規タスク', bgColor: BG_COLOR_PALETTE[0].value, textColor: TEXT_COLOR_PALETTE[0].value, order: newOrder, isFallback: false, excludeFromAuto: false }]);
    };

    const updateTask = (id: string, field: keyof TaskOption, value: string | number | boolean) => {
        let newOptions = taskOptions.map(t => t.id === id ? { ...t, [field]: value } : t);

        // Ensure only one fallback task can exist
        if (field === 'isFallback' && value === true) {
            newOptions = newOptions.map(t => t.id === id ? t : { ...t, isFallback: false });
        }

        handleUpdateOptions(newOptions);
    };

    const removeTask = (id: string) => {
        handleUpdateOptions(taskOptions.filter(t => t.id !== id));
    };

    const moveTask = (id: string, direction: 'up' | 'down') => {
        const index = taskOptions.findIndex(t => t.id === id);
        if (direction === 'up' && index > 0) {
            const newOptions = [...taskOptions];
            [newOptions[index - 1], newOptions[index]] = [newOptions[index], newOptions[index - 1]];
            newOptions.forEach((t, i) => t.order = i + 1);
            handleUpdateOptions(newOptions);
        } else if (direction === 'down' && index < taskOptions.length - 1) {
            const newOptions = [...taskOptions];
            [newOptions[index + 1], newOptions[index]] = [newOptions[index], newOptions[index + 1]];
            newOptions.forEach((t, i) => t.order = i + 1);
            handleUpdateOptions(newOptions);
        }
    };

    const handleClearAll = async () => {
        setShowClearAllConfirm(false);
        if (!displayDays || displayDays.length === 0) return;

        setIsLoading(true);
        const startStr = displayDays[0].dateStr;
        const endStr = displayDays[displayDays.length - 1].dateStr;
        await clearAMAssignments(startStr, endStr);
        await loadAssignments(allWeeks, taskOptions);
        setIsLoading(false);
    };

    const handleClearAuto = async () => {
        setShowClearAutoConfirm(false);
        if (!displayDays || displayDays.length === 0) return;

        setIsLoading(true);
        const startStr = displayDays[0].dateStr;
        const endStr = displayDays[displayDays.length - 1].dateStr;
        await clearAutoAMAssignments(startStr, endStr);
        await loadAssignments(allWeeks, taskOptions);
        setIsLoading(false);
    };

    const handleCellClick = async (empId: number, dateStr: string) => {
        if (!isExchangeMode) return;

        if (!exchangeSelection) {
            setExchangeSelection({ empId, dateStr });
            return;
        }

        if (exchangeSelection.empId === empId && exchangeSelection.dateStr === dateStr) {
            setExchangeSelection(null); // Cancel selection
            return;
        }

        const key1 = `${exchangeSelection.empId}-${exchangeSelection.dateStr}`;
        const key2 = `${empId}-${dateStr}`;

        const task1 = assignments[key1] || '';
        const task2 = assignments[key2] || '';

        setIsLoading(true);
        // Optimistic UI update
        setAssignments(prev => ({
            ...prev,
            [key1]: task2,
            [key2]: task1
        }));

        try {
            await Promise.all([
                saveAMAssignment(exchangeSelection.empId, exchangeSelection.dateStr, task2),
                saveAMAssignment(empId, dateStr, task1)
            ]);
            await loadAssignments(allWeeks, taskOptions);
        } catch (err) {
            console.error('Failed to exchange tasks', err);
            alert('タスクの交換に失敗しました');
        } finally {
            setExchangeSelection(null);
            setIsLoading(false);
        }
    };

    const handleAutoAssign = async () => {
        setIsLoading(true);
        const res = await generateAMAutoAssignments(year, month);
        if (res.success) {
            await loadAssignments(allWeeks, taskOptions);
        } else {
            alert('自動割り振りに失敗しました: ' + res.error);
        }
        setIsLoading(false);
    };

    const sortedOptions = [...taskOptions].sort((a, b) => a.order - b.order);

    // モバイル用ヘルパー関数
    const getShortEmpName = (emp: Employee) => {
        // 略称があればそれを使う、なければ名前を最大4文字に切り詰め
        if (emp.shortName) return emp.shortName;
        return emp.name.length > 4 ? emp.name.slice(0, 4) : emp.name;
    };

    const getShortTaskName = (taskName: string) => {
        // タスク名を最大2文字に省略
        if (!taskName) return '';
        if (taskName === '休') return '休';
        // システム管理タスクの省略
        if (taskName === '休日(1日)') return '休';
        if (taskName === '出張') return '出張';
        if (taskName === '特別休暇') return '特休';
        if (taskName === '有給休暇') return '有休';
        if (taskName === '休日出勤') return '出勤';
        if (taskName === '出勤') return '出勤';
        // タスクオプションの省略
        return taskName.slice(0, 2);
    };

    // Calculate Duplicate Alerts
    const duplicateAlerts: string[] = useMemo(() => {
        if (!employees.length || !taskOptions.length) return [];
        const alerts: string[] = [];

        displayDays.forEach(day => {
            const dateStr = day.dateStr;
            const dailyTaskMap: Record<string, string[]> = {};

            employees.forEach(emp => {
                const key = `${emp.id}-${dateStr}`;
                const taskName = assignments[key];

                // Determine absent state for alerts
                const shift = shifts[key];
                let isAbsent = false;
                const isHolidayWorkDay = holidayWorkDates.has(dateStr);
                if (shift) {
                    if (shift.includes('休') && !shift.includes('休日出勤')) isAbsent = true;
                    else if (shift.includes('出張') || shift.includes('特別休暇')) isAbsent = true;
                }
                if (!isAbsent && isHolidayWorkDay && !(shift && (shift.includes('休日出勤') || shift.includes('出勤')))) {
                    isAbsent = true;
                }
                if (!isAbsent && (day.isSunday || !!day.holidayName) && !isHolidayWorkDay) {
                    isAbsent = true;
                }

                if (!taskName || isAbsent) return;

                const option = taskOptions.find(o => o.name === taskName);
                if (option?.isFallback) return;

                if (!dailyTaskMap[taskName]) {
                    dailyTaskMap[taskName] = [];
                }
                dailyTaskMap[taskName].push(emp.name);
            });

            Object.entries(dailyTaskMap).forEach(([taskName, empNames]) => {
                if (empNames.length > 1) {
                    alerts.push(`${format(day.date, 'M/d')} ${taskName} (${empNames.join(', ')})`);
                }
            });
        });

        return alerts;
    }, [assignments, displayDays, employees, taskOptions]);

    if (!isMounted) {
        return <div className="p-8 text-center text-slate-500 flex-1">読み込み中...</div>;
    }

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] relative">
            <style media="print">{`
                @page {
                    size: A4 portrait;
                    margin: 0 !important;
                }
                html, body {
                    width: 210mm !important;
                    height: 297mm !important;
                    background-color: white !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                }
                body {
                    visibility: hidden !important;
                }
                .no-print {
                    display: none !important;
                }
                
                /* 親コンテナをリセット */
                #__next, main, .flex-col, .h-\\[calc\\(100vh-8rem\\)\\] {
                    position: static !important;
                    min-height: 0 !important;
                    height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    overflow: visible !important;
                }
                
                /* 印刷ビューを展開 */
                #am-task-print-view {
                    visibility: visible !important;
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 210mm !important;
                    height: 297mm !important;
                    background: white !important;
                    margin: 0 !important;
                    padding: 35mm 5mm 5mm 5mm !important;
                    box-sizing: border-box !important;
                    display: block !important;
                    z-index: 9999 !important;
                }
                #am-task-print-view * {
                    visibility: visible !important;
                }
                
                /* テーブル基本設定 */
                #am-task-print-view table {
                    width: 100% !important;
                    max-width: 100% !important;
                    table-layout: fixed !important;
                    font-size: 13px !important;
                    margin: 0 auto !important;
                    transform: scale(0.93);
                    transform-origin: top center;
                }
                
                /* セルの均一高さ (休もタスクも同じ) */
                #am-task-print-view th, #am-task-print-view td {
                    padding: 3px 2px !important;
                    border: 1px solid #64748b !important;
                }
                #am-task-print-view td > div,
                #am-task-print-view td > select {
                    min-height: 40px !important;
                    height: 40px !important;
                    font-size: 13px !important;
                }
                
                /* 日付ヘッダーのフォント拡大 */
                #am-task-print-view thead th {
                    font-size: 14px !important;
                    padding: 4px 2px !important;
                }
                #am-task-print-view thead th div {
                    font-size: 14px !important;
                }
                
                /* 改行防止 */
                #am-task-print-view tr {
                    page-break-inside: avoid !important;
                }
                
                /* 従業員名（第1列） */
                #am-task-print-view tbody td:first-child,
                #am-task-print-view tbody td:first-child *,
                #am-task-print-view thead th:first-child {
                    font-size: 16px !important;
                    font-weight: 900 !important;
                }
                #am-task-print-view thead th:first-child {
                    width: 32mm !important;
                }
                
                /* ページ分割の完全防止 */
                * {
                    page-break-inside: avoid !important;
                    page-break-before: avoid !important;
                    page-break-after: avoid !important;
                    break-inside: avoid !important;
                    break-before: avoid !important;
                    break-after: avoid !important;
                }
            `}</style>
            <div className="mb-2 xl:mb-4 no-print">
                <h1 className="text-lg xl:text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FilePenLine className="h-5 w-5 xl:h-6 xl:w-6 text-blue-600" />
                    スケジュール管理(午前)
                </h1>
                <p className="text-slate-500 mt-0.5 text-xs xl:text-sm hidden sm:block">午前中の業務タスク（院外監査、病棟など）を従業員ごとに割り振ります。</p>
            </div>

            {/* Top Toolbar */}
            <div className="flex flex-col gap-2 xl:gap-3 mb-2 xl:mb-4 p-2 xl:p-3 bg-white border border-slate-200 rounded-lg shadow-sm no-print">
                {/* Upper Row: Navigation and Settings/Stats */}
                <div className="flex items-center gap-1.5 xl:gap-2">
                    {/* Month Navigator (compact on mobile) */}
                    <Button variant="ghost" size="sm" onClick={handlePrevMonth} className="px-1 xl:px-2 h-7 shrink-0"><ChevronLeft className="h-3.5 w-3.5 xl:h-4 xl:w-4" /></Button>
                    <span className="font-bold text-slate-700 text-center text-[12px] xl:text-base whitespace-nowrap">
                        <span className="hidden xl:inline">{year}年</span> {month}月
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleNextMonth} className="px-1 xl:px-2 h-7 shrink-0"><ChevronRight className="h-3.5 w-3.5 xl:h-4 xl:w-4" /></Button>

                    <div className="h-5 w-px bg-slate-300 mx-0.5 xl:mx-2 shrink-0"></div>

                    {/* Week Navigator */}
                    <Button variant="ghost" size="sm" onClick={handlePrevWeek} disabled={weekOffset === 0} className="px-1 xl:px-2 h-7 text-blue-700 shrink-0"><ChevronLeft className="h-3.5 w-3.5 xl:h-4 xl:w-4" /></Button>
                    <span className="font-bold text-blue-700 text-center text-[12px] xl:text-sm whitespace-nowrap">
                        <span className="xl:hidden">{weekOffset + 1}週</span>
                        <span className="hidden xl:inline">第{weekOffset + 1}週</span>
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleNextWeek} disabled={weekOffset === maxWeekOffset} className="px-1 xl:px-2 h-7 text-blue-700 shrink-0"><ChevronRight className="h-3.5 w-3.5 xl:h-4 xl:w-4" /></Button>

                    <div className="flex-1"></div>

                    {/* Utility Buttons (right side) */}
                    <div className="flex items-center gap-1 xl:gap-2 shrink-0">
                        <span className="hidden md:flex items-center gap-1 text-xs font-bold text-slate-500"><Users className="h-3.5 w-3.5 text-blue-500" />{employees.length}名</span>
                        {session?.role === 'admin' && (
                            <Button variant="outline" size="sm" className="h-7 xl:h-9 px-1.5 xl:px-3 text-xs" onClick={() => setShowTaskModal(true)}>
                                <Settings className="h-3.5 w-3.5 xl:h-4 xl:w-4" /><span className="hidden xl:inline ml-1">タスク管理</span>
                            </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-7 xl:h-9 px-1.5 xl:px-3 text-xs hidden sm:flex" onClick={() => setShowStats(!showStats)}>
                            {showStats ? '統計を隠す' : '統計'}
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 xl:h-9 px-1.5 xl:px-3 text-xs" onClick={handlePrint}>
                            <Printer className="h-3.5 w-3.5 xl:h-4 xl:w-4" /><span className="hidden xl:inline ml-1">印刷</span>
                        </Button>
                    </div>
                </div>

                {/* Lower Row: Action Buttons - モバイルではトグルで開閉 */}
                {session?.role === 'admin' && (
                    <>
                        <div className="xl:hidden border-t border-slate-100 pt-1.5">
                            <button
                                className="w-full flex items-center justify-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 py-0.5"
                                onClick={() => setShowMobileActions(!showMobileActions)}
                            >
                                <ChevronRight className={`h-3 w-3 transition-transform ${showMobileActions ? 'rotate-90' : ''}`} />
                                操作メニュー
                            </button>
                        </div>
                        <div className={`flex-wrap items-center gap-1.5 xl:gap-2 border-t border-slate-100 pt-2 ${showMobileActions ? 'flex' : 'hidden xl:flex'}`}>
                            <Button className="bg-green-600 hover:bg-green-700 text-white font-bold h-8 xl:h-9 text-xs xl:text-sm px-2 xl:px-3" onClick={handleAutoAssign} disabled={isLoading}>
                                <Play className="h-3.5 w-3.5 xl:h-4 xl:w-4 mr-1 xl:mr-2" />自動割振
                            </Button>
                            <Button variant="destructive" className="font-bold h-8 xl:h-9 text-xs xl:text-sm px-2 xl:px-3" onClick={() => setShowClearAllConfirm(true)}>
                                <Trash2 className="h-3.5 w-3.5 xl:h-4 xl:w-4 mr-1 xl:mr-2" />全削除
                            </Button>
                            <Button variant="secondary" className="bg-slate-500 hover:bg-slate-600 text-white font-bold h-8 xl:h-9 text-xs xl:text-sm px-2 xl:px-3" onClick={() => setShowClearAutoConfirm(true)}>
                                <XCircle className="h-3.5 w-3.5 xl:h-4 xl:w-4 mr-1 xl:mr-2" />自動割振削除
                            </Button>

                            <div className="h-5 xl:h-6 w-px bg-slate-300 mx-1 xl:mx-2"></div>

                            <Button
                                className={`h-8 xl:h-9 font-bold transition-all text-xs xl:text-sm px-2 xl:px-3 ${isExchangeMode ? 'bg-cyan-700 ring-2 ring-cyan-400 text-white shadow-inner' : 'bg-cyan-600 hover:bg-cyan-700 text-white'}`}
                                onClick={() => {
                                    setIsExchangeMode(!isExchangeMode);
                                    setExchangeSelection(null);
                                }}
                            >
                                <ArrowRightLeft className="h-3.5 w-3.5 xl:h-4 xl:w-4 mr-1 xl:mr-2" /> 交換{isExchangeMode && ' ON'}
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {/* Warning Banner */}
            {duplicateAlerts.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm flex items-start text-yellow-800 text-sm">
                    <AlertTriangle className="h-5 w-5 mr-2 shrink-0 text-yellow-600" />
                    <div>
                        <span className="font-bold">業務重複 {duplicateAlerts.length}件:</span> {duplicateAlerts.join(' | ')}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex gap-4 min-h-0 overflow-visible print:block print:h-auto" id="am-task-print-view">
                <Card className="flex-1 flex flex-col overflow-hidden bg-white shadow-sm border-slate-200 print:shadow-none print:border-none print:overflow-visible print:block print:h-auto">
                    <div className="no-print hidden print:flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                        <div className="text-lg font-bold text-slate-800">
                            {year}年 {month}月 第{weekOffset + 1}週 スケジュール(午前)
                        </div>
                        <QRCodeDisplay />
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar print:overflow-visible print:block print:h-auto">
                        <table className="w-full xl:min-w-[900px] border-collapse text-[11px] xl:text-sm">
                            <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm border-b border-slate-200">
                                <tr>
                                    <th className="p-1 xl:p-3 text-left font-bold text-slate-700 border-r border-slate-200 min-w-[50px] xl:min-w-[120px] sticky left-0 z-30 bg-slate-50">
                                        <span className="hidden xl:inline print:inline">従業員名</span>
                                        <span className="xl:hidden print:hidden">名前</span>
                                    </th>
                                    {displayDays.map(day => (
                                        <th key={day.dateStr} className="p-0.5 xl:p-2 text-center border-r border-slate-200 min-w-[40px] xl:min-w-[120px]">
                                            <div className="font-bold text-slate-800 text-[10px] xl:text-base">{format(day.date, 'E', { locale: ja })}</div>
                                            <div className="text-xs xl:text-xl print:text-xl"><span className="hidden xl:inline print:inline">{format(day.date, 'M')}/</span>{format(day.date, 'd')}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={displayDays.length + 1} className="p-8 text-center text-slate-500">読み込み中...</td></tr>
                                ) : employees.map(emp => (
                                    <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/50 group">
                                        <td className="p-1 xl:p-3 border-r border-slate-200 sticky left-0 z-10 bg-white group-hover:bg-slate-50 shadow-[1px_0_2px_-1px_rgba(0,0,0,0.1)]">
                                            <div className="font-bold text-slate-800 flex items-center justify-between gap-0.5">
                                                <span className="hidden xl:inline print:inline">{emp.name}</span>
                                                <span className="xl:hidden print:hidden text-[11px] truncate">{getShortEmpName(emp)}</span>
                                                <span className="hidden xl:flex print:hidden">
                                                    {emp.jobType === 'Pharmacist' ? (
                                                        <span title="薬剤師"><Pill className="h-4 w-4 text-blue-400 shrink-0" /></span>
                                                    ) : (
                                                        <span title="助手/事務"><ClipboardList className="h-4 w-4 text-emerald-500 shrink-0" /></span>
                                                    )}
                                                </span>
                                            </div>
                                        </td>
                                        {displayDays.map(day => {
                                            const key = `${emp.id}-${day.dateStr}`;
                                            const task = assignments[key] || '';
                                            const colorClass = getCellColor(task);
                                            const isWeekend = day.isSaturday || day.isSunday || day.holidayName;

                                            const shift = shifts[key];
                                            let isAbsent = false;
                                            let absentReason = '休'; // Default UI label

                                            // Replicate backend absent logic
                                            const isHolidayWorkDay = holidayWorkDates.has(day.dateStr);
                                            if (shift) {
                                                if (shift.includes('休') && !shift.includes('休日出勤')) {
                                                    isAbsent = true;
                                                } else if (shift.includes('出張') || shift.includes('特別休暇') || shift.includes('有給休暇')) {
                                                    isAbsent = true;
                                                    absentReason = shift;
                                                }
                                            }

                                            if (!isAbsent && isHolidayWorkDay && !(shift && (shift.includes('休日出勤') || shift.includes('出勤')))) {
                                                isAbsent = true;
                                            }

                                            if (!isAbsent && (day.isSunday || !!day.holidayName) && !isHolidayWorkDay) {
                                                isAbsent = true;
                                            }

                                            // No background color for weekend cells (user asked for white everywhere)
                                            const bgClass = '';

                                            // Determine if this cell should be in free-input mode
                                            const isCustomTask = task !== '' && !isAbsent && !taskOptions.some(o => o.name === task);
                                            const isFreeInputMode = freeInputCells[key] || isCustomTask;

                                            // Exchange Mode logic
                                            const canEdit = session?.role === 'admin' || session?.id === emp.id.toString();
                                            const isSelectedForExchange = exchangeSelection?.empId === emp.id && exchangeSelection?.dateStr === day.dateStr;
                                            const exchangeHighlight = isSelectedForExchange ? 'ring-4 ring-cyan-500 ring-offset-2 z-20 scale-105 shadow-xl transition-all duration-300 animate-[pulse_1.5s_ease-in-out_infinite]' : '';
                                            const exchangeHover = canEdit && isExchangeMode && !isAbsent ? 'cursor-pointer hover:ring-2 hover:ring-cyan-300' : '';

                                            return (
                                                <td
                                                    key={day.dateStr}
                                                    className={`p-0.5 xl:p-1 border-r border-slate-100 relative ${bgClass} ${exchangeHover}`}
                                                    onClick={() => {
                                                        if (canEdit && isExchangeMode && !isAbsent) {
                                                            handleCellClick(emp.id, day.dateStr);
                                                        }
                                                    }}
                                                >
                                                    {isExchangeMode ? (
                                                        <div className={`w-full h-[32px] xl:h-[50px] flex items-center justify-center font-bold text-[10px] xl:text-[13px] rounded border transition-colors ${isAbsent ? 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed opacity-60' : colorClass} ${exchangeHighlight}`}>
                                                            {isAbsent ? absentReason : (<><span className="xl:hidden">{getShortTaskName(task) || <span className="print:hidden">-</span>}</span><span className="hidden xl:inline">{task || <span className="print:hidden">未設定</span>}</span></>)}
                                                        </div>
                                                    ) : isAbsent ? (
                                                        <div className="w-full h-[32px] xl:h-[50px] flex items-center justify-center font-bold text-[10px] xl:text-[13px] rounded border appearance-none transition-colors bg-slate-200 text-slate-500 border-slate-300">
                                                            {absentReason}
                                                        </div>
                                                    ) : isFreeInputMode ? (
                                                        <input
                                                            type="text"
                                                            size={1}
                                                            placeholder="入力"
                                                            autoFocus={freeInputCells[key] && task === ''}
                                                            readOnly={!canEdit}
                                                            className={`w-full min-w-0 h-[32px] xl:h-[50px] px-0.5 xl:px-1 text-center font-bold text-[10px] xl:text-[13px] rounded border focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors ${colorClass} ${!canEdit ? 'cursor-not-allowed opacity-80' : ''}`}
                                                            value={task}
                                                            onChange={(e) => handleCellChange(emp.id, day.dateStr, e.target.value)}
                                                            onBlur={(e) => {
                                                                if (!e.target.value.trim()) {
                                                                    setFreeInputCells(prev => ({ ...prev, [key]: false }));
                                                                    handleCellChange(emp.id, day.dateStr, '');
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="relative w-full h-[32px] xl:h-[50px]">
                                                            {/* モバイル用2文字省略オーバーレイ */}
                                                            <span className={`xl:hidden print:hidden absolute inset-0 flex items-center justify-center font-bold text-[10px] pointer-events-none z-10 ${getTextColorOnly(colorClass)}`}>
                                                                {getShortTaskName(task) || '-'}
                                                            </span>
                                                            {/* モバイル用select（テキスト非表示） */}
                                                            <select
                                                                disabled={!canEdit}
                                                                className={`xl:hidden print:hidden w-full min-w-0 h-full px-0 text-center text-transparent text-[0px] rounded border appearance-none ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed'} focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors ${getBgColorOnly(colorClass)} ${task === '' ? 'print:text-transparent' : ''}`}
                                                                value={task}
                                                                onChange={(e) => {
                                                                    if (e.target.value === '__free__') {
                                                                        setFreeInputCells(prev => ({ ...prev, [key]: true }));
                                                                        handleCellChange(emp.id, day.dateStr, '');
                                                                    } else {
                                                                        handleCellChange(emp.id, day.dateStr, e.target.value);
                                                                    }
                                                                }}
                                                            >
                                                                <option value="" className="bg-white text-slate-800 font-normal">未設定</option>
                                                                {sortedOptions.map(opt => (
                                                                    <option key={opt.id} value={opt.name} className="bg-white text-slate-800 font-normal">{opt.name}</option>
                                                                ))}
                                                                <option value="__free__" className="bg-slate-100 text-slate-600 font-normal">📝 フリー入力...</option>
                                                            </select>
                                                            {/* デスクトップ用select（colorClassのテキスト色をそのまま適用） */}
                                                            <select
                                                                disabled={!canEdit}
                                                                className={`hidden xl:block print:block w-full min-w-0 h-full px-1 text-center font-bold text-[13px] rounded border appearance-none ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed'} focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors ${colorClass} ${task === '' ? 'print:text-transparent' : ''}`}
                                                                value={task}
                                                                onChange={(e) => {
                                                                    if (e.target.value === '__free__') {
                                                                        setFreeInputCells(prev => ({ ...prev, [key]: true }));
                                                                        handleCellChange(emp.id, day.dateStr, '');
                                                                    } else {
                                                                        handleCellChange(emp.id, day.dateStr, e.target.value);
                                                                    }
                                                                }}
                                                            >
                                                                <option value="" className="bg-white text-slate-800 font-normal">未設定</option>
                                                                {sortedOptions.map(opt => (
                                                                    <option key={opt.id} value={opt.name} className="bg-white text-slate-800 font-normal">{opt.name}</option>
                                                                ))}
                                                                <option value="__free__" className="bg-slate-100 text-slate-600 font-normal">📝 フリー入力...</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Right: Stats Panel */}
                {showStats && (
                    <Card className="w-80 flex flex-col overflow-hidden bg-white shadow-sm border-slate-200 shrink-0">
                        <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex items-center">
                            📊 早出回数統計 ({year}年{month}月)
                        </div>
                        <div className="flex-1 overflow-auto p-0">
                            <table className="w-full text-xs text-center border-collapse">
                                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                    <tr>
                                        <th className="p-2 font-bold text-slate-600 text-left border-r border-slate-200">従業員名</th>
                                        <th className="p-2 font-bold text-blue-600 border-r border-slate-200">当月回数</th>
                                        <th className="p-2 font-bold text-blue-600">年間合計<br /><span className="text-[9px] font-normal text-slate-500">({month}月除く)</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map(emp => {
                                        let currentMonthCount = 0;
                                        displayDays.forEach(day => {
                                            const key = `${emp.id}-${day.dateStr}`;
                                            if (assignments[key] === '早出') currentMonthCount++;
                                        });
                                        const yearlyCount = yearlyEarlyShiftCounts[emp.id] || 0;
                                        const totalCount = currentMonthCount + yearlyCount;

                                        return (
                                            <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="p-2 text-left font-medium text-slate-700 border-r border-slate-200">{emp.name}</td>
                                                <td className="p-2 font-bold text-blue-600 border-r border-slate-200 bg-blue-50/30">{currentMonthCount}回</td>
                                                <td className="p-2 font-bold text-blue-600">{totalCount}回</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* Task Management Modal */}
            <Modal
                isOpen={showTaskModal}
                onClose={() => setShowTaskModal(false)}
                title="タスク管理"
                description="選択可能なタスクの名称、色、順序を編集できます。カレンダーに直接自由に入力することも可能です。"
                className="max-w-4xl"
            >
                <div className="space-y-4">
                    <div className="border border-slate-200 rounded-lg max-h-[60vh] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium text-slate-500">タスク名</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-500">背景色</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-500">文字色</th>
                                    <th className="px-3 py-2 text-center font-medium text-slate-500 w-24">余剰人員用</th>
                                    <th className="px-3 py-2 text-center font-medium text-slate-500 w-24">自動除外</th>
                                    <th className="px-3 py-2 text-center font-medium text-slate-500 w-24">順序</th>
                                    <th className="px-3 py-2 text-center font-medium text-slate-500 w-16">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedOptions.map((task, index) => (
                                    <tr key={task.id} className="hover:bg-slate-50">
                                        <td className="px-3 py-2">
                                            <Input
                                                className={`h-8 text-sm border-slate-200 font-medium ${task.bgColor} ${task.textColor}`}
                                                value={task.name}
                                                onChange={(e) => updateTask(task.id, 'name', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <select
                                                className="h-8 text-sm rounded border border-slate-300 w-full focus:ring-1 focus:ring-blue-500 bg-white text-slate-900"
                                                value={task.bgColor}
                                                onChange={(e) => updateTask(task.id, 'bgColor', e.target.value)}
                                            >
                                                {BG_COLOR_PALETTE.map(color => (
                                                    <option key={color.value} value={color.value} className="bg-white text-slate-900">{color.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            <select
                                                className="h-8 text-sm rounded border border-slate-300 w-full focus:ring-1 focus:ring-blue-500 bg-white text-slate-900"
                                                value={task.textColor}
                                                onChange={(e) => updateTask(task.id, 'textColor', e.target.value)}
                                            >
                                                {TEXT_COLOR_PALETTE.map(color => (
                                                    <option key={color.value} value={color.value} className="bg-white text-slate-900">{color.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <div className="flex justify-center mt-1">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                                    checked={!!task.isFallback}
                                                    onChange={(e) => updateTask(task.id, 'isFallback', e.target.checked)}
                                                    title="基本タスクを割り振った後、余剰人員全員に割り当てられるタスクにします"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <div className="flex justify-center mt-1">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                                                    checked={!!task.excludeFromAuto}
                                                    onChange={(e) => updateTask(task.id, 'excludeFromAuto', e.target.checked)}
                                                    title="このタスクは自動割り振りの対象から外れます（手動でのみ設定可能）"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <div className="flex justify-center items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-slate-400 disabled:opacity-30"
                                                    disabled={index === 0}
                                                    onClick={() => moveTask(task.id, 'up')}
                                                >
                                                    <ArrowUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-slate-400 disabled:opacity-30"
                                                    disabled={index === sortedOptions.length - 1}
                                                    onClick={() => moveTask(task.id, 'down')}
                                                >
                                                    <ArrowDown className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-red-500 hover:bg-red-50"
                                                onClick={() => removeTask(task.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {taskOptions.length === 0 && (
                            <div className="p-4 text-center text-slate-500 text-sm">タスクがありません。新規追加してください。</div>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
                            onClick={addTask}
                        >
                            <Plus className="h-4 w-4 mr-1" /> 新規タスク追加
                        </Button>
                        <Button onClick={() => setShowTaskModal(false)}>閉じる</Button>
                    </div>
                </div>
            </Modal>

            {/* Custom Simple Confirmation Overlays */}
            {
                showClearAllConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-slate-900/10 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-900">すべてのタスクを削除</h2>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex items-start gap-3 text-red-700 bg-red-50 p-4 rounded-lg border border-red-200">
                                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-bold">当月のすべての割り当てを削除しますか？</h3>
                                        <p className="text-sm mt-1 text-red-600/90 leading-relaxed">手動で設定したタスクや自動設定された「休」も含め、現在表示中の月（{year}年{month}月）のAMタスクデータがすべて消去されます。この操作は取り消せません。</p>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <Button variant="outline" className="font-bold h-10 px-6" onClick={() => setShowClearAllConfirm(false)}>キャンセル</Button>
                                    <Button variant="destructive" className="font-bold h-10 px-6" onClick={handleClearAll}>削除を実行</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showClearAutoConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-slate-900/10 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-900">自動割振タスクのみを削除</h2>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex items-start gap-3 text-yellow-800 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-bold">自動で割り当てられたタスクのみを削除しますか？</h3>
                                        <p className="text-sm mt-1 text-yellow-700/90 leading-relaxed">手動で個別に上書き/設定したタスクや、シフト画面との連動で自動ブロックされている「休」や「出張」などの枠はそのまま残ります。</p>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <Button variant="outline" className="font-bold h-10 px-6" onClick={() => setShowClearAutoConfirm(false)}>キャンセル</Button>
                                    <Button className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold h-10 px-6" onClick={handleClearAuto}>削除を実行</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
