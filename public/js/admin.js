// Admin Portal Logic
let adminToken = API.getToken();
let currentTab = 'stats';
let allBooks = [];
let allLibraries = [];
let allReservations = [];
let allEvents = [];
let editingBookId = null;
let editingLibraryId = null;
let editingEventId = null;

document.addEventListener('DOMContentLoaded', () => {
  initNavigation('admin');

  if (adminToken) {
    showDashboardView();
  } else {
    showLoginView();
  }

  // Setup tab switcher
  setupTabs();
});

function showLoginView() {
  document.getElementById('admin-login-section')?.classList.remove('hidden');
  document.getElementById('admin-dashboard-section')?.classList.add('hidden');
}

function showDashboardView() {
  document.getElementById('admin-login-section')?.classList.add('hidden');
  document.getElementById('admin-dashboard-section')?.classList.remove('hidden');

  const user = API.getAdminUser();
  if (user) {
    document.getElementById('admin-name-badge').textContent = 'Admin';
    document.getElementById('admin-email-badge').textContent = user.email || 'admin@librarylink.org';
  }

  loadTab(currentTab);
}

function setupTabs() {
  const tabs = document.querySelectorAll('.admin-nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      tabs.forEach(t => t.classList.remove('active-tab', 'bg-slate-800', 'text-teal-300'));
      tab.classList.add('active-tab', 'bg-slate-800', 'text-teal-300');
      currentTab = tab.dataset.tab;
      loadTab(currentTab);
    });
  });
}

function loadTab(tabName) {
  // Hide all panels
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.add('hidden'));

  const targetPanel = document.getElementById(`panel-${tabName}`);
  if (targetPanel) targetPanel.classList.remove('hidden');

  if (tabName === 'stats') loadDashboardStats();
  if (tabName === 'books') loadAdminBooks();
  if (tabName === 'libraries') loadAdminLibraries();
  if (tabName === 'reservations') loadAdminReservations();
  if (tabName === 'events') loadAdminEvents();
  if (tabName === 'copies') loadAdminCopies();
}

