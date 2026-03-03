import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

// SECURITY LAYER: Middleware ini berfungsi sebagai "Satpam" aplikasi.
// Kita memvalidasi session user sebelum halaman dirender di browser.
export const proxy = auth((req) => {
    const { pathname } = req.nextUrl;
    const session = req.auth;

    // PROTEKSI ROLE: Hanya user dengan role 'admin' yang bisa masuk ke dashboard creator.
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

    // MEMBER ONLY: Halaman bermain dikunci hanya untuk user yang sudah login.
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
    // MATCHER: Menentukan route mana saja yang harus melewati proteksi middleware.
    matcher: ['/admin/:path*', '/play/:path*'],
};
