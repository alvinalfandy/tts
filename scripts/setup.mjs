import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('❌ MONGODB_URI tidak ditemukan di .env.local');
    process.exit(1);
}

const client = new MongoClient(uri);

async function setup() {
    try {
        await client.connect();
        const db = client.db(); // Uses DB from URI
        const users = db.collection('users');

        // Delete existing if any
        await users.deleteMany({ username: 'admin' });

        const hashedPassword = await bcrypt.hash('admin123', 10);

        await users.insertOne({
            name: 'Administrator',
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log('✅ Akun Admin berhasil dibuat!');
        console.log('👤 Username: admin');
        console.log('🔑 Password: admin123');
        console.log('\nSilakan simpan kredensial ini dan hapus dari riwayat jika diperlukan.');
    } catch (err) {
        console.error('❌ Terjadi kesalahan:', err);
    } finally {
        await client.close();
    }
}

setup();
