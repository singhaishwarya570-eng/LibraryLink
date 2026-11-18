const fs = require('fs');
const path = require('path');

const eventsDir = path.join(__dirname, '../../public/assets/events');
if (!fs.existsSync(eventsDir)) {
  fs.mkdirSync(eventsDir, { recursive: true });
}

function makeEventSvg(title, subtitle, color1, color2, iconPath) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240" width="600" height="240">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color1}" />
      <stop offset="100%" stop-color="${color2}" />
    </linearGradient>
  </defs>
  <rect width="600" height="240" rx="12" fill="url(#g)" />
  <g opacity="0.06">
    <circle cx="100" cy="120" r="90" fill="#fff" />
    <circle cx="500" cy="180" r="140" fill="#fff" />
  </g>
  <g transform="translate(40, 50)">
    <rect x="0" y="0" width="130" height="26" rx="13" fill="#ffffff" fill-opacity="0.2" />
    <text x="65" y="17" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="1">${subtitle.toUpperCase()}</text>
    <text x="0" y="65" font-family="system-ui, sans-serif" font-size="24" font-weight="800" fill="#ffffff">${title}</text>
    <text x="0" y="95" font-family="system-ui, sans-serif" font-size="13" font-weight="400" fill="#e2e8f0">Mira-Bhayandar Community Learning Initiative</text>
  </g>
  <g transform="translate(480, 80)" fill="#ffffff" opacity="0.85">
    ${iconPath}
  </g>
</svg>`;
}

const bookIcon = '<path d="M0 0h48v48H0z" fill="none"/><path d="M36 4H12c-2.2 0-4 1.8-4 4v32c0 2.2 1.8 4 4 4h24c2.2 0 4-1.8 4-4V8c0-2.2-1.8-4-4-4zm0 36H12V8h24v32z" fill="#fff"/>';
const chatIcon = '<path d="M0 0h48v48H0z" fill="none"/><path d="M40 4H8C5.8 4 4 5.8 4 8v32l8-8h28c2.2 0 4-1.8 4-4V8c0-2.2-1.8-4-4-4z" fill="#fff"/>';
const penIcon = '<path d="M0 0h48v48H0z" fill="none"/><path d="M6 34.5V42h7.5l22.1-22.1-7.5-7.5L6 34.5zm33.7-21.9c.8-.8.8-2 0-2.8l-4.7-4.7c-.8-.8-2-.8-2.8 0l-3.7 3.7 7.5 7.5 3.7-3.7z" fill="#fff"/>';
const atomIcon = '<circle cx="24" cy="24" r="8" fill="#fff"/><ellipse cx="24" cy="24" rx="20" ry="8" fill="none" stroke="#fff" stroke-width="2" transform="rotate(30 24 24)"/><ellipse cx="24" cy="24" rx="20" ry="8" fill="none" stroke="#fff" stroke-width="2" transform="rotate(-30 24 24)"/>';

fs.writeFileSync(path.join(eventsDir, 'event-club.svg'), makeEventSvg('Weekend Book Club', 'Book Discussion', '#1e3a8a', '#0f172a', bookIcon));
fs.writeFileSync(path.join(eventsDir, 'event-story.svg'), makeEventSvg('Storytelling Circle', 'Storytelling Session', '#065f46', '#022c22', chatIcon));
fs.writeFileSync(path.join(eventsDir, 'event-workshop.svg'), makeEventSvg('Creative Writing Clinic', 'Writing Workshop', '#4c1d95', '#2e1065', penIcon));
fs.writeFileSync(path.join(eventsDir, 'event-habits.svg'), makeEventSvg('Productivity & Habits', 'Reading Club', '#831843', '#500724', chatIcon));
fs.writeFileSync(path.join(eventsDir, 'event-science.svg'), makeEventSvg('Science & Deep Time Cafe', 'Community Reading', '#0f766e', '#042f2e', atomIcon));
fs.writeFileSync(path.join(eventsDir, 'event-young.svg'), makeEventSvg('Young Readers & Classics', 'Reading Club', '#b45309', '#78350f', bookIcon));

console.log('✓ Event SVG banners generated successfully');
