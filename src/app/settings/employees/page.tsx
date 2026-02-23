import { getEmployees } from '@/actions/employees';
import { EmployeeList } from '@/components/employee-list';


export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
    const { data: employees } = await getEmployees();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        従業員管理
                    </h1>
                    <p className="text-slate-500 mt-2">
                        シフト管理対象の従業員を登録・編集します
                    </p>
                </div>
            </div>

            <EmployeeList employees={employees || []} />
        </div>
    );
}
