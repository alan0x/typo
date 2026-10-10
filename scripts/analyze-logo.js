import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function analyze() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: true });
  const page = await browser.newPage();
  
  const imgBase64 = fs.readFileSync('assets/logo.png').toString('base64');
  const html = `
    <!DOCTYPE html>
    <html><body>
      <canvas id="c" width="1024" height="1024"></canvas>
      <script>
        const img = new Image();
        img.onload = () => {
          const c = document.getElementById('c');
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, 1024, 1024).data;
          
          let minX = 1024, maxX = 0, minY = 1024, maxY = 0;
          for (let y = 100; y < 650; y++) {
            for (let x = 200; x < 850; x++) {
              const idx = (y * 1024 + x) * 4;
              const r = data[idx], g = data[idx+1], b = data[idx+2];
              if (r < 180 && g < 180 && b < 180) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          window.glyphBounds = { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
        };
        img.src = 'data:image/jpeg;base64,${imgBase64}';
      </script>
    </body></html>
  `;
  
  await page.setContent(html);
  await new Promise(r => setTimeout(r, 1000));
  const bounds = await page.evaluate(() => window.glyphBounds);
  console.log('Glyph bounds in 1024x1024 image:', bounds);
  await browser.close();
}

analyze().catch(console.error);
