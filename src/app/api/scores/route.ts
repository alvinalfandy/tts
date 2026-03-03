import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Score } from '@/models/Score';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const puzzleId = searchParams.get('puzzleId');

        if (!puzzleId) return NextResponse.json({ error: 'Missing puzzleId' }, { status: 400 });

        const scores = await Score.find({ puzzleId })
            .sort({ totalScore: -1 })
            .limit(10);

        return NextResponse.json({ scores });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// SECURITY CHECK: Di sini kita memproses skor yang masuk.
// 1. Session-Gated: Hanya user yang sudah login yang bisa kirim skor.
// 2. Server-Side Check: Skor dihitung ulang di server untuk cegah manipulasi klien.
export const POST = auth(async (req) => {
    try {
        const session = req.auth;
        if (!session) return NextResponse.json({ error: 'Unauthorized: Login required to submit score' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { puzzleId, playerName, timeSeconds, hintsUsed } = body;

        // Calculate score: 10,000 baseline
        // Deduct 2 points per second
        // Deduct 200 points per hint
        // Minimum score: 100
        // ANTI-CHEAT LOGIC: Hitung skor di server, jangan percaya 100% hitungan dari browser.
        const totalScore = Math.max(100, 10000 - (timeSeconds * 2) - (hintsUsed * 200));

        const score = await Score.create({
            puzzleId,
            playerName,
            timeSeconds,
            hintsUsed,
            totalScore
        });

        return NextResponse.json({ success: true, score });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