// 1. Authentication Handlers
async function handleAdminLogin(event) {
  event.preventDefault();
  const btn = document.getElementById('login-btn');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  btn.disabled = true;
  btn.innerHTML = '<span>Verifying credentials...</span>';

  try {
    const res = await API.post('/admin/login', { email, password });
    API.setToken(res.token);
    API.setAdminUser(res.admin);
    adminToken = res.token;

    showToast('Admin logged in successfully!', 'success');
    showDashboardView();
  } catch (err) {
    console.error('Login error:', err);
    showToast(err.message || 'Login failed. Invalid credentials.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Sign In to Admin Portal</span>';
  }
}

function handleAdminLogout() {
  API.setToken(null);
  API.setAdminUser(null);
  adminToken = null;
  showToast('Logged out of Admin Portal.', 'info');
  showLoginView();
}

// 2. Dashboard Statistics
async function loadDashboardStats() {
  try {
    const res = await API.get('/admin/stats');
    const { inventory, reservations, events, community } = res.data;

    document.getElementById('stat-dash-books').textContent = inventory.totalBooks;
    document.getElementById('stat-dash-copies').textContent = `${inventory.availableCopies} avail / ${inventory.totalCopies} total`;
    document.getElementById('stat-dash-libs').textContent = inventory.totalLibraries;
    document.getElementById('stat-dash-res-total').textContent = reservations.total;
    document.getElementById('stat-dash-res-pending').textContent = reservations.pending;
    document.getElementById('stat-dash-res-confirmed').textContent = reservations.confirmed;
    document.getElementById('stat-dash-events').textContent = events.total;
    document.getElementById('stat-dash-registrations').textContent = events.totalRegistrations;

    // Recent reservations table
    const tableBody = document.getElementById('recent-res-table-body');
    if (tableBody && reservations.recent) {
      tableBody.innerHTML = reservations.recent.map(r => `
        <tr class="border-b border-slate-100 text-xs hover:bg-slate-50">
          <td class="py-3 px-4 font-mono font-bold text-teal-800">${r.reservationNumber}</td>
          <td class="py-3 px-4 font-bold text-slate-800">${r.bookTitle}</td>
          <td class="py-3 px-4 text-slate-600">${r.libraryName}</td>
          <td class="py-3 px-4 text-slate-600">${r.userName}</td>
          <td class="py-3 px-4 capitalize">${r.fulfillmentType}</td>
          <td class="py-3 px-4">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadgeClass(r.status)}">
              ${r.status}
            </span>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function getStatusBadgeClass(status) {
  if (status === 'Confirmed') return 'bg-emerald-100 text-emerald-800';
  if (status === 'Pending') return 'bg-amber-100 text-amber-800';
  if (status === 'Ready for Pickup') return 'bg-sky-100 text-sky-800';
  if (status === 'Out for Delivery') return 'bg-purple-100 text-purple-800';
  if (status === 'Completed') return 'bg-slate-200 text-slate-800';
  if (status === 'Cancelled') return 'bg-rose-100 text-rose-800';
  return 'bg-slate-100 text-slate-600';
}

// 3. Books Management
async function loadAdminBooks() {
  const tableBody = document.getElementById('admin-books-table-body');
  if (!tableBody) return;

  try {
    const res = await API.get('/books?limit=100');
    allBooks = res.data || [];

    tableBody.innerHTML = allBooks.map(b => `
      <tr class="border-b border-slate-100 text-xs hover:bg-slate-50">
        <td class="py-3 px-4">
          <div class="w-9 h-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden p-0.5">
            <img src="${b.coverImage}" class="w-full h-full object-contain" onerror="handleImageError(this, '${b.title.replace(/'/g, "\\'")}', '')" />
          </div>
        </td>
        <td class="py-3 px-4 font-bold text-slate-900">${b.title}</td>
        <td class="py-3 px-4 text-slate-600">${b.author}</td>
        <td class="py-3 px-4 font-mono text-[11px]">${b.isbn}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">${b.category}</span>
        </td>
        <td class="py-3 px-4 text-center font-bold ${b.availableCopiesCount > 0 ? 'text-emerald-600' : 'text-rose-600'}">
          ${b.availableCopiesCount} / ${b.totalCopiesCount}
        </td>
        <td class="py-3 px-4 text-right space-x-2">
          <button onclick="openEditBookModal('${b._id}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold">Edit</button>
          <button onclick="handleDeleteBook('${b._id}', '${b.title.replace(/'/g, "\\'")}')" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded font-bold">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load admin books:', err);
  }
}

function openAddBookModal() {
  editingBookId = null;
  document.getElementById('book-modal-title').textContent = 'Add New Book to Network';
  document.getElementById('book-form').reset();
  
  // Reset cover preview
  const coverInput = document.getElementById('book-cover-image');
  const coverPreview = document.getElementById('book-cover-preview');
  const coverStatus = document.getElementById('book-cover-status');
  if (coverInput) coverInput.value = '';
  if (coverPreview) coverPreview.src = '/assets/covers/default-placeholder.svg';
  if (coverStatus) coverStatus.textContent = 'Enter title or ISBN to find cover';

  setupCoverLookupListeners();
  document.getElementById('book-modal').classList.remove('hidden');
}

function openEditBookModal(bookId) {
  const b = allBooks.find(item => item._id === bookId);
  if (!b) return;

  editingBookId = bookId;
  document.getElementById('book-modal-title').textContent = `Edit Book: ${b.title}`;
  document.getElementById('book-title').value = b.title;
  document.getElementById('book-author').value = b.author;
  document.getElementById('book-isbn').value = b.isbn;
  document.getElementById('book-category').value = b.category;
  document.getElementById('book-year').value = b.publishedYear || 2024;
  document.getElementById('book-publisher').value = b.publisher || '';
  document.getElementById('book-description').value = b.description;

  const coverInput = document.getElementById('book-cover-image');
  const coverPreview = document.getElementById('book-cover-preview');
  const coverStatus = document.getElementById('book-cover-status');
  if (coverInput) coverInput.value = b.coverImage || '';
  if (coverPreview) coverPreview.src = b.coverImage || '/assets/covers/default-placeholder.svg';
  if (coverStatus) coverStatus.textContent = 'Current cover assigned';

  setupCoverLookupListeners();
  document.getElementById('book-modal').classList.remove('hidden');
}

function closeBookModal() {
  document.getElementById('book-modal').classList.add('hidden');
}

function useDefaultPlaceholder() {
  const coverInput = document.getElementById('book-cover-image');
  const coverPreview = document.getElementById('book-cover-preview');
  const coverStatus = document.getElementById('book-cover-status');
  if (coverInput) coverInput.value = '/assets/covers/default-placeholder.svg';
  if (coverPreview) coverPreview.src = '/assets/covers/default-placeholder.svg';
  if (coverStatus) coverStatus.textContent = 'Standard placeholder selected';
}

function setupCoverLookupListeners() {
  const isbnInput = document.getElementById('book-isbn');
  const titleInput = document.getElementById('book-title');
  const coverInput = document.getElementById('book-cover-image');
  const coverPreview = document.getElementById('book-cover-preview');

  if (coverInput && coverPreview) {
    coverInput.oninput = () => {
      const val = coverInput.value.trim();
      coverPreview.src = val || '/assets/covers/default-placeholder.svg';
    };
  }

  if (isbnInput) {
    isbnInput.onblur = () => {
      const currentCover = document.getElementById('book-cover-image')?.value.trim();
      if (!currentCover || currentCover === '/assets/covers/default-placeholder.svg') {
        triggerCoverLookup(false);
      }
    };
  }
}

async function triggerCoverLookup(showUserToast = true) {
  const isbn = document.getElementById('book-isbn')?.value.trim() || '';
  const title = document.getElementById('book-title')?.value.trim() || '';
  const btn = document.getElementById('fetch-cover-btn');
  const coverInput = document.getElementById('book-cover-image');
  const coverPreview = document.getElementById('book-cover-preview');
  const coverStatus = document.getElementById('book-cover-status');

  if (!isbn && !title) {
    if (showUserToast) showToast('Please enter an ISBN or book title first.', 'info');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Searching...</span>';
  }
  if (coverStatus) coverStatus.textContent = 'Searching Open Library & Google Books...';

  try {
    const res = await API.get('/books/cover-lookup', { isbn, title });
    if (res.coverUrl) {
      if (coverInput) coverInput.value = res.coverUrl;
      if (coverPreview) coverPreview.src = res.coverUrl;
      if (coverStatus) {
        coverStatus.textContent = res.found ? `✓ Found via ${res.source}` : 'No cover found - standard placeholder used';
        coverStatus.className = res.found ? 'text-emerald-600 truncate text-[11px] font-semibold' : 'text-slate-500 truncate text-[11px]';
      }
      if (showUserToast) {
        showToast(res.found ? `Cover found from ${res.source}!` : 'No online cover found. Assigned standard placeholder.', res.found ? 'success' : 'info');
      }
    }
  } catch (err) {
    console.warn('Cover lookup failed:', err.message);
    if (coverStatus) coverStatus.textContent = 'Lookup failed - placeholder selected';
    useDefaultPlaceholder();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> Auto-Fetch Cover';
    }
  }
}

