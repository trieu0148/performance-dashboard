import React, { useState, useEffect, useRef, useCallback } from "react";

// ── Theme ─────────────────────────────────────────────────────────────────────
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

// ── Password ──────────────────────────────────────────────────────────────────
const PASSWORD = "car2026";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fUsd  = v => v == null ? "—" : v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${v.toFixed(2)}`;
const fNum  = v => v == null ? "—" : v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(Math.round(v));
const fPct  = v => v == null ? "—" : `${(v*100).toFixed(1)}%`;
const fX    = v => v == null ? "—" : `${v.toFixed(2)}x`;
const n     = v => { if (v == null) return 0; const s = String(v).replace(/[$,%]/g,"").trim(); const p = parseFloat(s); return isNaN(p) ? 0 : p; };
const pct   = v => { if (v == null) return 0; const s = String(v).replace(/[$,%]/g,"").trim(); const p = parseFloat(s); if (isNaN(p)) return 0; return p > 1 ? p/100 : p; };

// ── Parse Numbers file (tab-separated from Apps Script) ──────────────────────
function parseCSV(text) {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split("\t").map(h => h.trim().replace(/^"|"$/g,""));
  return lines.slice(1).map(line => {
    const vals = line.split("\t").map(v => v.trim().replace(/^"|"$/g,""));
    const obj = {};
    headers.forEach((h,i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
}

// ── Column Detection ──────────────────────────────────────────────────────────
function detectCols(headers) {
  const lc = s => s.toLowerCase();
  const exact = key => headers.find(h => lc(h) === lc(key)) || null;
  const contains = (...keys) => headers.find(h => keys.some(k => lc(h).includes(lc(k)))) || null;

  return {
    sku:           exact("SKU"),
    name:          exact("Product Name"),
    brand:         exact("Brand"),
    type:          exact("Type"),
    stock:         exact("Stock"),
    cost:          exact("Cost"),
    price:         exact("MAP Price"),
    margin:        exact("Margin"),
    // GA4 total
    sessions:      exact("GA4-Sessions"),
    revenue:       exact("GA4-Item revenue"),
    units:         exact("GA4-Items purchased"),
    atc:           exact("GA4-Items added to cart"),
    checkout:      exact("GA4-Items checked out"),
    // GA4 by channel
    sessionsGG:    exact("GA4-Sessions-Google Ads"),
    unitsGG:       exact("GA4-Items purchased-Google Ads"),
    revenueGG:     exact("GA4-Item revenue-Google Ads"),
    sessionsFB:    exact("GA4-Sessions-Facebook ads"),
    unitsFB:       exact("GA4-Items purchased-Facebook Ads"),
    revenueFB:     exact("GA4-Item revenue-Facebook Ads"),
    // Google Ads platform
    ggSpend:       exact("Google Ads-Amount spent"),
    ggConv:        exact("Google Ads-Conv"),
    ggValue:       exact("Google Ads-Value"),
    ggClick:       exact("Google Ads-Click"),
    ggImp:         exact("Google Ads-Imp"),
    ggRoas:        exact("Google Ads-ROAS"),
    ggCr:          exact("Google Ads-CR"),
    // Facebook Ads platform
    fbSpend:       exact("Facebook Ads-Amount spent"),
    fbClicks:      exact("Facebook Ads-Link clicks"),
    fbImp:         exact("Facebook Ads-Impressions"),
    // FB platform extras (coming soon)
    fbRevenue:     exact("Facebook Ads-Revenue") || exact("Facebook Ads-Value"),
    fbConv:        exact("Facebook Ads-Purchases") || exact("Facebook Ads-Conv"),
    fbRoas:        exact("Facebook Ads-ROAS"),
    fbCr:          exact("Facebook Ads-CR"),
  };
}

// ── Compute All Metrics ───────────────────────────────────────────────────────
function compute(rows, cols) {
  const valid = rows.filter(r => r[cols.sku] && r[cols.sku] !== "" && r[cols.sku] !== "#REF!" && r[cols.sku] !== "SKU");

  const get    = (r, c) => c ? n(r[c]) : 0;
  const getpct = (r, c) => c ? pct(r[c]) : 0;

  // ── Totals ──
  const totalRevenue   = valid.reduce((s,r) => s + get(r, cols.revenue), 0);
  const totalUnits     = valid.reduce((s,r) => s + get(r, cols.units), 0);
  const totalSessions  = valid.reduce((s,r) => s + get(r, cols.sessions), 0);
  const totalATC       = valid.reduce((s,r) => s + get(r, cols.atc), 0);
  const totalCheckout  = valid.reduce((s,r) => s + get(r, cols.checkout), 0);
  const totalGGSpend   = valid.reduce((s,r) => s + get(r, cols.ggSpend), 0);
  const totalFBSpend   = valid.reduce((s,r) => s + get(r, cols.fbSpend), 0);
  const totalAdSpend   = totalGGSpend + totalFBSpend;
  const totalRevenueGG = valid.reduce((s,r) => s + get(r, cols.revenueGG), 0);
  const totalRevenueFB = valid.reduce((s,r) => s + get(r, cols.revenueFB), 0);
  const totalAdRevenue = totalRevenueGG + totalRevenueFB;
  const totalUnitsGG   = valid.reduce((s,r) => s + get(r, cols.unitsGG), 0);
  const totalUnitsFB   = valid.reduce((s,r) => s + get(r, cols.unitsFB), 0);
  const totalSessionsGG= valid.reduce((s,r) => s + get(r, cols.sessionsGG), 0);
  const totalSessionsFB= valid.reduce((s,r) => s + get(r, cols.sessionsFB), 0);
  const totalGGClick   = valid.reduce((s,r) => s + get(r, cols.ggClick), 0);
  const totalFBClicks  = valid.reduce((s,r) => s + get(r, cols.fbClicks), 0);
  const totalGGImp     = valid.reduce((s,r) => s + get(r, cols.ggImp), 0);
  const totalFBImp     = valid.reduce((s,r) => s + get(r, cols.fbImp), 0);
  const totalGGConv    = valid.reduce((s,r) => s + get(r, cols.ggConv), 0);
  const totalGGValue   = valid.reduce((s,r) => s + get(r, cols.ggValue), 0);

  const margins    = valid.map(r => getpct(r, cols.margin)).filter(v => v > 0 && v <= 1);
  const avgMargin  = margins.length ? margins.reduce((a,b) => a+b,0)/margins.length : null;
  const totalROAS  = totalAdSpend > 0 ? totalAdRevenue / totalAdSpend : null;
  const convRate   = totalSessions > 0 ? totalUnits / totalSessions : null;
  const atcRate    = totalSessions > 0 ? totalATC / totalSessions : null;
  const totalAdUnits = totalUnitsGG + totalUnitsFB;
  const totalCPA   = totalAdUnits > 0 ? totalAdSpend / totalAdUnits : null;

  // ── By SKU ──
  const skuMap = {};
  valid.forEach(r => {
    const k = r[cols.sku];
    if (!skuMap[k]) skuMap[k] = {
      sku: k, name: cols.name ? r[cols.name] : k,
      brand: cols.brand ? r[cols.brand] : "", type: cols.type ? r[cols.type] : "",
      stock: 0, cost: 0, price: 0, margins: [],
      revenue: 0, units: 0, sessions: 0, atc: 0, checkout: 0,
      revenueGG: 0, unitsGG: 0, sessionsGG: 0,
      revenueFB: 0, unitsFB: 0, sessionsFB: 0,
      ggSpend: 0, ggConv: 0, ggValue: 0, ggClick: 0, ggImp: 0,
      fbSpend: 0, fbClicks: 0, fbImp: 0,
    };
    const p = skuMap[k];
    p.revenue    += get(r, cols.revenue);
    p.units      += get(r, cols.units);
    p.sessions   += get(r, cols.sessions);
    p.atc        += get(r, cols.atc);
    p.checkout   += get(r, cols.checkout);
    p.revenueGG  += get(r, cols.revenueGG);
    p.unitsGG    += get(r, cols.unitsGG);
    p.sessionsGG += get(r, cols.sessionsGG);
    p.revenueFB  += get(r, cols.revenueFB);
    p.unitsFB    += get(r, cols.unitsFB);
    p.sessionsFB += get(r, cols.sessionsFB);
    p.ggSpend    += get(r, cols.ggSpend);
    p.ggConv     += get(r, cols.ggConv);
    p.ggValue    += get(r, cols.ggValue);
    p.ggClick    += get(r, cols.ggClick);
    p.ggImp      += get(r, cols.ggImp);
    p.fbSpend    += get(r, cols.fbSpend);
    p.fbClicks   += get(r, cols.fbClicks);
    p.fbImp      += get(r, cols.fbImp);
    p.stock      += get(r, cols.stock);
    p.cost        = get(r, cols.cost) || p.cost;
    p.price       = get(r, cols.price) || p.price;
    const m = getpct(r, cols.margin); if (m > 0 && m <= 1) p.margins.push(m);
  });

  const skuList = Object.values(skuMap).map(p => {
    const margin     = p.margins.length ? p.margins.reduce((a,b)=>a+b,0)/p.margins.length : null;
    const adSpend    = p.ggSpend + p.fbSpend;
    const adRevenue  = p.revenueGG + p.revenueFB;
    const adUnits    = p.unitsGG + p.unitsFB;
    const beRoas     = margin > 0 ? 1/margin : null;
    const roas       = adSpend > 0 ? adRevenue/adSpend : null;
    const cpa        = adUnits > 0 ? adSpend/adUnits : null;
    const ggRoas     = p.ggSpend > 0 ? p.revenueGG/p.ggSpend : null;
    const fbRoas     = p.fbSpend > 0 ? p.revenueFB/p.fbSpend : null;
    const ggCpa      = p.unitsGG > 0 ? p.ggSpend/p.unitsGG : null;
    const fbCpa      = p.unitsFB > 0 ? p.fbSpend/p.unitsFB : null;
    const ggCpaPlat  = p.ggConv > 0 ? p.ggSpend/p.ggConv : null;
    const ggRoasPlat = p.ggSpend > 0 ? p.ggValue/p.ggSpend : null;
    const ggCrPlat   = p.sessionsGG > 0 ? p.ggConv/p.sessionsGG : null;
    const atcRate    = p.sessions > 0 ? p.atc/p.sessions : null;
    const checkRate  = p.atc > 0 ? p.checkout/p.atc : null;
    const convRate   = p.sessions > 0 ? p.units/p.sessions : null;
    const ggConvRate = p.sessionsGG > 0 ? p.unitsGG/p.sessionsGG : null;
    const fbConvRate = p.sessionsFB > 0 ? p.unitsFB/p.sessionsFB : null;
    const ggCtr      = p.ggImp > 0 ? p.ggClick/p.ggImp : null;
    const fbCtr      = p.fbImp > 0 ? p.fbClicks/p.fbImp : null;
    return { ...p, margin, adSpend, adRevenue, adUnits, beRoas, roas, cpa,
      ggRoas, fbRoas, ggCpa, fbCpa, ggCpaPlat, ggRoasPlat, ggCrPlat,
      atcRate, checkRate, convRate, ggConvRate, fbConvRate, ggCtr, fbCtr };
  });

  // ── By Product Name ──
  const nameMap = {};
  skuList.forEach(p => {
    const k = p.name || p.sku;
    if (!nameMap[k]) nameMap[k] = { ...p, skus: [p.sku], margins: [...p.margins] };
    else {
      const b = nameMap[k];
      b.skus.push(p.sku);
      b.revenue += p.revenue; b.units += p.units; b.sessions += p.sessions;
      b.atc += p.atc; b.checkout += p.checkout;
      b.revenueGG += p.revenueGG; b.unitsGG += p.unitsGG; b.sessionsGG += p.sessionsGG;
      b.revenueFB += p.revenueFB; b.unitsFB += p.unitsFB; b.sessionsFB += p.sessionsFB;
      b.ggSpend += p.ggSpend; b.ggConv += p.ggConv; b.ggValue += p.ggValue;
      b.ggClick += p.ggClick; b.ggImp += p.ggImp;
      b.fbSpend += p.fbSpend; b.fbClicks += p.fbClicks; b.fbImp += p.fbImp;
      b.stock += p.stock; b.margins.push(...p.margins);
    }
  });
  const productList = Object.values(nameMap).map(p => {
    const margin    = p.margins.length ? p.margins.reduce((a,b)=>a+b,0)/p.margins.length : null;
    const adSpend   = p.ggSpend + p.fbSpend;
    const adRevenue = p.revenueGG + p.revenueFB;
    const adUnits   = p.unitsGG + p.unitsFB;
    const beRoas    = margin > 0 ? 1/margin : null;
    const roas      = adSpend > 0 ? adRevenue/adSpend : null;
    const cpa       = adUnits > 0 ? adSpend/adUnits : null;
    const atcRate   = p.sessions > 0 ? p.atc/p.sessions : null;
    const convRate  = p.sessions > 0 ? p.units/p.sessions : null;
    const ggRoas    = p.ggSpend > 0 ? p.revenueGG/p.ggSpend : null;
    const fbRoas    = p.fbSpend > 0 ? p.revenueFB/p.fbSpend : null;
    return { ...p, margin, adSpend, adRevenue, adUnits, beRoas, roas, cpa, atcRate, convRate, ggRoas, fbRoas };
  });

  // ── By Brand ──
  const brandMap = {};
  skuList.forEach(p => {
    const k = p.brand || "Unknown";
    if (!brandMap[k]) brandMap[k] = { name: k, skus: 0, revenue: 0, units: 0, sessions: 0, atc: 0,
      revenueGG: 0, revenueFB: 0, ggSpend: 0, fbSpend: 0, unitsGG: 0, unitsFB: 0, margins: [] };
    const b = brandMap[k];
    b.skus++; b.revenue += p.revenue; b.units += p.units; b.sessions += p.sessions; b.atc += p.atc;
    b.revenueGG += p.revenueGG; b.revenueFB += p.revenueFB;
    b.ggSpend += p.ggSpend; b.fbSpend += p.fbSpend;
    b.unitsGG += p.unitsGG; b.unitsFB += p.unitsFB;
    if (p.margin > 0 && p.margin <= 1) b.margins.push(p.margin);
  });
  const brandRevenues = Object.values(brandMap).map(b => b.revenue).filter(v => v > 0).sort((a,b) => a-b);
  const brandRevMedian = brandRevenues[Math.floor(brandRevenues.length/2)] || 0;

  const brandList = Object.values(brandMap).map(b => {
    const margin   = b.margins.length ? b.margins.reduce((a,c)=>a+c,0)/b.margins.length : null;
    const adSpend  = b.ggSpend + b.fbSpend;
    const adRev    = b.revenueGG + b.revenueFB;
    const adUnits  = b.unitsGG + b.unitsFB;
    const roas     = adSpend > 0 ? adRev/adSpend : null;
    const atcRate  = b.sessions > 0 ? b.atc/b.sessions : null;
    const convRate = b.sessions > 0 ? b.units/b.sessions : null;
    const hiRev    = b.revenue >= brandRevMedian;
    const hiMar    = (margin||0) >= 0.35;
    const label    = hiRev && hiMar ? "star" : hiRev && !hiMar ? "cashcow" : !hiRev && hiMar ? "gem" : "risk";
    return { ...b, margin, adSpend, adRev, adUnits, roas, atcRate, convRate, label };
  }).sort((a,b) => b.revenue - a.revenue).slice(0, 10);

  // ── Product Health Quadrant ──
  const revs = skuList.map(p => p.revenue).filter(v => v > 0).sort((a,b) => a-b);
  const revMedian = revs[Math.floor(revs.length/2)] || 0;
  const quadrant = p => {
    const hiRev = p.revenue >= revMedian;
    const hiMar = (p.margin||0) >= 0.35;
    if (hiRev && hiMar)  return "star";
    if (hiRev && !hiMar) return "cashcow";
    if (!hiRev && hiMar) return "gem";
    return "risk";
  };

  // ── Funnel Leaks ──
  const funnelTrafficATC = skuList
    .filter(p => p.sessions >= 10)
    .sort((a,b) => b.sessions - a.sessions)
    .slice(0, 10);

  const funnelATCCheckout = skuList
    .filter(p => p.atc >= 3)
    .map(p => ({ ...p, checkoutRate: p.atc > 0 ? p.checkout/p.atc : null }))
    .sort((a,b) => b.atc - a.atc)
    .slice(0, 10);

  const funnelCheckoutPurchase = skuList
    .filter(p => p.checkout >= 2)
    .map(p => ({ ...p, purchaseRate: p.checkout > 0 ? p.units/p.checkout : null }))
    .sort((a,b) => b.checkout - a.checkout)
    .slice(0, 10);

  // ── Inventory ──
  const hasStock = skuList.some(p => p.stock !== 0);
  const stockProds = [...skuList].sort((a,b) => b.stock - a.stock);

  // ── Negative margin count ──
  const negMargin = valid.filter(r => { const m = getpct(r, cols.margin); return m < 0; }).length;

  return {
    totalRevenue, totalUnits, totalSessions, totalATC, totalCheckout,
    totalGGSpend, totalFBSpend, totalAdSpend,
    totalRevenueGG, totalRevenueFB, totalAdRevenue,
    totalUnitsGG, totalUnitsFB, totalAdUnits,
    totalSessionsGG, totalSessionsFB,
    totalGGClick, totalFBClicks, totalGGImp, totalFBImp,
    totalGGConv, totalGGValue,
    avgMargin, totalROAS, convRate, atcRate, totalCPA,
    negMargin, hasStock,
    skuList, productList, brandList,
    funnelTrafficATC, funnelATCCheckout, funnelCheckoutPurchase,
    stockProds, quadrant, revMedian,
  };
}

// ── UI Components ─────────────────────────────────────────────────────────────
const css = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:${T.bg0};font-family:${FONT};color:${T.text0};min-height:100vh}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:${T.line2};border-radius:2px}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.fade{animation:fadeIn .3s ease both}
.row-hover:hover td{background:${T.bg2}!important}
.tab-btn:hover{border-color:${T.blue}!important;color:${T.text0}!important}
.info-tooltip{position:relative;display:inline-flex;align-items:center}
.info-tooltip .tip{display:none;position:absolute;top:100%;left:0;z-index:99;background:${T.bg3};border:1px solid ${T.line2};border-radius:8px;padding:10px 14px;min-width:260px;font-size:11px;line-height:1.7;color:${T.text1};white-space:pre-line;margin-top:4px}
.info-tooltip:hover .tip{display:block}
`;

