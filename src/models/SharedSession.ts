import mongoose, { Schema, model, models } from 'mongoose';

// Stores the shared cell state for a puzzle session
// Each puzzle has one shared session document
// cells: { "r,c": { value, playerId, playerColor } }
export interface ISharedSession {
    puzzleId: string;
    roomId: string; // Unique for each "Circle" or "Room"
    cells: Record<string, { value: string; playerId: string; playerColor: string }>;
    players: { id: string; name: string; color: string; lastSeen: Date }[];
    updatedAt: Date;
}

const SharedSessionSchema = new Schema<ISharedSession>({
    puzzleId: { type: String, required: true, index: true },
    roomId: { type: String, required: true, unique: true, index: true },
    cells: { type: Schema.Types.Mixed, default: {} },
    players: [
        {
            id: String,
            name: String,
            color: String,
            lastSeen: Date,
        },
    ],
    updatedAt: { type: Date, default: Date.now },
});

export const SharedSession =
    models.SharedSession || model<ISharedSession>('SharedSession', SharedSessionSchema);
