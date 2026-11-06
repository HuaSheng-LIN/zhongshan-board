# 中山分隊勤務看板

值班台與電視使用的消防勤務看板（單一 HTML 檔，`index.html`）。

## 網址

- 值班台：`https://huasheng-lin.github.io/zhongshan-board/`
- 電視（只顯示、自動縮放、分頁輪播）：`https://huasheng-lin.github.io/zhongshan-board/tv`（等同 `?tv=1`）

## 資料來源

| 資料 | 來源 |
|---|---|
| 上班人數、帶隊官、值宿／大夜 | Google 試算表「輪休預定表」（每 10 分鐘自動同步） |
| 逐時勤務表、火警任務編組、勤務備註 | Google 試算表「火警任務編組表」（每 10 分鐘自動同步） |
| 車輛狀態、出勤紀錄、交接事項 | 值班台輸入，經 Google Apps Script（`apps-script/Code.gs`）同步到電視 |

試算表需設為「知道連結的任何人都能檢視」。

## 即時同步

`apps-script/Code.gs` 部署為 Google Apps Script 網頁應用程式（執行身分：我；存取：所有人）。
寫入需要密碼（`WRITE_KEY`），只在值班台的「⚙ 設定 → 同步寫入密碼」輸入；電視只讀取，不需要密碼。
本儲存庫內的 `Code.gs` 密碼為範本文字，實際密碼只存在 Apps Script 專案中。
