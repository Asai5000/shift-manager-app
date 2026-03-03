'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarDays, Settings2, BarChart3, Eraser, Loader2, Play } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { previewHolidayAssignment, applyHolidayAssignment, clearHolidayAssignment } from '@/actions/holiday-work';

interface Employee {
    id: number;
    name: string;
}

interface HolidayWorkClientProps {
    pharmacists: Employee[];
}

interface AssignmentPreview {
    date: string;
    dayOfWeek: number;
    isHoliday: boolean;
    holidayName: string | null;
    fullDayEmpId: number | null;
    fullDayEmpName: string | null;
    morningEmpId: number | null;
    morningEmpName: string | null;
    status: 'assigned' | 'skipped_no_staff' | 'skipped_excluded';
}

interface StaffStat {
    id: number;
    name: string;
    fullDayCount: number;
    morningCount: number;
}

export function HolidayWorkClient({ pharmacists }: HolidayWorkClientProps) {
    const [startMonth, setStartMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [endMonth, setEndMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [includeSundays, setIncludeSundays] = useState(true);
    const [includeHolidays, setIncludeHolidays] = useState(true);

    const [isSimulating, setIsSimulating] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    const [previews, setPreviews] = useState<AssignmentPreview[] | null>(null);
    const [stats, setStats] = useState<StaffStat[] | null>(null);
    const [exclusionDates, setExclusionDates] = useState<string[]>([]);
    const [totalTargetDays, setTotalTargetDays] = useState(0);

    const handleSimulate = async () => {
        if (!startMonth || !endMonth) return;
        setIsSimulating(true);
        try {
            const res = await previewHolidayAssignment(startMonth, endMonth, includeSundays, includeHolidays);
            if (res.success && res.data) {
                setPreviews(res.data.previews as AssignmentPreview[]);
                setStats(res.data.stats);
                setExclusionDates(res.data.exclusionDates);
                setTotalTargetDays(res.data.totalTargetDays);
            } else {
                alert(res.message || 'シミュレーションに失敗しました');
            }
        } catch (error) {
            console.error(error);
            alert('エラーが発生しました');
        } finally {
            setIsSimulating(false);
        }
    };

    const handleApply = async () => {
        if (!previews || previews.length === 0) return;
        if (!confirm('この内容で実際のシフトに登録しますか？')) return;

        setIsApplying(true);
        try {
            const res = await applyHolidayAssignment(previews);
            if (res.success) {
                alert('シフトを登録しました！');
                setPreviews(null); // Clear preview after apply
            } else {
                alert(res.message || '登録に失敗しました');
            }
        } catch (error) {
            console.error(error);
            alert('エラーが発生しました');
        } finally {
            setIsApplying(false);
        }
    };

    const handleClear = async () => {
        if (!startMonth || !endMonth) return;
        if (!confirm(`${startMonth} から ${endMonth} までの休日出勤シフトを全て削除します。\nよろしいですか？`)) return;

        setIsClearing(true);
        try {
            const res = await clearHolidayAssignment(startMonth, endMonth);
            if (res.success) {
                alert(`削除しました。（${res.message}）`);
                handleSimulate(); // Refresh data to show empty state
            } else {
                alert(res.message || '削除に失敗しました');
            }
        } catch (error) {
            console.error(error);
            alert('エラーが発生しました');
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left Panel: Settings */}
            <div className="space-y-6">
                <Card>
                    <CardHeader className="pb-3 border-b border-slate-100">
                        <CardTitle className="text-md flex items-center text-slate-800">
                            <CalendarDays className="w-5 h-5 mr-2 text-indigo-500" />
                            期間・条件設定
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startMonth">開始月</Label>
                                <Input
                                    id="startMonth"
                                    type="month"
                                    value={startMonth}
                                    onChange={(e: any) => setStartMonth(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endMonth">終了月</Label>
                                <Input
                                    id="endMonth"
                                    type="month"
                                    value={endMonth}
                                    onChange={(e: any) => setEndMonth(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="flex items-center">
                                <Settings2 className="w-4 h-4 mr-1.5 text-slate-500" />
                                割り振り対象
                            </Label>
                            <div className="flex items-center space-x-6">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="includeSundays"
                                        checked={includeSundays}
                                        onCheckedChange={(c: boolean) => setIncludeSundays(c === true)}
                                    />
                                    <label
                                        htmlFor="includeSundays"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-700"
                                    >
                                        日曜日
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="includeHolidays"
                                        checked={includeHolidays}
                                        onCheckedChange={(c: boolean) => setIncludeHolidays(c === true)}
                                    />
                                    <label
                                        htmlFor="includeHolidays"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-700"
                                    >
                                        祝日
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                            <Button
                                onClick={handleSimulate}
                                disabled={isSimulating}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {isSimulating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                                自動割り振り(プレビュー)
                            </Button>

                            <Button
                                variant="destructive"
                                onClick={handleClear}
                                disabled={isClearing}
                            >
                                {isClearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eraser className="w-4 h-4 mr-2" />}
                                削除実行
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Left Panel: Summary Conditions */}
                <Card className="bg-blue-50/50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center text-blue-900">
                            <BarChart3 className="w-4 h-4 mr-2 text-blue-500" />
                            対象期間情報
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-700 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-slate-500">期間</span>
                            <span className="font-medium">{startMonth} 〜 {endMonth}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">薬剤師</span>
                            <span className="font-medium">{pharmacists.length} 名</span>
                        </div>
                        {previews !== null && (
                            <div className="flex justify-between font-bold text-blue-700 border-t border-blue-200/50 pt-2 mt-2">
                                <span>割り振り可能な日数</span>
                                <span>{totalTargetDays} 日</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Right Panel: Previews and Stats */}
            <div className="space-y-6">
                {!previews ? (
                    <Card className="h-full min-h-[400px] flex items-center justify-center bg-slate-50/50 border-dashed">
                        <div className="text-center text-slate-400">
                            <Play className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>「自動割り振り(プレビュー)」を実行してください</p>
                        </div>
                    </Card>
                ) : (
                    <>
                        <Card>
                            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-md flex items-center text-slate-800">
                                    <BarChart3 className="w-5 h-5 mr-2 text-emerald-500" />
                                    割り振り結果プレビュー
                                </CardTitle>
                                {previews.length > 0 && (
                                    <Button
                                        size="sm"
                                        onClick={handleApply}
                                        disabled={isApplying}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        {isApplying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "本番に保存する"}
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="max-h-[300px] overflow-y-auto p-4 space-y-2">
                                    {previews.length === 0 ? (
                                        <div className="text-center py-4 text-slate-500">割り振り対象日がありません</div>
                                    ) : (
                                        previews.map((p: AssignmentPreview, idx: number) => (
                                            <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-start p-2 rounded-md border text-xs gap-1 sm:gap-4 ${p.isHoliday ? 'bg-pink-50 border-pink-200 hover:bg-pink-100' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                                <div className="font-medium text-slate-700 flex items-center shrink-0 sm:w-12">
                                                    <span className={`shrink-0 inline-block w-1.5 h-1.5 rounded-full mr-2 ${p.isHoliday ? 'bg-red-500' : 'bg-red-400'}`}></span>
                                                    <span className="whitespace-nowrap tracking-tight">{p.date.substring(5)}</span>
                                                </div>
                                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-1 text-slate-600 flex-1">
                                                    {p.status === 'assigned' ? (
                                                        <>
                                                            <div className="flex items-center shrink-0">
                                                                <span className="shrink-0 whitespace-nowrap text-xs font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded mr-2 text-slate-500">1日</span>
                                                                <span className="font-medium whitespace-nowrap">{p.fullDayEmpName || '-'}</span>
                                                            </div>
                                                            <div className="text-slate-300 hidden sm:block shrink-0">/</div>
                                                            <div className="flex items-center shrink-0">
                                                                <span className="shrink-0 whitespace-nowrap text-xs font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded mr-2 text-slate-500">午前</span>
                                                                <span className="font-medium whitespace-nowrap">{p.morningEmpName || '-'}</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span className="shrink-0 whitespace-nowrap text-amber-600 text-xs font-semibold border border-amber-200 bg-amber-50 px-2 py-0.5 rounded">
                                                            {p.status === 'skipped_excluded' ? '除外日' : '割り当て不可'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3 border-b border-slate-100">
                                <CardTitle className="text-md flex items-center text-slate-800">
                                    <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
                                    期間合計予想
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-3">
                                    {stats?.map((stat: StaffStat) => (
                                        <div key={stat.id} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                            <span className="font-medium text-blue-700">{stat.name}</span>
                                            <span className="text-slate-600">
                                                出勤(1日)<span className="font-bold text-slate-800 mx-1">{stat.fullDayCount}</span>回 +
                                                出勤(午前)<span className="font-bold text-slate-800 ml-1">{stat.morningCount}</span>回
                                            </span>
                                        </div>
                                    ))}
                                    {(!stats || stats.length === 0) && (
                                        <div className="text-center text-slate-500 text-sm py-2">データなし</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
