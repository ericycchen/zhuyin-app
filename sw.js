/**
 * 注音小幫手 - Service Worker (v1.2.0)
 * 預快取核心靜態資源與台灣注音詞庫，支援離線獨立 Web App (PWA) 運作。
 */
const CACHE_NAME = 'zhuyin-app-v1.2.0';
const CORE_ASSETS = [
    './',
    './index.html',
    './style.css?v=31',
    './tw-zhuyin.js?v=1',
    './render.js?v=1',
    './app_compare.js?v=23',
    './voice-input.js?v=4',
    './print.js?v=1',
    './copy.js?v=1',
    './reading.js?v=1',
    './pwa.js?v=1',
    './icon.svg',
    './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
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

    // 萌典 API 採用 Network-First（離線時直接略過，由本地 tw-zhuyin.js 單獨運作）
    if (url.hostname.includes('moedict.tw')) {
        event.respondWith(
            fetch(req).catch(() => new Response('{}', { status: 408, headers: { 'Content-Type': 'application/json' } }))
        );
        return;
    }

    // 站內資源與 CDN 採用 Stale-While-Revalidate，確保離線秒開且有網路時自動更新
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
