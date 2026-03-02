import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Puzzle from '@/models/Puzzle';
import User from '@/models/User';
import { generateCrossword } from '@/lib/crossword';

// Seed 3 sample puzzles jika DB kosong
export async function POST(_req: NextRequest) {
    try {
        await connectDB();

        // 1. Create Sample Puzzles
        const count = await Puzzle.countDocuments();
        if (count === 0) {
            const samplePuzzles = [
                {
                    title: 'Hewan & Alam',
                    entries: [
                        { word: 'HARIMAU', clue: 'Kucing besar bergaris' },
                        { word: 'GAJAH', clue: 'Hewan berbelalai terbesar di darat' },
                        { word: 'MATAHARI', clue: 'Bintang pusat tata surya kita' },
                        { word: 'HUJAN', clue: 'Air turun dari langit' },
                        { word: 'BULAN', clue: 'Satelit alami bumi' },
                        { word: 'RUSA', clue: 'Hewan bertanduk yang lincah' },
                        { word: 'LAUT', clue: 'Kumpulan air asin yang luas' },
                    ],
                },
                {
                    title: 'Teknologi',
                    entries: [
                        { word: 'KOMPUTER', clue: 'Mesin pengolah data digital' },
                        { word: 'INTERNET', clue: 'Jaringan global komputer' },
                        { word: 'PROGRAM', clue: 'Kumpulan instruksi untuk komputer' },
                        { word: 'DATABASE', clue: 'Tempat penyimpanan data terstruktur' },
                        { word: 'SERVER', clue: 'Komputer yang melayani permintaan klien' },
                        { word: 'PIXEL', clue: 'Titik terkecil pada layar digital' },
                        { word: 'GAME', clue: 'Permainan interaktif digital' },
                    ],
                },
                {
                    title: 'Indonesia',
                    entries: [
                        { word: 'JAKARTA', clue: 'Ibu kota Indonesia' },
                        { word: 'BALI', clue: 'Pulau dewata Indonesia' },
                        { word: 'GARUDA', clue: 'Lambang negara Indonesia' },
                        { word: 'BATIK', clue: 'Kain khas Indonesia bermotif' },
                        { word: 'WAYANG', clue: 'Kesenian boneka tradisional Jawa' },
                        { word: 'NASI', clue: 'Makanan pokok orang Indonesia' },
                        { word: 'RENDANG', clue: 'Masakan khas Padang yang mendunia' },
                    ],
                },
            ];

            for (const sample of samplePuzzles) {
                const result = generateCrossword(sample.entries);
                await Puzzle.create({
                    title: sample.title,
                    grid: result.grid,
                    placements: result.placements,
                    unplaced: result.unplaced,
                    gridSize: result.gridSize,
                    published: true,
                });
            }
        }

        // 2. Ensure Admin Role
        // Update admin/alvin roles if they exist
        await User.updateMany(
            { username: { $in: ['admin', 'alvin', 'alvin2'] } },
            { $set: { role: 'admin' } }
        );

        return NextResponse.json({
            message: 'Seed berhasil: Proyek siap digunakan.'
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Seed gagal' }, { status: 500 });
    }
}