const Kpi = ({ icon, label, value, sub, ok, bad, mono }) => (
  <div style={{ background: T.bg2, border: `1px solid ${T.line1}`, borderRadius: 10, padding: "14px 16px" }}>
    <div style={{ fontSize: 11, color: T.text2, display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
      <i className={`ti ${icon}`} style={{ fontSize: 12 }} />{label}
    </div>
    <div style={{ fontSize: 20, fontWeight: 600, color: T.text0, fontFamily: mono ? MONO : FONT, letterSpacing: mono ? "-.02em" : 0 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, marginTop: 3, color: ok ? T.green : bad ? T.red : T.text2 }}>{sub}</div>}
  </div>
);

const Card = ({ title, icon, sub, children, tooltip }) => (
  <div style={{ background: T.bg1, border: `1px solid ${T.line1}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <i className={`ti ${icon}`} style={{ fontSize: 14, color: T.text2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text0, display: "flex", alignItems: "center", gap: 6 }}>
          {title}
          {tooltip && (
            <span className="info-tooltip">
              <i className="ti ti-info-circle" style={{ fontSize: 13, color: T.text2, cursor: "help" }} />
              <span className="tip">{tooltip}</span>
            </span>
          )}
        </div>
        {sub && <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
    {children}
  </div>
);

const HBar = ({ value, max, color = T.blue, h = 6 }) => {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div style={{ flex: 1, height: h, background: T.bg3, borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${w}%`, height: "100%", background: color, borderRadius: 3, transition: "width .5s" }} />
    </div>
  );
};

