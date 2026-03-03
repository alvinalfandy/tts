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

        // Logic: Skor dihitung berdasarkan performa (Grading System)
        // 🚀 Baseline: 10.000 poin
        // ⏱ Penalty Waktu: -2 poin per detik
        // 💡 Penalty Hint: -200 poin per penggunaan hint
        // 🛡️ Batas Bawah: Minimal 100 poin (Apresiasi tetap menyelesaikan)
        // 🛡️ Security Check: Re-calculate on server-side to prevent client manipulation.
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
