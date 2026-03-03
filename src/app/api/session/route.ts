import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { SharedSession } from '@/models/SharedSession';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const puzzleId = searchParams.get('puzzleId');
        if (!puzzleId) return NextResponse.json({ error: 'Missing puzzleId' }, { status: 400 });

        const session = await SharedSession.findOne({ puzzleId });
        if (!session) return NextResponse.json({ cells: {}, players: [] });

        // Return cells and active players (seen in last 10 seconds)
        const now = Date.now();
        const activePlayers = (session.players || []).filter(
            (p: any) => now - new Date(p.lastSeen).getTime() < 10000
        );
        return NextResponse.json({ cells: session.cells || {}, players: activePlayers });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { puzzleId, playerId, playerName, playerColor, cells } = await req.json();
        if (!puzzleId || !playerId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

        // Upsert the shared session, merge incoming cells with metadata
        const existing = await SharedSession.findOne({ puzzleId });
        const incomingWithMetadata: Record<string, any> = {};
        Object.entries(cells || {}).forEach(([key, val]) => {
            incomingWithMetadata[key] = {
                value: val,
                playerId,
                playerName,
                playerColor
            };
        });
        const mergedCells = { ...(existing?.cells || {}), ...incomingWithMetadata };

        // Update or create session
        await SharedSession.findOneAndUpdate(
            { puzzleId },
            {
                $set: {
                    cells: mergedCells,
                    updatedAt: new Date(),
                },
                $pull: { players: { id: playerId } }, // Remove old entry for this player
            },
            { upsert: true }
        );

        // Push updated player entry
        await SharedSession.findOneAndUpdate(
            { puzzleId },
            {
                $push: {
                    players: { id: playerId, name: playerName, color: playerColor, lastSeen: new Date() },
                },
            }
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
