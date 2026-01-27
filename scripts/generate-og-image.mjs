import sharp from 'sharp';

const width = 1200;
const height = 630;

// Modern, trendy design with glassmorphism and vibrant colors
const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Modern gradient background -->
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#1e293b;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
    </linearGradient>

    <!-- Vibrant accent gradient -->
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
    </linearGradient>

    <!-- Glow effect -->
    <radialGradient id="glow1">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.4" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0" />
    </radialGradient>
    <radialGradient id="glow2">
      <stop offset="0%" style="stop-color:#ec4899;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#ec4899;stop-opacity:0" />
    </radialGradient>
  </defs>

  <!-- Dark background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>

  <!-- Glowing orbs for depth -->
  <circle cx="200" cy="150" r="200" fill="url(#glow1)"/>
  <circle cx="1000" cy="500" r="250" fill="url(#glow2)"/>

  <!-- Floating geometric shapes for modern feel -->
  <rect x="100" y="80" width="60" height="60" fill="#3b82f6" fill-opacity="0.1" rx="8" transform="rotate(15 130 110)"/>
  <circle cx="1050" cy="120" r="40" fill="#ec4899" fill-opacity="0.15"/>
  <rect x="950" y="480" width="80" height="80" fill="#8b5cf6" fill-opacity="0.1" rx="12" transform="rotate(-20 990 520)"/>

  <!-- Main card with glassmorphism effect -->
  <rect x="150" y="150" width="900" height="330" fill="white" fill-opacity="0.05" rx="24" stroke="white" stroke-opacity="0.1" stroke-width="2"/>

  <!-- Accent bar on top -->
  <rect x="150" y="150" width="900" height="6" fill="url(#accentGrad)" rx="3"/>

  <!-- Icon area with modern chart/graph symbol -->
  <g transform="translate(220, 230)">
    <!-- Modern bar chart icon -->
    <rect x="0" y="30" width="15" height="40" fill="#3b82f6" rx="3"/>
    <rect x="20" y="15" width="15" height="55" fill="#8b5cf6" rx="3"/>
    <rect x="40" y="25" width="15" height="45" fill="#ec4899" rx="3"/>
    <rect x="60" y="10" width="15" height="60" fill="#06b6d4" rx="3"/>

    <!-- Trend line -->
    <path d="M 0 60 Q 20 40, 40 45 T 75 20" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="0" cy="60" r="4" fill="white"/>
    <circle cx="40" cy="45" r="4" fill="white"/>
    <circle cx="75" cy="20" r="4" fill="white"/>
  </g>

  <!-- Text content -->
  <text x="380" y="265" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="700" fill="white" letter-spacing="-1">
    WorkHours
  </text>

  <text x="380" y="320" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="400" fill="white" fill-opacity="0.8">
    工時追蹤系統
  </text>

  <!-- Feature tags with modern pill design -->
  <g transform="translate(380, 350)">
    <rect x="0" y="0" width="120" height="36" fill="white" fill-opacity="0.1" rx="18" stroke="url(#accentGrad)" stroke-width="1.5"/>
    <text x="60" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="white" text-anchor="middle">
      即時統計
    </text>
  </g>

  <g transform="translate(520, 350)">
    <rect x="0" y="0" width="120" height="36" fill="white" fill-opacity="0.1" rx="18" stroke="url(#accentGrad)" stroke-width="1.5"/>
    <text x="60" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="white" text-anchor="middle">
      趨勢分析
    </text>
  </g>

  <g transform="translate(660, 350)">
    <rect x="0" y="0" width="120" height="36" fill="white" fill-opacity="0.1" rx="18" stroke="url(#accentGrad)" stroke-width="1.5"/>
    <text x="60" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="white" text-anchor="middle">
      團隊協作
    </text>
  </g>

  <!-- Small decorative elements -->
  <circle cx="900" cy="240" r="3" fill="#3b82f6" fill-opacity="0.6"/>
  <circle cx="920" cy="280" r="2" fill="#ec4899" fill-opacity="0.6"/>
  <circle cx="880" cy="320" r="2.5" fill="#8b5cf6" fill-opacity="0.6"/>
</svg>
`;

// Generate PNG from SVG
sharp(Buffer.from(svg))
  .png()
  .toFile('public/og-image.png')
  .then(() => {
    console.log('✅ Modern OG image generated successfully: public/og-image.png');
  })
  .catch(err => {
    console.error('❌ Error generating OG image:', err);
    process.exit(1);
  });
