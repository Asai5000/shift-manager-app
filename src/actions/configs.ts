'use server';

import { db } from '@/db';
import { configs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getConfig(key: string): Promise<string | null> {
    try {
        const result = await db.select().from(configs).where(eq(configs.key, key)).get();
        return result?.value || null;
    } catch (error) {
        console.error(`Failed to get config for key: ${key}`, error);
        return null;
    }
}

export async function saveConfig(key: string, value: string) {
    try {
        const existing = await db.select().from(configs).where(eq(configs.key, key)).get();

        if (existing) {
            await db.update(configs)
                .set({ value, updatedAt: new Date() })
                .where(eq(configs.key, key));
        } else {
            await db.insert(configs)
                .values({ key, value, updatedAt: new Date() });
        }

        revalidatePath('/settings/qrcode');
        revalidatePath('/'); // Home / Calendar
        return { success: true };
    } catch (error) {
        console.error(`Failed to save config for key: ${key}`, error);
        return { success: false, error: '保存に失敗しました' };
    }
}
