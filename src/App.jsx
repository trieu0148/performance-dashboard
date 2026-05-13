import React, { useState, useEffect, useRef, useCallback } from "react";

const T = {
  bg0:"#080a0f", bg1:"#0d1117", bg2:"#13181f", bg3:"#1a2030",
  line1:"#1e2a3a", line2:"#243040",
  text0:"#e8edf5", text1:"#a0aec0", text2:"#6b7a99",
  blue:"#3b7ff5", cyan:"#06b6d4", green:"#10b981",
  yellow:"#f59e0b", red:"#ef4444", purple:"#8b5cf6",
  orange:"#f97316",
};
const FONT = "'Syne', sans-serif";
const MONO = "'DM Mono', monospace";
const PASSWORD = "car2026";

const fUsd = v => v==null?"—":v>=1000?`$${(v/1000).toFixed(1)}k`:`$${v.toFixed(2)}`;
const fNum = v => v==null?"—":v>=1000?`${(v/1000).toFixed(1)}k`:String(Math.round(v));
const fPct = v => v==null?"—":`${(v*100).toFixed(1)}%`;
const fX   = v => v==null?"—":`${v.toFixed(2)}x`;
const n    = v => { if(v==null) return 0; const s=String(v).replace(/[$,%]/g,"").trim(); const p=parseFloat(s); return isNaN(p)?0:p; };
const pct  = v => { if(v==null) return 0; const s=String(v).replace(/[$,%]/g,"").trim(); const p=parseFloat(s); if(isNaN(p)) return 0; return p>1?p/100:p; };

function parseCSV(text) {
  const lines=text.trim().split("\n").filter(l=>l.trim());
  if(!lines.length) return [];
  const headers=lines[0].split("\t").map(h=>h.trim().replace(/^"|"$/g,""));
  return lines.slice(1).map(line=>{
    const vals=line.split("\t").map(v=>v.trim().replace(/^"|"$/g,""));
    const obj={};
    headers.forEach((h,i)=>{obj[h]=vals[i]??"";});
    return obj;
  });
}

function detectCols(headers) {
  const lc=s=>s.toLowerCase();
  const exact=key=>headers.find(h=>lc(h)===lc(key))||null;
  return {
    sku:exact("SKU"),name:exact("Product Name"),brand:exact("Brand"),type:exact("Type"),
    stock:exact("Stock"),cost:exact("Cost"),price:exact("MAP Price"),margin:exact("Margin"),
    sessions:exact("GA4-Sessions"),revenue:exact("GA4-Item revenue"),
    units:exact("GA4-Items purchased"),atc:exact("GA4-Items added to cart"),
    checkout:exact("GA4-Items checked out"),
    sessionsGG:exact("GA4-Sessions-Google Ads"),unitsGG:exact("GA4-Items purchased-Google Ads"),
    revenueGG:exact("GA4-Item revenue-Google Ads"),
    sessionsFB:exact("GA4-Sessions-Facebook ads"),unitsFB:exact("GA4-Items purchased-Facebook Ads"),
    revenueFB:exact("GA4-Item revenue-Facebook Ads"),
    ggSpend:exact("Google Ads-Amount spent"),ggConv:exact("Google Ads-Conv"),
    ggValue:exact("Google Ads-Value"),ggClick:exact("Google Ads-Click"),
    ggImp:exact("Google Ads-Imp"),fbSpend:exact("Facebook Ads-Amount spent"),
    fbClicks:exact("Facebook Ads-Link clicks"),fbImp:exact("Facebook Ads-Impressions"),
  };
}

function compute(rows,cols) {
  const valid=rows.filter(r=>r[cols.sku]&&r[cols.sku]!==""&&r[cols.sku]!=="#REF!"&&r[cols.sku]!=="SKU");
  const get=(r,c)=>c?n(r[c]):0;
  const getpct=(r,c)=>c?pct(r[c]):0;
  const sum=col=>valid.reduce((s,r)=>s+get(r,col),0);

  const totalRevenue=sum(cols.revenue),totalUnits=sum(cols.units),totalSessions=sum(cols.sessions);
  const totalATC=sum(cols.atc),totalCheckout=sum(cols.checkout);
  const totalGGSpend=sum(cols.ggSpend),totalFBSpend=sum(cols.fbSpend),totalAdSpend=totalGGSpend+totalFBSpend;
  const totalRevenueGG=sum(cols.revenueGG),totalRevenueFB=sum(cols.revenueFB),totalAdRevenue=totalRevenueGG+totalRevenueFB;
  const totalUnitsGG=sum(cols.unitsGG),totalUnitsFB=sum(cols.unitsFB),totalAdUnits=totalUnitsGG+totalUnitsFB;
  const totalSessionsGG=sum(cols.sessionsGG),totalSessionsFB=sum(cols.sessionsFB);
  const totalGGClick=sum(cols.ggClick),totalFBClicks=sum(cols.fbClicks);
  const totalGGImp=sum(cols.ggImp),totalFBImp=sum(cols.fbImp);
  const totalGGConv=sum(cols.ggConv),totalGGValue=sum(cols.ggValue);
  const margins=valid.map(r=>getpct(r,cols.margin)).filter(v=>v>0&&v<=1);
  const avgMargin=margins.length?margins.reduce((a,b)=>a+b,0)/margins.length:null;
  const totalROAS=totalAdSpend>0?totalAdRevenue/totalAdSpend:null;
  const convRate=totalSessions>0?totalUnits/totalSessions:null;
  const atcRate=totalSessions>0?totalATC/totalSessions:null;
  const totalCPA=totalAdUnits>0?totalAdSpend/totalAdUnits:null;
  const negMargin=valid.filter(r=>getpct(r,cols.margin)<0).length;

  const skuMap={};
  valid.forEach(r=>{
    const k=r[cols.sku];
    if(!skuMap[k]) skuMap[k]={sku:k,name:cols.name?r[cols.name]:k,brand:cols.brand?r[cols.brand]:"",
      type:cols.type?r[cols.type]:"",stock:0,cost:0,price:0,margins:[],
      revenue:0,units:0,sessions:0,atc:0,checkout:0,
      revenueGG:0,unitsGG:0,sessionsGG:0,revenueFB:0,unitsFB:0,sessionsFB:0,
      ggSpend:0,ggConv:0,ggValue:0,ggClick:0,ggImp:0,fbSpend:0,fbClicks:0,fbImp:0};
    const p=skuMap[k];
    ["revenue","units","sessions","atc","checkout","revenueGG","unitsGG","sessionsGG",
     "revenueFB","unitsFB","sessionsFB","ggSpend","ggConv","ggValue","ggClick","ggImp",
     "fbSpend","fbClicks","fbImp"].forEach(f=>{ const col=cols[f]; if(col) p[f]+=get(r,col); });
    p.stock+=get(r,cols.stock); p.cost=get(r,cols.cost)||p.cost; p.price=get(r,cols.price)||p.price;
    const m=getpct(r,cols.margin); if(m>0&&m<=1) p.margins.push(m);
  });

  const enrichSku=p=>{
    const margin=p.margins.length?p.margins.reduce((a,b)=>a+b,0)/p.margins.length:null;
    const adSpend=p.ggSpend+p.fbSpend,adRevenue=p.revenueGG+p.revenueFB,adUnits=p.unitsGG+p.unitsFB;
    const beRoas=margin>0?1/margin:null,roas=adSpend>0?adRevenue/adSpend:null;
    const cpa=adUnits>0?adSpend/adUnits:null;
    const ggRoas=p.ggSpend>0?p.revenueGG/p.ggSpend:null,fbRoas=p.fbSpend>0?p.revenueFB/p.fbSpend:null;
    const ggCpa=p.unitsGG>0?p.ggSpend/p.unitsGG:null,fbCpa=p.unitsFB>0?p.fbSpend/p.unitsFB:null;
    const ggCpaPlat=p.ggConv>0?p.ggSpend/p.ggConv:null;
    const ggRoasPlat=p.ggSpend>0?p.ggValue/p.ggSpend:null;
    const ggCrPlat=p.sessionsGG>0?p.ggConv/p.sessionsGG:null;
    const atcRate=p.sessions>0?p.atc/p.sessions:null;
    const checkRate=p.atc>0?p.checkout/p.atc:null;
    const convRate=p.sessions>0?p.units/p.sessions:null;
    const ggConvRate=p.sessionsGG>0?p.unitsGG/p.sessionsGG:null;
    const fbConvRate=p.sessionsFB>0?p.unitsFB/p.sessionsFB:null;
    const ggCtr=p.ggImp>0?p.ggClick/p.ggImp:null,fbCtr=p.fbImp>0?p.fbClicks/p.fbImp:null;
    return {...p,margin,adSpend,adRevenue,adUnits,beRoas,roas,cpa,ggRoas,fbRoas,ggCpa,fbCpa,
      ggCpaPlat,ggRoasPlat,ggCrPlat,atcRate,checkRate,convRate,ggConvRate,fbConvRate,ggCtr,fbCtr};
  };
  const skuList=Object.values(skuMap).map(enrichSku);

  const nameMap={};
  skuList.forEach(p=>{
    const k=p.name||p.sku;
    if(!nameMap[k]) nameMap[k]={...p,skus:[p.sku],margins:[...p.margins]};
    else{
      const b=nameMap[k]; b.skus.push(p.sku);
      ["revenue","units","sessions","atc","checkout","revenueGG","unitsGG","sessionsGG",
       "revenueFB","unitsFB","sessionsFB","ggSpend","ggConv","ggValue","ggClick","ggImp",
       "fbSpend","fbClicks","fbImp","stock"].forEach(f=>b[f]+=p[f]);
      b.margins.push(...p.margins);
    }
  });
  const productList=Object.values(nameMap).map(enrichSku);

  const brandMap={};
  skuList.forEach(p=>{
    const k=p.brand||"Unknown";
    if(!brandMap[k]) brandMap[k]={name:k,skus:0,revenue:0,units:0,sessions:0,atc:0,
      revenueGG:0,revenueFB:0,ggSpend:0,fbSpend:0,unitsGG:0,unitsFB:0,margins:[]};
    const b=brandMap[k]; b.skus++;
    ["revenue","units","sessions","atc","revenueGG","revenueFB","ggSpend","fbSpend","unitsGG","unitsFB"].forEach(f=>b[f]+=p[f]);
    if(p.margin>0&&p.margin<=1) b.margins.push(p.margin);
  });
  const brandRevs=Object.values(brandMap).map(b=>b.revenue).filter(v=>v>0).sort((a,b)=>a-b);
  const brandRevMedian=brandRevs[Math.floor(brandRevs.length/2)]||0;
  const allBrands=Object.values(brandMap).map(b=>{
    const margin=b.margins.length?b.margins.reduce((a,c)=>a+c,0)/b.margins.length:null;
    const adSpend=b.ggSpend+b.fbSpend,adRev=b.revenueGG+b.revenueFB,adUnits=b.unitsGG+b.unitsFB;
    const roas=adSpend>0?adRev/adSpend:null;
    const atcRate=b.sessions>0?b.atc/b.sessions:null,convRate=b.sessions>0?b.units/b.sessions:null;
    const hiRev=b.revenue>=brandRevMedian,hiMar=(margin||0)>=0.35;
    const label=hiRev&&hiMar?"star":hiRev&&!hiMar?"cashcow":!hiRev&&hiMar?"gem":"risk";
    return {...b,margin,adSpend,adRev,adUnits,roas,atcRate,convRate,label};
  }).sort((a,b)=>b.revenue-a.revenue);
  const brandList=allBrands.slice(0,10);

  // 5-group quadrant — median only from SKUs with revenue > 0
  const posRevs=skuList.map(p=>p.revenue).filter(v=>v>0).sort((a,b)=>a-b);
  const revMedian=posRevs[Math.floor(posRevs.length/2)]||0;
  const quadrant=p=>{
    if(p.revenue===0) return "nosales";
    const h=p.revenue>=revMedian,m=(p.margin||0)>=0.35;
    return h&&m?"star":h&&!m?"cashcow":!h&&m?"gem":"risk";
  };

  const funnelTrafficATC=skuList.filter(p=>p.sessions>=10).sort((a,b)=>b.sessions-a.sessions);
  const funnelATCCheckout=skuList.filter(p=>p.atc>=3).map(p=>({...p,checkoutRate:p.atc>0?p.checkout/p.atc:null})).sort((a,b)=>b.atc-a.atc);
  const funnelCheckoutPurchase=skuList.filter(p=>p.checkout>=2).map(p=>({...p,purchaseRate:p.checkout>0?p.units/p.checkout:null})).sort((a,b)=>b.checkout-a.checkout);

  return {
    totalRevenue,totalUnits,totalSessions,totalATC,totalCheckout,
    totalGGSpend,totalFBSpend,totalAdSpend,totalRevenueGG,totalRevenueFB,totalAdRevenue,
    totalUnitsGG,totalUnitsFB,totalAdUnits,totalSessionsGG,totalSessionsFB,
    totalGGClick,totalFBClicks,totalGGImp,totalFBImp,totalGGConv,totalGGValue,
    avgMargin,totalROAS,convRate,atcRate,totalCPA,negMargin,
    skuList,productList,brandList,allBrands,brandRevMedian,
    funnelTrafficATC,funnelATCCheckout,funnelCheckoutPurchase,
    quadrant,revMedian,
  };
}

