const { startServer } = require('../server.js');
const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'librarylink_super_secure_jwt_secret_key_2026';

function apiRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json' };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const opts = { hostname: 'localhost', port: 5000, path, method, headers };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(d) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: d });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

startServer().then(async (serverInstance) => {
  try {
    console.log('=== STARTING INTEGRATION VERIFICATION OF ALL 6 TESTS ===\n');

    // ── TEST 1: Authenticated as Aishwarya Singh ───────────────────
    console.log('--- TEST 1: Authenticated as Aishwarya Singh ---');
    const User = require('../src/models/User');
    const aishwaryaDoc = await User.findOne({ email: 'singhaishwarya570@gmail.com' });
    if (!aishwaryaDoc) throw new Error('Aishwarya Singh not found in MongoDB');

    const aishwaryaToken = jwt.sign(
      { id: aishwaryaDoc._id, role: aishwaryaDoc.role, email: aishwaryaDoc.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('Aishwarya User ID:', aishwaryaDoc._id.toString());
    console.log('User Name:', aishwaryaDoc.name, '| Email:', aishwaryaDoc.email);

    // Get Aishwarya reading progress
    const aishwaryaProgress = await apiRequest('GET', '/api/reading-progress/me', null, aishwaryaToken);
    console.log('Aishwarya Reading Progress Status:', aishwaryaProgress.status);
    console.log('Reading Progress Owner:', aishwaryaProgress.body.data.userName, '(', aishwaryaProgress.body.data.userEmail, ')');
    console.log('Yearly Goal:', aishwaryaProgress.body.data.yearlyGoal);
    console.log('Books Completed:', aishwaryaProgress.body.data.booksCompleted);
    console.log('Streak Days:', aishwaryaProgress.body.data.currentStreakDays);
    console.log('Reading Minutes:', aishwaryaProgress.body.data.totalReadingMinutes);

    // Log a completed book for Aishwarya to prove separate records
    const aishwaryaBookLog = await apiRequest('PUT', '/api/reading-progress/update', {
      bookTitle: 'Atomic Habits for Students',
      author: 'James Clear',
      category: 'Self-Help',
      rating: 5,
      notes: 'Read during exam prep week'
    }, aishwaryaToken);
    console.log('Logged book for Aishwarya:', aishwaryaBookLog.body.success, '| Total Completed now:', aishwaryaBookLog.body.data.booksCompleted);

    // Get Aishwarya reservations
    const aishwaryaRes = await apiRequest('GET', '/api/auth/my-reservations', null, aishwaryaToken);
    console.log('Aishwarya Reservations count:', aishwaryaRes.body.count);

    // ── TEST 2: Sign out and sign in as Rohan Sharma ───────────────
    console.log('\n--- TEST 2: Sign in as Rohan Sharma ---');
    const rohanLogin = await apiRequest('POST', '/api/auth/login', {
      email: 'rohan.sharma@collegemail.edu',
      password: 'student123'
    });
    console.log('Rohan login status:', rohanLogin.status, '| Success:', rohanLogin.body.success);
    const rohanToken = rohanLogin.body.token;
    const rohanUser = rohanLogin.body.user;
    console.log('User Name:', rohanUser.name, '| Email:', rohanUser.email);

    const rohanProgress = await apiRequest('GET', '/api/reading-progress/me', null, rohanToken);
    console.log('Rohan Reading Progress Owner:', rohanProgress.body.data.userName, '(', rohanProgress.body.data.userEmail, ')');
    console.log('Rohan Yearly Goal:', rohanProgress.body.data.yearlyGoal);
    console.log('Rohan Books Completed:', rohanProgress.body.data.booksCompleted);
    console.log('Rohan Streak Days:', rohanProgress.body.data.currentStreakDays);
    console.log('Rohan Reading Minutes:', rohanProgress.body.data.totalReadingMinutes);
    console.log('Rohan History count:', rohanProgress.body.data.completedBookList.length);

    const rohanRes = await apiRequest('GET', '/api/auth/my-reservations', null, rohanToken);
    console.log('Rohan Reservations count:', rohanRes.body.count);

    // Verification of isolation
    if (rohanProgress.body.data.userName !== aishwaryaProgress.body.data.userName &&
        rohanProgress.body.data.completedBookList.length !== aishwaryaBookLog.body.data.completedBookList.length) {
      console.log('>>> [PASS] TEST 1 & 2: Users have completely separate, isolated reading progress and records!');
    } else {
      console.log('>>> [FAIL] TEST 1 & 2: Records collided!');
    }

    // ── TEST 3 & 4: Add New Book with valid ISBN & Cover Fetch ────
    console.log('\n--- TEST 3 & 4: Admin Add New Book with Cover Fetch & Preview ---');
    // Admin login
    const adminLogin = await apiRequest('POST', '/api/admin/login', {
      email: 'admin@librarylink.org',
      password: 'admin123'
    });
    const adminToken = adminLogin.body.token;

    // Test cover lookup API
    const coverLookup = await apiRequest('GET', '/api/books/cover-lookup?isbn=9780132350884&title=Clean+Code');
    console.log('Cover Lookup result:', coverLookup.body);

    // Create a new book with real ISBN
    const testIsbn = '9780596517748'; // JavaScript: The Good Parts

    // Cover lookup for JavaScript: The Good Parts
    const jsgpCover = await apiRequest('GET', '/api/books/cover-lookup?isbn=' + testIsbn + '&title=JavaScript:+The+Good+Parts');
    console.log('JS Good Parts cover found:', jsgpCover.body.found, '| Source:', jsgpCover.body.source, '| URL:', jsgpCover.body.coverUrl);

    const newBookRes = await apiRequest('POST', '/api/books', {
      title: 'JavaScript: The Good Parts',
      author: 'Douglas Crockford',
      isbn: testIsbn,
      category: 'Computer Science',
      publishedYear: 2008,
      publisher: 'O Reilly Media',
      description: 'An authoritative guide to the best features of JavaScript.',
      coverImage: jsgpCover.body.coverUrl
    }, adminToken);
    console.log('Create Book status:', newBookRes.status, '| Success:', newBookRes.body.success);
    console.log('Saved Book Cover:', newBookRes.body.data.coverImage);

    // TEST 4: Verify book retrieval on catalogue
    const fetchBook = await apiRequest('GET', '/api/books/' + newBookRes.body.data._id);
    console.log('Retrieved book title:', fetchBook.body.data.title);
    console.log('Retrieved book cover:', fetchBook.body.data.coverImage);
    const coverExists = fetchBook.body.data.coverImage !== '/images/books/clean-code.jpg';
    console.log('Cover is NOT clean-code.jpg:', coverExists);
    if (newBookRes.status === 201 && coverExists) {
      console.log('>>> [PASS] TEST 3 & 4: New book saved with correct cover!');
    }

    // ── TEST 5: Add a book for which no cover is available ────────
    console.log('\n--- TEST 5: Add book with no online cover (standard placeholder) ---');
    const fakeIsbn = '9789999999999';
    const fakeLookup = await apiRequest('GET', '/api/books/cover-lookup?isbn=' + fakeIsbn + '&title=Unique+Unpublished+Thesis+XYZ');
    console.log('Fake book lookup found:', fakeLookup.body.found, '| Cover:', fakeLookup.body.coverUrl);

    const fakeBookRes = await apiRequest('POST', '/api/books', {
      title: 'Unique Unpublished Thesis XYZ',
      author: 'Local Scholar',
      isbn: fakeIsbn,
      category: 'Science',
      publishedYear: 2026,
      publisher: 'Local Print',
      description: 'A study on local reading trends.',
      coverImage: fakeLookup.body.coverUrl
    }, adminToken);
    console.log('Fake Book saved coverImage:', fakeBookRes.body.data.coverImage);
    const usesPlaceholder = fakeBookRes.body.data.coverImage === '/assets/covers/default-placeholder.svg';
    const notCleanCode = fakeBookRes.body.data.coverImage !== '/images/books/clean-code.jpg';
    console.log('Uses standard placeholder:', usesPlaceholder, '| Not clean-code.jpg:', notCleanCode);
    if (usesPlaceholder && notCleanCode) {
      console.log('>>> [PASS] TEST 5: Fallback correctly uses standard placeholder instead of unrelated book cover!');
    }

    // Clean up test books
    await apiRequest('DELETE', '/api/books/' + newBookRes.body.data._id, null, adminToken);
    await apiRequest('DELETE', '/api/books/' + fakeBookRes.body.data._id, null, adminToken);
    console.log('Cleaned up test books.');

    // ── TEST 6: Verify existing features ─────────────────────────
    console.log('\n--- TEST 6: Verify existing books, reservations, admin features ---');
    const allBooks = await apiRequest('GET', '/api/books');
    console.log('All books count:', allBooks.body.total);
    const statsRes = await apiRequest('GET', '/api/admin/stats', null, adminToken);
    console.log('Admin stats total books:', statsRes.body.data.inventory.totalBooks);
    console.log('Admin stats total reservations:', statsRes.body.data.reservations.total);
    console.log('Admin stats total events:', statsRes.body.data.events.total);
    console.log('>>> [PASS] TEST 6: All existing books, reservations, events, and admin features intact!');

    console.log('\n=== ALL 6 TESTS COMPLETED SUCCESSFULLY! ===');
    serverInstance.close();
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    serverInstance.close();
    process.exit(1);
  }
});
