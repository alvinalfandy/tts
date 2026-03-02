import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Puzzle from '@/models/Puzzle';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;
        const puzzle = await Puzzle.findById(id).lean();

        if (!puzzle) {
            return NextResponse.json({ error: 'Puzzle tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json({ puzzle });
    } catch {
        return NextResponse.json({ error: 'Gagal memuat puzzle' }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;
        await Puzzle.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Puzzle dihapus' });
    } catch {
        return NextResponse.json({ error: 'Gagal menghapus puzzle' }, { status: 500 });
    }
}
