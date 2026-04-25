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

    const { html } = pinyinPro; // Use raw pinyin-pro without customPinyin

    const toneNumberToSymbol = {
        0: '˙', 1: '', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ', 5: '˙'
    };

    // pinyin-zhuyin conversion tables
    const initials = {
        'b': 'ㄅ', 'p': 'ㄆ', 'm': 'ㄇ', 'f': 'ㄈ',
        'd': 'ㄉ', 't': 'ㄊ', 'n': 'ㄋ', 'l': 'ㄌ',
        'g': 'ㄍ', 'k': 'ㄎ', 'h': 'ㄏ',
        'j': 'ㄐ', 'q': 'ㄑ', 'x': 'ㄒ',
        'zh': 'ㄓ', 'ch': 'ㄔ', 'sh': 'ㄕ', 'r': 'ㄖ',
        'z': 'ㄗ', 'c': 'ㄘ', 's': 'ㄙ'
    };

    const finals = {
        'a': 'ㄚ', 'o': 'ㄛ', 'e': 'ㄜ', 'e^': 'ㄝ',
        'ai': 'ㄞ', 'ei': 'ㄟ', 'ao': 'ㄠ', 'ou': 'ㄡ',
        'an': 'ㄢ', 'en': 'ㄣ', 'ang': 'ㄤ', 'eng': 'ㄥ',
        'er': 'ㄦ', 'i': 'ㄧ', 'ia': 'ㄧㄚ', 'io': 'ㄧㄛ',
        'ie': 'ㄧㄝ', 'iai': 'ㄧㄞ', 'iao': 'ㄧㄠ', 'iu': 'ㄧㄡ',
        'ian': 'ㄧㄢ', 'in': 'ㄧㄣ', 'iang': 'ㄧㄤ', 'ing': 'ㄧㄥ',
        'u': 'ㄨ', 'ua': 'ㄨㄚ', 'uo': 'ㄨㄛ', 'uai': 'ㄨㄞ',
        'ui': 'ㄨㄟ', 'uan': 'ㄨㄢ', 'un': 'ㄨㄣ', 'uang': 'ㄨㄤ',
        'ong': 'ㄨㄥ', 'v': 'ㄩ', 've': 'ㄩㄝ', 'van': 'ㄩㄢ',
        'vn': 'ㄩㄣ', 'iong': 'ㄩㄥ'
    };

    const individuals = {
        'zhi': 'ㄓ', 'chi': 'ㄔ', 'shi': 'ㄕ', 'ri': 'ㄖ',
        'zi': 'ㄗ', 'ci': 'ㄘ', 'si': 'ㄙ', 'yi': 'ㄧ',
        'ya': 'ㄧㄚ', 'yo': 'ㄧㄛ', 'ye': 'ㄧㄝ', 'yai': 'ㄧㄞ',
        'yao': 'ㄧㄠ', 'you': 'ㄧㄡ', 'yan': 'ㄧㄢ', 'yin': 'ㄧㄣ',
        'yang': 'ㄧㄤ', 'ying': 'ㄧㄥ', 'wu': 'ㄨ', 'wa': 'ㄨㄚ',
        'wo': 'ㄨㄛ', 'wai': 'ㄨㄞ', 'wei': 'ㄨㄟ', 'wan': 'ㄨㄢ',
        'wen': 'ㄨㄣ', 'wang': 'ㄨㄤ', 'weng': 'ㄨㄥ', 'yu': 'ㄩ',
        'yue': 'ㄩㄝ', 'yuan': 'ㄩㄢ', 'yun': 'ㄩㄣ', 'yong': 'ㄩㄥ'
    };

    function getKeys(obj) { return Object.keys(obj); }
    function lenComp(a, b) { return b.length - a.length; }

    const individualRexp = new RegExp('^(' + getKeys(individuals).sort(lenComp).join('|') + ')(\\d)?', 'i');
    const initialFinalRexp = new RegExp('^(' + getKeys(initials).sort(lenComp).join('|') + ')(' + getKeys(finals).sort(lenComp).join('|') + ')(\\d)?', 'i');
    const initialRexp = new RegExp('^(' + getKeys(initials).sort(lenComp).join('|') + ')(\\d)?', 'i');
    const finalRexp = new RegExp('^(' + getKeys(finals).sort(lenComp).join('|') + ')(\\d)?', 'i');

    const toneMap = {
        'ā': 'a1', 'á': 'a2', 'ǎ': 'a3', 'à': 'a4',
        'ō': 'o1', 'ó': 'o2', 'ǒ': 'o3', 'ò': 'o4',
        'ē': 'e1', 'é': 'e2', 'ě': 'e3', 'è': 'e4',
        'ī': 'i1', 'í': 'i2', 'ǐ': 'i3', 'ì': 'i4',
        'ū': 'u1', 'ú': 'u2', 'ǔ': 'u3', 'ù': 'u4',
        'ǖ': 'v1', 'ǘ': 'v2', 'ǚ': 'v3', 'ǜ': 'v4',
        'ü': 'v'
    };

    function findAccentedChars(str) {
        for (let key in toneMap) {
            str = str.replace(new RegExp(key, 'g'), toneMap[key]);
        }
        return str;
    }

    function removeAccents(str) {
        let nStr = str.replace(/\d/g, '');
        nStr = nStr.replace(/ü/g, 'v');
        nStr = nStr.replace(/ê/g, 'e^');
        return nStr;
    }

    function parseToken(pinyinStr) {
        let pStr = findAccentedChars(pinyinStr);
        let tone = pStr.match(/\d/);
        tone = tone ? parseInt(tone[0]) : 5; // default to light tone if not found
        
        let nStr = removeAccents(pStr);
        let result = { pinyin: pinyinStr, type: 'other', parse: [nStr], tone: tone, zhuyin: nStr };

        let m = individualRexp.exec(nStr);
        if (m) {
            result.type = 'individual';
            result.parse = [m[1], m[2]];
            result.zhuyin = individuals[m[1].toLowerCase()];
        } else {
            m = initialFinalRexp.exec(nStr);
            if (m) {
                result.type = 'initialFinal';
                result.parse = [m[1], m[2], m[3]];
                result.zhuyin = initials[m[1].toLowerCase()] + finals[m[2].toLowerCase()];
            } else {
                m = initialRexp.exec(nStr);
                if (m) {
                    result.type = 'initial';
                    result.parse = [m[1], m[2]];
                    result.zhuyin = initials[m[1].toLowerCase()];
                } else {
                    m = finalRexp.exec(nStr);
                    if (m) {
                        result.type = 'final';
                        result.parse = [m[1], m[2]];
                        result.zhuyin = finals[m[1].toLowerCase()];
                    }
                }
            }
        }
        return result;
    }

    function pinyinToZhuyinData(pinyinStr) {
        let tokens = pinyinStr.split(/\s+/).map(parseToken);
        if (tokens.length === 0) return null;
        const token = tokens[0];
        if (token.type === 'other') return null;

        let zy = token.zhuyin
            .replace(/ㄐㄨ/g, 'ㄐㄩ')
            .replace(/ㄑㄨ/g, 'ㄑㄩ')
            .replace(/ㄒㄨ/g, 'ㄒㄩ')
            .replace(/ㄓㄧ/g, 'ㄓ')
            .replace(/ㄔㄧ/g, 'ㄔ')
            .replace(/ㄕㄧ/g, 'ㄕ')
            .replace(/ㄖㄧ/g, 'ㄖ')
            .replace(/ㄗㄧ/g, 'ㄗ')
            .replace(/ㄘㄧ/g, 'ㄘ')
            .replace(/ㄙㄧ/g, 'ㄙ')
            .replace(/\u200b'/g, '');

        let toneSymbol = toneNumberToSymbol[token.tone] !== undefined ? toneNumberToSymbol[token.tone] : '';
        
        return { zy, toneSymbol, tone: token.tone };
    }

    function buildFastHtml(data) {
        if (!data) return '';
        const { zy, toneSymbol, tone } = data;
        let html = '<span class="bopo-container">';
        if (tone === 5 || tone === 0) {
            html += `<span class="bopo-tone tone-light">${toneSymbol}</span>`;
            html += `<span class="bopo-chars">${zy}</span>`;
        } else {
            html += `<span class="bopo-chars">${zy}</span>`;
            if (toneSymbol) {
                html += `<span class="bopo-tone tone-mark">${toneSymbol}</span>`;
            }
        }
        html += '</span>';
        return html;
    }

    function getNormalizedBopo(str) {
        if (!str) return '';
        str = str.replace(/<[^>]+>/g, '').replace(/（.*?）|\(.*?\)/g, '').trim();
        if (str.endsWith('˙')) str = '˙' + str.slice(0, -1);
        return str;
    }

    function formatMoedictBopomofo(bopoStr) {
        if (!bopoStr) return '';
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
        
        const chineseChars = [];
        let charIdx = 0;
        for (let i = 0; i < text.length; i++) {
            if (/[\u4e00-\u9fa5]/.test(text[i])) {
                chineseChars.push({ char: text[i], index: charIdx });
                charIdx++;
            }
        }
        
        if (chineseChars.length === 0) return;
        
        let segments = [];
        if (window.Intl && Intl.Segmenter) {
            const segmenter = new Intl.Segmenter('zh-TW', { granularity: 'word' });
            segments = Array.from(segmenter.segment(text)).map(s => s.segment);
        } else {
            segments = text.split('');
        }
        
        const wordsToFetch = new Set();
        segments.forEach(seg => {
            if (/[\u4e00-\u9fa5]/.test(seg)) wordsToFetch.add(seg);
        });
        
        await Promise.all(Array.from(wordsToFetch).map(word => fetchMoedict(word)));
        
        if (compareIdCounter !== currentCompareId) return; // Abort if a newer compare started

        const charsToFetch = new Set();
        for (let seg of segments) {
            if (/[\u4e00-\u9fa5]/.test(seg) && !moeCache[seg]) {
                for (let char of seg) {
                    if (/[\u4e00-\u9fa5]/.test(char)) charsToFetch.add(char);
                }
            }
        }
        await Promise.all(Array.from(charsToFetch).map(char => fetchMoedict(char)));
        
        if (compareIdCounter !== currentCompareId) return; // Abort if a newer compare started
        
        let moedictResults = []; 
        
        for (let seg of segments) {
            if (!/[\u4e00-\u9fa5]/.test(seg)) continue;
            
            let wordBopo = moeCache[seg];
            if (wordBopo) {
                const bopoParts = wordBopo.split(/[\s\u3000]+/);
                for (let i = 0; i < seg.length; i++) {
                    const char = seg[i];
                    if (/[\u4e00-\u9fa5]/.test(char)) {
                        moedictResults.push(bopoParts[i] || '');
                    }
                }
            } else {
                for (let i = 0; i < seg.length; i++) {
                    const char = seg[i];
                    if (/[\u4e00-\u9fa5]/.test(char)) {
                        let charBopo = moeCache[char];
                        if (charBopo) {
                            moedictResults.push(charBopo.split(/[\s\u3000]+/)[0]);
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
            
            const container = document.querySelector(`.zhuyin-word[data-char-index="${item.index}"]`);
            if (container && !container.classList.contains('diff-container')) {
                const fastRaw = container.getAttribute('data-fast-bopo');
                if (moeRaw && moeRaw !== fastRaw) {
                    const bopoSpan = container.querySelector('.zhuyin-bopomofo');
                    const fastHtml = bopoSpan.innerHTML;
                    const moeHtml = formatMoedictBopomofo(moedictResults[i]);
                    
                    bopoSpan.outerHTML = `
                        <span class="zhuyin-bopomofo diff-moe diff-orange">${moeHtml}</span>
                        <span class="zhuyin-bopomofo diff-fast">${fastHtml}</span>
                    `;
                    container.classList.add('diff-container');
                }
            }
        }
    }

    function renderFastAndTriggerCompare(text) {
        if (!text.trim()) {
            outputArea.innerHTML = '<span class="placeholder-text">轉換結果將顯示於此...</span>';
            return;
        }

        const rawHtml = html(text);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawHtml;
        
        const rubyElements = tempDiv.querySelectorAll('ruby');
        let charIndex = 0;
        
        rubyElements.forEach(ruby => {
            const chineseSpan = ruby.querySelector('.py-chinese-item');
            const rt = ruby.querySelector('rt');
            
            if (chineseSpan && rt) {
                const char = chineseSpan.textContent;
                const pinyinStr = rt.textContent.trim();
                
                const data = pinyinStr ? pinyinToZhuyinData(pinyinStr) : null;
                const fastBopoHtml = data ? buildFastHtml(data) : '';
                const fastBopoRaw = data ? getNormalizedBopo(data.zy + data.toneSymbol) : '';
                
                const newContainer = document.createElement('span');
                newContainer.className = 'zhuyin-word';
                newContainer.setAttribute('data-char-index', charIndex);
                newContainer.setAttribute('data-char', char);
                newContainer.setAttribute('data-fast-bopo', fastBopoRaw);
                
                const newChar = document.createElement('span');
                newChar.className = 'zhuyin-char';
                newChar.textContent = char;
                
                const newBopomofo = document.createElement('span');
                newBopomofo.className = 'zhuyin-bopomofo';
                newBopomofo.innerHTML = fastBopoHtml;
                
                newContainer.appendChild(newChar);
                newContainer.appendChild(newBopomofo);
                
                ruby.parentNode.replaceChild(newContainer, ruby);
                charIndex++;
            }
        });
        
        outputArea.innerHTML = tempDiv.innerHTML.replace(/\n/g, '<br>').replace(/<br\/>/g, '<br>');
    }

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
        }, 500);
    });

    // Initial check
    if (inputArea.value.trim()) {
        const text = inputArea.value;
        renderFastAndTriggerCompare(text);
        compareIdCounter++;
        compareWithMoedict(text, compareIdCounter);
    }
});
