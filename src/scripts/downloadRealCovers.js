require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Book = require('../models/Book');

const targetDir = path.join(__dirname, '../../public/images/books');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const verifiedBooks = [
  {
    key: 'clean-code',
    title: 'Clean Code',
    isbn: '978-0132350884',
    url: 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg'
  },
  {
    key: 'intro-algorithms',
    title: 'Introduction to Algorithms',
    isbn: '978-0262033848',
    url: 'https://covers.openlibrary.org/b/isbn/9780262033848-L.jpg'
  },
  {
    key: 'pragmatic-programmer',
    title: 'The Pragmatic Programmer',
    isbn: '978-0201616224',
    url: 'https://covers.openlibrary.org/b/isbn/9780201616224-L.jpg'
  },
  {
    key: 'design-patterns',
    title: 'Design Patterns',
    isbn: '978-0201633610',
    url: 'https://covers.openlibrary.org/b/isbn/9780201633610-L.jpg'
  },
  {
    key: 'ydkjs-scope',
    title: "You Don't Know JS: Scope & Closures",
    isbn: '978-1491904244',
    url: 'https://raw.githubusercontent.com/getify/You-Dont-Know-JS/1st-ed/scope%20%26%20closures/cover.jpg'
  },
  {
    key: 'to-kill-a-mockingbird',
    title: 'To Kill a Mockingbird',
    isbn: '978-0061120084',
    url: 'https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg'
  },
  {
    key: '1984',
    title: '1984',
    isbn: '978-0451524935',
    url: 'https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg'
  },
  {
    key: 'the-great-gatsby',
    title: 'The Great Gatsby',
    isbn: '978-0743273565',
    url: 'https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg'
  },
  {
    key: 'pride-and-prejudice',
    title: 'Pride and Prejudice',
    isbn: '978-0141439518',
    url: 'https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg'
  },
  {
    key: 'the-alchemist',
    title: 'The Alchemist',
    isbn: '978-0062315007',
    url: 'https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg'
  },
  {
    key: 'atomic-habits',
    title: 'Atomic Habits',
    isbn: '978-0735211292',
    url: 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg'
  },
  {
    key: 'deep-work',
    title: 'Deep Work',
    isbn: '978-1455586691',
    url: 'https://covers.openlibrary.org/b/isbn/9781455586691-L.jpg'
  },
  {
    key: 'psychology-of-money',
    title: 'The Psychology of Money',
    isbn: '978-9390166268',
    url: 'https://covers.openlibrary.org/b/isbn/9789390166268-L.jpg'
  },
  {
    key: 'sapiens',
    title: 'Sapiens: A Brief History of Humankind',
    isbn: '978-0062316097',
    url: 'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg'
  },
  {
    key: 'thinking-fast-and-slow',
    title: 'Thinking, Fast and Slow',
    isbn: '978-0374533557',
    url: 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg'
  },
  {
    key: 'brief-history-of-time',
    title: 'A Brief History of Time',
    isbn: '978-0553380163',
    url: 'https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg'
  },
  {
    key: 'cosmos',
    title: 'Cosmos',
    isbn: '978-0345539434',
    url: 'https://covers.openlibrary.org/b/isbn/9780345539434-L.jpg'
  },
  {
    key: 'the-gene',
    title: 'The Gene: An Intimate History',
    isbn: '978-1476733500',
    url: 'https://covers.openlibrary.org/b/isbn/9781476733500-L.jpg'
  },
  {
    key: 'ikigai',
    title: 'Ikigai: The Japanese Secret to Long Life',
    isbn: '978-0143130726',
    url: 'https://covers.openlibrary.org/b/id/11300391-L.jpg'
  },
  {
    key: 'zero-to-one',
    title: 'Zero to One: Notes on Startups',
    isbn: '978-0804139298',
    url: 'https://covers.openlibrary.org/b/isbn/9780804139298-L.jpg'
  }
];

async function downloadAndApplyCovers() {
  console.log('[Cover Updater] Connecting to database...');
  await connectDB();

  console.log(`[Cover Updater] Downloading real covers for ${verifiedBooks.length} books into public/images/books/...`);

  let updatedCount = 0;

  for (const b of verifiedBooks) {
    const filename = `${b.key}.jpg`;
    const filePath = path.join(targetDir, filename);
    const dbCoverPath = `/images/books/${filename}`;

    try {
      console.log(`-> Fetching cover for "${b.title}"...`);
      const res = await fetch(b.url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length < 1500) {
        throw new Error(`Image payload too small (${buffer.length} bytes), likely a missing placeholder`);
      }

      fs.writeFileSync(filePath, buffer);
      console.log(`   Saved ${filename} (${Math.round(buffer.length / 1024)} KB)`);

      // Safely update existing record in MongoDB without duplicating
      const updateResult = await Book.updateOne(
        { isbn: b.isbn },
        { $set: { coverImage: dbCoverPath } }
      );

      if (updateResult.matchedCount > 0) {
        updatedCount++;
        console.log(`   Updated MongoDB record for "${b.title}" (matched: ${updateResult.matchedCount})`);
      } else {
        console.warn(`   WARNING: No MongoDB record matched ISBN ${b.isbn} for "${b.title}"`);
      }
    } catch (err) {
      console.error(`   Failed to download cover for "${b.title}":`, err.message);
    }
  }

  console.log('====================================================');
  console.log(`[Cover Updater] Finished: Updated ${updatedCount} of ${verifiedBooks.length} books in MongoDB.`);
  console.log('====================================================');

  await mongoose.connection.close();
}

downloadAndApplyCovers().catch(err => {
  console.error('Fatal error in cover updater:', err);
  process.exit(1);
});