const css=`*{box-sizing:border-box;margin:0;padding:0}body{background:#080a0f;font-family:'Syne',sans-serif;color:#e8edf5;min-height:100vh}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#243040;border-radius:2px}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}.fade{animation:fadeIn .3s ease both}.row-hover:hover td{background:#13181f!important}.tab-btn:hover{border-color:#3b7ff5!important;color:#e8edf5!important}.info-tooltip{position:relative;display:inline-flex;align-items:center}.info-tooltip .tip{display:none;position:absolute;top:100%;left:0;z-index:99;background:#1a2030;border:1px solid #243040;border-radius:8px;padding:10px 14px;min-width:280px;font-size:11px;line-height:1.7;color:#a0aec0;white-space:pre-line;margin-top:4px}.info-tooltip:hover .tip{display:block}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:center;justify-content:center}.modal-box{background:#0d1117;border:1px solid #243040;border-radius:14px;padding:20px;width:700px;max-height:82vh;display:flex;flex-direction:column}.modal-body{overflow-y:auto;flex:1}`;

const Kpi=({icon,label,value,sub,ok,bad,mono})=>(
  <div style={{background:T.bg2,border:`1px solid ${T.line1}`,borderRadius:10,padding:"14px 16px"}}>
    <div style={{fontSize:11,color:T.text2,display:"flex",alignItems:"center",gap:5,marginBottom:6}}><i className={`ti ${icon}`} style={{fontSize:12}}/>{label}</div>
    <div style={{fontSize:20,fontWeight:600,color:T.text0,fontFamily:mono?MONO:FONT}}>{value}</div>
    {sub&&<div style={{fontSize:11,marginTop:3,color:ok?T.green:bad?T.red:T.text2}}>{sub}</div>}
  </div>
);

const Card=({title,icon,sub,children,tooltip})=>(
  <div style={{background:T.bg1,border:`1px solid ${T.line1}`,borderRadius:12,padding:"16px 18px",marginBottom:12}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
      <i className={`ti ${icon}`} style={{fontSize:14,color:T.text2}}/>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:T.text0,display:"flex",alignItems:"center",gap:6}}>
          {title}
          {tooltip&&(<span className="info-tooltip"><i className="ti ti-info-circle" style={{fontSize:13,color:T.text2,cursor:"help"}}/><span className="tip">{tooltip}</span></span>)}
        </div>
        {sub&&<div style={{fontSize:11,color:T.text2,marginTop:1}}>{sub}</div>}
      </div>
    </div>
    {children}
  </div>
);

const HBar=({value,max,color=T.blue,h=6})=>{
  const w=max>0?Math.max(2,(value/max)*100):0;
  return <div style={{flex:1,height:h,background:T.bg3,borderRadius:3,overflow:"hidden"}}><div style={{width:`${w}%`,height:"100%",background:color,borderRadius:3,transition:"width .5s"}}/></div>;
};

