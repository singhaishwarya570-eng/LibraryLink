// Shared Navbar and Footer Component for LibraryLink

function initNavigation(activePage = 'home') {
  const headerContainer = document.getElementById('main-header');
  const footerContainer = document.getElementById('main-footer');

  const adminUser = API.getAdminUser();
  const currentUser = API.getCurrentUser();
  const isUserLoggedIn = API.isUserLoggedIn();

  if (headerContainer) {
    headerContainer.innerHTML = `
      <header class="glass-header text-white sticky top-0 z-50 border-b border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-20">
            
            <!-- Brand Logo & Title -->
            <a href="/" class="flex items-center gap-3 group">
              <img src="/assets/logo.svg" alt="LibraryLink" class="w-11 h-11 transition-transform group-hover:scale-105" />
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-extrabold text-2xl tracking-tight text-white font-serif">Library<span class="text-teal-400">Link</span></span>
                  <span class="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800">Mira-Bhayandar</span>
                </div>
                <p class="text-xs text-slate-400 hidden sm:block">Smart Community Library Network</p>
              </div>
            </a>

            <!-- Desktop Navigation Links -->
            <nav class="hidden md:flex items-center space-x-1 lg:space-x-2">
              <a href="/" class="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activePage === 'home'
                  ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }">Home</a>

              <a href="/books.html" class="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activePage === 'books'
                  ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }">Find Books</a>

              <a href="/meetups.html" class="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activePage === 'meetups'
                  ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }">Meetups</a>

              <a href="/challenge.html" class="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activePage === 'challenge'
                  ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }">Reading Challenge</a>

              <div class="h-5 w-px bg-slate-800 mx-2"></div>

              <a href="/admin.html" class="px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activePage === 'admin'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/60'
              }">
                <span class="flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  ${adminUser ? 'Admin Portal' : 'Admin'}
                </span>
              </a>

              <div class="h-5 w-px bg-slate-800 mx-2"></div>

              ${isUserLoggedIn ? `
                <a href="/user-dashboard.html" class="px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activePage === 'dashboard'
                    ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }">
                  <span class="flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    ${currentUser.name.split(' ')[0]}
                  </span>
                </a>
                <button onclick="handleUserLogout()" class="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-rose-300 hover:bg-slate-800/60 transition-all">
                  Sign Out
                </button>
              ` : `
                <a href="/user-signin.html" class="px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activePage === 'signin'
                    ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }">
                  <span class="flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                    User Sign In
                  </span>
                </a>

<a href="/user-signup.html" class="px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
  activePage === 'signup'
    ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
}">
  <span class="flex items-center gap-1.5">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
    </svg>
    User Sign Up
  </span>
