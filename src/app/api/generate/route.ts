import { NextRequest, NextResponse } from 'next/server';
import { generateCrossword } from '@/lib/crossword';

// POST: Preview generate TTS tanpa menyimpan ke DB
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { entries } = body;

        if (!entries || entries.length < 5) {
            return NextResponse.json({ error: 'Minimal 5 kata diperlukan sesuai syarat' }, { status: 400 });
        }

        for (const e of entries) {
            if (!e.word?.trim() || !e.clue?.trim()) {
                return NextResponse.json(
                    { error: 'Semua kata harus memiliki clue' },
                    { status: 400 }
                );
            }
        }

        const result = generateCrossword(entries);
        return NextResponse.json(result);
    } catch {
        return NextResponse.json({ error: 'Gagal generate puzzle' }, { status: 500 });
    }
}
