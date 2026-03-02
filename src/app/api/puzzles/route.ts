import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Puzzle from '@/models/Puzzle';
import { generateCrossword } from '@/lib/crossword';

// GET: Ambil semua puzzle yang published
export async function GET() {
    try {
        await connectDB();
        const puzzles = await Puzzle.find({ published: true })
            .select('_id title createdAt placements unplaced')
            .sort({ createdAt: -1 })
            .lean();
        return NextResponse.json({ puzzles });
    } catch {
        return NextResponse.json({ error: 'Gagal memuat puzzle' }, { status: 500 });
    }
}

// POST: Buat puzzle baru
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();
        const { title, entries } = body;

        if (!title || !entries || entries.length < 5) {
            return NextResponse.json(
                { error: 'Judul dan minimal 5 kata diperlukan' },
                { status: 400 }
            );
        }

        // Validasi: semua kata dan clue harus ada
        for (const e of entries) {
            if (!e.word?.trim() || !e.clue?.trim()) {
                return NextResponse.json({ error: 'Setiap kata harus memiliki clue' }, { status: 400 });
            }
        }

        const result = generateCrossword(entries);

        const puzzle = await Puzzle.create({
            title: title?.trim() || 'Puzzle Tanpa Nama',
            grid: result.grid,
            placements: result.placements,
            unplaced: result.unplaced,
            gridSize: result.gridSize,
            published: true,
        });

        return NextResponse.json({ puzzle }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Gagal membuat puzzle' }, { status: 500 });
    }
}
