import { getCurrentSession } from '@/actions/session';
import { redirect } from 'next/navigation';
import { PasswordChangeForm } from '@/components/profile/password-change-form';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
    const session = await getCurrentSession();

    if (!session) {
        redirect('/login');
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        プロフィール設定
                    </h1>
                    <p className="text-slate-500 mt-2">
                        ログイン情報やパスワードの変更を行います。
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <div className="mb-6 pb-6 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-800 text-lg mb-4">アカウント情報</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-slate-500 block mb-1">お名前</span>
                            <span className="font-medium text-slate-900 text-base">{session.name}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block mb-1">権限</span>
                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                                {session.role === 'admin' ? '管理者' : '従業員'}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="font-semibold text-slate-800 text-lg mb-4">パスワードの変更</h2>
                    <PasswordChangeForm />
                </div>
            </div>
        </div>
    );
}
