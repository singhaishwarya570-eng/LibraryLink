require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const connectDB = require('../config/db');
const User = require('../models/User');
const Library = require('../models/Library');
const Book = require('../models/Book');
const BookCopy = require('../models/BookCopy');
const Reservation = require('../models/Reservation');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const ReadingProgress = require('../models/ReadingProgress');
const { createBookCoverSVG } = require('./generateCovers');

// Ensure public/assets/covers directory exists
const coversDir = path.join(__dirname, '../../public/assets/covers');
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
}

const seedData = async () => {
  try {
    console.log('[Seed] Starting database seeding...');
    await connectDB();

    // 1. Clear existing demonstration database
    console.log('[Seed] Dropping existing database collections for fresh idempotent seed...');
    try {
      await mongoose.connection.db.dropDatabase();
      console.log('✓ Dropped existing database');
    } catch (e) {
      console.log('Note: database was empty or could not drop:', e.message);
    }

    // 2. Seed Admin and Demo User Accounts
    console.log('[Seed] Creating admin and user accounts...');
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('admin123', salt);
    const userPasswordHash = await bcrypt.hash('student123', salt);

    const adminUser = await User.create({
      name: 'IDEA Lab Admin',
      email: 'admin@librarylink.org',
      password: adminPasswordHash,
      role: 'admin',
      phone: '+91 98200 12345',
      address: 'Mira Road, Thane District, Maharashtra'
    });

    const studentUser = await User.create({
      name: 'Rohan Sharma',
      email: 'rohan.sharma@collegemail.edu',
      password: userPasswordHash,
      role: 'user',
      phone: '+91 98199 54321',
      address: 'Flat 402, Royal Complex, Mira Road East'
    });

    console.log('✓ Admin and Student users created');

    // 3. Seed 4 Demonstration Libraries in Mira-Bhayandar
    console.log('[Seed] Seeding 4 Mira-Bhayandar community libraries...');
    const librariesData = [
      {
        name: 'Mira Road Central Community Library',
        code: 'LIB-MR-01',
        address: 'Sector 4, Shanti Nagar, Near Railway Station, Mira Road East',
        area: 'Mira Road East',
        city: 'Mira-Bhayandar',
        contactNumber: '+91 22 2811 4455',
        email: 'miraroad.library@librarylink.demo',
        coordinates: { latitude: 19.2812, longitude: 72.8561 },
        operatingHours: '08:30 AM - 08:30 PM (Mon-Sat)',
        deliveryAvailable: true,
        baseDeliveryFee: 20,
        perKmFee: 5,
        sampleDistanceKm: 1.2,
        isDemo: true
      },
      {
        name: 'Bhayandar West Heritage Reading Room',
        code: 'LIB-BW-02',
        address: 'Station Road, Opposite Maxus Mall, Bhayandar West',
        area: 'Bhayandar West',
        city: 'Mira-Bhayandar',
        contactNumber: '+91 22 2819 7788',
        email: 'bhayandar.west@librarylink.demo',
        coordinates: { latitude: 19.3032, longitude: 72.8423 },
        operatingHours: '09:00 AM - 09:00 PM (Daily)',
        deliveryAvailable: true,
        baseDeliveryFee: 25,
        perKmFee: 6,
        sampleDistanceKm: 3.8,
        isDemo: true
      },
      {
        name: 'Kanakia Knowledge & Learning Hub',
        code: 'LIB-KK-03',
        address: 'Beverly Park, Near Kanakia Police Station, Mira Road',
        area: 'Mira Road East',
        city: 'Mira-Bhayandar',
        contactNumber: '+91 22 2855 9900',
        email: 'kanakia.hub@librarylink.demo',
        coordinates: { latitude: 19.2925, longitude: 72.8680 },
        operatingHours: '09:00 AM - 08:00 PM (Tue-Sun)',
        deliveryAvailable: true,
        baseDeliveryFee: 20,
        perKmFee: 5,
        sampleDistanceKm: 2.5,
        isDemo: true
      },
      {
        name: 'Golden Nest Public Library & Study Center',
        code: 'LIB-GN-04',
        address: 'Golden Nest Circle, Main Road, Bhayandar East',
        area: 'Bhayandar East',
        city: 'Mira-Bhayandar',
        contactNumber: '+91 22 2815 1122',
        email: 'goldennest.library@librarylink.demo',
        coordinates: { latitude: 19.2970, longitude: 72.8530 },
        operatingHours: '08:00 AM - 10:00 PM (Daily)',
        deliveryAvailable: true,
        baseDeliveryFee: 30,
        perKmFee: 7,
        sampleDistanceKm: 4.6,
        isDemo: true
      }
    ];

    const libraries = await Library.insertMany(librariesData);
    const libMap = {};
    libraries.forEach(lib => {
      libMap[lib.code] = lib;
    });
    console.log(`✓ Seeded ${libraries.length} libraries`);

    // 4. Seed 20 Demonstration Books with Accurate Fixed Covers
    console.log('[Seed] Seeding 20 books and generating high-res SVG covers...');
    const booksRaw = [
      {
        title: 'Clean Code',
        author: 'Robert C. Martin',
        isbn: '978-0132350884',
        category: 'Computer Science',
        description: 'A handbook of agile software craftsmanship. Even bad code can function, but if code isn\'t clean, it can bring a development organization to its knees.',
        publishedYear: 2008,
        publisher: 'Prentice Hall',
        key: 'clean-code'
      },
      {
        title: 'Introduction to Algorithms',
        author: 'Thomas H. Cormen',
        isbn: '978-0262033848',
        category: 'Computer Science',
        description: 'Comprehensive textbook on computer algorithms, covering a broad range of algorithms in depth, yet making their design and analysis accessible to all levels of readers.',
        publishedYear: 2009,
        publisher: 'MIT Press',
        key: 'intro-algorithms'
      },
      {
        title: 'The Pragmatic Programmer',
        author: 'Andrew Hunt & David Thomas',
        isbn: '978-0201616224',
        category: 'Computer Science',
        description: 'One of the most significant books on modern software engineering practices, covering software development craft from personal responsibility to architectural design.',
        publishedYear: 1999,
        publisher: 'Addison-Wesley',
        key: 'pragmatic-programmer'
      },
      {
        title: 'Design Patterns',
        author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
        isbn: '978-0201633610',
        category: 'Computer Science',
        description: 'Captures a wealth of experience about the design of object-oriented software, introducing 23 classic design patterns with code examples.',
        publishedYear: 1994,
        publisher: 'Addison-Wesley',
        key: 'design-patterns'
      },
      {
        title: "You Don't Know JS: Scope & Closures",
        author: 'Kyle Simpson',
        isbn: '978-1491904244',
        category: 'Computer Science',
        description: 'Deep dive into the core mechanisms of the JavaScript language, exploring lexical scope, closures, hoisting, and the module pattern.',
        publishedYear: 2014,
        publisher: "O'Reilly Media",
        key: 'ydkjs-scope'
      },
      {
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        isbn: '978-0061120084',
        category: 'Fiction',
        description: 'A classic of modern American literature, exploring human behavior, racism, integrity, and empathy in the Deep South through the eyes of young Scout Finch.',
        publishedYear: 1960,
        publisher: 'J. B. Lippincott & Co.',
        key: 'to-kill-a-mockingbird'
      },
      {
        title: '1984',
        author: 'George Orwell',
        isbn: '978-0451524935',
        category: 'Fiction',
        description: 'The definitive dystopian masterpiece depicting a totalitarian regime of surveillance, thought-control, and the struggle of Winston Smith.',
        publishedYear: 1949,
        publisher: 'Secker & Warburg',
        key: '1984'
      },
      {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '978-0743273565',
        category: 'Fiction',
        description: 'Set in Jazz Age New York, the novel chronicles the mysterious millionaire Jay Gatsby and his obsessive passion for Daisy Buchanan.',
        publishedYear: 1925,
        publisher: "Charles Scribner's Sons",
        key: 'the-great-gatsby'
      },
      {
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        isbn: '978-0141439518',
        category: 'Fiction',
        description: 'A romantic masterpiece centering on Elizabeth Bennet, exploring manners, upbringing, morality, and marriage in early 19th-century England.',
        publishedYear: 1813,
        publisher: 'T. Egerton',
        key: 'pride-and-prejudice'
      },
      {
        title: 'The Alchemist',
        author: 'Paulo Coelho',
        isbn: '978-0062315007',
        category: 'Fiction',
        description: 'The magical story of Santiago, an Andalusian shepherd boy who yearns to travel in search of a worldly treasure and discovers his personal legend.',
        publishedYear: 1988,
        publisher: 'HarperOne',
        key: 'the-alchemist'
      },
      {
        title: 'Atomic Habits',
        author: 'James Clear',
        isbn: '978-0735211292',
        category: 'Self-Help',
        description: 'An easy & proven way to build good habits & break bad ones, using practical strategies rooted in biology, psychology, and neuroscience.',
        publishedYear: 2018,
        publisher: 'Avery',
        key: 'atomic-habits'
      },
      {
        title: 'Deep Work',
        author: 'Cal Newport',
        isbn: '978-1455586691',
        category: 'Self-Help',
        description: 'Rules for focused success in a distracted world. Deep work is the ability to focus without distraction on a cognitively demanding task.',
        publishedYear: 2016,
        publisher: 'Grand Central Publishing',
        key: 'deep-work'
      },
      {
        title: 'The Psychology of Money',
        author: 'Morgan Housel',
        isbn: '978-9390166268',
        category: 'Non-Fiction',
        description: 'Timeless lessons on wealth, greed, and happiness doing well with money isn\'t necessarily about what you know. It\'s about how you behave.',
        publishedYear: 2020,
        publisher: 'Harriman House',
        key: 'psychology-of-money'
      },
      {
        title: 'Sapiens: A Brief History of Humankind',
        author: 'Yuval Noah Harari',
        isbn: '978-0062316097',
        category: 'Non-Fiction',
        description: 'A landmark exploration of who we are, how we got here, and where we are heading, spanning 70,000 years of human evolution and culture.',
        publishedYear: 2014,
        publisher: 'Harper',
        key: 'sapiens'
      },
      {
        title: 'Thinking, Fast and Slow',
        author: 'Daniel Kahneman',
        isbn: '978-0374533557',
        category: 'Non-Fiction',
        description: 'Nobel Memorial Prize winner Daniel Kahneman takes us on a groundbreaking tour of the mind, explaining the two systems that drive the way we think.',
        publishedYear: 2011,
        publisher: 'Farrar, Straus and Giroux',
        key: 'thinking-fast-and-slow'
      },
      {
        title: 'A Brief History of Time',
        author: 'Stephen Hawking',
        isbn: '978-0553380163',
        category: 'Science',
        description: 'From the Big Bang to black holes, Stephen Hawking explores the most profound questions about the universe and modern physics.',
        publishedYear: 1988,
        publisher: 'Bantam Books',
        key: 'brief-history-of-time'
      },
      {
        title: 'Cosmos',
        author: 'Carl Sagan',
        isbn: '978-0345539434',
        category: 'Science',
        description: 'A personal journey through 15 billion years of cosmic evolution, tracing how science and civilization grew up together.',
        publishedYear: 1980,
        publisher: 'Random House',
        key: 'cosmos'
      },
      {
        title: 'The Gene: An Intimate History',
        author: 'Siddhartha Mukherjee',
        isbn: '978-1476733500',
        category: 'Science',
        description: 'A magnificent history of the gene and a response to the defining question of the future: Does what we inherit define who we become?',
        publishedYear: 2016,
        publisher: 'Scribner',
        key: 'the-gene'
      },
      {
        title: 'Ikigai: The Japanese Secret to Long Life',
        author: 'Héctor García & Francesc Miralles',
        isbn: '978-0143130726',
        category: 'Self-Help',
        description: 'The Japanese secret to a long and happy life, finding purpose and joy in daily existence from the centenarians of Okinawa.',
        publishedYear: 2017,
        publisher: 'Penguin Life',
        key: 'ikigai'
      },
      {
        title: 'Zero to One: Notes on Startups',
        author: 'Peter Thiel with Blake Masters',
        isbn: '978-0804139298',
        category: 'Business',
        description: 'How to build companies that create new things. Doing what someone else already knows how to do takes the world from 1 to n.',
        publishedYear: 2014,
        publisher: 'Crown Business',
        key: 'zero-to-one'
      }
    ];

    const booksToInsert = [];
    const imagesDir = path.join(__dirname, '../../public/images/books');
    booksRaw.forEach((item, index) => {
      // 1. Generate local fallback SVG cover if needed
      const svgContent = createBookCoverSVG(item.title, item.author, item.category, item.isbn, index);
      const svgFilename = `${item.key}.svg`;
      fs.writeFileSync(path.join(coversDir, svgFilename), svgContent, 'utf-8');

      // 2. Check if verified real cover image exists in public/images/books/
      const realImagePath = path.join(imagesDir, `${item.key}.jpg`);
      const coverImagePath = fs.existsSync(realImagePath)
        ? `/images/books/${item.key}.jpg`
        : `/assets/covers/${svgFilename}`;

      // 3. Prepare database object
      booksToInsert.push({
        title: item.title,
        author: item.author,
        isbn: item.isbn,
        category: item.category,
        description: item.description,
        coverImage: coverImagePath,
        publishedYear: item.publishedYear,
        publisher: item.publisher,
        totalCopiesCount: 0,
        availableCopiesCount: 0,
        isDemo: true
      });
    });

    const insertedBooks = await Book.insertMany(booksToInsert);
    console.log(`✓ Seeded ${insertedBooks.length} books and created local verified SVG covers`);

    // 5. Seed Book Copies across the 4 Libraries
    console.log('[Seed] Distributing book copies across libraries to simulate inventory...');
    const bookCopiesToInsert = [];
    let barcodeSeq = 1000;

    // Distribution pattern to ensure some books are in all libraries, some in 2, some in 1
    for (let i = 0; i < insertedBooks.length; i++) {
      const book = insertedBooks[i];
      let assignedLibs = [];

      if (i % 3 === 0) {
        // High availability book: in all 4 libraries
        assignedLibs = [libraries[0], libraries[1], libraries[2], libraries[3]];
      } else if (i % 2 === 0) {
        // Medium availability: in 2 libraries
        assignedLibs = [libraries[0], libraries[2]];
      } else {
        // Available in 2 different libraries
        assignedLibs = [libraries[1], libraries[3]];
      }

      let bookTotal = 0;
      let bookAvail = 0;

      for (const lib of assignedLibs) {
        // Generate between 1 and 3 copies per library
        const copiesInThisLib = (i % 3) + 1;
        for (let c = 1; c <= copiesInThisLib; c++) {
          barcodeSeq++;
          const isAvailable = (barcodeSeq % 5 !== 0); // 80% available, 20% reserved
          const status = isAvailable ? 'available' : 'reserved';

          bookTotal++;
          if (isAvailable) bookAvail++;

          bookCopiesToInsert.push({
            book: book._id,
            library: lib._id,
            copyBarcode: `BC-${lib.code}-${barcodeSeq}`,
            status,
            condition: c === 1 ? 'New' : 'Good',
            rackLocation: `Row ${String.fromCharCode(65 + (i % 6))}-${c}`,
            isDemo: true
          });
        }
      }

      // Update aggregate counts on the Book document
      await Book.findByIdAndUpdate(book._id, {
        totalCopiesCount: bookTotal,
        availableCopiesCount: bookAvail
      });
    }

    await BookCopy.insertMany(bookCopiesToInsert);
    console.log(`✓ Seeded ${bookCopiesToInsert.length} individual physical book copies with rack tags and statuses`);

    // 6. Seed 6 Demonstration Community Events in Mira-Bhayandar
    console.log('[Seed] Seeding 6 community meetups and reading workshops...');
    const now = new Date();
    const addDays = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const eventsData = [
      {
        title: 'Mira Road Weekend Book Club: Clean Code in Practice',
        eventType: 'Book Discussion',
        description: 'Join local developers, students, and coding enthusiasts for a lively chapter-by-chapter discussion on writing elegant, maintainable code with real-world examples.',
        date: addDays(4),
        time: '10:30 AM - 12:30 PM',
        library: libraries[0]._id,
        venue: 'Conference Hall, Mira Road Central Community Library',
        area: 'Mira Road East',
        coordinates: { latitude: 19.2812, longitude: 72.8561 },
        sampleDistanceKm: 1.2,
        totalSeats: 30,
        availableSeats: 24,
        speakerOrHost: 'Vikram Joshi (Senior Software Architect)',
        bannerImage: '/assets/events/event-club.svg',
        isDemo: true
      },
      {
        title: 'Bhayandar Storytelling & Creative Fiction Circle',
        eventType: 'Storytelling Session',
        description: 'An interactive weekend storytelling session for youth and adults. Share your favorite classic passages, explore narrative arches, and learn narrative pacing.',
        date: addDays(7),
        time: '04:00 PM - 06:00 PM',
        library: libraries[1]._id,
        venue: 'Garden Amphitheater, Bhayandar West Heritage Reading Room',
        area: 'Bhayandar West',
        coordinates: { latitude: 19.3032, longitude: 72.8423 },
        sampleDistanceKm: 3.8,
        totalSeats: 25,
        availableSeats: 18,
        speakerOrHost: 'Ananya Deshmukh (Author & Literary Critic)',
        bannerImage: '/assets/events/event-story.svg',
        isDemo: true
      },
      {
        title: 'Writing Workshop: Turning Ideas into Captivating Prose',
        eventType: 'Writing Workshop',
        description: 'Practical, hands-on writing clinic focusing on character development, world-building, and overcoming writer\'s block. Bring your notebooks and laptops!',
        date: addDays(11),
        time: '11:00 AM - 01:30 PM',
        library: libraries[2]._id,
        venue: 'Innovation Studio, Kanakia Knowledge Hub, Mira Road',
        area: 'Mira Road East',
        coordinates: { latitude: 19.2925, longitude: 72.8680 },
        sampleDistanceKm: 2.5,
        totalSeats: 20,
        availableSeats: 12,
        speakerOrHost: 'Dr. Kabir Sen (Professor of Creative Writing)',
        bannerImage: '/assets/events/event-workshop.svg',
        isDemo: true
      },
      {
        title: 'Atomic Habits & Productivity Meetup: 1% Better Every Day',
        eventType: 'Reading Club',
        description: 'A community roundtable discussing habit building, focus rituals, and personal growth systems inspired by James Clear\'s Atomic Habits and Cal Newport\'s Deep Work.',
        date: addDays(14),
        time: '05:00 PM - 07:00 PM',
        library: libraries[3]._id,
        venue: 'Activity Hall, Golden Nest Public Library, Bhayandar East',
        area: 'Bhayandar East',
        coordinates: { latitude: 19.2970, longitude: 72.8530 },
        sampleDistanceKm: 4.6,
        totalSeats: 35,
        availableSeats: 28,
        speakerOrHost: 'Sneha Kulkarni (Mindset & Habit Coach)',
        bannerImage: '/assets/events/event-habits.svg',
        isDemo: true
      },
      {
        title: 'Community Science Cafe: Exploring the Cosmos & Deep Time',
        eventType: 'Community Reading Event',
        description: 'Explore the mysteries of the universe, astrophysics, and the frontiers of genetic science through the lenses of Carl Sagan and Stephen Hawking in a friendly community forum.',
        date: addDays(18),
        time: '06:00 PM - 08:00 PM',
        library: libraries[0]._id,
        venue: 'Terrace Reading Deck, Mira Road Central Library',
        area: 'Mira Road East',
        coordinates: { latitude: 19.2812, longitude: 72.8561 },
        sampleDistanceKm: 1.2,
        totalSeats: 40,
        availableSeats: 35,
        speakerOrHost: 'Prof. Arvind Nambiar (Space Educator)',
        bannerImage: '/assets/events/event-science.svg',
        isDemo: true
      },
      {
        title: 'Young Readers & Classic Literature Afternoon',
        eventType: 'Reading Club',
        description: 'Celebrating timeless literature from Jane Austen to Harper Lee with dramatic readings, quiz games, and book swapping between local readers.',
        date: addDays(21),
        time: '03:30 PM - 05:30 PM',
        library: libraries[1]._id,
        venue: 'Youth Center, Bhayandar West Reading Room',
        area: 'Bhayandar West',
        coordinates: { latitude: 19.3032, longitude: 72.8423 },
        sampleDistanceKm: 3.8,
        totalSeats: 25,
        availableSeats: 21,
        speakerOrHost: 'Pooja Iyer (Youth Librarian)',
        bannerImage: '/assets/events/event-young.svg',
        isDemo: true
      }
    ];

    const insertedEvents = await Event.insertMany(eventsData);
    console.log(`✓ Seeded ${insertedEvents.length} demonstration community events`);

    // 7. Seed Sample Registrations for Events
    console.log('[Seed] Seeding sample event registrations...');
    await EventRegistration.create({
      registrationNumber: 'EVT-REG-1001',
      event: insertedEvents[0]._id,
      eventTitle: insertedEvents[0].title,
      userName: 'Rohan Sharma',
      userEmail: 'rohan.sharma@collegemail.edu',
      userPhone: '+91 98199 54321',
      status: 'Confirmed'
    });

    await EventRegistration.create({
      registrationNumber: 'EVT-REG-1002',
      event: insertedEvents[3]._id,
      eventTitle: insertedEvents[3].title,
      userName: 'Priya Mehta',
      userEmail: 'priya.mehta@gmail.com',
      userPhone: '+91 98205 67890',
      status: 'Confirmed'
    });
    console.log('✓ Seeded sample event registrations');

    // 8. Seed Sample Book Reservations
    console.log('[Seed] Seeding demonstration book reservations...');
    const demoBook1 = insertedBooks[0]; // Clean Code
    const demoBook2 = insertedBooks[10]; // Atomic Habits

    await Reservation.create({
      reservationNumber: 'RES-2026-0001',
      user: studentUser._id,
      userName: 'Rohan Sharma',
      userEmail: 'rohan.sharma@collegemail.edu',
      userPhone: '+91 98199 54321',
      book: demoBook1._id,
      bookTitle: demoBook1.title,
      library: libraries[0]._id,
      libraryName: libraries[0].name,
      fulfillmentType: 'pickup',
      distanceKm: 1.2,
      deliveryFee: 0,
      status: 'Ready for Pickup',
      isDemo: true
    });

    await Reservation.create({
      reservationNumber: 'RES-2026-0002',
      userName: 'Amit Patil',
      userEmail: 'amit.patil@outlook.com',
      userPhone: '+91 98211 44332',
      book: demoBook2._id,
      bookTitle: demoBook2.title,
      library: libraries[1]._id,
      libraryName: libraries[1].name,
      fulfillmentType: 'delivery',
      deliveryAddress: 'B-204, Shanti Park, Bhayandar West, 401101',
      deliveryNotes: 'Leave with security guard if not available',
      distanceKm: 3.8,
      deliveryFee: 45,
      status: 'Confirmed',
      isDemo: true
    });

    await Reservation.create({
      reservationNumber: 'RES-2026-0003',
      userName: 'Kavita Nair',
      userEmail: 'kavita.nair@yahoo.com',
      userPhone: '+91 98700 99881',
      book: insertedBooks[12]._id, // Psychology of Money
      library: libraries[2]._id,
      libraryName: libraries[2].name,
      bookTitle: insertedBooks[12].title,
      fulfillmentType: 'delivery',
      deliveryAddress: 'Flat 12, Silver Arch, Kanakia Road, Mira Road East',
      deliveryNotes: 'Call before arriving',
      distanceKm: 2.5,
      deliveryFee: 35,
      status: 'Pending',
      isDemo: true
    });
    console.log('✓ Seeded 3 demonstration reservations');

    // 9. Seed Sample Reading Challenge Progress
    console.log('[Seed] Seeding sample reading challenges and community stats...');
    await ReadingProgress.create({
      userEmail: 'rohan.sharma@collegemail.edu',
      userName: 'Rohan Sharma',
      yearlyGoal: 15,
      booksCompleted: 4,
      currentStreakDays: 8,
      totalReadingMinutes: 1850,
      completedBookList: [
        {
          bookTitle: 'Atomic Habits',
          author: 'James Clear',
          category: 'Self-Help',
          completedDate: new Date('2026-01-20'),
          rating: 5,
          notes: 'Game-changer concepts on identity-based habits and environment design.'
        },
        {
          bookTitle: 'Clean Code',
          author: 'Robert C. Martin',
          category: 'Computer Science',
          completedDate: new Date('2026-02-15'),
          rating: 5,
          notes: 'Great emphasis on meaningful names and small functions.'
        },
        {
          bookTitle: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          category: 'Fiction',
          completedDate: new Date('2026-03-02'),
          rating: 4,
          notes: 'Beautiful prose and timeless social commentary.'
        },
        {
          bookTitle: 'The Psychology of Money',
          author: 'Morgan Housel',
          category: 'Non-Fiction',
          completedDate: new Date('2026-03-25'),
          rating: 5,
          notes: 'Focuses on financial behavior over spreadsheet math.'
        }
      ],
      isDemo: true
    });

    await ReadingProgress.create({
      userEmail: 'priya.mehta@gmail.com',
      userName: 'Priya Mehta',
      yearlyGoal: 20,
      booksCompleted: 7,
      currentStreakDays: 14,
      totalReadingMinutes: 3400,
      completedBookList: [
        {
          bookTitle: 'Sapiens',
          author: 'Yuval Noah Harari',
          category: 'Non-Fiction',
          completedDate: new Date('2026-01-14'),
          rating: 5,
          notes: 'Fascinating cognitive and agricultural revolutions.'
        },
        {
          bookTitle: 'Deep Work',
          author: 'Cal Newport',
          category: 'Self-Help',
          completedDate: new Date('2026-02-10'),
          rating: 4,
          notes: 'Helped reduce phone screen time substantially.'
        }
      ],
      isDemo: true
    });
    console.log('✓ Seeded reading progress records');

    console.log('====================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log(`- Libraries: ${libraries.length}`);
    console.log(`- Books: ${insertedBooks.length}`);
    console.log(`- Book Copies: ${bookCopiesToInsert.length}`);
    console.log(`- Events: ${insertedEvents.length}`);
    console.log(`- Demo Admin: admin@librarylink.org / admin123`);
    console.log(`- Demo User: rohan.sharma@collegemail.edu / student123`);
    console.log('====================================================');

    if (require.main === module) {
      await mongoose.connection.close();
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Database seeding error:', error);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
