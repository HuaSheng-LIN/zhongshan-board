/**
 * 中山分隊勤務看板 — 即時同步中繼站（Google Apps Script）
 *
 * 用途：值班台修改車輛狀態、出勤紀錄、交接事項時，把資料存到這裡；
 *       電視每 15 秒來讀一次，畫面就會和值班台一樣。
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
 * 之後如果修改了這段程式，要「部署」→「管理部署作業」→ 編輯 → 版本選「新版本」→ 部署，網址不會變。
 */

const WRITE_KEY = '請改成你們自己的密碼';

const CHUNK = 8000; // 每個儲存欄位的長度上限（Apps Script 單一屬性約 9KB）

// 讀取：電視與值班台都會呼叫（支援 callback，方便網頁直接載入）
function doGet(e) {
  const out = JSON.stringify(read_());
  const cb = e && e.parameter && e.parameter.callback;
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
