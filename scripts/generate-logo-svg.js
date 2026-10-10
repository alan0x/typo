import fs from 'node:fs';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
  <!-- Soft rounded container -->
  <rect width="120" height="120" rx="26" fill="#faf9f5" stroke="#e7e5e4" stroke-width="2"/>
  
  <g transform="translate(4, 0)">
    <!-- Code Curly Bracket { in Code Charcoal -->
    <path d="M 44 26 C 35 26 28 31 28 41 L 28 52 C 28 57 24 60 18 60 C 24 60 28 63 28 68 L 28 79 C 28 89 35 94 44 94 L 44 86 C 39 86 36 83 36 76 L 36 67 C 36 61 31 58 26 58 C 31 58 36 55 36 49 L 36 40 C 36 33 39 30 44 30 Z" fill="#78716c"/>

    <!-- Literary Serif 't' in Deep Sumi Charcoal -->
    <g fill="#1c1917">
      <!-- Crossbar -->
      <rect x="46" y="44" width="48" height="9" rx="1"/>
      
      <!-- Top finial/ascender -->
      <path d="M 64 22 L 56 38 L 64 38 Z"/>
      
      <!-- Vertical Stem & Base Hook -->
      <path d="M 64 36 L 73 36 L 73 78 C 73 88 80 92 90 92 C 96 92 100 90 102 88 L 100 81 C 98 83 95 84 91 84 C 84 84 81 80 81 73 L 81 36 Z"/>

      <!-- Vermilion Editorial Accent -->
      <circle cx="95" cy="42" r="2.5" fill="#c2410c"/>
    </g>
  </g>
</svg>`;

fs.writeFileSync('public/logo.svg', svg);
console.log('Saved updated public/logo.svg');
