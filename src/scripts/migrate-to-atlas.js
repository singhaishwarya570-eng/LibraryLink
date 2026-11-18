require('dotenv').config();
const mongoose = require('mongoose');

/**
 * Migration Script: Transfers all collections and documents
 * from local MongoDB (127.0.0.1:27017) to MongoDB Atlas.
 * 
 * Usage:
 *   node src/scripts/migrate-to-atlas.js "<YOUR_ATLAS_CONNECTION_STRING>"
 * 
 * Or set ATLAS_URI in .env:
 *   node src/scripts/migrate-to-atlas.js
 */

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/librarylink';
const ATLAS_URI = process.argv[2] || process.env.ATLAS_URI || process.env.MONGODB_URI;

if (!ATLAS_URI || ATLAS_URI.includes('127.0.0.1') || ATLAS_URI.includes('localhost')) {
  console.error('\n❌ Error: Please provide your MongoDB Atlas connection string.');
  console.log('Usage: node src/scripts/migrate-to-atlas.js "mongodb+srv://<username>:<password>@cluster0.../librarylink?retryWrites=true&w=majority"\n');
  process.exit(1);
}

// Make sure target database name is 'librarylink'
let targetUri = ATLAS_URI;
if (!targetUri.includes('/librarylink?') && !targetUri.endsWith('/librarylink')) {
  // If connection string has no database or has standard cluster URL, inject /librarylink
  if (targetUri.includes('?')) {
    targetUri = targetUri.replace('?', 'librarylink?');
  } else {
    targetUri = targetUri.endsWith('/') ? `${targetUri}librarylink` : `${targetUri}/librarylink`;
  }
}

async function migrate() {
  console.log('====================================================');
  console.log(' LibraryLink: Local to MongoDB Atlas Data Migration');
  console.log('====================================================');
  console.log(`Source (Local) : ${LOCAL_URI}`);
  console.log(`Target (Atlas) : ${targetUri.replace(/:([^:@]+)@/, ':****@')}`);
  console.log('----------------------------------------------------');

  let localConn, atlasConn;

  try {
    console.log('1. Connecting to Local MongoDB...');
    localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('✓ Connected to Local MongoDB');

    console.log('2. Connecting to MongoDB Atlas...');
    atlasConn = await mongoose.createConnection(targetUri).asPromise();
    console.log('✓ Connected to MongoDB Atlas');

    const collections = await localConn.db.listCollections().toArray();
    const collectionNames = collections
      .map(c => c.name)
      .filter(n => !n.startsWith('system.'));

    console.log(`\nFound ${collectionNames.length} collections to transfer: ${collectionNames.join(', ')}\n`);

    for (const name of collectionNames) {
      process.stdout.write(`Migrating collection [${name}]... `);
      const docs = await localConn.db.collection(name).find({}).toArray();

      if (docs.length === 0) {
        console.log('(0 documents - skipped)');
        continue;
      }

      const atlasCol = atlasConn.db.collection(name);
      
      // Upsert/replace each document by _id to be safe and avoid duplicates
      const bulkOps = docs.map(doc => ({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true
        }
      }));

      const res = await atlasCol.bulkWrite(bulkOps);
      console.log(`✓ ${docs.length} documents synced (upserted: ${res.upsertedCount}, modified: ${res.modifiedCount || 0})`);
    }

    console.log('\n====================================================');
    console.log('🎉 Migration to MongoDB Atlas Completed Successfully!');
    console.log('Refresh your MongoDB Atlas Data Explorer to view the "librarylink" database.');
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ Migration Failed:', error.message);
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('👉 Tip: Check your Atlas username and password in the connection string.');
    } else if (error.message.includes('IP that isn\'t whitelisted') || error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
      console.error('👉 Tip: Make sure your current IP address or 0.0.0.0/0 is added to Atlas "Network Access".');
    }
    process.exit(1);
  } finally {
    if (localConn) await localConn.close();
    if (atlasConn) await atlasConn.close();
  }
}

migrate();
