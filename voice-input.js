/**
 * 注音小幫手 - 語音輸入模組 (Voice Input Module)
 * 使用 Web Speech API 進行即時中文語音辨識
 */
/**
 * 把語音辨識結果中的阿拉伯數字轉成國字，讓數字也能標上注音。
 * 例如「3個」→「三個」、「2個」→「兩個」、「105」→「一百零五」、「3.5」→「三點五」、
 * 「50%」→「百分之五十」、「2026年」→「二〇二六年」、「0912」→「〇九一二」。
 * 只用於語音輸入；使用者自己打的數字不會被改動。
 */
(function () {
    const DIGITS = '零一二三四五六七八九';
    const SMALL_UNITS = ['', '十', '百', '千'];
    const BIG_UNITS = ['', '萬', '億', '兆'];
    // 「2」後面接這些量詞時唸「兩」
    const LIANG_CLASSIFIERS = '個隻本張位次條件塊杯天週歲台輛種頁把雙對句碗瓶顆片根間份家餐';

    function readDigitByDigit(str) {
        return Array.from(str, (d) => (d === '0' ? '〇' : DIGITS[+d])).join('');
    }

    // 0～9999
    function readGroup(n) {
        let out = '';
        let pendingZero = false;
        for (let pos = 3; pos >= 0; pos--) {
            const d = Math.floor(n / 10 ** pos) % 10;
            if (d === 0) {
                if (out) pendingZero = true;
                continue;
            }
            if (pendingZero) { out += '零'; pendingZero = false; }
            out += DIGITS[d] + SMALL_UNITS[pos];
        }
        return out;
    }

    function readInteger(str) {
        const s = str.replace(/^0+(?=\d)/, '');
        if (s === '0') return '零';
        if (s.length > 16) return readDigitByDigit(s);
        const groups = [];
        for (let end = s.length; end > 0; end -= 4) {
            groups.unshift(parseInt(s.slice(Math.max(0, end - 4), end), 10));
        }
        let out = '';
        let needZero = false;
        groups.forEach((g, i) => {
            const unit = BIG_UNITS[groups.length - 1 - i];
            if (g === 0) { if (out) needZero = true; return; }
            if (out && (needZero || g < 1000)) out += '零';
            needZero = false;
            out += readGroup(g) + unit;
        });
        // 「一十」開頭時口語唸「十」，例如 10 → 十、15 → 十五、100000 → 十萬
        return out.replace(/^一十/, '十');
    }

    function digitsToChinese(text) {
        if (!text) return text;
        const half = text
            .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
            .replace(/[．]/g, '.')
            .replace(/(\d),(?=\d{3}(?!\d))/g, '$1'); // 去掉千分位逗號
        return half.replace(/(\d+)(?:\.(\d+))?([%％])?/g, (match, intPart, decPart, percent, offset, whole) => {
            const next = whole.charAt(offset + match.length);
            // 年份、電話、以 0 開頭的編號：逐字唸
            if (!decPart && !percent && ((intPart.length === 4 && next === '年') || (intPart.length > 1 && intPart[0] === '0'))) {
                return readDigitByDigit(intPart);
            }
            let out = (intPart === '2' && !decPart && !percent && next && LIANG_CLASSIFIERS.includes(next))
                ? '兩'
                : readInteger(intPart);
            if (decPart) out += '點' + Array.from(decPart, (d) => DIGITS[+d]).join('');
            return percent ? '百分之' + out : out;
        });
    }

    window.ZhuyinVoice = { digitsToChinese };
})();

