'use server';

import { createSession, deleteSession } from '@/lib/session';
import { db } from '@/db';
import { employees } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        const loginId = formData.get('loginId') as string;
        const password = formData.get('password') as string;

        if (!loginId || !password) {
            return 'ログインIDとパスワードを入力してください。';
        }

        // 1. DBからユーザー検索
        const userResult = await db.select().from(employees).where(eq(employees.loginId, loginId)).limit(1);
        if (userResult.length === 0) {
            return 'ログインIDまたはパスワードが正しくありません。';
        }

        const user = userResult[0];
        if (!user.passwordHash) {
            return 'ログインIDまたはパスワードが正しくありません。';
        }

        // 2. パスワード照合
        const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordsMatch) {
            return 'ログインIDまたはパスワードが正しくありません。';
        }

        // 3. 認証成功：CookieにJWTセッションを作成
        await createSession(
            user.id.toString(),
            user.name,
            user.role as 'admin' | 'employee'
        );

    } catch (error) {
        // Next.jsの redirect() はエラーを投げる仕様のため再スローする
        if ((error as Error).message === 'NEXT_REDIRECT') {
            throw error;
        }
        console.error('Login error:', error);
        return 'サーバーエラーが発生しました。';
    }

    // 成功したらリダイレクト (tryブロックの外に置くことで確実に発動)
    redirect('/');
}

export async function logOut() {
    await deleteSession();
    redirect('/login');
}

export type ChangePasswordState = {
    errors?: {
        currentPassword?: string[];
        newPassword?: string[];
        confirmPassword?: string[];
    };
    message?: string;
    success?: boolean;
};

export async function changePassword(prevState: ChangePasswordState, formData: FormData) {
    const { getSession } = await import('@/lib/session');
    const session = await getSession();

    if (!session || !session.id) {
        return { message: '認証エラー: ログインしていません。' };
    }

    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { message: 'すべてのフィールドを入力してください。' };
    }

    if (newPassword !== confirmPassword) {
        return {
            errors: {
                confirmPassword: ['新しいパスワードと確認用パスワードが一致しません。'],
            },
            message: '入力内容を確認してください。',
        };
    }

    if (newPassword.length < 4) {
        return {
            errors: {
                newPassword: ['パスワードは4文字以上で入力してください。'],
            },
            message: '入力内容を確認してください。',
        };
    }

    try {
        const userIdStr = session.id;
        let userId: number;
        // Check if ID is string but represents a number, depending on how it was stored
        if (typeof userIdStr === 'string' && !isNaN(Number(userIdStr))) {
            userId = Number(userIdStr);
        } else {
            return { message: '不正なユーザーIDです。' };
        }

        const userResult = await db.select().from(employees).where(eq(employees.id, userId)).limit(1);
        if (userResult.length === 0) {
            return { message: 'ユーザーが見つかりません。' };
        }

        const user = userResult[0];

        if (user.passwordHash) {
            const passwordsMatch = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!passwordsMatch) {
                return {
                    errors: {
                        currentPassword: ['現在のパスワードが正しくありません。'],
                    },
                    message: 'パスワードの変更に失敗しました。',
                };
            }
        } else {
            // Very rare edge case if they have no hash (should be impossible if login required)
            // But if they just had null we should just let them set one, 
            // though normally they wouldn't be able to log in. 
            // We'll enforce password check anyway as a precaution if needed.
            return { message: '現在のパスワードが設定されていません。管理者に連絡してください。' };
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        await db.update(employees).set({ passwordHash: newHash }).where(eq(employees.id, userId));

        return { success: true, message: 'パスワードを変更しました。' };

    } catch (error) {
        console.error('Password change error:', error);
        return { message: 'サーバーエラーが発生しました。' };
    }
}