const Tag=({color,children})=>(<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:color+"22",color,fontWeight:600,whiteSpace:"nowrap"}}>{children}</span>);
const Empty=({icon="ti-database-off",msg="No data"})=>(<div style={{textAlign:"center",padding:"2rem",color:T.text2,fontSize:13}}><i className={`ti ${icon}`} style={{fontSize:28,display:"block",marginBottom:8,opacity:.4}}/>{msg}</div>);
const NavTab=({label,icon,active,onClick})=>(<button onClick={onClick} className="tab-btn" style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",fontSize:12,fontFamily:FONT,borderRadius:8,border:`1px solid ${active?T.blue:T.line1}`,cursor:"pointer",background:active?T.blue:"transparent",color:active?"#fff":T.text1,transition:"all .15s"}}><i className={`ti ${icon}`} style={{fontSize:13}}/>{label}</button>);
const SubTab=({label,active,onClick})=>(<button onClick={onClick} style={{padding:"5px 12px",fontSize:11,fontFamily:FONT,borderRadius:6,border:`1px solid ${active?T.cyan:T.line1}`,cursor:"pointer",background:active?T.cyan+"22":"transparent",color:active?T.cyan:T.text2,transition:"all .15s"}}>{label}</button>);
const BrandLabel=({label})=>{const map={star:["⭐ Star",T.green],cashcow:["💰 Cash Cow",T.yellow],gem:["💎 Hidden Gem",T.cyan],risk:["⚠️ At Risk",T.red]};const[text,color]=map[label]||["—",T.text2];return <Tag color={color}>{text}</Tag>;};

function getAction(p){
  if(p.stock<=0) return{icon:"🚨",text:"Out of stock — restock now",color:T.red};
  if(p.stock<5&&p.sessions>=10&&p.units>0&&p.roas>=p.beRoas) return{icon:"⚡",text:"Low stock — selling well",color:T.orange};
  if(p.sessions<10&&p.adSpend>0) return{icon:"🎯",text:"Review targeting — low reach",color:T.purple};
  if(p.sessions>=10&&(p.atcRate||0)<0.05&&p.stock>0) return{icon:"🖼️",text:"Improve product page",color:T.yellow};
  if((p.atcRate||0)>=0.05&&(p.convRate||0)<0.01&&p.stock>0) return{icon:"💳",text:"Check checkout flow",color:T.yellow};
  if(p.cpa>p.price&&p.stock>0) return{icon:"🛑",text:"Pause ads — CPA > price",color:T.red};
  if(p.beRoas&&p.roas<p.beRoas&&p.stock>0) return{icon:"✂️",text:"Reduce bid",color:T.orange};
  return{icon:"✅",text:"On track",color:T.green};
}

// ── Rate color with custom benchmarks ────────────────────────────────────────
const rateColor=(v,low,mid)=>v==null?T.text2:v<low?T.red:v<mid?T.yellow:T.green;
const rc=(v)=>rateColor(v,0.05,0.10); // default

// ── Search Modal ──────────────────────────────────────────────────────────────
const SearchModal=({title,color,allItems,cols,onClose})=>{
  const [q,setQ]=useState("");
  const filtered=allItems.filter(p=>(p.name||p.sku||"").toLowerCase().includes(q.toLowerCase()));
  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:600,color:color||T.text0}}>{title} <span style={{fontSize:12,color:T.text2,fontWeight:400}}>({filtered.length} / {allItems.length})</span></div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.text2,cursor:"pointer",fontSize:18}}><i className="ti ti-x"/></button>
        </div>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search product..."
          style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${T.line2}`,background:T.bg2,color:T.text0,fontSize:12,fontFamily:FONT,outline:"none",marginBottom:12}}/>
        <div className="modal-body">
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr>{cols.map(c=>(<th key={c.k} style={{textAlign:c.r?"right":"left",padding:"5px 8px",color:T.text2,fontWeight:500,borderBottom:`1px solid ${T.line1}`,position:"sticky",top:0,background:T.bg1}}>{c.label}</th>))}</tr></thead>
            <tbody>{filtered.map((row,i)=>(<tr key={i} style={{background:i%2===0?"transparent":T.bg2}}>{cols.map(c=>(<td key={c.k} style={{padding:"6px 8px",borderBottom:`1px solid ${T.line1}`,textAlign:c.r?"right":"left",color:T.text0,whiteSpace:c.wrap?"normal":"nowrap",maxWidth:c.wrap?240:undefined}}>{c.render?c.render(row):row[c.k]}</td>))}</tr>))}</tbody>
          </table>
          {filtered.length===0&&<Empty msg="No results found"/>}
        </div>
      </div>
    </div>
  );
};

const Tbl=({cols:tcols,rows,max=10})=>{
  if(!rows?.length) return <Empty/>;
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{tcols.map(c=>(<th key={c.k} style={{textAlign:c.r?"right":"left",padding:"6px 10px",color:T.text2,fontWeight:500,borderBottom:`1px solid ${T.line1}`,whiteSpace:"nowrap"}}>{c.label}</th>))}</tr></thead>
        <tbody>{rows.slice(0,max).map((row,i)=>(<tr key={i} className="row-hover" style={{background:i%2===0?"transparent":T.bg2+"88"}}>{tcols.map(c=>(<td key={c.k} style={{padding:"7px 10px",borderBottom:`1px solid ${T.line1}`,textAlign:c.r?"right":"left",color:T.text0,whiteSpace:c.wrap?"normal":"nowrap",maxWidth:c.wrap?200:undefined}}>{c.render?c.render(row):row[c.k]}</td>))}</tr>))}</tbody>
      </table>
    </div>
  );
};

const FunnelViz=({sessions,atc,checkout,units})=>{
  const steps=[{label:"Sessions",value:sessions,color:T.blue},{label:"Add to Cart",value:atc,color:T.cyan},{label:"Checkout",value:checkout,color:T.purple},{label:"Purchased",value:units,color:T.green}].filter(s=>s.value>0);
  if(!steps.length) return <Empty icon="ti-funnel" msg="No funnel data"/>;
  const max=steps[0].value;
  return(<div style={{display:"flex",flexDirection:"column",gap:8}}>{steps.map((s,i)=>{const drop=i>0?((steps[i-1].value-s.value)/steps[i-1].value):0;return(<div key={i}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:90,fontSize:11,color:T.text2}}>{s.label}</div><HBar value={s.value} max={max} color={s.color} h={8}/><div style={{width:60,textAlign:"right",fontSize:12,fontFamily:MONO,color:T.text0}}>{fNum(s.value)}</div>{i>0&&<div style={{width:50,textAlign:"right",fontSize:11,color:drop>0.5?T.red:T.text2}}>-{fPct(drop)}</div>}</div></div>);})}</div>);
};

// ── Funnel Leak Table with modal + search + custom benchmarks ─────────────────
const FunnelLeakTable=({title,tooltip,items,col1,col1label,rateKey,rateLabel,low,mid})=>{
  const [showModal,setShowModal]=useState(false);
  const rc=v=>rateColor(v,low,mid);
  const cols=[
    {k:"name",label:"Product",wrap:true},
    {k:col1,label:col1label,r:true,render:p=>fNum(p[col1])},
    {k:"stock",label:"Stock",r:true,render:p=><span style={{color:p.stock<=0?T.red:p.stock<=5?T.orange:T.text2}}>{fNum(p.stock)}</span>},
    {k:rateKey,label:rateLabel,r:true,render:p=><span style={{color:rc(p[rateKey]),fontWeight:600}}>{fPct(p[rateKey])}</span>},
    {k:"revenue",label:"Revenue",r:true,render:p=>fUsd(p.revenue)},
  ];
  return(
    <>
      <Card title={title} icon="ti-alert-triangle" tooltip={tooltip}>
        {items.length?(
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 46px 40px 48px 54px",gap:4,padding:"0 4px 4px",borderBottom:`1px solid ${T.line1}`,marginBottom:4}}>
              {["Product",col1label,"Stock",rateLabel,"Revenue"].map(h=><div key={h} style={{fontSize:10,color:T.text2,fontWeight:500,textAlign:h==="Product"?"left":"right"}}>{h}</div>)}
            </div>
            {items.slice(0,10).map((p,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 46px 40px 48px 54px",gap:4,padding:"5px 4px",borderRadius:6,background:i%2===0?"transparent":T.bg2+"88"}}>
                <div style={{fontSize:11,color:T.text0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name||p.sku}</div>
                <div style={{fontSize:11,color:T.text2,textAlign:"right",fontFamily:MONO}}>{fNum(p[col1])}</div>
                <div style={{fontSize:11,color:p.stock<=0?T.red:p.stock<=5?T.orange:T.text2,textAlign:"right",fontFamily:MONO}}>{fNum(p.stock)}</div>
                <div style={{fontSize:11,fontWeight:600,color:rc(p[rateKey]),textAlign:"right"}}>{fPct(p[rateKey])}</div>
                <div style={{fontSize:11,color:T.text2,textAlign:"right",fontFamily:MONO}}>{fUsd(p.revenue)}</div>
              </div>
            ))}
            {items.length>10&&(
              <button onClick={()=>setShowModal(true)} style={{marginTop:8,fontSize:11,color:T.cyan,background:"none",border:`1px solid ${T.cyan}33`,borderRadius:6,padding:"3px 10px",cursor:"pointer",fontFamily:FONT}}>
                +{items.length-10} more
              </button>
            )}
          </>
        ):<Empty msg="No data"/>}
      </Card>
      {showModal&&<SearchModal title={title} color={T.cyan} allItems={items} cols={cols} onClose={()=>setShowModal(false)}/>}
    </>
  );
};

// ── Quad Card (5 groups) ──────────────────────────────────────────────────────
const QuadCard=({label,count,items,extraCols=[]})=>{
  const [showModal,setShowModal]=useState(false);
  const map={
    star:{icon:"⭐ Star",color:T.green,desc:"Revenue ≥ median AND Margin ≥ 35%"},
    cashcow:{icon:"💰 Cash Cow",color:T.yellow,desc:"Revenue ≥ median AND Margin < 35%"},
    gem:{icon:"💎 Hidden Gem",color:T.cyan,desc:"0 < Revenue < median AND Margin ≥ 35%"},
    risk:{icon:"⚠️ At Risk",color:T.red,desc:"0 < Revenue < median AND Margin < 35%"},
    nosales:{icon:"🚫 No Sales Yet",color:T.text2,desc:"Revenue = 0 — no orders this period"},
  };
  const {icon,color,desc}=map[label];
  const baseCols=[
    {k:"name",label:"Product",wrap:true},
    ...(label!=="nosales"?[{k:"revenue",label:"Revenue",r:true,render:p=>fUsd(p.revenue)},{k:"units",label:"Units",r:true,render:p=>fNum(p.units)}]:[]),
    {k:"margin",label:"Margin",r:true,render:p=>fPct(p.margin)},
    {k:"cost",label:"Cost",r:true,render:p=>fUsd(p.cost)},
    ...(label==="nosales"?[{k:"stock",label:"Stock",r:true,render:p=>fNum(p.stock)}]:[]),
  ];
  const sortedItems=[...items].sort((a,b)=>{
    if(label==="gem") return (b.margin||0)-(a.margin||0);
    if(label==="nosales") return b.stock-a.stock;
    return b.revenue-a.revenue;
  });
  return(
    <>
      <div style={{background:T.bg2,border:`1px solid ${T.line1}`,borderLeft:`3px solid ${color}`,borderRadius:"0 10px 10px 0",padding:"12px 14px",minHeight:180}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
          <div><div style={{fontSize:12,fontWeight:600,color}}>{icon}</div><div style={{fontSize:11,color:T.text2,marginTop:2}}>{desc}</div></div>
          <div style={{fontSize:22,fontWeight:700,fontFamily:MONO,color:T.text0}}>{count}</div>
        </div>
        <div style={{fontSize:10,color:T.text2,display:"grid",gridTemplateColumns:label==="nosales"?"1fr 50px 40px 35px":"1fr 55px 42px 35px 35px",gap:4,marginBottom:4,padding:"4px 2px",borderBottom:`1px solid ${T.line1}`}}>
          <span>Product</span>
          {label!=="nosales"&&<><span style={{textAlign:"right"}}>Revenue</span><span style={{textAlign:"right"}}>Margin</span><span style={{textAlign:"right"}}>Units</span><span style={{textAlign:"right"}}>Cost</span></>}
          {label==="nosales"&&<><span style={{textAlign:"right"}}>Margin</span><span style={{textAlign:"right"}}>Cost</span><span style={{textAlign:"right"}}>Stock</span></>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          {sortedItems.slice(0,5).map((p,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:label==="nosales"?"1fr 50px 40px 35px":"1fr 55px 42px 35px 35px",gap:4,padding:"3px 2px",borderBottom:`1px solid ${T.line1}`}}>
              <span style={{fontSize:11,color:T.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name||p.sku}</span>
              {label!=="nosales"&&<><span style={{fontSize:11,color:T.text2,textAlign:"right",fontFamily:MONO}}>{fUsd(p.revenue)}</span><span style={{fontSize:11,color:T.text2,textAlign:"right",fontFamily:MONO}}>{fPct(p.margin)}</span><span style={{fontSize:11,color:T.text2,textAlign:"right",fontFamily:MONO}}>{fNum(p.units)}</span><span style={{fontSize:11,color:T.text2,textAlign:"right",fontFamily:MONO}}>{fUsd(p.cost)}</span></>}
              {label==="nosales"&&<><span style={{fontSize:11,color:T.text2,textAlign:"right",fontFamily:MONO}}>{fPct(p.margin)}</span><span style={{fontSize:11,color:T.text2,textAlign:"right",fontFamily:MONO}}>{fUsd(p.cost)}</span><span style={{fontSize:11,color:T.text2,textAlign:"right",fontFamily:MONO}}>{fNum(p.stock)}</span></>}
            </div>
          ))}
        </div>
        {sortedItems.length>5&&(<button onClick={()=>setShowModal(true)} style={{marginTop:8,fontSize:11,color,background:"none",border:`1px solid ${color}33`,borderRadius:6,padding:"3px 10px",cursor:"pointer",fontFamily:FONT}}>+{sortedItems.length-5} more</button>)}
      </div>
      {showModal&&<SearchModal title={icon} color={color} allItems={sortedItems} cols={baseCols} onClose={()=>setShowModal(false)}/>}
    </>
  );
};

// ── Stock Health Card ─────────────────────────────────────────────────────────
const StockCard=({label,color,count,items})=>{
  const [showModal,setShowModal]=useState(false);
  return(
    <>
      <div style={{background:T.bg2,border:`1px solid ${T.line1}`,borderLeft:`3px solid ${color}`,borderRadius:"0 10px 10px 0",padding:"12px 14px",minHeight:180}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <div style={{fontSize:12,fontWeight:600,color}}>{label}</div>
          <div style={{fontSize:22,fontWeight:700,fontFamily:MONO,color:T.text0}}>{count}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          {items.slice(0,5).map((p,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"3px 2px",borderBottom:`1px solid ${T.line1}`}}>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,color:T.text1}}>{p.name||p.sku}</span>
              <span style={{marginLeft:8,flexShrink:0,color:T.text2,fontFamily:MONO}}>{fNum(p.stock)}</span>
            </div>
          ))}
        </div>
        {items.length>5&&(<button onClick={()=>setShowModal(true)} style={{marginTop:8,fontSize:11,color,background:"none",border:`1px solid ${color}33`,borderRadius:6,padding:"3px 10px",cursor:"pointer",fontFamily:FONT}}>+{items.length-5} more</button>)}
      </div>
      {showModal&&<SearchModal title={label} color={color} allItems={items} cols={[{k:"name",label:"Product",wrap:true},{k:"stock",label:"Stock",r:true,render:p=>fNum(p.stock)},{k:"revenue",label:"Revenue",r:true,render:p=>fUsd(p.revenue)},{k:"units",label:"Units Sold",r:true,render:p=>fNum(p.units)}]} onClose={()=>setShowModal(false)}/>}
    </>
  );
};

const PasswordScreen=({onAuth})=>{
  const [val,setVal]=useState(""); const [err,setErr]=useState(false);
  const submit=()=>{if(val===PASSWORD){onAuth();}else{setErr(true);setVal("");setTimeout(()=>setErr(false),1500);}};
  return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg0}}><div style={{background:T.bg1,border:`1px solid ${T.line1}`,borderRadius:16,padding:"40px 48px",width:340,textAlign:"center"}}><i className="ti ti-lock" style={{fontSize:32,color:T.blue,marginBottom:16,display:"block"}}/><div style={{fontSize:18,fontWeight:700,color:T.text0,marginBottom:6}}>RC Performance Dashboard</div><div style={{fontSize:12,color:T.text2,marginBottom:24}}>Enter password to continue</div><input type="password" value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Password" autoFocus style={{width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${err?T.red:T.line2}`,background:T.bg2,color:T.text0,fontSize:14,fontFamily:FONT,outline:"none",marginBottom:12}}/>{err&&<div style={{fontSize:12,color:T.red,marginBottom:8}}>Incorrect password</div>}<button onClick={submit} style={{width:"100%",padding:"10px",borderRadius:8,background:T.blue,color:"#fff",border:"none",fontSize:13,fontFamily:FONT,fontWeight:600,cursor:"pointer"}}>Unlock</button></div></div>);
};

