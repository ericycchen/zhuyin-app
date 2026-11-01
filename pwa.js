/**
 * 注音小幫手 - PWA 註冊、自動熱更新與安裝引導模組 (v1.2.0)
 */
document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('install-app-btn');
    const messageEl = document.getElementById('output-message');

    // 1. 註冊 Service Worker 並偵測新版自動重新整理
    if ('serviceWorker' in navigator) {
        let refreshing = false;
        // 當新 Service Worker 接管控制權時，自動重新載入頁面套用新版 UI
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        });

        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
                // 每次開啟或切回前景時主動檢查伺服器是否有新版 sw.js
                reg.update().catch(() => {});
                document.addEventListener('visibilitychange', () => {
                    if (document.visibilityState === 'visible') {
                        reg.update().catch(() => {});
                    }
                });
            }).catch((err) => {
                console.warn('Service Worker registration failed:', err);
            });
        });
    }

    if (!installBtn) return;

    // 判斷是否已經在獨立 App 模式 (standalone) 執行
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
        installBtn.hidden = true;
        return;
    }

    // 判斷是否為 iOS Safari（iOS 不觸發 beforeinstallprompt，需提示點選「分享 -> 加入主畫面」）
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    let deferredPrompt = null;

    if (isIOS) {
        installBtn.hidden = false;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.hidden = false;
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        installBtn.hidden = true;
        if (messageEl) {
            messageEl.textContent = '已成功安裝「注音小幫手」至您的裝置！';
            messageEl.classList.remove('is-error');
            messageEl.hidden = false;
            setTimeout(() => { messageEl.hidden = true; }, 4000);
        }
    });

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installBtn.hidden = true;
            }
            deferredPrompt = null;
        } else if (isIOS && messageEl) {
            messageEl.textContent = '請點選瀏覽器底部的「分享」按鈕，再選擇「加入主畫面」即可安裝為獨立 App。';
            messageEl.classList.remove('is-error');
            messageEl.hidden = false;
            setTimeout(() => { messageEl.hidden = true; }, 6000);
        }
    });
});
