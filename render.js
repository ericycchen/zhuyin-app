/**
 * 注音小幫手 - 共用排版模組 (Shared rendering)
 * 三個版本（高速版、萌典版、比對版）共用的注音 HTML 結構與標點處理。
 * 拼音轉注音、萌典查詢等「讀音來源」仍留在各版本自己的檔案中。
 */
(function () {
    // 接在前一個字後面的標點（不可出現在行首）
    const CLOSING_PUNCT = '，。、；：！？）」』》〉】〕…—．,.;:!?)';
    // 接在下一個字前面的標點（不可出現在行尾）
    const OPENING_PUNCT = '（「『《〈【〔(';

    /**
     * 產生單一注音的 HTML。
     * @param {string} chars 注音符號本體，例如「ㄏㄠ」
     * @param {string} tone  聲調符號：''（一聲）、'ˊ'、'ˇ'、'ˋ'、'˙'
     */
    function bopoHtml(chars, tone) {
        if (!chars) return '';
        let html = '<span class="bopo-container">';
        if (tone === '˙') {
            // 輕聲：置於注音最上方正中央
            html += `<span class="bopo-tone tone-light">˙</span>`;
            html += `<span class="bopo-chars">${chars}</span>`;
        } else {
            html += `<span class="bopo-chars">${chars}</span>`;
            if (tone) {
                // 二、三、四聲：標於注音右上角外緣（見 docs/zhuyin-guide.md）
                html += `<span class="bopo-tone tone-mark">${tone}</span>`;
            }
        }
        html += '</span>';
        return html;
    }

    /**
     * 把注音字串（例如「ㄏㄠˇ」或「˙ㄉㄜ」）拆成符號本體與聲調。
     */
    function splitTone(bopoStr) {
        if (!bopoStr) return { chars: '', tone: '' };
        const s = bopoStr.trim();
        if (s.startsWith('˙')) return { chars: s.slice(1), tone: '˙' };
        const last = s.slice(-1);
        if ('˙ˊˇˋ'.includes(last)) return { chars: s.slice(0, -1), tone: last };
        return { chars: s, tone: '' };
    }

    /**
     * 把結果區中散落的標點併進相鄰的字，讓字與標點一起換行：
     * 「，。！」等接在前一個字後面，「「（」等接在下一個字前面。
     */
    function attachPunctuation(root) {
        // pinyin-pro 會把每個字包在 span.py-result-item 裡，先拆開讓字和標點成為同層節點
        root.querySelectorAll('.py-result-item').forEach(wrapper => {
            wrapper.replaceWith(...wrapper.childNodes);
        });

        const isWord = node => node && node.nodeType === 1 && node.classList.contains('zhuyin-word');
        const punctSpan = ch => {
            const span = document.createElement('span');
            span.className = 'zhuyin-punct';
            span.textContent = ch;
            return span;
        };

        let pendingOpen = [];
        const flushOpen = (beforeNode) => {
            pendingOpen.forEach(span => root.insertBefore(span, beforeNode));
            pendingOpen = [];
        };

        Array.from(root.childNodes).forEach(node => {
            if (isWord(node)) {
                if (pendingOpen.length) {
                    pendingOpen.reverse().forEach(span => node.insertBefore(span, node.firstChild));
                    pendingOpen = [];
                }
                return;
            }
            if (node.nodeType !== 3) {
                flushOpen(node);
                return;
            }

            const text = node.textContent;
            const frag = document.createDocumentFragment();
            let buffer = '';
            const flushText = () => {
                if (buffer) { frag.appendChild(document.createTextNode(buffer)); buffer = ''; }
            };

            for (const ch of text) {
                const prev = frag.lastChild || node.previousSibling;
                if (CLOSING_PUNCT.includes(ch) && !buffer && !pendingOpen.length && isWord(prev)) {
                    prev.appendChild(punctSpan(ch));
                } else if (OPENING_PUNCT.includes(ch)) {
                    flushText();
                    pendingOpen.push(punctSpan(ch));
                } else {
                    if (pendingOpen.length) {
                        pendingOpen.forEach(span => frag.appendChild(span));
                        pendingOpen = [];
                    }
                    buffer += ch;
                }
            }
            flushText();
            root.replaceChild(frag, node);
        });
        flushOpen(null);
    }

    window.ZhuyinRender = { bopoHtml, splitTone, attachPunctuation };
})();
