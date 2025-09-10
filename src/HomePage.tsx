import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Chartura Homepage — Premium, Clean, and Complete (Rev 17)
 * Single-file TSX: all sections restored (Hero, How, Why, Try It w/ Charts + Askura + Import gating, Insights, Slides).
 * Notes:
 * - Styling assumes TailwindCSS; falls back gracefully if absent.
 * - PNG export works in-browser (svg -> canvas -> png).
 * - CSV import demo; XLSX is for production (e.g., SheetJS).
 * - Askura can call OpenAI if you provide an API key (live site only); sandbox may block network.
 */

/* =========================
   Types & Constants
   ========================= */
type Mode = 'line' | 'area' | 'bar' | 'scatter' | 'dual' | 'pie';

interface Row {
  period: string;      // e.g., "2024"
  revenue: number;     // Sales revenue total
  units: number;       // Sales units
  supplier: string;    // Supplier name
  costPrice: number;   // Cost per unit
  staffExp: number;    // Staff expenses (absolute)
}

type MetricKey = 'revenue' | 'units' | 'costPrice' | 'staffExp';
const METRIC_LABEL: Record<MetricKey, string> = {
  revenue: 'Sales (Revenue)',
  units: 'Sales Units',
  costPrice: 'Cost Price',
  staffExp: 'Staff Expenses',
};

function defaultRows(): Row[] {
  return [
    { period:'2020', revenue: 300, units: 240, supplier:'Northstar', costPrice: 0.88, staffExp: 40 },
    { period:'2021', revenue: 350, units: 260, supplier:'Northstar', costPrice: 0.90, staffExp: 44 },
    { period:'2022', revenue: 400, units: 290, supplier:'BluePeak',  costPrice: 0.91, staffExp: 48 },
    { period:'2023', revenue: 460, units: 310, supplier:'BluePeak',  costPrice: 0.93, staffExp: 50 },
    { period:'2024', revenue: 520, units: 350, supplier:'Skyline',   costPrice: 0.94, staffExp: 54 },
    { period:'2025', revenue: 590, units: 380, supplier:'Skyline',   costPrice: 0.96, staffExp: 58 },
  ];
}

/* =========================
   Utils
   ========================= */
function num(v: string | number) {
  const n = typeof v==='number'? v : parseFloat(String(v).replace(/[^0-9.\-]/g,''));
  return isFinite(n) ? n : 0;
}
function pct(a:number,b:number){ if(!b) return 0; return (a-b)/b*100; }
function downloadDataUrl(filename: string, url: string){
  const a=document.createElement('a'); a.href=url; a.download=filename; a.style.display='none';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ try{ document.body.removeChild(a);}catch{} },0);
}
async function svgToPng(svg: SVGSVGElement): Promise<string> {
  const s=new XMLSerializer().serializeToString(svg);
  const blob=new Blob([s],{type:'image/svg+xml'});
  const url=URL.createObjectURL(blob);
  const img=new Image();
  return new Promise(res=>{
    img.onload=()=>{
      const c=document.createElement('canvas');
      const vb=svg.viewBox.baseVal;
      c.width=vb.width; c.height=vb.height;
      const ctx=c.getContext('2d'); if(ctx) ctx.drawImage(img,0,0);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/png'));
    };
    img.src=url;
  });
}

/* =========================
   Data -> Series
   ========================= */
interface Pt { x:number; label:string; a:number; b?:number }
function buildSeries(rows: Row[], yA: MetricKey, yB?: MetricKey): Pt[] {
  return rows.map((r, i)=> ({ x:i, label:r.period, a: r[yA] as number, b: yB!=null ? (r[yB] as number) : undefined }));
}

/* =========================
   Themed Button (hover uses brightness)
   ========================= */
function ThemedButton({ color, children, onClick, className='', textClass='' }:
  { color:string; children: React.ReactNode; onClick?:()=>void; className?:string; textClass?:string }){
  const [hover, setHover] = useState(false);
  const style: React.CSSProperties = { backgroundColor: color, filter: hover? 'brightness(0.93)': 'none' };
  return (
    <button onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={style}
      className={`px-4 py-2 rounded-xl font-semibold shadow transition-[filter] ${textClass || 'text-white'} ${className}`}>
      {children}
    </button>
  );
}

/* =========================
   PremiumChart (SVG, no deps)
   ========================= */
