// auth.ts — Full auth with bcrypt + MongoDB (Node.js runtime only)
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from './mongodb';
import { authConfig } from './auth.config';
import User from '@/models/User';

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            name: 'credentials',
            credentials: {
                username: { label: 'Username', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                const { username, password } = credentials as { username: string; password: string };
                if (!username || !password) return null;

                try {
                    await connectDB();
                    const user = await User.findOne({ username: username.toLowerCase().trim() });
                    if (!user || !user.password) return null;

                    const valid = await bcrypt.compare(password, user.password);
                    if (!valid) return null;

                    return {
                        id: user._id.toString(),
                        name: user.name,
                        email: user.email || '',
                        role: user.role,
                    };
                } catch (e) {
                    console.error('Auth error:', e);
                    return null;
                }
            },
        }),
    ],
});
