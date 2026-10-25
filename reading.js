/**
 * 注音小幫手 - 大字閱讀模式
 * 隱藏輸入區與其他介面，讓注音結果佔滿整個畫面（小朋友閱讀、老師投影用）。
 * 支援全螢幕的瀏覽器會同時進入全螢幕；不支援時（例如 iPhone Safari）仍以整頁顯示。
 */
document.addEventListener('DOMContentLoaded', () => {
    const enterBtn = document.getElementById('reading-btn');
    const exitBtn = document.getElementById('reading-exit-btn');
    const outputArea = document.getElementById('zhuyin-output');
    if (!enterBtn || !exitBtn || !outputArea) return;

    // 閱讀模式時，被蓋住的區塊不讓鍵盤與螢幕閱讀器進入
    const hiddenRegions = () => Array.from(document.querySelectorAll('header, .input-section, footer'));

    const isReading = () => document.body.classList.contains('reading-mode');

    function enter() {
        if (enterBtn.disabled || isReading()) return;
        document.body.classList.add('reading-mode');
        hiddenRegions().forEach(el => el.setAttribute('inert', ''));
        outputArea.scrollTop = 0;
        const root = document.documentElement;
        if (root.requestFullscreen && !document.fullscreenElement) {
            root.requestFullscreen().catch(() => { /* 不支援或被拒絕時維持整頁顯示 */ });
        }
        exitBtn.focus();
    }

    function exit() {
        if (!isReading()) return;
        document.body.classList.remove('reading-mode');
        hiddenRegions().forEach(el => el.removeAttribute('inert'));
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
        enterBtn.focus();
    }

    enterBtn.addEventListener('click', enter);
    exitBtn.addEventListener('click', exit);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isReading()) exit();
    });

    // 使用者用瀏覽器的方式離開全螢幕時，一併離開閱讀模式
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && isReading()) exit();
    });

    // 結果區沒有注音時停用
    const updateState = () => {
        enterBtn.disabled = !outputArea.querySelector('.zhuyin-word');
    };
    new MutationObserver(updateState).observe(outputArea, { childList: true, subtree: true });
    updateState();
});
