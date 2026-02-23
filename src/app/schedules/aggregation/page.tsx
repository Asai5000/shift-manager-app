'use client';

import { useState, useEffect } from 'react';
import { getMonthlyShifts } from '@/actions/shifts';
import { getEmployees } from '@/actions/employees';
import { getCalendarDays } from '@/lib/date-utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calculator } from 'lucide-react';
import { format, getDaysInMonth } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Employee {
    id: number;
    name: string;
    displayOrder: number;
}

interface Shift {
    id: number;
    employeeId: number;
    date: string; // YYYY-MM-DD
    type: string;
}

// Fixed 31 days array removed

export default function AggregationPage() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [year, month]);

    async function loadData() {
        setIsLoading(true);
        const [shiftsRes, employeesRes] = await Promise.all([
            getMonthlyShifts(year, month),
            getEmployees()
        ]);

        if (shiftsRes.success && shiftsRes.data) {
            setShifts(shiftsRes.data);
        }
        if (employeesRes.success && employeesRes.data) {
            setEmployees(employeesRes.data);
        }
        setIsLoading(false);
    }

    const handlePrev = () => {
        if (month === 1) {
            setYear(year - 1);
            setMonth(12);
        } else {
            setMonth(month - 1);
        }
    };

    const handleNext = () => {
        if (month === 12) {
            setYear(year + 1);
            setMonth(1);
        } else {
            setMonth(month + 1);
        }
    };

    // Get actual days for the month
    const days = getCalendarDays(year, month).filter(d => d.isCurrentMonth);

    // Identify days with "Holiday Work" (休日出勤)
    const holidayWorkDates = new Set(
        shifts
            .filter(s => s.type.includes('休日出勤') || s.type.includes('出勤'))
            .map(s => s.date)
    );

    // Helpers
    const getShiftForEmployeeAndDate = (empId: number, dateStr: string) => {
        return shifts.find(s => s.employeeId === empId && s.date === dateStr);
    };

    const getShiftAbbreviation = (type: string) => {
        // Rest
        if (type === '休み(終日)') return '休';
        if (type === '午前休み') return 'A休';
        if (type === '午後休み') return 'P休';

        // Hope
        if (type === '希望休み(終日)') return '希休';
        if (type === '希望午前休み') return '希A';
        if (type === '希望午後休み') return '希P';

        // Work
        if (type === '出勤(1日)') return '出';
        if (type === '出勤(午前)') return 'A出';
        if (type === '出勤(午後)') return 'P出';

        // Business Trip
        if (type === '出張(終日)') return '旅';
        if (type === '出張(午前)') return 'A旅';
        if (type === '出張(午後)') return 'P旅';

        // Special
        if (type === '特別休暇') return '特休';

        // Fallback for unknown types (e.g. from legacy data)
        if (type.includes('休み')) return '休';
        if (type.includes('出勤')) return '出';
        if (type.includes('特別休暇')) return '特';
        if (type.includes('出張')) return '旅';
        if (type.includes('希望')) return '希';

        return type.charAt(0);
    };

    const getRestCount = (type: string) => {
        // Full Rest (+1)
        if (type === '休み(終日)' || type === '希望休み(終日)') return 1;

        // Half Rest (+0.5)
        // Note: For "Work AM", "Trip AM", etc., the other half is assumed to be Rest, so we count 0.5.
        // Also "Rest AM" means AM is rest, PM is work? Or just a half day off? 
        // Usually "AM Rest" = 0.5 days off.
        const halfRestTypes = [
            '午前休み', '午後休み',
            '希望午前休み', '希望午後休み',
            '休日出勤(午前)', '休日出勤(午後)', '出勤(午前)', '出勤(午後)',
            '出張(午前)', '出張(午後)'
        ];
        if (halfRestTypes.includes(type)) return 0.5;

        // Special Leave (+0)
        if (type === '特別休暇') return 0;

        // Full Work / Trip (+0)
        if (type === '休日出勤(1日)' || type === '出勤(1日)' || type === '出張(終日)') return 0;

        // Fallbacks
        if (type.includes('午前') || type.includes('午後')) return 0.5;
        if (type.includes('休み')) return 1;

        return 0;
    };

    const countRestDays = (empId: number) => {
        return days.reduce((total, day) => {
            const shift = getShiftForEmployeeAndDate(empId, day.dateStr);
            if (shift) {
                return total + getRestCount(shift.type);
            } else {
                if (holidayWorkDates.has(day.dateStr)) {
                    return total + 1;
                }
                return total;
            }
        }, 0);
    };

    const getDayColor = (day: any) => {
        if (!day) return 'bg-slate-100'; // For placeholders
        if (day.isSunday || day.holidayName) return 'text-red-600 bg-red-50';
        if (day.isSaturday) return 'text-blue-600 bg-blue-50/30';
        return 'text-slate-700';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <Calculator className="mr-2 h-6 w-6 text-blue-600" />
                        シフト集計表
                    </h1>
                    <p className="text-slate-500 mt-1">
                        月ごとのシフト状況と休日数を確認できます。
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={handlePrev}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-bold text-lg min-w-[100px] text-center">
                        {year}年 {month}月
                    </span>
                    <Button variant="outline" size="icon" onClick={handleNext}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-0 relative">
                    <div className="overflow-x-auto custom-scrollbar">
                        <Table className="min-w-max border-separate border-spacing-0">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px] min-w-[180px] sticky left-0 z-30 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                        従業員名
                                    </TableHead>
                                    {days.map(day => (
                                        <TableHead
                                            key={day.dateStr}
                                            className={`text-center min-w-[32px] w-[32px] p-0 font-bold text-xs border-l border-slate-100 ${getDayColor(day)}`}
                                        >
                                            <div className="flex flex-col items-center justify-center h-full py-1">
                                                <span>{format(day.date, 'd')}</span>
                                                <span className="text-[10px] font-normal">
                                                    ({format(day.date, 'E', { locale: ja })})
                                                </span>
                                            </div>
                                        </TableHead>
                                    ))}
                                    <TableHead className="text-center font-bold bg-slate-50 min-w-[60px] border-l border-slate-200 sticky right-0 z-30 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        休み
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={days.length + 2} className="text-center h-24">
                                            読み込み中...
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    employees.map(emp => (
                                        <TableRow key={emp.id} className="hover:bg-slate-50">
                                            <TableCell className="font-medium sticky left-0 z-20 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap border-b border-slate-100">
                                                {emp.name}
                                            </TableCell>
                                            {days.map(day => {
                                                const shift = getShiftForEmployeeAndDate(emp.id, day.dateStr);
                                                const isHolidayWorkDay = holidayWorkDates.has(day.dateStr);
                                                const isImplicitRest = !shift && isHolidayWorkDay;

                                                return (
                                                    <TableCell key={day.dateStr} className={`text-center p-0 border-l border-slate-100 text-xs h-[40px] border-b border-slate-100 ${getDayColor(day).includes('bg-') ? 'bg-opacity-30' : ''}`}>
                                                        <div className="flex items-center justify-center h-full w-full">
                                                            {shift ? (
                                                                <span className={
                                                                    shift.type.includes('休み') ? 'text-slate-400' :
                                                                        shift.type.includes('出勤') || shift.type.includes('休日出勤') ? 'text-red-600 font-bold' :
                                                                            shift.type.includes('希望') ? 'text-amber-500' :
                                                                                'text-blue-600'
                                                                }>
                                                                    {getShiftAbbreviation(shift.type)}
                                                                </span>
                                                            ) : isImplicitRest ? (
                                                                <span className="text-slate-400">休</span>
                                                            ) : '-'}
                                                        </div>
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell className="text-center font-bold bg-slate-50 border-l border-slate-200 sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] border-b border-slate-100">
                                                {countRestDays(emp.id)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
