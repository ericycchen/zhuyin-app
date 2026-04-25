document.addEventListener('DOMContentLoaded', () => {
    const inputArea = document.getElementById('chinese-input');
    const outputArea = document.getElementById('zhuyin-output');
    const fontSizeSlider = document.getElementById('font-size-slider');
    
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', (e) => {
            outputArea.style.fontSize = `${e.target.value}px`;
            inputArea.style.fontSize = `${e.target.value}px`;
        });
        outputArea.style.fontSize = `${fontSizeSlider.value}px`;
        inputArea.style.fontSize = `${fontSizeSlider.value}px`;
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

    function formatBopomofo(bopoStr) {
        if (!bopoStr) return '';
        // remove HTML tags or brackets
        bopoStr = bopoStr.replace(/<[^>]+>/g, '').replace(/（.*?）|\(.*?\)/g, '').trim();
        
        let tone = '';
        let chars = bopoStr;
        const toneMarks = ['˙', 'ˊ', 'ˇ', 'ˋ'];
        
        if (bopoStr.startsWith('˙')) {
            tone = '˙';
            chars = bopoStr.substring(1);
        } else {
            const lastChar = bopoStr.slice(-1);
            if (toneMarks.includes(lastChar)) {
                tone = lastChar;
                chars = bopoStr.slice(0, -1);
            }
        }
        
        let html = '<span class="bopo-container">';
        if (tone === '˙') {
            html += `<span class="bopo-tone tone-light">${tone}</span>`;
            html += `<span class="bopo-chars">${chars}</span>`;
        } else {
            html += `<span class="bopo-chars">${chars}</span>`;
            if (tone) {
                html += `<span class="bopo-tone tone-mark">${tone}</span>`;
            }
        }
        html += '</span>';
        return html;
    }

    async function processText(text) {
        if (!text.trim()) {
            outputArea.innerHTML = '<span class="placeholder-text">轉換結果將顯示於此... (初次轉換可能需要連線時間)</span>';
            return;
        }

        outputArea.innerHTML = '<span class="placeholder-text" style="color:var(--text-muted);">正在查詢萌典...</span>';

        let segments = [];
        if (window.Intl && Intl.Segmenter) {
            const segmenter = new Intl.Segmenter('zh-TW', { granularity: 'word' });
            segments = Array.from(segmenter.segment(text)).map(s => s.segment);
        } else {
            segments = text.split('');
        }

        // Parallel fetching for words
        const wordsToFetch = new Set();
        segments.forEach(seg => {
            if (/[\u4e00-\u9fa5]/.test(seg)) wordsToFetch.add(seg);
        });
        
        await Promise.all(Array.from(wordsToFetch).map(word => fetchMoedict(word)));

        // Fallback fetching for characters if word failed
        const charsToFetch = new Set();
        for (let seg of segments) {
            if (/[\u4e00-\u9fa5]/.test(seg) && !moeCache[seg]) {
                for (let char of seg) {
                    if (/[\u4e00-\u9fa5]/.test(char)) charsToFetch.add(char);
                }
            }
        }
        await Promise.all(Array.from(charsToFetch).map(char => fetchMoedict(char)));

        let finalHtml = '';
        
        for (let seg of segments) {
            if (!/[\u4e00-\u9fa5]/.test(seg)) {
                finalHtml += seg.replace(/\n/g, '<br>');
                continue;
            }
            
            let bopoStr = moeCache[seg];
            if (bopoStr) {
                const bopoParts = bopoStr.split(/[\s\u3000]+/);
                for (let i = 0; i < seg.length; i++) {
                    const char = seg[i];
                    const bopo = bopoParts[i] || '';
                    finalHtml += `<span class="zhuyin-word"><span class="zhuyin-char">${char}</span><span class="zhuyin-bopomofo">${formatBopomofo(bopo)}</span></span>`;
                }
            } else {
                for (let i = 0; i < seg.length; i++) {
                    const char = seg[i];
                    if (!/[\u4e00-\u9fa5]/.test(char)) {
                        finalHtml += char.replace(/\n/g, '<br>');
                        continue;
                    }
                    let charBopo = moeCache[char];
                    if (charBopo) {
                        finalHtml += `<span class="zhuyin-word"><span class="zhuyin-char">${char}</span><span class="zhuyin-bopomofo">${formatBopomofo(charBopo.split(/[\s\u3000]+/)[0])}</span></span>`;
                    } else {
                        finalHtml += `<span class="zhuyin-word"><span class="zhuyin-char">${char}</span><span class="zhuyin-bopomofo"></span></span>`;
                    }
                }
            }
        }
        
        outputArea.innerHTML = finalHtml;
    }

    let debounceTimer;
    inputArea.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            processText(inputArea.value);
        }, 500);
    });

    // Initial check if there's already text
    if (inputArea.value.trim()) {
        processText(inputArea.value);
    }
});
