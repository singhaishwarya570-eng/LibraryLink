// Books & Multi-Library Finder Logic
let currentBooks = [];
let selectedBook = null;
let currentAvailabilityData = null;
let selectedLibraryForReservation = null;

document.addEventListener('DOMContentLoaded', async () => {
  initNavigation('books');

  // Parse URL query params (e.g. ?q=clean or ?category=fiction or ?bookId=xxx)
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q') || '';
  const initialCategory = urlParams.get('category') || 'All';
  const targetBookId = urlParams.get('bookId');

  const searchInput = document.getElementById('search-input');
  if (searchInput && initialQuery) {
    searchInput.value = initialQuery;
  }

  // Populate categories filter
  await loadCategories();

  if (initialCategory !== 'All') {
    const categorySelect = document.getElementById('category-filter');
    if (categorySelect) categorySelect.value = initialCategory;
  }

  // Load books catalog
  await loadBooks();

  // If a specific bookId was linked, auto-open its availability modal
  if (targetBookId) {
    openAvailabilityModal(targetBookId);
  }

  // Setup search, filter, and location event listeners
  setupEventListeners();
});

function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  const availableOnlyFilter = document.getElementById('available-only-filter');
  const sortFilter = document.getElementById('sort-filter');
  const locationPreset = document.getElementById('location-preset');
  const liveGpsBtn = document.getElementById('use-live-gps-btn');

  // Debounced search
  let debounceTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => loadBooks(), 300);
    });
  }

  if (categoryFilter) categoryFilter.addEventListener('change', () => loadBooks());
  if (availableOnlyFilter) availableOnlyFilter.addEventListener('change', () => loadBooks());
  if (sortFilter) sortFilter.addEventListener('change', () => loadBooks());

  if (locationPreset) {
    locationPreset.addEventListener('change', (e) => {
      const presetKey = e.target.value;
      if (LocationService.PRESETS[presetKey]) {
        LocationService.setLocation(LocationService.PRESETS[presetKey]);
        showToast(`Reference location set to ${LocationService.PRESETS[presetKey].name}`, 'info');
        if (selectedBook) {
          refreshAvailabilityView();
        }
      }
    });
  }

  if (liveGpsBtn) {
    liveGpsBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser.', 'error');
        return;
      }
      liveGpsBtn.disabled = true;
      liveGpsBtn.innerHTML = '<span>Detecting GPS...</span>';

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const liveLoc = {
            name: 'Live GPS Location',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            isLive: true
          };
          LocationService.setLocation(liveLoc);
          showToast(`Live GPS detected: [${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}]`, 'success');
          liveGpsBtn.disabled = false;
          liveGpsBtn.innerHTML = '<span class="text-emerald-400"><span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>Live GPS Active</span></span>';
          if (selectedBook) {
            refreshAvailabilityView();
          }
        },
        (err) => {
          console.warn('GPS Error:', err.message);
          showToast(`GPS location permission denied: ${err.message}. Using default Mira Road reference.`, 'info');
          liveGpsBtn.disabled = false;
          liveGpsBtn.innerHTML = '<span>Use My GPS</span>';
        },
        { timeout: 7000 }
      );
    });
  }
}

