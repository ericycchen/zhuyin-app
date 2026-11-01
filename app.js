/**
 * 注音小幫手 - 即時極速版 (Taiwan Bopomofo Engine - ButTaiwan/bpmfvs)
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

    function updateZhuyin() {
        const text = inputArea.value;
        
        if (!text.trim()) {
            outputArea.innerHTML = '<span class="placeholder-text">轉換結果將顯示於此...</span>';
            return;
        }

        try {
            const tokens = TaiwanZhuyin.textToTokens(text);
            let finalHtml = '';

            for (const token of tokens) {
                if (token.char === '\n') {
                    finalHtml += '<br>';
                } else if (token.zhuyin) {
                    const { chars, tone } = ZhuyinRender.splitTone(token.zhuyin);
                    const bopoHtml = ZhuyinRender.bopoHtml(chars, tone);
                    finalHtml += `<span class="zhuyin-word"><span class="zhuyin-char">${escapeHtml(token.char)}</span><span class="zhuyin-bopomofo">${bopoHtml}</span></span>`;
                } else {
                    finalHtml += escapeHtml(token.char);
                }
            }
            
            outputArea.innerHTML = finalHtml;
            ZhuyinRender.attachPunctuation(outputArea);
            
        } catch (error) {
            console.error(error);
            outputArea.innerHTML = '<span class="output-error" role="alert">轉換過程中發生錯誤，請稍後再試。</span>';
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
