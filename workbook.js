/**
 * 注音小幫手 - 國語生字作業簿列印模組 (Workbook Print Module)
 * 遵循台灣教育部標準生字作業簿規格：
 * 1. 直式直行（由上往下書寫、直欄由右向左排列）
 * 2. 國字田字格 (30:30, 正方形 1:1) 與右側注音欄 (15:30, 長寬 1:2) 等高齊頭齊底
 * 3. 注音欄內三等分格（聲母、介母、韻母）依音節精確分佈，聲調嚴格錨定於欄內
 */
(function () {
    const HAN_REGEX = /[\u4e00-\u9fa5]/;

    document.addEventListener('DOMContentLoaded', () => {
        const workbookBtn = document.getElementById('workbook-btn');
        const modal = document.getElementById('workbook-modal');
        const closeBtn = document.getElementById('wb-close-btn');
        const chipsContainer = document.getElementById('wb-chips-container');
        const toggleAllBtn = document.getElementById('wb-toggle-all-btn');
        const directionSelect = document.getElementById('wb-layout-direction');
        const colsSelect = document.getElementById('wb-cols-per-page');
        const cellsSelect = document.getElementById('wb-cells-count');
        const traceSelect = document.getElementById('wb-trace-count');
        const printArea = document.getElementById('workbook-print-area');
        const printActionBtn = document.getElementById('wb-print-action-btn');
        const outputArea = document.getElementById('zhuyin-output');

        if (!workbookBtn || !modal || !outputArea) return;

        let charList = []; // [{ char, chars, tone, selected }]

        // 監聽結果區內容變化以啟用作業簿按鈕
        const updateBtnState = () => {
            const hasWords = Array.from(outputArea.querySelectorAll('.zhuyin-word')).some(w => {
                const charEl = w.querySelector('.zhuyin-char');
                return charEl && HAN_REGEX.test(charEl.textContent.trim());
            });
            workbookBtn.disabled = !hasWords;
        };

        new MutationObserver(updateBtnState).observe(outputArea, { childList: true, subtree: true });
        updateBtnState();

        // 從目前結果區擷取生字（保留使用者點選切換的讀音，去除非漢字與重覆字）
        function extractCharacters() {
            const words = outputArea.querySelectorAll('.zhuyin-word');
            const seen = new Set();
            const list = [];

            words.forEach(w => {
                const charEl = w.querySelector('.zhuyin-char');
                if (!charEl) return;
                const char = charEl.textContent.trim();
                if (!HAN_REGEX.test(char)) return;

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
            charList.forEach((item) => {
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

        /**
         * 產生教育部標準直式注音欄 HTML
         * 依據教育部《國語注音符號手冊》直式注音幾何體式：
         * - 左側 60% (9/15) 為注音符號直排區
         * - 右側 40% (6/15) 為聲調符號區
         * - 二、三、四聲錨定於最後一個符號右上側（單符號約 36%、雙符號約 50%、三符號約 64%）
         * - 輕聲（˙）標於首個符號正上方中央
         */
        function generateBopoColHtml(chars, tone, isTrace, isBlank) {
            if (isBlank || !chars) {
                return '<div class="wb-zhuyin-col wb-zhuyin-blank"></div>';
            }

            let cleanChars = chars || '';
            let cleanTone = tone || '';
            if (window.ZhuyinRender && window.ZhuyinRender.splitTone) {
                const split = window.ZhuyinRender.splitTone(cleanChars);
                cleanChars = split.chars;
                if (!cleanTone && split.tone) {
                    cleanTone = split.tone;
                }
            }

            const symbols = Array.from(cleanChars);
            const count = Math.min(3, Math.max(1, symbols.length));
            const isLight = cleanTone === '˙';

            const symsHtml = symbols.map(s => `<span class="wb-bopo-sym">${s}</span>`).join('');

            let toneHtml = '';
            if (isLight) {
                toneHtml = '<span class="wb-bopo-tone wb-tone-light">˙</span>';
            } else if (cleanTone) {
                toneHtml = `<span class="wb-bopo-tone wb-tone-mark wb-tone-pos-${count}">${cleanTone}</span>`;
            }

            return `
                <div class="wb-zhuyin-col wb-bopo-count-${count} ${isLight ? 'has-light-tone' : ''} ${isTrace ? 'wb-trace-text' : ''}">
                    <div class="wb-bopo-symbols-col">
                        ${symsHtml}
                    </div>
                    ${toneHtml}
                </div>
            `;
        }

        /**
         * 產生單元格（田字格 30:30 + 注音欄 15:30）
         */
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
            const isVertical = !directionSelect || directionSelect.value === 'vertical';
            const colsPerPage = parseInt(colsSelect ? colsSelect.value : '7', 10);
            const cellsCount = parseInt(cellsSelect ? cellsSelect.value : '10', 10);
            const traceCount = parseInt(traceSelect ? traceSelect.value : '2', 10);

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

            // 分頁邏輯
            const itemsPerPage = isVertical ? colsPerPage : Math.min(8, colsPerPage);
            const pages = [];
            for (let i = 0; i < selectedItems.length; i += itemsPerPage) {
                pages.push(selectedItems.slice(i, i + itemsPerPage));
            }

            let fullHtml = '';
            pages.forEach((pageItems, pageIdx) => {
                let bodyHtml = '';

                if (isVertical) {
                    // 直式直行：直欄由右向左排列，每欄從上往下書寫
                    let colsHtml = '';
                    pageItems.forEach((item) => {
                        let cellsHtml = '';
                        // 1. 示範格 (1格)
                        cellsHtml += generateCellHtml(item, 'model');

                        // 2. 描紅格 (traceCount 格)
                        const actualTrace = Math.min(traceCount, cellsCount - 1);
                        for (let t = 0; t < actualTrace; t++) {
                            cellsHtml += generateCellHtml(item, 'trace');
                        }

                        // 3. 空白練習格 (其餘格)
                        const blankCount = Math.max(0, cellsCount - 1 - actualTrace);
                        for (let b = 0; b < blankCount; b++) {
                            cellsHtml += generateCellHtml(item, 'blank');
                        }

                        colsHtml += `<div class="wb-column">${cellsHtml}</div>`;
                    });

                    bodyHtml = `<div class="wb-columns-container">${colsHtml}</div>`;
                } else {
                    // 橫式橫行：橫行由上往下排列，每行從左向右書寫
                    let rowsHtml = '';
                    pageItems.forEach((item) => {
                        let cellsHtml = '';
                        cellsHtml += generateCellHtml(item, 'model');

                        const actualTrace = Math.min(traceCount, cellsCount - 1);
                        for (let t = 0; t < actualTrace; t++) {
                            cellsHtml += generateCellHtml(item, 'trace');
                        }

                        const blankCount = Math.max(0, cellsCount - 1 - actualTrace);
                        for (let b = 0; b < blankCount; b++) {
                            cellsHtml += generateCellHtml(item, 'blank');
                        }

                        rowsHtml += `<div class="wb-row">${cellsHtml}</div>`;
                    });

                    bodyHtml = `<div class="wb-rows-container">${rowsHtml}</div>`;
                }

                fullHtml += `
                    <div class="wb-page ${isVertical ? 'wb-layout-vertical' : 'wb-layout-horizontal'}">
                        <div class="wb-page-header">
                            <div class="wb-header-title-box">
                                <h3 class="wb-sheet-title">國語生字語詞簿</h3>
                                <span class="wb-moe-badge">教育部標準規格</span>
                            </div>
                            <div class="wb-student-info">
                                <span>______ 年 ______ 班</span>
                                <span>座號：______</span>
                                <span>姓名：____________</span>
                                <span class="wb-page-num">第 ${pageIdx + 1} / ${pages.length} 頁</span>
                            </div>
                        </div>
                        <div class="wb-page-body">
                            ${bodyHtml}
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
            if (!modal.open) {
                if (modal.showModal) {
                    modal.showModal();
                } else {
                    modal.setAttribute('open', '');
                }
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

        if (directionSelect) directionSelect.addEventListener('change', renderWorkbookPreview);
        if (colsSelect) colsSelect.addEventListener('change', renderWorkbookPreview);
        if (cellsSelect) cellsSelect.addEventListener('change', renderWorkbookPreview);
        if (traceSelect) traceSelect.addEventListener('change', renderWorkbookPreview);

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