async function loadCategories() {
  try {
    const res = await API.get('/books');
    const categories = res.categories || [];
    const select = document.getElementById('category-filter');
    if (!select) return;

    select.innerHTML = '<option value="All">All Categories</option>' +
      categories.map(c => `<option value="${c}">${c}</option>`).join('');
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

async function loadBooks() {
  const container = document.getElementById('books-grid');
  const countLabel = document.getElementById('books-count-label');
  if (!container) return;

  const q = document.getElementById('search-input')?.value.trim() || '';
  const category = document.getElementById('category-filter')?.value || 'All';
  const availableOnly = document.getElementById('available-only-filter')?.checked || false;
  const sort = document.getElementById('sort-filter')?.value || 'title';

  container.innerHTML = `
    <div class="col-span-full py-16 text-center text-slate-400 flex flex-col items-center">
      <div class="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p class="text-sm">Searching network catalog...</p>
    </div>
  `;

  try {
    const params = { q, category, availableOnly, sort };
    const res = await API.get('/books', params);
    currentBooks = res.data || [];

    if (countLabel) {
      countLabel.textContent = `Showing ${currentBooks.length} of ${res.total} books in network`;
    }

    if (currentBooks.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-2xl text-slate-400 mb-4">ðŸ“–</div>
          <h3 class="text-lg font-bold text-slate-900 mb-1">No matching books found</h3>
          <p class="text-xs text-slate-500 max-w-sm mx-auto mb-4">Try searching for other keywords like "Code", "Fiction", or "Habits", or clear your category filter.</p>
          <button onclick="resetFilters()" class="px-4 py-2 text-xs font-semibold bg-teal-600 text-white rounded-lg">Reset Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = currentBooks.map(book => `
      <div class="book-card bg-white rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between group shadow-sm">
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
          <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">${book.description}</p>
        </div>

        <div class="pt-3 border-t border-slate-100 mt-2">
          <div class="flex items-center justify-between text-xs mb-3">
            <span class="text-slate-500 text-[11px]">Network Stock:</span>
            <span class="font-semibold text-xs ${book.availableCopiesCount > 0 ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded' : 'text-rose-700 bg-rose-50 px-2 py-0.5 rounded'}">
              ${book.availableCopiesCount > 0 ? `${book.availableCopiesCount} copies ready` : 'Out of Stock'}
            </span>
          </div>

          <button 
            onclick="openAvailabilityModal('${book._id}')" 
            class="w-full py-2.5 px-3 rounded-xl bg-slate-900 text-white hover:bg-teal-700 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 group-hover:bg-teal-700"
          >
            <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            Compare Libraries & Reserve
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load books:', err);
    container.innerHTML = '<p class="text-rose-600 col-span-full text-center py-12">Failed to load books from server. Please verify backend connection.</p>';
  }
}

function resetFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('category-filter').value = 'All';
  document.getElementById('available-only-filter').checked = false;
  document.getElementById('sort-filter').value = 'title';
  loadBooks();
}

// Module 2: Smart Multi-Library Book Finder Modal
async function openAvailabilityModal(bookId) {
  const modal = document.getElementById('availability-modal');
  const modalBody = document.getElementById('availability-modal-body');
  if (!modal || !modalBody) return;

  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');

  modalBody.innerHTML = `
    <div class="py-16 text-center text-slate-400 flex flex-col items-center">
      <div class="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p class="text-sm">Calculating Haversine distances & delivery fees across Mira-Bhayandar...</p>
    </div>
  `;

  try {
    const userLoc = LocationService.getCurrentLocation();
    const params = {
      sortBy: document.getElementById('modal-sort-select')?.value || 'nearest'
    };
    if (userLoc && userLoc.lat && userLoc.lng) {
      params.userLat = userLoc.lat;
      params.userLng = userLoc.lng;
    }

    const res = await API.get(`/books/${bookId}/availability`, params);
    currentAvailabilityData = res;
    selectedBook = res.book;

    renderAvailabilityModalContent();
  } catch (err) {
    console.error('Failed to fetch book availability:', err);
    modalBody.innerHTML = `
      <div class="p-8 text-center text-rose-600">
        <p class="font-bold mb-2">Error loading availability</p>
        <p class="text-xs text-slate-500">${err.message}</p>
      </div>
    `;
  }
}

function refreshAvailabilityView() {
  if (selectedBook && selectedBook.id) {
    openAvailabilityModal(selectedBook.id);
  }
}

function renderAvailabilityModalContent() {
  const modalBody = document.getElementById('availability-modal-body');
  if (!modalBody || !currentAvailabilityData) return;

  const { book, comparison, userLocation } = currentAvailabilityData;

  modalBody.innerHTML = `
    <!-- Book Summary Header -->
    <div class="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-6 bg-slate-900 text-white rounded-2xl mb-6">
      <div class="w-24 sm:w-28 aspect-[3/4] flex-shrink-0 rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-slate-800 p-1 flex items-center justify-center">
        <img 
          src="${book.coverImage}" 
          alt="${book.title}" 
          class="w-full h-full object-contain"
          onerror="handleImageError(this, '${book.title.replace(/'/g, "\\'")}', '${book.author.replace(/'/g, "\\'")}')"
        />
      </div>
      <div class="flex-1 text-center sm:text-left">
        <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
          <span class="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
            ${book.category}
          </span>
          <span class="text-xs font-mono text-slate-400">ISBN: ${book.isbn}</span>
        </div>
        <h2 class="text-xl sm:text-2xl font-extrabold font-serif mb-1 leading-tight">${book.title}</h2>
        <p class="text-xs text-slate-300 mb-3">Author: <span class="text-white font-semibold">${book.author}</span></p>

        <div class="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs">
          <div class="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <span class="text-slate-400">Total Network Copies:</span>
            <span class="font-bold text-white">${book.totalCopiesCount}</span>
          </div>
          <div class="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <span class="text-slate-400">Ready to Borrow:</span>
            <span class="font-bold text-emerald-400">${book.availableCopiesCount} copies</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Distance Reference & Sorting Bar -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-teal-50/60 rounded-xl border border-teal-100 mb-6 text-xs">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-teal-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        <span class="text-slate-700">
          <strong>Reference Point:</strong> ${userLocation.note}
        </span>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0">
        <label for="modal-sort-select" class="font-bold text-slate-700">Sort By:</label>
        <select 
          id="modal-sort-select" 
          onchange="onModalSortChange()" 
          class="bg-white border border-teal-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="nearest">Nearest Distance (Haversine)</option>
          <option value="cheapest_delivery">Lowest Delivery Charge</option>
          <option value="highest_availability">Highest Book Availability</option>
        </select>
      </div>
    </div>

    <!-- Multi-Library Comparison Cards -->
    <div class="space-y-4">
      <h3 class="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
        <span>Participating Library Branches (${comparison.length})</span>
        <span class="text-[11px] font-normal lowercase text-slate-400">Transparent comparison of stock, distance & fee</span>
      </h3>

      ${comparison.map((item, idx) => `
        <div class="p-5 rounded-2xl border ${item.availableCopies > 0 ? 'border-slate-200/90 bg-white hover:border-teal-300' : 'border-slate-200 bg-slate-50/70 opacity-80'} transition-all shadow-sm">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            <!-- Library Details -->
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1.5">
                <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  ${item.code}
                </span>
                <span class="text-xs font-semibold ${item.availableCopies > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'} px-2 py-0.5 rounded-full">
                  ${item.stockStatus} (${item.availableCopies}/${item.totalCopies} copies)
                </span>
                ${idx === 0 ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-600 text-white">Top Recommendation</span>' : ''}
              </div>

              <h4 class="text-base font-bold text-slate-900 leading-snug">${item.libraryName}</h4>
              <p class="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                ${item.address}
              </p>
            </div>

            <!-- Distance & Pricing Matrix -->
            <div class="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center min-w-[280px]">
              <div>
                <span class="block text-[10px] uppercase font-bold text-slate-400">Distance</span>
                <span class="text-sm font-extrabold text-slate-900">${window.formatDistance ? window.formatDistance(item.distanceKm) : item.distanceKm + ' km'}</span>
                <span class="block text-[9px] text-slate-500 truncate" title="${item.distanceLabel}">
                  ${item.isLiveDistance ? 'GPS Live' : 'Estimated'}
                </span>
              </div>

              <div>
                <span class="block text-[10px] uppercase font-bold text-slate-400">Self Pickup</span>
                <span class="text-sm font-extrabold ${item.pickup.available ? 'text-emerald-600' : 'text-slate-400'}">
                  ${item.pickup.available ? 'FREE' : 'N/A'}
                </span>
                <span class="block text-[9px] text-slate-500">Counter Desk</span>
              </div>

              <div>
                <span class="block text-[10px] uppercase font-bold text-slate-400">Home Delivery</span>
                <span class="text-sm font-extrabold ${item.delivery.available ? 'text-teal-700' : 'text-slate-400'}">
                  ${item.delivery.available ? (window.formatINR ? window.formatINR(item.delivery.estimatedCharge) : '₹' + item.delivery.estimatedCharge) : 'N/A'}
                </span>
                <span class="block text-[9px] text-slate-500">Doorstep</span>
              </div>
            </div>

            <!-- Action Button -->
            <div class="flex-shrink-0">
              ${item.availableCopies > 0 ? `
                <button 
                  onclick="openReservationForm('${item.libraryId}', '${item.libraryName.replace(/'/g, "\\'")}', ${item.distanceKm}, ${item.delivery.estimatedCharge})"
                  class="w-full lg:w-auto px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Reserve from This Branch</span>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
              ` : `
                <button disabled class="w-full lg:w-auto px-4 py-2.5 rounded-xl bg-slate-200 text-slate-400 text-xs font-semibold cursor-not-allowed">
                  Out of Stock Here
                </button>
              `}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function onModalSortChange() {
  const sort = document.getElementById('modal-sort-select').value;
  if (!currentAvailabilityData) return;

  const comparison = currentAvailabilityData.comparison;
  if (sort === 'nearest') {
    comparison.sort((a, b) => a.distanceKm - b.distanceKm);
  } else if (sort === 'cheapest_delivery') {
    comparison.sort((a, b) => a.delivery.estimatedCharge - b.delivery.estimatedCharge);
  } else if (sort === 'highest_availability') {
    comparison.sort((a, b) => b.availableCopies - a.availableCopies);
  }

  renderAvailabilityModalContent();
  document.getElementById('modal-sort-select').value = sort;
}

function closeAvailabilityModal() {
  const modal = document.getElementById('availability-modal');
  if (modal) modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

// Module 3: Book Reservation Form & Modal
function openReservationForm(libraryId, libraryName, distanceKm, estimatedDeliveryFee) {
  selectedLibraryForReservation = {
    id: libraryId,
    name: libraryName,
    distanceKm,
    estimatedDeliveryFee
  };

  const formModal = document.getElementById('reservation-modal');
  if (!formModal || !selectedBook) return;

  document.getElementById('res-book-title').textContent = selectedBook.title;
  document.getElementById('res-book-author').textContent = `by ${selectedBook.author}`;
  document.getElementById('res-library-name').textContent = libraryName;
  document.getElementById('res-distance-km').textContent = `${window.formatDistance ? window.formatDistance(distanceKm) : distanceKm + ' km'} (Est.)`;
  document.getElementById('res-delivery-fee-badge').textContent = window.formatINR ? window.formatINR(estimatedDeliveryFee) : '₹' + estimatedDeliveryFee;

  // Default to pickup
  document.getElementById('fulfillment-pickup').checked = true;
  toggleFulfillmentFields('pickup');

  formModal.classList.remove('hidden');
}

function closeReservationModal() {
  const formModal = document.getElementById('reservation-modal');
  if (formModal) formModal.classList.add('hidden');
}

function toggleFulfillmentFields(type) {
  const deliveryFields = document.getElementById('delivery-fields');
  const feeDisplay = document.getElementById('res-fee-summary');

  if (type === 'delivery') {
    if (deliveryFields) deliveryFields.classList.remove('hidden');
    if (feeDisplay) {
      const feeVal = selectedLibraryForReservation?.estimatedDeliveryFee || 20;
      feeDisplay.textContent = `${window.formatINR ? window.formatINR(feeVal) : '₹' + feeVal} (Payable on delivery)`;
      feeDisplay.className = 'font-bold text-teal-700';
    }
  } else {
    if (deliveryFields) deliveryFields.classList.add('hidden');
    if (feeDisplay) {
      feeDisplay.textContent = 'FREE (Pick up at library counter)';
      feeDisplay.className = 'font-bold text-emerald-600';
    }
  }
}

// Submit Reservation
async function handleReservationSubmit(event) {
  event.preventDefault();
  const submitBtn = document.getElementById('res-submit-btn');
  if (!submitBtn) return;

  const fulfillmentType = document.querySelector('input[name="fulfillmentType"]:checked')?.value || 'pickup';
  const userName = document.getElementById('res-user-name').value.trim();
  const userEmail = document.getElementById('res-user-email').value.trim();
  const userPhone = document.getElementById('res-user-phone').value.trim();
  const deliveryAddress = document.getElementById('res-delivery-address')?.value.trim() || '';
  const deliveryNotes = document.getElementById('res-delivery-notes')?.value.trim() || '';

  if (!userName || !userEmail || !userPhone) {
    showToast('Please enter your full name, email, and phone number.', 'error');
    return;
  }

  if (fulfillmentType === 'delivery' && !deliveryAddress) {
    showToast('Please enter your delivery street address in Mira-Bhayandar.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Reserving in MongoDB...</span>';

  try {
    const payload = {
      bookId: selectedBook.id,
      libraryId: selectedLibraryForReservation.id,
      userName,
      userEmail,
      userPhone,
      fulfillmentType,
      deliveryAddress,
      deliveryNotes,
      distanceKm: selectedLibraryForReservation.distanceKm
    };

    const res = await API.post('/reservations', payload);
    const reservation = res.data;

    // Show Confirmation Dialog
    closeReservationModal();
    closeAvailabilityModal();
    showConfirmationDialog(reservation);

    // Refresh books catalog to reflect updated available copy counts
    loadBooks();
  } catch (err) {
    console.error('Reservation submission failed:', err);
    showToast(err.message || 'Failed to place reservation. Please try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Confirm & Reserve Book</span>';
  }
}

function showConfirmationDialog(reservation) {
  const confirmModal = document.getElementById('confirmation-modal');
  const confirmBody = document.getElementById('confirmation-modal-body');
  if (!confirmModal || !confirmBody) return;

  confirmBody.innerHTML = `
    <div class="text-center py-4">
      <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-4 shadow-sm">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
      </div>

      <h3 class="text-2xl font-extrabold text-slate-900 font-serif mb-1">Reservation Confirmed!</h3>
      <p class="text-xs text-slate-500 mb-6">Saved persistently in MongoDB database</p>

      <div class="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left space-y-3 mb-6 text-xs">
        <div class="flex justify-between items-center pb-2.5 border-b border-slate-200">
          <span class="text-slate-500 font-medium">Reservation Number:</span>
          <span class="font-mono font-bold text-teal-700 text-sm">${reservation.reservationNumber}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-500 font-medium">Book:</span>
          <span class="font-bold text-slate-900 text-right">${reservation.bookTitle}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-500 font-medium">Library Branch:</span>
          <span class="font-bold text-slate-900 text-right">${reservation.libraryName}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-500 font-medium">Fulfillment Option:</span>
          <span class="font-bold text-slate-900 capitalize">${reservation.fulfillmentType === 'pickup' ? 'Free Self-Pickup' : 'Home Delivery'}</span>
        </div>
        ${reservation.fulfillmentType === 'delivery' ? `
          <div class="flex justify-between items-center">
            <span class="text-slate-500 font-medium">Delivery Address:</span>
            <span class="text-slate-800 text-right max-w-[200px] truncate">${reservation.deliveryAddress}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500 font-medium">Estimated Delivery Charge:</span>
            <span class="font-bold text-teal-700">${window.formatINR ? window.formatINR(reservation.deliveryFee) : '₹' + reservation.deliveryFee}</span>
          </div>
        ` : ''}
        <div class="flex justify-between items-center pt-2.5 border-t border-slate-200">
          <span class="text-slate-500 font-medium">Current Status:</span>
          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">${reservation.status}</span>
        </div>
      </div>

      <p class="text-[11px] text-slate-400 mb-6">
        Your reservation is saved. <a href='/user-dashboard.html' class='text-teal-600 underline font-medium'>View in My Dashboard</a> or check the Admin Portal.
      </p>

      <button 
        onclick="document.getElementById('confirmation-modal').classList.add('hidden')"
        class="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
      >
        Done & Browse More Books
      </button>
    </div>
  `;

  confirmModal.classList.remove('hidden');
}

