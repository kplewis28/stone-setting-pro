import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";

// ─── CLIENT CONFIG — only this changes per client ───────
const CONFIG = {
  ownerName: "David Baer",
  businessName: "Stone Art Precision GmbH",
  businessType: "Stone Setting",
  address: "Eichweid 1\n6203 Sempach Station",
  phone: "+41 (0)78 839 73 23",
  location: "Sempach Station, Switzerland",
  currency: "CHF",
  taxLabel: "MWST.",
  taxRate: 0.081,
  vatId: "CHE-137.031.745 MWST",
  paymentTerms: "Betrag zahlbar innerhalb von 10 Tagen.",
  bankDetails: "CH 40 0900 0000 1674 9039 3",
  porto: 0,
  accentColor: "#FF6B2B",
  serviceTypes: ["Pavé", "Bezel", "Prong", "Channel", "Flush", "Invisible"],
  itemCategories: ["Diamond", "Ruby", "Emerald", "Sapphire", "Amethyst", "Other"],
  fieldLabel: "Stone",
  subFieldLabel: "Setting",
  piecesLabel: "Pieces",
  statuses: {
    received:   { label: "Received",    color: "#FF9500" },
    inprogress: { label: "In Progress", color: "#007AFF" },
    done:       { label: "Done",        color: "#34C759" },
    invoiced:   { label: "Invoiced",    color: "#8E8E93" },
  },
};

const C = CONFIG;
const ACCENT = C.accentColor;

const SAMPLE_ORDERS = [
  { id:"0041", client:"Juwelier Müller AG",  received:"2026-03-10", field1:"Diamond",  field2:"Pavé",    pieces:3, status:"inprogress", notes:"Rush order",        amount:0   },
  { id:"0040", client:"Goldsmith Bern",      received:"2026-03-12", field1:"Ruby",     field2:"Prong",   pieces:1, status:"done",       notes:"",                  amount:180 },
  { id:"0039", client:"Atelier Zurich",      received:"2026-03-14", field1:"Sapphire", field2:"Bezel",   pieces:5, status:"received",   notes:"Handle with care",  amount:0   },
  { id:"0038", client:"Juwelier Keller",     received:"2026-03-08", field1:"Diamond",  field2:"Channel", pieces:2, status:"invoiced",   notes:"",                  amount:350 },
];

const newOrder = () => ({ id: String(Date.now()).slice(-4), client:"", received: new Date().toISOString().split("T")[0], field1:"", field2:"", pieces:"", status:"received", notes:"", amount:0 });
const newItem  = () => ({ id: Date.now()+Math.random(), desc:"", price:"" });
const fmt      = n => Number(n||0).toFixed(2);
const genInvNumber = (existing) => {
  const y = new Date().getFullYear();
  const m = String(new Date().getMonth()+1).padStart(2,"0");
  const seq = String(existing.length + 1).padStart(3,"0");
  return `RS-${y}${m}-${seq}`;
};

// ─── ICONS ──────────────────────────────────────────────
const Icon = ({ name, size=22, color="#1C1C1E" }) => {
  const s = { width:size, height:size, display:"block", flexShrink:0 };
  const icons = {
    scan: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 12h10M12 7v10"/><rect x="7" y="7" width="4" height="4" rx="1"/><rect x="13" y="13" width="4" height="4" rx="1"/></svg>,
    orders: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>,
    invoice: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
    back: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
    plus: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
    camera: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    check: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
    gem: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M2 9h20M6 3l-4 6M18 3l4 6"/></svg>,
    trash: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>,
    bell: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>,
    help: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>,
  };
  return icons[name] || null;
};

// ─── SHARED COMPONENTS ──────────────────────────────────
const StatusPill = ({ status }) => {
  const st = C.statuses[status];
  return (
    <span style={{ background:`${st.color}18`, color:st.color, border:`1px solid ${st.color}30`, borderRadius:100, padding:"3px 10px", fontSize:11, fontWeight:700, fontFamily:"'DM Sans','Helvetica',sans-serif", letterSpacing:"0.02em", whiteSpace:"nowrap" }}>
      {st.label}
    </span>
  );
};

const Field = ({ label, children }) => (
  <div style={{ marginBottom:16 }}>
    <div style={{ fontSize:11, fontWeight:600, color:"#8E8E93", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6, fontFamily:"'DM Sans','Helvetica',sans-serif" }}>{label}</div>
    {children}
  </div>
);

const Input = ({ ...props }) => (
  <input {...props} style={{ width:"100%", padding:"13px 14px", border:"1.5px solid #E5E5EA", borderRadius:12, fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:15, color:"#1C1C1E", background:"#FAFAFA", outline:"none", boxSizing:"border-box", ...props.style }} />
);

const Select = ({ children, ...props }) => (
  <select {...props} style={{ width:"100%", padding:"13px 14px", border:"1.5px solid #E5E5EA", borderRadius:12, fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:15, color:"#1C1C1E", background:"#FAFAFA", outline:"none", boxSizing:"border-box", ...props.style }}>
    {children}
  </select>
);

const Textarea = ({ ...props }) => (
  <textarea {...props} style={{ width:"100%", padding:"13px 14px", border:"1.5px solid #E5E5EA", borderRadius:12, fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:15, color:"#1C1C1E", background:"#FAFAFA", outline:"none", boxSizing:"border-box", resize:"none", height:80, ...props.style }} />
);

const BtnPrimary = ({ children, onClick, disabled, style={} }) => (
  <button onClick={onClick} disabled={disabled} style={{ width:"100%", padding:"16px", background: disabled ? "#E5E5EA" : ACCENT, color: disabled ? "#999" : "white", border:"none", borderRadius:14, fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:16, fontWeight:700, cursor: disabled ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, ...style }}>
    {children}
  </button>
);

const BtnGhost = ({ children, onClick, style={} }) => (
  <button onClick={onClick} style={{ width:"100%", padding:"14px", background:"white", color:"#1C1C1E", border:"1.5px solid #E5E5EA", borderRadius:14, fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:15, fontWeight:600, cursor:"pointer", ...style }}>
    {children}
  </button>
);

