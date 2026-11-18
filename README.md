# LibraryLink – Smart Community Library Network

> **Discover Books. Find Libraries. Connect Communities.**
>
> College IDEA Lab Project | Information Technology — Semester 3
> Addressing Problem Statement No. 5: Low public library attendance and limited digital outreach in Mira-Bhayandar.

---

## 📖 1. Project Overview

**LibraryLink** is a full-stack digital platform connecting multiple community libraries and reading rooms across Mira-Bhayandar into one unified network.

### The Problem
Public libraries and reading centres in suburban areas face declining attendance and lack digital presence. Readers cannot easily check whether a book is available without visiting multiple branches in person, resulting in underutilized public literary infrastructure.

### The Proposed Solution & Core Innovation
LibraryLink introduces the **Smart Multi-Library Book Finder with Distance and Delivery Charge Comparison**:
- **Multi-Branch Search:** One search queries real-time book copies across all community library branches simultaneously.
- **Haversine Geolocation Distance Calculation:** Computes true travel distance in kilometers between the user's location and each library branch.
- **Delivery Charge Comparison:** Transparently calculates and compares free in-person counter pickup versus estimated home delivery charges.
- **Real-Time Inventory Reservation:** Reserves physical book copies in a persistent MongoDB database and dynamically updates branch stock counts.
- **Community Meetups & Events:** Discovers reading clubs, storytelling sessions, and writing workshops with seat tracking and duplicate-registration prevention.
- **2026 Reading Challenge:** Tracks individual reading targets, progress bars, streaks, and community reading metrics.
- **Admin Management Portal:** Password-hashed, JWT-protected dashboard for complete book catalogue CRUD, library management, reservation status lifecycles, and event moderation.

---

## 🛠️ 2. Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+), Tailwind CSS |
| **Backend** | Node.js, Express.js, RESTful APIs |
| **Database** | MongoDB Community Edition (v8.3) / MongoDB Atlas, Mongoose ODM |
| **Security & Auth** | JSON Web Tokens (JWT), Bcrypt.js (Password Hashing), CORS, Input Sanitization |
| **Testing** | Node.js Test Suite (77 automated integration assertions) |

---

## 📁 3. Project Folder Structure

```
LibrarayLink/
├── package.json               # Node.js project manifest & scripts
├── server.js                  # Main Express application entry point
├── .env                       # Environment variables (port, db uri, jwt secret)
├── .env.example               # Template environment configuration
│
├── src/
│   ├── config/
│   │   └── db.js              # Mongoose database connection handler
│   ├── models/                # Persistent Mongoose schemas
│   │   ├── User.js            # User accounts & admin authentication
│   │   ├── Library.js         # Library branches & geo-coordinates
│   │   ├── Book.js            # Book catalogue records
│   │   ├── BookCopy.js        # Physical copy barcode & rack inventory
│   │   ├── Reservation.js     # Booking records with fulfillment tracking
│   │   ├── Event.js           # Community learning meetups & workshops
│   │   ├── EventRegistration.js # Unique event registration passes
│   │   └── ReadingProgress.js # Individual goals, streaks & completed books
│   ├── controllers/           # Business logic & request handlers
│   │   ├── book.controller.js
│   │   ├── library.controller.js
│   │   ├── reservation.controller.js
│   │   ├── event.controller.js
│   │   ├── readingProgress.controller.js
│   │   └── admin.controller.js
│   ├── routes/                # Modular REST API endpoints
│   │   ├── health.routes.js
│   │   ├── book.routes.js
│   │   ├── library.routes.js
│   │   ├── reservation.routes.js
│   │   ├── event.routes.js
│   │   ├── readingProgress.routes.js
│   │   └── admin.routes.js
│   ├── middleware/
│   │   ├── auth.js            # JWT bearer token & admin role authorization
│   │   └── errorHandler.js    # Centralized error response formatter
│   ├── utils/
│   │   └── haversine.js       # Haversine distance & delivery charge algorithm
│   └── scripts/
│       ├── seed.js            # Idempotent seed script with verified demonstration data
│       ├── generateCovers.js  # Verified SVG book cover generator
│       └── generateEventBanners.js # High-res SVG event banner generator
│
├── public/                    # Production static web assets
│   ├── index.html             # Module 1: Homepage & stats
│   ├── books.html             # Module 2 & 3: Multi-Library Book Finder & Reservation
│   ├── meetups.html           # Module 4: Meetup & Events Finder
│   ├── challenge.html         # Module 5: Reading Challenge & Tracker
│   ├── admin.html             # Module 6: Admin Dashboard & Control Portal
│   ├── css/
│   │   └── custom.css         # Color palette, glassmorphism, animations & toasts
│   ├── js/
│   │   ├── api.js             # API client, toast notifications, fallback cover handler
│   │   ├── navbar.js          # Shared responsive navigation & footer
│   │   ├── home.js            # Homepage data loader
│   │   ├── books.js           # Multi-library comparisons & reservation modal
│   │   ├── meetups.js         # Event filtering & seat registration
│   │   ├── challenge.js       # Personal goals, book logging & leaderboard
│   │   └── admin.js           # Admin authentication, CRUD & status managers
│   └── assets/
│       ├── logo.svg           # Professional brand vector logo
│       ├── covers/            # 20 title-verified book cover assets
│       └── events/            # Vector event banners
│
└── tests/
    ├── test-phase1.js         # Setup & health-check verification
    ├── test-phase2.js         # Model schemas & seed data retrieval verification
    ├── test-apis.js           # REST API endpoints verification
    └── run-tests.js           # 77-point end-to-end automated test runner
```