function PremiumChart({ series, mode, colorA, colorB, xLabel, yLabelLeft, yLabelRight, showGrid=true, pointSize=6, useRightAxis=false, onRef }:{
  series: Pt[]; mode: Mode; colorA: string; colorB: string; xLabel:string; yLabelLeft:string; yLabelRight?:string; showGrid?:boolean; pointSize?:number; useRightAxis?:boolean; onRef?: (el:SVGSVGElement|null)=>void;
}){
  const width=860, height=440, padL=90, padR=90, padT=28, padB=86;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const xs = (i:number)=> padL + (series.length<=1? plotW/2 : (i)*(plotW/(series.length-1))); // line/scatter
  const xsBar = (i:number)=> padL + (plotW/series.length)*(i+0.5); // bar centers

  const aMin = Math.min(0, ...series.map(p=>p.a)); const aMax = Math.max(1, ...series.map(p=>p.a));
  const bVals = series.map(p=> p.b??0); const bMin = Math.min(0, ...bVals); const bMax = Math.max(1, ...bVals);
  const ysA = (v:number)=> height - padB - ((v-aMin)/((aMax-aMin)||1))*plotH;
  const ysB = useRightAxis ? (v:number)=> height - padB - ((v-bMin)/((bMax-bMin)||1))*plotH : ysA;

  const svgRef = useRef<SVGSVGElement|null>(null);
  useEffect(()=>{ onRef && onRef(svgRef.current); },[onRef]);

  function pathFor(vals:number[], y:(v:number)=>number){
    if(vals.length<2) return '';
    const pts = vals.map((v,i)=> [xs(i), y(v)] as [number, number]);
    const d:string[] = [`M ${pts[0][0]} ${pts[0][1]}`];
    for(let i=0;i<pts.length-1;i++){
      const p0=pts[Math.max(0,i-1)], p1=pts[i], p2=pts[i+1], p3=pts[Math.min(pts.length-1,i+2)];
      const t=0.3; const c1x=p1[0]+(p2[0]-p0[0])*t/2, c1y=p1[1]+(p2[1]-p0[1])*t/2; const c2x=p2[0]-(p3[0]-p1[0])*t/2, c2y=p2[1]-(p3[1]-p1[1])*t/2;
      d.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`);
    }
    return d.join(' ');
  }

  const barBand = series.length? plotW / series.length : 0; const barW = Math.max(16, Math.min(42, barBand*0.6));

  // PIE helpers
  const totalA = series.reduce((s,p)=> s+p.a, 0);
  const rad = (d:number)=> d*Math.PI/180;

  // Legend items for pie
  const legendItems = series.map((p,i)=> ({ label: p.label, color: i%2? colorB: colorA }));

  return (
    <div className="rounded-2xl bg-white p-5 shadow border">
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-[440px]">
        <rect x={0} y={0} width={width} height={height} rx={12} fill="white" />

        {mode!=='pie' && showGrid && (
          <g stroke="#E5E7EB" strokeDasharray="4 6">
            <line x1={padL} y1={height-padB} x2={width-padR} y2={height-padB}/>
            <line x1={padL} y1={padT} x2={padL} y2={height-padB}/>
            {[0.25,0.5,0.75].map((p,i)=> (<line key={i} x1={padL} y1={padT+plotH*p} x2={width-padR} y2={padT+plotH*p}/>))}
          </g>
        )}

        {/* X labels (non-pie) */}
        {mode!=='pie' && (
          <g fontSize={14} fill="#6B7280">
            {series.map((p,i)=>(
              <g key={i}>
                <line x1={mode==='bar'? xsBar(i): xs(i)} y1={height-padB} x2={mode==='bar'? xsBar(i): xs(i)} y2={height-padB+6} stroke="#CBD5E1"/>
                <text x={mode==='bar'? xsBar(i): xs(i)} y={height-padB+24} textAnchor="middle">{p.label}</text>
              </g>
            ))}
          </g>
        )}

        {/* Y labels left (non-pie) */}
        {mode!=='pie' && (
          <g fontSize={14} fill="#6B7280">
            {[0,0.5,1].map((t,i)=>{ const v=aMin + t*(aMax-aMin); return (
              <g key={i}>
                <line x1={padL-6} y1={ysA(v)} x2={padL} y2={ysA(v)} stroke="#CBD5E1"/>
                <text x={padL-10} y={ysA(v)+5} textAnchor="end">{Math.round(v)}</text>
              </g>
            );})}
          </g>
        )}

        {/* Right axis (optional) */}
        {mode!=='pie' && useRightAxis && series.some(p=>p.b!=null) && (
          <g fontSize={14} fill="#6B7280">
            {[0,0.5,1].map((t,i)=>{ const v=bMin + t*(bMax-bMin); return (
              <g key={i}>
                <line x1={width-padR} y1={ysB(v)} x2={width-padR+6} y2={ysB(v)} stroke="#CBD5E1"/>
                <text x={width-padR+10} y={ysB(v)+5} textAnchor="start">{Math.round(v)}</text>
              </g>
            );})}
          </g>
        )}

        {/* Renderers */}
        {mode==='area' && (
          <g>
            <path d={pathFor(series.map(p=>p.a), ysA)} fill="none" stroke={colorA} strokeWidth={3}/>
            <path d={`${pathFor(series.map(p=>p.a), ysA)} L ${xs(series.length-1)} ${height-padB} L ${xs(0)} ${height-padB} Z`} fill={colorA} opacity={0.12}/>
            {series.map((p,i)=> (<circle key={i} cx={xs(i)} cy={ysA(p.a)} r={4} fill={colorA}/>))}
            {series.some(p=>p.b!=null) && (<>
              <path d={pathFor(series.map(p=>p.b||0), ysB)} fill="none" stroke={colorB} strokeWidth={3}/>
              {series.map((p,i)=> (<circle key={`ba${i}`} cx={xs(i)} cy={ysB(p.b||0)} r={4} fill={colorB}/>))}
            </>)}
          </g>
        )}

        {mode==='line' && (
          <g>
            <path d={pathFor(series.map(p=>p.a), ysA)} fill="none" stroke={colorA} strokeWidth={3}/>
            {series.map((p,i)=> (<circle key={i} cx={xs(i)} cy={ysA(p.a)} r={4} fill={colorA}/>))}
            {series.some(p=>p.b!=null) && (<>
              <path d={pathFor(series.map(p=>p.b||0), ysB)} fill="none" stroke={colorB} strokeWidth={3}/>
              {series.map((p,i)=> (<circle key={`b${i}`} cx={xs(i)} cy={ysB(p.b||0)} r={4} fill={colorB}/>))}
            </>)}
          </g>
        )}

        {mode==='dual' && (
          <g>
            {/* A line (left or shared axis) */}
            <path d={pathFor(series.map(p=>p.a), ysA)} fill="none" stroke={colorA} strokeWidth={3}/>
            {series.map((p,i)=> (<circle key={i} cx={xs(i)} cy={ysA(p.a)} r={4} fill={colorA}/>))}
            {/* B bars (right or shared axis) */}
            {series.some(p=>p.b!=null) && series.map((p,i)=>{ const x = xs(i) - 12; const y = ysB(Math.max(0,p.b||0)); const h=(height-padB)-y; return (
              <rect key={`bbar${i}`} x={x} y={y} width={24} height={h} rx={6} fill={colorB}/>
            );})}
          </g>
        )}

        {mode==='bar' && (
          <g>
            {series.map((p,i)=>{ const cx = xsBar(i); const x = cx - barW/2; const y = ysA(p.a); const h = (height-padB) - y; return (
              <g key={i}>
                <rect x={x} y={y} width={barW} height={h} rx={8} fill={colorA}/>
                {p.b!=null && (()=>{ const y2 = ysB(p.b||0); const h2 = (height-padB)-y2; return (<rect x={x} y={y2} width={barW} height={h2} rx={8} fill={colorB} opacity={0.55}/>); })()}
                <text x={cx} y={y-6} textAnchor="middle" fontSize={12} fill="#111827">{Math.round(p.a)}</text>
              </g>
            );})}
          </g>
        )}

        {mode==='scatter' && (
          <g>
            {series.map((p,i)=> (<circle key={i} cx={xs(i)} cy={ysA(p.a)} r={Math.max(3,Math.min(14,pointSize))} fill={colorA}/>))}
            {series.some(p=>p.b!=null) && series.map((p,i)=> (<circle key={`sc${i}`} cx={xs(i)} cy={ysB(p.b||0)} r={Math.max(3,Math.min(14,pointSize))} fill={colorB} opacity={0.85}/>))}
          </g>
        )}

        {mode==='pie' && (
          <g>
            {(()=>{ const cx = width/2, cy = height/2+10, R = Math.min(plotW, plotH)/2.0; let start=-90; return series.map((p,i)=>{
              const ang = totalA? (p.a/totalA)*360 : 0;
              const end=start+ang; const large = ang>180?1:0;
              const x1=cx+R*Math.cos((start*Math.PI)/180), y1=cy+R*Math.sin((start*Math.PI)/180);
              const x2=cx+R*Math.cos((end*Math.PI)/180),   y2=cy+R*Math.sin((end*Math.PI)/180);
              const mid=(start+end)/2;
              const lx=cx+(R*0.62)*Math.cos((mid*Math.PI)/180), ly=cy+(R*0.62)*Math.sin((mid*Math.PI)/180);
              start=end;
              const fill = i%2? colorB: colorA;
              const pctTxt = totalA? Math.round((p.a/totalA)*100)+'%':'';
              return (
                <g key={i}>
                  <path d={`M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`} fill={fill} opacity={0.9}/>
                  <text x={lx} y={ly} textAnchor="middle" fontSize={13} fill="#111827">{p.label} {pctTxt}</text>
                </g>
              );
            }); })()}
          </g>
        )}

        {/* axis labels */}
        {mode!=='pie' && (<>
          <text x={(padL+width-padR)/2} y={height-18} textAnchor="middle" fontSize={15} fill="#374151">{xLabel}</text>
          <text x={24} y={(padT+height-padB)/2} textAnchor="middle" fontSize={15} fill="#374151" transform={`rotate(-90 24 ${(padT+height-padB)/2})`}>{yLabelLeft}</text>
          {useRightAxis && series.some(p=>p.b!=null) && yLabelRight && (
            <text x={width-24} y={(padT+height-padB)/2} textAnchor="middle" fontSize={15} fill="#374151" transform={`rotate(90 ${width-24} ${(padT+height-padB)/2})`}>{yLabelRight}</text>
          )}
        </>)}
      </svg>

      {/* Legend (pie only) */}
      {mode==='pie' && (
        <div className="flex flex-wrap gap-3 mt-3 text-sm">
          {legendItems.map((it,i)=> (
            <div key={i} className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{background:it.color}}/> {it.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================
   Data Grid
   ========================= */
function DataGrid({ rows, setRows, color }:{ rows: Row[]; setRows:(r:Row[])=>void; color:string }){
  function update(i:number, key: keyof Row, val:string){
    const next=rows.slice();
    if(key==='period'||key==='supplier') (next[i] as any)[key]=val; else (next[i] as any)[key]=num(val);
    setRows(next);
  }
  function add(){
    setRows([...rows, { period:String(2026+rows.length), revenue: 600, units: 360, supplier:'Northstar', costPrice: 0.95, staffExp: 60 }]);
  }
  function remove(i:number){
    const next=rows.slice(); next.splice(i,1); setRows(next);
  }
  return (
    <div className="overflow-x-auto border rounded-2xl">
      <table className="min-w-full text-sm text-gray-800">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Year</th>
            <th className="px-3 py-2 text-left font-semibold">{METRIC_LABEL.revenue}</th>
            <th className="px-3 py-2 text-left font-semibold">{METRIC_LABEL.units}</th>
            <th className="px-3 py-2 text-left font-semibold">Supplier</th>
            <th className="px-3 py-2 text-left font-semibold">{METRIC_LABEL.costPrice}</th>
            <th className="px-3 py-2 text-left font-semibold">{METRIC_LABEL.staffExp}</th>
            <th className="w-10"/>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i} className={i%2? 'bg-gray-50':''}>
              <td className="px-3 py-2"><input className="w-24 border rounded p-1" value={r.period} onChange={e=>update(i,'period',e.target.value)} /></td>
              <td className="px-3 py-2"><input className="w-24 border rounded p-1" value={r.revenue} onChange={e=>update(i,'revenue',e.target.value)} /></td>
              <td className="px-3 py-2"><input className="w-24 border rounded p-1" value={r.units} onChange={e=>update(i,'units',e.target.value)} /></td>
              <td className="px-3 py-2"><input className="w-28 border rounded p-1" value={r.supplier} onChange={e=>update(i,'supplier',e.target.value)} /></td>
              <td className="px-3 py-2"><input className="w-24 border rounded p-1" value={r.costPrice} onChange={e=>update(i,'costPrice',e.target.value)} /></td>
              <td className="px-3 py-2"><input className="w-24 border rounded p-1" value={r.staffExp} onChange={e=>update(i,'staffExp',e.target.value)} /></td>
              <td className="px-2"><button onClick={()=>remove(i)} className="text-xs text-red-600 hover:text-red-700 transition-colors">Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-3">
        <ThemedButton color={color} onClick={add} className="text-sm">Add row</ThemedButton>
      </div>
    </div>
  );
}

/* =========================
   Askura (with optional OpenAI backend)
   ========================= */
interface AskuraMemory { kind?: 'topSupplier'|'marginMax'|'growth'|'total'|'min'|'max'; metric?: MetricKey|'margin'; year?: string; years?: string[]; supplier?: string; value?: number }

async function askOpenAI(apiKey:string, prompt:string, rows: Row[], context:{mode:Mode;yA:MetricKey;yB?:MetricKey;secondaryOn:boolean}): Promise<string>{
  const sys = `You are Askura, a precise data analyst. The user provides a small table (columns: period, revenue, units, supplier, costPrice, staffExp). Use the numbers to answer crisply; include units or years where helpful.`;
  const content = JSON.stringify({ question: prompt, rows, context });
  try{
    const res = await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${apiKey}` },
      body: JSON.stringify({ model:'gpt-4o-mini', messages:[{role:'system', content:sys},{role:'user', content}], temperature:0.2 })
    });
    if(!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? 'No answer.';
  }catch(e:any){
    return 'AI backend is unavailable in this demo environment. Using built-in logic instead.';
  }
}