const SetupScreen=({onLoad})=>{
  const [url,setUrl]=useState(localStorage.getItem("rc_apps_script_url")||"");
  const [loading,setLoading]=useState(false); const [err,setErr]=useState("");
  const load=async()=>{if(!url.trim()) return;setLoading(true);setErr("");try{const res=await fetch(`${url.trim()}?range=mtd`);const text=await res.text();localStorage.setItem("rc_apps_script_url",url.trim());onLoad(url.trim(),text);}catch(e){setErr("Cannot connect. Check URL and CORS settings.");}setLoading(false);};
  return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg0}}><div style={{background:T.bg1,border:`1px solid ${T.line1}`,borderRadius:16,padding:"40px 48px",width:480}}><i className="ti ti-table" style={{fontSize:28,color:T.blue,marginBottom:14,display:"block"}}/><div style={{fontSize:18,fontWeight:700,color:T.text0,marginBottom:6}}>Connect Google Sheet</div><div style={{fontSize:12,color:T.text2,marginBottom:20}}>Paste your Apps Script Web App URL below</div><input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()} placeholder="https://script.google.com/macros/s/..." style={{width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${T.line2}`,background:T.bg2,color:T.text0,fontSize:12,fontFamily:MONO,outline:"none",marginBottom:10}}/>{err&&<div style={{fontSize:12,color:T.red,marginBottom:8}}>{err}</div>}<button onClick={load} disabled={loading} style={{width:"100%",padding:"10px",borderRadius:8,background:T.blue,color:"#fff",border:"none",fontSize:13,fontFamily:FONT,fontWeight:600,cursor:"pointer",opacity:loading?.6:1}}>{loading?"Connecting...":"Load Dashboard"}</button></div></div>);
};

// ── TAB: PERFORMANCE ──────────────────────────────────────────────────────────
const TabPerformance=({m})=>{
  const [prodView,setProdView]=useState("sku");
  const [showBrandModal,setShowBrandModal]=useState(false);
  const products=prodView==="sku"?[...m.skuList].sort((a,b)=>b.revenue-a.revenue):[...m.productList].sort((a,b)=>b.revenue-a.revenue);

  const brandCols=[
    {k:"name",label:"Brand",render:p=><span style={{fontWeight:600}}>{p.name}</span>},
    {k:"label",label:"Health",render:p=><BrandLabel label={p.label}/>},
    {k:"revenue",label:"Revenue",r:true,render:p=>fUsd(p.revenue)},
    {k:"units",label:"Units",r:true,render:p=>fNum(p.units)},
    {k:"sessions",label:"Sessions",r:true,render:p=>fNum(p.sessions)},
    {k:"atcRate",label:"ATC Rate",r:true,render:p=><span style={{color:rc(p.atcRate)}}>{fPct(p.atcRate)}</span>},
    {k:"convRate",label:"Conv",r:true,render:p=><span style={{color:rc(p.convRate)}}>{fPct(p.convRate)}</span>},
    {k:"margin",label:"Margin",r:true,render:p=>fPct(p.margin)},
    {k:"adSpend",label:"Ad Cost",r:true,render:p=>fUsd(p.adSpend)},
    {k:"roas",label:"ROAS",r:true,render:p=>fX(p.roas)},
  ];

  const prodCols=[
    {k:"name",label:"Product",wrap:true},
    {k:"revenue",label:"Revenue",r:true,render:p=>fUsd(p.revenue)},
    {k:"units",label:"Units",r:true,render:p=>fNum(p.units)},
    {k:"stock",label:"Stock",r:true,render:p=><span style={{color:p.stock<=0?T.red:p.stock<=5?T.orange:T.text0}}>{fNum(p.stock)}</span>},
    {k:"sessions",label:"Sessions",r:true,render:p=>fNum(p.sessions)},
    {k:"atcRate",label:"ATC Rate",r:true,render:p=><span style={{color:rc(p.atcRate)}}>{fPct(p.atcRate)}</span>},
    {k:"convRate",label:"Conv Rate",r:true,render:p=><span style={{color:rc(p.convRate)}}>{fPct(p.convRate)}</span>},
    {k:"margin",label:"Margin",r:true,render:p=>fPct(p.margin)},
    {k:"adSpend",label:"Paid Ads Cost",r:true,render:p=>fUsd(p.adSpend)},
    {k:"roas",label:"ROAS",r:true,render:p=>fX(p.roas)},
  ];

  const medianUsd=fUsd(m.brandRevMedian);

  return(
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:12}} className="fade">
        <Kpi icon="ti-currency-dollar" label="Revenue"    value={fUsd(m.totalRevenue)} sub={`${fNum(m.totalUnits)} units`} mono/>
        <Kpi icon="ti-percent"         label="Avg Margin" value={fPct(m.avgMargin)} sub={`${m.negMargin} negative`} bad={m.negMargin>0}/>
        <Kpi icon="ti-eye"             label="Sessions"   value={fNum(m.totalSessions)} sub="Total traffic" mono/>
        <Kpi icon="ti-shopping-cart"   label="ATC Rate"   value={fPct(m.atcRate)} ok={m.atcRate>=.1} bad={m.atcRate>0&&m.atcRate<.05} sub="Add to cart"/>
        <Kpi icon="ti-receipt"         label="Conv Rate"  value={fPct(m.convRate)} ok={m.convRate>=.03} bad={m.convRate>0&&m.convRate<.01} sub="Session→Purchase"/>
        <Kpi icon="ti-ad-2"            label="Total ROAS" value={fX(m.totalROAS)} ok={m.totalROAS>=3} bad={m.totalROAS>0&&m.totalROAS<1} sub={`${fUsd(m.totalAdSpend)} spent`} mono/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:0}}>
        <Card title="Overall Funnel" icon="ti-funnel" sub="Sessions → ATC → Checkout → Purchase">
          <FunnelViz sessions={m.totalSessions} atc={m.totalATC} checkout={m.totalCheckout} units={m.totalUnits}/>
        </Card>
        <FunnelLeakTable title="Traffic → ATC Leaks"
          tooltip={`Sessions ≥ 10, sort: Sessions DESC\nRate = ATC / Sessions\n🔴 <5%  🟡 5–15%  🟢 >15%`}
          items={m.funnelTrafficATC} col1="sessions" col1label="Sess" rateKey="atcRate" rateLabel="ATC%" low={0.05} mid={0.15}/>
        <FunnelLeakTable title="ATC → Checkout Leaks"
          tooltip={`ATC ≥ 3, sort: ATC DESC\nRate = Checkout / ATC\n🔴 <40%  🟡 40–70%  🟢 >70%`}
          items={m.funnelATCCheckout} col1="atc" col1label="ATC" rateKey="checkoutRate" rateLabel="Chk%" low={0.40} mid={0.70}/>
      </div>

      <FunnelLeakTable title="Checkout → Purchase Leaks"
        tooltip={`Checkout ≥ 2, sort: Checkout DESC\nRate = Purchased / Checkout\n🔴 <50%  🟡 50–80%  🟢 >80%`}
        items={m.funnelCheckoutPurchase} col1="checkout" col1label="Chk" rateKey="purchaseRate" rateLabel="Pur%" low={0.50} mid={0.80}/>

      <Card title="Brand Performance — Top 10" icon="ti-building-store"
        tooltip={`Sort: Revenue DESC\nMedian revenue (brands with sales): ${medianUsd}\n⭐ Star: Rev ≥ ${medianUsd} AND Margin ≥ 35%\n💰 Cash Cow: Rev ≥ ${medianUsd} AND Margin < 35%\n💎 Hidden Gem: Rev < ${medianUsd} AND Margin ≥ 35%\n⚠️ At Risk: Rev < ${medianUsd} AND Margin < 35%`}>
        <Tbl max={10} cols={brandCols} rows={m.brandList}/>
        {m.allBrands.length>10&&(
          <button onClick={()=>setShowBrandModal(true)} style={{marginTop:10,fontSize:11,color:T.blue,background:"none",border:`1px solid ${T.blue}33`,borderRadius:6,padding:"3px 10px",cursor:"pointer",fontFamily:FONT}}>
            +{m.allBrands.length-10} more brands
          </button>
        )}
      </Card>
      {showBrandModal&&<SearchModal title="All Brands" color={T.blue} allItems={m.allBrands} cols={brandCols} onClose={()=>setShowBrandModal(false)}/>}

      <Card title="Top Products — Revenue" icon="ti-trophy" tooltip={`Sort: Revenue DESC, Top 10\nConv Rate = GA4-Purchased / GA4-Sessions`}>
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          <SubTab label="By SKU" active={prodView==="sku"} onClick={()=>setProdView("sku")}/>
          <SubTab label="By Product Name" active={prodView==="product"} onClick={()=>setProdView("product")}/>
        </div>
        <Tbl max={10} cols={prodCols} rows={products}/>
      </Card>
    </>
  );
};

// ── TAB: ADS ──────────────────────────────────────────────────────────────────
const TabAds=({m})=>{
  const [channel,setChannel]=useState("gg");
  const ch=channel;

  const ggGood=[...m.skuList].filter(p=>p.ggSpend>0&&p.beRoas&&p.ggRoas>=p.beRoas&&p.unitsGG>=1&&p.sessionsGG>=10).sort((a,b)=>b.revenueGG-a.revenueGG).slice(0,10);
  const fbGood=[...m.skuList].filter(p=>p.fbSpend>0&&p.beRoas&&p.fbRoas>=p.beRoas&&p.unitsFB>=1&&p.sessionsFB>=10).sort((a,b)=>b.revenueFB-a.revenueFB).slice(0,10);
  const ggWasted=[...m.skuList].filter(p=>p.ggSpend>0&&p.beRoas&&p.ggRoas<p.beRoas&&p.sessionsGG>=10).sort((a,b)=>b.ggSpend-a.ggSpend).slice(0,10);
  const fbWasted=[...m.skuList].filter(p=>p.fbSpend>0&&p.beRoas&&p.fbRoas<p.beRoas&&p.sessionsFB>=10).sort((a,b)=>b.fbSpend-a.fbSpend).slice(0,10);
  const ggScale=[...m.skuList].filter(p=>p.ggSpend>0&&p.beRoas&&p.ggRoas>=p.beRoas&&p.sessionsGG>=10&&p.unitsGG>=1&&p.stock>5&&(p.margin||0)>=0.35).sort((a,b)=>b.ggRoas-a.ggRoas).slice(0,10);
  const fbScale=[...m.skuList].filter(p=>p.fbSpend>0&&p.beRoas&&p.fbRoas>=p.beRoas&&p.sessionsFB>=10&&p.unitsFB>=1&&p.stock>5&&(p.margin||0)>=0.35).sort((a,b)=>b.fbRoas-a.fbRoas).slice(0,10);

  const chanSwitch=(<div style={{display:"flex",gap:6,marginBottom:10}}><SubTab label="Google Ads" active={ch==="gg"} onClick={()=>setChannel("gg")}/><SubTab label="Facebook Ads" active={ch==="fb"} onClick={()=>setChannel("fb")}/></div>);

  const adsCols=[
    {k:"name",label:"Product",wrap:true},
    {k:"spend",label:"Spend",r:true,render:p=>fUsd(ch==="gg"?p.ggSpend:p.fbSpend)},
    {k:"revGA4",label:"Rev (GA4)",r:true,render:p=>fUsd(ch==="gg"?p.revenueGG:p.revenueFB)},
    {k:"roasGA4",label:"ROAS (GA4)",r:true,render:p=>fX(ch==="gg"?p.ggRoas:p.fbRoas)},
    {k:"roasPlat",label:"ROAS (Plat)",r:true,render:p=>ch==="gg"?fX(p.ggRoasPlat):<span style={{color:T.text2}}>—</span>},
    {k:"beRoas",label:"BE ROAS",r:true,render:p=>fX(p.beRoas)},
    {k:"purch",label:"Purch (GA4)",r:true,render:p=>fNum(ch==="gg"?p.unitsGG:p.unitsFB)},
    {k:"conv",label:"Conv (Plat)",r:true,render:p=>ch==="gg"?fNum(p.ggConv):<span style={{color:T.text2}}>—</span>},
    {k:"cpaGA4",label:"CPA (GA4)",r:true,render:p=>fUsd(ch==="gg"?p.ggCpa:p.fbCpa)},
    {k:"cpaPlat",label:"CPA (Plat)",r:true,render:p=>ch==="gg"?fUsd(p.ggCpaPlat):<span style={{color:T.text2}}>—</span>},
    {k:"sessions",label:"Sessions",r:true,render:p=>fNum(ch==="gg"?p.sessionsGG:p.sessionsFB)},
    {k:"clicks",label:"Clicks",r:true,render:p=>fNum(ch==="gg"?p.ggClick:p.fbClicks)},
    {k:"imp",label:"Imp",r:true,render:p=>fNum(ch==="gg"?p.ggImp:p.fbImp)},
    {k:"ctr",label:"CTR",r:true,render:p=>fPct(ch==="gg"?p.ggCtr:p.fbCtr)},
    {k:"cr",label:"Conv Rate",r:true,render:p=>fPct(ch==="gg"?p.ggConvRate:p.fbConvRate)},
    {k:"crPlat",label:"CR (Plat)",r:true,render:p=>ch==="gg"?fPct(p.ggCrPlat):<span style={{color:T.text2}}>—</span>},
  ];

  const ggROAS=m.totalGGSpend>0?m.totalRevenueGG/m.totalGGSpend:null;
  const fbROAS=m.totalFBSpend>0?m.totalRevenueFB/m.totalFBSpend:null;
  const ggCPA=m.totalUnitsGG>0?m.totalGGSpend/m.totalUnitsGG:null;
  const fbCPA=m.totalUnitsFB>0?m.totalFBSpend/m.totalUnitsFB:null;
  const ggCTR=m.totalGGImp>0?m.totalGGClick/m.totalGGImp:null;
  const fbCTR=m.totalFBImp>0?m.totalFBClicks/m.totalFBImp:null;
  const ggROASP=m.totalGGSpend>0?m.totalGGValue/m.totalGGSpend:null;
  const ggCPAP=m.totalGGConv>0?m.totalGGSpend/m.totalGGConv:null;
  const ggCRP=m.totalSessionsGG>0?m.totalGGConv/m.totalSessionsGG:null;
  const ggCRGA4=m.totalSessionsGG>0?m.totalUnitsGG/m.totalSessionsGG:null;
  const fbCRGA4=m.totalSessionsFB>0?m.totalUnitsFB/m.totalSessionsFB:null;

  return(
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:8}} className="fade">
        <Kpi icon="ti-currency-dollar" label="Total Ad Spend"   value={fUsd(m.totalAdSpend)} mono/>
        <Kpi icon="ti-cash"            label="Total Ad Revenue" value={fUsd(m.totalAdRevenue)} mono/>
        <Kpi icon="ti-ad-2"            label="Total ROAS"       value={fX(m.totalROAS)} ok={m.totalROAS>=3} bad={m.totalROAS>0&&m.totalROAS<1} mono/>
        <Kpi icon="ti-users"           label="Total Purchases"  value={fNum(m.totalAdUnits)} sub="GG + FB" mono/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
        <Kpi icon="ti-receipt"          label="Total CPA"         value={fUsd(m.totalCPA)} mono/>
        <Kpi icon="ti-mouse"            label="Total Clicks"      value={fNum(m.totalGGClick+m.totalFBClicks)} mono/>
        <Kpi icon="ti-eye"              label="Total Impressions" value={fNum(m.totalGGImp+m.totalFBImp)} mono/>
        <Kpi icon="ti-device-analytics" label="Ad Sessions"       value={fNum(m.totalSessionsGG+m.totalSessionsFB)} mono/>
      </div>
      <Card title="Channel Comparison" icon="ti-chart-bar">
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>
              <th style={{padding:"6px 10px",color:T.text2,textAlign:"left",borderBottom:`1px solid ${T.line1}`}}>Metric</th>
              <th style={{padding:"6px 10px",color:T.cyan,textAlign:"right",borderBottom:`1px solid ${T.line1}`}}>GG (GA4)</th>
              <th style={{padding:"6px 10px",color:T.blue,textAlign:"right",borderBottom:`1px solid ${T.line1}`}}>GG (Platform)</th>
              <th style={{padding:"6px 10px",color:T.orange,textAlign:"right",borderBottom:`1px solid ${T.line1}`}}>FB (GA4)</th>
              <th style={{padding:"6px 10px",color:T.purple,textAlign:"right",borderBottom:`1px solid ${T.line1}`}}>FB (Platform)</th>
            </tr></thead>
            <tbody>
              {[["Spend",fUsd(m.totalGGSpend),fUsd(m.totalGGSpend),fUsd(m.totalFBSpend),fUsd(m.totalFBSpend)],
                ["Revenue",fUsd(m.totalRevenueGG),fUsd(m.totalGGValue),fUsd(m.totalRevenueFB),"— soon"],
                ["ROAS",fX(ggROAS),fX(ggROASP),fX(fbROAS),"— soon"],
                ["Purchases",fNum(m.totalUnitsGG),fNum(m.totalGGConv),fNum(m.totalUnitsFB),"— soon"],
                ["CPA",fUsd(ggCPA),fUsd(ggCPAP),fUsd(fbCPA),"— soon"],
                ["Sessions",fNum(m.totalSessionsGG),"—",fNum(m.totalSessionsFB),"—"],
                ["Clicks",fNum(m.totalGGClick),fNum(m.totalGGClick),"—",fNum(m.totalFBClicks)],
                ["Impressions",fNum(m.totalGGImp),fNum(m.totalGGImp),"—",fNum(m.totalFBImp)],
                ["CTR","—",fPct(ggCTR),"—",fPct(fbCTR)],
                ["Conv Rate",fPct(ggCRGA4),fPct(ggCRP),fPct(fbCRGA4),"— soon"],
              ].map(([label,v1,v2,v3,v4],i)=>(
                <tr key={i} className="row-hover" style={{background:i%2===0?"transparent":T.bg2+"88"}}>
                  <td style={{padding:"7px 10px",borderBottom:`1px solid ${T.line1}`,color:T.text2,fontWeight:500}}>{label}</td>
                  {[v1,v2,v3,v4].map((v,j)=>(<td key={j} style={{padding:"7px 10px",borderBottom:`1px solid ${T.line1}`,textAlign:"right",color:v==="—"||v.includes?.("soon")?T.text2:T.text0,fontFamily:MONO,fontSize:12}}>{v}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Top Products — Good Ads Performance" icon="ti-trophy"
        tooltip={`Condition: Spend > 0, ROAS ≥ BE ROAS, Purchases ≥ 1, Sessions ≥ 10\nSort: Revenue DESC`}>
        {chanSwitch}
        <Tbl max={10} cols={adsCols} rows={ch==="gg"?ggGood:fbGood}/>
      </Card>
      <Card title="Wasted Spend" icon="ti-flame"
        tooltip={`Spend > 0\nROAS < Break-even ROAS (1/Margin)\nSessions ≥ 10\nSort: Spend DESC`}>
        {chanSwitch}
        <Tbl max={10} cols={[
          {k:"name",label:"Product",wrap:true},
          {k:"spend",label:"Spend",r:true,render:p=>fUsd(ch==="gg"?p.ggSpend:p.fbSpend)},
          {k:"revenue",label:"Revenue",r:true,render:p=>fUsd(ch==="gg"?p.revenueGG:p.revenueFB)},
          {k:"roas",label:"ROAS",r:true,render:p=><span style={{color:T.red}}>{fX(ch==="gg"?p.ggRoas:p.fbRoas)}</span>},
          {k:"beRoas",label:"BE ROAS",r:true,render:p=>fX(p.beRoas)},
          {k:"units",label:"Purch",r:true,render:p=>fNum(ch==="gg"?p.unitsGG:p.unitsFB)},
          {k:"cpa",label:"CPA",r:true,render:p=>fUsd(ch==="gg"?p.ggCpa:p.fbCpa)},
          {k:"sessions",label:"Sessions",r:true,render:p=>fNum(ch==="gg"?p.sessionsGG:p.sessionsFB)},
          {k:"margin",label:"Margin",r:true,render:p=>fPct(p.margin)},
        ]} rows={ch==="gg"?ggWasted:fbWasted}/>
      </Card>
      <Card title="Scale Up Candidates" icon="ti-rocket"
        tooltip={`Spend > 0\nROAS ≥ Break-even ROAS\nSessions ≥ 10\nPurchases ≥ 1\nStock > 5\nMargin ≥ 35%\nSort: ROAS DESC`}>
        {chanSwitch}
        <Tbl max={10} cols={[
          {k:"name",label:"Product",wrap:true},
          {k:"spend",label:"Spend",r:true,render:p=>fUsd(ch==="gg"?p.ggSpend:p.fbSpend)},
          {k:"revenue",label:"Revenue",r:true,render:p=>fUsd(ch==="gg"?p.revenueGG:p.revenueFB)},
          {k:"roas",label:"ROAS",r:true,render:p=><span style={{color:T.green}}>{fX(ch==="gg"?p.ggRoas:p.fbRoas)}</span>},
          {k:"beRoas",label:"BE ROAS",r:true,render:p=>fX(p.beRoas)},
          {k:"units",label:"Purch",r:true,render:p=>fNum(ch==="gg"?p.unitsGG:p.unitsFB)},
          {k:"sessions",label:"Sessions",r:true,render:p=>fNum(ch==="gg"?p.sessionsGG:p.sessionsFB)},
          {k:"stock",label:"Stock",r:true,render:p=>fNum(p.stock)},
          {k:"margin",label:"Margin",r:true,render:p=>fPct(p.margin)},
        ]} rows={ch==="gg"?ggScale:fbScale}/>
      </Card>
    </>
  );
};

// ── TAB: HEALTH ───────────────────────────────────────────────────────────────
const TabHealth=({m})=>{
  const slowMoving=[...m.skuList].filter(p=>p.stock>20&&p.units<2).sort((a,b)=>b.stock*b.cost-a.stock*a.cost).slice(0,10);
  const noConvert=[...m.skuList].filter(p=>p.ggSpend>0&&p.beRoas&&p.ggRoas<p.beRoas&&p.sessionsGG>=10).sort((a,b)=>b.ggSpend-a.ggSpend);
  const zeroRevenue=[...m.skuList].filter(p=>p.sessions>=30&&p.units===0&&p.revenue===0).sort((a,b)=>b.sessions-a.sessions);
  const section3=[...noConvert,...zeroRevenue].filter((p,i,arr)=>arr.findIndex(x=>x.sku===p.sku)===i).slice(0,10);
  const scaleUp=[...m.skuList].filter(p=>p.adSpend>0&&p.beRoas&&p.roas>=p.beRoas&&p.sessions>=50&&p.units>=2&&p.stock>5&&(p.margin||0)>=0.35).sort((a,b)=>b.roas-a.roas).slice(0,10);

  const quad={star:[],cashcow:[],gem:[],risk:[],nosales:[]};
  m.skuList.forEach(p=>quad[m.quadrant(p)].push(p));

  const medianUsd=fUsd(m.revMedian);

  return(
    <>
      <Card title="Product Health Matrix" icon="ti-layout-grid"
        sub="Revenue vs Margin — median of products with sales"
        tooltip={`Revenue threshold (median of SKUs with revenue > 0): ${medianUsd}\nMargin threshold: 35%\n\n⭐ Star: Rev ≥ ${medianUsd} AND Margin ≥ 35%\n💰 Cash Cow: Rev ≥ ${medianUsd} AND Margin < 35%\n💎 Hidden Gem: 0 < Rev < ${medianUsd} AND Margin ≥ 35%\n⚠️ At Risk: 0 < Rev < ${medianUsd} AND Margin < 35%\n🚫 No Sales Yet: Revenue = 0`}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <QuadCard label="star"    count={quad.star.length}    items={quad.star}/>
          <QuadCard label="cashcow" count={quad.cashcow.length} items={quad.cashcow}/>
          <QuadCard label="gem"     count={quad.gem.length}     items={quad.gem}/>
          <QuadCard label="risk"    count={quad.risk.length}    items={quad.risk}/>
        </div>
        <QuadCard label="nosales" count={quad.nosales.length} items={quad.nosales}/>
      </Card>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Card title="Slow Moving Inventory" icon="ti-package" tooltip={`Stock > 20 AND Units sold < 2\nSort: Stock Value DESC`}>
          <Tbl max={10} cols={[
            {k:"name",label:"Product",wrap:true},
            {k:"stock",label:"Stock",r:true,render:p=><span style={{color:T.orange}}>{fNum(p.stock)}</span>},
            {k:"units",label:"Units",r:true,render:p=>fNum(p.units)},
            {k:"stockVal",label:"Stock Value",r:true,render:p=>fUsd(p.stock*p.cost)},
            {k:"margin",label:"Margin",r:true,render:p=>fPct(p.margin)},
          ]} rows={slowMoving}/>
        </Card>
        <Card title="Scale Up Candidates" icon="ti-rocket" tooltip={`ROAS ≥ BE ROAS\nSessions ≥ 50\nUnits ≥ 2\nStock > 5\nMargin ≥ 35%\nSort: ROAS DESC`}>
          <Tbl max={10} cols={[
            {k:"name",label:"Product",wrap:true},
            {k:"stock",label:"Stock",r:true,render:p=>fNum(p.stock)},
            {k:"sessions",label:"Sessions",r:true,render:p=>fNum(p.sessions)},
            {k:"revenue",label:"Revenue",r:true,render:p=>fUsd(p.revenue)},
            {k:"units",label:"Units",r:true,render:p=>fNum(p.units)},
            {k:"margin",label:"Margin",r:true,render:p=>fPct(p.margin)},
            {k:"roas",label:"ROAS",r:true,render:p=><span style={{color:T.green}}>{fX(p.roas)}</span>},
            {k:"beRoas",label:"BE ROAS",r:true,render:p=>fX(p.beRoas)},
          ]} rows={scaleUp}/>
        </Card>
      </div>

      <Card title="Ads Not Converting + High Traffic Zero Revenue" icon="ti-alert-circle"
        tooltip={`Group 1: GG Spend > 0 AND ROAS < BE ROAS AND Sessions-GG ≥ 10\nGroup 2: Sessions ≥ 30 AND Purchases = 0 AND Revenue = 0\nSort: Spend DESC`}>
        <Tbl max={10} cols={[
          {k:"name",label:"Product",wrap:true},
          {k:"stock",label:"Stock",r:true,render:p=><span style={{color:p.stock<=0?T.red:p.stock<5?T.orange:T.text0}}>{fNum(p.stock)}</span>},
          {k:"sessions",label:"Sessions",r:true,render:p=>fNum(p.sessions)},
          {k:"revenue",label:"Revenue",r:true,render:p=>fUsd(p.revenue)},
          {k:"units",label:"Purch",r:true,render:p=>fNum(p.units)},
          {k:"adSpend",label:"Ad Cost",r:true,render:p=>fUsd(p.adSpend)},
          {k:"cpa",label:"CPA",r:true,render:p=>fUsd(p.cpa)},
          {k:"beRoas",label:"BE ROAS",r:true,render:p=>fX(p.beRoas)},
          {k:"roas",label:"ROAS",r:true,render:p=><span style={{color:T.red}}>{fX(p.roas)}</span>},
          {k:"margin",label:"Margin",r:true,render:p=>fPct(p.margin)},
          {k:"action",label:"Action",render:p=>{const a=getAction(p);return <span style={{fontSize:11,color:a.color}}>{a.icon} {a.text}</span>;}},
        ]} rows={section3}/>
      </Card>
    </>
  );
};

// ── TAB: INVENTORY ────────────────────────────────────────────────────────────
const TabInventory=({m,range})=>{
  const [showStockModal,setShowStockModal]=useState(false);
  const now=new Date();
  const days=range==="MTD"?now.getDate():range==="Last 30D"?30:range==="Last Month"?30:Math.floor((now-new Date(now.getFullYear(),0,1))/86400000);
  const inStock=m.skuList.filter(p=>p.stock>0).length;
  const outStock=m.skuList.filter(p=>p.stock<=0).length;
  const lowStock=m.skuList.filter(p=>p.stock>0&&p.stock<=5).length;
  const totalStockVal=m.skuList.reduce((s,p)=>s+p.stock*p.cost,0);
  const outItems=[...m.skuList].filter(p=>p.stock<=0).sort((a,b)=>b.revenue-a.revenue);
  const lowItems=[...m.skuList].filter(p=>p.stock>0&&p.stock<=5).sort((a,b)=>b.revenue-a.revenue);
  const healthyItems=[...m.skuList].filter(p=>p.stock>5).sort((a,b)=>b.revenue-a.revenue);
  const slowItems=[...m.skuList].filter(p=>p.stock>20&&p.units<2).sort((a,b)=>b.stock*b.cost-a.stock*a.cost);
  const stockVsSales=[...m.skuList].sort((a,b)=>b.stock*b.cost-a.stock*a.cost);

  const DaysBadge=({p})=>{
    if(p.stock<=0) return <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:T.red+"22",color:T.red,fontWeight:600}}>Out</span>;
    if(p.units===0) return <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:T.red+"22",color:T.red,fontWeight:600}}>No sales</span>;
    const d=Math.round(p.stock/(p.units/days));
    const color=d<14?T.red:d<30?T.orange:T.green;
    return <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:color+"22",color,fontWeight:600}}>{d}d</span>;
  };

  const stockVsCols=[
    {k:"name",label:"Product",wrap:true},
    {k:"stock",label:"Stock",r:true,render:p=><span style={{color:p.stock<=0?T.red:p.stock<=5?T.orange:T.text0}}>{fNum(p.stock)}</span>},
    {k:"units",label:"Units Sold",r:true,render:p=>fNum(p.units)},
    {k:"stockVal",label:"Stock Value",r:true,render:p=>fUsd(p.stock*p.cost)},
    {k:"revenue",label:"Revenue",r:true,render:p=><span style={{color:p.revenue===0?T.red+"cc":T.text0}}>{fUsd(p.revenue)}</span>},
    {k:"days",label:`Days (${days}d)`,r:true,render:p=><DaysBadge p={p}/>},
    {k:"margin",label:"Margin",r:true,render:p=>fPct(p.margin)},
  ];

  return(
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:12}} className="fade">
        <Kpi icon="ti-packages"        label="Total SKUs"       value={fNum(m.skuList.length)} mono/>
        <Kpi icon="ti-circle-check"    label="In Stock"         value={fNum(inStock)} ok sub={`${fPct(inStock/m.skuList.length)} of catalog`} mono/>
        <Kpi icon="ti-circle-x"        label="Out of Stock"     value={fNum(outStock)} bad={outStock>0} sub="Losing sales" mono/>
        <Kpi icon="ti-alert-triangle"  label="Low Stock (≤5)"   value={fNum(lowStock)} bad={lowStock>0} sub="Restock soon" mono/>
        <Kpi icon="ti-currency-dollar" label="Total Stock Value" value={fUsd(totalStockVal)} sub="Stock × Cost" mono/>
      </div>

      <Card title="Stock Health Breakdown" icon="ti-heart-rate"
        tooltip={`🔴 Out of Stock: sort by Revenue DESC\n🟡 Low Stock (0-5): sort by Revenue DESC\n🟢 Healthy (>5): sort by Revenue DESC\n⚫ Slow Moving (Stock>20, Units<2): sort by Stock Value DESC`}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <StockCard label="🔴 Out of Stock" color={T.red}    count={outItems.length}   items={outItems}/>
          <StockCard label="🟡 Low Stock"    color={T.yellow} count={lowItems.length}   items={lowItems}/>
          <StockCard label="🟢 Healthy"      color={T.green}  count={healthyItems.length} items={healthyItems}/>
          <StockCard label="⚫ Slow Moving"  color={T.text2}  count={slowItems.length}  items={slowItems}/>
        </div>
      </Card>

      <Card title="Stock vs Sales" icon="ti-arrows-exchange"
        tooltip={`Days of Stock = Stock / (Units / ${days} days)\nSort: Stock Value DESC`}>
        <Tbl max={20} cols={stockVsCols} rows={stockVsSales}/>
        {stockVsSales.length>20&&(
          <button onClick={()=>setShowStockModal(true)} style={{marginTop:10,fontSize:11,color:T.blue,background:"none",border:`1px solid ${T.blue}33`,borderRadius:6,padding:"3px 10px",cursor:"pointer",fontFamily:FONT}}>
            +{stockVsSales.length-20} more
          </button>
        )}
      </Card>
      {showStockModal&&<SearchModal title="Stock vs Sales" color={T.blue} allItems={stockVsSales} cols={stockVsCols} onClose={()=>setShowStockModal(false)}/>}
    </>
  );
};

// ── MAIN ──────────────────────────────────────────────────────────────────────
const TABS=[{k:"performance",label:"Performance",icon:"ti-chart-line"},{k:"ads",label:"Ads",icon:"ti-ad-2"},{k:"health",label:"Product Health",icon:"ti-heart-rate"},{k:"inventory",label:"Inventory",icon:"ti-package"}];
const RANGES=["MTD","Last 30D","Last Month","YTD"];

export default function App() {
  const [authed,setAuthed]=useState(!!localStorage.getItem("rc_authed"));
  const [hasUrl,setHasUrl]=useState(!!localStorage.getItem("rc_apps_script_url"));
  const [metrics,setMetrics]=useState(null);
  const [tab,setTab]=useState("performance");
  const [range,setRange]=useState("MTD");
  const [syncing,setSyncing]=useState(false);
  const [lastSync,setLastSync]=useState(null);
  const timerRef=useRef(null);

  const handleAuth=()=>{localStorage.setItem("rc_authed","1");setAuthed(true);};
  const handleLoad=useCallback((url,text)=>{
    try{
      let rows=[];
      try{const json=JSON.parse(text);if(json.error){console.error(json.error);return;}if(json.rows&&Array.isArray(json.rows))rows=json.rows;}catch(e){rows=parseCSV(text);}
      if(!rows.length) return;
      const cols=detectCols(Object.keys(rows[0]));
      setMetrics(compute(rows,cols));
      setLastSync(new Date());
    }catch(e){console.error("Parse error:",e);}
    setHasUrl(true);
  },[]);

  const refresh=useCallback(async()=>{
    const url=localStorage.getItem("rc_apps_script_url");
    if(!url) return;
    setSyncing(true);
    try{const rp=range==="MTD"?"mtd":range==="Last 30D"?"last30":range==="Last Month"?"lastmonth":"ytd";const res=await fetch(`${url}?range=${rp}`);const text=await res.text();handleLoad(url,text);}catch(e){console.error(e);}
    setSyncing(false);
  },[handleLoad,range]);

  useEffect(()=>{if(authed&&hasUrl&&!metrics)refresh();},[authed,hasUrl,metrics,refresh]);
  useEffect(()=>{if(!authed||!hasUrl)return;timerRef.current=setInterval(refresh,30000);return()=>clearInterval(timerRef.current);},[authed,hasUrl,refresh]);

  if(!authed) return <PasswordScreen onAuth={handleAuth}/>;
  if(!hasUrl) return <SetupScreen onLoad={handleLoad}/>;

  return(
    <>
      <style>{css}</style>
      <div style={{maxWidth:1400,margin:"0 auto",padding:"20px 16px",minHeight:"100vh"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:T.text0,letterSpacing:"-.02em"}}>RC Performance Dashboard</div>
            <div style={{fontSize:11,color:T.text2}}>{lastSync?`Last sync ${lastSync.toLocaleTimeString()}`:"Loading..."}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",gap:4}}>
              {RANGES.map(r=>{const av=r==="MTD";return(<button key={r} onClick={()=>av&&setRange(r)} style={{padding:"5px 12px",fontSize:11,fontFamily:FONT,borderRadius:6,cursor:av?"pointer":"not-allowed",border:`1px solid ${range===r?T.blue:T.line1}`,background:range===r?T.blue+"22":"transparent",color:range===r?T.blue:T.text2,opacity:av?1:0.35,transition:"all .15s"}}>{r}{!av?" 🔒":""}</button>);})}
            </div>
            <button onClick={refresh} disabled={syncing} style={{padding:"5px 12px",fontSize:11,fontFamily:FONT,borderRadius:6,border:`1px solid ${T.line1}`,background:"transparent",color:T.text2,cursor:"pointer"}}><i className={`ti ${syncing?"ti-loader-2":"ti-refresh"}`} style={{fontSize:13}}/></button>
            <button onClick={()=>{localStorage.removeItem("rc_apps_script_url");setHasUrl(false);setMetrics(null);clearInterval(timerRef.current);}} style={{padding:"5px 10px",fontSize:11,fontFamily:FONT,borderRadius:6,border:`1px solid ${T.line1}`,background:"transparent",color:T.text2,cursor:"pointer"}}>Change Sheet</button>
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
          {TABS.map(t=><NavTab key={t.k} label={t.label} icon={t.icon} active={tab===t.k} onClick={()=>setTab(t.k)}/>)}
        </div>
        {!metrics?(
          <div style={{textAlign:"center",padding:"4rem",color:T.text2}}>
            <i className="ti ti-loader-2" style={{fontSize:32,display:"block",marginBottom:8,opacity:.4}}/><div>Loading data...</div>
          </div>
        ):(
          <div className="fade">
            {tab==="performance"&&<TabPerformance m={metrics}/>}
            {tab==="ads"&&<TabAds m={metrics}/>}
            {tab==="health"&&<TabHealth m={metrics}/>}
            {tab==="inventory"&&<TabInventory m={metrics} range={range}/>}
          </div>
        )}
      </div>
    </>
  );
}
