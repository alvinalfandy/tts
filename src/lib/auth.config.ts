// auth.config.ts — Edge-safe config (no Node.js modules)
// Used by middleware/proxy.ts for session checking only
import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
    secret: process.env.AUTH_SECRET,
    providers: [], // Providers defined in auth.ts (Node.js only)
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as { role?: string }).role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as { role?: string }).role = token.role as string;
                (session.user as { id?: string }).id = token.id as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 60 * 60 * 24,
    },
};
