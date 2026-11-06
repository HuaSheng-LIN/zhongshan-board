// 解析「勤務表（YYYY-MM）」工作表：每日一個區塊（左：火警任務編組 A-H；右：逐時勤務 J-S）
// 這段程式同時給 Node 測試與看板 HTML 使用（看板內嵌同一份程式）
function parseSched(wb, XLSX){
  const days={};
  const cellTxt=c=>String(c??'').replace(/\r/g,'').trim();
  const splitNames=c=>cellTxt(c).split(/[\n　]+|\s{2,}/).map(x=>x.trim()).filter(Boolean);
  const T=/^(\d{1,2}):(\d{2})\s*[～~\-–—至]\s*(\d{1,2}):(\d{2})$/;
  wb.SheetNames.filter(n=>/^勤務表[（(]\d{4}-\d{1,2}[）)]$/.test(n.trim())).forEach(sn=>{
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:false,defval:''}).map(r=>r.map(cellTxt));
    // 找每日區塊的開頭：某列有 YYYY-MM-DD 日期，且 A 欄含「火警任務編組」或 J 欄含「勤務表」
    const starts=[];
    rows.forEach((r,i)=>{
      const dc=r.findIndex(c=>/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(c));
      if(dc>=0&&(/任務編組/.test(r[0])||/勤務表/.test(r.join(''))))starts.push({i,date:r[dc].match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)});
    });
    starts.forEach((st,bi)=>{
      const end=bi+1<starts.length?starts[bi+1].i:rows.length;
      const blk=rows.slice(st.i,end);
      const key=`${+st.date[1]}-${+st.date[2]}-${+st.date[3]}`;
      // 表頭列：含「時段」
      const hi=blk.findIndex(r=>r.includes('時段'));if(hi<0)return;
      const hdr=blk[hi],tc=hdr.indexOf('時段');
      const cols=[];for(let j=tc+1;j<hdr.length;j++)if(hdr[j])cols.push([j,hdr[j]]);
      // 逐時勤務
      const slots=[];
      blk.slice(hi+1).forEach(r=>{
        const m=r[tc].replace(/\s/g,'').match(T);if(!m)return;
        const cells={};cols.forEach(([j,name])=>{cells[name]=splitNames(r[j]);});
        slots.push({s:+m[1]*60+ +m[2],e:+m[3]*60+ +m[4],label:`${m[1].padStart(2,'0')}:${m[2]}–${m[3].padStart(2,'0')}:${m[4]}`,cells});
      });
      // 火警任務編組（左側：兩組 [車輛,任務,姓名,目前勤務]）
      const groups=[],gmap={};
      const lastL=Math.max(0,tc-1);
      const left=hdr.slice(0,tc);
      const sets=[];left.forEach((c,j)=>{if(c==='車輛')sets.push(j);});
      let memo='',note='',check='';
      const memoRows={};
      sets.forEach(c0=>{
        let g='';
        for(const r of blk.slice(hi+1)){
          const a=r[c0];
          if(/^(勤務備註|備註|確認)$/.test(r[0])){break;}
          if(a)g=a;
          const role=r[c0+1];if(!g||!role)continue;
          if(!gmap[g]){gmap[g]={g,rows:[]};groups.push(gmap[g]);}
          gmap[g].rows.push({role:role.replace(/\n/g,''),name:splitNames(r[c0+2]).join(' ')});
        }
      });
      blk.forEach(r=>{if(r[0]==='勤務備註')memo=r[1];else if(r[0]==='備註')note=r[1];else if(r[0]==='確認')check=r[1];});
      days[key]={cols:cols.map(c=>c[1]),slots,groups,memo,note,check,sheet:sn};
    });
  });
  return days;
}
if(typeof module!=='undefined')module.exports=parseSched;
