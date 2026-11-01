/**
 * 注音小幫手 - 智慧推薦／比對版 (台灣 ButTaiwan/bpmfvs 本地引擎 + 教育部萌典多字詞組校對)
 */
document.addEventListener('DOMContentLoaded', () => {
    const inputArea = document.getElementById('chinese-input');
    const outputArea = document.getElementById('zhuyin-output');
    const fontSizeSlider = document.getElementById('font-size-slider');
    
    if (fontSizeSlider) {
        // 字級滑桿只控制結果區；輸入框字級由 CSS 固定
        try {
            const savedSize = parseInt(localStorage.getItem('zhuyin_font_size'), 10);
            if (savedSize >= +fontSizeSlider.min && savedSize <= +fontSizeSlider.max) {
                fontSizeSlider.value = savedSize;
            }
        } catch (e) { /* localStorage 無法使用時維持預設值 */ }

        function updateFontSizes() {
            outputArea.style.fontSize = `${fontSizeSlider.value}px`;
        }
        fontSizeSlider.addEventListener('input', () => {
            updateFontSizes();
            try { localStorage.setItem('zhuyin_font_size', fontSizeSlider.value); } catch (e) {}
        });
        updateFontSizes();
    }

    if (typeof TaiwanZhuyin === 'undefined') {
        outputArea.innerHTML = '<span class="output-error" role="alert">載入台灣注音詞庫失敗，請重新整理頁面。</span>';
        return;
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function getNormalizedBopo(str) {
        if (!str) return '';
        str = str.replace(/<[^>]+>/g, '').replace(/（.*?）|\(.*?\)/g, '').trim();
        if (str.endsWith('˙')) str = '˙' + str.slice(0, -1);
        return str;
    }

    function formatBopomofo(bopoStr) {
        if (!bopoStr) return '';
        const cleaned = getNormalizedBopo(bopoStr);
        const { chars, tone } = ZhuyinRender.splitTone(cleaned);
        return ZhuyinRender.bopoHtml(chars, tone);
    }

    // 判斷兩讀音是否僅為「一／不」連讀變調差異（不視為破音錯誤）
    function isToneSandhiEquivalent(char, bopoA, bopoB) {
        if (bopoA === bopoB) return true;
        if (char === '不') {
            const set = new Set(['ㄅㄨˋ', 'ㄅㄨˊ']);
            return set.has(bopoA) && set.has(bopoB);
        }
        if (char === '一') {
            const set = new Set(['ㄧ', 'ㄧˊ', 'ㄧˋ']);
            return set.has(bopoA) && set.has(bopoB);
        }
        return false;
    }

    // Moedict Cache
    const moeCache = {};

    async function fetchMoedict(text) {
        if (moeCache[text] !== undefined) return moeCache[text];
        try {
            const response = await fetch(`https://www.moedict.tw/a/${encodeURIComponent(text)}.json`);
            if (!response.ok) {
                moeCache[text] = null;
                return null;
            }
            const data = await response.json();
            if (data.h && data.h.length > 0) {
                let bestH = null;
                let maxDefs = -1;
                for (let i = 0; i < data.h.length; i++) {
                    if (data.h[i].b) {
                        let defCount = data.h[i].d ? data.h[i].d.length : 0;
                        if (defCount > maxDefs) {
                            maxDefs = defCount;
                            bestH = data.h[i];
                        }
                    }
                }
                if (bestH) {
                    moeCache[text] = bestH.b;
                    return bestH.b;
                }
            }
            moeCache[text] = null;
            return null;
        } catch (e) {
            moeCache[text] = null;
            return null;
        }
    }

    let compareIdCounter = 0;

    async function compareWithMoedict(text, currentCompareId) {
        if (!text) return;
        
        const allChars = Array.from(text);
        const chineseChars = [];
        let charIdx = 0;
        for (let i = 0; i < allChars.length; i++) {
            const ch = allChars[i];
            if (TaiwanZhuyin.getDefaultCharBopo(ch) || /[\u4e00-\u9fff]/.test(ch)) {
                chineseChars.push({ char: ch, index: charIdx });
                charIdx++;
            }
        }
        
        if (chineseChars.length === 0) return;
        
        let segments = [];
        if (window.Intl && Intl.Segmenter) {
            const segmenter = new Intl.Segmenter('zh-TW', { granularity: 'word' });
            segments = Array.from(segmenter.segment(text)).map(s => s.segment);
        } else {
            segments = allChars;
        }
        
        // 僅針對 2 字以上的完整詞組查詢萌典校對；單字已採用教育部審訂表第一讀音與 poyin_db，不以萌典單字釋義數覆蓋
        const wordsToFetch = new Set();
        segments.forEach(seg => {
            const segChars = Array.from(seg);
            if (segChars.length >= 2 && /[\u4e00-\u9fff]/.test(seg)) {
                wordsToFetch.add(seg);
            }
        });
        
        await Promise.all(Array.from(wordsToFetch).map(word => fetchMoedict(word)));
        
        if (compareIdCounter !== currentCompareId) return; // Abort if a newer compare started

        // 若有本地未收錄的生僻字，才向萌典查詢單字補齊
        const rareCharsToFetch = new Set();
        for (const item of chineseChars) {
            if (!TaiwanZhuyin.getDefaultCharBopo(item.char)) {
                rareCharsToFetch.add(item.char);
            }
        }
        await Promise.all(Array.from(rareCharsToFetch).map(char => fetchMoedict(char)));
        
        if (compareIdCounter !== currentCompareId) return;
        
        const moedictResults = [];
        
        for (let seg of segments) {
            const segChars = Array.from(seg);
            const hasChinese = segChars.some(ch => TaiwanZhuyin.getDefaultCharBopo(ch) || /[\u4e00-\u9fff]/.test(ch));
            if (!hasChinese) continue;
            
            let wordBopo = segChars.length >= 2 ? moeCache[seg] : null;
            if (wordBopo) {
                const bopoParts = wordBopo.split(/[\s\u3000]+/);
                for (let i = 0; i < segChars.length; i++) {
                    const char = segChars[i];
                    if (TaiwanZhuyin.getDefaultCharBopo(char) || /[\u4e00-\u9fff]/.test(char)) {
                        moedictResults.push(bopoParts[i] || '');
                    }
                }
            } else {
                for (let i = 0; i < segChars.length; i++) {
                    const char = segChars[i];
                    if (TaiwanZhuyin.getDefaultCharBopo(char) || /[\u4e00-\u9fff]/.test(char)) {
                        // 單字若本地已有讀音則不覆蓋；若為生僻字則取萌典單字讀音
                        if (!TaiwanZhuyin.getDefaultCharBopo(char) && moeCache[char]) {
                            moedictResults.push(moeCache[char].split(/[\s\u3000]+/)[0]);
                        } else {
                            moedictResults.push('');
                        }
                    }
                }
            }
        }
        
        for (let i = 0; i < chineseChars.length; i++) {
            const item = chineseChars[i];
            const moeRaw = getNormalizedBopo(moedictResults[i]);
            if (!moeRaw) continue;
            
            const container = document.querySelector(`.zhuyin-word[data-char-index="${item.index}"]`);
            if (container && !container.classList.contains('diff-container')) {
                const fastRaw = container.getAttribute('data-fast-bopo');
                if (!isToneSandhiEquivalent(item.char, moeRaw, fastRaw)) {
                    const bopoSpan = container.querySelector('.zhuyin-bopomofo');
                    const fastHtml = bopoSpan.innerHTML;
                    const moeHtml = formatBopomofo(moeRaw);
                    
                    bopoSpan.outerHTML = `
                        <span class="zhuyin-bopomofo diff-moe diff-orange">${moeHtml}</span>
                        <span class="zhuyin-bopomofo diff-fast">${fastHtml}</span>
                    `;
                    container.classList.add('diff-container');
                    makeDiffToggle(container, item.char, moeRaw, fastRaw);
                }
            }
        }
        updateLegend();
    }

    // ---------- 差異字：點一下（或 Enter / 空白鍵）切換萌典／極速版讀音 ----------
    const legend = document.getElementById('diff-legend');

    function makeDiffToggle(container, char, moeRaw, fastRaw) {
        container.setAttribute('role', 'button');
        container.setAttribute('tabindex', '0');
        container.dataset.char = char;
        container.dataset.moeBopo = moeRaw;
        updateDiffLabel(container);
    }

    function updateDiffLabel(container) {
        const showFast = container.classList.contains('show-fast');
        const moe = container.dataset.moeBopo;
        const fast = container.getAttribute('data-fast-bopo') || '（無）';
        container.setAttribute('aria-pressed', String(showFast));
        container.setAttribute('aria-label', showFast
            ? `${container.dataset.char}，目前顯示預設讀音 ${fast}，萌典詞組為 ${moe}。按一下切換`
            : `${container.dataset.char}，目前顯示萌典詞組讀音 ${moe}，預設為 ${fast}。按一下切換`);
    }

    function toggleDiff(container) {
        container.classList.toggle('show-fast');
        updateDiffLabel(container);
    }

    function updateLegend() {
        if (!legend) return;
        const count = outputArea.querySelectorAll('.diff-container').length;
        if (count === 0) {
            legend.hidden = true;
            legend.textContent = '';
            return;
        }
        legend.innerHTML = `有 ${count} 個字讀音不同，以<span class="diff-sample">橘色底線</span>標示（顯示萌典詞組讀音）。點一下可切換讀音。`;
        legend.hidden = false;
    }

    outputArea.addEventListener('click', (e) => {
        const container = e.target.closest('.diff-container');
        if (container && outputArea.contains(container)) toggleDiff(container);
    });

    outputArea.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const container = e.target.closest('.diff-container');
        if (container) {
            e.preventDefault();
            toggleDiff(container);
        }
    });

    function renderFastAndTriggerCompare(text) {
        if (legend) { legend.hidden = true; legend.textContent = ''; }
        if (!text.trim()) {
            outputArea.innerHTML = '<span class="placeholder-text">轉換結果將顯示於此...</span>';
            return;
        }

        const tokens = TaiwanZhuyin.textToTokens(text);
        let finalHtml = '';
        let charIndex = 0;

        for (const token of tokens) {
            if (token.char === '\n') {
                finalHtml += '<br>';
            } else if (token.zhuyin || /[\u4e00-\u9fff]/.test(token.char)) {
                const fastBopoRaw = getNormalizedBopo(token.zhuyin || '');
                const fastBopoHtml = fastBopoRaw ? formatBopomofo(fastBopoRaw) : '';
                finalHtml += `<span class="zhuyin-word" data-char-index="${charIndex}" data-char="${escapeHtml(token.char)}" data-fast-bopo="${fastBopoRaw}"><span class="zhuyin-char">${escapeHtml(token.char)}</span><span class="zhuyin-bopomofo">${fastBopoHtml}</span></span>`;
                charIndex++;
            } else {
                finalHtml += escapeHtml(token.char);
            }
        }
        
        outputArea.innerHTML = finalHtml;
        ZhuyinRender.attachPunctuation(outputArea);
    }

    inputArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && window.innerWidth <= 768) {
            e.preventDefault();
            inputArea.blur();
        }
    });

    // Persist text across pages
    inputArea.addEventListener('input', (e) => {
        localStorage.setItem('zhuyin_input_text', e.target.value);
    });

    let compareTimer;
    inputArea.addEventListener('input', () => {
        const text = inputArea.value;
        // Fast synchronous render
        renderFastAndTriggerCompare(text);
        
        // Debounced asynchronous compare
        clearTimeout(compareTimer);
        compareTimer = setTimeout(() => {
            compareIdCounter++;
            compareWithMoedict(text, compareIdCounter);
        }, 400);
    });

    // Restore text from localStorage on page load
    const savedText = localStorage.getItem('zhuyin_input_text');
    if (savedText) {
        inputArea.value = savedText;
        inputArea.dispatchEvent(new Event('input'));
    } else if (inputArea.value.trim()) {
        inputArea.dispatchEvent(new Event('input'));
    }
});
