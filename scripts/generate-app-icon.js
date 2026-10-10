import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function generateAppIconMaster() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: true });
  const page = await browser.newPage();
  
  const imgBase64 = fs.readFileSync('assets/logo.png').toString('base64');
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>body { margin: 0; background: transparent; }</style></head>
    <body>
      <canvas id="c" width="1024" height="1024"></canvas>
      <script>
        const img = new Image();
        img.onload = () => {
          const c = document.getElementById('c');
          const ctx = c.getContext('2d');
          
          // 1. Clear with transparent background (macOS rounded rect style)
          ctx.clearRect(0, 0, 1024, 1024);
          
          // 2. Draw Apple / macOS standard squircle (radius ~228px on 1024x1024)
          // Inner padded card: 64px padding -> size 896x896, rx = 200px
          const pad = 64;
          const size = 896;
          const r = 200;
          
          // Shadow for depth
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
          ctx.shadowBlur = 32;
          ctx.shadowOffsetY = 16;
          
          ctx.beginPath();
          ctx.roundRect(pad, pad, size, size, r);
          ctx.fillStyle = '#faf9f5';
          ctx.fill();
          ctx.restore();
          
          // Subtle border
          ctx.beginPath();
          ctx.roundRect(pad, pad, size, size, r);
          ctx.strokeStyle = '#e2dfd7';
          ctx.lineWidth = 4;
          ctx.stroke();
          
          // 3. Draw {t glyph from exact original artwork
          // Source bounds in 1024x1024 image: minX: 341, maxX: 682, minY: 188, maxY: 612
          // Center is (511.5, 400). Crop 480x480 around it:
          const sx = 272;
          const sy = 160;
          const sw = 480;
          const sh = 480;
          
          // Draw inside the rounded card (centered at 512, 512)
          // Destination size: 700x700 -> centered at (512 - 350 = 162, 512 - 350 = 162)
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(pad, pad, size, size, r);
          ctx.clip();
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, sw, sh, 162, 162, 700, 700);
          ctx.restore();
          
          window.appIconDataUrl = c.toDataURL('image/png');
        };
        img.src = 'data:image/jpeg;base64,${imgBase64}';
      </script>
    </body>
    </html>
  `;
  
  await page.setContent(html);
  await new Promise(r => setTimeout(r, 1000));
  const dataUrl = await page.evaluate(() => window.appIconDataUrl);
  
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync('assets/app-icon-master.png', Buffer.from(base64Data, 'base64'));
  console.log('Saved assets/app-icon-master.png (1024x1024 master icon)');
  
  await browser.close();
}

generateAppIconMaster().catch(console.error);
