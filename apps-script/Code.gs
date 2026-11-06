/**
 * 中山分隊勤務看板 — 即時同步中繼站（Google Apps Script）
 *
 * 用途：
 *  1. 值班台修改車輛狀態、志工、交接事項時，把資料存到這裡；電視每 15 秒來讀一次。
 *  2. 值班台按「同步動態表」時，把中山分隊的人車動態寫入派遣科「動態表」的中山區塊。
 *
 * 設定步驟（只要做一次）：
 *  1. 打開 https://script.google.com → 「新專案」，把這整段程式貼上（取代原本內容），存檔。
 *  2. 把下面 WRITE_KEY 改成你們自己的密碼（值班台設定時要輸入同一組）。
 *  3. 右上角「部署」→「新增部署作業」→ 類型選「網頁應用程式」
 *       執行身分：我
 *       誰可以存取：所有人
 *     按「部署」，第一次會要求授權，照畫面允許即可。
 *  4. 複製「網頁應用程式網址」（https://script.google.com/macros/s/……/exec）給看板使用。
 *
 * 修改程式後：「部署」→「管理部署作業」→ 鉛筆 → 版本選「新版本」→ 部署（網址不變）。
 * 寫入動態表需要「執行身分」那個 Google 帳號對動態表有編輯權限；第一次會多要求「試算表」的授權。
 */

const WRITE_KEY = '請改成你們自己的密碼';

const CHUNK = 8000; // 每個儲存欄位的長度上限（Apps Script 單一屬性約 9KB）

// 動態表設定：只允許寫入這份試算表的這個工作表、這個分隊的區塊
const DYN_SHEET_ID = '18StcvFYkqQVOzF-1KEAJM0jHAyxQb8zdQTw2PnU-qwA';
const DYN_TAB = '每日人車動態';
const DYN_UNIT = '中山';

// 讀取：電視與值班台都會呼叫（支援 callback，方便網頁直接載入）
function doGet(e) {
  const p = (e && e.parameter) || {};
  let out;
  if (p.action === 'dyn') out = JSON.stringify(writeDyn_(p));
  else out = JSON.stringify(read_());
  const cb = p.callback;
  if (cb && /^[\w$.]+$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + out + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

// 寫入：只有知道密碼的值班台可以寫
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad json' }); }
  if (!body || body.key !== WRITE_KEY) return json_({ ok: false, error: 'wrong key' });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cur = read_();
    if (cur.at && body.at < cur.at) return json_({ ok: false, error: 'stale' }); // 比雲端舊的不寫入
    write_({ at: body.at, data: body.data });
    return json_({ ok: true, at: body.at });
  } finally {
    lock.releaseLock();
  }
}

// ===== 寫入派遣科動態表（中山區塊）=====
// 區塊版面（以「中山」所在格為原點 r0, c0，對應 I1）：
//   r0      : 中山 | … | 帶隊官(c0+5)
//   r0+1    : 今日服勤人數 | 人數(c0+1) | … | N2（不變動）
//   r0+2~3  : 待命車輛 | 12 格（c0+1~c0+6，兩列）
//   r0+4    : 在隊人數（公式，不變動）
//   r0+5    : 報停車輛 | 6 格
//   r0+6    : 勤務內容 | 出動車輛 | 人次(c0+6)
//   r0+7    : 火警 | 車輛 | 人次
//   r0+8    : 救護 | 車輛 | 人次
//   r0+9~11 : 其他勤務 3 列（項目 | 車輛 | 人次）
//   r0+12   : 休息班 | 人次(c0+6)
function writeDyn_(p) {
  try {
    if (p.key !== WRITE_KEY) return { ok: false, error: '密碼錯誤' };
    if (p.id !== DYN_SHEET_ID) return { ok: false, error: '動態表網址與中繼站設定不符' };
    const d = JSON.parse(p.p || '{}');
    const sh = SpreadsheetApp.openById(DYN_SHEET_ID).getSheetByName(DYN_TAB);
    if (!sh) return { ok: false, error: '找不到工作表「' + DYN_TAB + '」' };
    const vals = sh.getRange(1, 1, Math.min(sh.getLastRow(), 200), Math.min(sh.getLastColumn(), 60)).getDisplayValues();
    // 找出「中山」區塊，並核對每一列的標題，版面不同就不寫入
    let r0 = -1, c0 = -1;
    for (let r = 0; r < vals.length && r0 < 0; r++) for (let c = 0; c < vals[r].length; c++) {
      if (String(vals[r][c]).trim() === DYN_UNIT) { r0 = r; c0 = c; break; }
    }
    if (r0 < 0) return { ok: false, error: '動態表找不到「' + DYN_UNIT + '」' };
    const lab = (dr) => String((vals[r0 + dr] || [])[c0] || '').replace(/\s/g, '');
    const expect = { 1: '今日服勤人數', 2: '待命車輛', 4: '在隊人數', 5: '報停車輛', 6: '勤務內容', 12: '休息班' };
    for (const dr in expect) {
      if (lab(+dr).indexOf(expect[dr]) !== 0) return { ok: false, error: '動態表版面已變更（第 ' + (r0 + +dr + 1) + ' 列應為「' + expect[dr] + '」），已停止寫入' };
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const R = (dr, dc) => sh.getRange(r0 + 1 + dr, c0 + 1 + dc);
      const six = (arr) => { const a = (arr || []).slice(0, 6).map(String); while (a.length < 6) a.push(''); return a; };
      R(0, 5).setValue(d.leader || '');                     // 帶隊官
      R(1, 1).setValue(d.onDuty === '' ? '' : d.onDuty);     // 今日服勤人數
      const sb = (d.standby || []).map(String);              // 待命車輛（兩列，各 6 格）
      sh.getRange(r0 + 3, c0 + 2, 1, 6).setValues([six(sb.slice(0, 6))]);
      sh.getRange(r0 + 4, c0 + 2, 1, 6).setValues([six(sb.slice(6, 12))]);
      sh.getRange(r0 + 6, c0 + 2, 1, 6).setValues([six(d.stopped)]); // 報停車輛
      const rows = d.rows || [];
      for (let i = 0; i < 5; i++) {                           // 火警、救護、其他 3 列
        const x = rows[i] || { item: '', veh: '', n: '' };
        if (i >= 2) R(9 + i - 2, 0).setValue(x.item || '');   // 其他勤務的項目名稱
        R(7 + i, 1).setValue(x.veh || '');                    // 出動車輛（合併格的左上格）
        R(7 + i, 6).setValue(x.n === '' ? '' : x.n);          // 人次
      }
      R(12, 6).setValue(d.rest === '' ? '' : d.rest);         // 休息班人次
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

function read_() {
  const props = PropertiesService.getScriptProperties();
  const n = Number(props.getProperty('n') || 0);
  if (!n) return { at: 0, data: null };
  let s = '';
  for (let i = 0; i < n; i++) s += props.getProperty('d' + i) || '';
  try { return JSON.parse(s); } catch (err) { return { at: 0, data: null }; }
}

function write_(obj) {
  const s = JSON.stringify(obj);
  const all = { n: String(Math.ceil(s.length / CHUNK)) };
  for (let i = 0, k = 0; i < s.length; i += CHUNK, k++) all['d' + k] = s.slice(i, i + CHUNK);
  PropertiesService.getScriptProperties().setProperties(all, true); // true：刪掉舊的多餘欄位
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
