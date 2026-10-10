import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function cropGlyph() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: true });
  const page = await browser.newPage();
  
  const imgBase64 = fs.readFileSync('assets/logo.png').toString('base64');
  const html = `
    <!DOCTYPE html>
    <html><body>
      <!-- 512x512 high-res square crop of the exact {t glyph from original artwork -->
      <canvas id="c" width="512" height="512"></canvas>
      <script>
        const img = new Image();
        img.onload = () => {
          const c = document.getElementById('c');
          const ctx = c.getContext('2d', { alpha: false });
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Source crop: center (512, 400), size 520x520
          const sx = 252;
          const sy = 140;
          const sw = 520;
          const sh = 520;
          
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 512, 512);
          window.croppedDataUrl = c.toDataURL('image/png');
        };
        img.src = 'data:image/jpeg;base64,${imgBase64}';
      </script>
    </body></html>
  `;
  
  await page.setContent(html);
  await new Promise(r => setTimeout(r, 1000));
  const dataUrl = await page.evaluate(() => window.croppedDataUrl);
  
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync('public/logo-icon.png', Buffer.from(base64Data, 'base64'));
  console.log('Saved public/logo-icon.png (512x512 lossless PNG crop of exact original glyph)');
  
  await browser.close();
}

cropGlyph().catch(console.error);
