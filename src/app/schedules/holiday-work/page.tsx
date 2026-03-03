import { getCurrentSession } from '@/actions/session';
import { redirect } from 'next/navigation';
import { getEmployees } from '@/actions/employees';
import { HolidayWorkClient } from '@/components/schedules/holiday-work/holiday-work-client';

export const dynamic = 'force-dynamic';

export default async function HolidayWorkPage() {
    const session = await getCurrentSession();

    if (!session || session.role !== 'admin') {
        redirect('/');
    }

    const res = await getEmployees();
    const employees = res.success && res.data ? res.data : [];

    // Filter only pharmacists for this feature
    const pharmacists = employees.filter((e: any) => e.jobType === 'Pharmacist');

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent flex items-center">
                        <span className="text-2xl mr-2">📅</span> 休日出勤管理
                    </h1>
                </div>
            </div>

            <HolidayWorkClient pharmacists={pharmacists} />
        </div>
    );
}
