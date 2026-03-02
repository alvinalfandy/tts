import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlacement {
    word: string;
    clue: string;
    row: number;
    col: number;
    direction: 'across' | 'down';
    number: number;
}

export interface IPuzzle {
    title: string;
    grid: string[][];
    placements: IPlacement[];
    unplaced: string[];
    gridSize: number;
    published: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const PlacementSchema = new Schema<IPlacement>({
    word: { type: String, required: true },
    clue: { type: String, required: true },
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    direction: { type: String, enum: ['across', 'down'], required: true },
    number: { type: Number, required: true },
});

const PuzzleSchema = new Schema<IPuzzle>(
    {
        title: { type: String, required: true, default: 'Untitled Puzzle' },
        grid: { type: [[String]], required: true },
        placements: { type: [PlacementSchema], required: true },
        unplaced: { type: [String], default: [] },
        gridSize: { type: Number, required: true },
        published: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Puzzle = (mongoose.models.Puzzle as Model<IPuzzle>) || mongoose.model<IPuzzle>('Puzzle', PuzzleSchema);

export default Puzzle;
