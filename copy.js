/**
 * 注音小幫手 - 複製模組
 * - 複製文字：帶 <ruby> 注音的 HTML（貼到 Word／Google 文件），純文字為「國（ㄍㄨㄛˊ）」格式
 * - 複製圖片：把結果區畫成 PNG（貼到 LINE／簡報）；瀏覽器不支援複製圖片時改為下載
 * - 在結果區選取文字後按 Ctrl+C／⌘C，也會連同注音一起複製
 */
document.addEventListener('DOMContentLoaded', () => {
    const outputArea = document.getElementById('zhuyin-output');
    const copyBtn = document.getElementById('copy-btn');
    const menu = document.getElementById('copy-menu');
    const message = document.getElementById('output-message');
    if (!outputArea || !copyBtn || !menu) return;

    // ---------- 共用：讀出目前顯示的注音 ----------
    const isVisible = el => el.getClientRects().length > 0;

    function visibleBopo(word) {
        const spans = Array.from(word.querySelectorAll('.zhuyin-bopomofo'));
        const shown = spans.find(isVisible) || spans[0];
        return shown ? shown.textContent.replace(/\s+/g, '') : '';
    }

    const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // 依序走過結果區的節點，回傳 [{ type: 'word', char, bopo, before, after } | { type: 'text', text } | { type: 'br' }]
    function collectItems(filterNode) {
        const items = [];
        const walk = node => {
            if (filterNode && !filterNode(node)) return;
            if (node.nodeType === 3) {
                if (node.textContent) items.push({ type: 'text', text: node.textContent });
                return;
            }
            if (node.nodeType !== 1) return;
            if (node.tagName === 'BR') { items.push({ type: 'br' }); return; }
            if (node.classList.contains('zhuyin-word')) {
                const charEl = node.querySelector('.zhuyin-char');
                const puncts = Array.from(node.querySelectorAll('.zhuyin-punct'));
                const before = puncts.filter(p => charEl && (p.compareDocumentPosition(charEl) & Node.DOCUMENT_POSITION_FOLLOWING)).map(p => p.textContent).join('');
                const after = puncts.filter(p => !charEl || (p.compareDocumentPosition(charEl) & Node.DOCUMENT_POSITION_PRECEDING)).map(p => p.textContent).join('');
                items.push({ type: 'word', char: charEl ? charEl.textContent : '', bopo: visibleBopo(node), before, after });
                return;
            }
            if (node.classList.contains('placeholder-text')) return;
            node.childNodes.forEach(walk);
        };
        outputArea.childNodes.forEach(walk);
        return items;
    }

    function toHtml(items) {
        const body = items.map(it => {
            if (it.type === 'br') return '<br>';
            if (it.type === 'text') return escapeHtml(it.text);
            const ruby = it.bopo
                ? `<ruby>${escapeHtml(it.char)}<rp>（</rp><rt>${escapeHtml(it.bopo)}</rt><rp>）</rp></ruby>`
                : escapeHtml(it.char);
            return escapeHtml(it.before) + ruby + escapeHtml(it.after);
        }).join('');
        return `<p style="font-size:${getComputedStyle(outputArea).fontSize};line-height:2">${body}</p>`;
    }

    function toPlain(items) {
        return items.map(it => {
            if (it.type === 'br') return '\n';
            if (it.type === 'text') return it.text;
            return it.before + it.char + (it.bopo ? `（${it.bopo}）` : '') + it.after;
        }).join('');
    }

    // ---------- 複製圖片：把結果區的每個字畫到 canvas ----------
    function renderImage() {
        const scale = Math.min(window.devicePixelRatio || 1, 2) * 1.5;
        const pad = 24;
        const box = outputArea.getBoundingClientRect();
        const outStyle = getComputedStyle(outputArea);
        const originX = box.left + parseFloat(outStyle.borderLeftWidth) - outputArea.scrollLeft;
        const originY = box.top + parseFloat(outStyle.borderTopWidth) - outputArea.scrollTop;

        // 先量出所有字元的位置
        const glyphs = [];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const walker = document.createTreeWalker(outputArea, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        let node;
        while ((node = walker.nextNode())) {
            const parent = node.parentElement;
            if (!parent || parent.closest('.placeholder-text') || !isVisible(parent)) continue;
            const style = getComputedStyle(parent);
            const text = node.textContent;
            let offset = 0;
            for (const ch of text) {
                const len = ch.length;
                if (ch.trim()) {
                    range.setStart(node, offset);
                    range.setEnd(node, offset + len);
                    const r = range.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0) {
                        const x = r.left - originX, y = r.top - originY;
                        glyphs.push({ ch, x, y, w: r.width, h: r.height, style });
                        minX = Math.min(minX, x); minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x + r.width); maxY = Math.max(maxY, y + r.height);
                    }
                }
                offset += len;
            }
        }
        if (!glyphs.length) return null;

        // 比對版差異字的底線
        const underlines = Array.from(outputArea.querySelectorAll('.diff-container')).map(el => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            return { x: r.left - originX, y: r.bottom - originY - parseFloat(s.borderBottomWidth) / 2, w: r.width,
                     lw: parseFloat(s.borderBottomWidth), color: s.borderBottomColor, dashed: s.borderBottomStyle === 'dashed' };
        });

        const width = Math.ceil(maxX - minX + pad * 2);
        const height = Math.ceil(maxY - minY + pad * 2);
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(width * scale);
        canvas.height = Math.ceil(height * scale);
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.translate(pad - minX, pad - minY);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const g of glyphs) {
            const s = g.style;
            ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
            ctx.fillStyle = s.color;
            ctx.fillText(g.ch, g.x + g.w / 2, g.y + g.h / 2);
        }
        for (const u of underlines) {
            ctx.strokeStyle = u.color;
            ctx.lineWidth = u.lw;
            ctx.setLineDash(u.dashed ? [u.lw * 3, u.lw * 2] : []);
            ctx.beginPath();
            ctx.moveTo(u.x, u.y);
            ctx.lineTo(u.x + u.w, u.y);
            ctx.stroke();
        }
        return canvas;
    }

    const canvasToBlob = canvas => new Promise((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
    });

    function downloadBlob(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '注音結果.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // ---------- 動作 ----------
    let messageTimer;
    function showMessage(text, isError) {
        if (!message) return;
        message.textContent = text;
        message.classList.toggle('is-error', !!isError);
        message.hidden = false;
        clearTimeout(messageTimer);
        messageTimer = setTimeout(() => { message.hidden = true; }, 3000);
    }

    async function copyText() {
        const items = collectItems();
        const html = toHtml(items);
        const plain = toPlain(items);
        try {
            if (navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([new ClipboardItem({
                    'text/html': new Blob([html], { type: 'text/html' }),
                    'text/plain': new Blob([plain], { type: 'text/plain' }),
                })]);
            } else {
                await navigator.clipboard.writeText(plain);
            }
            showMessage('已複製文字，可以貼到 Word 或 Google 文件');
        } catch (e) {
            console.error('Copy text failed:', e);
            showMessage('複製失敗，請改用選取後按 Ctrl+C（Mac 為 ⌘C）', true);
        }
    }

    async function copyImage() {
        const canvas = renderImage();
        if (!canvas) return;
        const blobPromise = canvasToBlob(canvas);
        try {
            if (!navigator.clipboard || !window.ClipboardItem) throw new Error('unsupported');
            // 用 Promise 建立 ClipboardItem，Safari 才會保留這次點擊的權限
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
            showMessage('已複製圖片，可以貼到 LINE 或簡報');
        } catch (e) {
            console.warn('Copy image failed, downloading instead:', e);
            try {
                downloadBlob(await blobPromise);
                showMessage('這個瀏覽器不支援複製圖片，已改為下載圖片');
            } catch (err) {
                console.error('Image export failed:', err);
                showMessage('無法產生圖片，請稍後再試', true);
            }
        }
    }

    // 選取一部分結果再按 Ctrl+C：連同注音一起複製
    outputArea.addEventListener('copy', (e) => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !e.clipboardData) return;
        const range = sel.getRangeAt(0);
        const items = collectItems(n => range.intersectsNode(n));
        if (!items.some(it => it.type === 'word')) return;
        e.preventDefault();
        e.clipboardData.setData('text/html', toHtml(items));
        e.clipboardData.setData('text/plain', toPlain(items));
    });

    // ---------- 選單 ----------
    const menuItems = () => Array.from(menu.querySelectorAll('[role="menuitem"]'));

    function openMenu(focusFirst) {
        menu.hidden = false;
        copyBtn.setAttribute('aria-expanded', 'true');
        if (focusFirst) menuItems()[0].focus();
    }

    function closeMenu(returnFocus) {
        if (menu.hidden) return;
        menu.hidden = true;
        copyBtn.setAttribute('aria-expanded', 'false');
        if (returnFocus) copyBtn.focus();
    }

    copyBtn.addEventListener('click', () => {
        if (menu.hidden) openMenu(false); else closeMenu(false);
    });
    copyBtn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(true); }
    });

    menu.addEventListener('click', (e) => {
        const item = e.target.closest('[role="menuitem"]');
        if (!item) return;
        closeMenu(false);
        if (item.dataset.action === 'text') copyText();
        if (item.dataset.action === 'image') copyImage();
    });
    menu.addEventListener('keydown', (e) => {
        const items = menuItems();
        const i = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
        if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); }
        if (e.key === 'Tab') closeMenu(false);
    });
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !copyBtn.contains(e.target)) closeMenu(false);
    });

    // 結果區沒有注音時停用
    const updateState = () => {
        copyBtn.disabled = !outputArea.querySelector('.zhuyin-word');
        if (copyBtn.disabled) closeMenu(false);
    };
    new MutationObserver(updateState).observe(outputArea, { childList: true, subtree: true });
    updateState();
});
