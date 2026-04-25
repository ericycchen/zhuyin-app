// pinyin-zhuyin conversion logic (adapted from pinyin-zhuyin package)
const initials = {
    b: 'ㄅ', p: 'ㄆ', m: 'ㄇ', f: 'ㄈ', d: 'ㄉ', t: 'ㄊ', n: 'ㄋ', l: 'ㄌ',
    g: 'ㄍ', k: 'ㄎ', h: 'ㄏ', j: 'ㄐ', q: 'ㄑ', x: 'ㄒ', zh: 'ㄓ', ch: 'ㄔ',
    sh: 'ㄕ', r: 'ㄖ', z: 'ㄗ', c: 'ㄘ', s: 'ㄙ',
};
const finals = {
    a: 'ㄚ', o: 'ㄛ', e: 'ㄜ', ai: 'ㄞ', ei: 'ㄟ', ao: 'ㄠ', ou: 'ㄡ',
    an: 'ㄢ', ang: 'ㄤ', en: 'ㄣ', eng: 'ㄥ', er: 'ㄦ',
    u: 'ㄨ', ua: 'ㄨㄚ', uo: 'ㄨㄛ', uai: 'ㄨㄞ', ui: 'ㄨㄟ',
    uan: 'ㄨㄢ', uang: 'ㄨㄤ', un: 'ㄨㄣ', ueng: 'ㄨㄥ', ong: 'ㄨㄥ',
    i: 'ㄧ', ia: 'ㄧㄚ', ie: 'ㄧㄝ', iao: 'ㄧㄠ', iu: 'ㄧㄡ',
    ian: 'ㄧㄢ', iang: 'ㄧㄤ', in: 'ㄧㄣ', ing: 'ㄧㄥ',
    ü: 'ㄩ', üe: 'ㄩㄝ', ue: 'ㄩㄝ', üan: 'ㄩㄢ', ün: 'ㄩㄣ', iong: 'ㄩㄥ', v: 'ㄩ', ve: 'ㄩㄝ', van: 'ㄩㄢ', vn: 'ㄩㄣ'
};
const individuals = {
    zhi: 'ㄓ', chi: 'ㄔ', shi: 'ㄕ', ri: 'ㄖ', zi: 'ㄗ', ci: 'ㄘ', si: 'ㄙ',
    a: 'ㄚ', o: 'ㄛ', e: 'ㄜ', ai: 'ㄞ', ei: 'ㄟ', ao: 'ㄠ', ou: 'ㄡ',
    an: 'ㄢ', ang: 'ㄤ', en: 'ㄣ', eng: 'ㄥ', er: 'ㄦ', r: 'ㄦ',
    wu: 'ㄨ', wa: 'ㄨㄚ', wo: 'ㄨㄛ', wai: 'ㄨㄞ', wei: 'ㄨㄟ',
    wan: 'ㄨㄢ', wang: 'ㄨㄤ', wen: 'ㄨㄣ', weng: 'ㄨㄥ',
    yi: 'ㄧ', ya: 'ㄧㄚ', ye: 'ㄧㄝ', yao: 'ㄧㄠ', you: 'ㄧㄡ',
    yan: 'ㄧㄢ', yang: 'ㄧㄤ', yin: 'ㄧㄣ', ying: 'ㄧㄥ',
    yu: 'ㄩ', yue: 'ㄩㄝ', yuan: 'ㄩㄢ', yun: 'ㄩㄣ', yong: 'ㄩㄥ',
};
const toneMap = {
    ā: 'a1', á: 'a2', ǎ: 'a3', à: 'a4',
    ē: 'e1', é: 'e2', ě: 'e3', è: 'e4',
    ī: 'i1', í: 'i2', ǐ: 'i3', ì: 'i4',
    ō: 'o1', ó: 'o2', ǒ: 'o3', ò: 'o4',
    ū: 'u1', ú: 'u2', ǔ: 'u3', ù: 'u4',
    ǖ: 'ü1', ǘ: 'ü2', ǚ: 'ü3', ǜ: 'ü4',
};

const findAccentedChars = function (text) {
    const accentsFound = {};
    for (let i = 0; i < text.length; i++) {
        for (const accentedChar in toneMap) {
            if (text[i].toLowerCase() === accentedChar) {
                accentsFound[i] = toneMap[accentedChar];
            }
        }
    }
    return accentsFound;
};

const removeAccents = function (accentedChars, text) {
    let output = '';
    for (let i = 0; i < text.length; i++) {
        if (i in accentedChars) {
            output += accentedChars[i][0];
        } else {
            output += text[i];
        }
    }
    return output;
};

const getKeys = function (obj) {
    const output = [];
    for (const key in obj) { output.push(key); }
    return output;
};

const findBetween = function (list, min, max) {
    let i = 0;
    while (i < list.length) {
        if (list[i] > max) break;
        if (list[i] >= min) return list[i];
        i++;
    }
    return -1;
};

const lenComp = function (a, b) {
    if (a.length === b.length) return 0;
    return a.length < b.length ? 1 : -1;
};

const individualRexp = new RegExp('^(' + getKeys(individuals).sort(lenComp).join('|') + ')(\\d)?', 'i');
const initialFinalRexp = new RegExp('^(' + getKeys(initials).sort(lenComp).join('|') + ')(' + getKeys(finals).sort(lenComp).join('|') + ')(\\d)?', 'i');

const toneNumberToSymbol = {
    0: '˙', 1: '', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ', 5: '˙',
};