async function handleBookFormSubmit(event) {
  event.preventDefault();
  const submitBtn = document.getElementById('save-book-btn');
  const title = document.getElementById('book-title').value.trim();
  const author = document.getElementById('book-author').value.trim();
  const isbn = document.getElementById('book-isbn').value.trim();
  const category = document.getElementById('book-category').value;
  const publishedYear = parseInt(document.getElementById('book-year').value) || 2024;
  const publisher = document.getElementById('book-publisher').value.trim();
  const description = document.getElementById('book-description').value.trim();
  const coverImage = document.getElementById('book-cover-image')?.value.trim() || '';

  // Form field validation
  if (!title) {
    showToast('Book title is required.', 'error');
    document.getElementById('book-title').focus();
    return;
  }
  if (!author) {
    showToast('Author name is required.', 'error');
    document.getElementById('book-author').focus();
    return;
  }
  if (!isbn) {
    showToast('ISBN is required.', 'error');
    document.getElementById('book-isbn').focus();
    return;
  }
  if (!description) {
    showToast('Description is required.', 'error');
    document.getElementById('book-description').focus();
    return;
  }

  const payload = {
    title,
    author,
    isbn,
    category,
    publishedYear,
    publisher,
    description,
    coverImage
  };

  // Double-submission prevention
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Saving to MongoDB...</span>';
  }

  try {
    if (editingBookId) {
      await API.put(`/books/${editingBookId}`, payload);
      showToast(`Book "${title}" updated successfully in MongoDB!`, 'success');
    } else {
      await API.post('/books', payload);
      showToast(`Book "${title}" added successfully to catalogue!`, 'success');
    }
    closeBookModal();
    loadAdminBooks();
    loadDashboardStats();
  } catch (err) {
    console.error('Book save failed:', err);
    showToast(err.message || 'Failed to save book to MongoDB.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Save Book';
    }
  }
}

