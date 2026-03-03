'use server';

import { db } from '@/db';
import { employees } from '@/db/schema';
import { eq, asc, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { JobType } from '@/constants';
import * as bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';

export async function getEmployees() {
    try {
        const allEmployees = await db.select().from(employees).orderBy(asc(employees.displayOrder), asc(employees.id));
        return { success: true, data: allEmployees };
    } catch (error) {
        console.error('Failed to fetch employees:', error);
        return { success: false, error: 'Failed to fetch employees' };
    }
}

export type AddEmployeeState = {
    errors?: {
        name?: string[];
        jobType?: string[];
    };
    message?: string;
};

export async function addEmployee(prevState: AddEmployeeState, formData: FormData) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return { message: '従業員の登録は管理者のみ可能です。' };
    }

    const name = formData.get('name') as string;
    const jobType = formData.get('jobType') as JobType;
    const alias = formData.get('alias') as string;
    const wardDay = formData.get('wardDay') as string;
    const loginId = formData.get('loginId') as string;
    const passwordStr = formData.get('password') as string;
    const role = (formData.get('role') as 'admin' | 'employee') || 'employee';

    if (!name) {
        return {
            errors: {
                name: ['名前は必須です'],
            },
            message: '入力内容に誤りがあります。',
        };
    }

    try {
        let passwordHash = null;
        if (passwordStr) {
            passwordHash = await bcrypt.hash(passwordStr, 10);
        }

        await db.insert(employees).values({
            name,
            jobType,
            alias: alias || null,
            wardDay: wardDay || null,
            loginId: loginId || null,
            passwordHash,
            role,
            displayOrder: 9999, // Append to end conceptually, or reorder will fix it
        });

        revalidatePath('/employees');
        revalidatePath('/');
        return { message: '従業員を追加しました' };
    } catch (error: any) {
        console.error('Failed to add employee:', error);
        if (error?.message?.includes('UNIQUE constraint failed: employees.login_id')) {
            return { message: '指定されたログインIDは既に使用されています。' };
        }
        return { message: 'データベースエラーが発生しました' };
    }
}

export async function updateEmployee(id: number, formData: FormData) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return { success: false, error: '従業員の更新は管理者のみ可能です。' };
    }

    const name = formData.get('name') as string;
    const jobType = formData.get('jobType') as JobType;
    const alias = formData.get('alias') as string;
    const wardDay = formData.get('wardDay') as string;
    const loginId = formData.get('loginId') as string;
    const passwordStr = formData.get('password') as string;
    const role = (formData.get('role') as 'admin' | 'employee') || 'employee';

    try {
        const updateData: any = {
            name,
            jobType,
            alias: alias || null,
            wardDay: wardDay || null,
            loginId: loginId || null,
            role,
        };

        if (passwordStr) {
            updateData.passwordHash = await bcrypt.hash(passwordStr, 10);
        }

        await db.update(employees)
            .set(updateData)
            .where(eq(employees.id, id));

        revalidatePath('/employees');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to update employee:', error);
        if (error?.message?.includes('UNIQUE constraint failed: employees.login_id')) {
            return { success: false, error: '指定されたログインIDは既に使用されています。' };
        }
        return { success: false, error: '従業員の更新に失敗しました' };
    }
}

export async function reorderEmployees(items: { id: number; displayOrder: number }[]) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return { success: false, error: '並び替えは管理者のみ可能です。' };
    }

    try {
        await db.transaction(async (tx: typeof db) => {
            for (const item of items) {
                await tx.update(employees)
                    .set({ displayOrder: item.displayOrder })
                    .where(eq(employees.id, item.id));
            }
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to reorder employees:', error);
        return { success: false, error: '並び順の更新に失敗しました' };
    }
}

export async function deleteEmployee(id: number) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return { success: false, error: '削除は管理者のみ可能です。' };
    }

    try {
        await db.delete(employees).where(eq(employees.id, id));
        revalidatePath('/employees');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete employee:', error);
        return { success: false, error: '削除に失敗しました' };
    }
}

export async function updateEmployeeOrder(items: { id: number; displayOrder: number }[]) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return { success: false, error: '並び替えは管理者のみ可能です。' };
    }

    try {
        // Transaction ideally
        for (const item of items) {
            await db.update(employees)
                .set({ displayOrder: item.displayOrder })
                .where(eq(employees.id, item.id));
        }
        revalidatePath('/employees');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to reorder employees:', error);
        return { success: false, error: '並び順の更新に失敗しました' };
    }
}
