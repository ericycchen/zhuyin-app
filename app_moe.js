/**
 * 注音小幫手 - 辭典精準版 (教育部萌典 API + 台灣教育部審訂表單字保底)
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

    // Moedict Cache
    const moeCache = {};

    function cleanBopo(str) {
        if (!str) return '';
        let s = str.replace(/<[^>]+>/g, '').replace(/（.*?）|\(.*?\)/g, '').trim();
        if (s.endsWith('˙')) s = '˙' + s.slice(0, -1);
        return s;
    }

    async function fetchMoedict(text) {
        if (moeCache[text] !== undefined) return moeCache[text];

        // 單字優先採用台灣教育部《國語一字多音審訂表》第一常用讀音，避免萌典以釋義數量誤選罕見破音（如：呢->ㄋㄧˊ、的->ㄉㄧˊ）
        const chars = Array.from(text);
        if (chars.length === 1 && typeof TaiwanZhuyin !== 'undefined') {
            const twDefault = TaiwanZhuyin.getDefaultCharBopo(chars[0]);
            if (twDefault) {
                moeCache[text] = twDefault;
                return twDefault;
            }
        }

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

    function formatBopomofo(bopoStr) {
        if (!bopoStr) return '';
        const cleaned = cleanBopo(bopoStr);
        const { chars, tone } = ZhuyinRender.splitTone(cleaned);
        return ZhuyinRender.bopoHtml(chars, tone);
    }

    async function processText(text) {
        if (!text.trim()) {
            outputArea.innerHTML = '<span class="placeholder-text">轉換結果將顯示於此... (初次轉換可能需要連線時間)</span>';
            return;
        }

        outputArea.innerHTML = '<span class="placeholder-text" style="color:var(--text-muted);">正在查詢萌典...</span>';

        // 先用台灣本地破音字詞庫做整句預判（處理「還不錯」、「睡著了」等跨詞破音與「不」變調）
        const localTokens = (typeof TaiwanZhuyin !== 'undefined')
            ? TaiwanZhuyin.textToTokens(text)
            : Array.from(text).map(c => ({ char: c, zhuyin: null }));

        let segments = [];
        if (window.Intl && Intl.Segmenter) {
            const segmenter = new Intl.Segmenter('zh-TW', { granularity: 'word' });
            segments = Array.from(segmenter.segment(text)).map(s => s.segment);
        } else {
            segments = Array.from(text);
        }

        // 只針對 2 字以上的詞組向萌典查詢，單字直接採用台灣本地引擎的上下文讀音
        const wordsToFetch = new Set();
        segments.forEach(seg => {
            const segChars = Array.from(seg);
            if (segChars.length >= 2 && /[\u4e00-\u9fff]/.test(seg)) {
                wordsToFetch.add(seg);
            }
        });
        
        await Promise.all(Array.from(wordsToFetch).map(word => fetchMoedict(word)));

        // 若有本地未收錄的生僻單字，再向萌典查詢單字
        const rareCharsToFetch = new Set();
        for (const token of localTokens) {
            if (/[\u4e00-\u9fff]/.test(token.char) && !token.zhuyin) {
                rareCharsToFetch.add(token.char);
            }
        }
        await Promise.all(Array.from(rareCharsToFetch).map(ch => fetchMoedict(ch)));

        let finalHtml = '';
        let globalCharIdx = 0;
        
        for (let seg of segments) {
            const segChars = Array.from(seg);
            if (!/[\u4e00-\u9fff]/.test(seg)) {
                finalHtml += seg.replace(/\n/g, '<br>');
                globalCharIdx += segChars.length;
                continue;
            }
            
            let bopoStr = segChars.length >= 2 ? moeCache[seg] : null;
            if (bopoStr) {
                const bopoParts = bopoStr.split(/[\s\u3000]+/);
                for (let i = 0; i < segChars.length; i++) {
                    const char = segChars[i];
                    const localBopo = localTokens[globalCharIdx] ? localTokens[globalCharIdx].zhuyin : '';
                    let bopo = bopoParts[i] || localBopo || '';
                    // 若詞組內含「不」且本地引擎已判定四聲前變調（ㄅㄨˊ），保留自然變調讀音
                    if (char === '不' && localBopo === 'ㄅㄨˊ' && cleanBopo(bopo) === 'ㄅㄨˋ') {
                        bopo = 'ㄅㄨˊ';
                    }
                    finalHtml += `<span class="zhuyin-word"><span class="zhuyin-char">${char}</span><span class="zhuyin-bopomofo">${formatBopomofo(bopo)}</span></span>`;
                    globalCharIdx++;
                }
            } else {
                for (let i = 0; i < segChars.length; i++) {
                    const char = segChars[i];
                    const localBopo = localTokens[globalCharIdx] ? localTokens[globalCharIdx].zhuyin : null;
                    globalCharIdx++;
                    if (!/[\u4e00-\u9fff]/.test(char)) {
                        finalHtml += char.replace(/\n/g, '<br>');
                        continue;
                    }
                    let charBopo = localBopo || (moeCache[char] ? moeCache[char].split(/[\s\u3000]+/)[0] : '');
                    finalHtml += `<span class="zhuyin-word"><span class="zhuyin-char">${char}</span><span class="zhuyin-bopomofo">${formatBopomofo(charBopo)}</span></span>`;
                }
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

    let debounceTimer;
    inputArea.addEventListener('input', (e) => {
        localStorage.setItem('zhuyin_input_text', e.target.value);
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            processText(inputArea.value);
        }, 300);
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