---

## 🚀 4. Local Installation & Running Instructions

### Prerequisites
1. **Node.js** (v18.0.0 or higher recommended; verified on Node v24)
2. **MongoDB** (Local MongoDB Community Edition running on port `27017` OR MongoDB Atlas connection string)

### Step 1: Clone or Navigate to Project
```powershell
cd c:\Users\Aishwarya\Downloads\LibrarayLink
```

### Step 2: Install Dependencies
```powershell
npm install
```

### Step 3: Configure Environment Variables
Verify `.env` has the desired configuration:
```ini
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/librarylink
JWT_SECRET=librarylink_super_secure_jwt_secret_key_2026
NODE_ENV=development
```

### Step 4: Seed Database
Populates 4 demonstration libraries in Mira-Bhayandar, 20 title-verified books, 92 distributed book copies, 6 events, sample reservations, and the admin account:
```powershell
npm run seed
```

### Step 5: Start the Application
```powershell
npm start
```
The application will start at:
- **Web Platform:** [http://localhost:5000/](http://localhost:5000/)
- **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Admin Dashboard:** [http://localhost:5000/admin.html](http://localhost:5000/admin.html)

### Step 6: Run Automated Verification Tests
```powershell
npm test
```
Runs all 77 automated unit and integration tests verifying image accuracy, Haversine math, reservation deductions, event limits, and database restart persistence.

---

## 🔐 5. Admin Authentication & Demonstration Credentials

Access the **Admin Dashboard** at `/admin.html` or click the **Admin** link in the navigation bar.

| Field | Value |
|---|---|
| **Admin Email** | `admin@librarylink.org` |
| **Password** | `admin123` |
| **Role** | `admin` (Protected with bcrypt salt rounds & JWT token) |

### Demonstration User Account
| Field | Value |
|---|---|
| **Student Name** | Rohan Sharma |
| **Email** | `rohan.sharma@collegemail.edu` |
| **Password** | `student123` |

---

## 📡 6. Complete REST API Documentation

### Health Check
- `GET /api/health` — Checks backend status and real-time MongoDB connectivity.

### Books & Multi-Library Finder
- `GET /api/books` — Returns list of books with search (`q`), category filter (`category`), stock toggle (`availableOnly`), and sorting (`sort`).
- `GET /api/books/search?q=query` — Quick search endpoint.
- `GET /api/books/:id` — Single book details.
- `GET /api/books/:id/availability?userLat=...&userLng=...&sortBy=nearest` — **Core Innovation:** Returns Haversine distance, pickup availability, estimated delivery charges, and available copy count for every library carrying the title.
- `POST /api/books` *(Admin)* — Add a new book to the network.
- `PUT /api/books/:id` *(Admin)* — Edit book information.
- `DELETE /api/books/:id` *(Admin)* — Delete book and its physical copies.

### Libraries
- `GET /api/libraries` — Lists all 4 participating Mira-Bhayandar libraries with coordinates and operating hours.
- `GET /api/libraries/:id` — Single library details and current inventory.
- `POST /api/libraries` *(Admin)* — Add a new library branch.
- `PUT /api/libraries/:id` *(Admin)* — Edit library branch details.
- `DELETE /api/libraries/:id` *(Admin)* — Remove library branch.

### Reservations
- `POST /api/reservations` — Creates a reservation, validates stock at the chosen branch, decrements available copy count, and saves reservation to MongoDB.
- `GET /api/reservations` — Retrieves reservations (filterable by email, status, or library).
- `GET /api/reservations/:id` — Retrieves reservation by ID or reservation number (`RES-xxxxxxxx`).
- `PATCH /api/reservations/:id/status` — Updates lifecycle status (`Pending`, `Confirmed`, `Ready for Pickup`, `Out for Delivery`, `Completed`, `Cancelled`). If marked `Cancelled`, inventory is replenished automatically.

### Community Events
- `GET /api/events` — Lists upcoming community reading events with remaining seats and Haversine distances.
- `GET /api/events/:id` — Single event details.
- `POST /api/events/:id/register` — Registers attendee, checks for duplicate email, and decrements available seats.
- `GET /api/events/:id/registrations` *(Admin)* — Retrieves attendee list for an event.
- `POST /api/events` *(Admin)* — Creates a new community meetup.
- `PUT /api/events/:id` *(Admin)* — Updates event details.
- `DELETE /api/events/:id` *(Admin)* — Deletes event and associated registrations.

### Reading Challenge
- `GET /api/reading-progress?email=...` — Returns reader's goals, completed books, and streak.
- `GET /api/reading-progress/community-stats` — Returns aggregate city-wide reading statistics.
- `POST /api/reading-progress` — Initializes new reader profile.
- `PUT /api/reading-progress/update` — Updates yearly goal or logs a completed book with rating and review notes.

### Admin Operations
- `POST /api/admin/login` — Verifies bcrypt password hash and returns signed JWT token.
- `GET /api/admin/stats` *(Protected)* — Retrieves aggregate platform statistics.
- `GET /api/admin/inventory/copies` *(Protected)* — Lists physical copies with barcodes, rack locations, and branch assignments.
- `POST /api/admin/inventory/copies` *(Protected)* — Adds individual physical copy to a branch.

---

## 🎨 7. Book Image Accuracy Architecture

To strictly satisfy the problem of image mismatches:
1. **Fixed Deterministic Mapping:** Every book record is mapped to a dedicated local SVG asset (`/assets/covers/<key>.svg`).
2. **Title-Verified Assets:** All 20 book SVG covers contain the book title, author, category badge, and ISBN embedded directly in the vector art.
3. **No External Network Dependencies:** All covers are stored locally in `public/assets/covers/`.
4. **Dynamic Graceful Fallback:** If any image ever encounters a network or load error, the frontend's `handleImageError` function dynamically renders an inline SVG placeholder displaying the exact book title and author.

---

## 🧪 8. Automated Test Results (Phase 9)

Run with `npm test`:
```
================================================================
 LIBRARYLINK COMPREHENSIVE AUTOMATED TEST SUITE (PHASE 9)
================================================================
  [PASS] #1 - Health endpoint responds with HTTP 200
  [PASS] #2 - Database is confirmed connected in health payload
  [PASS] #3 - Homepage HTML serves successfully at root
  [PASS] #4 - Books catalogue HTML serves successfully
  [PASS] #5 - Meetups HTML serves successfully
  [PASS] #6 - Reading Challenge HTML serves successfully
  [PASS] #7 - Admin Portal HTML serves successfully
  [PASS] #8 - Found 20 local book cover SVG assets (expected >= 20)
  [PASS] #9 - Found 20 verified books in MongoDB
  [PASS] #10-#49 - Verified 20/20 book cover files exist & match titles/ISBN
  [PASS] #50 - Haversine formula calculated 2.3 km between stations
  [PASS] #51 - Zero distance calculates base fee of ₹20
  [PASS] #52 - Estimated delivery charge for 3.8 km calculated as ₹40
  [PASS] #53 - Availability API returned success
  [PASS] #54 - Comparison includes all 4 Mira-Bhayandar libraries
  [PASS] #55 - Comparison list sorted by nearest distance
  [PASS] #56-#62 - Reservation created, copy decremented, cancelled, and replenished
  [PASS] #63-#66 - Events listed, seat decremented, duplicate registration blocked
  [PASS] #67-#69 - Reading challenge profile created, book logged, notes saved
  [PASS] #70-#75 - Admin invalid login blocked, token issued, book CRUD verified
  [PASS] #76-#77 - Database persistence confirmed across backend restart simulation
================================================================
🎉 ALL 77 OF 77 TESTS PASSED SUCCESSFULLY!
================================================================
```

---

## 💡 9. Known Limitations

1. **Demonstration Data:** All 4 libraries, book stocks, and events represent demonstration data for Mira-Bhayandar municipal simulation.
2. **Estimated Delivery Charges:** Delivery charges are calculated algorithmic estimations based on distance and branch base fees, not live courier API integrations (e.g., Dunzo/Borzo).
3. **Mock Geolocation Reference Points:** The platform offers live browser GPS detection as well as 4 preset reference landmarks across Mira-Bhayandar for convenient evaluation.

---

## 🔮 10. Future Scope

1. **Real-time SMS / WhatsApp Notifications:** Sending reservation status updates and reminder notices for book returns.
2. **Automated RFID Kiosk Integration:** Direct synchronization with physical library entrance turnstiles and RFID book drop boxes.
3. **Delivery Partner API Integration:** Real-time pickup dispatch using hyper-local delivery APIs.
4. **Digital Reading Room Seat Booking:** Reserving physical study desks and quiet work pods with real-time occupancy monitoring.
5. **Municipal Inter-Library Loan Logistics:** Automating book transfers between branch libraries when a user requests a book unavailable at their closest branch.

---

## 🎓 11. College Demonstration Guide

When presenting this project to your college evaluators:
1. **Show the Problem & Vision (Slide / Homepage):** Explain Problem Statement #5 — how public libraries in Mira-Bhayandar have low attendance due to lack of digital outreach.
2. **Demonstrate Multi-Library Comparison (`/books.html`):**
   - Search for a book like `"Clean Code"` or `"Atomic Habits"`.
   - Click **"Compare Libraries & Reserve"**.
   - Show how the modal displays all 4 branches, sorting by **Nearest Distance (Haversine formula)**, **Lowest Delivery Fee**, and **Stock Availability**.
3. **Demonstrate Reservation & Live Inventory Update:**
   - Reserve a copy for Home Delivery or Free Pickup.
   - Show the instant reservation confirmation receipt (`RES-xxxxxxxx`).
   - Refresh the page to show that available copies decreased in MongoDB!
4. **Demonstrate Community Meetups (`/meetups.html`):**
   - Register for an event and show seat count decrementing.
   - Attempt to register with the same email to demonstrate duplicate prevention.
5. **Demonstrate the 2026 Reading Challenge (`/challenge.html`):**
   - Show personal reading progress bar, streaks, and completed books list.
   - Log a new completed book with rating and review notes.
6. **Demonstrate Admin Control Portal (`/admin.html`):**
   - Log in with `admin@librarylink.org` / `admin123`.
   - View system statistics, update reservation statuses, add a book, or register a new physical book copy to a library.
7. **Run the Automated Test Suite:**
   - Execute `npm test` in the terminal to show all 77 passing tests in front of the evaluators.
