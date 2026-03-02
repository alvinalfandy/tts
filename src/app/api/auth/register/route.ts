import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import User from '@/models/User';

export async function POST(req: Request) {
    try {
        await connectDB();
        const { name, username, password } = await req.json();

        if (!name || !username || !password) {
            return NextResponse.json({ error: 'Semua field wajib diisi.' }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
        }
        if (!/^[a-z0-9_]+$/i.test(username)) {
            return NextResponse.json({ error: 'Username hanya boleh huruf, angka, dan underscore.' }, { status: 400 });
        }

        const existing = await User.findOne({ username: username.toLowerCase() });
        if (existing) {
            return NextResponse.json({ error: 'Username sudah digunakan.' }, { status: 400 });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ name, username: username.toLowerCase(), password: hashed, role: 'player' });

        return NextResponse.json({
            success: true,
            message: 'Akun berhasil dibuat! Silakan login.',
            userId: user._id.toString()
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
