# 第三方開源專案與政府公開資料授權聲明 (Third-Party Notices)

本專案（注音小幫手 `zhuyin-app`）使用了以下開源詞庫、軟體套件與政府開放資料，特此致謝並聲明其授權條款：

---

## 1. 字嗨注音詞庫與破音字資料庫 (`ButTaiwan/bpmfvs`)
- **專案網址**：https://github.com/ButTaiwan/bpmfvs
- **作者**：But Ko (Koichi Yasuoka / 字嗨) 與貢獻者
- **使用範圍**：`tw-zhuyin.js` 內建之單字預設讀音表（源自 `phonic_table_Z.txt`）與破音字前後文詞彙配對規則（源自 `ime/poyin_db.txt`）。
- **授權條款**：
  - 讀音表與字型專案：Apache License 2.0
  - 破音字選擇工具與詞庫 (`ime/`)：MIT License

### MIT License (ButTaiwan/bpmfvs - ime)
```text
Copyright (c) 2020 But Ko

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 2. 中華民國教育部國語辭典資料 & g0v 萌典 (`moedict`)
- **資料來源**：
  - 中華民國教育部《重編國語辭典修訂本》（https://dict.revised.moe.edu.tw/）
  - 中華民國教育部《國語一字多音審訂表》
  - 國家教育研究院《化學命名原則》
  - g0v 零時政府萌典專案 API（https://www.moedict.tw/）
- **授權條款**：
  - 教育部國語辭典公眾授權網：創用 CC「姓名標示-禁止改作 3.0 台灣」授權條款（CC BY-ND 3.0 TW）及政府資料開放授權條款（Open Government Data License, version 1.0）。

---

## 3. OpenCC 簡繁轉換 JavaScript 函式庫 (`opencc-js`)
- **專案網址**：https://github.com/nk2028/opencc-js
- **使用範圍**：將瀏覽器 Web Speech API 語音辨識結果轉換為台灣正體中文（透過 CDN 載入並附帶 SRI 完整性驗證）。
- **授權條款**：MIT License
