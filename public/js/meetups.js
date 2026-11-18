// Meetups & Events Page Logic
let currentEvents = [];
let selectedEventForRegistration = null;

document.addEventListener('DOMContentLoaded', async () => {
  initNavigation('meetups');

  // Check if a specific event was opened via query params
  const urlParams = new URLSearchParams(window.location.search);
  const targetEventId = urlParams.get('eventId');

  await loadEvents();

  if (targetEventId) {
    const target = currentEvents.find(e => e._id === targetEventId);
    if (target) {
      openRegistrationModal(target._id, target.title, target.venue, target.availableSeats);
    }
  }

  // Filter handlers
  document.getElementById('event-type-filter')?.addEventListener('change', () => loadEvents());
  document.getElementById('event-search-input')?.addEventListener('input', debounce(() => loadEvents(), 300));
});

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

async function loadEvents() {
  const container = document.getElementById('events-grid');
  const countLabel = document.getElementById('events-count-label');
  if (!container) return;

  const type = document.getElementById('event-type-filter')?.value || 'All';
  const q = document.getElementById('event-search-input')?.value.trim() || '';

  const userLoc = LocationService.getCurrentLocation();
  const params = { type, q };
  if (userLoc && userLoc.lat && userLoc.lng) {
    params.userLat = userLoc.lat;
    params.userLng = userLoc.lng;
  }

  try {
    const res = await API.get('/events', params);
    currentEvents = res.data || [];

    if (countLabel) {
      countLabel.textContent = `Showing ${currentEvents.length} community learning events`;
    }

    if (currentEvents.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-2xl text-slate-400 mb-4">📅</div>
          <h3 class="text-lg font-bold text-slate-900 mb-1">No meetups found</h3>
          <p class="text-xs text-slate-500 max-w-sm mx-auto">Try clearing search terms or selecting "All Event Types".</p>
        </div>
      `;
      return;
    }

    container.innerHTML = currentEvents.map(evt => {
      const dateObj = new Date(evt.date);
      const dateFormatted = dateObj.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      return `
        <div class="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-teal-300 transition-all">
          <div>
            <!-- Banner Image -->
            <div class="relative bg-slate-900 h-44 overflow-hidden">
              <img 
                src="${evt.bannerImage || '/assets/events/event-club.svg'}" 
                alt="${evt.title}" 
                class="w-full h-full object-cover"
                onerror="this.src='/assets/events/event-club.svg'"
              />
              <div class="absolute top-3 left-3 flex gap-2">
                <span class="px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-900/80 text-teal-300 backdrop-blur-sm border border-slate-700">
                  ${evt.eventType}
                </span>
              </div>
              <div class="absolute bottom-3 right-3">
                <span class="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-900/85 text-white backdrop-blur-sm">
                  ${evt.distanceLabel}
                </span>
              </div>
            </div>

            <!-- Content Area -->
            <div class="p-6">
              <h3 class="text-lg font-bold text-slate-900 mb-2 leading-snug">${evt.title}</h3>
              <p class="text-xs text-slate-500 line-clamp-3 mb-4 leading-relaxed">${evt.description}</p>

              <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-600 mb-4">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  <span class="font-medium text-slate-900">${dateFormatted} • ${evt.time}</span>
                </div>

                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                  <span class="truncate">${evt.venue}</span>
                </div>

                ${evt.speakerOrHost ? `
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    <span class="text-slate-500">Host: <strong class="text-slate-800">${evt.speakerOrHost}</strong></span>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Bottom Action Bar -->
          <div class="p-6 pt-0 border-t border-slate-100 flex items-center justify-between gap-4 mt-2">
            <div>
              <span class="block text-[10px] uppercase font-bold text-slate-400">Availability</span>
              <span class="text-xs font-bold ${evt.availableSeats > 5 ? 'text-emerald-600' : evt.availableSeats > 0 ? 'text-amber-600' : 'text-rose-600'}">
                ${evt.availableSeats > 0 ? `${evt.availableSeats} of ${evt.totalSeats} seats open` : 'Fully Booked'}
              </span>
            </div>

            ${evt.availableSeats > 0 ? `
              <button 
                onclick="openRegistrationModal('${evt._id}', '${evt.title.replace(/'/g, "\\'")}', '${evt.venue.replace(/'/g, "\\'")}', ${evt.availableSeats})"
                class="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition-colors"
              >
                Register Free
              </button>
            ` : `
              <button disabled class="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-400 text-xs font-semibold cursor-not-allowed">
                Waitlist Full
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load events:', err);
    container.innerHTML = '<p class="text-rose-600 col-span-full text-center py-12">Failed to load events from server.</p>';
  }
}

