// Home Page Logic
document.addEventListener('DOMContentLoaded', async () => {
  initNavigation('home');

  // Load platform stats
  loadStats();

  // Load featured books
  loadFeaturedBooks();

  // Load participating libraries
  loadLibraries();

  // Load upcoming events
  loadUpcomingEvents();

  // Search input handler
  const heroSearchForm = document.getElementById('hero-search-form');
  if (heroSearchForm) {
    heroSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = document.getElementById('hero-search-input').value.trim();
      if (query) {
        window.location.href = `/books.html?q=${encodeURIComponent(query)}`;
      } else {
        window.location.href = '/books.html';
      }
    });
  }
});

async function loadStats() {
  try {
    const [booksRes, libRes, eventsRes, readingRes] = await Promise.all([
      API.get('/books?limit=1'),
      API.get('/libraries'),
      API.get('/events'),
      API.get('/reading-progress/community-stats')
    ]);

    document.getElementById('stat-books').textContent = booksRes.total || '20+';
    document.getElementById('stat-libraries').textContent = libRes.count || '4';
    document.getElementById('stat-events').textContent = eventsRes.count || '6';
    document.getElementById('stat-readers').textContent = readingRes.data?.totalBooksCompleted || '50+';
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function loadFeaturedBooks() {
  const container = document.getElementById('featured-books-grid');
  if (!container) return;

  try {
    const res = await API.get('/books?limit=8&sort=availability');
    const books = res.data || [];

    if (books.length === 0) {
      container.innerHTML = '<p class="text-slate-500 col-span-full text-center py-8">No books available in catalog.</p>';
      return;
    }

    container.innerHTML = books.map((book) => `
      <div class="book-card bg-white rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between group">
        <div>
          <div class="relative overflow-hidden rounded-xl bg-slate-100 aspect-[3/4] mb-3.5 shadow-sm p-2 flex items-center justify-center">
            <img 
              src="${book.coverImage}" 
              alt="${book.title}" 
              class="w-full h-full object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
              onerror="handleImageError(this, '${book.title.replace(/'/g, "\\'")}', '${book.author.replace(/'/g, "\\'")}')"
            />
            <span class="absolute top-2.5 right-2.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-900/85 text-teal-300 backdrop-blur-sm">
              ${book.category}
            </span>
          </div>

          <h3 class="font-bold text-slate-900 text-base leading-snug line-clamp-1 group-hover:text-teal-700 transition-colors">
            ${book.title}
          </h3>
          <p class="text-xs text-slate-500 mt-1 mb-2 font-medium line-clamp-1">by ${book.author}</p>
        </div>

        <div class="pt-3 border-t border-slate-100 mt-2">
          <div class="flex items-center justify-between text-xs mb-3">
            <span class="text-slate-500">Available:</span>
            <span class="font-semibold ${book.availableCopiesCount > 0 ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded' : 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded'}">
              ${book.availableCopiesCount > 0 ? `${book.availableCopiesCount} copies` : 'Out of Stock'}
            </span>
          </div>

          <a 
            href="/books.html?bookId=${book._id}" 
            class="block w-full text-center py-2 px-3 rounded-lg bg-slate-900 text-white hover:bg-teal-700 text-xs font-semibold transition-colors"
          >
            Check Libraries & Reserve
          </a>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load featured books:', err);
    container.innerHTML = '<p class="text-rose-500 col-span-full text-center py-8">Failed to connect to backend database.</p>';
  }
}

async function loadLibraries() {
  const container = document.getElementById('libraries-grid');
  if (!container) return;

  try {
    const res = await API.get('/libraries');
    const libraries = res.data || [];

    container.innerHTML = libraries.map((lib) => `
      <div class="library-card bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between gap-3 mb-3">
            <span class="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100">
              ${lib.code}
            </span>
            <span class="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              ${lib.availableCopies || 0} Books Available
            </span>
          </div>

          <h3 class="text-lg font-bold text-slate-900 leading-snug mb-1">${lib.name}</h3>
          <p class="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
            <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            ${lib.address}
          </p>

          <div class="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div class="flex justify-between">
              <span class="text-slate-500">Operating Hours:</span>
              <span class="font-medium text-slate-800">${lib.operatingHours}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Contact:</span>
              <span class="font-medium text-slate-800">${lib.contactNumber}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Base Delivery Fee:</span>
              <span class="font-medium text-teal-700">₹${lib.baseDeliveryFee} (+₹${lib.perKmFee}/km)</span>
            </div>
          </div>
        </div>

        <a 
          href="/books.html?libraryId=${lib._id}" 
          class="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
        >
          View Books at This Branch
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </a>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load libraries:', err);
  }
}

async function loadUpcomingEvents() {
  const container = document.getElementById('upcoming-events-grid');
  if (!container) return;

  try {
    const res = await API.get('/events');
    const events = (res.data || []).slice(0, 3);

    container.innerHTML = events.map((evt) => {
      const eventDate = new Date(evt.date).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      return `
        <div class="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div class="p-6">
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="px-2.5 py-1 text-xs font-bold rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                ${evt.eventType}
              </span>
              <span class="text-xs font-semibold text-slate-500">
                ${evt.distanceLabel}
              </span>
            </div>

            <h3 class="font-bold text-slate-900 text-lg mb-2 leading-tight">${evt.title}</h3>
            <p class="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">${evt.description}</p>

            <div class="space-y-1.5 text-xs text-slate-600 mb-2">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span class="font-medium">${eventDate} • ${evt.time}</span>
              </div>
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                <span class="truncate">${evt.venue}</span>
              </div>
            </div>
          </div>

          <div class="px-6 pb-6 pt-2 flex items-center justify-between border-t border-slate-100 mt-2">
            <span class="text-xs font-semibold ${evt.availableSeats > 5 ? 'text-emerald-600' : 'text-amber-600'}">
              ${evt.availableSeats} seats remaining
            </span>
            <a 
              href="/meetups.html?eventId=${evt._id}" 
              class="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
            >
              Register Free
            </a>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load events:', err);
  }
}
