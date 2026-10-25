/**
 * 注音小幫手 - 語音輸入模組 (Voice Input Module)
 * 使用 Web Speech API 進行即時中文語音辨識
 */
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
            return;
        }
        const style = getComputedStyle(inputArea);
        const lineHeight = parseFloat(style.lineHeight);
        const extra = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
            + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
        const contentLines = measureLines(lineHeight);
        const lines = Math.min(contentLines, MAX_LINES);
        // 高度剛好是整數行，不會出現半行字
        inputArea.style.height = `${Math.ceil(lines * lineHeight + extra)}px`;
        inputArea.style.overflowY = contentLines > MAX_LINES ? 'auto' : 'hidden';
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
    recognition.interimResults = false; // 只取得最終辨識結果
    recognition.lang = 'zh-TW'; // 設定為台灣中文語系
    
    let isRecording = false;
    let originalPlaceholder = inputArea.placeholder;
    
    // 啟動錄音
    function startRecording() {
        try {
            recognition.start();
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
        
        // 可選：自動聚焦輸入框
        inputArea.focus();
    };
    
    // 取得語音辨識結果
    recognition.onresult = (event) => {
        let resultText = event.results[0][0].transcript;
        if (resultText) {
            // 自動將簡體中文轉換為繁體中文（台灣標準）
            if (typeof OpenCC !== 'undefined') {
                try {
                    const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
                    resultText = converter(resultText);
                } catch (e) {
                    console.error('OpenCC conversion failed:', e);
                }
            }

            // 在游標當前位置插入文字，保留原本上下文
            const startPos = inputArea.selectionStart;
            const endPos = inputArea.selectionEnd;
            const originalVal = inputArea.value;
            
            const newVal = originalVal.substring(0, startPos) + resultText + originalVal.substring(endPos);
            inputArea.value = newVal;
            
            // 更新游標位置至新插入文字的後方
            const newCursorPos = startPos + resultText.length;
            inputArea.setSelectionRange(newCursorPos, newCursorPos);
            
            // 儲存至 localStorage 以供跨頁面或重新整理時讀取
            localStorage.setItem('zhuyin_input_text', newVal);
            
            // 自動觸發 input 事件，以便網頁中其他的轉換邏輯（app.js/app_moe.js/app_compare.js）即時進行注音轉換
            inputArea.dispatchEvent(new Event('input'));
        }
    };
    
    // 錯誤處理
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
            showMessage('沒有麥克風權限。請在瀏覽器設定中允許這個網站使用麥克風。');
        } else if (event.error === 'no-speech') {
            // 靜默處理無語音狀態
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
