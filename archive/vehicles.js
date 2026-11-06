// 車輛側面插圖（風格化 SVG，車頭朝右；無品牌標誌）
const VEH_SVG={
// 水箱車：歐系平頭駕駛室消防車，紅色車身、白色反光帶、捲門器材箱、車頂警示燈
fire:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 130">
<defs><linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3262b"/><stop offset="1" stop-color="#a50f14"/></linearGradient>
<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa3ad"/><stop offset="1" stop-color="#5d6670"/></linearGradient></defs>
<rect x="18" y="18" width="200" height="6" rx="2" fill="#7c858f"/><rect x="24" y="12" width="150" height="5" rx="2" fill="#b9c0c8"/>
<rect x="14" y="24" width="210" height="76" rx="5" fill="url(#r)"/>
<g fill="url(#g)"><rect x="22" y="32" width="44" height="40" rx="2"/><rect x="72" y="32" width="44" height="40" rx="2"/><rect x="122" y="32" width="44" height="40" rx="2"/><rect x="172" y="32" width="44" height="40" rx="2"/></g>
<g stroke="#46505a" stroke-width="1" opacity=".55"><path d="M22 38h44M22 44h44M22 50h44M22 56h44M22 62h44M22 68h44M72 38h44M72 44h44M72 50h44M72 56h44M72 62h44M72 68h44M122 38h44M122 44h44M122 50h44M122 56h44M122 62h44M122 68h44M172 38h44M172 44h44M172 50h44M172 56h44M172 62h44M172 68h44"/></g>
<rect x="14" y="76" width="210" height="7" fill="#fff"/><rect x="14" y="83" width="210" height="3" fill="#f4d03f"/>
<path d="M226 22h52q16 0 20 14l6 40v24h-78z" fill="url(#r)"/>
<path d="M232 28h40q10 0 13 10l3 18h-56z" fill="#1d2a3a"/><path d="M262 28v28" stroke="#a50f14" stroke-width="3"/>
<rect x="288" y="60" width="16" height="22" rx="2" fill="#1b1b1b"/><g stroke="#555" stroke-width="1.5"><path d="M290 65h12M290 70h12M290 75h12"/></g>
<rect x="226" y="76" width="78" height="7" fill="#fff"/><rect x="226" y="83" width="78" height="3" fill="#f4d03f"/>
<rect x="296" y="88" width="10" height="7" rx="2" fill="#ffe08a"/>
<rect x="236" y="14" width="44" height="8" rx="3" fill="#ff3b3b"/><rect x="258" y="14" width="22" height="8" rx="3" fill="#3b82ff"/>
<rect x="10" y="100" width="300" height="6" rx="2" fill="#2b2b2b"/>
<g><circle cx="62" cy="106" r="16" fill="#1a1a1a"/><circle cx="62" cy="106" r="7" fill="#9aa3ad"/><circle cx="98" cy="106" r="16" fill="#1a1a1a"/><circle cx="98" cy="106" r="7" fill="#9aa3ad"/><circle cx="266" cy="106" r="16" fill="#1a1a1a"/><circle cx="266" cy="106" r="7" fill="#9aa3ad"/></g>
</svg>`,
// 救護車：歐系廂型救護車，白色車身、黃綠格紋（巴騰堡格紋）、車頂警示燈
amb:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 130">
<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9dee5"/></linearGradient>
<pattern id="bb" width="32" height="24" patternUnits="userSpaceOnUse"><rect width="16" height="12" fill="#f5e100"/><rect x="16" width="16" height="12" fill="#13a538"/><rect y="12" width="16" height="12" fill="#13a538"/><rect x="16" y="12" width="16" height="12" fill="#f5e100"/></pattern></defs>
<path d="M30 20h190q20 0 34 18l26 30q8 4 8 14v20H30z" fill="url(#w)"/>
<path d="M226 26q16 0 26 14l20 26h-46z" fill="#1d2a3a"/>
<rect x="150" y="30" width="62" height="26" rx="3" fill="#1d2a3a"/>
<rect x="30" y="68" width="258" height="24" fill="url(#bb)"/>
<rect x="30" y="60" width="258" height="6" fill="#d71920"/>
<path d="M30 92h258v10H30z" fill="#c9ced6"/>
<rect x="36" y="22" width="2" height="78" fill="#c3c9d1"/><path d="M140 26v74" stroke="#c3c9d1" stroke-width="2"/><path d="M222 30v70" stroke="#c3c9d1" stroke-width="2"/>
<rect x="80" y="10" width="110" height="9" rx="3" fill="#ff3b3b"/><rect x="135" y="10" width="55" height="9" rx="3" fill="#3b82ff"/>
<rect x="282" y="82" width="8" height="6" rx="2" fill="#ffe08a"/>
<g><circle cx="80" cy="104" r="15" fill="#1a1a1a"/><circle cx="80" cy="104" r="6" fill="#aab2bc"/><circle cx="246" cy="104" r="15" fill="#1a1a1a"/><circle cx="246" cy="104" r="6" fill="#aab2bc"/></g>
</svg>`,
// 勤務車（85）：紅色小型廂型車
van:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 130">
<defs><linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3262b"/><stop offset="1" stop-color="#a50f14"/></linearGradient></defs>
<path d="M60 34q0-10 10-10h140q16 0 28 14l30 26q10 6 10 18v18H60z" fill="url(#r)"/>
<path d="M212 30q12 0 22 10l22 22h-44z" fill="#1d2a3a"/><rect x="150" y="32" width="56" height="28" rx="4" fill="#1d2a3a"/><rect x="70" y="32" width="70" height="28" rx="4" fill="#1d2a3a"/>
<rect x="60" y="72" width="218" height="6" fill="#fff"/>
<path d="M146 30v70M208 32v68" stroke="#8f0d11" stroke-width="2"/>
<rect x="120" y="16" width="70" height="8" rx="3" fill="#ff3b3b"/><rect x="155" y="16" width="35" height="8" rx="3" fill="#3b82ff"/>
<rect x="272" y="84" width="8" height="6" rx="2" fill="#ffe08a"/>
<rect x="56" y="98" width="226" height="6" rx="2" fill="#2b2b2b"/>
<g><circle cx="100" cy="104" r="14" fill="#1a1a1a"/><circle cx="100" cy="104" r="6" fill="#aab2bc"/><circle cx="240" cy="104" r="14" fill="#1a1a1a"/><circle cx="240" cy="104" r="6" fill="#aab2bc"/></g>
</svg>`,
// 勤務車（86）：紅色雙門皮卡
pickup:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 130">
<defs><linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3262b"/><stop offset="1" stop-color="#a50f14"/></linearGradient></defs>
<path d="M30 58h120v40H30z" fill="url(#r)"/><path d="M30 58h120" stroke="#8f0d11" stroke-width="4"/>
<path d="M150 30q0-8 8-8h62q12 0 20 12l18 24h22q14 2 16 16v26H150z" fill="url(#r)"/>
<path d="M158 30h28v26h-28zM192 30h26q8 0 13 8l12 18h-51z" fill="#1d2a3a"/>
<path d="M188 28v70" stroke="#8f0d11" stroke-width="2"/>
<rect x="30" y="74" width="270" height="5" fill="#fff"/>
<rect x="166" y="14" width="56" height="8" rx="3" fill="#ff3b3b"/><rect x="194" y="14" width="28" height="8" rx="3" fill="#3b82ff"/>
<rect x="290" y="80" width="10" height="6" rx="2" fill="#ffe08a"/><rect x="298" y="92" width="10" height="8" rx="2" fill="#9aa3ad"/>
<rect x="26" y="96" width="282" height="6" rx="2" fill="#2b2b2b"/>
<g><circle cx="78" cy="104" r="16" fill="#1a1a1a"/><circle cx="78" cy="104" r="7" fill="#aab2bc"/><circle cx="252" cy="104" r="16" fill="#1a1a1a"/><circle cx="252" cy="104" r="7" fill="#aab2bc"/></g>
</svg>`
};
if(typeof module!=='undefined')module.exports=VEH_SVG;
