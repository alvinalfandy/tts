import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
    name: string;
    username: string;
    password: string; // bcrypt hash
    role: 'admin' | 'player';
    email?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// DATABASE MODEL: Ini adalah "Skema" data User.
// Menentukan field apa saja yang wajib ada (username, password, role).
const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        username: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        role: { type: String, enum: ['admin', 'player'], default: 'player' },
        email: { type: String },
    },
    { timestamps: true }
);

const User: Model<IUser> = (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);

export default User;