// Open Event Registration Modal
function openRegistrationModal(eventId, eventTitle, eventVenue, seats) {
  selectedEventForRegistration = { id: eventId, title: eventTitle, venue: eventVenue, seats };

  const modal = document.getElementById('event-modal');
  if (!modal) return;

  document.getElementById('modal-event-title').textContent = eventTitle;
  document.getElementById('modal-event-venue').textContent = eventVenue;
  document.getElementById('modal-event-seats').textContent = `${seats} seats currently available`;

  modal.classList.remove('hidden');
}

function closeEventModal() {
  const modal = document.getElementById('event-modal');
  if (modal) modal.classList.add('hidden');
}

// Handle Event Registration Submission
async function handleEventRegistration(event) {
  event.preventDefault();
  const btn = document.getElementById('event-submit-btn');
  if (!btn || !selectedEventForRegistration) return;

  const userName = document.getElementById('evt-user-name').value.trim();
  const userEmail = document.getElementById('evt-user-email').value.trim();
  const userPhone = document.getElementById('evt-user-phone').value.trim();

  if (!userName || !userEmail || !userPhone) {
    showToast('Please fill in your name, email and phone number.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span>Registering in MongoDB...</span>';

  try {
    const res = await API.post(`/events/${selectedEventForRegistration.id}/register`, {
      userName,
      userEmail,
      userPhone
    });

    closeEventModal();
    showEventSuccessDialog(res.data);
    loadEvents(); // Reload to refresh seat counts
  } catch (err) {
    console.error('Registration failed:', err);
    showToast(err.message || 'Registration failed. You may already be registered.', 'error');
    btn.disabled = false;
    btn.innerHTML = '<span>Confirm Free Registration</span>';
  }
}

function showEventSuccessDialog(data) {
  const modal = document.getElementById('event-success-modal');
  const body = document.getElementById('event-success-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="text-center py-4">
      <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-4 shadow-sm">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
      </div>

      <h3 class="text-2xl font-extrabold text-slate-900 font-serif mb-1">Registration Confirmed!</h3>
      <p class="text-xs text-slate-500 mb-6">Your seat is reserved in MongoDB</p>

      <div class="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left space-y-2.5 mb-6 text-xs">
        <div class="flex justify-between items-center pb-2 border-b border-slate-200">
          <span class="text-slate-500 font-medium">Pass Number:</span>
          <span class="font-mono font-bold text-teal-700 text-sm">${data.registrationNumber}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-500 font-medium">Participant:</span>
          <span class="font-bold text-slate-900">${data.registeredName}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-500 font-medium">Event:</span>
          <span class="font-bold text-slate-900 text-right">${data.eventTitle}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-500 font-medium">Venue:</span>
          <span class="text-slate-700 text-right">${data.venue}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-500 font-medium">Timing:</span>
          <span class="font-medium text-teal-800">${data.time}</span>
        </div>
      </div>

      <button 
        onclick="document.getElementById('event-success-modal').classList.add('hidden')"
        class="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
      >
        Done & View All Meetups
      </button>
    </div>
  `;

  modal.classList.remove('hidden');
}
