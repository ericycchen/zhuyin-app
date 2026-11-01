/**
 * 注音小幫手 - 自動化單元測試與 PWA 快取一致性檢查 (Zero-Dependency Test Suite)
 * 執行方式：node test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.window = global;
require('./tw-zhuyin.js');
require('./render.js');

let passed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`✅ PASS: ${name}`);
    } catch (err) {
        console.error(`❌ FAIL: ${name}`);
        console.error(err.message);
        process.exit(1);
    }
}

// 1. 黃金語料測試：台灣教育部標準讀音、多音字前後文配對與「不」四聲前變調
test('台灣教育部標準讀音與破音字黃金測試集', () => {
    const cases = [
        ['語音模組還不錯呢', '語(ㄩˇ) 音(ㄧㄣ) 模(ㄇㄛˊ) 組(ㄗㄨˇ) 還(ㄏㄞˊ) 不(ㄅㄨˊ) 錯(ㄘㄨㄛˋ) 呢(˙ㄋㄜ)'],
        ['我的東西在哪裡？', '我(ㄨㄛˇ) 的(˙ㄉㄜ) 東(ㄉㄨㄥ) 西(ㄒㄧ) 在(ㄗㄞˋ) 哪(ㄋㄚˇ) 裡(ㄌㄧˇ) ？'],
        ['他去銀行還錢，還是去散步？', '他(ㄊㄚ) 去(ㄑㄩˋ) 銀(ㄧㄣˊ) 行(ㄏㄤˊ) 還(ㄏㄨㄢˊ) 錢(ㄑㄧㄢˊ) ， 還(ㄏㄞˊ) 是(ㄕˋ) 去(ㄑㄩˋ) 散(ㄙㄢˋ) 步(ㄅㄨˋ) ？'],
        ['垃圾車星期五會來嗎？', '垃(ㄌㄜˋ) 圾(ㄙㄜˋ) 車(ㄔㄜ) 星(ㄒㄧㄥ) 期(ㄑㄧˊ) 五(ㄨˇ) 會(ㄏㄨㄟˋ) 來(ㄌㄞˊ) 嗎(˙ㄇㄚ) ？'],
        ['我覺得音樂很快樂，睡著了', '我(ㄨㄛˇ) 覺(ㄐㄩㄝˊ) 得(ㄉㄜˊ) 音(ㄧㄣ) 樂(ㄩㄝˋ) 很(ㄏㄣˇ) 快(ㄎㄨㄞˋ) 樂(ㄌㄜˋ) ， 睡(ㄕㄨㄟˋ) 著(ㄓㄠˊ) 了(˙ㄌㄜ)'],
        ['的確達成目標', '的(ㄉㄧˊ) 確(ㄑㄩㄝˋ) 達(ㄉㄚˊ) 成(ㄔㄥˊ) 目(ㄇㄨˋ) 標(ㄅㄧㄠ)']
    ];

    for (const [input, expected] of cases) {
        const tokens = window.TaiwanZhuyin.textToTokens(input);
        const actual = tokens.map(t => t.zhuyin ? `${t.char}(${t.zhuyin})` : t.char).join(' ');
        assert.strictEqual(actual, expected, `輸入「${input}」讀音不符`);
    }
});

// 2. 多音字候選清單測試
test('多音字候選讀音清單 (getCharReadings)', () => {
    const huan = window.TaiwanZhuyin.getCharReadings('還');
    assert(huan.includes('ㄏㄞˊ') && huan.includes('ㄏㄨㄢˊ'), '「還」應包含 ㄏㄞˊ 與 ㄏㄨㄢˊ');

    const de = window.TaiwanZhuyin.getCharReadings('的');
    assert(de.includes('˙ㄉㄜ') && de.includes('ㄉㄧˊ') && de.includes('ㄉㄧˋ'), '「的」應包含 ˙ㄉㄜ、ㄉㄧˊ、ㄉㄧˋ');

    const fa = window.TaiwanZhuyin.getCharReadings('法');
    assert(fa.includes('ㄈㄚˇ') && fa.includes('ㄈㄚˋ'), '「法」應包含 ㄈㄚˇ 與 ㄈㄚˋ');
});

// 3. 注音符號與聲調拆解排版測試
test('ZhuyinRender.splitTone 與 bopoHtml 聲調位置規範', () => {
    assert.deepStrictEqual(window.ZhuyinRender.splitTone('˙ㄋㄜ'), { chars: 'ㄋㄜ', tone: '˙' });
    assert.deepStrictEqual(window.ZhuyinRender.splitTone('ㄏㄞˊ'), { chars: 'ㄏㄞ', tone: 'ˊ' });
    assert.deepStrictEqual(window.ZhuyinRender.splitTone('ㄧㄣ'), { chars: 'ㄧㄣ', tone: '' });

    const lightHtml = window.ZhuyinRender.bopoHtml('ㄋㄜ', '˙');
    assert(lightHtml.includes('tone-light'), '輕聲應使用 .tone-light');

    const fourthHtml = window.ZhuyinRender.bopoHtml('ㄘㄨㄛ', 'ˋ');
    assert(fourthHtml.includes('tone-mark'), '四聲應使用 .tone-mark');
});

// 4. PWA 快取版號一致性防呆檢查 (index.html / about.html vs sw.js)
test('PWA Service Worker (sw.js) 與 HTML 資源版本號一致性檢查', () => {
    const swContent = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const aboutHtml = fs.readFileSync(path.join(__dirname, 'about.html'), 'utf8');

    const extractRefs = (html) => {
        const refs = [];
        const re = /(?:href|src)="([^"?#]+\?v=\d+)"/g;
        let m;
        while ((m = re.exec(html)) !== null) {
            refs.push('./' + m[1]);
        }
        return refs;
    };

    const allHtmlRefs = new Set([...extractRefs(indexHtml), ...extractRefs(aboutHtml)]);
    assert(allHtmlRefs.size > 0, '應由 HTML 擷取到帶 ?v=N 的資源');

    for (const ref of allHtmlRefs) {
        assert(
            swContent.includes(`'${ref}'`) || swContent.includes(`"${ref}"`),
            `sw.js 的 CORE_ASSETS 漏掉或版本號不一致：${ref}`
        );
    }
});

// 5. 資安檢查：確保任何外部 CDN script 皆具備 integrity (SRI)
test('資安規範：外部 CDN script 必須具備 SRI (integrity)', () => {
    const files = ['index.html', 'about.html', 'voice-input.js'];
    for (const f of files) {
        const content = fs.readFileSync(path.join(__dirname, f), 'utf8');
        const scriptTags = content.match(/<script[^>]+src="https?:\/\/[^"]+"[^>]*>/g) || [];
        for (const tag of scriptTags) {
            assert(tag.includes('integrity="sha'), `${f} 中的外部 script 缺少 SRI integrity: ${tag}`);
            assert(tag.includes('crossorigin="anonymous"'), `${f} 中的外部 script 缺少 crossorigin: ${tag}`);
        }
    }
});

// 6. 摺疊機／平板虛擬鍵盤視窗自適應與語音輸入滿版防呆檢查
test('響應式與語音輸入規範：展開鍵盤自適應與語音輸入自動收起鍵盤並撐滿結果區', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const styleCss = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
    const voiceJs = fs.readFileSync(path.join(__dirname, 'voice-input.js'), 'utf8');
    assert(indexHtml.includes('interactive-widget=resizes-content'), 'index.html viewport 應包含 interactive-widget=resizes-content');
    assert(indexHtml.includes('compact-viewport'), 'index.html visualViewport 腳本應處理 compact-viewport');
    assert(styleCss.includes('body.compact-viewport'), 'style.css 應定義 body.compact-viewport 緊湊高度樣式');
    assert(!styleCss.includes('max-height: 500px'), 'style.css 的 .output-content 不得限制 max-height: 500px，否則鍵盤收起時結果區無法撐滿全螢幕');
    assert(voiceJs.includes('inputArea.blur()'), 'voice-input.js 啟動語音輸入時應呼叫 inputArea.blur() 收起虛擬鍵盤');
    assert(!voiceJs.includes('inputArea.focus()') || !voiceJs.split('recognition.onstart')[1].includes('inputArea.focus()'), 'recognition.onstart 不得呼叫 inputArea.focus() 喚起鍵盤');
});

console.log(`\n🎉 全部 ${passed} 項檢查通過！`);