document.addEventListener('DOMContentLoaded', () => {
    const inputArea = document.getElementById('chinese-input');
    const voiceBtn = document.getElementById('voice-input-btn');
    const clearBtn = document.getElementById('clear-input-btn');
    
    if (!inputArea || !voiceBtn) return;

    // ---------- 行內提示（取代 alert） ----------
    const messageEl = document.getElementById('input-message');
    let messageTimer;
    function showMessage(text) {
        if (!messageEl) return;
        messageEl.textContent = text;
        messageEl.hidden = false;
        clearTimeout(messageTimer);
        messageTimer = setTimeout(hideMessage, 6000);
    }
    function hideMessage() {
        if (!messageEl) return;
        clearTimeout(messageTimer);
        messageEl.hidden = true;
        messageEl.textContent = '';
    }
    if (messageEl) messageEl.addEventListener('click', hideMessage);

    // ---------- 手機版輸入框依內容長高（1 到 3 行） ----------
    const MOBILE_MAX_WIDTH = 768;
    const MAX_LINES = 3;
    // 用一個看不見的複製輸入框量測行數，不影響使用者的游標與捲動位置
    let mirror = null;
    function measureLines(lineHeight) {
        if (!mirror) {
            mirror = inputArea.cloneNode(false);
            mirror.removeAttribute('id');
            mirror.setAttribute('aria-hidden', 'true');
            mirror.tabIndex = -1;
            Object.assign(mirror.style, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none', top: '0', left: '0', height: '0px', transition: 'none' });
            inputArea.parentElement.appendChild(mirror);
        }
        mirror.style.width = `${inputArea.offsetWidth}px`;
        mirror.value = inputArea.value;
        const padding = parseFloat(getComputedStyle(mirror).paddingTop) + parseFloat(getComputedStyle(mirror).paddingBottom);
        return Math.max(1, Math.round((mirror.scrollHeight - padding) / lineHeight));
    }

    function autoResize() {
        if (window.innerWidth > MOBILE_MAX_WIDTH) {
            inputArea.style.height = '';
            inputArea.style.overflowY = '';
            inputArea.style.removeProperty('padding-top');
            inputArea.style.removeProperty('padding-bottom');
            return;
        }
        // 先還原上下內距，再依內容決定
        inputArea.style.removeProperty('padding-top');
        inputArea.style.removeProperty('padding-bottom');
        const style = getComputedStyle(inputArea);
        const lineHeight = parseFloat(style.lineHeight);
        const contentLines = measureLines(lineHeight);
        const overflowing = contentLines > MAX_LINES;
        const lines = Math.min(contentLines, MAX_LINES);
        let padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        if (overflowing) {
            // 需要捲動時，上下內距會露出前後一行的一小截；改為 0，捲動中才不會在邊緣看到半行字
            inputArea.style.setProperty('padding-top', '0px', 'important');
            inputArea.style.setProperty('padding-bottom', '0px', 'important');
            padY = 0;
        }
        const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
        // 高度剛好是整數行，不會出現半行字
        inputArea.style.height = `${Math.ceil(lines * lineHeight + padY + border)}px`;
        inputArea.style.overflowY = overflowing ? 'auto' : 'hidden';
    }
    inputArea.addEventListener('input', autoResize);
    window.addEventListener('resize', autoResize);
    // 等其他腳本還原上次的輸入內容後再量一次
    setTimeout(autoResize, 0);

    // 清除按鈕邏輯
    if (clearBtn) {
        const toggleClearBtn = () => {
            clearBtn.style.display = inputArea.value.length > 0 ? 'flex' : 'none';
        };

        // 初始狀態檢查
        toggleClearBtn();

        // 監聽輸入以調整清除按鈕顯示狀態
        inputArea.addEventListener('input', toggleClearBtn);

        // 點擊清除事件
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            inputArea.value = '';
            localStorage.setItem('zhuyin_input_text', '');
            inputArea.dispatchEvent(new Event('input'));
            inputArea.focus();
            toggleClearBtn();
        });
    }
    
    // 支援 Chrome、Safari 等主流瀏覽器的 SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        // 如果瀏覽器不支援，則保持隱藏，確保不破壞原本的版面與 UX
        voiceBtn.style.display = 'none';
        return;
    }
    
    // 支援語音輸入，將按鈕顯示出來
    voiceBtn.style.display = 'flex';
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // 單次語音辨識
    recognition.interimResults = true; // 啟用即時語音辨識預覽
    recognition.lang = 'zh-TW'; // 設定為台灣中文語系
    
    let isRecording = false;
    let originalPlaceholder = inputArea.placeholder;
    let insertStartPos = 0;
    let textBeforeInsert = '';
    let textAfterInsert = '';

    // 按需動態載入（Lazy Load）OpenCC 簡轉繁套件（含 SRI 完整性雜湊驗證），避免首屏載入 1.1MB 字典
    const OPENCC_CDN = 'https://cdn.jsdelivr.net/npm/opencc-js@1.4.2/dist/umd/cn2t.js';
    const OPENCC_SRI = 'sha384-yNJOMWWAWjkIS4ac4UuBSUEalVmzrz5LxWE+lviAdQLnHhWKjWuTs5d3ReXvpWU3';
    let openccConverter = null;
    let openccPromise = null;

    function ensureOpenCCLoaded() {
        if (typeof OpenCC !== 'undefined') return Promise.resolve();
        if (openccPromise) return openccPromise;
        openccPromise = new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = OPENCC_CDN;
            script.integrity = OPENCC_SRI;
            script.crossOrigin = 'anonymous';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => {
                openccPromise = null;
                resolve(); // 載入失敗時仍維持原文字輸出，不阻斷語音輸入
            };
            document.head.appendChild(script);
        });
        return openccPromise;
    }

    function toTraditionalTW(text) {
        if (!text || typeof OpenCC === 'undefined') return text;
        try {
            if (!openccConverter) {
                openccConverter = OpenCC.Converter({ from: 'cn', to: 'tw' });
            }
            return openccConverter(text);
        } catch (e) {
            console.error('OpenCC conversion failed:', e);
            return text;
        }
    }
    
    // 啟動錄音
    function startRecording() {
        ensureOpenCCLoaded();
        // 先於收起鍵盤前錄下目前游標選取範圍，隨即解除輸入框焦點以收起手機虛擬鍵盤
        insertStartPos = typeof inputArea.selectionStart === 'number' ? inputArea.selectionStart : inputArea.value.length;
        const insertEndPos = typeof inputArea.selectionEnd === 'number' ? inputArea.selectionEnd : inputArea.value.length;
        textBeforeInsert = inputArea.value.substring(0, insertStartPos);
        textAfterInsert = inputArea.value.substring(insertEndPos);
        inputArea.blur();
        try {
            recognition.start();
            // 在 onstart 觸發前就標記為錄音中，讓使用者快速再點一下也能取消
            isRecording = true;
        } catch (e) {
            console.error('Speech recognition start failed:', e);
            cleanup();
        }
    }
    
    // 停止錄音
    function stopRecording() {
        try {
            recognition.stop();
        } catch (e) {
            console.error('Speech recognition stop failed:', e);
            cleanup();
        }
    }
    
    // 按鈕點擊事件
    voiceBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });
    
    // 語音辨識啟動時
    recognition.onstart = () => {
        isRecording = true;
        voiceBtn.classList.add('recording');
        voiceBtn.title = '停止語音輸入';
        voiceBtn.setAttribute('aria-label', '停止語音輸入');
        hideMessage();
        inputArea.placeholder = '🔊 正在聆聽中，請說話...';
        inputArea.classList.add('voice-active');

        // 保持收起虛擬鍵盤，讓上方注音結果區展開至最大可視空間
        if (document.activeElement === inputArea) {
            inputArea.blur();
        }
    };
    
    // 取得語音辨識結果（含即時預覽與最終結果）
    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }

        if (transcript) {
            const convertedText = window.ZhuyinVoice.digitsToChinese(toTraditionalTW(transcript));
            const newVal = textBeforeInsert + convertedText + textAfterInsert;
            inputArea.value = newVal;
            
            // 僅在輸入框已聚焦時更新游標，避免在手機語音輸入途中重新喚起虛擬鍵盤
            const newCursorPos = insertStartPos + convertedText.length;
            if (document.activeElement === inputArea) {
                inputArea.setSelectionRange(newCursorPos, newCursorPos);
            }
            
            // 儲存至 localStorage 以供跨頁面或重新整理時讀取
            localStorage.setItem('zhuyin_input_text', newVal);
            
            // 自動觸發 input 事件，以便網頁中其他的轉換邏輯（app.js/app_moe.js/app_compare.js）即時進行注音轉換
            inputArea.dispatchEvent(new Event('input'));
            inputArea.scrollTop = inputArea.scrollHeight;
        }
    };
    
    // 錯誤處理
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
            showMessage('沒有麥克風權限。請在瀏覽器設定中允許這個網站使用麥克風。');
        } else if (event.error === 'service-not-allowed') {
            showMessage('目前瀏覽器環境不允許啟用語音辨識服務，請改用 Chrome 或 Safari 開啟。');
        } else if (event.error === 'audio-capture') {
            showMessage('找不到麥克風裝置，請確認麥克風已連接且未被其他程式佔用。');
        } else if (event.error === 'no-speech') {
            showMessage('沒有聽到聲音，請靠近麥克風再試一次。');
        } else if (event.error === 'aborted') {
            // 使用者主動取消或切換分頁，不需提示
        } else if (event.error === 'network') {
            showMessage('語音辨識需要網路，請檢查連線後再試一次。');
        } else {
            showMessage(`語音辨識沒有成功（${event.error}），請再試一次。`);
        }
        cleanup();
    };
    
    // 語音辨識結束（不論是正常結束還是發生錯誤）
    recognition.onend = () => {
        cleanup();
    };
    
    // 清理狀態與回復 UI 樣式
    function cleanup() {
        isRecording = false;
        voiceBtn.classList.remove('recording');
        voiceBtn.title = '語音輸入 (國語)';
        voiceBtn.setAttribute('aria-label', '語音輸入（國語）');
        inputArea.placeholder = originalPlaceholder;
        inputArea.classList.remove('voice-active');
    }
});
