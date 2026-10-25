/**
 * 注音小幫手 - 列印模組
 * 結果區有注音時才能按「列印」；列印樣式見 style.css 的 @media print。
 */
document.addEventListener('DOMContentLoaded', () => {
    const printBtn = document.getElementById('print-btn');
    const outputArea = document.getElementById('zhuyin-output');
    if (!printBtn || !outputArea) return;

    const updateState = () => {
        printBtn.disabled = !outputArea.querySelector('.zhuyin-word');
    };

    new MutationObserver(updateState).observe(outputArea, { childList: true, subtree: true });
    updateState();

    printBtn.addEventListener('click', () => {
        if (!printBtn.disabled) window.print();
    });
});