function answerLocal(q: string, rows: Row[], context:{mode:Mode;yA:MetricKey;yB?:MetricKey;secondaryOn:boolean}, mem: AskuraMemory): { text:string, mem: AskuraMemory }{
  const text = q.trim().toLowerCase();
  if(!text) return { text:'Ask about revenue, units, suppliers, costs, margin, growth, or years (e.g., "revenue growth 2024 to 2025").', mem };

  // small talk
  if(/^(thanks|thank you|cheers|ok|okay|cool|great|nice|awesome|got it|good)\b/.test(text)){
    return { text: mem.kind? 'Anytime — want me to break that down further or compare years?' : 'Anytime — ask me anything about the table.', mem };
  }

  const yearsInQ = Array.from(new Set((text.match(/\b20\d{2}\b/g) || [])));
  const suppliers = Array.from(new Set(rows.map(r=> r.supplier.toLowerCase())));
  const mentionedSupplier = suppliers.find(s => text.includes(s));
  const byFilter = rows.filter(r=> (yearsInQ.length? yearsInQ.includes(r.period): true) && (mentionedSupplier? r.supplier.toLowerCase()===mentionedSupplier: true));

  const sum = (rs:Row[], f:(r:Row)=>number)=> rs.reduce((s,r)=> s+f(r),0);
  const rev = sum(byFilter, r=> r.revenue);
  const units = sum(byFilter, r=> r.units);
  const cost = sum(byFilter, r=> r.costPrice * r.units);
  const staff = sum(byFilter, r=> r.staffExp);
  const margin = rev - cost - staff;

  // follow-up: when was this?
  if(/^(when\??|when was this\??|which year\??|what year\??)$/.test(text)){
    if(mem.year) return { text: `It was in ${mem.year}.`, mem };
    return { text: 'I need a reference. Ask a specific question first (e.g., lowest cost price).', mem };
  }

  // chart context
  if(/what\s+am\s+i\s+looking|what\s+does\s+this\s+chart|which\s+metrics\s+are\s+shown/.test(text)){
    const primary = METRIC_LABEL[context.yA];
    const secondary = context.secondaryOn && context.yB ? ` and ${METRIC_LABEL[context.yB]}` : '';
    return { text:`The chart is a ${context.mode} showing ${primary}${secondary} by Year.`, mem };
  }

  // top/bottom supplier
  if(/which\s+supplier|top\s+supplier|most\s+(units|revenue)/.test(text)){
    const bySup = new Map<string,{rev:number;units:number;margin:number}>();
    byFilter.forEach(r=>{
      const m = (r.revenue - r.costPrice*r.units - r.staffExp);
      const s = bySup.get(r.supplier) || {rev:0,units:0,margin:0};
      s.rev+=r.revenue; s.units+=r.units; s.margin+=m; bySup.set(r.supplier, s);
    });
    if(!bySup.size) return { text:'No rows match that filter.', mem };
    const metric = /margin/.test(text)? 'margin' : /unit/.test(text)? 'units' : 'rev';
    const sorted = Array.from(bySup.entries()).sort((a,b)=> b[1][metric as 'rev'|'units'|'margin'] - a[1][metric as 'rev'|'units'|'margin']);
    const [name, vals] = sorted[0];
    const label = metric==='rev'?'revenue':metric;
    const newMem: AskuraMemory = { kind:'topSupplier', supplier:name, metric: metric==='rev'?'revenue': metric as any, year: yearsInQ[0], years: yearsInQ };
    return { text:`Top supplier by ${label}${yearsInQ.length?` in ${yearsInQ.join(', ')}`:''}: ${name} (${Math.round(vals[metric as 'rev'|'units'|'margin'])}).`, mem:newMem };
  }

  // biggest margin (by year across all suppliers)
  if(/biggest\s+margin|highest\s+margin/.test(text)){
    const byYear = new Map<string, number>();
    rows.forEach(r=>{ const m=r.revenue - r.costPrice*r.units - r.staffExp; byYear.set(r.period, (byYear.get(r.period)||0)+m); });
    const sorted = Array.from(byYear.entries()).sort((a,b)=> b[1]-a[1]);
    const [year, val] = sorted[0];
    const newMem: AskuraMemory = { kind:'marginMax', year, metric:'margin', value: val };
    return { text:`Highest margin year: ${year} (~${Math.round(val)}).`, mem:newMem };
  }

  // lowest / highest cost price (per year)
  if(/(lowest|min).*cost|cost\s*price.*(lowest|min)/.test(text)){
    let best:{year:string,val:number}|null=null; rows.forEach(r=>{ if(!best||r.costPrice<best.val) best={year:r.period,val:r.costPrice}; });
    if(!best) return { text:'No data.', mem };
    const newMem: AskuraMemory = { kind:'min', metric:'costPrice', year: best.year, value: best.val };
    return { text:`Lowest cost price: ${best.val.toFixed(2)} in ${best.year}.`, mem:newMem };
  }
  if(/(highest|max).*cost|cost\s*price.*(highest|max)/.test(text)){
    let best:{year:string,val:number}|null=null; rows.forEach(r=>{ if(!best||r.costPrice>best.val) best={year:r.period,val:r.costPrice}; });
    if(!best) return { text:'No data.', mem };
    const newMem: AskuraMemory = { kind:'max', metric:'costPrice', year: best.year, value: best.val };
    return { text:`Highest cost price: ${best.val.toFixed(2)} in ${best.year}.`, mem:newMem };
  }

  // growth or difference between two years
  const yMatches = text.match(/(20\d{2}).*(20\d{2})/);
  if(/growth|change|delta|increase|decrease/.test(text) && yMatches){
    const y1=yMatches[1], y2=yMatches[2];
    const r1 = rows.filter(r=> r.period===y1); const r2=rows.filter(r=> r.period===y2);
    const metric: MetricKey| 'margin' = /margin/.test(text)? 'margin' : /unit/.test(text)? 'units' : /revenue|sales(?!\s*units)/.test(text)? 'revenue' : /staff/.test(text)? 'staffExp' : /cost/.test(text)? 'costPrice' : 'revenue';
    const val = (rs:Row[])=> metric==='margin' ? rs.reduce((s,r)=> s + (r.revenue - r.costPrice*r.units - r.staffExp),0) : rs.reduce((s,r)=> s + (r[metric] as number), 0);
    const v1 = val(r1), v2 = val(r2);
    const newMem: AskuraMemory = { kind:'growth', metric, years:[y1,y2], year:y2, value: v2 };
    return { text:`${metric==='margin'?'Margin':METRIC_LABEL[metric]} changed ${Math.round(pct(v2,v1))}% from ${y1} (${Math.round(v1)}) to ${y2} (${Math.round(v2)}).`, mem:newMem };
  }

  // totals / averages intent
  if(/average|avg/.test(text)){
    const metric: MetricKey| 'margin' = /margin/.test(text)? 'margin' : /unit/.test(text)? 'units' : /revenue|sales(?!\s*units)/.test(text)? 'revenue' : /staff/.test(text)? 'staffExp' : /cost/.test(text)? 'costPrice' : 'revenue';
    const val = metric==='margin' ? (margin/ (byFilter.length||1)) : (sum(byFilter, r=> (metric==='costPrice'? r.costPrice : (r[metric] as number))) / (metric==='costPrice'? (byFilter.length||1) : 1));
    const newMem: AskuraMemory = { kind:'total', metric, value: val };
    return { text:`Average ${metric==='margin'?'margin':METRIC_LABEL[metric]}${mentionedSupplier?` for ${mentionedSupplier}`:''}${yearsInQ.length?` in ${yearsInQ.join(', ')}`:''}: ${metric==='costPrice'? val.toFixed(2) : Math.round(val)}.`, mem:newMem };
  }

  // single metric totals (default fallbacks)
  if(/revenue|sales(?!\s*units)/.test(text)) return { text:`Revenue${mentionedSupplier?` for ${mentionedSupplier}`:''}${yearsInQ.length?` in ${yearsInQ.join(', ')}`:''}: ${Math.round(rev)}.`, mem:{...mem, kind:'total', metric:'revenue', value:rev} };
  if(/unit|quantity|qty/.test(text)) return { text:`Units${mentionedSupplier?` for ${mentionedSupplier}`:''}${yearsInQ.length?` in ${yearsInQ.join(', ')}`:''}: ${Math.round(units)}.`, mem:{...mem, kind:'total', metric:'units', value:units} };
  if(/staff/.test(text)) return { text:`Staff expenses${mentionedSupplier?` for ${mentionedSupplier}`:''}${yearsInQ.length?` in ${yearsInQ.join(', ')}`:''}: ${Math.round(staff)}.`, mem:{...mem, kind:'total', metric:'staffExp', value:staff} };
  if(/margin|profit/.test(text)) return { text:`Margin${mentionedSupplier?` for ${mentionedSupplier}`:''}${yearsInQ.length?` in ${yearsInQ.join(', ')}`:''}: ${Math.round(margin)} (approx).`, mem:{...mem, kind:'marginMax', metric:'margin', value:margin} };
  if(/cost(\s*price)?/.test(text)) return { text:`Average cost price${mentionedSupplier?` for ${mentionedSupplier}`:''}${yearsInQ.length?` in ${yearsInQ.join(', ')}`:''}: ${(sum(byFilter, r=> r.costPrice)/ (byFilter.length||1)).toFixed(2)}.`, mem:{...mem, kind:'total', metric:'costPrice'} };

  // fallback suggestion
  return { text:'Try: "Top supplier by revenue", "Revenue growth 2024 to 2025", or "What does this chart show?"', mem };
}

