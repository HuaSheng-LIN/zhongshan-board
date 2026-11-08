/**
 * 中山分隊勤務看板 — 即時同步中繼站（Google Apps Script）
 *
 * 用途：
 *  1. 值班台修改車輛狀態、志工、交接事項時，把資料存到這裡；電視每 15 秒來讀一次。
 *  2. 把中山分隊的人車動態寫入派遣科「動態表」的中山區塊。
 *     自動同步：先比對動態表是否被人工修改，有修改就不覆蓋；手動同步（force=1）以看板為準。
 *  3. 讀取動態表中山區塊（action=dynread，需要密碼），讓看板發現人工修改並提示值班員。
 *  4. 勤務歷程：寫入（action=logadd）與讀取某一天（action=logread），都需要密碼。
 *     歷程存在 LOG_SHEET_ID 這份私人試算表，每月一個分頁，超過 LOG_KEEP_MONTHS 個月的分頁自動刪除。
 *
 * 測試環境：另外建一個 Apps Script 專案貼上同一份程式，只改 WRITE_KEY（用不同的測試密碼）
 *           DYN_SHEET_ID（改成測試用動態表）與 LOG_SHEET_ID（改成測試用歷程表），不要指向正式檔案。
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

// 勤務歷程：寫到維護者私人雲端硬碟的試算表（每月一個分頁），保存 12 個月
// 測試中繼站請改成「【測試】勤務歷程」試算表的 ID
const LOG_SHEET_ID = '1s6-KGnhDxzrbdp5BRCJLfXFpVlv2YNvjaeC5B1Otcyg';
const LOG_KEEP_MONTHS = 12;
const LOG_HEAD = ['勤務日', '時間', '類別', '內容', '時段值班', '裝置', '版本', '事件ID'];

// 讀取：電視與值班台都會呼叫（支援 callback，方便網頁直接載入）
function doGet(e) {
  const p = (e && e.parameter) || {};
  let out;
  if (p.action === 'dyn') out = JSON.stringify(writeDyn_(p));
  else if (p.action === 'dynread') out = JSON.stringify(readDyn_(p));
  else if (p.action === 'logadd') out = JSON.stringify(logAdd_(p));
  else if (p.action === 'logread') out = JSON.stringify(logRead_(p));
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
// 開啟動態表並找出「中山」區塊，核對每一列的標題；版面不同就回傳錯誤
function locateDyn_(p) {
  if (p.key !== WRITE_KEY) return { error: '密碼錯誤' };
  if (p.id !== DYN_SHEET_ID) return { error: '動態表網址與中繼站設定不符' };
  const sh = SpreadsheetApp.openById(DYN_SHEET_ID).getSheetByName(DYN_TAB);
  if (!sh) return { error: '找不到工作表「' + DYN_TAB + '」' };
  const vals = sh.getRange(1, 1, Math.min(sh.getLastRow(), 200), Math.min(sh.getLastColumn(), 60)).getDisplayValues();
  let r0 = -1, c0 = -1;
  for (let r = 0; r < vals.length && r0 < 0; r++) for (let c = 0; c < vals[r].length; c++) {
    if (String(vals[r][c]).trim() === DYN_UNIT) { r0 = r; c0 = c; break; }
  }
  if (r0 < 0) return { error: '動態表找不到「' + DYN_UNIT + '」' };
  const lab = (dr) => String((vals[r0 + dr] || [])[c0] || '').replace(/\s/g, '');
  const expect = { 1: '今日服勤人數', 2: '待命車輛', 4: '在隊人數', 5: '報停車輛', 6: '勤務內容', 12: '休息班' };
  for (const dr in expect) {
    if (lab(+dr).indexOf(expect[dr]) !== 0) return { error: '動態表版面已變更（第 ' + (r0 + +dr + 1) + ' 列應為「' + expect[dr] + '」），已停止' };
  }
  return { sh: sh, r0: r0, c0: c0 };
}

// 讀取動態表中山區塊目前的內容（只讀，讓看板比對是否有人工修改）
function readDyn_(p) {
  try {
    const L = locateDyn_(p);
    if (L.error) return { ok: false, error: L.error };
    return { ok: true, block: blockNow_(L.sh, L.r0, L.c0) };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

function writeDyn_(p) {
  try {
    const L = locateDyn_(p);
    if (L.error) return { ok: false, error: L.error };
    const sh = L.sh, r0 = L.r0, c0 = L.c0;
    const d = JSON.parse(p.p || '{}');
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      // 自動同步：先比對動態表目前內容與上一次系統寫入的內容，不同代表有人工修改 → 不覆蓋
      if (p.force !== '1') {
        const prev = JSON.parse(p.prev || 'null');
        if (!prev) return { ok: false, conflict: true, error: '尚未建立同步基準，請先手動同步一次' };
        const cur = blockNow_(sh, r0, c0), exp = blockOf_(prev);
        if (JSON.stringify(cur) !== JSON.stringify(exp)) return { ok: false, conflict: true, error: '動態表中山區塊有人工修改', block: cur };
      }
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

// 動態表中山區塊目前的內容（只取系統會寫入的格子）
function blockNow_(sh, r0, c0) {
  const v = sh.getRange(r0 + 1, c0 + 1, 13, 7).getDisplayValues().map(r => r.map(x => String(x).trim()));
  return {
    leader: v[0][5], onDuty: v[1][1],
    standby: v[2].slice(1, 7).concat(v[3].slice(1, 7)), stopped: v[5].slice(1, 7),
    rows: [0, 1, 2, 3, 4].map(i => [i >= 2 ? v[9 + i - 2][0] : '', v[7 + i][1], v[7 + i][6]]),
    rest: v[12][6]
  };
}
// 把看板送來的內容換成同樣的格子形式，方便比對
function blockOf_(d) {
  const t = x => (x === null || x === undefined) ? '' : String(x).trim();
  const pad = (a, n) => { a = (a || []).map(t).slice(0, n); while (a.length < n) a.push(''); return a; };
  const rows = d.rows || [];
  return {
    leader: t(d.leader), onDuty: t(d.onDuty),
    standby: pad(d.standby, 12), stopped: pad(d.stopped, 6),
    rows: [0, 1, 2, 3, 4].map(i => { const x = rows[i] || {}; return [i >= 2 ? t(x.item) : '', t(x.veh), t(x.n)]; }),
    rest: t(d.rest)
  };
}

// ===== 勤務歷程 =====
// 文字一律以純文字寫入；以 = + - @ 開頭的內容前面加 '，避免被當成公式
function logCell_(x) {
  let v = (x === null || x === undefined) ? '' : String(x).slice(0, 500);
  if (/^[=+\-@]/.test(v)) v = "'" + v;
  return v;
}
function logAdd_(p) {
  try {
    if (p.key !== WRITE_KEY) return { ok: false, error: '密碼錯誤' };
    const evs = JSON.parse(p.e || '[]');
    if (!Array.isArray(evs)) return { ok: false, error: '格式錯誤' };
    const cache = CacheService.getScriptCache();
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    const done = [];
    try {
      const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
      const byTab = {}, fresh = [];
      evs.slice(0, 50).forEach(function (e) {
        const id = String(e.id || '').slice(0, 40);
        const m = String(e.day || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (!id || !m) return;
        if (cache.get('lg' + id)) { done.push(id); return; }   // 已寫過（重送）不再重複寫入
        const tab = m[1] + '-' + ('0' + m[2]).slice(-2);
        (byTab[tab] = byTab[tab] || []).push([e.day, e.t, e.cat, e.msg, e.who, e.dev, e.ver, id].map(logCell_));
        fresh.push(id);
      });
      Object.keys(byTab).forEach(function (tab) {
        let sh = ss.getSheetByName(tab);
        if (!sh) {
          sh = ss.insertSheet(tab);
          sh.getRange(1, 1, 1000, LOG_HEAD.length).setNumberFormat('@');
          sh.getRange(1, 1, 1, LOG_HEAD.length).setValues([LOG_HEAD]).setFontWeight('bold');
          sh.setFrozenRows(1);
        }
        const rows = byTab[tab], r0 = sh.getLastRow() + 1;
        sh.getRange(r0, 1, rows.length, LOG_HEAD.length).setNumberFormat('@').setValues(rows);
      });
      fresh.forEach(function (id) { cache.put('lg' + id, '1', 21600); done.push(id); });
      purgeLog_(ss, cache);
    } finally {
      lock.releaseLock();
    }
    return { ok: true, done: done };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}
function logRead_(p) {
  try {
    if (p.key !== WRITE_KEY) return { ok: false, error: '密碼錯誤' };
    const day = String(p.day || ''), m = day.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return { ok: false, error: '日期格式錯誤' };
    const sh = SpreadsheetApp.openById(LOG_SHEET_ID).getSheetByName(m[1] + '-' + ('0' + m[2]).slice(-2));
    if (!sh || sh.getLastRow() < 2) return { ok: true, events: [] };
    const v = sh.getRange(2, 1, sh.getLastRow() - 1, LOG_HEAD.length).getDisplayValues();
    const ev = v.filter(function (r) { return r[0] === day; }).map(function (r) {
      return { day: r[0], t: r[1], cat: r[2], msg: r[3], who: r[4], dev: r[5], ver: r[6], id: r[7] };
    });
    return { ok: true, events: ev.slice(-1500) };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}
// 刪除超過保存期限的月份分頁（每天最多檢查一次）
function purgeLog_(ss, cache) {
  if (cache.get('lgPurge')) return;
  cache.put('lgPurge', '1', 21600);
  const now = new Date(), limit = now.getFullYear() * 12 + now.getMonth() - LOG_KEEP_MONTHS;
  ss.getSheets().forEach(function (sh) {
    const m = sh.getName().match(/^(\d{4})-(\d{2})$/);
    if (m && (+m[1]) * 12 + (+m[2] - 1) < limit && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
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
