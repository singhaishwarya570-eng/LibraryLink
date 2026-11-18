require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Library = require('../src/models/Library');
const Book = require('../src/models/Book');
const BookCopy = require('../src/models/BookCopy');
const Reservation = require('../src/models/Reservation');
const Event = require('../src/models/Event');
const ReadingProgress = require('../src/models/ReadingProgress');

async function testPhase2() {
  console.log('--- TESTING PHASE 2: DATABASE MODELS & SEED DATA RETRIEVAL ---');
  try {
    await connectDB();

    const [userCount, libCount, bookCount, copyCount, resCount, eventCount, progressCount] =
      await Promise.all([
        User.countDocuments(),
        Library.countDocuments(),
        Book.countDocuments(),
        BookCopy.countDocuments(),
        Reservation.countDocuments(),
        Event.countDocuments(),
        ReadingProgress.countDocuments()
      ]);

    console.log(`✓ Users in DB: ${userCount}`);
    console.log(`✓ Libraries in DB: ${libCount}`);
    console.log(`✓ Books in DB: ${bookCount}`);
    console.log(`✓ Book Copies in DB: ${copyCount}`);
    console.log(`✓ Reservations in DB: ${resCount}`);
    console.log(`✓ Events in DB: ${eventCount}`);
    console.log(`✓ Reading Progress in DB: ${progressCount}`);

    if (libCount < 4 || bookCount < 20 || copyCount < 50 || eventCount < 6) {
      throw new Error('Insufficient seed data records found!');
    }

    // Verify relations: BookCopy populated with Book and Library
    const sampleCopy = await BookCopy.findOne().populate('book').populate('library');
    if (!sampleCopy.book || !sampleCopy.library) {
      throw new Error('Population of BookCopy relations failed!');
    }
    console.log(`✓ Verified relation: Barcode ${sampleCopy.copyBarcode} is for "${sampleCopy.book.title}" at "${sampleCopy.library.name}"`);

    // Verify Admin user exists and has hashed password
    const admin = await User.findOne({ email: 'admin@librarylink.org' });
    if (!admin || !admin.password.startsWith('$2')) {
      throw new Error('Admin user missing or password not hashed!');
    }
    console.log(`✓ Verified Admin user: ${admin.name} with role: ${admin.role}`);

    console.log('🎉 PHASE 2 VERIFICATION PASSED SUCCESSFULLY!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ PHASE 2 VERIFICATION FAILED:', err);
    process.exit(1);
  }
}

testPhase2();
