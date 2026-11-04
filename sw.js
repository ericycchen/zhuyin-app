/**
 * 注音小幫手 - Service Worker (v1.2.0)
 * 預快取核心靜態資源與台灣注音詞庫，支援離線獨立 Web App (PWA) 運作，並在有網路時優先載入最新頁面。
 */
const CACHE_NAME = 'zhuyin-app-v1.3.0';
const CORE_ASSETS = [
    './',
    './index.html',
    './about.html',
    './style.css?v=38',
    './tw-zhuyin.js?v=2',
    './render.js?v=1',
    './app_compare.js?v=25',
    './voice-input.js?v=7',
    './print.js?v=1',
    './copy.js?v=1',
    './reading.js?v=1',
    './workbook.js?v=1',
    './pwa.js?v=3',
    './icon.svg',
    './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            // 強制繞過瀏覽器 HTTP 快取抓取最新檔案
            Promise.all(
                CORE_ASSETS.map((url) =>
                    fetch(new Request(url, { cache: 'reload' })).then((res) => {
                        if (res.ok) return cache.put(url, res);
                    })
                )
            )
        )
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // 1. 萌典 API：Network-First（離線時靜默略過，由本地 tw-zhuyin.js 單獨運作）
    if (url.hostname.includes('moedict.tw')) {
        event.respondWith(
            fetch(req).catch(() => new Response('{}', { status: 408, headers: { 'Content-Type': 'application/json' } }))
        );
        return;
    }

    // 2. HTML 頁面導覽 (navigate)：採用 Network-First！有網路時永遠拿最新 HTML，沒網路才退回快取
    if (req.mode === 'navigate' || req.destination === 'document') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    if (res && res.status === 200) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                    }
                    return res;
                })
                .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
        );
        return;
    }

    // 3. 靜態資源 (JS/CSS/SVG/CDN)：Stale-While-Revalidate，確保秒開並於背景更新
    event.respondWith(
        caches.match(req).then((cached) => {
            const networkFetch = fetch(req)
                .then((res) => {
                    if (res && res.status === 200 && (url.origin === self.location.origin || url.hostname.includes('jsdelivr.net') || url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com'))) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || networkFetch;
        })
    );
});
