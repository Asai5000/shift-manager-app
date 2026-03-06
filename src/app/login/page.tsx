'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate } from '@/actions/auth';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
    const [errorMessage, formAction, pending] = useActionState(authenticate, undefined);

    return (
        <main className="flex items-center justify-center h-screen bg-slate-50">
            <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-blue-100 rounded-full">
                        <LogIn className="w-8 h-8 text-blue-600" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-center text-slate-800 mb-8">
                    ログイン
                </h1>

                <form action={formAction} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="loginId">
                            ログインID
                        </label>
                        <input
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            id="loginId"
                            type="text"
                            name="loginId"
                            placeholder="ログインIDを入力"
                            disabled={pending}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
                            パスワード
                        </label>
                        <input
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            id="password"
                            type="password"
                            name="password"
                            placeholder="パスワードを入力"
                            disabled={pending}
                            required
                        />
                    </div>
                    <div className="flex items-center">
                        <input
                            id="keepLoggedIn"
                            name="keepLoggedIn"
                            type="checkbox"
                            value="true"
                            disabled={pending}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                        />
                        <label htmlFor="keepLoggedIn" className="ml-2 block text-sm text-slate-700">
                            ログイン状態を保持する（チェックなしの場合は30分で自動ログアウト）
                        </label>
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow transition-colors disabled:opacity-50"
                        disabled={pending}
                    >
                        {pending ? 'ログイン中...' : 'ログイン'}
                    </button>
                    {errorMessage && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                            {errorMessage}
                        </div>
                    )}
                </form>
            </div>
        </main>
    );
}
