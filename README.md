# 中山分隊勤務看板

值班台與電視使用的消防勤務看板（單一 HTML 檔，`index.html`）。

## 網址

- 值班台：`https://huasheng-lin.github.io/zhongshan-board/`
- 電視（只顯示、自動縮放、分頁輪播）：`https://huasheng-lin.github.io/zhongshan-board/tv`（等同 `?tv=1`）
- 派遣科每日人車動態看板（全部分隊，唯讀）：`https://huasheng-lin.github.io/zhongshan-board/dispatch/`

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

## 派遣科每日人車動態看板（dispatch/）

讀取派遣科「動態表」→「每日人車動態」所有分隊區塊（以「今日服勤人數」定位），每 30 秒更新：
全區服勤／在隊人數、待命消防車／救護車、報停車輛、注意人力（在隊 ≤ 3 人或動態表標示「⚠ 注意人力」閃紅），
以及各分隊帶隊官、待命／報停車輛、勤務列（人次 > 0 顯示「外出 N 人」，火警紅、救護藍閃爍）。

動態表沒有開放連結檢視，所以經由同一個 Apps Script 中繼站讀取（`action=dynall`，只讀「每日人車動態」，15 秒快取）。
需在 `Code.gs` 設定 `READ_KEY` 並部署新版本；看板第一次開啟按 ⚙ 輸入同一組讀取密碼（或網址加 `?k=密碼`，讀入後會自動從網址移除）。
