'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getEmployees } from '@/actions/employees';
import { getPMAssignments, togglePMAssignment } from '@/actions/pm-tasks';
import { getMonthlyShifts } from '@/actions/shifts';
import { getMonthlySchedules } from '@/actions/schedules';
import { getCalendarDays } from '@/lib/date-utils';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ArrowRightLeft, Users, Pill, ClipboardList, FilePenLine, Printer } from 'lucide-react';

interface Employee {
    id: number;
    name: string;
    jobType: string;
    displayOrder: number;
    wardDay?: string | null;
}

export default function ScheduleTasksPMPage() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Pagination State
    const [weekOffset, setWeekOffset] = useState(0);

    // Assignments map: 'empId-dateStr' -> boolean
    const [assignments, setAssignments] = useState<Record<string, boolean>>({});

    // Schedules for top right display
    const [schedulesMap, setSchedulesMap] = useState<Record<string, { text: string; shortText: string | null }>>({});

    // Shifts for absence detection
    const [shifts, setShifts] = useState<Record<string, string>>({});
    const [holidayWorkDates, setHolidayWorkDates] = useState<Set<string>>(new Set());

    const allDays = useMemo(() => getCalendarDays(year, month), [year, month]);

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

    const loadData = async () => {
        setIsLoading(true);
        try {
            const empsRes = await getEmployees();
            if (empsRes.success && empsRes.data) {
                setEmployees(empsRes.data);
            }

            if (allWeeks.length > 0) {
                const startStr = allWeeks[0][0].dateStr;
                const endStr = allWeeks[allWeeks.length - 1][5].dateStr;

                const pmData = await getPMAssignments(startStr, endStr);
                setAssignments(pmData);

                const shiftsRes = await getMonthlyShifts(year, month);
                if (shiftsRes.success && shiftsRes.data) {
                    const shiftMap: Record<string, string> = {};
                    const hwDates = new Set<string>();

                    shiftsRes.data.forEach((s: typeof shiftsRes.data[number]) => {
                        shiftMap[`${s.employeeId}-${s.date}`] = s.type;
                        if (s.type.includes('休日出勤')) {
                            hwDates.add(s.date);
                        }
                    });
                    setShifts(shiftMap);
                    setHolidayWorkDates(hwDates);
                }

                const schedRes = await getMonthlySchedules(year, month);
                if (schedRes.success && schedRes.data) {
                    const schedMap: Record<string, { text: string; shortText: string | null }> = {};
                    schedRes.data.forEach((s: typeof schedRes.data[number]) => {
                        if (s.employeeId && s.isVisible !== false) {
                            schedMap[`${s.employeeId}-${s.date}`] = {
                                text: s.text,
                                shortText: s.shortText || null,
                            };
                        }
                    });
                    setSchedulesMap(schedMap);
                }
            }
        } catch (e) {
            console.error("Failed to load PM data:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [year, month, allWeeks]);

    const handleCellClick = async (empId: number, dateStr: string) => {
        const key = `${empId}-${dateStr}`;
        const shift = shifts[key];
        let isAbsent = false;
        if (shift && (shift.includes('休') && !shift.includes('休日出勤') || shift.includes('出張') || shift.includes('特別休暇') || shift.includes('有給休暇'))) {
            isAbsent = true;
        }

        const currentStatus = !!assignments[key];

        // Optimistic update
        setAssignments(prev => ({
            ...prev,
            [key]: !currentStatus
        }));

        await togglePMAssignment(empId, dateStr, currentStatus);
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">読み込み中...</div>;
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
                
                #__next, main, .flex-col, .h-\\[calc\\(100vh-8rem\\)\\] {
                    position: static !important;
                    min-height: 0 !important;
                    height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    overflow: visible !important;
                }
                
                #pm-task-print-view {
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
                
                #pm-task-print-view * {
                    visibility: visible !important;
                }
                
                #pm-task-print-view table {
                    width: 100% !important;
                    max-width: 100% !important;
                    table-layout: fixed !important;
                    font-size: 11px !important;
                    margin: 0 auto !important;
                    transform: scale(0.93);
                    transform-origin: top center;
                }
                
                #pm-task-print-view th, #pm-task-print-view td {
                    padding: 3px 2px !important;
                    height: auto !important;
                    border: 1px solid #64748b !important;
                }
                
                #pm-task-print-view .bg-slate-200 {
                    background-color: white !important;
                    font-size: 18px !important;
                }
                
                #pm-task-print-view .bg-blue-50 {
                    background-color: white !important;
                    border-color: transparent !important;
                }
                
                /* Prevent row breaks */
                #pm-task-print-view tr {
                    page-break-inside: avoid !important;
                }
                
                /* Increase font size for employee names (first column) */
                #pm-task-print-view tbody td:first-child,
                #pm-task-print-view tbody td:first-child *,
                #pm-task-print-view thead th:first-child {
                    font-size: 16px !important;
                    font-weight: 900 !important;
                }
                
                #pm-task-print-view thead th:first-child {
                    width: 38mm !important; 
                }
                
                * {
                    page-break-inside: avoid !important;
                    page-break-before: avoid !important;
                    page-break-after: avoid !important;
                    break-inside: avoid !important;
                    break-before: avoid !important;
                    break-after: avoid !important;
                }
            `}</style>

            <div className="mb-4 no-print flex-shrink-0">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FilePenLine className="h-6 w-6 text-blue-600" />
                    スケジュール管理(午後)
                </h1>
                <p className="text-slate-500 mt-1">午後中の業務タスクを従業員ごとに割り振ります。</p>
            </div>

            {/* Top Toolbar */}
            <div className="flex flex-col gap-3 mb-4 p-3 bg-white border border-slate-200 rounded-lg shadow-sm flex-shrink-0 flex-none max-h-min">
                {/* Upper Row: Navigation and Settings/Stats */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-4 mr-4">
                        {/* Month Navigator */}
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-md">
                            <Button variant="ghost" size="sm" onClick={() => {
                                if (month === 1) { setYear(y => y - 1); setMonth(12); }
                                else { setMonth(m => m - 1); }
                                setWeekOffset(0);
                            }} className="px-2 h-7"><ArrowRightLeft className="h-4 w-4 rotate-180" /></Button>
                            <span className="font-bold text-slate-700 min-w-[5rem] text-center">{year}年 {month}月</span>
                            <Button variant="ghost" size="sm" onClick={() => {
                                if (month === 12) { setYear(y => y + 1); setMonth(1); }
                                else { setMonth(m => m + 1); }
                                setWeekOffset(0);
                            }} className="px-2 h-7"><ArrowRightLeft className="h-4 w-4" /></Button>
                        </div>

                        {/* Week Navigator */}
                        <div className="flex items-center gap-2 bg-blue-50 p-1 rounded-md text-blue-700">
                            <Button variant="ghost" size="sm" onClick={() => {
                                if (weekOffset > 0) {
                                    setWeekOffset(prev => prev - 1);
                                } else {
                                    if (month === 1) { setYear(prev => prev - 1); setMonth(12); }
                                    else { setMonth(prev => prev - 1); }
                                    setTimeout(() => setWeekOffset(5), 0);
                                }
                            }} disabled={weekOffset === 0 && month === 1 && year === 2020} className="px-2 h-7 text-blue-700 hover:text-blue-800 hover:bg-blue-100"><ArrowRightLeft className="h-4 w-4 rotate-180" /></Button>
                            <span className="font-bold text-sm min-w-[5rem] text-center">第{weekOffset + 1}週</span>
                            <Button variant="ghost" size="sm" onClick={() => {
                                if (weekOffset < maxWeekOffset) {
                                    setWeekOffset(prev => prev + 1);
                                } else {
                                    if (month === 12) { setYear(prev => prev + 1); setMonth(1); }
                                    else { setMonth(prev => prev + 1); }
                                    setWeekOffset(0);
                                }
                            }} disabled={weekOffset === maxWeekOffset && month === 12 && year === 2099} className="px-2 h-7 text-blue-700 hover:text-blue-800 hover:bg-blue-100"><ArrowRightLeft className="h-4 w-4" /></Button>
                        </div>
                    </div>

                    <div className="flex-1"></div>

                    <div className="flex items-center gap-2 mr-4 text-sm font-bold text-slate-700">
                        <span className="flex items-center gap-1 hidden md:flex"><Users className="h-4 w-4 text-blue-500" /> ({employees.length}名)</span>
                    </div>

                    <Button
                        variant="outline"
                        className="h-9 font-bold text-slate-600 border-slate-300"
                        onClick={handlePrint}
                    >
                        <Printer className="h-4 w-4 mr-2 text-slate-500" /> 印刷
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0 overflow-visible print:block print:h-auto" id="pm-task-print-view">
                <Card className="flex-1 flex flex-col overflow-hidden bg-white shadow-sm border-slate-200 print:shadow-none print:border-none print:overflow-visible print:block print:h-auto">
                    <div className="no-print hidden print:block mb-4 text-center text-lg font-bold text-slate-800">
                        {year}年 {month}月 第{weekOffset + 1}週 スケジュール(午後)
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar print:overflow-visible print:block print:h-auto">
                        <table className="w-full min-w-[800px] border-collapse text-sm">
                            <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm border-b border-slate-200">
                                <tr>
                                    <th className="p-3 text-left font-bold text-slate-700 border-r border-slate-200 min-w-[120px] sticky left-0 z-30 bg-slate-50">
                                        従業員名
                                    </th>
                                    {displayDays.map(day => (
                                        <th key={day.dateStr} className="p-2 text-center border-r border-slate-200 min-w-[120px]">
                                            <div className="font-bold text-slate-800">{format(day.date, 'E', { locale: ja })}</div>
                                            <div className="text-lg">{format(day.date, 'M/d')}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(emp => (
                                    <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/50 group">
                                        <td className="p-3 border-r border-slate-200 sticky left-0 z-10 bg-white group-hover:bg-slate-50 shadow-[1px_0_2px_-1px_rgba(0,0,0,0.1)]">
                                            <div className="font-bold text-slate-800 flex items-center justify-between">
                                                <span>{emp.name}</span>
                                                {emp.jobType === 'Pharmacist' ? (
                                                    <span title="薬剤師"><Pill className="h-4 w-4 text-blue-400" /></span>
                                                ) : (
                                                    <span title="助手/事務"><ClipboardList className="h-4 w-4 text-emerald-500" /></span>
                                                )}
                                            </div>
                                        </td>
                                        {displayDays.map(day => {
                                            const key = `${emp.id}-${day.dateStr}`;
                                            const shift = shifts[key];
                                            const schedule = schedulesMap[key];
                                            const isHolidayWorkDay = holidayWorkDates.has(day.dateStr);

                                            let isAbsent = false;
                                            let absentReason = '休'; // Default UI label

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

                                            const wardDayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                                            const isWardDay = !!(emp.wardDay && emp.wardDay === wardDayMap[day.date.getDay()]);

                                            const isAssigned = isWardDay || !!assignments[key];
                                            const cursorClass = (!isAbsent && !isWardDay) ? 'cursor-pointer hover:bg-blue-50/50' : (isWardDay && !isAbsent) ? 'cursor-default' : 'bg-slate-100/70 cursor-not-allowed';

                                            return (
                                                <td
                                                    key={day.dateStr}
                                                    className={`p-1 border-r border-slate-100 relative transition-colors ${cursorClass}`}
                                                    onClick={() => {
                                                        if (!isAbsent && !isWardDay) handleCellClick(emp.id, day.dateStr);
                                                    }}
                                                >
                                                    {schedule && !isAbsent && (
                                                        <div className="absolute top-2 right-2 text-[10px] print:text-[12px] text-slate-500 font-bold max-w-full overflow-hidden whitespace-nowrap z-10 pointer-events-none">
                                                            {schedule.shortText || schedule.text}
                                                        </div>
                                                    )}
                                                    {isAbsent ? (
                                                        <div className="w-full h-full min-h-[50px] flex items-center justify-center font-bold text-[13px] rounded border appearance-none transition-colors bg-slate-200 text-slate-500 border-slate-300">
                                                            {absentReason}
                                                        </div>
                                                    ) : (
                                                        <div className={`w-full h-full min-h-[50px] flex items-center justify-center font-bold text-[13px] rounded border transition-colors ${isAssigned ? 'bg-blue-50 border-blue-200' : 'border-transparent'}`}>
                                                            {isAssigned && (
                                                                <div className="w-6 h-6 rounded-full bg-slate-800 shadow-sm animate-in zoom-in-50 duration-200"></div>
                                                            )}
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
            </div>
        </div>
    );
}
