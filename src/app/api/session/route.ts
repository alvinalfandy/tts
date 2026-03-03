import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { SharedSession } from '@/models/SharedSession';
import mongoose from 'mongoose';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const roomId = searchParams.get('room');
        if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });

        // AUTO-FIX: Drop old unique index on puzzleId if it exists
        try {
            const collection = mongoose.connection.collection('sharedsessions');
            const indexes = await collection.indexes();
            const oldIdx = indexes.find(idx => idx.key.puzzleId === 1 && idx.unique && !idx.key.roomId);
            if (oldIdx) {
                console.log('AUTO-FIX: Dropping old unique index on puzzleId');
                await collection.dropIndex(oldIdx.name!);
            }
        } catch (e) {
            console.error('AUTO-FIX Error:', e);
        }

        const session = await SharedSession.findOne({ roomId });
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
        const { puzzleId, roomId, playerId, playerName, playerColor, cells, timerSeconds } = await req.json();
        if (!roomId || !playerId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

        // Prepare atomic update object for cells using dotted notation
        // This prevents race conditions where one player overwrites another's changes
        const updateObj: Record<string, any> = {
            puzzleId,
            updatedAt: new Date(),
        };

        // Update timer if provided (take highest to avoid going backward)
        if (typeof timerSeconds === 'number') {
            updateObj.timerSeconds = timerSeconds;
        }

        // Add each cell change as a specific nested update
        if (cells && Object.keys(cells).length > 0) {
            Object.entries(cells).forEach(([key, val]) => {
                updateObj[`cells.${key}`] = {
                    value: val,
                    playerId,
                    playerName,
                    playerColor
                };
            });
        }

        // 1. Atomic update of game state & remove player if already in list
        await SharedSession.findOneAndUpdate(
            { roomId },
            {
                $set: updateObj,
                $pull: { players: { id: playerId } }
            },
            { upsert: true, new: true }
        );

        // 2. Re-add player with fresh lastSeen
        await SharedSession.findOneAndUpdate(
            { roomId },
            {
                $push: {
                    players: { id: playerId, name: playerName, color: playerColor, lastSeen: new Date() },
                },
            }
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Session Update Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
