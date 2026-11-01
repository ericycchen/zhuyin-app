/**
 * 注音小幫手 - PWA 註冊與安裝引導模組 (v1.2.0)
 */
document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('install-app-btn');
    const messageEl = document.getElementById('output-message');

    // 1. 註冊 Service Worker 支援離線運作
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch((err) => {
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
