import { Suspense } from 'react';
import { getMonthlyShifts } from '@/actions/shifts';
import { getMonthlySchedules } from '@/actions/schedules';
import { getEmployees } from '@/actions/employees';
import { CalendarView } from '@/components/calendar/calendar-view';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function Home(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const now = new Date();
  // Safe parsing for parameters that could be arrays or undefined
  const rawYear = searchParams?.year;
  const rawMonth = searchParams?.month;

  const year = rawYear ? parseInt(Array.isArray(rawYear) ? rawYear[0] : rawYear) : now.getFullYear();
  const month = rawMonth ? parseInt(Array.isArray(rawMonth) ? rawMonth[0] : rawMonth) : now.getMonth() + 1;

  const [shiftsRes, schedulesRes, employeesRes] = await Promise.all([
    getMonthlyShifts(year, month),
    getMonthlySchedules(year, month),
    getEmployees(),
  ]);

  const shifts = shiftsRes.success && shiftsRes.data ? shiftsRes.data : [];
  const schedules = schedulesRes.success && schedulesRes.data ? schedulesRes.data : [];
  const employees = employeesRes.success && employeesRes.data ? employeesRes.data : [];

  return (
    <div>
      <CalendarView
        year={year}
        month={month}
        shifts={shifts}
        schedules={schedules}
        employees={employees}
      />
    </div>
  );
}
