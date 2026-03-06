'use server';

import { getSession, SessionPayload } from '@/lib/session';

export async function getCurrentSession(): Promise<SessionPayload | null> {
    const session = await getSession();
    return session ? {
        id: session.id,
        name: session.name,
        role: session.role,
        keepLoggedIn: session.keepLoggedIn,
        expiresAt: session.expiresAt
    } : null;
}