const Card = ({ children, onClick, style={} }) => (
  <div onClick={onClick} style={{ background:"white", border:"1.5px solid #F2F2F7", borderRadius:16, padding:"16px 18px", marginBottom:12, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", cursor: onClick ? "pointer" : "default", ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontSize:13, fontWeight:700, color:"#8E8E93", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:12, fontFamily:"'DM Sans','Helvetica',sans-serif" }}>
    {children}
  </div>
);

// ─── MAIN APP ────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState("home");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate]   = useState("");
  const [orders, setOrders]     = useState(() => { try { const s = localStorage.getItem("ssp_orders"); return s ? JSON.parse(s) : SAMPLE_ORDERS; } catch { return SAMPLE_ORDERS; } });
  const [view, setView]         = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft]       = useState(newOrder());
  const [items, setItems]       = useState([newItem()]);
  const [invClient, setInvClient] = useState("");
  const [invDate, setInvDate]   = useState(new Date().toISOString().split("T")[0]);
  const [invView, setInvView]   = useState("list");
  const [invoices, setInvoices] = useState(() => { try { const s = localStorage.getItem("ssp_invoices"); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [invSelectedOrders, setInvSelectedOrders] = useState([]);
  const [invPorto, setInvPorto] = useState("");
  const [invDraft, setInvDraft] = useState(null); // factura en construcción desde órdenes
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [rechnungData, setRechnungData] = useState(null);
  const [rechnungPorto, setRechnungPorto] = useState("");
  const [photoStep, setPhotoStep] = useState("capture");
  const [imgData, setImgData]   = useState(null);
  const [imgFile, setImgFile]   = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg]       = useState("");
  const [extracted, setExtracted] = useState(null);
  const fileRef = useRef();

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => { localStorage.setItem("ssp_orders", JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem("ssp_invoices", JSON.stringify(invoices)); }, [invoices]);

  const filteredOrders = orders.filter(o => { const statusOk = filterStatus === "all" || o.status === filterStatus; const dateOk = !filterDate || o.received === filterDate; return statusOk && dateOk; });
  const counts   = Object.keys(C.statuses).reduce((a,k) => ({...a,[k]:orders.filter(o=>o.status===k).length}),{});
  const pending  = orders.filter(o=>o.status==="done").reduce((s,o)=>s+(o.amount||0),0);

  // ── GOOGLE SHEETS SYNC ──
  const syncToSheets = (order) => {
    fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    }).catch(e => console.error("Sheets sync failed:", e));
  };

  // ── PHOTO AI ──
  const analyzePhoto = async () => {
    setAiLoading(true);
    const MSGS = ["Reading document…","Extracting details…","Almost done…"];
    let i=0; setAiMsg(MSGS[0]);
    const iv = setInterval(()=>{ i=(i+1)%MSGS.length; setAiMsg(MSGS[i]); },1400);
    try {
      const b64 = imgData.split(",")[1];
      const response = await fetch("/api/analyze",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:800,
          messages:[{ role:"user", content:[
            { type:"image", source:{ type:"base64", media_type: imgFile.type||"image/jpeg", data:b64 }},
            { type:"text", text:`Extract order info from this delivery document. Return ONLY valid JSON, no backticks:\n{"client":"","orderRef":"","field1":"${C.fieldLabel} value or empty","field2":"${C.subFieldLabel} value or empty","pieces":"","notes":"","summary":"1 sentence"}` }
          ]}]
        })
      });
      const data = await response.json();
      const clean = data.content.map(x=>x.text||"").join("").replace(/```json|```/g,"").trim();
      clearInterval(iv);
      setExtracted(JSON.parse(clean));
      setPhotoStep("review");
    } catch(e) {
      clearInterval(iv);
      setPhotoStep("capture");
    }
    setAiLoading(false);
  };

  const confirmOrder = () => {
    const order = { ...newOrder(), client:extracted.client||"", field1:extracted.field1||"", field2:extracted.field2||"", pieces:extracted.pieces||"", notes:extracted.notes||"", photo: imgData||null };
    setOrders([order, ...orders]);
    syncToSheets(order);
    setPhotoStep("done");
  };

  const resetPhoto = () => { setPhotoStep("capture"); setImgData(null); setImgFile(null); setExtracted(null); };

  const goHome = () => { setTab("home"); setView("list"); setPhotoStep("capture"); setInvView("list"); };

  // ── EXCEL EXPORT ──
  const orderToRow = o => ({
    "Order #":         o.id,
    "Client":          o.client,
    "Received":        o.received,
    [C.fieldLabel]:    o.field1,
    [C.subFieldLabel]: o.field2,
    [C.piecesLabel]:   o.pieces,
    "Status":          C.statuses[o.status]?.label || o.status,
    "Amount":          o.amount || 0,
    "Notes":           o.notes,
  });

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredOrders.map(orderToRow));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `orders-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // ── PRINT INVOICE (shared by order-level and invoice tab) ──
  const printInvoiceDoc = (inv, autoprint = true) => {
    const fmtCHF = n => `CHF ${Number(n).toFixed(2).replace(".", ",")}`;
    const sub    = inv.items.reduce((s,it) => s + (parseFloat(it.price)||0), 0);
    const porto  = parseFloat(inv.porto) || 0;
    const mwst   = sub * C.taxRate;
    const total  = sub + porto + mwst;
    const rowsHtml = inv.items.map(it =>
      `<tr><td>${it.desc || "—"}${it.orderRef ? `<br><span style="font-size:9.5pt;color:#777">Auftrag #${it.orderRef}</span>` : ""}</td><td class="right">${fmtCHF(parseFloat(it.price)||0)}</td></tr>`
    ).join("");

    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<title>Rechnung ${inv.number}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #222; padding: 40px 50px; max-width: 800px; margin: 0 auto; }
  .address { font-size:10pt; color:#444; margin-bottom:28px; line-height:1.7; }
  .rechnung-title { font-size:21pt; font-weight:bold; letter-spacing:4px; color:${ACCENT}; border:3px solid ${ACCENT}; display:inline-block; padding:4px 14px; margin-bottom:6px; text-transform:uppercase; }
  .datum { font-size:11pt; font-weight:bold; margin-bottom:28px; }
  .recipient-block { float:right; text-align:left; font-size:11pt; line-height:1.8; margin-top:-80px; margin-bottom:32px; }
  .clearfix::after { content:""; display:table; clear:both; }
  table { width:100%; border-collapse:collapse; margin-top:40px; margin-bottom:0; }
  thead tr { background:#e8edf2; color:#1a1a1a; }
  thead th { padding:8px 10px; font-size:11pt; text-align:left; }
  thead th.right { text-align:right; }
  tbody tr td { padding:8px 10px; border-bottom:1px solid #e0e0e0; font-size:11pt; }
  tbody tr td.right { text-align:right; }
  .totals td { padding:5px 10px; font-size:11pt; }
  .totals td.right { text-align:right; }
  .totals .total-row td { font-weight:bold; font-size:13pt; border-top:2px solid #222; padding-top:8px; }
  .total-row td.big { font-size:14pt; text-decoration:underline; }
  .footer { margin-top:40px; font-size:10.5pt; line-height:1.9; color:#333; }
  .footer strong { color:#111; }
  .thanks { margin-top:24px; font-size:11pt; }
  @media print {
    @page { size: A4; margin: 12mm 14mm; }
    html, body { height: 100%; padding: 0; margin: 0; }
    body { transform-origin: top left; transform: scale(0.82); width: 122%; }
  }
</style></head>
<body>
  <div style="margin-bottom:24px;">
    <img src="${window.location.origin}/logo.png" alt="${C.businessName}" style="height:90px;object-fit:contain;">
  </div>
  <div class="address">${C.address.replace(/\n/g,"<br>")}<br>Telefon ${C.phone}</div>
  <div class="clearfix">
    <div>
      <div class="rechnung-title">RECHNUNG</div>
      <div class="datum">DATUM: ${new Date(inv.date+"T12:00:00").toLocaleDateString("de-CH")}</div>
    </div>
    <div class="recipient-block">
      ${inv.client}<br>
      ${inv.number}
    </div>
  </div>
  <table>
    <thead><tr><th style="width:80%">BESCHREIBUNG</th><th class="right" style="width:20%">BETRAG</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <table class="totals" style="margin-top:0;">
    <tbody>
      <tr><td colspan="1" class="right" style="color:#555;padding:5px 10px;">Total ohne ${C.taxLabel}</td><td class="right" style="width:22%;padding:5px 10px;">${fmtCHF(sub)}</td></tr>
      ${porto > 0 ? `<tr><td class="right" style="color:#555;padding:5px 10px;">Porto</td><td class="right" style="padding:5px 10px;">${fmtCHF(porto)}</td></tr>` : ""}
      <tr><td class="right" style="color:#555;padding:5px 10px;">${(C.taxRate*100).toFixed(1).replace(".",",")}% ${C.taxLabel}</td><td class="right" style="padding:5px 10px;">${fmtCHF(mwst)}</td></tr>
      <tr class="total-row"><td class="right" style="padding:8px 10px;"><strong>RECHNUNGSBETRAG</strong></td><td class="right big" style="padding:8px 10px;">CHF ${Number(total).toFixed(2).replace(".",",")}</td></tr>
    </tbody>
  </table>
  <div style="margin-top:24px;text-align:left;">
    <img src="${window.location.origin}/qr.png" alt="QR Zahlung" style="width:120px;height:120px;object-fit:contain;">
  </div>
  <div class="footer">
    Zahlungsempfänger: <strong>${C.businessName}</strong><br>
    ${C.bankDetails}<br>
    ${C.paymentTerms}<br>
    MWST-Nr. ${C.vatId}
  </div>
  <div class="thanks">
    <br>Danke für Ihren geschätzten Auftrag.<br><br>
    Freundliche Grüsse<br><br>
    ${C.ownerName}
  </div>
  ${autoprint ? ["<script>window.onload=()=>{ window.print(); }</","script>"].join("") : ""}
</body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  // ── RECHNUNG from order detail (single order, global amount) ──
  const printRechnung = (order, unitPrice, porto = 0) => {
    const price = parseFloat(unitPrice) || 0;
    const desc  = [order.field1, order.field2].filter(Boolean).join(" · ") || order.notes || order.client;
    const invNr = `RS-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}-${order.id}`;
    printInvoiceDoc({
      number: invNr,
      client: order.client,
      date: order.received || new Date().toISOString().split("T")[0],
      porto,
      items: [{ desc, price, orderRef: order.id }],
    });
  };

  // ── DETAIL ORDER ──
  const selectedOrder = orders.find(o=>o.id===selectedId);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica',sans-serif", background:"#F2F2F7", minHeight:"100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        * { -webkit-tap-highlight-color: transparent; }
        input:focus, select:focus, textarea:focus { border-color: ${ACCENT} !important; background:white !important; }
      `}</style>

      {/* ── DESKTOP SIDEBAR ── */}
      {isDesktop && (
        <div style={{ width:220, minHeight:"100vh", background:"white", borderRight:"1.5px solid #E5E5EA", position:"fixed", top:0, left:0, display:"flex", flexDirection:"column", paddingTop:36, zIndex:50 }}>
          <div style={{ padding:"0 24px 36px" }}>
            <div style={{ fontSize:17, fontWeight:800, color:"#1C1C1E", letterSpacing:"-0.01em" }}>Stone Art</div>
            <div style={{ fontSize:11, color:"#8E8E93", fontWeight:500, marginTop:3 }}>Precision GmbH</div>
          </div>
          {[
            { key:"home",    icon:"orders",  label:"Home"    },
            { key:"scan",    icon:"scan",    label:"Scan"    },
            { key:"orders",  icon:"gem",     label:"Orders"  },
            { key:"invoice", icon:"invoice", label:"Invoice" },
          ].map(({ key, icon, label }) => (
            <button key={key} onClick={()=>{ setTab(key); if(key==="scan")resetPhoto(); if(key==="orders")setView("list"); if(key==="invoice")setInvView("list"); }}
              style={{ width:"100%", background: tab===key ? `${ACCENT}12` : "none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"13px 24px", borderLeft: tab===key ? `3px solid ${ACCENT}` : "3px solid transparent", transition:"all 0.15s" }}>
              <Icon name={icon} size={20} color={tab===key ? ACCENT : "#8E8E93"}/>
              <span style={{ fontSize:14, fontWeight: tab===key ? 700 : 500, color: tab===key ? ACCENT : "#8E8E93" }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── CONTENT WRAPPER ── */}
      <div style={ isDesktop ? { marginLeft:220, minHeight:"100vh" } : { maxWidth:430, margin:"0 auto" } }>

      {/* ── HOME TAB ── */}
      {tab==="home" && (
        <div style={{ animation:"fadeUp 0.3s ease" }}>
          {/* TOP BAR */}
          <div style={{ padding: isDesktop ? "32px 40px 0" : "56px 24px 0", background:"white" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
              <button style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="help" size={22} color="#8E8E93"/></button>
              <div style={{ position:"relative" }}>
                <button style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="bell" size={22} color="#8E8E93"/></button>
                <div style={{ position:"absolute", top:2, right:2, width:8, height:8, borderRadius:"50%", background:ACCENT }} />
              </div>
            </div>
            <div style={{ paddingBottom:28 }}>
              <div style={{ fontSize:28, color:"#8E8E93", fontWeight:400, lineHeight:1.2 }}>{greeting}, {C.ownerName},</div>
              <div style={{ fontSize:28, fontWeight:700, color:"#1C1C1E", lineHeight:1.3 }}>How can I help<br/>you today?</div>
            </div>
          </div>

          <div style={{ padding: isDesktop ? "28px 40px 60px" : "20px 16px 100px" }}>
            {/* QUICK ACTIONS */}
            <div style={{ display:"grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "1fr 1fr", gap:12, marginBottom:24 }}>
              {[
                { icon:"scan",    title:"Scan Order",   sub:"Photo → order auto",   action:()=>{ setTab("scan"); resetPhoto(); } },
                { icon:"orders",  title:"My Orders",    sub:"Track & update status", action:()=>setTab("orders") },
                { icon:"invoice", title:"New Invoice",  sub:"Generate PDF fast",    action:()=>{ setTab("invoice"); setInvView("form"); } },
                { icon:"gem",     title:"Quick Add",    sub:"Manual order entry",   action:()=>{ setTab("orders"); setView("new"); } },
              ].map(({ icon, title, sub, action }) => (
                <button key={title} onClick={action} style={{ background:"white", border:"1.5px solid #F2F2F7", borderRadius:20, padding:"20px 16px", textAlign:"left", cursor:"pointer", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ width:44, height:44, background:"#F2F2F7", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                    <Icon name={icon} size={22} color="#1C1C1E"/>
                  </div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#1C1C1E", marginBottom:3 }}>{title}</div>
                  <div style={{ fontSize:12, color:"#8E8E93", lineHeight:1.4 }}>{sub}</div>
                </button>
              ))}
            </div>

            {/* SUMMARY STRIP */}
            <SectionTitle>Today's overview</SectionTitle>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:24 }}>
              {[
                [counts.inprogress, "In progress", C.statuses.inprogress.color],
                [counts.done,       "Done",         C.statuses.done.color],
                [`${C.currency} ${pending}`, "To invoice", ACCENT],
              ].map(([val, lbl, col]) => (
                <div key={lbl} style={{ background:"white", borderRadius:16, padding:"14px 12px", textAlign:"center", border:"1.5px solid #F2F2F7" }}>
                  <div style={{ fontSize:20, fontWeight:700, color:col, marginBottom:2 }}>{val}</div>
                  <div style={{ fontSize:11, color:"#8E8E93", fontWeight:500 }}>{lbl}</div>
                </div>
              ))}
            </div>

            {/* RECENT */}
            <SectionTitle>Recent orders</SectionTitle>
            {orders.slice(0,3).map(o => (
              <Card key={o.id} onClick={()=>{ setSelectedId(o.id); setView("detail"); setTab("orders"); }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:600, color:"#1C1C1E", marginBottom:2 }}>{o.client}</div>
                    <div style={{ fontSize:12, color:"#8E8E93" }}>#{o.id} · {o.field1} {o.field2 && `· ${o.field2}`}</div>
                  </div>
                  <StatusPill status={o.status}/>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── SCAN TAB ── */}
      {tab==="scan" && (
        <div style={{ animation:"fadeUp 0.3s ease" }}>
          <div style={{ padding:"56px 20px 16px", background:"white", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid #F2F2F7" }}>
            <button onClick={goHome} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="back" size={22} color="#1C1C1E"/></button>
            <div style={{ fontSize:18, fontWeight:700, color:"#1C1C1E" }}>Scan Delivery Note</div>
          </div>

          <div style={{ padding:"20px 16px 100px" }}>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ const f=e.target.files[0]; if(!f)return; setImgFile(f); const r=new FileReader(); r.onload=ev=>{ setImgData(ev.target.result); setPhotoStep("preview"); }; r.readAsDataURL(f); }}/>

            {photoStep==="capture" && (
              <>
                <div style={{ background:"white", borderRadius:24, padding:"40px 24px", textAlign:"center", marginBottom:16, border:"1.5px solid #F2F2F7" }}>
                  <div style={{ width:80, height:80, background:"#F2F2F7", borderRadius:24, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
                    <Icon name="camera" size={36} color="#1C1C1E"/>
                  </div>
                  <div style={{ fontSize:20, fontWeight:700, color:"#1C1C1E", marginBottom:8 }}>Take a photo</div>
                  <div style={{ fontSize:14, color:"#8E8E93", lineHeight:1.6, marginBottom:28 }}>Point your camera at the printed sheet inside the box. The AI reads everything automatically.</div>
                  <BtnPrimary onClick={()=>{ fileRef.current.setAttribute("capture","environment"); fileRef.current.click(); }}>
                    <Icon name="camera" size={18} color="white"/> Open Camera
                  </BtnPrimary>
                  <div style={{ height:10 }}/>
                  <BtnGhost onClick={()=>{ fileRef.current.removeAttribute("capture"); fileRef.current.click(); }}>Choose from Gallery</BtnGhost>
                </div>
                <SectionTitle>Tips for best results</SectionTitle>
                {[["Good lighting","Natural light, no shadows on the document"],["Keep it flat","Place sheet on flat surface"],["Full document","Entire sheet visible in frame"]].map(([t,d])=>(
                  <div key={t} style={{ display:"flex", gap:12, marginBottom:10, alignItems:"flex-start" }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:ACCENT, marginTop:6, flexShrink:0 }}/>
                    <div><div style={{ fontSize:14, fontWeight:600, color:"#1C1C1E" }}>{t}</div><div style={{ fontSize:13, color:"#8E8E93" }}>{d}</div></div>
                  </div>
                ))}
              </>
            )}

            {photoStep==="preview" && (
              <>
                <img src={imgData} alt="doc" style={{ width:"100%", borderRadius:16, border:"1.5px solid #F2F2F7", marginBottom:16, display:"block" }}/>
                {aiLoading ? (
                  <Card style={{ textAlign:"center", padding:"32px" }}>
                    <div style={{ width:36, height:36, border:`3px solid #F2F2F7`, borderTopColor:ACCENT, borderRadius:"50%", animation:"spin 0.7s linear infinite", margin:"0 auto 16px" }}/>
                    <div style={{ fontSize:15, fontWeight:600, color:"#1C1C1E", marginBottom:4 }}>{aiMsg}</div>
                    <div style={{ fontSize:13, color:"#8E8E93" }}>AI is reading the document</div>
                  </Card>
                ) : (
                  <>
                    <BtnPrimary onClick={analyzePhoto}><Icon name="scan" size={18} color="white"/> Analyze with AI</BtnPrimary>
                    <div style={{ height:10 }}/>
                    <BtnGhost onClick={resetPhoto}>↩ Retake photo</BtnGhost>
                  </>
                )}
              </>
            )}

            {photoStep==="review" && extracted && (
              <>
                <Card style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:ACCENT, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>AI read this</div>
                  <div style={{ fontSize:14, color:"#3C3C43", lineHeight:1.6, fontStyle:"italic" }}>"{extracted.summary}"</div>
                </Card>
                <SectionTitle>Confirm details</SectionTitle>
                <Card>
                  <Field label="Client name"><Input placeholder="Company" value={extracted.client||""} onChange={e=>setExtracted({...extracted,client:e.target.value})}/></Field>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <Field label={C.fieldLabel}><Input placeholder={C.fieldLabel} value={extracted.field1||""} onChange={e=>setExtracted({...extracted,field1:e.target.value})}/></Field>
                    <Field label={C.subFieldLabel}><Input placeholder={C.subFieldLabel} value={extracted.field2||""} onChange={e=>setExtracted({...extracted,field2:e.target.value})}/></Field>
                  </div>
                  <Field label={C.piecesLabel}><Input type="number" placeholder="0" value={extracted.pieces||""} onChange={e=>setExtracted({...extracted,pieces:e.target.value})}/></Field>
                  <Field label="Notes"><Textarea placeholder="Special instructions…" value={extracted.notes||""} onChange={e=>setExtracted({...extracted,notes:e.target.value})}/></Field>
                </Card>
                <BtnPrimary onClick={confirmOrder}><Icon name="check" size={18} color="white"/> Create Order</BtnPrimary>
                <div style={{ height:10 }}/>
                <BtnGhost onClick={resetPhoto}>↩ Retake photo</BtnGhost>
              </>
            )}

            {photoStep==="done" && (
              <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ width:72, height:72, background:`${ACCENT}15`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
                  <Icon name="check" size={32} color={ACCENT}/>
                </div>
                <div style={{ fontSize:24, fontWeight:700, color:"#1C1C1E", marginBottom:8 }}>Order created!</div>
                <div style={{ fontSize:15, color:"#8E8E93", marginBottom:32 }}>It's now in your orders list.</div>
                <BtnPrimary onClick={()=>{ setTab("orders"); setView("list"); resetPhoto(); }}>Go to Orders →</BtnPrimary>
                <div style={{ height:10 }}/>
                <BtnGhost onClick={resetPhoto}>Scan another</BtnGhost>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ORDERS TAB ── */}
      {tab==="orders" && (
        <div style={{ animation:"fadeUp 0.3s ease" }}>
          {/* HEADER */}
          <div style={{ padding:"56px 20px 16px", background:"white", borderBottom:"1px solid #F2F2F7" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                {view!=="list"
                  ? <button onClick={()=>setView("list")} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="back" size={22} color="#1C1C1E"/></button>
                  : <button onClick={goHome} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="back" size={22} color="#1C1C1E"/></button>
                }
                <div style={{ fontSize:18, fontWeight:700, color:"#1C1C1E" }}>
                  {view==="new" ? "New Order" : view==="detail" ? selectedOrder?.client : "Orders"}
                </div>
              </div>
              {view==="list" && (
                <button onClick={()=>setView("new")} style={{ width:36, height:36, borderRadius:"50%", background:ACCENT, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon name="plus" size={18} color="white"/>
                </button>
              )}
            </div>
          </div>

          <div style={{ padding:"20px 16px 100px" }}>

            {/* ── LIST ── */}
            {view==="list" && (
              <>
                {/* Status filter pills */}
                <div style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:20, paddingBottom:2 }}>
                  {[["all","All",orders.length], ...Object.entries(C.statuses).map(([k,v])=>[k,v.label,counts[k]])].map(([key,label,cnt])=>(
                    <button key={key} style={{ padding:"7px 16px", borderRadius:100, border:"1.5px solid #E5E5EA", background:"white", fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:13, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", color: filterStatus===key ? ACCENT : "#1C1C1E", flexShrink:0 }} onClick={()=>setFilterStatus(key)}>
                      {label}&nbsp;<span style={{ color:"#C7C7CC", fontWeight:400 }}>{cnt}</span>
                    </button>
                  ))}
                </div>

                
                {/* Date filter + Export */}
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                  <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} style={{ flex:1, padding:"9px 12px", border:"1.5px solid #E5E5EA", borderRadius:10, fontFamily:"DM Sans,sans-serif", fontSize:13, color:"#1C1C1E", background:"white", outline:"none" }}/>
                  {filterDate && <button onClick={()=>setFilterDate("")} style={{ padding:"9px 14px", border:"1.5px solid #E5E5EA", borderRadius:10, background:"white", fontSize:12, color:"#8E8E93", cursor:"pointer" }}>Clear</button>}
                  <button onClick={exportToExcel} style={{ padding:"9px 14px", border:"1.5px solid #E5E5EA", borderRadius:10, background:"white", fontSize:12, fontWeight:600, color:ACCENT, cursor:"pointer", whiteSpace:"nowrap" }}>↓ Excel</button>
                </div>
                {/* Order rows — minimal: client + status + one line of meta */}
                {filteredOrders.map(o => (
                  <button key={o.id} onClick={()=>{ setSelectedId(o.id); setView("detail"); }} style={{ width:"100%", background:"white", border:"1.5px solid #F2F2F7", borderRadius:16, padding:"16px 18px", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", textAlign:"left" }}>
                    {o.photo && <img src={o.photo} alt="order" style={{ width:44, height:44, borderRadius:10, objectFit:"cover", marginRight:14, flexShrink:0, border:"1px solid #E5E5EA" }}/>}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:"#1C1C1E", marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{o.client}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:6, height:6, borderRadius:"50%", background:C.statuses[o.status].color, flexShrink:0 }}/>
                        <span style={{ fontSize:12, color:"#8E8E93" }}>
                          {[o.field1, o.field2, o.pieces && `${o.pieces} ${C.piecesLabel}`].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginLeft:12, flexShrink:0 }}>
                      {o.amount>0 && <span style={{ fontSize:14, fontWeight:700, color:ACCENT }}>{C.currency} {fmt(o.amount)}</span>}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* ── NEW ORDER ── */}
            {view==="new" && (
              <Card>
                <Field label="Client *">
                  <Input placeholder="Client or company" value={draft.client} onChange={e=>setDraft({...draft,client:e.target.value})}/>
                </Field>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Field label={C.fieldLabel}>
                    <Select value={draft.field1} onChange={e=>setDraft({...draft,field1:e.target.value})}>
                      <option value="">— select —</option>
                      {C.itemCategories.map(o=><option key={o}>{o}</option>)}
                    </Select>
                  </Field>
                  <Field label={C.subFieldLabel}>
                    <Select value={draft.field2} onChange={e=>setDraft({...draft,field2:e.target.value})}>
                      <option value="">— select —</option>
                      {C.serviceTypes.map(o=><option key={o}>{o}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label={C.piecesLabel}>
                  <Input type="number" placeholder="0" value={draft.pieces} onChange={e=>setDraft({...draft,pieces:e.target.value})}/>
                </Field>
                <Field label="Notes">
                  <Textarea value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} placeholder="Special instructions…"/>
                </Field>
                <BtnPrimary disabled={!draft.client} onClick={()=>{ if(draft.client){ setOrders([{...draft},...orders]); syncToSheets(draft); setDraft(newOrder()); setView("list"); } }}>
                  Save Order
                </BtnPrimary>
              </Card>
            )}

            {/* ── DETAIL ── */}
            {view==="detail" && selectedOrder && (
              <>
                {/* Status bar — tap to change */}
                <div style={{ display:"flex", gap:8, marginBottom:20 }}>
                  {Object.entries(C.statuses).map(([key,val])=>{
                    const active = selectedOrder.status===key;
                    return (
                      <button key={key} onClick={()=>setOrders(orders.map(o=>o.id===selectedOrder.id?{...o,status:key}:o))} style={{ flex:1, padding:"10px 4px", borderRadius:12, border:`1.5px solid ${active?val.color:"#E5E5EA"}`, background: active?`${val.color}12`:"white", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background: active?val.color:"#C7C7CC" }}/>
                        <span style={{ fontSize:10, fontWeight:active?700:500, color:active?val.color:"#8E8E93", fontFamily:"'DM Sans','Helvetica',sans-serif", whiteSpace:"nowrap" }}>{val.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Photo */}
                {selectedOrder.photo && (
                  <img src={selectedOrder.photo} alt="order" style={{ width:"100%", borderRadius:16, objectFit:"cover", maxHeight:240, marginBottom:16, border:"1.5px solid #E5E5EA", display:"block" }}/>
                )}

                {/* Order info */}
                <Card>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                    {[
                      ["Received", selectedOrder.received],
                      ["Order ID", `#${selectedOrder.id}`],
                      [C.fieldLabel, selectedOrder.field1],
                      [C.subFieldLabel, selectedOrder.field2],
                      [C.piecesLabel, selectedOrder.pieces],
                    ].filter(([,v])=>v).map(([l,v])=>(
                      <div key={l}>
                        <div style={{ fontSize:11, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, marginBottom:4 }}>{l}</div>
                        <div style={{ fontSize:14, fontWeight:600, color:"#1C1C1E" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {selectedOrder.notes && (
                    <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid #F2F2F7", fontSize:13, color:"#8E8E93", lineHeight:1.5 }}>
                      {selectedOrder.notes}
                    </div>
                  )}
                </Card>

                {/* Rechnung — only when done */}
                {selectedOrder.status==="done" && (
                  <Card>
                    <Field label={`Monto (${C.currency})`}>
                      <Input
                        type="number" placeholder="0.00"
                        value={selectedOrder.amount||""}
                        onChange={e=>setOrders(orders.map(o=>o.id===selectedOrder.id?{...o,amount:parseFloat(e.target.value)||0}:o))}
                      />
                    </Field>
                    {selectedOrder.amount>0 && (
                      <div style={{ fontSize:12, color:"#8E8E93", marginBottom:14, lineHeight:1.6 }}>
                        {C.currency} {fmt(selectedOrder.amount)} + {(C.taxRate*100).toFixed(1)}% MWST = <strong style={{color:ACCENT}}>{C.currency} {fmt(selectedOrder.amount*(1+C.taxRate))}</strong>
                      </div>
                    )}

                    {/* Borrador en construcción */}
                    {invDraft && (
                      <div style={{ background:"#F2F2F7", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:ACCENT, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Factura en construcción — {invDraft.client}</div>
                        {invDraft.items.map((it,i)=>(
                          <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#1C1C1E", marginBottom:4 }}>
                            <span>#{it.orderRef} {it.desc}</span>
                            <span style={{ fontWeight:600 }}>{C.currency} {fmt(it.price)}</span>
                          </div>
                        ))}
                        <div style={{ borderTop:"1px solid #E5E5EA", marginTop:8, paddingTop:8, display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:700, color:"#1C1C1E" }}>
                          <span>Subtotal</span>
                          <span>{C.currency} {fmt(invDraft.items.reduce((s,it)=>s+(parseFloat(it.price)||0),0))}</span>
                        </div>
                      </div>
                    )}

                    <div style={{ display:"flex", gap:10 }}>
                      {/* Añadir esta orden al borrador y volver a la lista */}
                      <button
                        disabled={!selectedOrder.amount}
                        onClick={()=>{
                          const desc = [selectedOrder.field1, selectedOrder.field2].filter(Boolean).join(" · ") || selectedOrder.notes || `Auftrag #${selectedOrder.id}`;
                          const newItem = { id: Date.now(), desc, price: selectedOrder.amount, orderRef: selectedOrder.id };
                          const base = invDraft || { client: selectedOrder.client, date: selectedOrder.received || new Date().toISOString().split("T")[0], items: [] };
                          setInvDraft({ ...base, items: [...base.items, newItem] });
                          setOrders(orders.map(o=>o.id===selectedOrder.id?{...o,status:"invoiced"}:o));
                          setView("list");
                        }}
                        style={{ flex:1, padding:"13px 10px", background: selectedOrder.amount?"#F2F2F7":"#F2F2F7", border:"none", borderRadius:14, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color: selectedOrder.amount?"#1C1C1E":"#C7C7CC", cursor: selectedOrder.amount?"pointer":"not-allowed" }}>
                        + Añadir más
                      </button>

                      {/* Guardar factura definitiva */}
                      <BtnPrimary
                        disabled={!selectedOrder.amount && !(invDraft?.items?.length)}
                        onClick={()=>{
                          const desc = [selectedOrder.field1, selectedOrder.field2].filter(Boolean).join(" · ") || selectedOrder.notes || `Auftrag #${selectedOrder.id}`;
                          const currentItem = selectedOrder.amount ? [{ id: Date.now(), desc, price: selectedOrder.amount, orderRef: selectedOrder.id }] : [];
                          const base = invDraft || { client: selectedOrder.client, date: selectedOrder.received || new Date().toISOString().split("T")[0], items: [] };
                          const allItems = [...base.items, ...currentItem];
                          const inv = {
                            id: Date.now(),
                            number: genInvNumber(invoices),
                            client: base.client,
                            date: base.date,
                            porto: parseFloat(rechnungPorto)||0,
                            items: allItems,
                            printed: false,
                            createdAt: new Date().toISOString(),
                          };
                          setInvoices([...invoices, inv]);
                          setRechnungPorto("");
                          setInvDraft(null);
                          setOrders(orders.map(o=>o.id===selectedOrder.id?{...o,status:"invoiced"}:o));
                          setView("list");
                        }}
                        style={{ flex:1, margin:0 }}>
                        <Icon name="invoice" size={16} color="white"/> Guardar factura
                      </BtnPrimary>
                    </div>
                    {invDraft && (
                      <button onClick={()=>setInvDraft(null)} style={{ marginTop:10, width:"100%", background:"none", border:"none", fontSize:12, color:"#FF3B30", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                        Cancelar borrador
                      </button>
                    )}
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── INVOICE TAB ── */}
      {tab==="invoice" && (
        <div style={{ animation:"fadeUp 0.3s ease" }}>

          {/* ── LIST VIEW ── */}
          {invView==="list" && (
            <>
              <div style={{ padding: isDesktop?"32px 40px 0":"56px 20px 0", background:"white", borderBottom:"1px solid #F2F2F7", paddingBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:18, fontWeight:700, color:"#1C1C1E" }}>Invoices</div>
                    {invoices.length > 0 && <div style={{ fontSize:12, color:"#8E8E93", marginTop:2 }}>{invoices.length} factura{invoices.length!==1?"s":""} · {invoices.filter(i=>!i.printed).length} sin imprimir</div>}
                  </div>
                  <button onClick={()=>{ setInvClient(""); setInvDate(new Date().toISOString().split("T")[0]); setInvSelectedOrders([]); setInvPorto(""); setItems([newItem()]); setInvView("new"); }}
                    style={{ background:ACCENT, color:"white", border:"none", borderRadius:12, padding:"10px 18px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    + Nueva factura
                  </button>
                </div>
              </div>
              <div style={{ padding: isDesktop?"20px 40px 60px":"20px 16px 100px" }}>
                {invoices.length === 0 && (
                  <div style={{ textAlign:"center", padding:"48px 24px" }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>🧾</div>
                    <div style={{ fontSize:15, fontWeight:600, color:"#1C1C1E", marginBottom:6 }}>No hay facturas aún</div>
                    <div style={{ fontSize:13, color:"#8E8E93", lineHeight:1.6 }}>Las facturas creadas desde órdenes aparecen aquí.<br/>También puedes crear una manualmente.</div>
                  </div>
                )}
                {[...invoices].reverse().map(inv => {
                  const invSub = inv.items.reduce((s,it)=>s+(parseFloat(it.price)||0),0);
                  const invTotal = invSub*(1+C.taxRate) + (parseFloat(inv.porto)||0);
                  return (
                    <Card key={inv.id} onClick={()=>{ setSelectedInvoice(inv); setInvView("detail"); }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div>
                          <div style={{ fontSize:15, fontWeight:600, color:"#1C1C1E", marginBottom:2 }}>{inv.client}</div>
                          <div style={{ fontSize:12, color:"#8E8E93" }}>{inv.number} · {new Date(inv.date+"T12:00:00").toLocaleDateString("de-CH")}</div>
                          <div style={{ fontSize:11, color:"#8E8E93", marginTop:2 }}>{inv.items.length} item{inv.items.length!==1?"s":""}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:15, fontWeight:700, color:ACCENT }}>{C.currency} {fmt(invTotal)}</div>
                          <div style={{ fontSize:11, marginTop:4, padding:"3px 8px", borderRadius:8, background: inv.printed?"#34C75920":"#FF950020", color: inv.printed?"#34C759":"#FF9500", fontWeight:600 }}>{inv.printed?"Impresa":"Guardada"}</div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {/* ── NEW INVOICE VIEW ── */}
          {invView==="new" && (()=>{
            const draftSub   = items.reduce((s,it)=>s+(parseFloat(it.price)||0),0);
            const draftPorto = parseFloat(invPorto)||0;
            const draftTax   = draftSub * C.taxRate;
            const draftTotal = draftSub + draftPorto + draftTax;
            const clientOrders = orders.filter(o => invClient && o.client.toLowerCase().includes(invClient.toLowerCase()) && o.status !== "invoiced");
            const saveInvoice = (print) => {
              const inv = {
                id: Date.now(),
                number: genInvNumber(invoices),
                client: invClient,
                date: invDate,
                porto: invPorto,
                items: items.filter(it=>it.desc||it.price),
                printed: print,
                createdAt: new Date().toISOString(),
              };
              setInvoices([...invoices, inv]);
              if (print) printInvoiceDoc(inv);
              setInvView("list");
            };
            return (
              <>
                <div style={{ padding: isDesktop?"32px 40px 0":"56px 20px 0", background:"white", borderBottom:"1px solid #F2F2F7", paddingBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <button onClick={()=>setInvView("list")} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="back" size={22} color="#1C1C1E"/></button>
                    <div style={{ fontSize:18, fontWeight:700, color:"#1C1C1E" }}>New Invoice</div>
                  </div>
                </div>
                <div style={{ padding: isDesktop?"20px 40px 60px":"20px 16px 100px" }}>
                  <Card>
                    <Field label="Client *"><Input placeholder="Company name" value={invClient} onChange={e=>setInvClient(e.target.value)}/></Field>
                    <Field label="Date"><Input type="date" value={invDate} onChange={e=>setInvDate(e.target.value)}/></Field>
                    <Field label={`Porto (${C.currency})`}><Input type="number" placeholder="0.00" value={invPorto} onChange={e=>setInvPorto(e.target.value)}/></Field>
                  </Card>

                  {/* Import from orders */}
                  {clientOrders.length > 0 && (
                    <>
                      <SectionTitle>Import from orders — {invClient}</SectionTitle>
                      {clientOrders.map(o=>{
                        const alreadyLinked = invSelectedOrders.includes(o.id);
                        return (
                          <Card key={o.id} onClick={()=>{
                            if (alreadyLinked) {
                              setInvSelectedOrders(invSelectedOrders.filter(id=>id!==o.id));
                              setItems(items.filter(it=>it.orderRef!==o.id));
                            } else {
                              setInvSelectedOrders([...invSelectedOrders, o.id]);
                              const desc = [o.field1, o.field2].filter(Boolean).join(" · ") || o.notes || `Order #${o.id}`;
                              setItems([...items.filter(it=>it.desc||it.price), { id:Date.now()+Math.random(), desc, price: o.amount||"", orderRef: o.id }]);
                            }
                          }} style={{ border: alreadyLinked?`2px solid ${ACCENT}`:"1.5px solid #F2F2F7", cursor:"pointer" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                              <div>
                                <div style={{ fontSize:14, fontWeight:600, color:"#1C1C1E" }}>#{o.id} · {o.field1}{o.field2?` · ${o.field2}`:""}</div>
                                <div style={{ fontSize:12, color:"#8E8E93" }}>{o.received} · {o.pieces} pcs</div>
                              </div>
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                {o.amount>0 && <span style={{ fontSize:13, fontWeight:700, color:"#1C1C1E" }}>{C.currency} {fmt(o.amount)}</span>}
                                <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${alreadyLinked?ACCENT:"#C7C7CC"}`, background:alreadyLinked?ACCENT:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                                  {alreadyLinked && <span style={{ color:"white", fontSize:13, fontWeight:700 }}>✓</span>}
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </>
                  )}

                  <SectionTitle>Line Items</SectionTitle>
                  {items.map((it,idx)=>(
                    <Card key={it.id} style={{ position:"relative" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:ACCENT, letterSpacing:"0.1em", textTransform:"uppercase" }}>
                          Item {idx+1}{it.orderRef?` · Order #${it.orderRef}`:""}
                        </div>
                        {items.length>1 && <button onClick={()=>{ setItems(items.filter(i=>i.id!==it.id)); if(it.orderRef) setInvSelectedOrders(invSelectedOrders.filter(id=>id!==it.orderRef)); }} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="trash" size={16} color="#8E8E93"/></button>}
                      </div>
                      <Field label="Description"><Input placeholder="e.g. Pavé setting – ring" value={it.desc} onChange={e=>setItems(items.map(i=>i.id===it.id?{...i,desc:e.target.value}:i))}/></Field>
                      <Field label={`Amount (${C.currency})`}><Input type="number" placeholder="0.00" value={it.price} onChange={e=>setItems(items.map(i=>i.id===it.id?{...i,price:e.target.value}:i))}/></Field>
                    </Card>
                  ))}

                  <button onClick={()=>setItems([...items,newItem()])} style={{ width:"100%", padding:"14px", background:"white", border:"2px dashed #E5E5EA", borderRadius:14, fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:14, fontWeight:600, color:"#8E8E93", cursor:"pointer", marginBottom:16 }}>+ Add Item</button>

                  <Card style={{ background:"#1C1C1E" }}>
                    {[[`Subtotal`,draftSub],[`Porto`,draftPorto],[`${C.taxLabel} ${(C.taxRate*100).toFixed(1)}%`,draftTax]].map(([l,v])=>(
                      <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:6 }}>
                        <span>{l}</span><span>{C.currency} {fmt(v)}</span>
                      </div>
                    ))}
                    <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid rgba(255,255,255,0.1)", paddingTop:12, marginTop:6 }}>
                      <span style={{ fontSize:15, color:"rgba(255,255,255,0.7)" }}>Total</span>
                      <span style={{ fontSize:22, fontWeight:700, color:"white" }}>{C.currency} {fmt(draftTotal)}</span>
                    </div>
                  </Card>

                  <BtnPrimary disabled={!invClient||items.every(it=>!it.desc&&!it.price)} onClick={()=>saveInvoice(false)}>
                    <Icon name="invoice" size={18} color="white"/> Save Invoice
                  </BtnPrimary>
                  <div style={{ height:10 }}/>
                  <BtnGhost disabled={!invClient||items.every(it=>!it.desc&&!it.price)} onClick={()=>saveInvoice(true)}>
                    ⎙ Save & Print now
                  </BtnGhost>
                </div>
              </>
            );
          })()}

          {/* ── DETAIL VIEW ── */}
          {invView==="detail" && selectedInvoice && (()=>{
            const inv = selectedInvoice;
            const invSub   = inv.items.reduce((s,it)=>s+(parseFloat(it.price)||0),0);
            const invPortoVal = parseFloat(inv.porto)||0;
            const invMwst  = invSub * C.taxRate;
            const invTotal = invSub + invPortoVal + invMwst;
            return (
              <>
                <div style={{ padding: isDesktop?"32px 40px 0":"56px 20px 0", background:"white", borderBottom:"1px solid #F2F2F7", paddingBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <button onClick={()=>{ setSelectedInvoice(null); setInvView("list"); }} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="back" size={22} color="#1C1C1E"/></button>
                    <div style={{ fontSize:18, fontWeight:700, color:"#1C1C1E" }}>{inv.number}</div>
                    <button onClick={()=>{ setInvoices(invoices.filter(i=>i.id!==inv.id)); setSelectedInvoice(null); setInvView("list"); }} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="trash" size={18} color="#FF3B30"/></button>
                  </div>
                </div>
                <div style={{ padding: isDesktop?"20px 40px 60px":"20px 16px 100px" }}>

                  {/* ── INVOICE PREVIEW CARD ── */}
                  <div style={{ background:"white", border:"1.5px solid #E5E5EA", borderRadius:16, padding:"28px 24px", marginBottom:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
                    {/* Header */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                      <img src="/logo.png" alt={C.businessName} style={{ height:52, objectFit:"contain" }}/>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:10, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>Rechnung</div>
                        <div style={{ fontSize:13, fontFamily:"monospace", fontWeight:700, color:"#1C1C1E", marginTop:2 }}>{inv.number}</div>
                        <div style={{ fontSize:11, color:"#8E8E93" }}>{new Date(inv.date+"T12:00:00").toLocaleDateString("de-CH")}</div>
                        <div style={{ fontSize:11, marginTop:6, padding:"2px 8px", borderRadius:6, display:"inline-block", background: inv.printed?"#34C75920":"#FF950020", color: inv.printed?"#34C759":"#FF9500", fontWeight:700 }}>{inv.printed?"Impresa":"Guardada"}</div>
                      </div>
                    </div>

                    {/* To */}
                    <div style={{ background:"#F2F2F7", borderRadius:10, padding:"10px 14px", marginBottom:18 }}>
                      <div style={{ fontSize:9, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:700, marginBottom:3 }}>Para</div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#1C1C1E" }}>{inv.client}</div>
                    </div>

                    {/* Items table */}
                    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12 }}>
                      <thead>
                        <tr style={{ borderBottom:"1.5px solid #E5E5EA" }}>
                          <th style={{ textAlign:"left", fontSize:10, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", padding:"4px 0 8px", fontWeight:700 }}>Descripción</th>
                          <th style={{ textAlign:"right", fontSize:10, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", padding:"4px 0 8px", fontWeight:700 }}>Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items.map((it,i)=>(
                          <tr key={i} style={{ borderBottom:"1px solid #F2F2F7" }}>
                            <td style={{ padding:"9px 0", verticalAlign:"top" }}>
                              <div style={{ fontSize:13, fontWeight:600, color:"#1C1C1E" }}>{it.desc||"—"}</div>
                              {it.orderRef && <div style={{ fontSize:10, color:"#8E8E93" }}>Auftrag #{it.orderRef}</div>}
                            </td>
                            <td style={{ padding:"9px 0", textAlign:"right", fontSize:13, fontWeight:600, color:"#1C1C1E" }}>{C.currency} {fmt(parseFloat(it.price)||0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totals */}
                    <div style={{ borderTop:"1px solid #E5E5EA", paddingTop:10 }}>
                      {invPortoVal>0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#8E8E93", marginBottom:4 }}><span>Porto</span><span>{C.currency} {fmt(invPortoVal)}</span></div>}
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#8E8E93", marginBottom:4 }}><span>Subtotal</span><span>{C.currency} {fmt(invSub)}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#8E8E93", marginBottom:10 }}><span>{C.taxLabel} {(C.taxRate*100).toFixed(1)}%</span><span>{C.currency} {fmt(invMwst)}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", borderTop:"2px solid #1C1C1E", paddingTop:10 }}>
                        <span style={{ fontSize:15, fontWeight:700, color:"#1C1C1E" }}>Total</span>
                        <span style={{ fontSize:18, fontWeight:800, color:ACCENT }}>{C.currency} {fmt(invTotal)}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid #F2F2F7", fontSize:10, color:"#8E8E93", lineHeight:1.7 }}>
                      {C.paymentTerms}<br/>{C.bankDetails}<br/>MWST-Nr. {C.vatId}
                    </div>
                  </div>

                  <BtnPrimary onClick={()=>{ printInvoiceDoc(inv); setInvoices(invoices.map(i=>i.id===inv.id?{...i,printed:true}:i)); setSelectedInvoice({...inv,printed:true}); }}>
                    <Icon name="invoice" size={18} color="white"/> Imprimir / Guardar PDF
                  </BtnPrimary>
                </div>
              </>
            );
          })()}

        </div>
      )}

      {/* ── BOTTOM NAV (mobile only) ── */}
      {!isDesktop && (
        <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"white", borderTop:"1px solid #F2F2F7", display:"flex", padding:"10px 0 24px", zIndex:100 }}>
          {[
            { key:"home",    icon:"orders",  label:"Home"    },
            { key:"scan",    icon:"scan",    label:"Scan"    },
            { key:"orders",  icon:"gem",     label:"Orders"  },
            { key:"invoice", icon:"invoice", label:"Invoice" },
          ].map(({ key, icon, label }) => (
            <button key={key} onClick={()=>{ setTab(key); if(key==="scan")resetPhoto(); if(key==="orders"){ setView("list"); } if(key==="invoice"){ setInvView("list"); setSelectedInvoice(null); } }} style={{ flex:1, background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"4px 0" }}>
              <div style={{ width:44, height:44, borderRadius:14, background: tab===key ? `${ACCENT}15` : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
                <Icon name={icon} size={22} color={tab===key ? ACCENT : "#8E8E93"}/>
              </div>
              <span style={{ fontSize:10, fontWeight: tab===key ? 700 : 500, color: tab===key ? ACCENT : "#8E8E93", letterSpacing:"0.02em" }}>{label}</span>
            </button>
          ))}
        </div>
      )}
      </div>{/* end content wrapper */}

      {/* ── RECHNUNG PREVIEW OVERLAY ── */}
      {rechnungData && (() => {
        const { order, unitPrice, porto = 0 } = rechnungData;
        const qty      = parseFloat(order.pieces) || 1;
        const price    = parseFloat(unitPrice) || 0;
        const sub      = qty * price;
        const mwst     = sub * C.taxRate;
        const total    = sub + porto + mwst;
        const fC       = n => `CHF ${Number(n).toFixed(2).replace(".", ",")}`;
        const invNr    = `RS-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}-${order.id}`;
        const desc     = [order.field1, order.field2].filter(Boolean).join(" · ");
        const dateStr  = order.received ? new Date(order.received+"T12:00:00").toLocaleDateString("de-CH") : new Date().toLocaleDateString("de-CH");

        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:1000, overflowY:"auto", display:"flex", flexDirection:"column" }}>
            {/* top bar */}
            <div style={{ position:"sticky", top:0, background:"white", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:"1px solid #E5E5EA", zIndex:10, flexShrink:0 }}>
              <button onClick={()=>setRechnungData(null)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#1C1C1E", padding:"0 4px" }}>×</button>
              <span style={{ fontWeight:700, fontSize:15, fontFamily:"'DM Sans',sans-serif" }}>Rechnung Vorschau</span>
              <button onClick={()=>printRechnung(order, unitPrice, porto)} style={{ background:ACCENT, color:"white", border:"none", borderRadius:10, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>⎙ Drucken / PDF</button>
            </div>

            {/* invoice paper */}
            <div style={{ background:"#F2F2F7", flex:1, padding:"24px 16px 40px" }}>
              <div style={{ background:"white", maxWidth:640, margin:"0 auto", padding:"40px 44px", boxShadow:"0 4px 24px rgba(0,0,0,0.12)", borderRadius:4, fontFamily:"Arial, Helvetica, sans-serif" }}>

                {/* LOGO */}
                <div style={{ marginBottom:28 }}>
                  <img src="/logo.png" alt={C.businessName} style={{ height:90, objectFit:"contain" }} />
                </div>

                {/* ADDRESS */}
                <div style={{ fontSize:11, color:"#444", lineHeight:1.8, marginBottom:30 }}>
                  {C.address.split("\n").map((l,i)=><span key={i}>{l}<br/></span>)}
                  Telefon {C.phone}
                </div>

                {/* RECHNUNG title + date + recipient row */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:32 }}>
                  <div>
                    <div style={{ fontFamily:"'Arial Black',Arial,sans-serif", fontSize:21, fontWeight:900, letterSpacing:"0.18em", color:"#555", textTransform:"uppercase", marginBottom:8 }}>RECHNUNG</div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#1a1a1a" }}>DATUM: {dateStr}</div>
                  </div>
                  <div style={{ textAlign:"left", fontSize:11, lineHeight:1.9, color:"#1a1a1a", paddingTop:4 }}>
                    <div style={{ fontWeight:600 }}>{order.client}</div>
                    <div style={{ color:"#555" }}>{invNr}</div>
                    <div style={{ color:"#555" }}>{C.bankDetails}</div>
                  </div>
                </div>

                {/* TABLE */}
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, marginBottom:0 }}>
                  <thead>
                    <tr style={{ background:"#e8edf2", color:"#1a1a1a" }}>
                      <th style={{ padding:"7px 10px", textAlign:"left", fontWeight:700, letterSpacing:"0.04em" }}>BESCHREIBUNG</th>
                      <th style={{ padding:"7px 10px", textAlign:"right", fontWeight:700, letterSpacing:"0.04em" }}>Anzahl</th>
                      <th style={{ padding:"7px 10px", textAlign:"right", fontWeight:700, letterSpacing:"0.04em" }}>Stückpreis</th>
                      <th style={{ padding:"7px 10px", textAlign:"right", fontWeight:700 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding:"8px 10px", borderBottom:"1px solid #e0e0e0", fontSize:11 }}>{desc || order.notes || "—"}</td>
                      <td style={{ padding:"8px 10px", borderBottom:"1px solid #e0e0e0", textAlign:"right" }}>{Number(qty).toFixed(2)}</td>
                      <td style={{ padding:"8px 10px", borderBottom:"1px solid #e0e0e0", textAlign:"right" }}>{fC(price)}</td>
                      <td style={{ padding:"8px 10px", borderBottom:"1px solid #e0e0e0", textAlign:"right" }}>{fC(sub)}</td>
                    </tr>
                    {/* totals rows */}
                    <tr><td colSpan={3} style={{ padding:"6px 10px", textAlign:"right", fontSize:11, color:"#333" }}>Total ohne {C.taxLabel}</td><td style={{ padding:"6px 10px", textAlign:"right", fontSize:11 }}>{fC(sub)}</td></tr>
                    <tr><td colSpan={3} style={{ padding:"4px 10px", textAlign:"right", fontSize:11, color:"#333" }}>Porto</td><td style={{ padding:"4px 10px", textAlign:"right", fontSize:11 }}>{fC(porto)}</td></tr>
                    <tr><td colSpan={3} style={{ padding:"4px 10px", textAlign:"right", fontSize:11, color:"#333" }}>{(C.taxRate*100).toFixed(1).replace(".",",")}% {C.taxLabel}</td>
                      <td style={{ padding:"4px 10px", textAlign:"right", fontSize:11 }}>CHF &nbsp;{Number(mwst).toFixed(2).replace(".",",")}</td></tr>
                    <tr style={{ borderTop:"2px solid #1a1a1a" }}>
                      <td colSpan={3} style={{ padding:"8px 10px", textAlign:"right", fontWeight:700, fontSize:12, letterSpacing:"0.06em" }}>RECHNUNGSBETRAG</td>
                      <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:700, fontSize:13, textDecoration:"underline", borderLeft:"1px solid #1a1a1a" }}>CHF {Number(total).toFixed(2).replace(".",",")}</td>
                    </tr>
                  </tbody>
                </table>

                {/* FOOTER */}
                <div style={{ marginTop:24, textAlign:"left" }}>
                  <img src="/qr.png" alt="QR Zahlung" style={{ width:120, height:120, objectFit:"contain" }} />
                </div>
                <div style={{ marginTop:16, fontSize:10.5, color:"#333", lineHeight:2 }}>
                  Zahlungsempfänger: <strong>{C.businessName}</strong><br/>
                  {C.bankDetails}<br/>
                  {C.paymentTerms}<br/>
                  MWST-Nr. {C.vatId}
                </div>
                <div style={{ marginTop:20, fontSize:11, color:"#333", lineHeight:2 }}>
                  Danke für Ihren geschätzten Auftrag.<br/><br/>
                  Freundliche Grüsse<br/><br/>
                  {C.ownerName}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
