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

const newOrder  = () => ({ id: String(Date.now()).slice(-4), client:"", clientId:"", received: new Date().toISOString().split("T")[0], field1:"", field2:"", description:"", deadline:"", pieces:"", status:"received", notes:"", amount:0 });
const newClient = () => ({ id: String(Date.now()), name:"", company:"", address:"", phone:"", email:"" });
const newItem  = () => ({ id: Date.now()+Math.random(), desc:"", price:"" });
const compressPhoto = (dataUrl) => new Promise(res => {
  const img = new Image();
  img.onload = () => {
    const MAX = 600;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    res(c.toDataURL("image/jpeg", 0.7));
  };
  img.src = dataUrl;
});
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
    person:      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    users:       <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    receipt:     <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16l3-2 2 2 2-2 2 2 2-2 2 2 1-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg>,
    checkCircle: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>,
    print:       <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
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

const CHEVRON_URL = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238E8E93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C%2Fsvg%3E\")";
const Select = ({ children, ...props }) => (
  <select {...props} style={{ width:"100%", padding:"13px 40px 13px 14px", border:"1.5px solid #E5E5EA", borderRadius:12, fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:15, color: props.value ? "#1C1C1E" : "#8E8E93", background:"#FAFAFA", outline:"none", boxSizing:"border-box", appearance:"none", WebkitAppearance:"none", backgroundImage:CHEVRON_URL, backgroundRepeat:"no-repeat", backgroundPosition:"right 14px center", ...props.style }}>
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
  const [invClientAddress, setInvClientAddress] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, color="#34C759") => { setToast({msg,color}); setTimeout(()=>setToast(null), 2000); };
  const [clients, setClients]     = useState(() => { try { const s = localStorage.getItem("ssp_clients"); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [clientView, setClientView] = useState("list"); // "list" | "new" | "edit" | "detail"
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientDraft, setClientDraft] = useState(newClient());
  const [filterClient, setFilterClient] = useState("all");
  const [workOrderPreview, setWorkOrderPreview] = useState(null);
  const [urgentModal, setUrgentModal] = useState(false);
  const [doneModal, setDoneModal] = useState(null); // order to prompt invoice creation
  const [rechnungData, setRechnungData] = useState(null);
  const [photoStep, setPhotoStep] = useState("capture");
  const [imgData, setImgData]   = useState(null);
  const [imgFile, setImgFile]   = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg]       = useState("");
  const [extracted, setExtracted] = useState(null);
  const fileRef = useRef();
  const draftPhotoRef = useRef();
  const calStripRef = useRef();
  const TODAY = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [dayNotes, setDayNotes] = useState(() => { try { return JSON.parse(localStorage.getItem("ssp_day_notes")) || {}; } catch { return {}; } });
  const [noteAlert, setNoteAlert] = useState(null); // { date, text } to show on load
  const [dayModal, setDayModal]   = useState(null); // date string or null

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("ssp_orders", JSON.stringify(orders)); }
    catch(e) { try { localStorage.setItem("ssp_orders", JSON.stringify(orders.map(o=>({...o,photo:null})))); } catch(_) {} }
  }, [orders]);
  useEffect(() => { try { localStorage.setItem("ssp_invoices", JSON.stringify(invoices)); } catch(_) {} }, [invoices]);
  useEffect(() => { try { localStorage.setItem("ssp_clients", JSON.stringify(clients)); } catch(_) {} }, [clients]);
  useEffect(() => { try { localStorage.setItem("ssp_day_notes", JSON.stringify(dayNotes)); } catch(_) {} }, [dayNotes]);

  // Scroll calendar strip to today on mount
  useEffect(() => {
    if(calStripRef.current) {
      const todayEl = calStripRef.current.querySelector("[data-today='true']");
      if(todayEl) todayEl.scrollIntoView({ inline:"center", block:"nearest", behavior:"instant" });
    }
  }, []);

  // Show alert for today's note if flagged
  useEffect(() => {
    const n = dayNotes[TODAY];
    if(n && n.alert && n.text) setNoteAlert({ date: TODAY, text: n.text });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-show urgent modal once per session if there are upcoming deliveries
  useEffect(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate()+5);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    const hasUpcoming = orders.some(o => o.deadline && o.deadline <= cutoffStr && o.status !== "done" && o.status !== "invoiced");
    if(hasUpcoming && !sessionStorage.getItem("urgent_shown")) {
      setUrgentModal(true);
      sessionStorage.setItem("urgent_shown","1");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = orders.filter(o => { const statusOk = filterStatus === "all" || o.status === filterStatus; const dateOk = !filterDate || o.received === filterDate; const clientOk = filterClient === "all" || o.client === filterClient; return statusOk && dateOk && clientOk; });
  const counts = Object.keys(C.statuses).reduce((a,k) => ({...a,[k]:orders.filter(o=>o.status===k).length}),{});

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

  const goHome = () => { setTab("home"); setView("list"); setPhotoStep("capture"); setInvView("list"); setClientView("list"); };

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
      <strong>${inv.client}</strong><br>
      ${inv.clientAddress ? inv.clientAddress.replace(/\n/g,"<br>")+"<br>" : ""}
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

  // ── PRINT WORK ORDER (Arbeitsauftrag) — no client info ──
  const printWorkOrder = (order) => {
    const fmtDate = d => d ? new Date(d+"T12:00:00").toLocaleDateString("de-CH") : "";
    const GOLD = "#B8960C";
    const photoHtml = order.photo
      ? `<img src="${order.photo}" alt="Schmuckstück" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`
      : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#C9A84C;font-size:13pt;letter-spacing:0.05em;">[ FOTO DES SCHMUCKSTÜCKS EINFÜGEN ]</div>`;
    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<title>Arbeitsauftrag #${order.id}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1a1a1a; padding: 32px 44px; max-width: 820px; margin: 0 auto; }
  .header { display:flex; align-items:flex-start; justify-content:space-between; padding-bottom:16px; border-bottom:1.5px solid #ccc; margin-bottom:24px; }
  .title-block { text-align:right; }
  .title { font-size:22pt; font-weight:900; letter-spacing:3px; color:#1a1a1a; line-height:1; }
  .subtitle { font-size:9.5pt; font-style:italic; color:#666; margin-top:4px; }
  .fields { display:grid; grid-template-columns:1fr 1fr; gap:0 40px; margin-bottom:22px; }
  .field-label { font-size:8.5pt; font-weight:700; color:${GOLD}; letter-spacing:0.12em; text-transform:uppercase; margin-bottom:6px; }
  .field-line { border-bottom:1px solid #bbb; height:22px; }
  .field-block { margin-bottom:18px; }
  .photo-box { border:1.5px solid ${GOLD}; border-radius:8px; background:#faf8f3; height:280px; overflow:hidden; margin-bottom:20px; }
  .desc-box { border:1.5px solid ${GOLD}; border-radius:8px; padding:14px 16px; min-height:110px; }
  .desc-label { font-size:8.5pt; font-weight:700; color:${GOLD}; letter-spacing:0.12em; text-transform:uppercase; margin-bottom:8px; }
  .desc-text { font-size:11pt; color:#1a1a1a; line-height:1.6; white-space:pre-wrap; }
  .footer { margin-top:28px; padding-top:12px; border-top:1px solid #ccc; text-align:center; font-size:8.5pt; color:#666; font-style:italic; letter-spacing:0.02em; }
  @media print {
    @page { size:A4; margin:10mm 12mm; }
    body { padding:0; }
  }
</style></head>
<body>
  <div class="header">
    <img src="${window.location.origin}/logo.png" alt="${C.businessName}" style="height:70px;object-fit:contain;">
    <div class="title-block">
      <div class="title">ARBEITSAUFTRAG</div>
      <div class="subtitle">Wir setzen keine Steine. Wir setzen Maßstäbe.</div>
    </div>
  </div>

  <div class="fields">
    <div class="field-block">
      <div class="field-label">Auftragsnummer</div>
      <div class="field-line" style="padding-bottom:4px;font-size:12pt;font-weight:600;">#${order.id}</div>
    </div>
    <div class="field-block">
      <div class="field-label">Verantwortlicher</div>
      <div class="field-line"></div>
    </div>
  </div>

  <div class="fields">
    <div class="field-block">
      <div class="field-label">Startdatum</div>
      <div class="field-line" style="padding-bottom:4px;">${fmtDate(order.received)}</div>
    </div>
    <div class="field-block">
      <div class="field-label">Lieferdatum</div>
      <div class="field-line" style="padding-bottom:4px;">${fmtDate(order.deadline)}</div>
    </div>
  </div>

  <div class="photo-box">${photoHtml}</div>

  <div class="desc-box">
    <div class="desc-label">Arbeitsbeschreibung</div>
    <div class="desc-text">${order.description ? order.description.replace(/</g,"&lt;").replace(/>/g,"&gt;") : ""}</div>
  </div>

  <div class="footer">
    ${C.address.replace(/\n/g," ◆ ")} ◆ ${C.phone} ◆ info@stoneartprecision.com
  </div>

  ${["<script>window.onload=()=>{ window.print(); }</","script>"].join("")}
</body></html>`;
    const w = window.open("", "_blank");
    if(w){ w.document.write(html); w.document.close(); }
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
            { key:"clients", icon:"person",  label:"Clients" },
            { key:"invoice", icon:"invoice", label:"Invoice" },
          ].map(({ key, icon, label }) => (
            <button key={key} onClick={()=>{ setTab(key); if(key==="scan")resetPhoto(); if(key==="orders")setView("list"); if(key==="invoice")setInvView("list"); if(key==="clients")setClientView("list"); }}
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
          {/* TOP BAR — compact */}
          <div style={{ padding: isDesktop ? "28px 40px 16px" : "52px 20px 14px", background:"white", borderBottom:"1px solid #F2F2F7" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:12, color:"#8E8E93", fontWeight:500, fontFamily:"'DM Sans',sans-serif" }}>{greeting}</div>
                <div style={{ fontSize:17, fontWeight:700, color:"#1C1C1E", fontFamily:"'DM Sans',sans-serif" }}>{C.ownerName.split(" ")[0]}</div>
              </div>
              <div style={{ position:"relative" }}>
                <button style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="bell" size={20} color="#8E8E93"/></button>
                <div style={{ position:"absolute", top:2, right:2, width:7, height:7, borderRadius:"50%", background:ACCENT }} />
              </div>
            </div>
          </div>

          {/* QUICK ACTIONS — below header, full width */}
          <div style={{ padding: isDesktop ? "16px 40px" : "14px 16px", background:"white", borderBottom:"1px solid #F2F2F7", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            {[
              { icon:"scan",    label:"Scan Order",   sub:"Photo → auto order", action:()=>{ setTab("scan"); resetPhoto(); } },
              { icon:"gem",     label:"New Order",    sub:"Manual entry",       action:()=>{ setTab("orders"); setView("new"); } },
              { icon:"invoice", label:"New Invoice",  sub:"Create & save",      action:()=>{ setTab("invoice"); setInvView("list"); } },
            ].map(({ icon, label, sub, action }) => (
              <button key={label} onClick={action} style={{ background:"#F8F8F8", border:"1.5px solid #F2F2F7", borderRadius:18, padding:"18px 10px 16px", textAlign:"center", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:9 }}>
                <div style={{ width:52, height:52, background:"white", borderRadius:15, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.09)" }}>
                  <Icon name={icon} size={24} color={ACCENT}/>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:"#1C1C1E", lineHeight:1.3 }}>{label}</div>
                <div style={{ fontSize:11, color:"#8E8E93", lineHeight:1.2 }}>{sub}</div>
              </button>
            ))}
          </div>

          {/* ── CALENDAR STRIP ── */}
          <div style={{ padding:"14px 16px 0", background:"white" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"'DM Sans',sans-serif" }}>Schedule</div>
          </div>
          {(() => {
            const days = [];
            for(let i = -7; i <= 30; i++) {
              const d = new Date(); d.setDate(d.getDate()+i);
              days.push(d.toISOString().split("T")[0]);
            }
            const DAYS_ES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
            return (
              <>
                {/* Scrollable day pills */}
                <div ref={calStripRef} style={{ overflowX:"auto", display:"flex", gap:6, padding:"12px 16px", background:"white", borderBottom:"1px solid #F2F2F7", scrollbarWidth:"none" }}>
                  {days.map(d => {
                    const date = new Date(d+"T12:00:00");
                    const isToday   = d === TODAY;
                    const isSelected = d === selectedDate;
                    const hasOrders = orders.some(o => o.deadline === d && o.status !== "done" && o.status !== "invoiced");
                    const hasNote   = dayNotes[d]?.text;
                    const isPast    = d < TODAY;
                    return (
                      <button key={d} data-today={isToday||undefined} onClick={()=>{ setSelectedDate(d); setDayModal(d); }}
                        style={{ flexShrink:0, width:52, padding:"8px 4px", borderRadius:14, border: isSelected ? `2px solid ${ACCENT}` : "1.5px solid #F2F2F7", background: isSelected ? ACCENT : isToday ? `${ACCENT}12` : "white", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                        <span style={{ fontSize:9, fontWeight:600, textTransform:"uppercase", color: isSelected ? "rgba(255,255,255,0.8)" : "#8E8E93", letterSpacing:"0.06em" }}>{DAYS_ES[date.getDay()]}</span>
                        <span style={{ fontSize:17, fontWeight:700, color: isSelected ? "white" : isPast ? "#C7C7CC" : "#1C1C1E", lineHeight:1 }}>{date.getDate()}</span>
                        <div style={{ display:"flex", gap:3, height:6, alignItems:"center" }}>
                          {hasOrders && <div style={{ width:5, height:5, borderRadius:"50%", background: isSelected?"rgba(255,255,255,0.8)":ACCENT }}/>}
                          {hasNote   && <div style={{ width:5, height:5, borderRadius:"50%", background: isSelected?"rgba(255,255,255,0.6)":"#007AFF" }}/>}
                        </div>
                      </button>
                    );
                  })}
                </div>

              </>
            );
          })()}

          <div style={{ padding: isDesktop ? "20px 40px 60px" : "16px 16px 100px" }}>

            {/* URGENT ALERT BANNER */}
            {(() => {
              const today = new Date().toISOString().split("T")[0];
              const cutoff = new Date(); cutoff.setDate(cutoff.getDate()+3);
              const cutoffStr = cutoff.toISOString().split("T")[0];
              const overdue  = orders.filter(o => o.deadline && o.deadline < today  && o.status !== "done" && o.status !== "invoiced");
              const dueToday = orders.filter(o => o.deadline && o.deadline === today && o.status !== "done" && o.status !== "invoiced");
              const dueSoon  = orders.filter(o => o.deadline && o.deadline > today && o.deadline <= cutoffStr && o.status !== "done" && o.status !== "invoiced");
              if(!overdue.length && !dueToday.length && !dueSoon.length) return null;
              const critical = overdue.length + dueToday.length;
              const bgColor  = critical > 0 ? "#FF3B30" : "#FF9500";
              const msg      = overdue.length   ? `${overdue.length} overdue order${overdue.length>1?"s":""}${dueToday.length ? ` · ${dueToday.length} due today` : ""}`
                             : dueToday.length  ? `${dueToday.length} deliver${dueToday.length>1?"ies":"y"} due today`
                             : `${dueSoon.length} deliver${dueSoon.length>1?"ies":"y"} in the next 3 days`;
              return (
                <button onClick={()=>setUrgentModal(true)} style={{ width:"100%", background:`linear-gradient(135deg, ${bgColor}, ${bgColor}dd)`, border:"none", borderRadius:18, padding:"16px 20px", marginBottom:16, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, boxShadow:`0 4px 16px ${bgColor}40` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:42, height:42, borderRadius:13, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Icon name="bell" size={22} color="white"/>
                    </div>
                    <div>
                      <div style={{ fontSize:15, fontWeight:700, color:"white", marginBottom:2 }}>{msg}</div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,0.8)" }}>Tap to see details</div>
                    </div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              );
            })()}


            {/* UPCOMING DELIVERIES */}
            {(() => {
              const today = new Date().toISOString().split("T")[0];
              const cutoff = new Date(); cutoff.setDate(cutoff.getDate()+7);
              const cutoffStr = cutoff.toISOString().split("T")[0];
              const upcoming = orders
                .filter(o => o.deadline && o.deadline <= cutoffStr && o.status !== "done" && o.status !== "invoiced")
                .sort((a,b) => a.deadline.localeCompare(b.deadline));
              if(!upcoming.length) return null;
              const getLabel = (d) => {
                if(d < today) return { text:"Overdue", color:"#FF3B30" };
                if(d === today) return { text:"Today", color:"#FF9500" };
                const diff = Math.round((new Date(d+"T12:00:00")-new Date(today+"T12:00:00"))/(864e5));
                if(diff === 1) return { text:"Tomorrow", color:"#FF9500" };
                return { text:`${diff}d`, color:"#007AFF" };
              };
              return (
                <>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"'DM Sans',sans-serif" }}>Upcoming deliveries</div>
                    <button onClick={()=>setUrgentModal(true)} style={{ background:"none", border:"none", fontSize:12, color:ACCENT, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", padding:0 }}>View all</button>
                  </div>
                  {upcoming.slice(0,4).map(o => {
                    const { text, color } = getLabel(o.deadline);
                    return (
                      <button key={o.id} onClick={()=>{ setSelectedId(o.id); setView("detail"); setTab("orders"); }}
                        style={{ width:"100%", background:"white", border:"1.5px solid #F2F2F7", borderRadius:14, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12, cursor:"pointer", textAlign:"left", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
                        <div style={{ width:4, alignSelf:"stretch", borderRadius:4, background:color, flexShrink:0 }}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:"#1C1C1E" }}>{o.client || `#${o.id}`}</div>
                          {o.description && <div style={{ fontSize:12, color:"#8E8E93", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.description}</div>}
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color, background:`${color}15`, padding:"3px 9px", borderRadius:7, flexShrink:0 }}>{text}</span>
                      </button>
                    );
                  })}
                </>
              );
            })()}

            {/* RECENT ORDERS */}
            <div style={{ fontSize:12, fontWeight:700, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"'DM Sans',sans-serif", marginBottom:10, marginTop:8 }}>Recent orders</div>
            {orders.slice(0,3).map(o => (
              <button key={o.id} onClick={()=>{ setSelectedId(o.id); setView("detail"); setTab("orders"); }}
                style={{ width:"100%", background:"white", border:"1.5px solid #F2F2F7", borderRadius:14, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", textAlign:"left", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:"#1C1C1E", marginBottom:2 }}>{o.client || `#${o.id}`}</div>
                  <div style={{ fontSize:12, color:"#8E8E93", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>#{o.id}{o.deadline ? ` · ${o.deadline}` : ""}{o.description ? ` · ${o.description}` : ""}</div>
                </div>
                <StatusPill status={o.status}/>
              </button>
            ))}
            <button onClick={()=>setTab("orders")} style={{ width:"100%", padding:"12px", background:"none", border:"1.5px solid #E5E5EA", borderRadius:14, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:"#8E8E93", cursor:"pointer", marginTop:4 }}>
              View all orders →
            </button>

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
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ const f=e.target.files[0]; if(!f)return; setImgFile(f); const r=new FileReader(); r.onload=ev=>{ compressPhoto(ev.target.result).then(c=>{ setImgData(c); setPhotoStep("preview"); }); }; r.readAsDataURL(f); }}/>

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
              {view==="detail" && selectedOrder && (
                <button onClick={()=>setWorkOrderPreview(selectedOrder)} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#F2F2F7", border:"none", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:600, color:"#1C1C1E", fontFamily:"'DM Sans',sans-serif" }}>
                  <Icon name="print" size={16} color="#1C1C1E"/> Drucken
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

                
                {/* Client filter (if clients saved) */}
                {clients.length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <Select value={filterClient} onChange={e=>setFilterClient(e.target.value)} style={{ fontSize:13, padding:"9px 40px 9px 12px", borderRadius:10, color: filterClient!=="all"?ACCENT:"#8E8E93" }}>
                      <option value="all">All clients</option>
                      {[...new Set(orders.map(o=>o.client).filter(Boolean))].sort().map(c=><option key={c} value={c}>{c}</option>)}
                    </Select>
                  </div>
                )}
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
                          {[o.deadline && `Delivery: ${o.deadline}`, o.pieces && `${o.pieces} ${C.piecesLabel}`].filter(Boolean).join(" · ") || o.description?.slice(0,40) || "—"}
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
                {/* Photo */}
                <input ref={draftPhotoRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }}
                  onChange={e=>{ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>{ compressPhoto(ev.target.result).then(c=>setDraft(d=>({...d,photo:c}))); }; r.readAsDataURL(f); }}/>
                {draft.photo
                  ? <div style={{ position:"relative", marginBottom:14 }}>
                      <img src={draft.photo} alt="product" style={{ width:"100%", borderRadius:12, objectFit:"cover", maxHeight:200, display:"block" }}/>
                      <button onClick={()=>setDraft(d=>({...d,photo:null}))} style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.5)", border:"none", borderRadius:"50%", width:28, height:28, color:"white", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                    </div>
                  : <button onClick={()=>draftPhotoRef.current.click()} style={{ width:"100%", padding:"14px", background:"#F2F2F7", border:"2px dashed #E5E5EA", borderRadius:12, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:"#8E8E93", cursor:"pointer", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      <Icon name="camera" size={18} color="#8E8E93"/> Add product photo
                    </button>
                }
                <Field label="Client *">
                  {clients.length > 0
                    ? <Select value={draft.clientId} onChange={e=>{
                        const c = clients.find(x=>x.id===e.target.value);
                        setDraft({...draft, clientId: e.target.value, client: c ? (c.company||c.name) : "" });
                      }}>
                        <option value="">— Select client —</option>
                        {clients.map(c=><option key={c.id} value={c.id}>{c.company||c.name}{c.company&&c.name?" ("+c.name+")":""}</option>)}
                      </Select>
                    : <Input placeholder="Client or company" value={draft.client} onChange={e=>setDraft({...draft,client:e.target.value})}/>
                  }
                  {clients.length > 0 && <div onClick={()=>{ setTab("clients"); setClientView("new"); setClientDraft(newClient()); }} style={{ fontSize:12, color:ACCENT, fontWeight:600, marginTop:6, cursor:"pointer" }}>+ Add new client</div>}
                </Field>
                <Field label="Work description">
                  <Textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Work description sent by client…"/>
                </Field>
                <Field label="Delivery date">
                  <Input type="date" value={draft.deadline} onChange={e=>setDraft({...draft,deadline:e.target.value})}/>
                </Field>
                <Field label={C.piecesLabel}>
                  <Input type="number" placeholder="0" value={draft.pieces} onChange={e=>setDraft({...draft,pieces:e.target.value})}/>
                </Field>
                <BtnPrimary disabled={!draft.client} onClick={()=>{ if(draft.client){ setOrders([{...draft},...orders]); syncToSheets(draft); setDraft(newOrder()); setView("list"); } }}>
                  Save Order
                </BtnPrimary>
              </Card>
            )}

            {/* ── DETAIL ── */}
            {view==="detail" && selectedOrder && (
              <>
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
                      ["Delivery", selectedOrder.deadline],
                      [C.piecesLabel, selectedOrder.pieces],
                    ].filter(([,v])=>v).map(([l,v])=>(
                      <div key={l}>
                        <div style={{ fontSize:11, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, marginBottom:4 }}>{l}</div>
                        <div style={{ fontSize:14, fontWeight:600, color:"#1C1C1E" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {selectedOrder.description && (
                    <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid #F2F2F7" }}>
                      <div style={{ fontSize:11, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, marginBottom:6 }}>Description</div>
                      <div style={{ fontSize:14, color:"#1C1C1E", lineHeight:1.5 }}>{selectedOrder.description}</div>
                    </div>
                  )}
                </Card>

                {/* Status selector — compact horizontal, only 3 main statuses */}
                <div style={{ display:"flex", gap:8, marginBottom:20 }}>
                  {[["received","Received","#FF9500"],["inprogress","In Progress","#007AFF"],["done","Done","#34C759"]].map(([key,label,color])=>{
                    const active = selectedOrder.status===key || (selectedOrder.status==="invoiced" && key==="done");
                    return (
                      <button key={key} onClick={()=>{
                        if(active) return;
                        setOrders(orders.map(o=>o.id===selectedOrder.id?{...o,status:key}:o));
                        if(key==="done") {
                          setDoneModal(selectedOrder.id);
                        } else {
                          showToast(`${label}`, color);
                        }
                      }}
                        style={{ flex:1, padding:"10px 6px", borderRadius:12, border:`1.5px solid ${active?color:"#E5E5EA"}`, background: active?`${color}18`:"white", cursor: active?"default":"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:5, transition:"all 0.15s" }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background: active?color:"#C7C7CC" }}/>
                        <span style={{ fontSize:11, fontWeight: active?700:500, color: active?color:"#8E8E93", fontFamily:"'DM Sans',sans-serif" }}>{label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Factura — only when done */}
                {selectedOrder.status==="done" && (
                  <Card id="invoice-section">
                    <div style={{ fontSize:13, fontWeight:600, color:"#1C1C1E", marginBottom:12 }}>Create invoice for this order</div>
                    <Field label={`Amount (${C.currency})`}>
                      <Input
                        type="number" placeholder="0.00"
                        value={selectedOrder.amount||""}
                        onChange={e=>setOrders(orders.map(o=>o.id===selectedOrder.id?{...o,amount:parseFloat(e.target.value)||0}:o))}
                      />
                    </Field>
                    {selectedOrder.amount>0 && (
                      <div style={{ fontSize:12, color:"#8E8E93", marginBottom:14 }}>
                        + {(C.taxRate*100).toFixed(1)}% MWST = <strong style={{color:ACCENT}}>{C.currency} {fmt(selectedOrder.amount*(1+C.taxRate))}</strong>
                      </div>
                    )}
                    <BtnPrimary disabled={!selectedOrder.amount} onClick={()=>{
                      const desc = [selectedOrder.field1, selectedOrder.field2].filter(Boolean).join(" · ") || selectedOrder.notes || `Auftrag #${selectedOrder.id}`;
                      setInvClient(selectedOrder.client);
                      setInvDate(selectedOrder.received || new Date().toISOString().split("T")[0]);
                      setInvPorto("");
                      setItems([{ id:Date.now()+Math.random(), desc, price: selectedOrder.amount, orderRef: selectedOrder.id }]);
                      setInvSelectedOrders([selectedOrder.id]);
                      setTab("invoice");
                      setInvView("new");
                    }} style={{ margin:0 }}>
                      <Icon name="invoice" size={16} color="white"/> Go to invoice builder
                    </BtnPrimary>
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
                    {invoices.length > 0 && <div style={{ fontSize:12, color:"#8E8E93", marginTop:2 }}>{invoices.length} invoice{invoices.length!==1?"s":""} · {invoices.filter(i=>!i.printed).length} unprinted</div>}
                  </div>
                  <button onClick={()=>{ setInvClient(""); setInvClientAddress(""); setInvDate(new Date().toISOString().split("T")[0]); setInvSelectedOrders([]); setInvPorto(""); setItems([newItem()]); setInvView("new"); }}
                    style={{ background:ACCENT, color:"white", border:"none", borderRadius:12, padding:"10px 18px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    + New Invoice
                  </button>
                </div>
              </div>
              <div style={{ padding: isDesktop?"20px 40px 60px":"20px 16px 100px" }}>
                {invoices.length === 0 && (
                  <div style={{ textAlign:"center", padding:"48px 24px" }}>
                    <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}><Icon name="receipt" size={48} color="#C7C7CC"/></div>
                    <div style={{ fontSize:15, fontWeight:600, color:"#1C1C1E", marginBottom:6 }}>No invoices yet</div>
                    <div style={{ fontSize:13, color:"#8E8E93", lineHeight:1.6 }}>Invoices created from orders appear here.<br/>You can also create one manually.</div>
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
            // Orders done but not yet invoiced (exclude already linked)
            const availableOrders = orders.filter(o => (o.status==="done" || o.status==="received" || o.status==="inprogress") && o.status!=="invoiced");
            const saveInvoice = (print) => {
              const validItems = items.filter(it=>it.desc||it.price);
              const inv = {
                id: Date.now(),
                number: genInvNumber(invoices),
                client: invClient,
                clientAddress: invClientAddress,
                date: invDate,
                porto: invPorto,
                items: validItems,
                printed: print,
                createdAt: new Date().toISOString(),
              };
              // Mark linked orders as invoiced
              const linkedIds = validItems.map(it=>it.orderRef).filter(Boolean);
              if(linkedIds.length) setOrders(orders.map(o=>linkedIds.includes(o.id)?{...o,status:"invoiced"}:o));
              setInvoices([...invoices, inv]);
              if(print) printInvoiceDoc(inv);
              setInvSelectedOrders([]);
              setInvView("list");
              showToast("Invoice saved","#34C759");
            };
            return (
              <>
                {/* Header with live total */}
                <div style={{ padding: isDesktop?"32px 40px 0":"56px 20px 0", background:"white", borderBottom:"1px solid #F2F2F7", paddingBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <button onClick={()=>{ setInvSelectedOrders([]); setInvView("list"); }} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="back" size={22} color="#1C1C1E"/></button>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:18, fontWeight:700, color:"#1C1C1E" }}>New Invoice</div>
                      {invClient && <div style={{ fontSize:12, color:"#8E8E93", marginTop:1 }}>{invClient}</div>}
                    </div>
                    {draftTotal > 0 && (
                      <div style={{ background:`${ACCENT}15`, borderRadius:10, padding:"6px 12px", textAlign:"right" }}>
                        <div style={{ fontSize:11, color:ACCENT, fontWeight:700 }}>TOTAL</div>
                        <div style={{ fontSize:15, fontWeight:800, color:ACCENT }}>{C.currency} {fmt(draftTotal)}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: isDesktop?"20px 40px 60px":"20px 16px 100px" }}>

                  {/* Client + date */}
                  <Card>
                    <Field label="Client *">
                      {clients.length > 0
                        ? <Select value={invClient} onChange={e=>{
                            const sel = clients.find(c=>c.name===e.target.value || c.company===e.target.value);
                            setInvClient(e.target.value);
                            setInvClientAddress(sel ? [sel.company&&sel.name?sel.company:"", sel.address].filter(Boolean).join("\n") : "");
                          }}>
                            <option value="">— Select client —</option>
                            {clients.map(c=><option key={c.id} value={c.company||c.name}>{c.company||c.name}{c.company&&c.name?" ("+c.name+")":""}</option>)}
                          </Select>
                        : <Input placeholder="Company name" value={invClient} onChange={e=>setInvClient(e.target.value)}/>
                      }
                    </Field>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <Field label="Date"><Input type="date" value={invDate} onChange={e=>setInvDate(e.target.value)}/></Field>
                      <Field label={`Postage (${C.currency})`}><Input type="number" placeholder="0.00" value={invPorto} onChange={e=>setInvPorto(e.target.value)}/></Field>
                    </div>
                  </Card>

                  {/* Orders list — tap to add/remove */}
                  {availableOrders.length > 0 && (
                    <>
                      <SectionTitle>Available orders</SectionTitle>
                      {availableOrders.map(o=>{
                        const linked = invSelectedOrders.includes(o.id);
                        const linkedItem = items.find(it=>it.orderRef===o.id);
                        return (
                          <div key={o.id} style={{ background:"white", border:`1.5px solid ${linked?ACCENT:"#E5E5EA"}`, borderRadius:16, marginBottom:10, overflow:"hidden", transition:"border 0.15s" }}>
                            {/* Order row — tap to toggle */}
                            <div onClick={()=>{
                              if(linked){
                                setInvSelectedOrders(invSelectedOrders.filter(id=>id!==o.id));
                                setItems(items.filter(it=>it.orderRef!==o.id));
                              } else {
                                setInvSelectedOrders([...invSelectedOrders, o.id]);
                                const desc = o.description || `Auftrag #${o.id}`;
                                setItems([...items.filter(it=>it.desc||it.price||it.orderRef), { id:Date.now()+Math.random(), desc, price: o.amount||"", orderRef: o.id }]);
                              }
                            }} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", cursor:"pointer" }}>
                              {o.photo && <img src={o.photo} alt="" style={{ width:36, height:36, borderRadius:8, objectFit:"cover", flexShrink:0 }}/>}
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:14, fontWeight:600, color:"#1C1C1E", marginBottom:2 }}>{o.client}</div>
                                <div style={{ fontSize:12, color:"#8E8E93" }}>#{o.id}{o.deadline ? ` · Delivery: ${o.deadline}` : ""}</div>
                              </div>
                              <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                                {o.status==="done" && <span style={{ fontSize:10, fontWeight:700, color:"#34C759", background:"#34C75915", padding:"3px 8px", borderRadius:6 }}>Done</span>}
                                <div style={{ width:22, height:22, borderRadius:7, border:`2px solid ${linked?ACCENT:"#C7C7CC"}`, background:linked?ACCENT:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                  {linked && <Icon name="check" size={13} color="white"/>}
                                </div>
                              </div>
                            </div>
                            {/* Price input — only when linked */}
                            {linked && (
                              <div style={{ padding:"0 16px 14px", borderTop:"1px solid #F2F2F7" }} onClick={e=>e.stopPropagation()}>
                                <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:10 }}>
                                  <Input
                                    type="number" placeholder="Amount CHF"
                                    value={linkedItem?.price||""}
                                    onChange={e=>setItems(items.map(it=>it.orderRef===o.id?{...it,price:e.target.value}:it))}
                                    style={{ flex:1, marginBottom:0 }}
                                  />
                                  {linkedItem?.price && <span style={{ fontSize:13, fontWeight:700, color:ACCENT, whiteSpace:"nowrap" }}>{C.currency} {fmt(parseFloat(linkedItem.price)||0)}</span>}
                                </div>
                                {linkedItem?.price && (
                                  <div style={{ fontSize:11, color:"#8E8E93", marginTop:6 }}>
                                    + {(C.taxRate*100).toFixed(1)}% MWST = <strong style={{color:"#1C1C1E"}}>{C.currency} {fmt((parseFloat(linkedItem.price)||0)*(1+C.taxRate))}</strong>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Manual items */}
                  <SectionTitle>Manual items</SectionTitle>
                  {items.filter(it=>!it.orderRef).map((it,idx)=>(
                    <Card key={it.id}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em" }}>Manual item {idx+1}</div>
                        <button onClick={()=>setItems(items.filter(i=>i.id!==it.id))} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="trash" size={16} color="#FF3B30"/></button>
                      </div>
                      <Field label="Description"><Input placeholder="e.g. Pavé setting – ring" value={it.desc} onChange={e=>setItems(items.map(i=>i.id===it.id?{...i,desc:e.target.value}:i))}/></Field>
                      <Field label={`Amount (${C.currency})`}><Input type="number" placeholder="0.00" value={it.price} onChange={e=>setItems(items.map(i=>i.id===it.id?{...i,price:e.target.value}:i))}/></Field>
                    </Card>
                  ))}
                  <button onClick={()=>setItems([...items,newItem()])} style={{ width:"100%", padding:"13px", background:"white", border:"2px dashed #E5E5EA", borderRadius:14, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:"#8E8E93", cursor:"pointer", marginBottom:16 }}>+ Add manual item</button>

                  {/* Live total */}
                  {(items.some(it=>it.price)||draftPorto>0) && (
                    <Card style={{ background:"#1C1C1E" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:6 }}><span>Subtotal</span><span>{C.currency} {fmt(draftSub)}</span></div>
                      {draftPorto>0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:6 }}><span>Postage</span><span>{C.currency} {fmt(draftPorto)}</span></div>}
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:10 }}><span>{C.taxLabel} {(C.taxRate*100).toFixed(1)}%</span><span>{C.currency} {fmt(draftTax)}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid rgba(255,255,255,0.15)", paddingTop:12 }}>
                        <span style={{ fontSize:16, fontWeight:700, color:"white" }}>Total</span>
                        <span style={{ fontSize:22, fontWeight:800, color:"white" }}>{C.currency} {fmt(draftTotal)}</span>
                      </div>
                    </Card>
                  )}

                  <BtnPrimary disabled={!invClient||items.every(it=>!it.desc&&!it.price)} onClick={()=>saveInvoice(false)}>
                    <Icon name="invoice" size={18} color="white"/> Save invoice
                  </BtnPrimary>
                  <div style={{ height:10 }}/>
                  <BtnGhost disabled={!invClient||items.every(it=>!it.desc&&!it.price)} onClick={()=>saveInvoice(true)}>
                    {"⎙ Save & print"}
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
                          <th style={{ textAlign:"left", fontSize:10, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", padding:"4px 0 8px", fontWeight:700 }}>Description</th>
                          <th style={{ textAlign:"right", fontSize:10, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", padding:"4px 0 8px", fontWeight:700 }}>Amount</th>
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
                      {invPortoVal>0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#8E8E93", marginBottom:4 }}><span>Postage</span><span>{C.currency} {fmt(invPortoVal)}</span></div>}
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
                    <Icon name="invoice" size={18} color="white"/> Print / Save PDF
                  </BtnPrimary>
                </div>
              </>
            );
          })()}

        </div>
      )}

      {/* ── CLIENTS TAB ── */}
      {tab==="clients" && (
        <div style={{ animation:"fadeUp 0.3s ease" }}>
          {/* Header */}
          <div style={{ padding: isDesktop?"32px 40px 0":"56px 20px 0", background:"white", borderBottom:"1px solid #F2F2F7", paddingBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                {clientView!=="list" && (
                  <button onClick={()=>setClientView("list")} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="back" size={22} color="#1C1C1E"/></button>
                )}
                <div style={{ fontSize:18, fontWeight:700, color:"#1C1C1E" }}>
                  {clientView==="list" ? "Clients" : clientView==="new" ? "New Client" : clientView==="edit" ? "Edit Client" : (clients.find(c=>c.id===selectedClientId)?.company || clients.find(c=>c.id===selectedClientId)?.name || "Client")}
                </div>
              </div>
              {clientView==="list" && (
                <button onClick={()=>{ setClientDraft(newClient()); setClientView("new"); }} style={{ width:36, height:36, borderRadius:"50%", background:ACCENT, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon name="plus" size={18} color="white"/>
                </button>
              )}
              {clientView==="detail" && (
                <button onClick={()=>{ setClientDraft({...clients.find(c=>c.id===selectedClientId)}); setClientView("edit"); }} style={{ background:"none", border:"none", cursor:"pointer", padding:4, fontSize:13, fontWeight:600, color:ACCENT }}>Editar</button>
              )}
            </div>
          </div>

          <div style={{ padding: isDesktop?"20px 40px 60px":"20px 16px 100px" }}>

            {/* ── LIST ── */}
            {clientView==="list" && (
              <>
                {clients.length === 0 && (
                  <div style={{ textAlign:"center", padding:"48px 24px" }}>
                    <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}><Icon name="users" size={48} color="#C7C7CC"/></div>
                    <div style={{ fontSize:15, fontWeight:600, color:"#1C1C1E", marginBottom:6 }}>No clients yet</div>
                    <div style={{ fontSize:13, color:"#8E8E93", lineHeight:1.6, marginBottom:24 }}>Add your clients to assign them to orders and invoices automatically.</div>
                    <BtnPrimary onClick={()=>{ setClientDraft(newClient()); setClientView("new"); }} style={{ maxWidth:220, margin:"0 auto" }}>+ Add client</BtnPrimary>
                  </div>
                )}
                {clients.map(c => {
                  const orderCount = orders.filter(o=>o.clientId===c.id||o.client===(c.company||c.name)).length;
                  return (
                    <Card key={c.id} onClick={()=>{ setSelectedClientId(c.id); setClientView("detail"); }}>
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <div style={{ width:44, height:44, borderRadius:14, background:`${ACCENT}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <Icon name="person" size={22} color={ACCENT}/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:15, fontWeight:700, color:"#1C1C1E" }}>{c.company || c.name}</div>
                          {c.company && c.name && <div style={{ fontSize:12, color:"#8E8E93", marginTop:2 }}>{c.name}</div>}
                          {c.address && <div style={{ fontSize:12, color:"#8E8E93", marginTop:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.address.split("\n")[0]}</div>}
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                          {orderCount > 0 && <span style={{ fontSize:11, fontWeight:700, color:ACCENT, background:`${ACCENT}15`, padding:"3px 9px", borderRadius:8 }}>{orderCount} order{orderCount!==1?"s":""}</span>}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </>
            )}

            {/* ── NEW / EDIT FORM ── */}
            {(clientView==="new" || clientView==="edit") && (
              <Card>
                <Field label="Contact name *">
                  <Input placeholder="Full name" value={clientDraft.name} onChange={e=>setClientDraft({...clientDraft,name:e.target.value})}/>
                </Field>
                <Field label="Company">
                  <Input placeholder="Company name" value={clientDraft.company} onChange={e=>setClientDraft({...clientDraft,company:e.target.value})}/>
                </Field>
                <Field label="Address (for invoices)">
                  <Textarea placeholder={"Street and number\nPostal code, City\nCountry"} value={clientDraft.address} onChange={e=>setClientDraft({...clientDraft,address:e.target.value})} style={{ height:90 }}/>
                </Field>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Field label="Phone">
                    <Input placeholder="+41 …" value={clientDraft.phone} onChange={e=>setClientDraft({...clientDraft,phone:e.target.value})}/>
                  </Field>
                  <Field label="Email">
                    <Input type="email" placeholder="email@company.com" value={clientDraft.email} onChange={e=>setClientDraft({...clientDraft,email:e.target.value})}/>
                  </Field>
                </div>
                {clientView==="edit" && (
                  <button onClick={()=>{ setClients(clients.filter(c=>c.id!==clientDraft.id)); setClientView("list"); showToast("Client deleted","#FF3B30"); }}
                    style={{ background:"none", border:"none", color:"#FF3B30", fontSize:13, fontWeight:600, cursor:"pointer", padding:"4px 0", marginBottom:8 }}>
                    Delete client
                  </button>
                )}
                <BtnPrimary disabled={!clientDraft.name && !clientDraft.company} onClick={()=>{
                  if(!clientDraft.name && !clientDraft.company) return;
                  if(clientView==="edit"){
                    setClients(clients.map(c=>c.id===clientDraft.id ? clientDraft : c));
                    setClientView("detail");
                    showToast("Client updated");
                  } else {
                    const c = { ...clientDraft, id: String(Date.now()) };
                    setClients([...clients, c]);
                    setClientView("list");
                    showToast("Client added");
                  }
                }}>
                  {clientView==="edit" ? "Save changes" : "Save client"}
                </BtnPrimary>
              </Card>
            )}

            {/* ── DETAIL ── */}
            {clientView==="detail" && (() => {
              const c = clients.find(x=>x.id===selectedClientId);
              if(!c) return null;
              const clientOrders = orders.filter(o=>o.clientId===c.id||o.client===(c.company||c.name));
              return (
                <>
                  <Card>
                    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                      <div style={{ width:52, height:52, borderRadius:16, background:`${ACCENT}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Icon name="person" size={26} color={ACCENT}/>
                      </div>
                      <div>
                        <div style={{ fontSize:17, fontWeight:700, color:"#1C1C1E" }}>{c.company || c.name}</div>
                        {c.company && c.name && <div style={{ fontSize:13, color:"#8E8E93" }}>{c.name}</div>}
                      </div>
                    </div>
                    {c.address && (
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:11, color:"#8E8E93", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Address</div>
                        <div style={{ fontSize:13, color:"#1C1C1E", lineHeight:1.6, whiteSpace:"pre-line" }}>{c.address}</div>
                      </div>
                    )}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      {c.phone && <div><div style={{ fontSize:11, color:"#8E8E93", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Phone</div><div style={{ fontSize:13, color:"#1C1C1E" }}>{c.phone}</div></div>}
                      {c.email && <div><div style={{ fontSize:11, color:"#8E8E93", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Email</div><div style={{ fontSize:13, color:"#1C1C1E", wordBreak:"break-all" }}>{c.email}</div></div>}
                    </div>
                  </Card>

                  <SectionTitle>Orders ({clientOrders.length})</SectionTitle>
                  {clientOrders.length === 0 && (
                    <div style={{ textAlign:"center", padding:"24px", color:"#8E8E93", fontSize:13 }}>No orders for this client yet.</div>
                  )}
                  {clientOrders.map(o=>(
                    <button key={o.id} onClick={()=>{ setSelectedId(o.id); setView("detail"); setTab("orders"); }}
                      style={{ width:"100%", background:"white", border:"1.5px solid #F2F2F7", borderRadius:16, padding:"14px 16px", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", textAlign:"left" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:"#1C1C1E", marginBottom:3 }}>#{o.id}{o.deadline ? ` · Delivery: ${o.deadline}` : ""}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:6, height:6, borderRadius:"50%", background:C.statuses[o.status]?.color, flexShrink:0 }}/>
                          <span style={{ fontSize:12, color:"#8E8E93" }}>{C.statuses[o.status]?.label}</span>
                          {o.amount > 0 && <span style={{ fontSize:12, fontWeight:700, color:ACCENT }}>· {C.currency} {fmt(o.amount)}</span>}
                        </div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  ))}
                  <BtnPrimary onClick={()=>{ setView("new"); setDraft({...newOrder(), clientId:c.id, client: c.company||c.name}); setTab("orders"); }} style={{ marginTop:8 }}>
                    + New order for this client
                  </BtnPrimary>
                </>
              );
            })()}

          </div>
        </div>
      )}

      {/* ── BOTTOM NAV (mobile only) ── */}
      {!isDesktop && (
        <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"white", borderTop:"1px solid #F2F2F7", display:"flex", padding:"10px 0 24px", zIndex:100 }}>
          {[
            { key:"home",    icon:"orders",  label:"Home"    },
            { key:"scan",    icon:"scan",    label:"Scan"    },
            { key:"orders",  icon:"gem",     label:"Orders"  },
            { key:"clients", icon:"person",  label:"Clients" },
            { key:"invoice", icon:"invoice", label:"Invoice" },
          ].map(({ key, icon, label }) => (
            <button key={key} onClick={()=>{ setTab(key); if(key==="scan")resetPhoto(); if(key==="orders"){ setView("list"); } if(key==="invoice"){ setInvView("list"); setSelectedInvoice(null); } if(key==="clients"){ setClientView("list"); } }} style={{ flex:1, background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"4px 0" }}>
              <div style={{ width:44, height:44, borderRadius:14, background: tab===key ? `${ACCENT}15` : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
                <Icon name={icon} size={22} color={tab===key ? ACCENT : "#8E8E93"}/>
              </div>
              <span style={{ fontSize:10, fontWeight: tab===key ? 700 : 500, color: tab===key ? ACCENT : "#8E8E93", letterSpacing:"0.02em" }}>{label}</span>
            </button>
          ))}
        </div>
      )}
      </div>{/* end content wrapper */}

      {/* ── WORK ORDER PREVIEW OVERLAY ── */}
      {workOrderPreview && (() => {
        const o = workOrderPreview;
        const GOLD = "#B8960C";
        const fmtDate = d => d ? new Date(d+"T12:00:00").toLocaleDateString("de-CH") : "—";
        const labelStyle = { fontSize:9, fontWeight:700, color:GOLD, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:5, fontFamily:"'DM Sans',sans-serif" };
        const lineStyle  = { borderBottom:`1px solid #ccc`, paddingBottom:4, minHeight:24, fontSize:13, fontWeight:600, color:"#1a1a1a", fontFamily:"'DM Sans',sans-serif" };
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:1000, overflowY:"auto", display:"flex", flexDirection:"column" }}>
            {/* Sticky top bar */}
            <div style={{ position:"sticky", top:0, background:"white", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:"1px solid #E5E5EA", zIndex:10, flexShrink:0 }}>
              <button onClick={()=>setWorkOrderPreview(null)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#1C1C1E", padding:"0 4px", lineHeight:1 }}>×</button>
              <span style={{ fontWeight:700, fontSize:15, fontFamily:"'DM Sans',sans-serif" }}>Vorschau Arbeitsauftrag</span>
              <button onClick={()=>printWorkOrder(o)} style={{ background:GOLD, color:"white", border:"none", borderRadius:10, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:6 }}>
                <Icon name="print" size={14} color="white"/> Drucken / PDF
              </button>
            </div>

            {/* A4 document preview */}
            <div style={{ flex:1, display:"flex", justifyContent:"center", padding:"24px 16px 40px", background:"#f0f0f0" }}>
              <div style={{ background:"white", width:"100%", maxWidth:680, borderRadius:4, boxShadow:"0 4px 24px rgba(0,0,0,0.18)", padding:"36px 44px", fontFamily:"Arial, Helvetica, sans-serif" }}>

                {/* Header */}
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", paddingBottom:14, borderBottom:`1.5px solid #ccc`, marginBottom:22 }}>
                  <img src={`${window.location.origin}/logo.png`} alt={C.businessName} style={{ height:60, objectFit:"contain" }}/>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:22, fontWeight:900, letterSpacing:3, color:"#1a1a1a", lineHeight:1 }}>ARBEITSAUFTRAG</div>
                    <div style={{ fontSize:9, fontStyle:"italic", color:"#666", marginTop:4 }}>Wir setzen keine Steine. Wir setzen Maßstäbe.</div>
                  </div>
                </div>

                {/* Fields row 1 */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 40px", marginBottom:18 }}>
                  <div>
                    <div style={labelStyle}>Auftragsnummer</div>
                    <div style={lineStyle}>#{o.id}</div>
                  </div>
                  <div>
                    <div style={labelStyle}>Verantwortlicher</div>
                    <div style={lineStyle}>&nbsp;</div>
                  </div>
                </div>

                {/* Fields row 2 */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 40px", marginBottom:22 }}>
                  <div>
                    <div style={labelStyle}>Startdatum</div>
                    <div style={lineStyle}>{fmtDate(o.received)}</div>
                  </div>
                  <div>
                    <div style={labelStyle}>Lieferdatum</div>
                    <div style={lineStyle}>{fmtDate(o.deadline)}</div>
                  </div>
                </div>

                {/* Photo box */}
                <div style={{ border:`1.5px solid ${GOLD}`, borderRadius:8, background:"#faf8f3", height:280, overflow:"hidden", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {o.photo
                    ? <img src={o.photo} alt="Schmuckstück" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                    : <div style={{ fontSize:11, color:GOLD, letterSpacing:"0.05em", textAlign:"center" }}>[ FOTO DES SCHMUCKSTÜCKS EINFÜGEN ]</div>
                  }
                </div>

                {/* Description box */}
                <div style={{ border:`1.5px solid ${GOLD}`, borderRadius:8, padding:"14px 16px", minHeight:110 }}>
                  <div style={labelStyle}>Arbeitsbeschreibung</div>
                  <div style={{ fontSize:11, color:"#1a1a1a", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{o.description || ""}</div>
                </div>

                {/* Footer */}
                <div style={{ marginTop:24, paddingTop:10, borderTop:"1px solid #ccc", textAlign:"center", fontSize:8, color:"#666", fontStyle:"italic", letterSpacing:"0.02em" }}>
                  {C.address.replace(/\n/g," \u25C6 ")} \u25C6 {C.phone} \u25C6 info@stoneartprecision.com
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── DAY MODAL ── */}
      {dayModal && (() => {
        const d = dayModal;
        const dateObj   = new Date(d+"T12:00:00");
        const isToday   = d === TODAY;
        const isPast    = d < TODAY;
        const dayLabel  = isToday ? "Today" : dateObj.toLocaleDateString("en-GB",{ weekday:"long", day:"numeric", month:"long" });
        const dayOrders = orders.filter(o => o.deadline === d && o.status !== "done" && o.status !== "invoiced");
        const doneOrders = orders.filter(o => o.deadline === d && (o.status === "done" || o.status === "invoiced"));
        const alertOn   = !!dayNotes[d]?.alert;
        const noteText  = dayNotes[d]?.text || "";

        // Delivery alert: overdue or today with pending orders
        const hasPendingDelivery = dayOrders.length > 0 && (isToday || isPast);
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:2100, display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={()=>setDayModal(null)}>
            <div onClick={e=>e.stopPropagation()} style={{ background:"white", borderRadius:"24px 24px 0 0", width:"100%", maxWidth:480, maxHeight:"88vh", display:"flex", flexDirection:"column", animation:"fadeUp 0.25s ease" }}>

              {/* Header */}
              <div style={{ padding:"16px 20px 14px", borderBottom:"1px solid #F2F2F7", flexShrink:0 }}>
                <div style={{ width:40, height:4, background:"#E5E5EA", borderRadius:2, margin:"0 auto 16px" }}/>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:20, fontWeight:800, color:"#1C1C1E", textTransform:"capitalize" }}>{dayLabel}</div>
                    <div style={{ fontSize:12, color:"#8E8E93", marginTop:2 }}>
                      {dateObj.toLocaleDateString("en-GB",{ day:"numeric", month:"long", year:"numeric" })}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    {/* Alert toggle */}
                    <button onClick={()=>setDayNotes(n=>({...n,[d]:{...(n[d]||{}),alert:!alertOn}}))}
                      style={{ width:36, height:36, borderRadius:10, background: alertOn?`${ACCENT}15`:"#F2F2F7", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Icon name="bell" size={18} color={alertOn?ACCENT:"#8E8E93"}/>
                    </button>
                    <button onClick={()=>setDayModal(null)} style={{ width:36, height:36, borderRadius:10, background:"#F2F2F7", border:"none", cursor:"pointer", fontSize:20, color:"#8E8E93", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                  </div>
                </div>
              </div>

              {/* Scrollable body */}
              <div style={{ overflowY:"auto", padding:"16px 20px 32px", flex:1 }}>

                {/* Delivery alert banner */}
                {hasPendingDelivery && (
                  <div style={{ background: isPast&&!isToday?"#FF3B30":"#FF9500", borderRadius:14, padding:"14px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
                    <Icon name="bell" size={20} color="white"/>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:"white" }}>
                        {isPast&&!isToday ? `${dayOrders.length} overdue deliver${dayOrders.length>1?"ies":"y"}` : `${dayOrders.length} deliver${dayOrders.length>1?"ies":"y"} today`}
                      </div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,0.85)" }}>These orders are still pending</div>
                    </div>
                  </div>
                )}

                {/* Pending orders */}
                {dayOrders.length > 0 && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontFamily:"'DM Sans',sans-serif" }}>Pending · {dayOrders.length}</div>
                    {dayOrders.map(o=>(
                      <button key={o.id} onClick={()=>{ setDayModal(null); setSelectedId(o.id); setView("detail"); setTab("orders"); }}
                        style={{ width:"100%", background:"white", border:`1.5px solid #F2F2F7`, borderRadius:14, padding:"13px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12, cursor:"pointer", textAlign:"left", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
                        {o.photo && <img src={o.photo} alt="" style={{ width:38, height:38, borderRadius:9, objectFit:"cover", flexShrink:0 }}/>}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:"#1C1C1E", marginBottom:2 }}>{o.client || `#${o.id}`}</div>
                          {o.description && <div style={{ fontSize:12, color:"#8E8E93", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.description}</div>}
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                          <StatusPill status={o.status}/>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {/* Done orders for this day */}
                {doneOrders.length > 0 && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, marginTop:4, fontFamily:"'DM Sans',sans-serif" }}>Completed · {doneOrders.length}</div>
                    {doneOrders.map(o=>(
                      <button key={o.id} onClick={()=>{ setDayModal(null); setSelectedId(o.id); setView("detail"); setTab("orders"); }}
                        style={{ width:"100%", background:"#F8F8F8", border:"1.5px solid #F2F2F7", borderRadius:14, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12, cursor:"pointer", textAlign:"left", opacity:0.7 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:"#1C1C1E" }}>{o.client || `#${o.id}`}</div>
                          {o.description && <div style={{ fontSize:11, color:"#8E8E93", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.description}</div>}
                        </div>
                        <StatusPill status={o.status}/>
                      </button>
                    ))}
                  </>
                )}

                {dayOrders.length===0 && doneOrders.length===0 && (
                  <div style={{ textAlign:"center", padding:"20px 0 8px", color:"#C7C7CC", fontSize:13 }}>No orders for this day</div>
                )}

                {/* Add order for this day */}
                <button onClick={()=>{ setDayModal(null); setDraft({...newOrder(), deadline:d}); setView("new"); setTab("orders"); }}
                  style={{ width:"100%", padding:"12px", background:"none", border:`1.5px dashed ${ACCENT}60`, borderRadius:14, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:ACCENT, cursor:"pointer", marginTop:4, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <Icon name="plus" size={16} color={ACCENT}/> Add order for this day
                </button>

                {/* Notes */}
                <div style={{ marginTop:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:6 }}>
                    Notes
                    {alertOn && <span style={{ fontSize:10, color:ACCENT, background:`${ACCENT}15`, padding:"2px 7px", borderRadius:6, fontWeight:700 }}>Active alert</span>}
                  </div>
                  <textarea
                    placeholder="Write a note for this day…"
                    value={noteText}
                    onChange={e=>setDayNotes(n=>({...n,[d]:{...(n[d]||{}),text:e.target.value}}))}
                    style={{ width:"100%", padding:"12px 14px", border:"1.5px solid #E5E5EA", borderRadius:14, fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"#1C1C1E", background:"white", outline:"none", resize:"none", height:90, boxSizing:"border-box" }}
                  />
                  {alertOn && <div style={{ fontSize:11, color:"#8E8E93", marginTop:6 }}>An alert will be shown when the app is opened on this day.</div>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── DAY NOTE ALERT ── */}
      {noteAlert && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:2100, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ background:"white", borderRadius:"24px 24px 0 0", padding:"24px 24px 40px", width:"100%", maxWidth:480, animation:"fadeUp 0.25s ease" }}>
            <div style={{ width:40, height:4, background:"#E5E5EA", borderRadius:2, margin:"0 auto 20px" }}/>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:`${ACCENT}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon name="bell" size={20} color={ACCENT}/>
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:"#1C1C1E" }}>Note for today</div>
                <div style={{ fontSize:12, color:"#8E8E93" }}>{new Date(noteAlert.date+"T12:00:00").toLocaleDateString("en-GB",{ weekday:"long", day:"numeric", month:"long" })}</div>
              </div>
            </div>
            <div style={{ background:"#F8F8F8", borderRadius:12, padding:"14px 16px", fontSize:14, color:"#1C1C1E", lineHeight:1.6, marginBottom:20, whiteSpace:"pre-wrap" }}>{noteAlert.text}</div>
            <button onClick={()=>setNoteAlert(null)} style={{ width:"100%", padding:"15px", background:ACCENT, color:"white", border:"none", borderRadius:14, fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, cursor:"pointer" }}>Got it</button>
          </div>
        </div>
      )}

      {/* ── URGENT / UPCOMING MODAL ── */}
      {urgentModal && (() => {
        const today = new Date().toISOString().split("T")[0];
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate()+14);
        const cutoffStr = cutoff.toISOString().split("T")[0];
        const upcoming = orders
          .filter(o => o.deadline && o.deadline <= cutoffStr && o.status !== "done" && o.status !== "invoiced")
          .sort((a,b) => a.deadline.localeCompare(b.deadline));
        const getLabel = (deadline) => {
          if(deadline < today) return { text:"Overdue", color:"#FF3B30" };
          if(deadline === today) return { text:"Today", color:"#FF9500" };
          const diff = Math.round((new Date(deadline+"T12:00:00") - new Date(today+"T12:00:00"))/(1000*60*60*24));
          if(diff === 1) return { text:"Tomorrow", color:"#FF9500" };
          return { text:`In ${diff} days`, color:"#007AFF" };
        };
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:2000, display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={()=>setUrgentModal(false)}>
            <div onClick={e=>e.stopPropagation()} style={{ background:"white", borderRadius:"24px 24px 0 0", padding:"20px 0 40px", width:"100%", maxWidth:480, animation:"fadeUp 0.25s ease", maxHeight:"80vh", display:"flex", flexDirection:"column" }}>
              {/* Handle + header */}
              <div style={{ padding:"0 20px 16px", borderBottom:"1px solid #F2F2F7" }}>
                <div style={{ width:40, height:4, background:"#E5E5EA", borderRadius:2, margin:"0 auto 18px" }}/>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:18, fontWeight:700, color:"#1C1C1E" }}>Upcoming deliveries</div>
                    <div style={{ fontSize:12, color:"#8E8E93", marginTop:2 }}>Active orders with delivery date</div>
                  </div>
                  <button onClick={()=>setUrgentModal(false)} style={{ background:"#F2F2F7", border:"none", borderRadius:"50%", width:32, height:32, cursor:"pointer", fontSize:18, color:"#8E8E93", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                </div>
              </div>
              {/* Scrollable list */}
              <div style={{ overflowY:"auto", padding:"12px 20px 0" }}>
                {upcoming.length === 0 && (
                  <div style={{ textAlign:"center", padding:"32px 0", color:"#8E8E93", fontSize:14 }}>No pending deliveries coming up.</div>
                )}
                {upcoming.map(o => {
                  const { text, color } = getLabel(o.deadline);
                  return (
                    <button key={o.id} onClick={()=>{ setUrgentModal(false); setSelectedId(o.id); setView("detail"); setTab("orders"); }}
                      style={{ width:"100%", background:"white", border:"1.5px solid #F2F2F7", borderRadius:16, padding:"14px 16px", marginBottom:10, display:"flex", alignItems:"center", gap:12, cursor:"pointer", textAlign:"left" }}>
                      <div style={{ width:5, alignSelf:"stretch", borderRadius:4, background:color, flexShrink:0 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:15, fontWeight:700, color:"#1C1C1E", marginBottom:2 }}>{o.client || `Order #${o.id}`}</div>
                        {o.description && <div style={{ fontSize:12, color:"#8E8E93", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:2 }}>{o.description}</div>}
                        <div style={{ fontSize:11, color:"#8E8E93" }}>{new Date(o.deadline+"T12:00:00").toLocaleDateString("de-CH", { weekday:"long", day:"numeric", month:"long" })}</div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                        <div style={{ fontSize:12, fontWeight:700, color, background:`${color}15`, padding:"4px 10px", borderRadius:8 }}>{text}</div>
                        <StatusPill status={o.status}/>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── DONE MODAL ── */}
      {doneModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:2000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ background:"white", borderRadius:"24px 24px 0 0", padding:"28px 24px 40px", width:"100%", maxWidth:430, animation:"fadeUp 0.2s ease" }}>
            <div style={{ width:40, height:4, background:"#E5E5EA", borderRadius:2, margin:"0 auto 24px" }}/>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}><Icon name="checkCircle" size={44} color="#34C759"/></div>
            <div style={{ fontSize:17, fontWeight:700, color:"#1C1C1E", textAlign:"center", marginBottom:8 }}>Order completed!</div>
            <div style={{ fontSize:14, color:"#8E8E93", textAlign:"center", marginBottom:28, lineHeight:1.5 }}>Would you like to create an invoice for this order now?</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={()=>{ setDoneModal(null); setView("detail"); showToast("Marked as Done","#34C759"); }}
                style={{ width:"100%", padding:"15px", background:"#F2F2F7", border:"none", borderRadius:14, fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:600, color:"#1C1C1E", cursor:"pointer" }}>
                Not now
              </button>
              <button onClick={()=>{
                const o = orders.find(x=>x.id===doneModal);
                if(o){
                  setInvClient(o.client);
                  setInvDate(o.received || new Date().toISOString().split("T")[0]);
                  setInvPorto("");
                  const desc = [o.field1, o.field2].filter(Boolean).join(" · ") || o.notes || `Auftrag #${o.id}`;
                  setItems([{ id:Date.now()+Math.random(), desc, price: o.amount||"", orderRef: o.id }]);
                  setInvSelectedOrders([o.id]);
                }
                setDoneModal(null);
                setTab("invoice");
                setInvView("new");
              }}
                style={{ width:"100%", padding:"15px", background:ACCENT, border:"none", borderRadius:14, fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, color:"white", cursor:"pointer" }}>
                Yes, create invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position:"fixed", bottom:100, left:"50%", transform:"translateX(-50%)", background:toast.color, color:"white", padding:"12px 24px", borderRadius:100, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:14, zIndex:2000, boxShadow:"0 4px 20px rgba(0,0,0,0.2)", whiteSpace:"nowrap", animation:"fadeUp 0.2s ease", display:"flex", alignItems:"center", gap:8 }}>
          <Icon name="check" size={15} color="white"/> {toast.msg}
        </div>
      )}

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
