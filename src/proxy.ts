import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
    const { pathname } = req.nextUrl;
    const session = req.auth;

    // Proteksi route /admin — harus login sebagai admin
    if (pathname.startsWith('/admin')) {
        if (!session) {
            const loginUrl = new URL('/login', req.url);
            loginUrl.searchParams.set('callbackUrl', pathname);
            loginUrl.searchParams.set('error', 'unauthenticated');
            return NextResponse.redirect(loginUrl);
        }
        if ((session.user as { role?: string })?.role !== 'admin') {
            const loginUrl = new URL('/login', req.url);
            loginUrl.searchParams.set('error', 'forbidden');
            return NextResponse.redirect(loginUrl);
        }
    }

    // Proteksi route /play — harus login
    if (pathname.startsWith('/play')) {
        if (!session) {
            const loginUrl = new URL('/login', req.url);
            loginUrl.searchParams.set('callbackUrl', pathname);
            loginUrl.searchParams.set('error', 'unauthenticated');
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: ['/admin/:path*', '/play/:path*'],
};