</a>   
              `}
            </nav>


            <!-- Mobile menu button -->
            <div class="md:hidden flex items-center">
              <button id="mobile-menu-btn" class="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Drawer -->
        <div id="mobile-menu" class="hidden md:hidden bg-slate-900/95 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          <a href="/" class="block px-3 py-2 rounded-md text-base font-medium ${activePage === 'home' ? 'bg-teal-900/50 text-teal-300' : 'text-slate-300'}">Home</a>
          <a href="/books.html" class="block px-3 py-2 rounded-md text-base font-medium ${activePage === 'books' ? 'bg-teal-900/50 text-teal-300' : 'text-slate-300'}">Find Books</a>
          <a href="/meetups.html" class="block px-3 py-2 rounded-md text-base font-medium ${activePage === 'meetups' ? 'bg-teal-900/50 text-teal-300' : 'text-slate-300'}">Meetups</a>
          <a href="/challenge.html" class="block px-3 py-2 rounded-md text-base font-medium ${activePage === 'challenge' ? 'bg-teal-900/50 text-teal-300' : 'text-slate-300'}">Reading Challenge</a>
          <a href="/admin.html" class="block px-3 py-2 rounded-md text-base font-medium text-amber-300">Admin Portal</a>
          <div class="border-t border-slate-800 my-2"></div>
          ${isUserLoggedIn ? `
            <a href="/user-dashboard.html" class="block px-3 py-2 rounded-md text-base font-medium text-teal-300">My Dashboard (${currentUser.name.split(' ')[0]})</a>
            <button onclick="handleUserLogout()" class="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-rose-300">Sign Out</button>
          ` : `
            <a href="/user-signin.html" class="block px-3 py-2 rounded-md text-base font-medium text-teal-300">User Sign In</a>
            <a href="/user-signup.html" class="block px-3 py-2 rounded-md text-base font-medium text-teal-300">User Sign Up</a>
          `}
        </div>
      </header>
    `;

    // Hook mobile toggle
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (btn && menu) {
      btn.addEventListener('click', () => {
        menu.classList.toggle('hidden');
      });
    }
  }

  if (footerContainer) {
    footerContainer.innerHTML = `
      <footer class="bg-slate-950 text-slate-400 border-t border-slate-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div class="md:col-span-2">
              <div class="flex items-center gap-3 mb-4">
                <img src="/assets/logo.svg" alt="LibraryLink" class="w-9 h-9" />
                <span class="font-extrabold text-2xl text-white font-serif">Library<span class="text-teal-400">Link</span></span>
              </div>
              <p class="text-sm text-slate-400 max-w-md leading-relaxed mb-4">
                Smart Community Library Network connecting public libraries across Mira-Bhayandar. Enabling multi-library book discovery, distance comparison, home delivery reservation, and reading meetups.
              </p>
            </div>

            <div>
              <h4 class="text-white text-sm font-semibold uppercase tracking-wider mb-4">Navigation</h4>
              <ul class="space-y-2 text-sm">
                <li><a href="/" class="hover:text-teal-400 transition-colors">Home</a></li>
                <li><a href="/books.html" class="hover:text-teal-400 transition-colors">Find Books (Multi-Library)</a></li>
                <li><a href="/meetups.html" class="hover:text-teal-400 transition-colors">Community Meetups</a></li>
                <li><a href="/challenge.html" class="hover:text-teal-400 transition-colors">Reading Challenge</a></li>
                <li><a href="/admin.html" class="hover:text-amber-400 transition-colors">Admin Management</a></li>
                <li><a href="/user-signin.html" class="hover:text-teal-400 transition-colors">User Sign In</a></li>
                <li><a href="/user-signup.html" class="hover:text-teal-400 transition-colors">User Sign Up</a></li>
              </ul>
            </div>

            <div>
              <h4 class="text-white text-sm font-semibold uppercase tracking-wider mb-4">Demonstration Area</h4>
              <p class="text-sm text-slate-400 mb-2">Mira-Bhayandar Municipal Corporation Area, Maharashtra</p>
              <ul class="text-xs text-slate-500 space-y-1">
                <li>&bull; Mira Road Central Community Library</li>
                <li>&bull; Bhayandar West Heritage Reading Room</li>
                <li>&bull; Kanakia Knowledge Hub</li>
                <li>&bull; Golden Nest Public Library</li>
              </ul>
              <div class="mt-4 pt-3 border-t border-slate-900">
                <span class="text-[11px] text-slate-500 block">System Status: <span class="text-emerald-400">Live &amp; Connected (MongoDB)</span></span>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-900 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500">
            <p>&copy; 2026 LibraryLink. Demonstration Data Only. Not affiliated with real municipal entities.</p>
            <p class="mt-2 sm:mt-0">Built with Node.js, Express, MongoDB &amp; Tailwind CSS</p>
          </div>
        </div>
      </footer>
    `;
  }
}

// Global user logout handler
function handleUserLogout() {
  API.logoutUser();
  showToast('You have been signed out successfully.', 'success');
  setTimeout(() => {
    window.location.href = '/';
  }, 800);
}
