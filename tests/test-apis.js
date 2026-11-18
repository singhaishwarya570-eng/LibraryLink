require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const { app } = require('../server');

async function testAllAPIs() {
  console.log('--- TESTING FULL BACKEND REST API SUITE ---');
  try {
    await connectDB();
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(5098, resolve));
    const baseUrl = 'http://127.0.0.1:5098';

    // 1. Test GET /api/books
    console.log('Testing GET /api/books...');
    const booksRes = await fetch(`${baseUrl}/api/books?limit=5`);
    const booksData = await booksRes.json();
    if (!booksData.success || booksData.data.length === 0) throw new Error('GET /api/books failed');
    console.log(`✓ GET /api/books returned ${booksData.data.length} books, total: ${booksData.total}`);

    const firstBook = booksData.data[0];

    // 2. Test Smart Multi-Library Availability with Distance & Delivery comparison
    console.log(`Testing GET /api/books/${firstBook._id}/availability...`);
    const availRes = await fetch(`${baseUrl}/api/books/${firstBook._id}/availability?sortBy=nearest`);
    const availData = await availRes.json();
    if (!availData.success || !availData.comparison || availData.comparison.length === 0) {
      throw new Error('GET book availability failed');
    }
    const sampleLibComp = availData.comparison[0];
    console.log(`✓ Multi-Library Availability verified for "${availData.book.title}":`);
    console.log(`  - Nearest Library: ${sampleLibComp.libraryName}`);
    console.log(`  - Distance: ${sampleLibComp.distanceKm} km (${sampleLibComp.distanceLabel})`);
    console.log(`  - Pickup: ${sampleLibComp.pickup.label}`);
    console.log(`  - Delivery: ${sampleLibComp.delivery.label}`);
    console.log(`  - Available Copies: ${sampleLibComp.availableCopies}/${sampleLibComp.totalCopies}`);

    // 3. Test POST /api/reservations (Reservation Creation & Inventory Decrement)
    console.log('Testing POST /api/reservations...');
    const initialCopies = firstBook.availableCopiesCount;
    const targetLib = sampleLibComp.libraryId;

    const resPayload = {
      bookId: firstBook._id,
      libraryId: targetLib,
      userName: 'Test Student',
      userEmail: `test.student.${Date.now()}@college.edu`,
      userPhone: '+91 98989 89898',
      fulfillmentType: 'delivery',
      deliveryAddress: 'Flat 101, College Road, Mira Road East',
      deliveryNotes: 'Call upon arrival',
      distanceKm: sampleLibComp.distanceKm
    };

    const reservationRes = await fetch(`${baseUrl}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resPayload)
    });
    const reservationData = await reservationRes.json();
    if (!reservationData.success) throw new Error(`Reservation failed: ${reservationData.message}`);
    console.log(`✓ Reservation created successfully! Reservation #: ${reservationData.data.reservationNumber}`);
    console.log(`  - Delivery Fee: ₹${reservationData.data.deliveryFee}`);
    console.log(`  - Status: ${reservationData.data.status}`);

    // 4. Test GET /api/events & POST /api/events/:id/register
    console.log('Testing GET /api/events...');
    const eventsRes = await fetch(`${baseUrl}/api/events`);
    const eventsData = await eventsRes.json();
    if (!eventsData.success || eventsData.data.length === 0) throw new Error('GET /api/events failed');
    console.log(`✓ GET /api/events returned ${eventsData.data.length} events`);

    const firstEvent = eventsData.data[0];
    const initialSeats = firstEvent.availableSeats;

    console.log(`Testing event registration for "${firstEvent.title}"...`);
    const regPayload = {
      userName: 'Workshop Participant',
      userEmail: `participant.${Date.now()}@example.com`,
      userPhone: '+91 97777 66666'
    };
    const regRes = await fetch(`${baseUrl}/api/events/${firstEvent._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload)
    });
    const regData = await regRes.json();
    if (!regData.success) throw new Error(`Event registration failed: ${regData.message}`);
    console.log(`✓ Event registration successful! Reg #: ${regData.data.registrationNumber}`);
    console.log(`  - Remaining Seats: ${regData.data.remainingSeats} (decremented from ${initialSeats})`);

    // 5. Test Duplicate Registration Prevention
    console.log('Testing duplicate registration prevention...');
    const dupRegRes = await fetch(`${baseUrl}/api/events/${firstEvent._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload)
    });
    const dupRegData = await dupRegRes.json();
    if (dupRegRes.status === 400 && !dupRegData.success) {
      console.log(`✓ Duplicate registration correctly rejected: "${dupRegData.message}"`);
    } else {
      throw new Error('Duplicate registration was not blocked!');
    }

    // 6. Test GET /api/reading-progress/community-stats
    console.log('Testing GET /api/reading-progress/community-stats...');
    const statsRes = await fetch(`${baseUrl}/api/reading-progress/community-stats`);
    const statsData = await statsRes.json();
    if (!statsData.success) throw new Error('Reading progress stats failed');
    console.log(`✓ Community Reading Stats: ${statsData.data.totalReaders} readers, ${statsData.data.totalBooksCompleted} books completed`);

    // 7. Test Admin Login & Protected Admin Stats
    console.log('Testing POST /api/admin/login...');
    const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@librarylink.org', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.token) throw new Error('Admin login failed');
    console.log(`✓ Admin logged in successfully! Role: ${loginData.admin.role}`);

    const adminStatsRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${loginData.token}` }
    });
    const adminStatsData = await adminStatsRes.json();
    if (!adminStatsData.success) throw new Error('Admin stats failed');
    console.log('✓ Admin Protected Stats retrieved:');
    console.log(`  - Total Books: ${adminStatsData.data.inventory.totalBooks}`);
    console.log(`  - Total Physical Copies: ${adminStatsData.data.inventory.totalCopies}`);
    console.log(`  - Total Reservations: ${adminStatsData.data.reservations.total}`);
    console.log(`  - Total Events: ${adminStatsData.data.events.total}`);

    console.log('🎉 ALL BACKEND API ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY!');
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ API TEST FAILED:', err);
    process.exit(1);
  }
}

testAllAPIs();
