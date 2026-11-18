const fs = require('fs');
const path = require('path');

const coversDir = path.join(__dirname, '../../public/assets/covers');

if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
}

const colorPalettes = [
  { bg1: '#1E3A8A', bg2: '#0F172A', accent: '#38BDF8', badge: '#0284C7' }, // Deep Blue / Sky
  { bg1: '#065F46', bg2: '#022C22', accent: '#34D399', badge: '#059669' }, // Emerald / Mint
  { bg1: '#7C2D12', bg2: '#451A03', accent: '#FBBF24', badge: '#D97706' }, // Amber / Warm Earth
  { bg1: '#4C1D95', bg2: '#2E1065', accent: '#C084FC', badge: '#7C3AED' }, // Violet / Lavender
  { bg1: '#831843', bg2: '#500724', accent: '#F472B6', badge: '#DB2777' }, // Rose / Pink
  { bg1: '#134E4A', bg2: '#042F2E', accent: '#2DD4BF', badge: '#0D9488' }  // Teal / Cyan
];

function createBookCoverSVG(title, author, category, isbn, index) {
  const palette = colorPalettes[index % colorPalettes.length];
  
  // Escape XML characters
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeAuthor = author.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeCategory = category.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Split title if long
  const words = safeTitle.split(' ');
  let titleLines = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > 16) {
      if (currentLine) titleLines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = (currentLine + ' ' + word).trim();
    }
  }
  if (currentLine) titleLines.push(currentLine.trim());
  if (titleLines.length === 0) titleLines = [safeTitle];

  const titleSvgLines = titleLines.slice(0, 3).map((line, i) => {
    return `<text x="140" y="${210 + i * 32}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="-0.5">${line}</text>`;
  }).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 400" width="280" height="400">
  <defs>
    <linearGradient id="grad-${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg1}" />
      <stop offset="100%" stop-color="${palette.bg2}" />
    </linearGradient>
    <linearGradient id="spine-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.4" />
      <stop offset="30%" stop-color="#ffffff" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.3" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="280" height="400" rx="8" fill="url(#grad-${index})" />

  <!-- Decorative Pattern Grid -->
  <g opacity="0.08" stroke="#FFFFFF" stroke-width="1">
    <line x1="20" y1="20" x2="260" y2="20" />
    <line x1="20" y1="380" x2="260" y2="380" />
    <circle cx="140" cy="140" r="80" fill="none" stroke="#FFFFFF" stroke-width="1" />
    <circle cx="140" cy="140" r="50" fill="none" stroke="${palette.accent}" stroke-width="1.5" />
  </g>

  <!-- Book Spine Visual Simulation -->
  <rect x="0" y="0" width="14" height="400" rx="3" fill="url(#spine-grad)" />

  <!-- Category Badge -->
  <rect x="140" y="55" width="120" height="24" rx="12" transform="translate(-60, 0)" fill="${palette.badge}" opacity="0.9" />
  <text x="140" y="71" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">${safeCategory.toUpperCase()}</text>

  <!-- Title Centerpiece -->
  <g transform="translate(0, 0)">
    ${titleSvgLines}
  </g>

  <!-- Decorative Divider -->
  <line x1="90" y1="300" x2="190" y2="300" stroke="${palette.accent}" stroke-width="2" stroke-linecap="round" />

  <!-- Author Name -->
  <text x="140" y="330" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#E2E8F0" text-anchor="middle">${safeAuthor}</text>

  <!-- Bottom Brand & ISBN Tag -->
  <text x="140" y="370" font-family="monospace" font-size="9" fill="#94A3B8" text-anchor="middle">LibraryLink Verified • ${isbn}</text>
</svg>`;
}

module.exports = { createBookCoverSVG };