function Askura({ rows, context, color }:{ rows: Row[]; context:{mode:Mode;yA:MetricKey;yB?:MetricKey;secondaryOn:boolean}; color:string }){
  const [memory, setMemory] = useState<AskuraMemory>({});
  const [useAI, setUseAI] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const seed = answerLocal('Which supplier drove most units in 2025?', rows, context, {});
  const [messages, setMessages] = useState<{role:'user'|'ai'; text:string}[]>([
    { role:'user', text:'Which supplier drove most units in 2025?' },
    { role:'ai', text: seed.text }
  ]);
  const [input, setInput] = useState('');
  const chatRef = useRef<HTMLDivElement|null>(null);
  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

  async function send(){
    if(!input.trim()) return;
    const q=input; setInput('');
    setMessages(m=>[...m,{role:'user', text:q}]);
    if(useAI && apiKey){
      const ai = await askOpenAI(apiKey, q, rows, context);
      setMessages(m=>[...m,{role:'ai', text: ai}]);
      const resLocal = answerLocal(q, rows, context, memory); setMemory(resLocal.mem);
    } else {
      const res = answerLocal(q, rows, context, memory);
      setMessages(m=>[...m,{role:'ai', text: res.text}]);
      setMemory(res.mem);
    }
  }

  return (
    <div className="rounded-2xl bg-gray-50 border p-4">
      <div className="mb-2">
        <div className="text-sm font-semibold">Askura — Ask your data</div>
        <div className="text-xs text-gray-600">Natural language questions about the table. Follow‑ups like “when was this?” work too.</div>
      </div>
      <div className="flex items-center gap-2 mb-2 text-xs">
        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={useAI} onChange={e=>setUseAI(e.target.checked)} /> Use OpenAI*</label>
        {useAI && <input value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Enter API key" className="border rounded px-2 py-1 flex-1" />}
      </div>
      <div className="h-56 overflow-y-auto space-y-2 mb-2" ref={chatRef}>
        {messages.map((m,i)=> (
          <div key={i} className={`px-3 py-2 rounded-lg max-w-[75%] ${m.role==='user'? 'bg-[#1ABC9C] text-white ml-auto':'bg-white border text-gray-800'}`}>{m.text}</div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=> e.key==='Enter' && send()} className="flex-1 border rounded-lg px-3 py-2" placeholder="Ask about your data..."/>
        <ThemedButton color={color} onClick={send}>Send</ThemedButton>
      </div>
      <div className="mt-1 text-[10px] text-gray-500">*For the live site only. This sandbox may block network calls. If disabled, Askura uses local logic.</div>
    </div>
  );
}

/* =========================
   Insights
   ========================= */
function computeInsights(rows: Row[]) {
  const ordered = rows.slice().sort((a,b)=> (+a.period)-(+b.period));
  const latest = ordered[ordered.length-1], prev = ordered[ordered.length-2] || latest;
  const revChg = pct(latest.revenue, prev.revenue);
  const unitsChg = pct(latest.units, prev.units);
  const costL = latest.costPrice * latest.units; const staffL = latest.staffExp; const marginL = latest.revenue - costL - staffL;
  const bySup = new Map<string, {rev:number; units:number}>();
  rows.forEach(r=>{ const v=bySup.get(r.supplier)||{rev:0,units:0}; v.rev+=r.revenue; v.units+=r.units; bySup.set(r.supplier,v); });
  const rank = Array.from(bySup.entries()).sort((a,b)=> b[1].rev - a[1].rev);
  const top = rank[0]; const bottom = rank[rank.length-1];

  const bullets = [
    `Revenue ${revChg>=0?'up':'down'} ${Math.abs(Math.round(revChg))}% vs ${prev.period}.`,
    `Units ${unitsChg>=0?'up':'down'} ${Math.abs(Math.round(unitsChg))}% vs ${prev.period}.`,
    `Latest approx. margin ${Math.round((marginL/latest.revenue)*100)}%.`,
    top? `Top supplier overall: ${top[0]} (${Math.round(top[1].rev)} revenue).` : '—',
  ];
  const actions = [
    top && bottom ? `Rebalance supplier mix: ${bottom[0]} trails ${top[0]}. Consider shifting demand or renegotiating.` : undefined,
    `Review price where cost price trends up.`,
    `Hold staff expenses ≤ 15% of revenue.`,
  ].filter(Boolean) as string[];
  const risks = [
    top ? `Concentration risk with ${top[0]} — add a backup supplier.` : undefined,
  ].filter(Boolean) as string[];
  return { bullets, actions, risks };
}

function InsightsMiniReal({ rows }:{ rows: Row[] }){
  const { bullets, actions, risks } = computeInsights(rows);
  return (
    <div className="grid grid-cols-3 gap-2 text-left text-[11px] w-full">
      <div className="bg-white/10 p-2 rounded">
        <div className="font-semibold mb-1">Takeaways</div>
        {bullets.slice(0,2).map((b,i)=> (<div key={i} className="opacity-90">• {b}</div>))}
      </div>
      <div className="bg-white/10 p-2 rounded">
        <div className="font-semibold mb-1">Actions</div>
        {actions.slice(0,2).map((b,i)=> (<div key={i} className="opacity-90">• {b}</div>))}
      </div>
      <div className="bg-white/10 p-2 rounded">
        <div className="font-semibold mb-1">Risks</div>
        {risks.slice(0,2).map((b,i)=> (<div key={i} className="opacity-90">• {b}</div>))}
      </div>
    </div>
  );
}

function InsightsSection({ rows, gated }:{ rows: Row[]; gated:boolean }){
  const { bullets, actions, risks } = computeInsights(rows);
  const Card = ({ title, icon, children }:{ title:string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="rounded-2xl bg-white p-6 shadow border transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-center gap-2 mb-2 text-lg font-semibold">{icon}<span>{title}</span></div>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
  return (
    <section className="py-14 px-6 md:px-24 bg-white">
      <div className={`max-w-6xl mx-auto ${gated?'blur-sm pointer-events-none':''}`}>
        <h3 className="text-xl font-semibold mb-4">Insights</h3>
        <div className="grid lg:grid-cols-3 gap-6">
          <Card title="Key takeaways" icon={<span>💡</span>}>
            <ul className="list-disc list-inside space-y-1">{bullets.map((b,i)=> <li key={i}>{b}</li>)}</ul>
          </Card>
          <Card title="Recommended actions" icon={<span>🛠️</span>}>
            <ul className="list-disc list-inside space-y-1">{actions.map((b,i)=> <li key={i}>{b}</li>)}</ul>
          </Card>
          <Card title="Risks & considerations" icon={<span>⚠️</span>}>
            <ul className="list-disc list-inside space-y-1">{risks.map((b,i)=> <li key={i}>{b}</li>)}</ul>
          </Card>
        </div>
      </div>
      {gated && <div className="max-w-6xl mx-auto -mt-10 mb-8 text-center"><div className="inline-block bg_WHITE/90 backdrop-blur rounded-xl px-6 py-3 shadow border">Start a free trial to unlock Insights for imported files.</div></div>}
    </section>
  );
}

/* =========================
   Hero + How It Works + Why
   ========================= */
function HeroIntro({ onCTABottom, rows, color }: { onCTABottom: () => void; rows: Row[]; color:string }){
  const [i,setI] = useState(0);
  const wrap = (n:number, len:number)=> (n+len)%len;
  useEffect(()=>{ const id=setInterval(()=> setI(v=>wrap(v+1,3)), 6000); return ()=>clearInterval(id); },[]);

  // mini chart svg based on rows (units)
  const maxU = Math.max(...rows.map(x=>x.units));
  const miniPts = rows.map((r,idx)=> [20+idx*(280/(rows.length-1||1)), 150 - (r.units/maxU)*110] as [number,number]);
  const miniPath = miniPts.length? `M ${miniPts[0][0]} ${miniPts[0][1]} ` + miniPts.slice(1).map(p=>`L ${p[0]} ${p[1]}`).join(' ') : '';

  const items = [
    { t:'Premium charts', d:'Beautiful visuals instantly.', c:(
      <svg viewBox="0 0 320 160" className="w-full h-44">
        <rect x="0" y="0" width="320" height="160" rx="12" fill="rgba(255,255,255,0.10)"/>
        <path d={miniPath} fill="none" stroke="#fff" strokeWidth="3"/>
        {miniPts.map((p,idx)=>(<circle key={idx} cx={p[0]} cy={p[1]} r={3} fill="#fff"/>))}
      </svg>
    ) },
    { t:'Insights', d:'Snapshot of drivers, actions, risks.', c:(<InsightsMiniReal rows={rows}/> ) },
    { t:'Askura Q&A', d:'Natural chat with your data.', c:(
      <div className="text-left bg-white/10 p-2 rounded">
        <div className="mb-1">You: Who sold most in 2025?</div>
        <div className="text-white/90">Askura: {answerLocal('top supplier by units in 2025', rows, {mode:'line',yA:'units',secondaryOn:false}, {}).text}</div>
      </div>
    ) },
  ];
  const s = items[i];
  return (
    <section className="bg-gradient-to-tr from-[#0D1F2D] via-[#1F2A44] to-[#1ABC9C] text-white px-6 md:px-24 py-24">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-5xl font-extrabold leading-tight">From spreadsheet to <span className="text-[#1ABC9C]">stakeholder-ready</span> in minutes.</h1>
          <p className="mt-4 text-gray-100">Import once. Chartura turns your data into premium charts, insights, and slides. Ask questions, get answers — instantly.</p>
          <div className="mt-6 flex gap-3 items-center">
            <ThemedButton color="#ffffff" onClick={onCTABottom} textClass="!text-[#0D1F2D]">Try it now</ThemedButton>
            <ThemedButton color={color}>Start free trial</ThemedButton>
          </div>
        </div>
        <div className="rounded-2xl bg-white/10 p-6 backdrop-blur shadow text-center select-none">
          <div className="text-lg font-semibold mb-1">{s.t}</div>
          <div className="text-sm opacity-90 mb-3">{s.d}</div>
          <div className="min-h-[184px] flex items-center justify-center">{s.c}</div>
          <div className="mt-3 flex items-center justify-center gap-3">
            <button onClick={()=>setI(v=>wrap(v-1, items.length))} className="px-2 py-0.5 text-sm rounded bg-white/20 hover:bg_WHITE/30">‹</button>
            {items.map((_,idx)=> (
              <button key={idx} onClick={()=>setI(idx)} className={`w-2.5 h-2.5 rounded-full ${idx===i? 'bg-white':'bg-white/40'}`} />
            ))}
            <button onClick={()=>setI(v=>wrap(v+1, items.length))} className="px-2 py-0.5 text-sm rounded bg_WHITE/20 hover:bg_WHITE/30">›</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ onTry, color }: { onTry: () => void; color:string }){
  const steps = [
    { title:'Bring your data', desc:'Drag Excel/CSV, paste a table or upload a doc.', icon:'📥' },
    { title:'See it, beautifully', desc:'On‑brand visuals: line, bar, dual, pie.', icon:'📊' },
    { title:'Ask anything', desc:'Askura answers natural language about your data.', icon:'🤖' },
    { title:'Actionable insights', desc:'Drivers, risks and actions — automatically.', icon:'💡' },
    { title:'Export slides', desc:'Stakeholder-ready decks in a click.', icon:'🎞️' },
  ];
  return (
    <section className="bg-white text-[#0D1F2D] py-16 px-6 md:px-24 text-center">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-extrabold mb-6">How it works</h2>
        <div className="grid md:grid-cols-5 gap-4">
          {steps.map((s,i)=>(
            <div key={i} className="rounded-2xl border bg-white p-5 shadow-sm inline-flex flex-col items-center transition-transform duration-200 hover:scale-[1.03] hover:-translate-y-0.5">
              <div className="mb-3 text-2xl">{s.icon}</div>
              <div className="font-semibold">{s.title}</div>
              <div className="text-sm text-gray-600">{s.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-8"><ThemedButton color={color} onClick={onTry}>Try it</ThemedButton></div>
      </div>
    </section>
  );
}

function WhySection(){
  const items = [
    { t:'Your data, private', d:'We never use your files for training. Only you control access.*' },
    { t:'Enterprise‑grade security', d:'Encryption in transit & at rest, private by default.' },
    { t:'Always premium output', d:'Every chart, slide and summary looks polished out‑of‑the‑box.' },
    { t:'Speed and scale', d:'From quick updates to 10k‑row sheets, results in seconds.' },
  ];
  return (
    <section className="px-6 md:px-24 py-14 bg-white">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl font-extrabold tracking-tight">Why Chartura</h2>
        <p className="text-gray-600 mt-2">Premium polish. Production speed. Answers when you need them.</p>
        <div className="grid md:grid-cols-4 gap-6 mt-8">
          {items.map((it,i)=>(
            <div key={i} className="rounded-2xl border bg-white p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
              <div className="text-lg font-semibold mb-2">{it.t}</div>
              <p className="text-gray-600 text-sm leading-6">{it.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 text-xs text-gray-500">*We may collect anonymous usage stats (e.g., feature clicks) to improve Chartura — never the content of your files.</div>
      </div>
    </section>
  );
}

/* =========================
   Slides (previews)
   ========================= */
function Slides({ chartRef, onRefresh, previews, gated, color }:{ chartRef: React.MutableRefObject<SVGSVGElement|null>; onRefresh: ()=>void; previews: string[]; gated:boolean; color:string }){
  async function download(){ if(gated) return; if(previews.length){ previews.forEach((src,i)=> downloadDataUrl(`Chartura_Slide_${i+1}.png`, src)); } else if(chartRef.current){ const d=await svgToPng(chartRef.current); downloadDataUrl('Chartura_Slide_1.png', d); } }
  return (
    <section className="py-14 px-6 md:px-24 bg-gray-50">
      <div className={`max-w-6xl mx-auto rounded-2xl bg-white p-8 shadow relative ${gated? 'blur-sm pointer-events-none':''}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">PowerPoint auto-slides</div>
          <div className="flex items-center gap-3">
            <button onClick={onRefresh} className="text-xs underline">Refresh previews</button>
            <ThemedButton color={color} onClick={download} className="text-sm">Download slides (PNG)</ThemedButton>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {previews.map((src,i)=>(
            <div key={i} className="rounded-2xl bg-white p-3 shadow border">
              <img src={src} className="w-full h-40 object-contain rounded"/>
            </div>
          ))}
        </div>
      </div>
      {gated && <div className="max-w-6xl mx-auto -mt-56 mb-8 text-center">
        <div className="inline-block bg-white/90 backdrop-blur rounded-xl px-6 py-4 shadow border">Start a free trial to unlock slide exports.</div>
      </div>}
    </section>
  );
}

/* =========================
   Import (CSV) Box
   ========================= */
function ImportBox({ onRows, onGate }:{ onRows:(rows:Row[])=>void; onGate:()=>void }){
  function parseCSV(text:string): Row[]{
    const lines = text.trim().split(/\r?\n/);
    const headers = lines.shift()?.split(',').map(s=>s.trim().toLowerCase())||[];
    const idx = (h:string)=> headers.indexOf(h);
    const out: Row[] = [];
    for(const line of lines){
      const cols = line.split(',');
      const row: Row = {
        period: cols[idx('period')]?.trim() || cols[0]?.trim() || '',
        revenue: num(cols[idx('revenue')]||'0'),
        units: num(cols[idx('units')]||'0'),
        supplier: (cols[idx('supplier')]||'')?.trim()||'Unknown',
        costPrice: num(cols[idx('costprice')]||cols[idx('cost_price')]||'0'),
        staffExp: num(cols[idx('staffexp')]||cols[idx('staff_exp')]||'0'),
      };
      if(row.period) out.push(row);
    }
    return out.length? out: defaultRows();
  }
  async function handleFile(f: File){
    const ext = f.name.split('.').pop()?.toLowerCase();
    if(ext==='csv'){
      const txt = await f.text();
      const rows = parseCSV(txt);
      onRows(rows);
      onGate(); // gate premium features after import
    } else {
      alert('For the demo, please upload CSV. (XLSX parsing is enabled in the full product).');
    }
  }
  return (
    <div className="rounded-2xl border-2 border-dashed p-5 text-center">
      <div className="font-semibold mb-1">Import your data</div>
      <div className="text-sm text-gray-600 mb-3">Upload a CSV to populate the table and charts. (Excel supported in the full product)</div>
      <input type="file" accept=".csv,.xlsx" onChange={e=>{ const f=e.target.files?.[0]; if(f) handleFile(f); }} className="mx-auto"/>
    </div>
  );
}

/* =========================
   Page
   ========================= */
export default function HomePage(){
  // Colors
  const [colorA, setColorA] = useState('#6B7280'); // default grey
  const [colorB, setColorB] = useState('#1ABC9C');

  // Data
  const [rows, setRows] = useState(defaultRows());

  // Chart controls
  const [mode, setMode] = useState<Mode>('line');
  const [yA, setYA] = useState<MetricKey>('units');
  const [secondaryOn, setSecondaryOn] = useState<boolean>(false);
  const [yB, setYB] = useState<MetricKey>('revenue');
  const [useRightAxis, setUseRightAxis] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState(true);
  const [pointSize, setPointSize] = useState(6);

  // Gating for imported data
  const [gated, setGated] = useState(false);

  const series = useMemo(()=> buildSeries(rows, yA, secondaryOn ? yB : undefined), [rows, yA, yB, secondaryOn]);

  // Export & Slides previews
  const svgRef = useRef<SVGSVGElement|null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  async function refreshPreviews(){ if(svgRef.current){ const d=await svgToPng(svgRef.current); setPreviews([d,d,d]); } }
  useEffect(()=>{ refreshPreviews(); }, [rows, mode, yA, yB, colorA, colorB, showGrid, secondaryOn, useRightAxis, pointSize]);

  function goTry(){ const el=document.getElementById('try'); if(el) el.scrollIntoView({behavior:'smooth'}); }

  return (
    <div className="font-inter">
      <HeroIntro onCTABottom={goTry} rows={rows} color={colorB} />

      <HowItWorks onTry={goTry} color={colorB} />

      <WhySection />

      <section id="try" className="px-6 md:px-24 py-16 bg-gray-50">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-extrabold">Try it here</h2>
          <p className="text-gray-600">Choose metrics, tweak styles, and explore insights. Everything updates as you edit the table or import CSV.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: top controls + chart + bottom controls */}
          <div className={`bg-white p-5 rounded-2xl shadow border ${gated? 'pointer-events-none opacity-60':''}`}>
            {/* TOP controls */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {(['line','area','bar','scatter','dual','pie'] as Mode[]).map(val=> (
                <button key={val} onClick={()=>setMode(val)} className={`px-4 py-2 rounded-full capitalize border transition-colors ${mode===val? 'bg-emerald-500 text-white border-emerald-500':'bg-white hover:bg-gray-100'}`}>{val}</button>
              ))}
              <ThemedButton color={colorA} onClick={async()=>{ if(gated) return; if(svgRef.current){ const d=await svgToPng(svgRef.current); downloadDataUrl('chartura-chart.png', d); } }} className="ml-auto text-sm">Download PNG</ThemedButton>
            </div>

            {/* CHART */}
            <PremiumChart
              series={series}
              mode={mode}
              colorA={colorA}
              colorB={colorB}
              xLabel="Year"
              yLabelLeft={METRIC_LABEL[yA]}
              yLabelRight={secondaryOn? METRIC_LABEL[yB] : undefined}
              showGrid={showGrid}
              useRightAxis={secondaryOn && useRightAxis}
              pointSize={pointSize}
              onRef={el=> (svgRef.current = el)}
            />

            {/* BELOW-CHART controls */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <div className="inline-flex items-center gap-2">
                <span className="text-xs text-gray-500">Primary</span>
                {['#6B7280','#1ABC9C','#6366F1','#ef4444','#f59e0b','#0ea5e9','#334155'].map(c=> (
                  <button key={c} onClick={()=>setColorA(c)} className="w-6 h-6 rounded-md border hover:brightness-110" style={{background:c}} />
                ))}
              </div>
              {(['line','area','bar','scatter','dual'] as Mode[]).includes(mode) && (
                <label className="ml-2 text-sm inline-flex items-center gap-2">Add secondary
                  <input type="checkbox" checked={secondaryOn} onChange={e=>setSecondaryOn(e.target.checked)} />
                </label>
              )}
              {secondaryOn && (
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs text-gray-500">Secondary</span>
                  {['#1ABC9C','#6366F1','#ef4444','#f59e0b','#0ea5e9','#6B7280','#334155'].map(c=> (
                    <button key={c} onClick={()=>setColorB(c)} className="w-6 h-6 rounded-md border hover:brightness-110" style={{background:c}} />
                  ))}
                </div>
              )}
              <label className="ml-2 text-sm inline-flex items-center gap-2">Grid
                <input type="checkbox" checked={showGrid} onChange={e=>setShowGrid(e.target.checked)} />
              </label>
              {mode!=='pie' && secondaryOn && (
                <label className="ml-2 text-sm inline-flex items-center gap-2">Use right axis
                  <input type="checkbox" checked={useRightAxis} onChange={e=>setUseRightAxis(e.target.checked)} />
                </label>
              )}
              {mode==='scatter' && (
                <label className="ml-2 text-sm inline-flex items-center gap-2">Point size
                  <input type="range" min={3} max={12} value={pointSize} onChange={e=>setPointSize(+e.target.value)} />
                </label>
              )}

              {/* metric pickers */}
              <label className="text-xs text-gray-600">Primary metric (A)
                <select value={yA} onChange={e=>setYA(e.target.value as MetricKey)} className="mt-1 border rounded p-2">
                  {Object.keys(METRIC_LABEL).map(k=> (<option key={k} value={k}>{METRIC_LABEL[k as MetricKey]}</option>))}
                </select>
              </label>
              {secondaryOn && (
                <label className="text-xs text-gray-600">Secondary metric (B)
                  <select value={yB} onChange={e=>setYB(e.target.value as MetricKey)} className="mt-1 border rounded p-2">
                    {Object.keys(METRIC_LABEL).map(k=> (<option key={k} value={k}>{METRIC_LABEL[k as MetricKey]}</option>))}
                  </select>
                </label>
              )}

              <div className="text-xs text-gray-500">Chart shows <b>{METRIC_LABEL[yA]}</b> by <b>Year</b>{secondaryOn? <> with <b>{METRIC_LABEL[yB]}</b>{useRightAxis?' on right axis':''}</> : null}.</div>
            </div>
          </div>

          {/* RIGHT: import + data grid + Askura under it */}
          <div className="space-y-4">
            <ImportBox onRows={(r)=> setRows(r)} onGate={()=> setGated(true)} />
            <div className="bg-white p-5 rounded-2xl shadow border">
              <div className="mb-2 text-sm font-semibold">Excel-style data</div>
              <DataGrid rows={rows} setRows={setRows} color={colorA} />
            </div>
            <Askura rows={rows} context={{mode,yA,yB: secondaryOn? yB: undefined, secondaryOn}} color={colorB} />
          </div>
        </div>
      </section>

      {/* Insights */}
      <InsightsSection rows={rows} gated={gated} />

      {/* Slides (PowerPoint previews) */}
      <Slides chartRef={svgRef} onRefresh={refreshPreviews} previews={previews} gated={gated} color={colorB} />
    </div>
  );
}
