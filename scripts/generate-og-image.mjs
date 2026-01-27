import sharp from 'sharp';

const width = 1200;
const height = 630;

// Create SVG with the design
const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background Gradient -->
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#grad)"/>

  <!-- Decorative circles in background -->
  <circle cx="100" cy="100" r="150" fill="white" fill-opacity="0.05"/>
  <circle cx="1100" cy="500" r="200" fill="white" fill-opacity="0.05"/>

  <!-- Main icon circle -->
  <circle cx="600" cy="220" r="90" fill="white" fill-opacity="0.15"/>
  <circle cx="600" cy="220" r="70" fill="white" fill-opacity="0.2"/>

  <!-- Clock Icon -->
  <circle cx="600" cy="220" r="50" fill="none" stroke="white" stroke-width="5"/>
  <line x1="600" y1="220" x2="600" y2="185" stroke="white" stroke-width="5" stroke-linecap="round"/>
  <line x1="600" y1="220" x2="630" y2="235" stroke="white" stroke-width="5" stroke-linecap="round"/>
  <circle cx="600" cy="220" r="6" fill="white"/>

  <!-- Title -->
  <text x="600" y="380" font-family="Arial, 'Microsoft JhengHei', sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle">
    WorkHours
  </text>

  <!-- Subtitle -->
  <text x="600" y="445" font-family="Arial, 'Microsoft JhengHei', sans-serif" font-size="38" fill="white" fill-opacity="0.95" text-anchor="middle">
    工時追蹤系統
  </text>

  <!-- Features -->
  <text x="600" y="510" font-family="Arial, 'Microsoft JhengHei', sans-serif" font-size="26" fill="white" fill-opacity="0.85" text-anchor="middle">
    專為 QA 團隊設計 · 統計分析 · 趨勢圖表
  </text>

  <!-- Bottom accent line -->
  <rect x="450" y="560" width="300" height="4" fill="white" fill-opacity="0.6" rx="2"/>
</svg>
`;

// Generate PNG from SVG
sharp(Buffer.from(svg))
  .png()
  .toFile('public/og-image.png')
  .then(() => {
    console.log('✅ OG image generated successfully: public/og-image.png');
  })
  .catch(err => {
    console.error('❌ Error generating OG image:', err);
    process.exit(1);
  });
