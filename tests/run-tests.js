require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const connectDB = require('../src/config/db');
const { app } = require('../server');

const Book = require('../src/models/Book');
const Library = require('../src/models/Library');
const BookCopy = require('../src/models/BookCopy');
const Reservation = require('../src/models/Reservation');
const Event = require('../src/models/Event');
const EventRegistration = require('../src/models/EventRegistration');
const ReadingProgress = require('../src/models/ReadingProgress');
const { calculateDistance, calculateDeliveryCharge } = require('../src/utils/haversine');

async function runComprehensiveTests() {
  console.log('================================================================');
  console.log(' LIBRARYLINK COMPREHENSIVE AUTOMATED TEST SUITE (PHASE 9)');
  console.log('================================================================');
  
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] #${totalTests} - ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] #${totalTests} - ${testName}`);
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }

  try {
    // Connect to DB
    await connectDB();
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(5097, resolve));
    const baseUrl = 'http://127.0.0.1:5097';

    console.log('\n--- SUITE 1: HEALTH & STATIC ASSET DELIVERY ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health endpoint responds with HTTP 200');
    assert(healthData.database.connected === true, 'Database is confirmed connected in health payload');

    const indexHtmlRes = await fetch(`${baseUrl}/`);
    assert(indexHtmlRes.status === 200, 'Homepage HTML serves successfully at root');
    const booksHtmlRes = await fetch(`${baseUrl}/books.html`);
    assert(booksHtmlRes.status === 200, 'Books catalogue HTML serves successfully');
    const meetupsHtmlRes = await fetch(`${baseUrl}/meetups.html`);
    assert(meetupsHtmlRes.status === 200, 'Meetups HTML serves successfully');
    const challengeHtmlRes = await fetch(`${baseUrl}/challenge.html`);
    assert(challengeHtmlRes.status === 200, 'Reading Challenge HTML serves successfully');
    const adminHtmlRes = await fetch(`${baseUrl}/admin.html`);
    assert(adminHtmlRes.status === 200, 'Admin Portal HTML serves successfully');

    console.log('\n--- SUITE 2: REAL BOOK-COVER IMAGES & ASSETS ---');
    const imagesDir = path.join(__dirname, '../public/images/books');
    assert(fs.existsSync(imagesDir), 'Directory public/images/books/ exists');
    const imageFiles = fs.readdirSync(imagesDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
    assert(imageFiles.length >= 20, `Found ${imageFiles.length} real book cover image files in public/images/books/ (expected >= 20)`);

    const allBooksInDb = await Book.find();
    assert(allBooksInDb.length >= 20, `Found ${allBooksInDb.length} verified books in MongoDB`);

    // Verify each book has a valid real image file that exists on disk
    for (const book of allBooksInDb) {
      assert(book.coverImage.startsWith('/images/books/'), `Database coverImage for "${book.title}" points to real image path: ${book.coverImage}`);
      const coverPath = path.join(__dirname, '../public', book.coverImage);
      const exists = fs.existsSync(coverPath);
      assert(exists, `Real cover file exists on disk for "${book.title}": ${book.coverImage}`);
      if (exists) {
        const stats = fs.statSync(coverPath);
        assert(stats.size > 2000, `Real cover image is substantial photograph/scan (${Math.round(stats.size / 1024)} KB) for "${book.title}"`);
      }
    }

    console.log('\n--- SUITE 3: HAVERSINE DISTANCE & DELIVERY LOGIC ---');
    // Test Haversine formula against known coordinates
    // Point 1: Mira Road Station (19.2810, 72.8559)
    // Point 2: Bhayandar Station (19.3015, 72.8524)
    const dist = calculateDistance(19.2810, 72.8559, 19.3015, 72.8524);
    assert(dist > 2.0 && dist < 2.8, `Haversine formula calculated ${dist} km between Mira Road and Bhayandar stations (expected ~2.3 km)`);

    const zeroFee = calculateDeliveryCharge(0, 20, 5);
    assert(zeroFee === 20, 'Zero distance calculates base fee of ₹20');
    const estFee = calculateDeliveryCharge(3.8, 20, 5);
    // 20 + (3.8 * 5) = 20 + 19 = 39 -> rounded up to nearest 5 = 40
    assert(estFee === 40, `Estimated delivery charge for 3.8 km calculated as ₹${estFee} (expected ₹40)`);

    console.log('\n--- SUITE 4: MULTI-LIBRARY BOOK FINDER ---');
    const sampleBook = allBooksInDb[0];
    const availRes = await fetch(`${baseUrl}/api/books/${sampleBook._id}/availability?sortBy=nearest`);
    const availData = await availRes.json();
    assert(availData.success === true, 'Availability API returned success');
    assert(Array.isArray(availData.comparison) && availData.comparison.length === 4, 'Comparison includes all 4 Mira-Bhayandar libraries');
    assert(availData.comparison[0].distanceKm <= availData.comparison[1].distanceKm, 'Comparison list sorted by nearest distance');

    console.log('\n--- SUITE 5: BOOK RESERVATION & INVENTORY DEDUCTION ---');
    const targetBranch = availData.comparison.find(c => c.availableCopies > 0);
    assert(Boolean(targetBranch), `Found branch with available stock: ${targetBranch.libraryName}`);

    const stockBefore = await BookCopy.countDocuments({ book: sampleBook._id, library: targetBranch.libraryId, status: 'available' });
    const bookDocBefore = await Book.findById(sampleBook._id);

    const testResPayload = {
      bookId: sampleBook._id,
      libraryId: targetBranch.libraryId,
      userName: 'QA Test Student',
      userEmail: `qa.student.${Date.now()}@test.edu`,
      userPhone: '+91 99999 88888',
      fulfillmentType: 'delivery',
      deliveryAddress: 'Flat 301, Test Tower, Mira Road East',
      deliveryNotes: 'Automated test booking',
      distanceKm: targetBranch.distanceKm
    };

    const resApi = await fetch(`${baseUrl}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testResPayload)
    });
    const resData = await resApi.json();
    assert(resApi.status === 201 && resData.success === true, 'Reservation created successfully');
    assert(resData.data.reservationNumber.startsWith('RES-'), `Generated valid reservation number: ${resData.data.reservationNumber}`);

    const stockAfter = await BookCopy.countDocuments({ book: sampleBook._id, library: targetBranch.libraryId, status: 'available' });
    const bookDocAfter = await Book.findById(sampleBook._id);
    assert(stockAfter === stockBefore - 1, `Branch physical copy marked reserved (${stockBefore} -> ${stockAfter})`);
    assert(bookDocAfter.availableCopiesCount === bookDocBefore.availableCopiesCount - 1, `Book aggregate available count decremented (${bookDocBefore.availableCopiesCount} -> ${bookDocAfter.availableCopiesCount})`);

    // Test cancellation status update & inventory replenishment
    const cancelRes = await fetch(`${baseUrl}/api/reservations/${resData.data._id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Cancelled' })
    });
    const cancelData = await cancelRes.json();
    assert(cancelRes.status === 200 && cancelData.data.status === 'Cancelled', 'Reservation status updated to Cancelled');

    const stockRestored = await BookCopy.countDocuments({ book: sampleBook._id, library: targetBranch.libraryId, status: 'available' });
    assert(stockRestored === stockBefore, `Book inventory replenished after cancellation (${stockAfter} -> ${stockRestored})`);

    console.log('\n--- SUITE 6: EVENTS DISCOVERY & REGISTRATION ---');
    const eventsRes = await fetch(`${baseUrl}/api/events`);
    const eventsData = await eventsRes.json();
    assert(eventsData.success === true && eventsData.data.length >= 6, 'Retrieved all demonstration events');

    const testEvent = eventsData.data[0];
    const seatsBefore = testEvent.availableSeats;
    const testRegEmail = `attendee.${Date.now()}@college.edu`;

    const regRes = await fetch(`${baseUrl}/api/events/${testEvent._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: 'Pooja Sharma',
        userEmail: testRegEmail,
        userPhone: '+91 98333 22211'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.success === true, 'Registered for event successfully');
    assert(regData.data.remainingSeats === seatsBefore - 1, `Available seats decremented (${seatsBefore} -> ${regData.data.remainingSeats})`);

    // Verify duplicate registration rejection
    const dupRes = await fetch(`${baseUrl}/api/events/${testEvent._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: 'Pooja Sharma',
        userEmail: testRegEmail,
        userPhone: '+91 98333 22211'
      })
    });
    assert(dupRes.status === 400, 'Duplicate event registration was rejected with HTTP 400');

    console.log('\n--- SUITE 7: READING CHALLENGE PERSISTENCE ---');
    const challengeEmail = `testreader.${Date.now()}@student.edu`;
    const initRes = await fetch(`${baseUrl}/api/reading-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: challengeEmail,
        userName: 'Aarav Patel',
        yearlyGoal: 10
      })
    });
    const initData = await initRes.json();
    assert(initRes.status === 201 && initData.data.yearlyGoal === 10, 'Initialized new reading challenge profile');

    // Add a completed book
    const updateRes = await fetch(`${baseUrl}/api/reading-progress/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: challengeEmail,
        bookTitle: 'The Pragmatic Programmer',
        author: 'Andrew Hunt & David Thomas',
        category: 'Computer Science',
        rating: 5,
        notes: 'Great software craft tips!'
      })
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200 && updateData.data.booksCompleted === 1, 'Logged completed book and incremented counter to 1');
    assert(updateData.data.completedBookList[0].bookTitle === 'The Pragmatic Programmer', 'Completed book record saved with title and notes in MongoDB');

    console.log('\n--- SUITE 8: ADMIN AUTHENTICATION & SECURE CRUD ---');
    // Test invalid login
    const badLogin = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@librarylink.org', password: 'wrongpassword' })
    });
    assert(badLogin.status === 401, 'Unauthorized login attempt rejected with HTTP 401');

    // Test valid admin login
    const goodLogin = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@librarylink.org', password: 'admin123' })
    });
    const loginData = await goodLogin.json();
    assert(goodLogin.status === 200 && Boolean(loginData.token), 'Admin login successful, JWT token issued');
    const adminToken = loginData.token;

    // Test protected stats API
    const statsRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const statsData = await statsRes.json();
    assert(statsRes.status === 200 && statsData.data.inventory.totalBooks >= 20, 'Protected admin stats retrieved');

    // Test Admin Book Creation
    const testBookIsbn = `978-00000${Math.floor(1000 + Math.random() * 9000)}`;
    const createBookRes = await fetch(`${baseUrl}/api/books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Cloud Native Architectures',
        author: 'Jane Doe',
        isbn: testBookIsbn,
        category: 'Computer Science',
        description: 'Comprehensive guide to cloud systems.',
        publishedYear: 2025,
        publisher: 'TechPress'
      })
    });
    const createBookData = await createBookRes.json();
    assert(createBookRes.status === 201 && createBookData.success === true, 'Admin successfully created book in MongoDB');
    const createdBookId = createBookData.data._id;

    // Test Admin Book Edit
    const editBookRes = await fetch(`${baseUrl}/api/books/${createdBookId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ description: 'Updated cloud native description.' })
    });
    const editBookData = await editBookRes.json();
    assert(editBookRes.status === 200 && editBookData.data.description === 'Updated cloud native description.', 'Admin successfully updated book');

    // Test Admin Book Delete
    const deleteBookRes = await fetch(`${baseUrl}/api/books/${createdBookId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(deleteBookRes.status === 200, 'Admin successfully deleted book from MongoDB');

    console.log('\n--- SUITE 9: DATABASE PERSISTENCE AFTER SIMULATED RESTART ---');
    // Store a persistent reservation
    const testMarker = `PERSIST-${Date.now()}`;
    const persistentRes = await Reservation.create({
      reservationNumber: testMarker,
      userName: 'Persistence Tester',
      userEmail: 'persistence@test.edu',
      userPhone: '+91 99999 11111',
      book: sampleBook._id,
      bookTitle: sampleBook.title,
      library: targetBranch.libraryId,
      libraryName: targetBranch.libraryName,
      fulfillmentType: 'pickup',
      status: 'Confirmed'
    });

    console.log(`  Simulating backend and database connection restart...`);
    await mongoose.connection.close();
    await connectDB(); // Re-establish fresh connection

    const retrievedAfterRestart = await Reservation.findOne({ reservationNumber: testMarker });
    assert(Boolean(retrievedAfterRestart), 'Record persists and is successfully retrieved after DB reconnection');
    assert(retrievedAfterRestart.userName === 'Persistence Tester', 'Retrieved record data exactly matches stored record');

    // Clean up test marker
    await Reservation.deleteOne({ reservationNumber: testMarker });

    console.log('\n================================================================');
    console.log(`🎉 ALL ${passedTests} OF ${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('================================================================\n');

    server.close();
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE RUNNER ENCOUNTERED ERROR:', err);
    process.exit(1);
  }
}

runComprehensiveTests();
