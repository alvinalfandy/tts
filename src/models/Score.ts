import mongoose, { Schema, model, models } from 'mongoose';

export interface IScore {
    puzzleId: string;
    playerName: string;
    timeSeconds: number;
    hintsUsed: number;
    totalScore: number;
    createdAt: Date;
}

const ScoreSchema = new Schema<IScore>({
    puzzleId: { type: String, required: true, index: true },
    playerName: { type: String, required: true },
    timeSeconds: { type: Number, required: true },
    hintsUsed: { type: Number, required: true },
    totalScore: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
});

export const Score = models.Score || model<IScore>('Score', ScoreSchema);
