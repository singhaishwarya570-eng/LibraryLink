// Reading Challenge Multi-User Page Logic
let currentProgressData = null;

document.addEventListener('DOMContentLoaded', async () => {
  initNavigation('challenge');

  // Load community statistics & leaderboard
  await loadCommunityStats();

  // Load authenticated user progress (or prompt guest)
  await loadAuthenticatedUserProgress();
});

async function loadCommunityStats() {
  try {
    const res = await API.get('/reading-progress/community-stats');
    const stats = res.data;

    document.getElementById('comm-readers').textContent = stats.totalReaders || 0;
    document.getElementById('comm-books').textContent = stats.totalBooksCompleted || 0;
    document.getElementById('comm-hours').textContent = `${stats.totalReadingHours || 0} hrs`;
    document.getElementById('comm-avg-goal').textContent = `${stats.averageYearlyGoal || 12} books`;

    // Leaderboard
    const lbContainer = document.getElementById('community-leaderboard');
    if (lbContainer && stats.topReaders) {
      if (stats.topReaders.length === 0) {
        lbContainer.innerHTML = '<p class="text-xs text-slate-400 py-3 text-center">No reading entries yet.</p>';
      } else {
        lbContainer.innerHTML = stats.topReaders.map((r, i) => `
          <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <div class="flex items-center gap-2.5">
              <span class="w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                i === 0 ? 'bg-amber-100 text-amber-800' : i === 1 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-600'
              }">${i + 1}</span>
              <div>
                <p class="font-bold text-slate-900">${escapeHtml(r.userName)}</p>
                <p class="text-[10px] text-slate-400">Streak: ${r.streak || 0} days 🔥</p>
              </div>
            </div>
            <div class="text-right">
              <span class="font-bold text-teal-700">${r.booksCompleted}</span>
              <span class="text-slate-400">/${r.yearlyGoal} books</span>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load community stats:', err);
  }
}

async function loadAuthenticatedUserProgress() {
  const container = document.getElementById('progress-container');
  const headerBox = document.getElementById('user-challenge-header-box');
  if (!container) return;

  const currentUser = API.getCurrentUser();
  const isLoggedIn = API.isUserLoggedIn();

  if (!isLoggedIn || !currentUser) {
    // Guest state
    if (headerBox) {
      headerBox.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          <span class="text-slate-300">Guest Visitor</span>
        </div>
        <p class="text-[11px] text-slate-400 mt-1 mb-2">Sign in to track your personal reading goal.</p>
        <a href="/user-signin.html" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors">
          Sign In / Register
        </a>
      `;
    }

    container.innerHTML = `
      <div class="text-center py-10 px-4">
        <div class="w-16 h-16 bg-teal-50 text-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-teal-100 shadow-sm">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
        </div>
        <h3 class="text-xl font-extrabold text-slate-900 font-serif mb-2">Start Your 2026 Reading Journey</h3>
        <p class="text-xs text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
          Sign in to your LibraryLink account to set your personal yearly target, log finished books, build daily reading streaks, and contribute to Mira-Bhayandar's community index.
        </p>
        <div class="flex items-center justify-center gap-3">
          <a href="/user-signin.html" class="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition-colors">
            Sign In to Account
          </a>
          <a href="/user-signup.html" class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors">
            Create Free Account
          </a>
        </div>
      </div>
    `;

    const listContainer = document.getElementById('completed-books-list');
    if (listContainer) {
      listContainer.innerHTML = `
        <div class="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-400">
          Sign in to view and manage your completed books log.
        </div>
      `;
    }
    return;
  }

  // Header Box for logged-in user
  if (headerBox) {
    headerBox.innerHTML = `
      <div class="flex items-center justify-between gap-3 mb-1">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="font-bold text-white">${escapeHtml(currentUser.name)}</span>
        </div>
        <a href="/user-dashboard.html" class="text-teal-400 hover:text-teal-300 text-[11px] underline">My Dashboard</a>
      </div>
      <p class="text-[11px] text-slate-400 truncate">${escapeHtml(currentUser.email)}</p>
    `;
  }

  // Fetch authenticated user's distinct progress
  try {
    const res = await API.get('/reading-progress/me');
    currentProgressData = res.data;
    renderUserProgress();
  } catch (err) {
    console.warn('Failed to load user progress:', err.message);
    // If not found or error, initialize for this user
    try {
      const initRes = await API.post('/reading-progress', {
        userName: currentUser.name,
        userEmail: currentUser.email,
        yearlyGoal: 12
      });
      currentProgressData = initRes.data;
      renderUserProgress();
    } catch (createErr) {
      container.innerHTML = `<p class="text-rose-500 text-xs p-4">${createErr.message || 'Error loading profile'}</p>`;
    }
  }
}

function renderUserProgress() {
  const container = document.getElementById('progress-container');
  const data = currentProgressData;
  if (!container || !data) return;

  const currentUser = API.getCurrentUser();
  const userName = data.userName || (currentUser ? currentUser.name : 'Reader');
  const userEmail = data.userEmail || (currentUser ? currentUser.email : '');
  const goal = data.yearlyGoal || 12;
  const completed = data.booksCompleted || 0;
  const pct = Math.min(100, Math.round((completed / (goal || 1)) * 100));
  const streak = data.currentStreakDays || 1;
  const hours = Math.round((data.totalReadingMinutes || 0) / 60);

  container.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg font-serif shadow-sm">
          ${escapeHtml(userName.charAt(0).toUpperCase())}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-lg font-bold text-slate-900">${escapeHtml(userName)}</h3>
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
              Active Reader
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">${escapeHtml(userEmail)}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button onclick="openGoalModal()" class="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors">
          Adjust Goal
        </button>
        <button onclick="openLogBookModal()" class="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition-colors flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Log Completed Book
        </button>
      </div>
    </div>

    <!-- Visual Progress Bar -->
    <div class="py-6">
      <div class="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
        <span>Challenge Completion Progress</span>
        <span class="text-teal-700 text-sm font-extrabold">${pct}%</span>
      </div>
      <div class="w-full bg-slate-100 rounded-full h-4 overflow-hidden p-0.5 border border-slate-200">
        <div class="bg-gradient-teal h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
      </div>
    </div>

    <!-- Quick Metrics Strip -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
        <span class="block text-[11px] text-slate-500">Books Finished</span>
        <span class="text-xl font-bold text-slate-900 font-serif">${completed}</span>
      </div>
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
        <span class="block text-[11px] text-slate-500">Yearly Target</span>
        <span class="text-xl font-bold text-slate-900 font-serif">${goal}</span>
      </div>
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
        <span class="block text-[11px] text-slate-500">Current Streak</span>
        <span class="text-xl font-bold text-amber-600 font-serif">${streak} Days</span>
      </div>
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
        <span class="block text-[11px] text-slate-500">Time Spent</span>
        <span class="text-xl font-bold text-teal-700 font-serif">${hours} hrs</span>
      </div>
    </div>
  `;

  // Render completed books list
  const listContainer = document.getElementById('completed-books-list');
  if (!listContainer) return;

  if (!data.completedBookList || data.completedBookList.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <p class="text-xs text-slate-500 mb-3">No books logged yet this year.</p>
        <button onclick="openLogBookModal()" class="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-500 transition-colors">
          Log Your First Book
        </button>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = data.completedBookList.map((book) => {
    const dateFormatted = new Date(book.completedDate).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const stars = '★'.repeat(book.rating || 5) + '☆'.repeat(5 - (book.rating || 5));

    return `
      <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
              ${escapeHtml(book.category || 'General')}
            </span>
            <span class="text-amber-500 text-xs tracking-wider">${stars}</span>
          </div>
          <h4 class="text-base font-bold text-slate-900">${escapeHtml(book.bookTitle)}</h4>
          <p class="text-xs text-slate-500 mt-0.5">by ${escapeHtml(book.author)}</p>
          ${book.notes ? `<p class="text-xs text-slate-600 italic mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">"${escapeHtml(book.notes)}"</p>` : ''}
        </div>
        <div class="sm:text-right flex-shrink-0 text-xs text-slate-400">
          <span class="block text-[10px] uppercase font-bold text-slate-400">Completed</span>
          <span class="font-medium text-slate-600">${dateFormatted}</span>
        </div>
      </div>
    `;
  }).join('');
}

// Log Book Modal Handlers
function openLogBookModal() {
  if (!API.isUserLoggedIn()) {
    showToast('Please sign in to log a completed book.', 'info');
    setTimeout(() => { window.location.href = '/user-signin.html'; }, 1000);
    return;
  }
  document.getElementById('log-book-modal')?.classList.remove('hidden');
}

function closeLogBookModal() {
  document.getElementById('log-book-modal')?.classList.add('hidden');
}

async function handleLogBookSubmit(event) {
  event.preventDefault();
  const btn = document.getElementById('log-submit-btn');
  if (!btn) return;

  const bookTitle = document.getElementById('log-title').value.trim();
  const author = document.getElementById('log-author').value.trim();
  const category = document.getElementById('log-category').value;
  const rating = document.getElementById('log-rating').value;
  const notes = document.getElementById('log-notes').value.trim();

  if (!bookTitle || !author) {
    showToast('Book title and author are required.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span>Saving to MongoDB...</span>';

  try {
    const res = await API.put('/reading-progress/update', {
      bookTitle,
      author,
      category,
      rating,
      notes
    });

    closeLogBookModal();
    showToast(`"${bookTitle}" added to your completed reading list!`, 'success');
    currentProgressData = res.data;
    renderUserProgress();
    loadCommunityStats();

    // Reset form
    document.getElementById('log-title').value = '';
    document.getElementById('log-author').value = '';
    document.getElementById('log-notes').value = '';
  } catch (err) {
    console.error('Failed to update progress:', err);
    showToast(err.message || 'Failed to update reading progress', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Add to Completed Books</span>';
  }
}

// Update Goal Modal
function openGoalModal() {
  if (!API.isUserLoggedIn()) {
    showToast('Please sign in to adjust your goal.', 'info');
    setTimeout(() => { window.location.href = '/user-signin.html'; }, 1000);
    return;
  }
  const modal = document.getElementById('goal-modal');
  if (modal && currentProgressData) {
    document.getElementById('goal-input').value = currentProgressData.yearlyGoal || 12;
    modal.classList.remove('hidden');
  }
}

function closeGoalModal() {
  document.getElementById('goal-modal')?.classList.add('hidden');
}

async function handleGoalSubmit(event) {
  event.preventDefault();
  const newGoal = parseInt(document.getElementById('goal-input').value);
  if (!newGoal || newGoal < 1 || newGoal > 200) {
    showToast('Please enter a realistic goal between 1 and 200 books.', 'error');
    return;
  }

  try {
    const res = await API.put('/reading-progress/update', {
      yearlyGoal: newGoal
    });
    closeGoalModal();
    showToast(`Yearly reading goal updated to ${newGoal} books!`, 'success');
    currentProgressData = res.data;
    renderUserProgress();
    loadCommunityStats();
  } catch (err) {
    showToast(err.message || 'Failed to update goal', 'error');
  }
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
