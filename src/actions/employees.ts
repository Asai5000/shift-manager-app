'use server';

import { db } from '@/db';
import { employees } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { JobType } from '@/constants';

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
    const name = formData.get('name') as string;
    const jobType = formData.get('jobType') as JobType;
    const alias = formData.get('alias') as string;
    const wardDay = formData.get('wardDay') as string;

    if (!name) {
        return {
            errors: {
                name: ['名前は必須です'],
            },
            message: '入力内容に誤りがあります。',
        };
    }

    try {
        // Get max display order to append to the end
        // For simplicity, just using Date.now() or we could query max. 
        // Using auto-increment ID is often enough for default sort if displayOrder is 0,
        // but if we want explicit ordering, we should probably find the max.
        // Let's just default to 0 for now or handle reorder later.
        // Actually, let's query the count or just put it at 0 and let user reorder.

        await db.insert(employees).values({
            name,
            jobType,
            alias: alias || null,
            wardDay: wardDay || null,
            displayOrder: 9999, // Append to end conceptually, or reorder will fix it
        });

        revalidatePath('/employees');
        revalidatePath('/');
        return { message: '従業員を追加しました' };
    } catch (error) {
        console.error('Failed to add employee:', error);
        return { message: 'データベースエラーが発生しました' };
    }
}

export async function updateEmployee(id: number, formData: FormData) {
    const name = formData.get('name') as string;
    const jobType = formData.get('jobType') as JobType;
    const alias = formData.get('alias') as string;
    const wardDay = formData.get('wardDay') as string;

    try {
        await db.update(employees)
            .set({
                name,
                jobType,
                alias: alias || null,
                wardDay: wardDay || null,
            })
            .where(eq(employees.id, id));

        revalidatePath('/employees');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to update employee:', error);
        return { success: false, error: '従業員の更新に失敗しました' };
    }
}

export async function reorderEmployees(items: { id: number; displayOrder: number }[]) {
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
