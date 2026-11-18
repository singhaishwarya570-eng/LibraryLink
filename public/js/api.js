// LibraryLink Frontend API Service & UI Utilities

const API_BASE = '/api';

const API = {
  // ── Admin Token (unchanged) ──────────────────────────────────────────────
  getToken() {
    return localStorage.getItem('librarylink_admin_token');
  },
  setToken(token) {
    if (token) {
      localStorage.setItem('librarylink_admin_token', token);
    } else {
      localStorage.removeItem('librarylink_admin_token');
    }
  },
  getAdminUser() {
    const raw = localStorage.getItem('librarylink_admin_user');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  setAdminUser(user) {
    if (user) {
      localStorage.setItem('librarylink_admin_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('librarylink_admin_user');
    }
  },

  // ── User Token ──────────────────────────────────────────────────────────
  getUserToken() {
    return localStorage.getItem('librarylink_user_token');
  },
  setUserToken(token) {
    if (token) {
      localStorage.setItem('librarylink_user_token', token);
    } else {
      localStorage.removeItem('librarylink_user_token');
    }
  },
  getCurrentUser() {
    const raw = localStorage.getItem('librarylink_current_user');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  setCurrentUser(user) {
    if (user) {
      localStorage.setItem('librarylink_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('librarylink_current_user');
    }
  },
  isUserLoggedIn() {
    return !!(this.getUserToken() && this.getCurrentUser());
  },
  logoutUser() {
    this.setUserToken(null);
    this.setCurrentUser(null);
  },

  // ── Core Request (uses user token when available, else admin token) ──────
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // If authorization header not already explicitly set, determine proper token based on context
    if (!headers['Authorization']) {
      const isAdminContext = (typeof window !== 'undefined' && window.location.pathname.includes('admin')) ||
                             endpoint.startsWith('/admin') ||
                             options.adminAuth;

      const token = isAdminContext ? (this.getToken() || this.getUserToken()) : (this.getUserToken() || this.getToken());
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({
        success: false,
        message: `HTTP Error ${response.status}: Failed to parse JSON response`
      }));
      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  },

  // ── Explicit admin-only request (always uses admin token) ───────────────
  async adminRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({
        success: false,
        message: `HTTP Error ${response.status}: Failed to parse JSON`
      }));
      if (!response.ok) throw new Error(data.message || `Request failed with status ${response.status}`);
      return data;
    } catch (error) {
      console.error(`Admin API Error [${endpoint}]:`, error);
      throw error;
    }
  },

  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  },
  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },
  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  },
  patch(endpoint, body) {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  },
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

// UI Notification Toast
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const iconSvg = type === 'success'
    ? '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
    : type === 'error'
    ? '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
    : '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
  toast.innerHTML = `${iconSvg}<div class="flex-1">${message}</div><button onclick="this.parentElement.remove()" class="text-white opacity-70 hover:opacity-100">&times;</button>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Neutral Fallback image generator
function handleImageError(imgElement, bookTitle = 'Book Title', author = 'Author') {
  if (imgElement.dataset.hasFailed) return;
  imgElement.dataset.hasFailed = 'true';
  const safeTitle = (bookTitle || 'Book Title').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeAuthor = (author || 'Author').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svgData = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 400" width="280" height="400">
    <rect width="280" height="400" rx="8" fill="#f8fafc" />
    <rect x="0" y="0" width="10" height="400" fill="#cbd5e1" />
    <rect x="25" y="35" width="230" height="330" rx="6" fill="none" stroke="#e2e8f0" stroke-width="1.5" />
    <circle cx="140" cy="130" r="34" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" />
    <text x="140" y="138" font-family="system-ui, sans-serif" font-size="22" fill="#64748b" text-anchor="middle">📖</text>
    <text x="140" y="205" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="#334155" text-anchor="middle">${safeTitle.slice(0, 24)}</text>
    <text x="140" y="230" font-family="system-ui, sans-serif" font-size="12" font-weight="500" fill="#64748b" text-anchor="middle">${safeAuthor.slice(0, 28)}</text>
    <text x="140" y="325" font-family="system-ui, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">Cover Image Unavailable</text>
  </svg>`;
  imgElement.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
}

// User Location Preferences
const LocationService = {
  PRESETS: {
    'mira-road-station': { name: 'Mira Road Railway Station (East)', lat: 19.2810, lng: 72.8559 },
    'bhayandar-station': { name: 'Bhayandar Railway Station (West)', lat: 19.3015, lng: 72.8524 },
    'kanakia-beverly': { name: 'Kanakia Beverly Park, Mira Road', lat: 19.2930, lng: 72.8685 },
    'golden-nest': { name: 'Golden Nest Circle, Bhayandar East', lat: 19.2970, lng: 72.8530 }
  },
  getCurrentLocation() {
    const stored = localStorage.getItem('librarylink_user_location');
    if (stored) { try { return JSON.parse(stored); } catch (e) { return null; } }
    return this.PRESETS['mira-road-station'];
  },
  setLocation(loc) {
    localStorage.setItem('librarylink_user_location', JSON.stringify(loc));
  }
};

