import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.AUTH_SECRET;
if (!secretKey) {
    throw new Error('AUTH_SECRET is not set in environment variables.');
}
const encodedKey = new TextEncoder().encode(secretKey);

export type SessionPayload = {
    id: string;
    name: string;
    role: 'admin' | 'employee';
    keepLoggedIn: boolean;
    expiresAt: Date;
};

// 1. JWT を作成する関数
export async function encrypt(payload: SessionPayload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(payload.expiresAt)
        .sign(encodedKey);
}

// 2. JWT を検証・復号する関数
export async function decrypt(session: string | undefined = '') {
    try {
        const { payload } = await jwtVerify(session, encodedKey, {
            algorithms: ['HS256'],
        });
        return payload as SessionPayload;
    } catch (error) {
        return null;
    }
}

// 3. ログイン成功時に Cookie をセットする関数
export async function createSession(id: string, name: string, role: 'admin' | 'employee', keepLoggedIn: boolean = false) {
    const expiresAt = new Date(Date.now() + (keepLoggedIn ? 7 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000)); // 7 days or 30 mins
    const session = await encrypt({ id, name, role, keepLoggedIn, expiresAt });

    const cookieStore = await cookies();
    cookieStore.set('session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        sameSite: 'lax',
        path: '/',
    });
}

// 4. セッションを更新する（有効期限を延ばす）関数 - Middleware用 (Server Action用)
export async function updateSession() {
    const sessionCookie = (await cookies()).get('session')?.value;
    const payload = await decrypt(sessionCookie);

    if (!sessionCookie || !payload) {
        return null; // セッションがないか無効
    }

    const expiresAt = new Date(Date.now() + (payload.keepLoggedIn ? 7 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000)); // 7 days or 30 mins
    const newSession = await encrypt({ ...payload, expiresAt });

    const cookieStore = await cookies();
    cookieStore.set('session', newSession, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        sameSite: 'lax',
        path: '/',
    });

    return payload; // 復元されたユーザー情報などを返す（任意）
}

// 5. ログアウト処理
export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
}

// 6. 現在のセッションを取得する便利な関数 (Server Components用)
export async function getSession() {
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) return null;

    return await decrypt(sessionCookie);
}
