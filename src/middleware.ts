import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt, encrypt } from '@/lib/session';

// 保護するルート（ログインが必要なページ）のリスト
const protectedRoutes = ['/', '/schedules', '/settings'];
const publicRoutes = ['/login'];

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // APIルートや静的ファイルは除外 (matcherでも除外しているが念のため)
    if (path.startsWith('/api') || path.startsWith('/_next') || path.includes('.')) {
        return NextResponse.next();
    }

    const isProtectedRoute = protectedRoutes.some(route =>
        path === route || path.startsWith(`${route}/`)
    );
    const isPublicRoute = publicRoutes.includes(path);

    // 1. セッションCookieを取得して復号（サーバーで毎回検証）
    const sessionCookie = request.cookies.get('session')?.value;
    const session = await decrypt(sessionCookie);

    // 2. ルーティングの出し分け
    if (isProtectedRoute && !session) {
        // 未ログインで保護ルートへ -> ログイン画面へ強制
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role-based protection for settings
    if (path.startsWith('/settings')) {
        // Allow anyone to access their profile settings
        if (path === '/settings/profile') {
            // allow
        } else if (session?.role !== 'admin') {
            // Block other settings pages (like /settings/employees) for non-admins
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    if (isPublicRoute && session && path === '/login') {
        // ログイン済みでログイン画面へ -> トップへ強制
        return NextResponse.redirect(new URL('/', request.url));
    }

    const res = NextResponse.next();

    // 3. アクセスごとにCookieの有効期限を延長する（ローリングセッション）
    if (sessionCookie && session) {
        const expiresAt = new Date(Date.now() + (session.keepLoggedIn ? 7 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000));
        session.expiresAt = expiresAt;
        const newSessionCookie = await encrypt(session);

        res.cookies.set('session', newSessionCookie, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: expiresAt,
            sameSite: 'lax',
            path: '/',
        });
    }

    return res;
}

export const config = {
    // API や Next.js内部ファイル以外でMiddlewareを発動
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
