import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt, updateSession } from '@/lib/session';

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

    // 3. アクセスごとにCookieの有効期限を延長する（オプション）
    if (sessionCookie) {
        // API等は除外しているので、通常の画面遷移でのみ延長
        // return await updateSession(request); // updateSessionが少し複雑なので一旦NextResponseのみ返す
    }

    return NextResponse.next();
}

export const config = {
    // API や Next.js内部ファイル以外でMiddlewareを発動
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