async function handleDeleteBook(id, title) {
  if (!confirm(`Are you sure you want to permanently delete "${title}" and all its copies from MongoDB?`)) return;

  try {
    await API.delete(`/books/${id}`);
    showToast(`Book "${title}" deleted successfully!`, 'success');
    loadAdminBooks();
  } catch (err) {
    showToast(err.message || 'Failed to delete book', 'error');
  }
}

// 4. Library Management
async function loadAdminLibraries() {
  const container = document.getElementById('admin-libraries-grid');
  if (!container) return;

  try {
    const res = await API.get('/libraries');
    allLibraries = res.data || [];

    container.innerHTML = allLibraries.map(lib => `
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">${lib.code}</span>
            <span class="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">${lib.availableCopies || 0} Books Available</span>
          </div>
          <h4 class="text-base font-bold text-slate-900">${lib.name}</h4>
          <p class="text-xs text-slate-500 mt-1">${lib.address}</p>
          <div class="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-600">
            <div>Hours: <span class="font-medium text-slate-800">${lib.operatingHours}</span></div>
            <div>Contact: <span class="font-medium text-slate-800">${lib.contactNumber}</span></div>
            <div>Base Fee: <span class="font-bold text-teal-700">₹${lib.baseDeliveryFee}</span> (+₹${lib.perKmFee}/km)</div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
          <button onclick="openEditLibraryModal('${lib._id}')" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">Edit</button>
          <button onclick="handleDeleteLibrary('${lib._id}', '${lib.name.replace(/'/g, "\\'")}')" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load libraries:', err);
  }
}

function openAddLibraryModal() {
  editingLibraryId = null;
  document.getElementById('library-modal-title').textContent = 'Add New Library Branch';
  document.getElementById('library-form').reset();
  document.getElementById('library-modal').classList.remove('hidden');
}

function openEditLibraryModal(libId) {
  const lib = allLibraries.find(l => l._id === libId);
  if (!lib) return;

  editingLibraryId = libId;
  document.getElementById('library-modal-title').textContent = `Edit Library: ${lib.name}`;
  document.getElementById('lib-name').value = lib.name;
  document.getElementById('lib-code').value = lib.code;
  document.getElementById('lib-area').value = lib.area;
  document.getElementById('lib-address').value = lib.address;
  document.getElementById('lib-contact').value = lib.contactNumber;
  document.getElementById('lib-email').value = lib.email;
  document.getElementById('lib-hours').value = lib.operatingHours;
  document.getElementById('lib-base-fee').value = lib.baseDeliveryFee || 20;
  document.getElementById('lib-per-km').value = lib.perKmFee || 5;

  document.getElementById('library-modal').classList.remove('hidden');
}

function closeLibraryModal() {
  document.getElementById('library-modal').classList.add('hidden');
}

async function handleLibraryFormSubmit(event) {
  event.preventDefault();
  const payload = {
    name: document.getElementById('lib-name').value.trim(),
    code: document.getElementById('lib-code').value.trim().toUpperCase(),
    area: document.getElementById('lib-area').value.trim(),
    address: document.getElementById('lib-address').value.trim(),
    contactNumber: document.getElementById('lib-contact').value.trim(),
    email: document.getElementById('lib-email').value.trim(),
    operatingHours: document.getElementById('lib-hours').value.trim(),
    baseDeliveryFee: parseFloat(document.getElementById('lib-base-fee').value) || 20,
    perKmFee: parseFloat(document.getElementById('lib-per-km').value) || 5
  };

  try {
    if (editingLibraryId) {
      await API.put(`/libraries/${editingLibraryId}`, payload);
      showToast('Library branch updated in MongoDB!', 'success');
    } else {
      await API.post('/libraries', payload);
      showToast('New library branch added to network!', 'success');
    }
    closeLibraryModal();
    loadAdminLibraries();
  } catch (err) {
    showToast(err.message || 'Operation failed', 'error');
  }
}

async function handleDeleteLibrary(id, name) {
  if (!confirm(`Are you sure you want to delete branch "${name}" from MongoDB?`)) return;

  try {
    await API.delete(`/libraries/${id}`);
    showToast(`Library "${name}" deleted successfully!`, 'success');
    loadAdminLibraries();
  } catch (err) {
    showToast(err.message || 'Failed to delete library', 'error');
  }
}

// 5. Reservation Management & Status Updates
async function loadAdminReservations() {
  const tableBody = document.getElementById('admin-res-table-body');
  const statusFilter = document.getElementById('res-status-filter')?.value || '';
  if (!tableBody) return;

  try {
    const params = statusFilter ? { status: statusFilter } : {};
    const res = await API.get('/reservations', params);
    allReservations = res.data || [];

    tableBody.innerHTML = allReservations.map(r => `
      <tr class="border-b border-slate-100 text-xs hover:bg-slate-50">
        <td class="py-3 px-4 font-mono font-bold text-teal-800">${r.reservationNumber}</td>
        <td class="py-3 px-4">
          <p class="font-bold text-slate-900">${r.bookTitle}</p>
          <span class="text-[10px] text-slate-400 font-mono">${r.libraryName}</span>
        </td>
        <td class="py-3 px-4">
          <p class="font-semibold text-slate-800">${r.userName}</p>
          <p class="text-[10px] text-slate-500">${r.userPhone} • ${r.userEmail}</p>
        </td>
        <td class="py-3 px-4">
          <span class="capitalize font-medium">${r.fulfillmentType}</span>
          ${r.fulfillmentType === 'delivery' ? `<span class="block text-[10px] text-teal-700 font-bold">Fee: ₹${r.deliveryFee}</span>` : '<span class="block text-[10px] text-emerald-600">Free Pickup</span>'}
        </td>
        <td class="py-3 px-4">
          <select 
            onchange="handleUpdateReservationStatus('${r._id}', this.value)"
            class="text-xs p-1.5 rounded-lg border font-bold ${getStatusBadgeClass(r.status)}"
          >
            <option value="Pending" ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Confirmed" ${r.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="Ready for Pickup" ${r.status === 'Ready for Pickup' ? 'selected' : ''}>Ready for Pickup</option>
            <option value="Out for Delivery" ${r.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
            <option value="Completed" ${r.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${r.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load reservations:', err);
  }
}

async function handleUpdateReservationStatus(id, newStatus) {
  try {
    await API.patch(`/reservations/${id}/status`, { status: newStatus });
    showToast(`Reservation status updated to "${newStatus}"!`, 'success');
    loadAdminReservations();
  } catch (err) {
    showToast(err.message || 'Failed to update reservation status', 'error');
  }
}

// 6. Events Management
async function loadAdminEvents() {
  const container = document.getElementById('admin-events-grid');
  if (!container) return;

  try {
    const res = await API.get('/events');
    allEvents = res.data || [];

    container.innerHTML = allEvents.map(evt => `
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100">${evt.eventType}</span>
            <span class="text-xs font-bold ${evt.availableSeats > 0 ? 'text-emerald-600' : 'text-rose-600'}">${evt.availableSeats} of ${evt.totalSeats} seats open</span>
          </div>
          <h4 class="text-base font-bold text-slate-900">${evt.title}</h4>
          <p class="text-xs text-slate-500 mt-1">${evt.venue} • ${evt.time}</p>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
          <button onclick="viewEventRegistrations('${evt._id}', '${evt.title.replace(/'/g, "\\'")}')" class="text-xs font-bold text-teal-700 hover:underline">
            View Registrations
          </button>
          <div class="flex gap-2">
            <button onclick="handleDeleteEvent('${evt._id}', '${evt.title.replace(/'/g, "\\'")}')" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load admin events:', err);
  }
}

function openAddEventModal() {
  document.getElementById('event-form').reset();
  document.getElementById('event-modal').classList.remove('hidden');
}

function closeEventAdminModal() {
  document.getElementById('event-modal').classList.add('hidden');
}

async function handleEventFormSubmit(event) {
  event.preventDefault();
  const payload = {
    title: document.getElementById('evt-admin-title').value.trim(),
    eventType: document.getElementById('evt-admin-type').value,
    description: document.getElementById('evt-admin-desc').value.trim(),
    date: document.getElementById('evt-admin-date').value,
    time: document.getElementById('evt-admin-time').value.trim(),
    venue: document.getElementById('evt-admin-venue').value.trim(),
    totalSeats: parseInt(document.getElementById('evt-admin-seats').value) || 30,
    speakerOrHost: document.getElementById('evt-admin-host').value.trim()
  };

  try {
    await API.post('/events', payload);
    showToast('New event created in MongoDB!', 'success');
    closeEventAdminModal();
    loadAdminEvents();
  } catch (err) {
    showToast(err.message || 'Failed to create event', 'error');
  }
}

async function handleDeleteEvent(id, title) {
  if (!confirm(`Delete event "${title}"?`)) return;
  try {
    await API.delete(`/events/${id}`);
    showToast('Event deleted successfully!', 'success');
    loadAdminEvents();
  } catch (err) {
    showToast(err.message || 'Failed to delete event', 'error');
  }
}

async function viewEventRegistrations(id, title) {
  try {
    const res = await API.get(`/events/${id}/registrations`);
    const regs = res.data || [];
    alert(`Registered Attendees for "${title}" (${regs.length}):\n\n` + 
      (regs.length > 0 
        ? regs.map(r => `• ${r.userName} (${r.userEmail}) - ${r.registrationNumber}`).join('\n')
        : 'No participants registered yet.'));
  } catch (err) {
    showToast(err.message || 'Failed to load registrations', 'error');
  }
}

// 7. Inventory & Physical Book Copies
async function loadAdminCopies() {
  const tableBody = document.getElementById('admin-copies-table-body');
  if (!tableBody) return;

  try {
    const res = await API.get('/admin/inventory/copies');
    const copies = res.data || [];

    tableBody.innerHTML = copies.map(c => `
      <tr class="border-b border-slate-100 text-xs hover:bg-slate-50">
        <td class="py-3 px-4 font-mono font-bold text-slate-800">${c.copyBarcode}</td>
        <td class="py-3 px-4 font-bold text-slate-900">${c.book?.title || 'Unknown Book'}</td>
        <td class="py-3 px-4 text-slate-700">${c.library?.name || 'Unknown Library'}</td>
        <td class="py-3 px-4 font-mono text-[11px]">${c.rackLocation || 'Row A'}</td>
        <td class="py-3 px-4 font-semibold text-slate-600">${c.condition}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
            ${c.status}
          </span>
        </td>
      </tr>
    `).join('');

    // Also populate library and book select dropdowns in Add Copy modal
    populateCopyModalSelects();
  } catch (err) {
    console.error('Failed to load book copies:', err);
  }
}

async function populateCopyModalSelects() {
  const bookSelect = document.getElementById('copy-book-select');
  const libSelect = document.getElementById('copy-lib-select');

  if (bookSelect && allBooks.length > 0) {
    bookSelect.innerHTML = allBooks.map(b => `<option value="${b._id}">${b.title} (${b.isbn})</option>`).join('');
  } else if (bookSelect) {
    // Fetch books if not yet loaded into allBooks
    bookSelect.innerHTML = '<option value="">Loading books...</option>';
    try {
      const res = await API.get('/books?limit=200');
      allBooks = res.data || [];
      bookSelect.innerHTML = allBooks.length > 0
        ? allBooks.map(b => `<option value="${b._id}">${b.title} (${b.isbn})</option>`).join('')
        : '<option value="">No books found in catalogue</option>';
    } catch (err) {
      console.error('Failed to fetch books for copy modal:', err);
      bookSelect.innerHTML = '<option value="">Error loading books</option>';
    }
  }

  if (libSelect && allLibraries.length > 0) {
    libSelect.innerHTML = allLibraries.map(l => `<option value="${l._id}">${l.name} (${l.code})</option>`).join('');
  } else if (libSelect) {
    // Always fetch libraries fresh — allLibraries is only populated after visiting Manage Libraries tab
    libSelect.innerHTML = '<option value="">Loading library branches...</option>';
    try {
      const res = await API.get('/libraries');
      allLibraries = res.data || [];
      libSelect.innerHTML = allLibraries.length > 0
        ? allLibraries.map(l => `<option value="${l._id}">${l.name} (${l.code})</option>`).join('')
        : '<option value="">No library branches found — add one first</option>';
    } catch (err) {
      console.error('Failed to fetch libraries for copy modal:', err);
      libSelect.innerHTML = '<option value="">Error loading branches — please retry</option>';
      showToast('Could not load library branches. Please try again.', 'error');
    }
  }
}

async function openAddCopyModal() {
  document.getElementById('copy-modal')?.classList.remove('hidden');

  // Always fetch fresh data when modal opens to avoid stale / empty dropdowns
  const bookSelect = document.getElementById('copy-book-select');
  const libSelect = document.getElementById('copy-lib-select');

  if (bookSelect) bookSelect.innerHTML = '<option value="">Loading books...</option>';
  if (libSelect) libSelect.innerHTML = '<option value="">Loading library branches...</option>';

  // Fetch books and libraries in parallel
  const [booksResult, libsResult] = await Promise.allSettled([
    API.get('/books?limit=200'),
    API.get('/libraries')
  ]);

  if (bookSelect) {
    if (booksResult.status === 'fulfilled') {
      allBooks = booksResult.value.data || [];
      bookSelect.innerHTML = allBooks.length > 0
        ? allBooks.map(b => `<option value="${b._id}">${b.title} (${b.isbn})</option>`).join('')
        : '<option value="">No books in catalogue</option>';
    } else {
      bookSelect.innerHTML = '<option value="">Error loading books — please retry</option>';
      showToast('Could not load book list.', 'error');
    }
  }

  if (libSelect) {
    if (libsResult.status === 'fulfilled') {
      allLibraries = libsResult.value.data || [];
      libSelect.innerHTML = allLibraries.length > 0
        ? allLibraries.map(l => `<option value="${l._id}">${l.name} (${l.code})</option>`).join('')
        : '<option value="">No library branches found — add one first</option>';
    } else {
      libSelect.innerHTML = '<option value="">Error loading branches — please retry</option>';
      showToast('Could not load library branches.', 'error');
    }
  }
}

function closeCopyModal() {
  document.getElementById('copy-modal')?.classList.add('hidden');
}

async function handleCopyFormSubmit(event) {
  event.preventDefault();
  const bookId = document.getElementById('copy-book-select').value;
  const libraryId = document.getElementById('copy-lib-select').value;
  const rackLocation = document.getElementById('copy-rack').value.trim();
  const condition = document.getElementById('copy-condition').value;

  try {
    await API.post('/admin/inventory/copies', { bookId, libraryId, rackLocation, condition });
    showToast('New physical copy registered into library inventory!', 'success');
    closeCopyModal();
    loadAdminCopies();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message || 'Failed to add book copy', 'error');
  }
}

