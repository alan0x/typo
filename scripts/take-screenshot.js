import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const DIST_DIR = path.resolve('dist');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function createStaticServer() {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  };

  const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    const safePath = urlPath === '/' ? '/index.html' : urlPath;
    const filePath = path.join(DIST_DIR, safePath);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // Fallback to index.html for SPA
        fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, fallbackData) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fallbackData);
          }
        });
      } else {
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(data);
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(14888, '127.0.0.1', () => {
      console.log('Static preview server running on http://127.0.0.1:14888');
      resolve(server);
    });
  });
}

async function takeScreenshots() {
  const server = await createStaticServer();

  console.log('Launching Edge for real screenshot capture...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    // 2x Retina resolution for razor-sharp screenshots
    await page.setViewport({ width: 680, height: 720, deviceScaleFactor: 2 });

    // 1. Capture Main HUD Workspace
    console.log('Capturing real main HUD workspace...');
    await page.goto('http://127.0.0.1:14888/?demo=true', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    fs.mkdirSync('assets', { recursive: true });
    await page.screenshot({
      path: 'assets/screenshot-main.png',
      clip: { x: 0, y: 0, width: 680, height: 720 },
    });
    console.log('Saved: assets/screenshot-main.png');

    // 2. Capture Preferences Modal
    console.log('Capturing real Preferences modal...');
    await page.goto('http://127.0.0.1:14888/?demo=true&modal=settings', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    await page.screenshot({
      path: 'assets/screenshot-preferences.png',
      clip: { x: 0, y: 0, width: 680, height: 600 },
    });
    console.log('Saved: assets/screenshot-preferences.png');
  } finally {
    await browser.close();
    server.close();
    console.log('Done capturing real screenshots.');
  }
}

takeScreenshots().catch((err) => {
  console.error('Screenshot failed:', err);
  process.exit(1);
});