const Tag = ({ color, children }) => (
  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: color + "22", color, fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>
);

const Empty = ({ icon = "ti-database-off", msg = "No data" }) => (
  <div style={{ textAlign: "center", padding: "2rem", color: T.text2, fontSize: 13 }}>
    <i className={`ti ${icon}`} style={{ fontSize: 28, display: "block", marginBottom: 8, opacity: .4 }} />{msg}
  </div>
);

const NavTab = ({ label, icon, active, onClick }) => (
  <button onClick={onClick} className="tab-btn" style={{
    display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 12, fontFamily: FONT,
    borderRadius: 8, border: `1px solid ${active ? T.blue : T.line1}`, cursor: "pointer",
    background: active ? T.blue : "transparent", color: active ? "#fff" : T.text1, transition: "all .15s",
  }}>
    <i className={`ti ${icon}`} style={{ fontSize: 13 }} />{label}
  </button>
);

const SubTab = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: "5px 12px", fontSize: 11, fontFamily: FONT, borderRadius: 6,
    border: `1px solid ${active ? T.cyan : T.line1}`, cursor: "pointer",
    background: active ? T.cyan + "22" : "transparent", color: active ? T.cyan : T.text2,
    transition: "all .15s",
  }}>{label}</button>
);

const Tbl = ({ cols: tcols, rows, max = 10 }) => {
  if (!rows?.length) return <Empty />;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>{tcols.map(c => <th key={c.k} style={{ textAlign: c.r ? "right" : "left", padding: "6px 10px", color: T.text2, fontWeight: 500, borderBottom: `1px solid ${T.line1}`, whiteSpace: "nowrap" }}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(0, max).map((row, i) => (
            <tr key={i} className="row-hover">
              {tcols.map(c => (
                <td key={c.k} style={{ padding: "7px 10px", borderBottom: `1px solid ${T.line1}`, textAlign: c.r ? "right" : "left", color: c.color ? c.color(row) : T.text0, whiteSpace: c.wrap ? "normal" : "nowrap", maxWidth: c.wrap ? 200 : undefined }}>
                  {c.render ? c.render(row) : row[c.k]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Brand Label ───────────────────────────────────────────────────────────────
const BrandLabel = ({ label }) => {
  const map = { star: ["⭐ Star", T.green], cashcow: ["💰 Cash Cow", T.yellow], gem: ["💎 Hidden Gem", T.cyan], risk: ["⚠️ At Risk", T.red] };
  const [text, color] = map[label] || ["—", T.text2];
  return <Tag color={color}>{text}</Tag>;
};

// ── Action Tag ────────────────────────────────────────────────────────────────
function getAction(p) {
  if (p.stock <= 0)                                                                              return { icon: "🚨", text: "Out of stock — restock now", color: T.red };
  if (p.stock < 5 && p.sessions >= 10 && p.units > 0 && p.roas >= p.beRoas)                    return { icon: "⚡", text: "Low stock — selling well, restock soon", color: T.orange };
  if (p.sessions < 10 && p.adSpend > 0)                                                         return { icon: "🎯", text: "Review targeting — low reach", color: T.purple };
  if (p.sessions >= 10 && (p.atcRate || 0) < 0.05 && p.stock > 0)                              return { icon: "🖼️", text: "Improve product page", color: T.yellow };
  if ((p.atcRate || 0) >= 0.05 && (p.convRate || 0) < 0.01 && p.stock > 0)                    return { icon: "💳", text: "Check checkout flow", color: T.yellow };
  if (p.cpa > p.price && p.stock > 0)                                                           return { icon: "🛑", text: "Pause ads — CPA > price", color: T.red };
  if (p.beRoas && p.roas < p.beRoas && p.stock > 0)                                            return { icon: "✂️", text: "Reduce bid — below break-even", color: T.orange };
  if (p.beRoas && p.roas >= p.beRoas * 0.8 && p.roas < p.beRoas && p.stock > 0)              return { icon: "👀", text: "Monitor — near break-even", color: T.text1 };
  return { icon: "✅", text: "On track", color: T.green };
}

// ── Funnel Viz ────────────────────────────────────────────────────────────────
const FunnelViz = ({ sessions, atc, checkout, units }) => {
  const steps = [
    { label: "Sessions",    value: sessions, color: T.blue },
    { label: "Add to Cart", value: atc,      color: T.cyan },
    { label: "Checkout",    value: checkout, color: T.purple },
    { label: "Purchased",   value: units,    color: T.green },
  ].filter(s => s.value > 0);
  if (!steps.length) return <Empty icon="ti-funnel" msg="No funnel data" />;
  const max = steps[0].value;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {steps.map((s, i) => {
        const drop = i > 0 ? ((steps[i-1].value - s.value) / steps[i-1].value) : 0;
        return (
          <div key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 90, fontSize: 11, color: T.text2 }}>{s.label}</div>
              <HBar value={s.value} max={max} color={s.color} h={8} />
              <div style={{ width: 60, textAlign: "right", fontSize: 12, fontFamily: MONO, color: T.text0 }}>{fNum(s.value)}</div>
              {i > 0 && <div style={{ width: 50, textAlign: "right", fontSize: 11, color: drop > 0.5 ? T.red : T.text2 }}>-{fPct(drop)}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Rate Color ────────────────────────────────────────────────────────────────
const rateColor = v => v == null ? T.text2 : v < 0.05 ? T.red : v < 0.10 ? T.yellow : T.green;

// ── DAYS IN PERIOD ────────────────────────────────────────────────────────────
function daysInPeriod(range) {
  const now = new Date();
  if (range === "MTD") return now.getDate();
  if (range === "Last 30D") return 30;
  if (range === "Last Month") return 30;
  if (range === "YTD") return Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 86400000);
  return 30;
}

// ── PASSWORD SCREEN ───────────────────────────────────────────────────────────
const PasswordScreen = ({ onAuth }) => {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const submit = () => {
    if (val === PASSWORD) { onAuth(); }
    else { setErr(true); setVal(""); setTimeout(() => setErr(false), 1500); }
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg0 }}>
      <div style={{ background: T.bg1, border: `1px solid ${T.line1}`, borderRadius: 16, padding: "40px 48px", width: 340, textAlign: "center" }}>
        <i className="ti ti-lock" style={{ fontSize: 32, color: T.blue, marginBottom: 16, display: "block" }} />
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text0, marginBottom: 6 }}>RC Performance Dashboard</div>
        <div style={{ fontSize: 12, color: T.text2, marginBottom: 24 }}>Enter password to continue</div>
        <input
          type="password" value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Password"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${err ? T.red : T.line2}`, background: T.bg2, color: T.text0, fontSize: 14, fontFamily: FONT, outline: "none", marginBottom: 12 }}
          autoFocus
        />
        {err && <div style={{ fontSize: 12, color: T.red, marginBottom: 8 }}>Incorrect password</div>}
        <button onClick={submit} style={{ width: "100%", padding: "10px", borderRadius: 8, background: T.blue, color: "#fff", border: "none", fontSize: 13, fontFamily: FONT, fontWeight: 600, cursor: "pointer" }}>
          Unlock
        </button>
      </div>
    </div>
  );
};

// ── SETUP SCREEN ──────────────────────────────────────────────────────────────
const SetupScreen = ({ onLoad }) => {
  const [url, setUrl] = useState(localStorage.getItem("rc_apps_script_url") || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    if (!url.trim()) return;
    setLoading(true); setErr("");
    try {
      const fetchUrl = `${url.trim()}?range=mtd`;
      const res = await fetch(fetchUrl);
      const text = await res.text();
      localStorage.setItem("rc_apps_script_url", url.trim());
      onLoad(url.trim(), text);
    } catch (e) {
      setErr("Cannot connect. Check URL and CORS settings.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg0 }}>
      <div style={{ background: T.bg1, border: `1px solid ${T.line1}`, borderRadius: 16, padding: "40px 48px", width: 480 }}>
        <i className="ti ti-table" style={{ fontSize: 28, color: T.blue, marginBottom: 14, display: "block" }} />
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text0, marginBottom: 6 }}>Connect Google Sheet</div>
        <div style={{ fontSize: 12, color: T.text2, marginBottom: 20 }}>Paste your Apps Script Web App URL below</div>
        <input
          value={url} onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && load()}
          placeholder="https://script.google.com/macros/s/..."
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.line2}`, background: T.bg2, color: T.text0, fontSize: 12, fontFamily: MONO, outline: "none", marginBottom: 10 }}
        />
        {err && <div style={{ fontSize: 12, color: T.red, marginBottom: 8 }}>{err}</div>}
        <button onClick={load} disabled={loading} style={{ width: "100%", padding: "10px", borderRadius: 8, background: T.blue, color: "#fff", border: "none", fontSize: 13, fontFamily: FONT, fontWeight: 600, cursor: "pointer", opacity: loading ? .6 : 1 }}>
          {loading ? "Connecting..." : "Load Dashboard"}
        </button>
      </div>
    </div>
  );
};

// ── TAB: PERFORMANCE ─────────────────────────────────────────────────────────
const TabPerformance = ({ m }) => {
  const [prodView, setProdView] = useState("sku"); // "sku" | "product"
  const products = prodView === "sku" ? m.skuList : m.productList;

  const prodCols = [
    { k: "name", label: "Product", wrap: true },
    { k: "revenue", label: "Revenue", r: true, render: p => fUsd(p.revenue) },
    { k: "units", label: "Units", r: true, render: p => fNum(p.units) },
    { k: "sessions", label: "Sessions", r: true, render: p => fNum(p.sessions) },
    { k: "atcRate", label: "ATC Rate", r: true, render: p => <span style={{ color: rateColor(p.atcRate) }}>{fPct(p.atcRate)}</span> },
    { k: "convRate", label: "Conv Rate", r: true, render: p => <span style={{ color: rateColor(p.convRate) }}>{fPct(p.convRate)}</span> },
    { k: "margin", label: "Margin", r: true, render: p => fPct(p.margin) },
    { k: "adSpend", label: "Paid Ads Cost", r: true, render: p => fUsd(p.adSpend) },
    { k: "roas", label: "ROAS", r: true, render: p => fX(p.roas) },
  ];

  return (
    <>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: 12 }} className="fade">
        <Kpi icon="ti-currency-dollar" label="Revenue"    value={fUsd(m.totalRevenue)}  sub={`${fNum(m.totalUnits)} units`} mono />
        <Kpi icon="ti-percent"         label="Avg Margin" value={fPct(m.avgMargin)}     sub={`${m.negMargin} negative`} bad={m.negMargin > 0} />
        <Kpi icon="ti-eye"             label="Sessions"   value={fNum(m.totalSessions)} sub="Total traffic" mono />
        <Kpi icon="ti-shopping-cart"   label="ATC Rate"   value={fPct(m.atcRate)}       ok={m.atcRate >= .1} bad={m.atcRate > 0 && m.atcRate < .05} sub="Add to cart" />
        <Kpi icon="ti-receipt"         label="Conv Rate"  value={fPct(m.convRate)}      ok={m.convRate >= .03} bad={m.convRate > 0 && m.convRate < .01} sub="Session→Purchase" />
        <Kpi icon="ti-ad-2"            label="Total ROAS" value={fX(m.totalROAS)}       ok={m.totalROAS >= 3} bad={m.totalROAS > 0 && m.totalROAS < 1} sub={`${fUsd(m.totalAdSpend)} spent`} mono />
      </div>

      {/* Funnel + Leaks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 0 }}>
        <Card title="Overall Funnel" icon="ti-funnel" sub="Sessions → ATC → Checkout → Purchase">
          <FunnelViz sessions={m.totalSessions} atc={m.totalATC} checkout={m.totalCheckout} units={m.totalUnits} />
        </Card>

        <Card title="Traffic → ATC Leaks" icon="ti-alert-triangle" sub="High sessions, low ATC rate"
          tooltip={`Condition: Sessions ≥ 10\nSort: Sessions DESC\nRate = ATC / Sessions\n🔴 < 5%  🟡 5-10%  🟢 > 10%`}>
          {m.funnelTrafficATC.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {m.funnelTrafficATC.slice(0,10).map((p,i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: T.bg2 }}>
                  <div style={{ flex: 1, fontSize: 11, color: T.text0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name || p.sku}</div>
                  <div style={{ fontSize: 11, color: T.text2 }}>{fNum(p.sessions)} sess</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: rateColor(p.atcRate) }}>{fPct(p.atcRate)}</div>
                </div>
              ))}
            </div>
          ) : <Empty msg="No data with sessions ≥ 10" />}
        </Card>

        <Card title="ATC → Checkout Leaks" icon="ti-alert-triangle" sub="High ATC, low checkout rate"
          tooltip={`Condition: ATC ≥ 3\nSort: ATC DESC\nRate = Checkout / ATC\n🔴 < 5%  🟡 5-10%  🟢 > 10%`}>
          {m.funnelATCCheckout.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {m.funnelATCCheckout.slice(0,10).map((p,i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: T.bg2 }}>
                  <div style={{ flex: 1, fontSize: 11, color: T.text0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name || p.sku}</div>
                  <div style={{ fontSize: 11, color: T.text2 }}>{fNum(p.atc)} ATC</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: rateColor(p.checkoutRate) }}>{fPct(p.checkoutRate)}</div>
                </div>
              ))}
            </div>
          ) : <Empty msg="No data with ATC ≥ 3" />}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 0 }}>
        <Card title="Checkout → Purchase Leaks" icon="ti-alert-triangle" sub="High checkout, low purchase rate"
          tooltip={`Condition: Checkout ≥ 2\nSort: Checkout DESC\nRate = Purchased / Checkout\n🔴 < 5%  🟡 5-10%  🟢 > 10%`}>
          {m.funnelCheckoutPurchase.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {m.funnelCheckoutPurchase.slice(0,10).map((p,i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: T.bg2 }}>
                  <div style={{ flex: 1, fontSize: 11, color: T.text0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name || p.sku}</div>
                  <div style={{ fontSize: 11, color: T.text2 }}>{fNum(p.checkout)} chk</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: rateColor(p.purchaseRate) }}>{fPct(p.purchaseRate)}</div>
                </div>
              ))}
            </div>
          ) : <Empty msg="No data with checkout ≥ 2" />}
        </Card>

        {/* Brand Performance */}
        <Card title="Brand Performance — Top 10" icon="ti-building-store"
          tooltip={`Sort: Revenue DESC\nLabel based on Revenue vs median & Margin vs 35%\n⭐ Star: Rev ≥ median AND Margin ≥ 35%\n💰 Cash Cow: Rev ≥ median AND Margin < 35%\n💎 Hidden Gem: Rev < median AND Margin ≥ 35%\n⚠️ At Risk: Rev < median AND Margin < 35%`}>
          <Tbl max={10} cols={[
            { k: "name",     label: "Brand",        render: p => <span style={{ fontWeight: 600 }}>{p.name}</span> },
            { k: "label",    label: "Health",        render: p => <BrandLabel label={p.label} /> },
            { k: "revenue",  label: "Revenue",  r: true, render: p => fUsd(p.revenue) },
            { k: "units",    label: "Units",    r: true, render: p => fNum(p.units) },
            { k: "sessions", label: "Sessions", r: true, render: p => fNum(p.sessions) },
            { k: "atcRate",  label: "ATC Rate", r: true, render: p => <span style={{ color: rateColor(p.atcRate) }}>{fPct(p.atcRate)}</span> },
            { k: "convRate", label: "Conv",     r: true, render: p => <span style={{ color: rateColor(p.convRate) }}>{fPct(p.convRate)}</span> },
            { k: "margin",   label: "Margin",   r: true, render: p => fPct(p.margin) },
            { k: "adSpend",  label: "Ad Cost",  r: true, render: p => fUsd(p.adSpend) },
            { k: "roas",     label: "ROAS",     r: true, render: p => fX(p.roas) },
          ]} rows={m.brandList} />
        </Card>
      </div>

      {/* Top Products */}
      <Card title="Top Products — Revenue" icon="ti-trophy"
        tooltip={`Sort: Revenue DESC, Top 10\nConv Rate = GA4-Purchased / GA4-Sessions`}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <SubTab label="By SKU" active={prodView === "sku"} onClick={() => setProdView("sku")} />
          <SubTab label="By Product Name" active={prodView === "product"} onClick={() => setProdView("product")} />
        </div>
        <Tbl max={10} cols={prodCols} rows={[...products].sort((a,b) => b.revenue - a.revenue)} />
      </Card>
    </>
  );
};

// ── TAB: ADS ─────────────────────────────────────────────────────────────────
const TabAds = ({ m }) => {
  const [channel, setChannel] = useState("gg");

  const ggTop = [...m.skuList].filter(p => p.ggSpend > 0).sort((a,b) => b.ggSpend - a.ggSpend).slice(0,10);
  const fbTop = [...m.skuList].filter(p => p.fbSpend > 0).sort((a,b) => b.fbSpend - a.fbSpend).slice(0,10);

  const ggWasted = [...m.skuList].filter(p =>
    p.ggSpend > 0 && p.beRoas && p.ggRoas < p.beRoas && p.sessionsGG >= 10 && p.unitsGG >= 1 && p.ggConv >= 1
  ).sort((a,b) => b.ggSpend - a.ggSpend).slice(0,10);

  const fbWasted = [...m.skuList].filter(p =>
    p.fbSpend > 0 && p.beRoas && p.fbRoas < p.beRoas && p.sessionsFB >= 10 && p.unitsFB >= 1
  ).sort((a,b) => b.fbSpend - a.fbSpend).slice(0,10);

  const ggScale = [...m.skuList].filter(p =>
    p.ggSpend > 0 && p.beRoas && p.ggRoas >= p.beRoas && p.sessionsGG >= 50 && p.unitsGG >= 2 && p.ggConv >= 2 && p.stock > 5 && (p.margin||0) >= 0.35
  ).sort((a,b) => b.ggRoas - a.ggRoas).slice(0,10);

  const fbScale = [...m.skuList].filter(p =>
    p.fbSpend > 0 && p.beRoas && p.fbRoas >= p.beRoas && p.sessionsFB >= 50 && p.unitsFB >= 2 && p.stock > 5 && (p.margin||0) >= 0.35
  ).sort((a,b) => b.fbRoas - a.fbRoas).slice(0,10);

  const adsCols = (ch) => [
    { k: "name",     label: "Product", wrap: true },
    { k: ch+"Spend", label: "Spend",       r: true, render: p => fUsd(ch === "gg" ? p.ggSpend : p.fbSpend) },
    { k: "revGA4",   label: "Rev (GA4)",   r: true, render: p => fUsd(ch === "gg" ? p.revenueGG : p.revenueFB) },
    { k: "roasGA4",  label: "ROAS (GA4)",  r: true, render: p => fX(ch === "gg" ? p.ggRoas : p.fbRoas) },
    ...(ch === "gg" ? [{ k: "ggRoasPlat", label: "ROAS (Plat)", r: true, render: p => fX(p.ggRoasPlat) }] : [{ k: "fbRoasPlat", label: "ROAS (Plat)", r: true, render: () => <span style={{ color: T.text2 }}>—</span> }]),
    { k: "beRoas",   label: "BE ROAS",     r: true, render: p => fX(p.beRoas) },
    { k: "unitsGA4", label: "Purch (GA4)", r: true, render: p => fNum(ch === "gg" ? p.unitsGG : p.unitsFB) },
    ...(ch === "gg" ? [{ k: "ggConv", label: "Conv (Plat)", r: true, render: p => fNum(p.ggConv) }] : [{ k: "fbConvPlat", label: "Conv (Plat)", r: true, render: () => <span style={{ color: T.text2 }}>—</span> }]),
    { k: "cpaGA4",   label: "CPA (GA4)",   r: true, render: p => fUsd(ch === "gg" ? p.ggCpa : p.fbCpa) },
    ...(ch === "gg" ? [{ k: "ggCpaPlat", label: "CPA (Plat)", r: true, render: p => fUsd(p.ggCpaPlat) }] : [{ k: "fbCpaPlat", label: "CPA (Plat)", r: true, render: () => <span style={{ color: T.text2 }}>—</span> }]),
    { k: "sessions", label: "Sessions",    r: true, render: p => fNum(ch === "gg" ? p.sessionsGG : p.sessionsFB) },
    { k: "clicks",   label: "Clicks",      r: true, render: p => fNum(ch === "gg" ? p.ggClick : p.fbClicks) },
    { k: "imp",      label: "Imp",         r: true, render: p => fNum(ch === "gg" ? p.ggImp : p.fbImp) },
    { k: "ctr",      label: "CTR",         r: true, render: p => fPct(ch === "gg" ? p.ggCtr : p.fbCtr) },
    { k: "convRate", label: "Conv Rate",   r: true, render: p => fPct(ch === "gg" ? p.ggConvRate : p.fbConvRate) },
    ...(ch === "gg" ? [{ k: "ggCrPlat", label: "CR (Plat)", r: true, render: p => fPct(p.ggCrPlat) }] : [{ k: "fbCrPlat", label: "CR (Plat)", r: true, render: () => <span style={{ color: T.text2 }}>—</span> }]),
  ];

  const chanSwitch = (
    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
      <SubTab label="Google Ads" active={channel === "gg"} onClick={() => setChannel("gg")} />
      <SubTab label="Facebook Ads" active={channel === "fb"} onClick={() => setChannel("fb")} />
    </div>
  );

  const ggROAS = m.totalGGSpend > 0 ? m.totalRevenueGG / m.totalGGSpend : null;
  const fbROAS = m.totalFBSpend > 0 ? m.totalRevenueFB / m.totalFBSpend : null;
  const ggCPA  = m.totalUnitsGG > 0 ? m.totalGGSpend / m.totalUnitsGG : null;
  const fbCPA  = m.totalUnitsFB > 0 ? m.totalFBSpend / m.totalUnitsFB : null;
  const ggCTR  = m.totalGGImp > 0 ? m.totalGGClick / m.totalGGImp : null;
  const fbCTR  = m.totalFBImp > 0 ? m.totalFBClicks / m.totalFBImp : null;
  const ggROASPlat = m.totalGGSpend > 0 ? m.totalGGValue / m.totalGGSpend : null;
  const ggCPAPlat  = m.totalGGConv > 0 ? m.totalGGSpend / m.totalGGConv : null;
  const ggCRPlat   = m.totalSessionsGG > 0 ? m.totalGGConv / m.totalSessionsGG : null;
  const ggConvRateGA4 = m.totalSessionsGG > 0 ? m.totalUnitsGG / m.totalSessionsGG : null;
  const fbConvRateGA4 = m.totalSessionsFB > 0 ? m.totalUnitsFB / m.totalSessionsFB : null;

  return (
    <>
      {/* Section 1 — Overview KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 8 }} className="fade">
        <Kpi icon="ti-currency-dollar" label="Total Ad Spend"    value={fUsd(m.totalAdSpend)}   mono />
        <Kpi icon="ti-cash"            label="Total Ad Revenue"  value={fUsd(m.totalAdRevenue)} mono />
        <Kpi icon="ti-ad-2"            label="Total ROAS"        value={fX(m.totalROAS)}        ok={m.totalROAS >= 3} bad={m.totalROAS > 0 && m.totalROAS < 1} mono />
        <Kpi icon="ti-users"           label="Total Purchases"   value={fNum(m.totalAdUnits)}   sub="GG + FB" mono />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
        <Kpi icon="ti-receipt"         label="Total CPA"         value={fUsd(m.totalCPA)}       mono />
        <Kpi icon="ti-mouse"           label="Total Clicks"      value={fNum(m.totalGGClick + m.totalFBClicks)} mono />
        <Kpi icon="ti-eye"             label="Total Impressions" value={fNum(m.totalGGImp + m.totalFBImp)} mono />
        <Kpi icon="ti-device-analytics" label="Ad Sessions"     value={fNum(m.totalSessionsGG + m.totalSessionsFB)} mono />
      </div>

      {/* Section 2 — Channel Comparison */}
      <Card title="Channel Comparison — Google Ads vs Facebook Ads" icon="ti-chart-bar">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ padding: "6px 10px", color: T.text2, textAlign: "left", borderBottom: `1px solid ${T.line1}` }}>Metric</th>
                <th style={{ padding: "6px 10px", color: T.cyan, textAlign: "right", borderBottom: `1px solid ${T.line1}` }}>GG (GA4)</th>
                <th style={{ padding: "6px 10px", color: T.blue, textAlign: "right", borderBottom: `1px solid ${T.line1}` }}>GG (Platform)</th>
                <th style={{ padding: "6px 10px", color: T.orange, textAlign: "right", borderBottom: `1px solid ${T.line1}` }}>FB (GA4)</th>
                <th style={{ padding: "6px 10px", color: T.purple, textAlign: "right", borderBottom: `1px solid ${T.line1}` }}>FB (Platform)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Spend",       fUsd(m.totalGGSpend),   fUsd(m.totalGGSpend),    fUsd(m.totalFBSpend),  fUsd(m.totalFBSpend)],
                ["Revenue",     fUsd(m.totalRevenueGG), fUsd(m.totalGGValue),    fUsd(m.totalRevenueFB),"— coming soon"],
                ["ROAS",        fX(ggROAS),              fX(ggROASPlat),          fX(fbROAS),            "— coming soon"],
                ["Purchases",   fNum(m.totalUnitsGG),   fNum(m.totalGGConv),     fNum(m.totalUnitsFB),  "— coming soon"],
                ["CPA",         fUsd(ggCPA),             fUsd(ggCPAPlat),         fUsd(fbCPA),           "— coming soon"],
                ["Sessions",    fNum(m.totalSessionsGG), "—",                    fNum(m.totalSessionsFB),"—"],
                ["Clicks",      fNum(m.totalGGClick),    fNum(m.totalGGClick),    "—",                   fNum(m.totalFBClicks)],
                ["Impressions", fNum(m.totalGGImp),      fNum(m.totalGGImp),      "—",                   fNum(m.totalFBImp)],
                ["CTR",         "—",                     fPct(ggCTR),             "—",                   fPct(fbCTR)],
                ["Conv Rate",   fPct(ggConvRateGA4),     fPct(ggCRPlat),          fPct(fbConvRateGA4),   "— coming soon"],
              ].map(([label, v1, v2, v3, v4], i) => (
                <tr key={i} className="row-hover">
                  <td style={{ padding: "7px 10px", borderBottom: `1px solid ${T.line1}`, color: T.text2, fontWeight: 500 }}>{label}</td>
                  {[v1, v2, v3, v4].map((v, j) => (
                    <td key={j} style={{ padding: "7px 10px", borderBottom: `1px solid ${T.line1}`, textAlign: "right", color: v.includes("coming") ? T.text2 : T.text0, fontFamily: v.includes("coming") ? FONT : MONO, fontSize: 12 }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Section 3 — Top Products by Channel */}
      <Card title="Top Products by Ads Spend" icon="ti-trophy"
        tooltip={`Sort: Spend DESC, Top 10\nGA4 = GA4-tracked conversions\nPlatform = ads platform data\nBE ROAS = 1 / Margin`}>
        {chanSwitch}
        <Tbl max={10} cols={adsCols(channel)} rows={channel === "gg" ? ggTop : fbTop} />
      </Card>

      {/* Section 4 — Wasted Spend */}
      <Card title="Wasted Spend" icon="ti-flame"
        tooltip={channel === "gg"
          ? `Google Ads:\nSpend > 0\nROAS < Break-even ROAS (1/Margin)\nSessions ≥ 10\nPurchases ≥ 1\nConv (Platform) ≥ 1\nSort: Spend DESC`
          : `Facebook Ads:\nSpend > 0\nROAS < Break-even ROAS (1/Margin)\nSessions ≥ 10\nPurchases ≥ 1\nSort: Spend DESC`}>
        {chanSwitch}
        <Tbl max={10} cols={[
          { k: "name",    label: "Product",  wrap: true },
          { k: "spend",   label: "Spend",    r: true, render: p => fUsd(channel === "gg" ? p.ggSpend : p.fbSpend) },
          { k: "revenue", label: "Revenue",  r: true, render: p => fUsd(channel === "gg" ? p.revenueGG : p.revenueFB) },
          { k: "roas",    label: "ROAS",     r: true, render: p => <span style={{ color: T.red }}>{fX(channel === "gg" ? p.ggRoas : p.fbRoas)}</span> },
          { k: "beRoas",  label: "BE ROAS",  r: true, render: p => fX(p.beRoas) },
          { k: "units",   label: "Purch",    r: true, render: p => fNum(channel === "gg" ? p.unitsGG : p.unitsFB) },
          { k: "cpa",     label: "CPA",      r: true, render: p => fUsd(channel === "gg" ? p.ggCpa : p.fbCpa) },
          { k: "sessions",label: "Sessions", r: true, render: p => fNum(channel === "gg" ? p.sessionsGG : p.sessionsFB) },
          { k: "margin",  label: "Margin",   r: true, render: p => fPct(p.margin) },
        ]} rows={channel === "gg" ? ggWasted : fbWasted} />
      </Card>

      {/* Section 5 — Scale Up */}
      <Card title="Scale Up Candidates" icon="ti-rocket"
        tooltip={channel === "gg"
          ? `Google Ads:\nSpend > 0\nROAS ≥ Break-even ROAS\nSessions ≥ 50\nPurchases ≥ 2\nConv (Platform) ≥ 2\nStock > 5\nMargin ≥ 35%\nSort: ROAS DESC`
          : `Facebook Ads:\nSpend > 0\nROAS ≥ Break-even ROAS\nSessions ≥ 50\nPurchases ≥ 2\nStock > 5\nMargin ≥ 35%\nSort: ROAS DESC`}>
        {chanSwitch}
        <Tbl max={10} cols={[
          { k: "name",    label: "Product",  wrap: true },
          { k: "spend",   label: "Spend",    r: true, render: p => fUsd(channel === "gg" ? p.ggSpend : p.fbSpend) },
          { k: "revenue", label: "Revenue",  r: true, render: p => fUsd(channel === "gg" ? p.revenueGG : p.revenueFB) },
          { k: "roas",    label: "ROAS",     r: true, render: p => <span style={{ color: T.green }}>{fX(channel === "gg" ? p.ggRoas : p.fbRoas)}</span> },
          { k: "beRoas",  label: "BE ROAS",  r: true, render: p => fX(p.beRoas) },
          { k: "units",   label: "Purch",    r: true, render: p => fNum(channel === "gg" ? p.unitsGG : p.unitsFB) },
          { k: "sessions",label: "Sessions", r: true, render: p => fNum(channel === "gg" ? p.sessionsGG : p.sessionsFB) },
          { k: "stock",   label: "Stock",    r: true, render: p => fNum(p.stock) },
          { k: "margin",  label: "Margin",   r: true, render: p => fPct(p.margin) },
        ]} rows={channel === "gg" ? ggScale : fbScale} />
      </Card>
    </>
  );
};

// ── TAB: HEALTH ───────────────────────────────────────────────────────────────
const TabHealth = ({ m }) => {
  const slowMoving = [...m.skuList].filter(p => p.stock > 20 && p.units < 2).sort((a,b) => b.stock - a.stock).slice(0,10);

  const noConvert = [...m.skuList].filter(p =>
    p.adSpend > 0 && p.beRoas && p.roas < p.beRoas &&
    p.adUnits >= 1 && (p.ggConv >= 1 || p.unitsFB >= 1) &&
    p.sessions >= 10
  ).sort((a,b) => b.adSpend - a.adSpend);

  const zeroRevenue = [...m.skuList].filter(p =>
    p.sessions >= 30 && p.units === 0 && p.revenue === 0
  ).sort((a,b) => b.sessions - a.sessions);

  const section3 = [...noConvert, ...zeroRevenue]
    .filter((p,i,arr) => arr.findIndex(x => x.sku === p.sku) === i)
    .slice(0,10);

  const scaleUp = [...m.skuList].filter(p =>
    p.adSpend > 0 && p.beRoas && p.roas >= p.beRoas &&
    p.sessions >= 50 && p.units >= 2 && p.stock > 5 && (p.margin||0) >= 0.35
  ).sort((a,b) => b.roas - a.roas).slice(0,10);

  // Quadrant groups
  const quad = { star: [], cashcow: [], gem: [], risk: [] };
  m.skuList.forEach(p => { const q = m.quadrant(p); quad[q].push(p); });

  return (
    <>
      {/* Section 1 — 2x2 Matrix */}
      <Card title="Product Health Matrix" icon="ti-layout-grid" sub="Revenue vs Margin"
        tooltip={`Revenue threshold: median of all products with revenue > 0\nMargin threshold: 35%\n\n⭐ Star: Rev ≥ median AND Margin ≥ 35%\n💰 Cash Cow: Rev ≥ median AND Margin < 35%\n💎 Hidden Gem: Rev < median AND Margin ≥ 35%\n⚠️ At Risk: Rev < median AND Margin < 35%`}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { key: "star",     label: "⭐ Star",        color: T.green,  desc: "High revenue + High margin — prioritize & scale" },
            { key: "cashcow",  label: "💰 Cash Cow",    color: T.yellow, desc: "High revenue + Low margin — watch costs" },
            { key: "gem",      label: "💎 Hidden Gem",  color: T.cyan,   desc: "Low revenue + High margin — push marketing" },
            { key: "risk",     label: "⚠️ At Risk",     color: T.red,    desc: "Low revenue + Low margin — review or discontinue" },
          ].map(q => (
            <div key={q.key} style={{ background: T.bg2, border: `1px solid ${q.color}33`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: q.color }}>{q.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: MONO, color: T.text0 }}>{quad[q.key].length}</div>
              </div>
              <div style={{ fontSize: 11, color: T.text2, marginBottom: 8 }}>{q.desc}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 120, overflowY: "auto" }}>
                {quad[q.key].slice(0,8).map((p,i) => (
                  <div key={i} style={{ fontSize: 11, color: T.text1, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.name || p.sku}</span>
                    <span style={{ color: T.text2, marginLeft: 8, flexShrink: 0 }}>{fUsd(p.revenue)}</span>
                  </div>
                ))}
                {quad[q.key].length > 8 && <div style={{ fontSize: 11, color: T.text2 }}>+{quad[q.key].length - 8} more</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Section 2 — Slow Moving */}
      <Card title="Slow Moving Inventory" icon="ti-package"
        tooltip={`Condition: Stock > 20 AND Units sold < 2\nSort: Stock DESC, Top 10`}>
        <Tbl max={10} cols={[
          { k: "name",    label: "Product", wrap: true },
          { k: "stock",   label: "Stock",   r: true, render: p => <span style={{ color: T.orange }}>{fNum(p.stock)}</span> },
          { k: "units",   label: "Units Sold", r: true, render: p => fNum(p.units) },
          { k: "revenue", label: "Revenue", r: true, render: p => fUsd(p.revenue) },
          { k: "cost",    label: "Cost",    r: true, render: p => fUsd(p.cost) },
          { k: "stockVal",label: "Stock Value", r: true, render: p => fUsd(p.stock * p.cost) },
          { k: "margin",  label: "Margin",  r: true, render: p => fPct(p.margin) },
        ]} rows={slowMoving} />
      </Card>

      {/* Section 3 — Not Converting */}
      <Card title="Ads Spend Not Converting + High Traffic Zero Revenue" icon="ti-alert-circle"
        tooltip={`Group 1 — Ads not converting:\nSpend > 0 AND ROAS < Break-even AND Purchases ≥ 1 AND Sessions ≥ 10\n\nGroup 2 — High traffic zero revenue:\nSessions ≥ 30 AND Purchases = 0 AND Revenue = 0\n\nSort: Spend DESC, Top 10`}>
        <Tbl max={10} cols={[
          { k: "name",     label: "Product",    wrap: true },
          { k: "stock",    label: "Stock",      r: true, render: p => <span style={{ color: p.stock <= 0 ? T.red : p.stock < 5 ? T.orange : T.text0 }}>{fNum(p.stock)}</span> },
          { k: "sessions", label: "Sessions",   r: true, render: p => fNum(p.sessions) },
          { k: "revenue",  label: "Revenue",    r: true, render: p => fUsd(p.revenue) },
          { k: "units",    label: "Purchased",  r: true, render: p => fNum(p.units) },
          { k: "adSpend",  label: "Ad Cost",    r: true, render: p => fUsd(p.adSpend) },
          { k: "cpa",      label: "CPA",        r: true, render: p => fUsd(p.cpa) },
          { k: "beRoas",   label: "BE ROAS",    r: true, render: p => fX(p.beRoas) },
          { k: "roas",     label: "ROAS",       r: true, render: p => <span style={{ color: T.red }}>{fX(p.roas)}</span> },
          { k: "price",    label: "MAP Price",  r: true, render: p => fUsd(p.price) },
          { k: "margin",   label: "Margin",     r: true, render: p => fPct(p.margin) },
          { k: "action",   label: "Action",     render: p => { const a = getAction(p); return <span style={{ fontSize: 11, color: a.color }}>{a.icon} {a.text}</span>; } },
        ]} rows={section3} />
      </Card>

      {/* Section 4 — Scale Up */}
      <Card title="Scale Up Candidates" icon="ti-rocket"
        tooltip={`Condition:\nROAS ≥ Break-even ROAS (1/Margin)\nSessions ≥ 50\nUnits sold ≥ 2\nStock > 5\nMargin ≥ 35%\nSort: ROAS DESC, Top 10`}>
        <Tbl max={10} cols={[
          { k: "name",     label: "Product",   wrap: true },
          { k: "stock",    label: "Stock",     r: true, render: p => fNum(p.stock) },
          { k: "sessions", label: "Sessions",  r: true, render: p => fNum(p.sessions) },
          { k: "revenue",  label: "Revenue",   r: true, render: p => fUsd(p.revenue) },
          { k: "units",    label: "Units",     r: true, render: p => fNum(p.units) },
          { k: "margin",   label: "Margin",    r: true, render: p => fPct(p.margin) },
          { k: "adSpend",  label: "Ad Cost",   r: true, render: p => fUsd(p.adSpend) },
          { k: "roas",     label: "ROAS",      r: true, render: p => <span style={{ color: T.green }}>{fX(p.roas)}</span> },
          { k: "beRoas",   label: "BE ROAS",   r: true, render: p => fX(p.beRoas) },
          { k: "convRate", label: "Conv Rate", r: true, render: p => fPct(p.convRate) },
        ]} rows={scaleUp} />
      </Card>
    </>
  );
};

// ── TAB: INVENTORY ────────────────────────────────────────────────────────────
const TabInventory = ({ m, range }) => {
  const days = daysInPeriod(range);
  const inStock    = m.skuList.filter(p => p.stock > 0).length;
  const outStock   = m.skuList.filter(p => p.stock <= 0).length;
  const lowStock   = m.skuList.filter(p => p.stock > 0 && p.stock <= 5).length;
  const totalStockVal = m.skuList.reduce((s,p) => s + p.stock * p.cost, 0);

  const stockVsSales = [...m.skuList].sort((a,b) => b.stock * b.cost - a.stock * a.cost).slice(0,20);

  return (
    <>
      {/* Section 1 — KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 12 }} className="fade">
        <Kpi icon="ti-packages"        label="Total SKUs"      value={fNum(m.skuList.length)} mono />
        <Kpi icon="ti-circle-check"    label="In Stock"        value={fNum(inStock)}   ok sub={`${fPct(inStock/m.skuList.length)} of catalog`} mono />
        <Kpi icon="ti-circle-x"        label="Out of Stock"    value={fNum(outStock)}  bad={outStock > 0} sub="Losing sales" mono />
        <Kpi icon="ti-alert-triangle"  label="Low Stock (≤5)"  value={fNum(lowStock)}  bad={lowStock > 0} sub="Restock soon" mono />
        <Kpi icon="ti-currency-dollar" label="Total Stock Value" value={fUsd(totalStockVal)} sub="Stock × Cost" mono />
      </div>

      {/* Section 2 — Stock Health */}
      <Card title="Stock Health Breakdown" icon="ti-heart-rate"
        tooltip={`🔴 Out of Stock: Stock ≤ 0\n🟡 Low Stock: 0 < Stock ≤ 5\n🟢 Healthy: Stock > 5\n⚫ Slow Moving: Stock > 20 AND Units sold < 2`}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {[
            { label: "🔴 Out of Stock",  items: m.skuList.filter(p => p.stock <= 0),                          color: T.red },
            { label: "🟡 Low Stock",     items: m.skuList.filter(p => p.stock > 0 && p.stock <= 5),           color: T.yellow },
            { label: "🟢 Healthy",       items: m.skuList.filter(p => p.stock > 5),                           color: T.green },
            { label: "⚫ Slow Moving",   items: m.skuList.filter(p => p.stock > 20 && p.units < 2),           color: T.text2 },
          ].map(g => (
            <div key={g.label} style={{ background: T.bg2, borderRadius: 10, padding: "12px 14px", border: `1px solid ${g.color}33` }}>
              <div style={{ fontSize: 12, color: g.color, fontWeight: 600, marginBottom: 4 }}>{g.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: MONO, color: T.text0, marginBottom: 6 }}>{g.items.length}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 100, overflowY: "auto" }}>
                {g.items.slice(0,5).map((p,i) => (
                  <div key={i} style={{ fontSize: 11, color: T.text2, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.name || p.sku}</span>
                    <span style={{ marginLeft: 6, flexShrink: 0, color: T.text1 }}>{fNum(p.stock)}</span>
                  </div>
                ))}
                {g.items.length > 5 && <div style={{ fontSize: 11, color: T.text2 }}>+{g.items.length - 5} more</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Section 3 — Stock vs Sales */}
      <Card title="Stock vs Sales" icon="ti-arrows-exchange"
        tooltip={`Days of Stock = Stock / (Units sold / ${days} days)\nSort: Stock Value DESC, Top 20`}>
        <Tbl max={20} cols={[
          { k: "name",     label: "Product",          wrap: true },
          { k: "stock",    label: "Stock",            r: true, render: p => <span style={{ color: p.stock <= 0 ? T.red : p.stock <= 5 ? T.orange : T.text0 }}>{fNum(p.stock)}</span> },
          { k: "units",    label: "Units Sold",       r: true, render: p => fNum(p.units) },
          { k: "stockVal", label: "Stock Value",      r: true, render: p => fUsd(p.stock * p.cost) },
          { k: "revenue",  label: "Revenue",          r: true, render: p => fUsd(p.revenue) },
          { k: "daysLeft", label: `Days of Stock (${days}d)`, r: true, render: p => {
            if (p.stock <= 0) return <span style={{ color: T.red }}>Out</span>;
            if (p.units === 0) return <span style={{ color: T.text2 }}>∞</span>;
            const d = Math.round(p.stock / (p.units / days));
            return <span style={{ color: d < 14 ? T.red : d < 30 ? T.orange : T.green }}>{d}d</span>;
          }},
          { k: "margin",   label: "Margin",           r: true, render: p => fPct(p.margin) },
        ]} rows={stockVsSales} />
      </Card>
    </>
  );
};

// ── MAIN APP ──────────────────────────────────────────────────────────────────
const TABS = [
  { k: "performance", label: "Performance", icon: "ti-chart-line" },
  { k: "ads",         label: "Ads",         icon: "ti-ad-2" },
  { k: "health",      label: "Product Health", icon: "ti-heart-rate" },
  { k: "inventory",   label: "Inventory",   icon: "ti-package" },
];

const RANGES = ["MTD", "Last 30D", "Last Month", "YTD"];

export default function App() {
  const [authed,    setAuthed]    = useState(!!localStorage.getItem("rc_authed"));
  const [hasUrl,    setHasUrl]    = useState(!!localStorage.getItem("rc_apps_script_url"));
  const [rawText,   setRawText]   = useState(null);
  const [metrics,   setMetrics]   = useState(null);
  const [tab,       setTab]       = useState("performance");
  const [range,     setRange]     = useState("MTD");
  const [syncing,   setSyncing]   = useState(false);
  const [lastSync,  setLastSync]  = useState(null);
  const timerRef = useRef(null);

  const handleAuth = () => { localStorage.setItem("rc_authed", "1"); setAuthed(true); };

  const handleLoad = useCallback((url, text) => {
    // Check if response is JSON error
    try {
      const json = JSON.parse(text);
      if (json.error) { console.error("Apps Script error:", json.error); return; }
    } catch (e) { /* not JSON, proceed as CSV */ }

    setRawText(text);
    try {
      const rows = parseCSV(text);
      if (!rows.length) return;
      const headers = Object.keys(rows[0]);
      const cols = detectCols(headers);
      const m = compute(rows, cols);
      setMetrics(m);
      setLastSync(new Date());
    } catch (e) { console.error("Parse error:", e); }
    setHasUrl(true);
  }, []);

  const refresh = useCallback(async () => {
    const url = localStorage.getItem("rc_apps_script_url");
    if (!url) return;
    setSyncing(true);
    try {
      const rangeParam = range === "MTD" ? "mtd" : range === "Last 30D" ? "last30" : range === "Last Month" ? "lastmonth" : "ytd";
      const fetchUrl = `${url}?range=${rangeParam}`;
      const res = await fetch(fetchUrl);
      const text = await res.text();
      handleLoad(url, text);
    } catch (e) { console.error("Refresh error:", e); }
    setSyncing(false);
  }, [handleLoad, range]);

  useEffect(() => {
    if (authed && hasUrl && !metrics) refresh();
  }, [authed, hasUrl, metrics, refresh]);

  useEffect(() => {
    if (!authed || !hasUrl) return;
    timerRef.current = setInterval(refresh, 30000);
    return () => clearInterval(timerRef.current);
  }, [authed, hasUrl, refresh]);

  if (!authed) return <PasswordScreen onAuth={handleAuth} />;
  if (!hasUrl) return <SetupScreen onLoad={handleLoad} />;

  return (
    <>
      <style>{css}</style>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 16px", minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text0, letterSpacing: "-.02em" }}>RC Performance Dashboard</div>
            <div style={{ fontSize: 11, color: T.text2 }}>{lastSync ? `Last sync ${lastSync.toLocaleTimeString()}` : "Loading..."}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Range selector */}
            <div style={{ display: "flex", gap: 4 }}>
              {RANGES.map(r => {
                const available = r === "MTD";
                return (
                  <button key={r} onClick={() => available && setRange(r)} style={{
                    padding: "5px 12px", fontSize: 11, fontFamily: FONT, borderRadius: 6,
                    cursor: available ? "pointer" : "not-allowed",
                    border: `1px solid ${range === r ? T.blue : T.line1}`,
                    background: range === r ? T.blue + "22" : "transparent",
                    color: range === r ? T.blue : T.text2,
                    opacity: available ? 1 : 0.35,
                    transition: "all .15s",
                  }}>{r}{!available && " 🔒"}</button>
                );
              })}
            </div>
            <button onClick={refresh} disabled={syncing} style={{ padding: "5px 12px", fontSize: 11, fontFamily: FONT, borderRadius: 6, border: `1px solid ${T.line1}`, background: "transparent", color: T.text2, cursor: "pointer" }}>
              <i className={`ti ${syncing ? "ti-loader-2" : "ti-refresh"}`} style={{ fontSize: 13 }} />
            </button>
            <button onClick={() => { localStorage.removeItem("rc_apps_script_url"); setHasUrl(false); setMetrics(null); clearInterval(timerRef.current); }} style={{ padding: "5px 10px", fontSize: 11, fontFamily: FONT, borderRadius: 6, border: `1px solid ${T.line1}`, background: "transparent", color: T.text2, cursor: "pointer" }}>
              Change Sheet
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {TABS.map(t => <NavTab key={t.k} label={t.label} icon={t.icon} active={tab === t.k} onClick={() => setTab(t.k)} />)}
        </div>

        {/* Content */}
        {!metrics ? (
          <div style={{ textAlign: "center", padding: "4rem", color: T.text2 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 32, display: "block", marginBottom: 8, opacity: .4 }} />
            <div>Loading data...</div>
          </div>
        ) : (
          <div className="fade">
            {tab === "performance" && <TabPerformance m={metrics} />}
            {tab === "ads"         && <TabAds m={metrics} />}
            {tab === "health"      && <TabHealth m={metrics} />}
            {tab === "inventory"   && <TabInventory m={metrics} range={range} />}
          </div>
        )}
      </div>
    </>
  );
}
