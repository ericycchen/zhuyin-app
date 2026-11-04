/**
 * 注音小幫手 - 國語生字作業簿列印模組 (Workbook Print Module)
 * 遵循台灣教育部標準生字簿規格（田字格 + 右側注音欄 30:15 比例）
 */
(function () {
    const HAN_REGEX = /[\u4e00-\u9fa5]/;

    document.addEventListener('DOMContentLoaded', () => {
        const workbookBtn = document.getElementById('workbook-btn');
        const modal = document.getElementById('workbook-modal');
        const closeBtn = document.getElementById('wb-close-btn');
        const chipsContainer = document.getElementById('wb-chips-container');
        const toggleAllBtn = document.getElementById('wb-toggle-all-btn');
        const traceSelect = document.getElementById('wb-trace-count');
        const cellsSelect = document.getElementById('wb-cells-per-row');
        const printArea = document.getElementById('workbook-print-area');
        const printActionBtn = document.getElementById('wb-print-action-btn');
        const outputArea = document.getElementById('zhuyin-output');

        if (!workbookBtn || !modal || !outputArea) return;

        let charList = []; // [{ char, chars, tone, rawZhuyin, selected }]

        // 監聽結果區內容變化以啟用按鈕
        const updateBtnState = () => {
            const hasWords = Array.from(outputArea.querySelectorAll('.zhuyin-word')).some(w => {
                const charEl = w.querySelector('.zhuyin-char');
                return charEl && HAN_REGEX.test(charEl.textContent.trim());
            });
            workbookBtn.disabled = !hasWords;
        };

        new MutationObserver(updateBtnState).observe(outputArea, { childList: true, subtree: true });
        updateBtnState();

        // 從目前結果區擷取生字（保留使用者切換的讀音，去除標點與非漢字）
        function extractCharacters() {
            const words = outputArea.querySelectorAll('.zhuyin-word');
            const seen = new Set();
            const list = [];

            words.forEach(w => {
                const charEl = w.querySelector('.zhuyin-char');
                if (!charEl) return;
                const char = charEl.textContent.trim();
                if (!HAN_REGEX.test(char)) return; // 僅保留漢字

                const bopoCharsEl = w.querySelector('.bopo-chars');
                const bopoChars = bopoCharsEl ? bopoCharsEl.textContent.trim() : '';
                const toneEl = w.querySelector('.bopo-tone');
                let tone = '';
                if (toneEl) {
                    tone = toneEl.textContent.trim();
                }

                const key = `${char}_${bopoChars}_${tone}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    list.push({
                        char,
                        chars: bopoChars,
                        tone,
                        selected: true
                    });
                }
            });
            return list;
        }

        // 渲染挑選生字的 Chips
        function renderChips() {
            if (!chipsContainer) return;
            chipsContainer.innerHTML = '';
            charList.forEach((item, idx) => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = `wb-chip ${item.selected ? 'is-selected' : ''}`;
                chip.setAttribute('aria-pressed', item.selected ? 'true' : 'false');
                chip.innerHTML = `
                    <span class="wb-chip-check">${item.selected ? '✓' : ''}</span>
                    <span class="wb-chip-char">${item.char}</span>
                    <span class="wb-chip-bopo">${item.chars}${item.tone}</span>
                `;
                chip.addEventListener('click', () => {
                    item.selected = !item.selected;
                    renderChips();
                    renderWorkbookPreview();
                    updateToggleAllBtn();
                });
                chipsContainer.appendChild(chip);
            });
            updateToggleAllBtn();
        }

        function updateToggleAllBtn() {
            if (!toggleAllBtn) return;
            const anySelected = charList.some(item => item.selected);
            toggleAllBtn.textContent = anySelected ? '全部取消' : '全部選取';
        }

        if (toggleAllBtn) {
            toggleAllBtn.addEventListener('click', () => {
                const anySelected = charList.some(item => item.selected);
                charList.forEach(item => { item.selected = !anySelected; });
                renderChips();
                renderWorkbookPreview();
            });
        }

        // 產生單一注音欄的 HTML
        function generateBopoColHtml(chars, tone, isTrace, isBlank) {
            if (isBlank || !chars) {
                return '<div class="wb-zhuyin-col wb-zhuyin-blank"></div>';
            }
            const bopoInner = window.ZhuyinRender ? window.ZhuyinRender.bopoHtml(chars, tone) : chars + tone;
            return `
                <div class="wb-zhuyin-col ${isTrace ? 'wb-trace-text' : ''}">
                    ${bopoInner}
                </div>
            `;
        }

        // 產生一個單元格（田字格 + 注音欄）
        function generateCellHtml(item, type) {
            const isModel = type === 'model';
            const isTrace = type === 'trace';
            const isBlank = type === 'blank';

            const charContent = isBlank ? '' : item.char;
            const charClass = isTrace ? 'wb-trace-text' : (isModel ? 'wb-model-text' : '');

            return `
                <div class="wb-cell ${type}">
                    <div class="wb-grid">
                        <span class="wb-char ${charClass}">${charContent}</span>
                    </div>
                    ${generateBopoColHtml(item.chars, item.tone, isTrace, isBlank)}
                </div>
            `;
        }

        // 渲染 A4 作業簿
        function renderWorkbookPreview() {
            if (!printArea) return;
            const selectedItems = charList.filter(item => item.selected);
            const traceCount = parseInt(traceSelect ? traceSelect.value : '2', 10);
            const cellsPerRow = parseInt(cellsSelect ? cellsSelect.value : '7', 10);

            if (selectedItems.length === 0) {
                printArea.innerHTML = `
                    <div class="wb-empty-tip">
                        尚未選取任何生字。請點擊上方生字標籤進行挑選。
                    </div>
                `;
                if (printActionBtn) printActionBtn.disabled = true;
                return;
            }

            if (printActionBtn) printActionBtn.disabled = false;

            // 每頁最多排 9 行生字（A4 直式標準高度容納）
            const ROWS_PER_PAGE = 9;
            const pages = [];
            for (let i = 0; i < selectedItems.length; i += ROWS_PER_PAGE) {
                pages.push(selectedItems.slice(i, i + ROWS_PER_PAGE));
            }

            let fullHtml = '';
            pages.forEach((pageItems, pageIdx) => {
                let rowsHtml = '';
                pageItems.forEach((item) => {
                    let cellsHtml = '';
                    // 1. 示範格 (1格)
                    cellsHtml += generateCellHtml(item, 'model');

                    // 2. 描紅格 (traceCount 格)
                    const actualTrace = Math.min(traceCount, cellsPerRow - 1);
                    for (let t = 0; t < actualTrace; t++) {
                        cellsHtml += generateCellHtml(item, 'trace');
                    }

                    // 3. 空白練習格 (其餘格)
                    const blankCount = Math.max(0, cellsPerRow - 1 - actualTrace);
                    for (let b = 0; b < blankCount; b++) {
                        cellsHtml += generateCellHtml(item, 'blank');
                    }

                    rowsHtml += `<div class="wb-row">${cellsHtml}</div>`;
                });

                fullHtml += `
                    <div class="wb-page">
                        <div class="wb-page-header">
                            <h3 class="wb-sheet-title">國語生字語詞簿</h3>
                            <div class="wb-student-info">
                                <span>______ 年 ______ 班</span>
                                <span>座號：______</span>
                                <span>姓名：____________</span>
                                <span class="wb-page-num">第 ${pageIdx + 1} / ${pages.length} 頁</span>
                            </div>
                        </div>
                        <div class="wb-rows-container">
                            ${rowsHtml}
                        </div>
                    </div>
                `;
            });

            printArea.innerHTML = fullHtml;
        }

        // 開啟 Modal
        workbookBtn.addEventListener('click', () => {
            charList = extractCharacters();
            if (charList.length === 0) return;
            renderChips();
            renderWorkbookPreview();
            if (modal.showModal) {
                modal.showModal();
            } else {
                modal.setAttribute('open', '');
            }
        });

        // 關閉 Modal
        const closeModal = () => {
            if (modal.close) {
                modal.close();
            } else {
                modal.removeAttribute('open');
            }
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        if (traceSelect) traceSelect.addEventListener('change', renderWorkbookPreview);
        if (cellsSelect) cellsSelect.addEventListener('change', renderWorkbookPreview);

        // 列印按鈕：印作業簿
        if (printActionBtn) {
            printActionBtn.addEventListener('click', () => {
                document.body.classList.add('printing-workbook');
                window.print();
            });
        }

        // 列印完成後復原 class
        window.addEventListener('afterprint', () => {
            document.body.classList.remove('printing-workbook');
        });
    });
})();