const pinyinToZhuyin = function (pinyinText) {
    if (!pinyinText) return pinyinText;
    const accentedChars = findAccentedChars(pinyinText);
    const sortedAccentedIndicies = getKeys(accentedChars).map(x => parseInt(x, 10));
    const text = removeAccents(accentedChars, pinyinText);
    
    const parseToken = function (i) {
        let parse, detectedToneIdx;
        const token = { start: i };
        
        parse = text.slice(i).match(initialFinalRexp);
        if (parse) {
            parse = parse.map(x => x ? x.toLowerCase() : x);
            token.zhuyin = initials[parse[1]] + finals[parse[2]];
            token.type = 'pinyin';
            if (typeof parse[3] !== 'undefined') {
                token.tone = parseInt(parse[3], 10);
            } else {
                detectedToneIdx = findBetween(sortedAccentedIndicies, i, i + parse[0].length);
                if (detectedToneIdx >= 0) {
                    token.tone = +accentedChars[detectedToneIdx][1];
                } else {
                    token.tone = 5;
                }
            }
        } else {
            parse = text.slice(i).match(individualRexp);
            if (parse) {
                parse = parse.map(x => x ? x.toLowerCase() : x);
                token.zhuyin = individuals[parse[1]];
                token.type = 'pinyin';
                if (typeof parse[2] !== 'undefined') {
                    token.tone = parseInt(parse[2], 10);
                } else {
                    detectedToneIdx = findBetween(sortedAccentedIndicies, i, i + parse[0].length);
                    if (detectedToneIdx >= 0) {
                        token.tone = +accentedChars[detectedToneIdx][1];
                    } else {
                        token.tone = 5; // Default to neutral tone if no tone found, wait, usually it's 1. 5 is neutral.
                        // Actually, pinyin-zhuyin default is 5.
                    }
                }
            } else {
                token.type = 'other';
                parse = [text[i]];
            }
        }
        token.parse = parse;
        return token;
    };
    
    const tokens = [];
    let curToken;
    let i = 0;
    while (i < text.length) {
        curToken = parseToken(i);
        tokens.push(curToken);
        i += curToken.parse[0].length;
    }
    
    return tokens.map(token => {
        if (token.type === 'other') return token.parse.join('');
        
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
        
        let html = '<span class="bopo-container">';
        if (token.tone === 5 || token.tone === 0) {
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
    }).join('');
};

// Main App Logic
document.addEventListener('DOMContentLoaded', () => {
    const inputArea = document.getElementById('chinese-input');
    const outputArea = document.getElementById('zhuyin-output');
    const fontSizeSlider = document.getElementById('font-size-slider');
    
    if (fontSizeSlider) {
        function updateFontSizes() {
            outputArea.style.fontSize = `${fontSizeSlider.value}px`;
            if (window.innerWidth > 768) {
                inputArea.style.fontSize = `${fontSizeSlider.value}px`;
            } else {
                inputArea.style.fontSize = '1.2rem';
            }
        }
        fontSizeSlider.addEventListener('input', updateFontSizes);
        window.addEventListener('resize', updateFontSizes);
        updateFontSizes();
    }
    
    if (typeof pinyinPro === 'undefined') {
        outputArea.innerHTML = '<span style="color: red;">載入 pinyin-pro 失敗，請檢查網路連線。</span>';
        return;
    }

    const { html, customPinyin } = pinyinPro;

    // Fix incorrect pinyin for specific characters
    if (customPinyin) {
        customPinyin({
            '妳': 'nǐ'
        });
    }

    function updateZhuyin() {
        const text = inputArea.value;
        
        if (!text.trim()) {
            outputArea.innerHTML = '<span class="placeholder-text">轉換結果將顯示於此...</span>';
            return;
        }

        try {
            // Get HTML with pinyin from pinyin-pro
            // This nicely wraps Chinese chars in ruby tags and handles heteronyms
            const rawHtml = html(text);
            
            // Create a temp element to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rawHtml;
            
            // Convert each ruby tag to custom span layout
            const rubyElements = tempDiv.querySelectorAll('ruby');
            rubyElements.forEach(ruby => {
                const chineseSpan = ruby.querySelector('.py-chinese-item');
                const rt = ruby.querySelector('rt');
                
                if (chineseSpan && rt) {
                    const char = chineseSpan.textContent;
                    const pinyinStr = rt.textContent.trim();
                    const zhuyinStr = pinyinStr ? pinyinToZhuyin(pinyinStr) : '';
                    
                    const newContainer = document.createElement('span');
                    newContainer.className = 'zhuyin-word';
                    
                    const newChar = document.createElement('span');
                    newChar.className = 'zhuyin-char';
                    newChar.textContent = char;
                    
                    const newBopomofo = document.createElement('span');
                    newBopomofo.className = 'zhuyin-bopomofo';
                    newBopomofo.innerHTML = zhuyinStr;
                    
                    newContainer.appendChild(newChar);
                    newContainer.appendChild(newBopomofo);
                    
                    ruby.parentNode.replaceChild(newContainer, ruby);
                }
            });
            
            // Render the updated HTML
            // We format newlines correctly
            let finalHtml = tempDiv.innerHTML;
            // We use <br> for newlines in block layout.
            finalHtml = finalHtml.replace(/\n/g, '<br>').replace(/<br\/>/g, '<br>');
            
            outputArea.innerHTML = finalHtml;
            
        } catch (error) {
            console.error(error);
            outputArea.innerHTML = '<span style="color: red;">轉換過程中發生錯誤。</span>';
        }
    }

    inputArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && window.innerWidth <= 768) {
            e.preventDefault();
            inputArea.blur();
        }
    });

    inputArea.addEventListener('input', (e) => {
        localStorage.setItem('zhuyin_input_text', e.target.value);
        updateZhuyin(e);
    });
    
    inputArea.addEventListener('paste', () => {
        setTimeout(updateZhuyin, 0);
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
