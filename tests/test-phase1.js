require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const { app } = require('../server');

async function testPhase1() {
  console.log('--- TESTING PHASE 1: SETUP & HEALTH CHECK ---');
  try {
    await connectDB();
    console.log('✓ Successfully connected to MongoDB');

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(5099, resolve));
    console.log('✓ Express test server listening on port 5099');

    // Call health endpoint
    const response = await fetch('http://127.0.0.1:5099/api/health');
    const data = await response.json();
    console.log('✓ Health API response status:', response.status);
    console.log('✓ Health API response body:', JSON.stringify(data, null, 2));

    if (response.status !== 200 || !data.success || !data.database.connected) {
      throw new Error('Health check verification failed!');
    }

    console.log('🎉 PHASE 1 VERIFICATION PASSED SUCCESSFULLY!');
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ PHASE 1 VERIFICATION FAILED:', err);
    process.exit(1);
  }
}

testPhase1();
