import dbConnect from './src/lib/mongodb';
import mongoose from 'mongoose';

async function fixIndex() {
    console.log('Connecting to DB...');
    await dbConnect();

    try {
        const collection = mongoose.connection.collection('sharedsessions');
        console.log('Checking indexes...');
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes);

        // Find the unique index on puzzleId
        const puzzleIdIndex = indexes.find(idx => idx.key.puzzleId === 1 && idx.unique);

        if (puzzleIdIndex) {
            console.log('Dropping unique index on puzzleId...');
            await collection.dropIndex(puzzleIdIndex.name);
            console.log('Index dropped successfully!');
        } else {
            console.log('No unique index on puzzleId found.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

fixIndex();
