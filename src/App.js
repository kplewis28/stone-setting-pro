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
  vatId: "CHE-307.800.003 MWST",
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

// ─── PASTEL PALETTE ─────────────────────────────────────
const PASTELS = {
  scan:       "#FFF3DC",
  orders:     "#D8F0EC",
  invoice:    "#EDE9FF",
  received:   "#FFF3DC",
  inprogress: "#D8EEFF",
  done:       "#D8F5E0",
  invoiced:   "#EFEFEF",
};

const SAMPLE_ORDERS = [
  { id:"0041", client:"Juwelier Müller AG",  received:"2026-03-10", field1:"Diamond",  field2:"Pavé",    pieces:3, status:"inprogress", notes:"Rush order",        amount:0   },
  { id:"0040", client:"Goldsmith Bern",      received:"2026-03-12", field1:"Ruby",     field2:"Prong",   pieces:1, status:"done",       notes:"",                  amount:180 },
  { id:"0039", client:"Atelier Zurich",      received:"2026-03-14", field1:"Sapphire", field2:"Bezel",   pieces:5, status:"received",   notes:"Handle with care",  amount:0   },
  { id:"0038", client:"Juwelier Keller",     received:"2026-03-08", field1:"Diamond",  field2:"Channel", pieces:2, status:"invoiced",   notes:"",                  amount:350 },
];

const newOrder     = () => ({ id: String(Date.now()).slice(-4), client:"", clientId:"", received: new Date().toISOString().split("T")[0], field1:"", field2:"", description:"", deadline:"", pieces:"", status:"received", notes:"", amount:0, lineItems:[] });
const newClient    = () => ({ id: String(Date.now()), name:"", company:"", address:"", phone:"", email:"" });
const newItem      = () => ({ id: Date.now()+Math.random(), desc:"", qty:"1", unitPrice:"", price:"" });
const lineTotal    = it => (parseFloat(it.qty)||1) * (parseFloat(it.unitPrice)||parseFloat(it.price)||0);
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
  if(!st) return null;
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

const inputBase = { width:"100%", padding:"13px 14px", border:"none", borderRadius:14, fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:14, color:"#1C1C1E", background:"#F5F5F3", outline:"none", boxSizing:"border-box" };
const Input = ({ ...props }) => (
  <input {...props} style={{ ...inputBase, ...props.style }} />
);

const CHEVRON_URL = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238E8E93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C%2Fsvg%3E\")";
const Select = ({ children, ...props }) => (
  <select {...props} style={{ ...inputBase, padding:"13px 40px 13px 14px", color: props.value ? "#1C1C1E" : "#8E8E93", appearance:"none", WebkitAppearance:"none", backgroundImage:CHEVRON_URL, backgroundRepeat:"no-repeat", backgroundPosition:"right 14px center", ...props.style }}>
    {children}
  </select>
);


const Textarea = ({ ...props }) => (
  <textarea {...props} style={{ ...inputBase, resize:"none", height:80, ...props.style }} />
);

const BtnPrimary = ({ children, onClick, disabled, style={} }) => (
  <button onClick={onClick} disabled={disabled} style={{ width:"100%", padding:"17px", background: disabled ? "#E5E5EA" : ACCENT, color: disabled ? "#999" : "white", border:"none", borderRadius:18, fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:16, fontWeight:800, cursor: disabled ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, letterSpacing:"-0.01em", ...style }}>
    {children}
  </button>
);

const BtnGhost = ({ children, onClick, disabled, style={} }) => (
  <button onClick={onClick} disabled={disabled} style={{ width:"100%", padding:"15px", background:"white", color: disabled?"#999":"#1C1C1E", border:"1.5px solid #E5E5EA", borderRadius:18, fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:15, fontWeight:600, cursor: disabled?"not-allowed":"pointer", opacity: disabled?0.6:1, ...style }}>
    {children}
  </button>
);

const Card = ({ children, onClick, style={} }) => (
  <div onClick={onClick} style={{ background:"white", borderRadius:20, padding:"18px 20px", marginBottom:12, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", cursor: onClick ? "pointer" : "default", ...style }}>
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
  const [invPorto, setInvPorto] = useState("");
  const [invClientAddress, setInvClientAddress] = useState("");
  const [invNumber, setInvNumber] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, color="#34C759") => { setToast({msg,color}); setTimeout(()=>setToast(null), 2000); };
  const [clients, setClients]     = useState(() => { try { const s = localStorage.getItem("ssp_clients"); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [clientView, setClientView] = useState("list"); // "list" | "new" | "edit" | "detail"
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientDraft, setClientDraft] = useState(newClient());
  const [filterClient, setFilterClient] = useState("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [workOrderPreview, setWorkOrderPreview] = useState(null);
  const [doneModal, setDoneModal] = useState(null); // order to prompt invoice creation
  const [rechnungData, setRechnungData] = useState(null);
  const [photoStep, setPhotoStep] = useState("capture");
  const [imgData, setImgData]   = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg]       = useState("");
  const [aiError, setAiError]   = useState("");
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
    setAiError("");
    const MSGS = ["Reading document…","Extracting details…","Almost done…"];
    let i=0; setAiMsg(MSGS[0]);
    const iv = setInterval(()=>{ i=(i+1)%MSGS.length; setAiMsg(MSGS[i]); },1400);
    try {
      const b64 = imgData.split(",")[1];
      const response = await fetch("/api/analyze",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:800,
          messages:[{ role:"user", content:[
            { type:"image", source:{ type:"base64", media_type:"image/jpeg", data:b64 }},
            { type:"text", text:`Extract order info from this delivery document. Return ONLY valid JSON, no backticks:\n{"client":"","orderRef":"","field1":"${C.fieldLabel} value or empty","field2":"${C.subFieldLabel} value or empty","pieces":"","notes":"","summary":"1 sentence"}` }
          ]}]
        })
      });
      const data = await response.json();
      if(data.error) throw new Error(data.error);
      const clean = data.content.map(x=>x.text||"").join("").replace(/```json|```/g,"").trim();
      clearInterval(iv);
      setExtracted(JSON.parse(clean));
      setPhotoStep("review");
    } catch(e) {
      clearInterval(iv);
      setAiError(e.message || "Could not read the document. Please try again with a clearer photo.");
    }
    setAiLoading(false);
  };

  const confirmOrder = () => {
    const order = { ...newOrder(), client:extracted.client||"", field1:extracted.field1||"", field2:extracted.field2||"", pieces:extracted.pieces||"", description:extracted.notes||"", notes:extracted.notes||"", photo: imgData||null };
    setOrders([order, ...orders]);
    syncToSheets(order);
    setPhotoStep("done");
  };

  const resetPhoto = () => { setPhotoStep("capture"); setImgData(null); setExtracted(null); setAiError(""); };

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

  // ── LOAD ORDER INTO INVOICE BUILDER ──
  const loadOrderIntoInvoice = (o) => {
    setInvClient(o.client);
    const matchedClient = clients.find(c=>(c.company||c.name)===o.client || c.id===o.clientId);
    setInvClientAddress(matchedClient ? [matchedClient.company&&matchedClient.name?matchedClient.company:"", matchedClient.address].filter(Boolean).join("\n") : "");
    setInvDate(new Date().toISOString().split("T")[0]);
    setInvPorto("");
    const invoiceItems = (o.lineItems||[]).length > 0
      ? (o.lineItems).map(li=>({ id:Date.now()+Math.random(), desc:li.desc, qty:li.qty||"1", unitPrice:li.unitPrice||"", price:String(lineTotal(li)), orderRef:o.id }))
      : [{ id:Date.now()+Math.random(), desc: o.description||`Order #${o.id}`, qty:"1", unitPrice:String(o.amount||""), price:String(o.amount||""), orderRef:o.id }];
    setItems(invoiceItems);
    setInvNumber(genInvNumber(invoices));
    setTab("invoice");
    setInvView("new");
  };

  // ── PRINT INVOICE (shared by order-level and invoice tab) ──
  const printInvoiceDoc = (inv, autoprint = true) => {
    const fmtCHF = n => `CHF ${Number(n).toFixed(2).replace(".", ",")}`;
    const sub    = inv.items.reduce((s,it) => s + lineTotal(it), 0);
    const porto  = parseFloat(inv.porto) || 0;
    const mwst   = sub * C.taxRate;
    const total  = sub + porto + mwst;
    const rowsHtml = inv.items.map(it => {
      const qty  = parseFloat(it.qty)||1;
      const unit = parseFloat(it.unitPrice)||parseFloat(it.price)||0;
      const tot  = qty * unit;
      return `<tr><td>${it.desc || "—"}${it.orderRef ? `<br><span style="font-size:9.5pt;color:#777">Order #${it.orderRef}</span>` : ""}</td><td class="right">${qty}</td><td class="right">${fmtCHF(unit)}</td><td class="right">${fmtCHF(tot)}</td></tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<title>Rechnung ${inv.number}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #222; padding: 40px 50px; max-width: 800px; margin: 0 auto; }
  .address { font-size:10pt; color:#444; margin-bottom:28px; line-height:1.7; }
  .rechnung-title { font-size:21pt; font-weight:bold; letter-spacing:4px; color:#8E8E93; border:3px solid #C7C7CC; display:inline-block; padding:4px 14px; margin-bottom:6px; text-transform:uppercase; }
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
    <thead><tr><th style="width:50%">BESCHREIBUNG</th><th class="right" style="width:10%">ANZ.</th><th class="right" style="width:20%">STÜCKPREIS</th><th class="right" style="width:20%">BETRAG</th></tr></thead>
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
    <div style={{ fontFamily:"'DM Sans','Helvetica',sans-serif", background:"#F5F5F3", minHeight:"100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&display=swap');
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input, select, textarea { font-size: 16px !important; }
        input:focus, select:focus, textarea:focus { outline: 2px solid ${ACCENT} !important; outline-offset: 0px; background:white !important; }
        ::-webkit-scrollbar { display: none; }
        .safe-top { padding-top: max(56px, env(safe-area-inset-top, 56px)); }
        .safe-bottom { padding-bottom: max(100px, calc(72px + env(safe-area-inset-bottom, 0px))); }
        @media (max-width: 375px) {
          .two-col { grid-template-columns: 1fr !important; }
          .filter-row { flex-wrap: wrap; }
        }
      `}</style>

      {/* ── DESKTOP SIDEBAR ── */}
      {isDesktop && (
        <div style={{ width:240, minHeight:"100vh", background:"white", borderRight:"1px solid #EBEBEB", position:"fixed", top:0, left:0, display:"flex", flexDirection:"column", paddingTop:40, zIndex:50 }}>
          <div style={{ padding:"0 28px 40px" }}>
            <div style={{ fontSize:19, fontWeight:900, color:"#0A0A0A", letterSpacing:"-0.02em" }}>Stone Art</div>
            <div style={{ fontSize:11, color:"#ADADAD", fontWeight:500, marginTop:2 }}>Precision GmbH</div>
          </div>
          {[
            { key:"home",    icon:"orders",  label:"Home"    },
            { key:"scan",    icon:"scan",    label:"Scan"    },
            { key:"orders",  icon:"gem",     label:"Orders"  },
            { key:"clients", icon:"person",  label:"Clients" },
            { key:"invoice", icon:"invoice", label:"Invoice" },
          ].map(({ key, icon, label }) => (
            <button key={key} onClick={()=>{ setTab(key); if(key==="scan")resetPhoto(); if(key==="orders")setView("list"); if(key==="invoice")setInvView("list"); if(key==="clients")setClientView("list"); }}
              style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"12px 20px 12px 28px", transition:"all 0.15s" }}>
              <div style={{ width:40, height:40, borderRadius:13, background: tab===key ? "#0A0A0A" : "#F5F5F3", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
                <Icon name={icon} size={19} color={tab===key ? "white" : "#8E8E93"}/>
              </div>
              <span style={{ fontSize:14, fontWeight: tab===key ? 700 : 500, color: tab===key ? "#0A0A0A" : "#ADADAD" }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── CONTENT WRAPPER ── */}
      <div style={ isDesktop ? { marginLeft:220, minHeight:"100vh" } : { maxWidth:500, margin:"0 auto" } }>

      {/* ── HOME TAB ── */}
      {tab==="home" && (
        <div style={{ animation:"fadeUp 0.3s ease" }}>

          {/* TOP BAR — editorial */}
          <div style={{ padding: isDesktop ? "36px 40px 24px" : "max(56px, env(safe-area-inset-top, 56px)) 22px 20px", background:"white" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:13, color:"#ADADAD", fontWeight:500 }}>{greeting},</div>
                <div style={{ fontSize:36, fontWeight:900, color:"#0A0A0A", letterSpacing:"-0.03em", lineHeight:1.05 }}>{C.ownerName.split(" ")[0]}</div>
                <div style={{ fontSize:13, color:"#ADADAD", fontWeight:500, marginTop:5 }}>
                  {orders.filter(o=>o.status!=="done"&&o.status!=="invoiced").length} active order{orders.filter(o=>o.status!=="done"&&o.status!=="invoiced").length!==1?"s":""}
                </div>
              </div>
            </div>
          </div>

          {/* QUICK ACTION — New Order */}
          <div style={{ padding: isDesktop ? "0 40px 24px" : "0 22px 20px", background:"white" }}>
            <button onClick={()=>{ setTab("orders"); setView("new"); }} style={{ width:"100%", background:PASTELS.orders, border:"none", borderRadius:22, padding:"22px 22px 24px", textAlign:"left", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ width:52, height:52, borderRadius:16, background:"#0A0A0A", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon name="gem" size={24} color="white"/>
                </div>
                <div>
                  <div style={{ fontSize:20, fontWeight:900, color:"#0A0A0A", letterSpacing:"-0.02em" }}>Create New Order</div>
                  <div style={{ fontSize:13, color:"rgba(0,0,0,0.4)", fontWeight:500, marginTop:2 }}>Create a work order manually</div>
                </div>
              </div>
              <div style={{ width:36, height:36, borderRadius:11, background:"rgba(0,0,0,0.08)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg>
              </div>
            </button>
          </div>

          {/* ── CALENDAR STRIP ── */}
          <div style={{ padding:"20px 22px 4px", background:"white" }}>
            <div style={{ fontSize:20, fontWeight:800, color:"#0A0A0A", letterSpacing:"-0.02em" }}>Pending Tasks</div>
            <div style={{ fontSize:13, color:"#ADADAD", fontWeight:500, marginTop:3 }}>Tap a day to see or add orders</div>
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
                <div ref={calStripRef} style={{ overflowX:"auto", display:"flex", gap:8, padding:"14px 22px 20px", background:"white", scrollbarWidth:"none" }}>
                  {days.map(d => {
                    const date = new Date(d+"T12:00:00");
                    const isToday   = d === TODAY;
                    const isSelected = d === selectedDate;
                    const hasOrders = orders.some(o => o.deadline === d && o.status !== "done" && o.status !== "invoiced");
                    const hasNote   = dayNotes[d]?.text;
                    const isPast    = d < TODAY;
                    return (
                      <button key={d} data-today={isToday||undefined} onClick={()=>{ setSelectedDate(d); setDayModal(d); }}
                        style={{ flexShrink:0, width:54, padding:"10px 4px", borderRadius:18, border:"none", background: isSelected ? "#0A0A0A" : isToday ? `${ACCENT}18` : "transparent", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color: isSelected ? "rgba(255,255,255,0.6)" : "#ADADAD", letterSpacing:"0.08em" }}>{DAYS_ES[date.getDay()]}</span>
                        <span style={{ fontSize:18, fontWeight:800, color: isSelected ? "white" : isPast ? "#D0D0D0" : "#0A0A0A", lineHeight:1, letterSpacing:"-0.01em" }}>{date.getDate()}</span>
                        <div style={{ display:"flex", gap:3, height:5, alignItems:"center" }}>
                          {hasOrders && <div style={{ width:4, height:4, borderRadius:"50%", background: isSelected?"rgba(255,255,255,0.7)":ACCENT }}/>}
                          {hasNote   && <div style={{ width:4, height:4, borderRadius:"50%", background: isSelected?"rgba(255,255,255,0.5)":"#007AFF" }}/>}
                        </div>
                      </button>
                    );
                  })}
                </div>

              </>
            );
          })()}

          <div style={{ padding: isDesktop ? "16px 40px 60px" : "12px 22px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>
            {(() => {
              const today = new Date().toISOString().split("T")[0];
              const active = orders.filter(o => o.status !== "done" && o.status !== "invoiced");
              const withDeadline = active.filter(o => o.deadline).sort((a,b) => a.deadline.localeCompare(b.deadline));
              const noDeadline   = active.filter(o => !o.deadline);
              const sorted = [...withDeadline, ...noDeadline];

              const getUrgency = (deadline) => {
                if(!deadline) return { accent:"transparent", label:null };
                if(deadline < today) return { accent:"#FF3B30", label:"Overdue" };
                if(deadline === today) return { accent:"#FF9500", label:"Today" };
                const diff = Math.round((new Date(deadline+"T12:00:00")-new Date(today+"T12:00:00"))/(864e5));
                if(diff === 1) return { accent:"#FF9500", label:"Tomorrow" };
                if(diff <= 7)  return { accent:"#007AFF", label:null };
                return { accent:"transparent", label:null };
              };

              const fmtDeadline = (deadline) => {
                if(!deadline) return null;
                const d = new Date(deadline+"T12:00:00");
                return { day: d.getDate(), month: d.toLocaleDateString("en-GB",{month:"short"}).toUpperCase(), weekday: d.toLocaleDateString("en-GB",{weekday:"short"}).toUpperCase() };
              };

              const overdue = withDeadline.filter(o => o.deadline < today);

              return (
                <>
                  {/* Overdue alert */}
                  {overdue.length > 0 && (
                    <div style={{ background:"#FF3B30", borderRadius:18, padding:"14px 18px", marginBottom:14, display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:38, height:38, borderRadius:12, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Icon name="bell" size={18} color="white"/>
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:800, color:"white", letterSpacing:"-0.01em" }}>
                          {overdue.length} overdue order{overdue.length>1?"s":""}
                        </div>
                        <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", fontWeight:500 }}>These need to go out immediately</div>
                      </div>
                    </div>
                  )}

                  {/* Sorted order list */}
                  <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:12, marginTop:4 }}>
                    <div style={{ fontSize:16, fontWeight:800, color:"#0A0A0A", letterSpacing:"-0.02em" }}>Upcoming deliveries</div>
                    {sorted.length > 0 && <div style={{ fontSize:12, fontWeight:500, color:"#ADADAD" }}>{sorted.length} pending</div>}
                  </div>
                  {sorted.length === 0 && (
                    <div style={{ textAlign:"center", padding:"24px 0", color:"#ADADAD", fontSize:14, fontWeight:500 }}>No pending orders</div>
                  )}
                  {sorted.map((o, i) => {
                    const urg = getUrgency(o.deadline);
                    const dateParts = fmtDeadline(o.deadline);
                    const priorityColor = i === 0 ? "#FF3B30" : i === 1 ? "#FF9500" : i === 2 ? "#007AFF" : "#ADADAD";
                    return (
                      <button key={o.id} onClick={()=>{ setSelectedId(o.id); setView("detail"); setTab("orders"); }}
                        style={{ width:"100%", background:"white", border:"none", borderRadius:16, padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:14, cursor:"pointer", textAlign:"left", boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
                        {/* Priority circle */}
                        <div style={{ width:40, height:40, borderRadius:12, background:"#F5F5F3", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <span style={{ fontSize:16, fontWeight:900, color:priorityColor, lineHeight:1 }}>{i+1}</span>
                        </div>
                        {/* Content */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:800, color:"#0A0A0A", letterSpacing:"-0.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:6 }}>{o.client || `Order #${o.id}`}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                            {dateParts ? (
                              <span style={{ fontSize:11, fontWeight:700, color:urg.accent !== "transparent" ? urg.accent : "#6B6B6B", background:urg.accent !== "transparent" ? `${urg.accent}18` : "#F0F0F0", padding:"3px 9px", borderRadius:8 }}>
                                {urg.label ? `${urg.label} · ` : ""}{dateParts.weekday} {dateParts.day} {dateParts.month}
                              </span>
                            ) : (
                              <span style={{ fontSize:11, fontWeight:600, color:"#ADADAD", background:"#F5F5F3", padding:"3px 9px", borderRadius:8 }}>No date</span>
                            )}
                            {o.description && <span style={{ fontSize:11, color:"rgba(0,0,0,0.35)", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.description}</span>}
                          </div>
                        </div>
                        <StatusPill status={o.status}/>
                      </button>
                    );
                  })}

                  {sorted.length > 0 && (
                    <button onClick={()=>setTab("orders")} style={{ width:"100%", padding:"13px", background:"#F5F5F3", border:"none", borderRadius:14, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color:"#0A0A0A", cursor:"pointer", marginTop:4 }}>
                      View all orders
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── SCAN TAB ── */}
      {tab==="scan" && (
        <div style={{ animation:"fadeUp 0.3s ease" }}>
          <div style={{ padding: isDesktop?"32px 40px 20px":"max(56px, env(safe-area-inset-top, 56px)) 22px 20px", background:"white", display:"flex", alignItems:"center", gap:14 }}>
            <button onClick={goHome} style={{ width:36, height:36, borderRadius:11, background:"#F5F5F3", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="back" size={18} color="#0A0A0A"/></button>
            <div style={{ fontSize:24, fontWeight:900, color:"#0A0A0A", letterSpacing:"-0.02em" }}>Scan Delivery Note</div>
          </div>

          <div style={{ padding: isDesktop?"0 40px 60px":"0 22px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>{ compressPhoto(ev.target.result).then(c=>{ setImgData(c); setPhotoStep("preview"); }); }; r.readAsDataURL(f); }}/>

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
                <img src={imgData} alt="doc" style={{ width:"100%", maxHeight:220, objectFit:"cover", borderRadius:16, border:"1.5px solid #F2F2F7", marginBottom:16, display:"block" }}/>
                {aiLoading ? (
                  <Card style={{ textAlign:"center", padding:"32px" }}>
                    <div style={{ width:36, height:36, border:`3px solid #F2F2F7`, borderTopColor:ACCENT, borderRadius:"50%", animation:"spin 0.7s linear infinite", margin:"0 auto 16px" }}/>
                    <div style={{ fontSize:15, fontWeight:600, color:"#1C1C1E", marginBottom:4 }}>{aiMsg}</div>
                    <div style={{ fontSize:13, color:"#8E8E93" }}>AI is reading the document</div>
                  </Card>
                ) : (
                  <>
                    {aiError && <div style={{ background:"#FF3B3015", border:"1px solid #FF3B3030", borderRadius:12, padding:"12px 14px", marginBottom:12, fontSize:13, color:"#FF3B30", lineHeight:1.5 }}>{aiError}</div>}
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
                  {/* Client picker */}
                  <Field label="Client *">
                    {clients.length > 0
                      ? <Select value={extracted.clientId||""} onChange={e=>{
                          const c = clients.find(x=>x.id===e.target.value);
                          setExtracted({...extracted, clientId: e.target.value, client: c ? (c.company||c.name) : ""});
                        }}>
                          <option value="">— Select client —</option>
                          {clients.map(c=><option key={c.id} value={c.id}>{c.company||c.name}{c.company&&c.name?" ("+c.name+")":""}</option>)}
                        </Select>
                      : <Input placeholder="Client or company" value={extracted.client||""} onChange={e=>setExtracted({...extracted,client:e.target.value})}/>
                    }
                    {clients.length > 0 && <div onClick={()=>{ setTab("clients"); setClientView("new"); setClientDraft(newClient()); }} style={{ fontSize:12, color:ACCENT, fontWeight:600, marginTop:6, cursor:"pointer" }}>+ Add new client</div>}
                  </Field>
                  <Field label="Work description">
                    <Textarea value={extracted.description||extracted.notes||""} onChange={e=>setExtracted({...extracted,description:e.target.value})} placeholder="Work description…"/>
                  </Field>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <Field label="Received date">
                      <Input type="date" value={extracted.received||new Date().toISOString().split("T")[0]} onChange={e=>setExtracted({...extracted,received:e.target.value})}/>
                    </Field>
                    <Field label="Delivery date">
                      <Input type="date" value={extracted.deadline||""} onChange={e=>setExtracted({...extracted,deadline:e.target.value})}/>
                    </Field>
                  </div>
                  <Field label={C.piecesLabel}><Input type="number" placeholder="0" value={extracted.pieces||""} onChange={e=>setExtracted({...extracted,pieces:e.target.value})}/></Field>
                </Card>
                <BtnPrimary disabled={!extracted.client} onClick={confirmOrder}><Icon name="check" size={18} color="white"/> Create Order</BtnPrimary>
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
          <div style={{ padding: isDesktop?"32px 40px 20px":"max(56px, env(safe-area-inset-top, 56px)) 22px 20px", background:"white" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                {view!=="list"
                  ? <button onClick={()=>view==="edit" ? setView("detail") : setView("list")} style={{ width:36, height:36, borderRadius:11, background:"#F5F5F3", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="back" size={18} color="#0A0A0A"/></button>
                  : <button onClick={goHome} style={{ width:36, height:36, borderRadius:11, background:"#F5F5F3", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="back" size={18} color="#0A0A0A"/></button>
                }
                <div style={{ fontSize:24, fontWeight:900, color:"#0A0A0A", letterSpacing:"-0.02em" }}>
                  {view==="new" ? "New Order" : view==="edit" ? "Edit Order" : view==="detail" ? selectedOrder?.client : "Orders"}
                </div>
              </div>
              {view==="list" && (
                <div style={{ display:"flex", gap:8 }}>
                  {selectMode
                    ? <button onClick={()=>{ setSelectMode(false); setSelectedOrderIds(new Set()); }} style={{ padding:"9px 14px", background:"#F5F5F3", border:"none", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:700, color:"#0A0A0A", fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
                    : <>
                        <button onClick={()=>setSelectMode(true)} style={{ padding:"9px 14px", background:"#F5F5F3", border:"none", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:700, color:"#0A0A0A", fontFamily:"'DM Sans',sans-serif" }}>Select</button>
                        <button onClick={()=>setView("new")} style={{ width:38, height:38, borderRadius:12, background:"#0A0A0A", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <Icon name="plus" size={18} color="white"/>
                        </button>
                      </>
                  }
                </div>
              )}
              {view==="detail" && selectedOrder && (
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>{ setDraft({...selectedOrder}); setView("edit"); }} style={{ padding:"9px 14px", background:"#F5F5F3", border:"none", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:700, color:"#0A0A0A", fontFamily:"'DM Sans',sans-serif" }}>Edit</button>
                  <button onClick={()=>setWorkOrderPreview(selectedOrder)} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", background:"#F5F5F3", border:"none", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:700, color:"#0A0A0A", fontFamily:"'DM Sans',sans-serif" }}>
                    <Icon name="print" size={15} color="#0A0A0A"/> Print
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: isDesktop?"16px 40px 60px":"16px 22px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>

            {/* ── LIST ── */}
            {view==="list" && (
              <>
                {/* Status filter pills */}
                <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:16, paddingBottom:2 }}>
                  {[["all","All",orders.length], ...Object.entries(C.statuses).map(([k,v])=>[k,v.label,counts[k]])].map(([key,label,cnt])=>(
                    <button key={key} style={{ padding:"8px 16px", borderRadius:100, border:"none", background: filterStatus===key ? "#0A0A0A" : "white", fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", color: filterStatus===key ? "white" : "#ADADAD", flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }} onClick={()=>setFilterStatus(key)}>
                      {label}&nbsp;<span style={{ fontWeight:500, opacity:0.6 }}>{cnt}</span>
                    </button>
                  ))}
                </div>

                {/* Client + Date filters */}
                <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
                  {clients.length > 0 && (
                    <Select value={filterClient} onChange={e=>setFilterClient(e.target.value)} style={{ flex:1, minWidth:140, fontSize:13, padding:"10px 36px 10px 12px", color: filterClient!=="all"?"#0A0A0A":"#ADADAD" }}>
                      <option value="all">All clients</option>
                      {[...new Set(orders.map(o=>o.client).filter(Boolean))].sort().map(c=><option key={c} value={c}>{c}</option>)}
                    </Select>
                  )}
                  <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:140 }}>
                    <Input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} style={{ fontSize:13, padding:"10px 12px", color: filterDate?"#0A0A0A":"#ADADAD" }}/>
                    {filterDate && <button onClick={()=>setFilterDate("")} style={{ padding:"10px 12px", border:"none", borderRadius:12, background:"#F5F5F3", fontSize:12, fontWeight:700, color:"#8E8E93", cursor:"pointer", whiteSpace:"nowrap" }}>✕</button>}
                  </div>
                  <button onClick={exportToExcel} style={{ padding:"10px 14px", border:"none", borderRadius:12, background:"#F5F5F3", fontSize:12, fontWeight:700, color:"#0A0A0A", cursor:"pointer", whiteSpace:"nowrap" }}>↓ Excel</button>
                </div>
                {/* Order rows */}
                {filteredOrders.map((o, i) => {
                  const today = new Date().toISOString().split("T")[0];
                  const getUrgency = (deadline) => {
                    if(!deadline) return { accent:"transparent", label:null };
                    if(deadline < today) return { accent:"#FF3B30", label:"Overdue" };
                    if(deadline === today) return { accent:"#FF9500", label:"Today" };
                    const diff = Math.round((new Date(deadline+"T12:00:00")-new Date(today+"T12:00:00"))/(864e5));
                    if(diff === 1) return { accent:"#FF9500", label:"Tomorrow" };
                    if(diff <= 7)  return { accent:"#007AFF", label:null };
                    return { accent:"transparent", label:null };
                  };
                  const urg = getUrgency(o.deadline);
                  const priorityColor = i === 0 ? "#FF3B30" : i === 1 ? "#FF9500" : i === 2 ? "#007AFF" : "#ADADAD";
                  const isChecked = selectedOrderIds.has(o.id);
                  return (
                    <button key={o.id} onClick={()=>{
                      if(selectMode) {
                        setSelectedOrderIds(prev => {
                          const next = new Set(prev);
                          next.has(o.id) ? next.delete(o.id) : next.add(o.id);
                          return next;
                        });
                      } else {
                        setSelectedId(o.id); setView("detail");
                      }
                    }}
                      style={{ width:"100%", background: isChecked ? "#FFF3F0" : "white", border: isChecked ? "1.5px solid #FF3B3030" : "1.5px solid transparent", borderRadius:16, padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:14, cursor:"pointer", textAlign:"left", boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
                      <div style={{ width:40, height:40, borderRadius:12, background: isChecked ? "#FF3B30" : "#F5F5F3", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}>
                        {isChecked
                          ? <Icon name="check" size={18} color="white"/>
                          : <span style={{ fontSize:16, fontWeight:900, color:priorityColor, lineHeight:1 }}>{i+1}</span>
                        }
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:"#0A0A0A", marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", letterSpacing:"-0.01em" }}>{o.client || "—"}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                          {o.deadline && (
                            <span style={{ fontSize:11, fontWeight:700, color: urg.accent !== "transparent" ? urg.accent : "#6B6B6B", background: urg.accent !== "transparent" ? `${urg.accent}18` : "#F0F0F0", padding:"3px 9px", borderRadius:8 }}>
                              {urg.label ? `${urg.label} · ` : ""}{new Date(o.deadline+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"})}
                            </span>
                          )}
                          {o.description && <span style={{ fontSize:11, color:"rgba(0,0,0,0.35)", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.description}</span>}
                        </div>
                      </div>
                      <StatusPill status={o.status}/>
                    </button>
                  );
                })}

                {/* Bulk delete bar */}
                {selectMode && selectedOrderIds.size > 0 && (
                  <div style={{ position:"fixed", bottom:"max(80px, calc(72px + env(safe-area-inset-bottom, 0px)))", left:"50%", transform:"translateX(-50%)", width:"calc(100% - 32px)", maxWidth:468, zIndex:200, animation:"fadeUp 0.2s ease" }}>
                    <button onClick={()=>{
                      setOrders(orders.filter(o=>!selectedOrderIds.has(o.id)));
                      setSelectedOrderIds(new Set());
                      setSelectMode(false);
                      showToast(`${selectedOrderIds.size} order${selectedOrderIds.size>1?"s":""} deleted`, "#FF3B30");
                    }} style={{ width:"100%", padding:"17px", background:"#FF3B30", color:"white", border:"none", borderRadius:18, fontFamily:"'DM Sans',sans-serif", fontSize:16, fontWeight:800, cursor:"pointer", boxShadow:"0 4px 20px rgba(255,59,48,0.4)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      <Icon name="trash" size={18} color="white"/> Delete {selectedOrderIds.size} order{selectedOrderIds.size>1?"s":""}
                    </button>
                  </div>
                )}
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

                {/* Line items */}
                <div style={{ marginTop:8, marginBottom:4 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Items for invoice</div>
                  {(draft.lineItems||[]).map((li,idx)=>(
                    <div key={li.id} style={{ background:"#F5F5F3", borderRadius:14, padding:"12px 14px", marginBottom:8 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:"#8E8E93" }}>Item {idx+1}</span>
                        <button onClick={()=>setDraft({...draft, lineItems:draft.lineItems.filter(i=>i.id!==li.id)})} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}><Icon name="trash" size={14} color="#FF3B30"/></button>
                      </div>
                      <Input placeholder="Description (e.g. Pavé setting – ring)" value={li.desc} onChange={e=>setDraft({...draft, lineItems:draft.lineItems.map(i=>i.id===li.id?{...i,desc:e.target.value}:i)})} style={{ marginBottom:8 }}/>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                        <Input type="number" placeholder="Qty" value={li.qty||""} onChange={e=>setDraft({...draft, lineItems:draft.lineItems.map(i=>i.id===li.id?{...i,qty:e.target.value}:i)})}/>
                        <Input type="number" placeholder={`Unit price (${C.currency})`} value={li.unitPrice||""} onChange={e=>setDraft({...draft, lineItems:draft.lineItems.map(i=>i.id===li.id?{...i,unitPrice:e.target.value}:i)})}/>
                      </div>
                      {lineTotal(li)>0 && <div style={{ fontSize:11, color:"#8E8E93", marginTop:6 }}>Total: <strong style={{color:"#0A0A0A"}}>{C.currency} {fmt(lineTotal(li))}</strong></div>}
                    </div>
                  ))}
                  <button onClick={()=>setDraft({...draft, lineItems:[...(draft.lineItems||[]), {id:Date.now()+Math.random(),desc:"",qty:"1",unitPrice:""}]})} style={{ width:"100%", padding:"11px", background:"none", border:"1.5px dashed #E5E5EA", borderRadius:12, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:"#8E8E93", cursor:"pointer" }}>+ Add item</button>
                </div>

                <BtnPrimary disabled={!draft.client} onClick={()=>{ if(draft.client){ setOrders([{...draft},...orders]); syncToSheets(draft); setDraft(newOrder()); setView("list"); } }}>
                  Save Order
                </BtnPrimary>
              </Card>
            )}

            {/* ── EDIT ORDER ── */}
            {view==="edit" && (
              <Card>
                <Field label="Client *">
                  {clients.length > 0
                    ? <Select value={draft.clientId} onChange={e=>{ const c=clients.find(x=>x.id===e.target.value); setDraft({...draft,clientId:e.target.value,client:c?(c.company||c.name):""}); }}>
                        <option value="">— Select client —</option>
                        {clients.map(c=><option key={c.id} value={c.id}>{c.company||c.name}{c.company&&c.name?" ("+c.name+")":""}</option>)}
                      </Select>
                    : <Input placeholder="Client or company" value={draft.client} onChange={e=>setDraft({...draft,client:e.target.value})}/>
                  }
                </Field>
                <Field label="Work description">
                  <Textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Work description…"/>
                </Field>
                <Field label="Delivery date">
                  <Input type="date" value={draft.deadline} onChange={e=>setDraft({...draft,deadline:e.target.value})}/>
                </Field>
                <div style={{ marginTop:8, marginBottom:4 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Items for invoice</div>
                  {(draft.lineItems||[]).map((li,idx)=>(
                    <div key={li.id} style={{ background:"#F5F5F3", borderRadius:14, padding:"12px 14px", marginBottom:8 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:"#8E8E93" }}>Item {idx+1}</span>
                        <button onClick={()=>setDraft({...draft,lineItems:draft.lineItems.filter(i=>i.id!==li.id)})} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}><Icon name="trash" size={14} color="#FF3B30"/></button>
                      </div>
                      <Input placeholder="Description" value={li.desc} onChange={e=>setDraft({...draft,lineItems:draft.lineItems.map(i=>i.id===li.id?{...i,desc:e.target.value}:i)})} style={{ marginBottom:8 }}/>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                        <Input type="number" placeholder="Qty" value={li.qty||""} onChange={e=>setDraft({...draft,lineItems:draft.lineItems.map(i=>i.id===li.id?{...i,qty:e.target.value}:i)})}/>
                        <Input type="number" placeholder={`Unit price (${C.currency})`} value={li.unitPrice||""} onChange={e=>setDraft({...draft,lineItems:draft.lineItems.map(i=>i.id===li.id?{...i,unitPrice:e.target.value}:i)})}/>
                      </div>
                      {lineTotal(li)>0 && <div style={{ fontSize:11, color:"#8E8E93", marginTop:6 }}>Total: <strong style={{color:"#0A0A0A"}}>{C.currency} {fmt(lineTotal(li))}</strong></div>}
                    </div>
                  ))}
                  <button onClick={()=>setDraft({...draft,lineItems:[...(draft.lineItems||[]),{id:Date.now()+Math.random(),desc:"",qty:"1",unitPrice:""}]})} style={{ width:"100%", padding:"11px", background:"none", border:"1.5px dashed #E5E5EA", borderRadius:12, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:"#8E8E93", cursor:"pointer" }}>+ Add item</button>
                </div>
                <BtnPrimary disabled={!draft.client} onClick={()=>{ setOrders(orders.map(o=>o.id===draft.id?{...draft}:o)); setView("detail"); showToast("Order updated"); }}>
                  Save changes
                </BtnPrimary>
                <div style={{ height:10 }}/>
                <button onClick={()=>{ setOrders(orders.filter(o=>o.id!==draft.id)); setView("list"); showToast("Order deleted","#FF3B30"); }} style={{ width:"100%", background:"none", border:"none", color:"#FF3B30", fontSize:13, fontWeight:600, cursor:"pointer", padding:"8px 0" }}>
                  Delete order
                </button>
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
                  <BtnPrimary onClick={()=>loadOrderIntoInvoice(selectedOrder)} style={{ marginTop:4 }}>
                    <Icon name="invoice" size={16} color="white"/> Create invoice
                  </BtnPrimary>
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
              <div style={{ padding: isDesktop?"32px 40px 20px":"max(56px, env(safe-area-inset-top, 56px)) 22px 20px", background:"white" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:24, fontWeight:900, color:"#0A0A0A", letterSpacing:"-0.02em" }}>Invoices</div>
                    {invoices.length > 0 && <div style={{ fontSize:13, color:"#ADADAD", marginTop:3, fontWeight:500 }}>{invoices.length} invoice{invoices.length!==1?"s":""} · {invoices.filter(i=>!i.printed).length} unprinted</div>}
                  </div>
                  <button onClick={()=>{ setInvClient(""); setInvClientAddress(""); setInvDate(new Date().toISOString().split("T")[0]); setInvPorto(""); setItems([newItem()]); setInvNumber(genInvNumber(invoices)); setInvView("new"); }}
                    style={{ background:"#0A0A0A", color:"white", border:"none", borderRadius:14, padding:"10px 18px", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", letterSpacing:"-0.01em" }}>
                    + New
                  </button>
                </div>
              </div>
              <div style={{ padding: isDesktop?"0 40px 60px":"0 22px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>
                {invoices.length === 0 && (
                  <div style={{ textAlign:"center", padding:"48px 24px" }}>
                    <div style={{ width:72, height:72, borderRadius:22, background:PASTELS.invoice, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}><Icon name="receipt" size={32} color="#8E8E93"/></div>
                    <div style={{ fontSize:17, fontWeight:800, color:"#0A0A0A", marginBottom:6, letterSpacing:"-0.01em" }}>No invoices yet</div>
                    <div style={{ fontSize:13, color:"#ADADAD", lineHeight:1.6 }}>Invoices created from orders appear here.<br/>You can also create one manually.</div>
                  </div>
                )}
                {[...invoices].reverse().map((inv,i) => {
                  const invTotal = inv.items.reduce((s,it)=>s+lineTotal(it),0)*(1+C.taxRate) + (parseFloat(inv.porto)||0);
                  const priorityColor = i === 0 ? "#FF3B30" : i === 1 ? "#FF9500" : i === 2 ? "#007AFF" : "#ADADAD";
                  return (
                    <button key={inv.id} onClick={()=>{ setSelectedInvoice(inv); setInvView("detail"); }}
                      style={{ width:"100%", background:"white", border:"none", borderRadius:16, padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:14, cursor:"pointer", textAlign:"left", boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:"#F5F5F3", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <span style={{ fontSize:16, fontWeight:900, color:priorityColor, lineHeight:1 }}>{i+1}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:"#0A0A0A", letterSpacing:"-0.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{inv.client}</div>
                        <div style={{ fontSize:12, color:"rgba(0,0,0,0.38)", fontWeight:500, marginTop:3 }}>{inv.number} · {new Date(inv.date+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontSize:15, fontWeight:900, color:"#0A0A0A", letterSpacing:"-0.01em" }}>{C.currency} {fmt(invTotal)}</div>
                        <span style={{ fontSize:10, fontWeight:700, color: inv.printed?"#34C759":"#FF9500" }}>{inv.printed?"Printed":"Saved"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── NEW INVOICE VIEW ── */}
          {invView==="new" && (()=>{
            const draftSub   = items.reduce((s,it)=>s+lineTotal(it),0);
            const draftPorto = parseFloat(invPorto)||0;
            const draftTax   = draftSub * C.taxRate;
            const draftTotal = draftSub + draftPorto + draftTax;
            // Orders done but not yet invoiced (exclude already linked)
            const saveInvoice = (print) => {
              const validItems = items.filter(it=>it.desc||it.unitPrice||it.price).map(it=>({...it, price: String(lineTotal(it))}));
              const inv = {
                id: Date.now(),
                number: invNumber || genInvNumber(invoices),
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
              setInvView("list");
              showToast("Invoice saved","#34C759");
            };
            return (
              <>
                {/* Header with live total */}
                <div style={{ padding: isDesktop?"32px 40px 20px":"max(56px, env(safe-area-inset-top, 56px)) 22px 20px", background:"white" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <button onClick={()=>{ setInvView("list"); }} style={{ width:36, height:36, borderRadius:11, background:"#F5F5F3", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="back" size={18} color="#0A0A0A"/></button>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:24, fontWeight:900, color:"#0A0A0A", letterSpacing:"-0.02em" }}>New Invoice</div>
                      {invClient && <div style={{ fontSize:13, color:"#ADADAD", marginTop:2, fontWeight:500 }}>{invClient}</div>}
                    </div>
                    {draftTotal > 0 && (
                      <div style={{ background:"#0A0A0A", borderRadius:14, padding:"8px 14px", textAlign:"right" }}>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontWeight:700, letterSpacing:"0.06em" }}>TOTAL</div>
                        <div style={{ fontSize:16, fontWeight:900, color:"white", letterSpacing:"-0.01em" }}>{C.currency} {fmt(draftTotal)}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: isDesktop?"0 40px 60px":"0 22px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>

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
                    <Field label="Invoice number">
                      <Input placeholder="RS-202601-001" value={invNumber} onChange={e=>setInvNumber(e.target.value)}/>
                    </Field>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <Field label="Date"><Input type="date" value={invDate} onChange={e=>setInvDate(e.target.value)}/></Field>
                      <Field label={`Postage (${C.currency})`}><Input type="number" placeholder="0.00" value={invPorto} onChange={e=>setInvPorto(e.target.value)}/></Field>
                    </div>
                  </Card>


                  {/* Items — all, whether from order or manual */}
                  <SectionTitle>Items</SectionTitle>
                  {items.map((it,idx)=>(
                    <Card key={it.id}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em" }}>Item {idx+1}</div>
                        <button onClick={()=>setItems(items.filter(i=>i.id!==it.id))} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="trash" size={16} color="#FF3B30"/></button>
                      </div>
                      <Field label="Description"><Input placeholder="e.g. Pavé setting – ring" value={it.desc} onChange={e=>setItems(items.map(i=>i.id===it.id?{...i,desc:e.target.value}:i))}/></Field>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        <Field label="Qty"><Input type="number" placeholder="1" value={it.qty||""} onChange={e=>setItems(items.map(i=>i.id===it.id?{...i,qty:e.target.value}:i))}/></Field>
                        <Field label={`Unit price (${C.currency})`}><Input type="number" placeholder="0.00" value={it.unitPrice||""} onChange={e=>setItems(items.map(i=>i.id===it.id?{...i,unitPrice:e.target.value}:i))}/></Field>
                      </div>
                      {lineTotal(it) > 0 && <div style={{ fontSize:12, color:"#8E8E93", marginTop:2 }}>Total: <strong style={{color:"#0A0A0A"}}>{C.currency} {fmt(lineTotal(it))}</strong></div>}
                    </Card>
                  ))}
                  <button onClick={()=>setItems([...items,newItem()])} style={{ width:"100%", padding:"13px", background:"white", border:"2px dashed #E5E5EA", borderRadius:14, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:"#8E8E93", cursor:"pointer", marginBottom:10 }}>+ Add item</button>

                  {/* Add items from another order of the same client */}
                  {(() => {
                    const alreadyLinked = items.map(it=>it.orderRef).filter(Boolean);
                    const otherOrders = orders.filter(o =>
                      o.client === invClient &&
                      (o.lineItems||[]).length > 0 &&
                      !alreadyLinked.includes(o.id) &&
                      o.status !== "invoiced"
                    );
                    if(!invClient || otherOrders.length === 0) return null;
                    return (
                      <div style={{ marginBottom:16 }}>
                        <Select value="" onChange={e=>{
                          const o = orders.find(x=>x.id===e.target.value);
                          if(!o) return;
                          const newItems = (o.lineItems||[]).map(li=>({ id:Date.now()+Math.random(), desc:li.desc, qty:li.qty||"1", unitPrice:li.unitPrice||"", price:String(lineTotal(li)), orderRef:o.id }));
                          setItems([...items, ...newItems]);
                        }}>
                          <option value="">+ Add items from another order…</option>
                          {otherOrders.map(o=>(
                            <option key={o.id} value={o.id}>
                              #{o.id}{o.description ? ` · ${o.description}` : ""}{o.deadline ? ` · ${o.deadline}` : ""}
                            </option>
                          ))}
                        </Select>
                      </div>
                    );
                  })()}

                  {/* Live total */}
                  {(draftSub>0||draftPorto>0) && (
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
            const invSub   = inv.items.reduce((s,it)=>s+lineTotal(it),0);
            const invPortoVal = parseFloat(inv.porto)||0;
            const invMwst  = invSub * C.taxRate;
            const invTotal = invSub + invPortoVal + invMwst;
            return (
              <>
                <div style={{ padding: isDesktop?"32px 40px 20px":"max(56px, env(safe-area-inset-top, 56px)) 22px 20px", background:"white" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <button onClick={()=>{ setSelectedInvoice(null); setInvView("list"); }} style={{ width:36, height:36, borderRadius:11, background:"#F5F5F3", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="back" size={18} color="#0A0A0A"/></button>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:22, fontWeight:900, color:"#0A0A0A", letterSpacing:"-0.02em" }}>{inv.number}</div>
                      {inv.client && <div style={{ fontSize:13, color:"#ADADAD", marginTop:2, fontWeight:500 }}>{inv.client}</div>}
                    </div>
                    <button onClick={()=>{ setInvoices(invoices.filter(i=>i.id!==inv.id)); setSelectedInvoice(null); setInvView("list"); }} style={{ width:36, height:36, borderRadius:11, background:"#FFF0EF", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="trash" size={17} color="#FF3B30"/></button>
                  </div>
                </div>
                <div style={{ padding: isDesktop?"20px 40px 60px":"20px 16px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>

                  {/* ── INVOICE PREVIEW CARD ── */}
                  <div style={{ background:"white", border:"1.5px solid #E5E5EA", borderRadius:16, padding:"28px 24px", marginBottom:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
                    {/* Header */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                      <img src="/logo.png" alt={C.businessName} style={{ height:52, objectFit:"contain" }}/>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:10, color:"#C7C7CC", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>Rechnung</div>
                        <div style={{ fontSize:13, fontFamily:"monospace", fontWeight:700, color:"#1C1C1E", marginTop:2 }}>{inv.number}</div>
                        <div style={{ fontSize:11, color:"#8E8E93" }}>{new Date(inv.date+"T12:00:00").toLocaleDateString("de-CH")}</div>
                        <div style={{ fontSize:11, marginTop:6, padding:"2px 8px", borderRadius:6, display:"inline-block", background: inv.printed?"#34C75920":"#FF950020", color: inv.printed?"#34C759":"#FF9500", fontWeight:700 }}>{inv.printed?"Printed":"Saved"}</div>
                      </div>
                    </div>

                    {/* To */}
                    <div style={{ background:"#F2F2F7", borderRadius:10, padding:"10px 14px", marginBottom:18 }}>
                      <div style={{ fontSize:9, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:700, marginBottom:3 }}>To</div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#1C1C1E" }}>{inv.client}</div>
                    </div>

                    {/* Items table */}
                    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12, tableLayout:"fixed" }}>
                      <colgroup>
                        <col style={{ width:"46%" }}/>
                        <col style={{ width:"10%" }}/>
                        <col style={{ width:"22%" }}/>
                        <col style={{ width:"22%" }}/>
                      </colgroup>
                      <thead>
                        <tr style={{ borderBottom:"1.5px solid #E5E5EA" }}>
                          <th style={{ textAlign:"left", fontSize:9, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.07em", padding:"4px 4px 7px 0", fontWeight:700 }}>Description</th>
                          <th style={{ textAlign:"right", fontSize:9, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.07em", padding:"4px 0 7px", fontWeight:700 }}>Qty</th>
                          <th style={{ textAlign:"right", fontSize:9, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.07em", padding:"4px 0 7px", fontWeight:700 }}>Unit</th>
                          <th style={{ textAlign:"right", fontSize:9, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.07em", padding:"4px 0 7px", fontWeight:700 }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items.map((it,i)=>{
                          const qty = parseFloat(it.qty)||1;
                          const unit = parseFloat(it.unitPrice)||parseFloat(it.price)||0;
                          const tot = qty * unit;
                          return (
                            <tr key={i} style={{ borderBottom:"1px solid #F2F2F7" }}>
                              <td style={{ padding:"7px 4px 7px 0", verticalAlign:"top" }}>
                                <div style={{ fontSize:12, fontWeight:600, color:"#1C1C1E", wordBreak:"break-word" }}>{it.desc||"—"}</div>
                                {it.orderRef && <div style={{ fontSize:9, color:"#ADADAD", marginTop:2 }}>#{it.orderRef}</div>}
                              </td>
                              <td style={{ padding:"7px 0", textAlign:"right", fontSize:12, color:"#8E8E93", verticalAlign:"top" }}>{qty}</td>
                              <td style={{ padding:"7px 0", textAlign:"right", fontSize:11, color:"#8E8E93", verticalAlign:"top" }}>{C.currency} {fmt(unit)}</td>
                              <td style={{ padding:"7px 0", textAlign:"right", fontSize:12, fontWeight:700, color:"#1C1C1E", verticalAlign:"top" }}>{C.currency} {fmt(tot)}</td>
                            </tr>
                          );
                        })}
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
          <div style={{ padding: isDesktop?"32px 40px 20px":"max(56px, env(safe-area-inset-top, 56px)) 22px 20px", background:"white" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                {clientView!=="list" && (
                  <button onClick={()=>setClientView("list")} style={{ width:36, height:36, borderRadius:11, background:"#F5F5F3", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="back" size={18} color="#0A0A0A"/></button>
                )}
                <div>
                  <div style={{ fontSize: clientView==="list"?28:22, fontWeight:900, color:"#0A0A0A", letterSpacing:"-0.02em", lineHeight:1.1 }}>
                    {clientView==="list" ? "Clients" : clientView==="new" ? "New Client" : clientView==="edit" ? "Edit Client" : (clients.find(c=>c.id===selectedClientId)?.company || clients.find(c=>c.id===selectedClientId)?.name || "Client")}
                  </div>
                  {clientView==="list" && <div style={{ fontSize:13, color:"#ADADAD", marginTop:3, fontWeight:500 }}>{clients.length} client{clients.length!==1?"s":""}</div>}
                </div>
              </div>
              {clientView==="list" && (
                <button onClick={()=>{ setClientDraft(newClient()); setClientView("new"); }} style={{ width:40, height:40, borderRadius:12, background:"#0A0A0A", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon name="plus" size={18} color="white"/>
                </button>
              )}
              {clientView==="detail" && (
                <button onClick={()=>{ setClientDraft({...clients.find(c=>c.id===selectedClientId)}); setClientView("edit"); }} style={{ background:"#F5F5F3", border:"none", cursor:"pointer", padding:"8px 14px", borderRadius:10, fontSize:13, fontWeight:700, color:"#0A0A0A" }}>Edit</button>
              )}
            </div>
          </div>

          <div style={{ padding: isDesktop?"20px 40px 60px":"20px 16px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>

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
                {clients.map((c, idx) => {
                  const orderCount = orders.filter(o=>o.clientId===c.id||o.client===(c.company||c.name)).length;
                  const priorityColor = idx === 0 ? "#FF3B30" : idx === 1 ? "#FF9500" : idx === 2 ? "#007AFF" : "#ADADAD";
                  return (
                    <button key={c.id} onClick={()=>{ setSelectedClientId(c.id); setClientView("detail"); }}
                      style={{ width:"100%", background:"white", border:"none", borderRadius:16, padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:14, cursor:"pointer", textAlign:"left", boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:"#F5F5F3", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <span style={{ fontSize:16, fontWeight:900, color:priorityColor, lineHeight:1 }}>{idx+1}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:"#0A0A0A", letterSpacing:"-0.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.company || c.name}</div>
                        <div style={{ fontSize:12, color:"rgba(0,0,0,0.38)", fontWeight:500, marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {c.company && c.name ? c.name : c.address?.split("\n")[0] || ""}
                        </div>
                      </div>
                      {orderCount > 0 && <span style={{ fontSize:11, fontWeight:700, color:"#6B6B6B", background:"#F0F0F0", padding:"3px 9px", borderRadius:8, flexShrink:0 }}>{orderCount} order{orderCount!==1?"s":""}</span>}
                    </button>
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
                  <Card style={{ background:PASTELS.orders, border:"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                      <div style={{ width:52, height:52, borderRadius:16, background:"#0A0A0A", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Icon name="person" size={26} color="white"/>
                      </div>
                      <div>
                        <div style={{ fontSize:17, fontWeight:800, color:"#0A0A0A", letterSpacing:"-0.01em" }}>{c.company || c.name}</div>
                        {c.company && c.name && <div style={{ fontSize:13, color:"#6B6B6B" }}>{c.name}</div>}
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
        <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:500, background:"white", borderTop:"1px solid #EBEBEB", display:"flex", padding:"10px 0 max(28px, env(safe-area-inset-bottom, 28px))", zIndex:100 }}>
          {[
            { key:"home",    icon:"orders",  label:"Home"    },
            { key:"scan",    icon:"scan",    label:"Scan"    },
            { key:"orders",  icon:"gem",     label:"Orders"  },
            { key:"clients", icon:"person",  label:"Clients" },
            { key:"invoice", icon:"invoice", label:"Invoice" },
          ].map(({ key, icon, label }) => (
            <button key={key} onClick={()=>{ setTab(key); if(key==="scan")resetPhoto(); if(key==="orders"){ setView("list"); } if(key==="invoice"){ setInvView("list"); setSelectedInvoice(null); } if(key==="clients"){ setClientView("list"); } }} style={{ flex:1, background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"4px 0" }}>
              <div style={{ width:44, height:34, borderRadius:11, background: tab===key ? "#0A0A0A" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}>
                <Icon name={icon} size={20} color={tab===key ? "white" : "#ADADAD"}/>
              </div>
              <span style={{ fontSize:10, fontWeight: tab===key ? 700 : 500, color: tab===key ? "#0A0A0A" : "#ADADAD" }}>{label}</span>
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
                  {C.address.replace(/\n/g," ◆ ")} ◆ {C.phone} ◆ info@stoneartprecision.com
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
            <div onClick={e=>e.stopPropagation()} style={{ background:"white", borderRadius:"28px 28px 0 0", width:"100%", maxWidth:480, maxHeight:"88vh", display:"flex", flexDirection:"column", animation:"fadeUp 0.25s ease" }}>

              {/* Header */}
              <div style={{ padding:"16px 22px 18px", flexShrink:0 }}>
                <div style={{ width:40, height:4, background:"#E5E5EA", borderRadius:2, margin:"0 auto 18px" }}/>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:22, fontWeight:900, color:"#0A0A0A", textTransform:"capitalize", letterSpacing:"-0.02em" }}>{dayLabel}</div>
                    <div style={{ fontSize:13, color:"#ADADAD", marginTop:3, fontWeight:500 }}>
                      {dateObj.toLocaleDateString("en-GB",{ day:"numeric", month:"long", year:"numeric" })}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    {/* Alert toggle */}
                    <button onClick={()=>setDayNotes(n=>({...n,[d]:{...(n[d]||{}),alert:!alertOn}}))}
                      style={{ width:36, height:36, borderRadius:11, background: alertOn?"#0A0A0A":"#F5F5F3", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Icon name="bell" size={18} color={alertOn?"white":"#ADADAD"}/>
                    </button>
                    <button onClick={()=>setDayModal(null)} style={{ width:36, height:36, borderRadius:11, background:"#F5F5F3", border:"none", cursor:"pointer", fontSize:20, color:"#0A0A0A", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
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
                        style={{ width:"100%", background:PASTELS.inprogress, border:"none", borderRadius:14, padding:"13px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12, cursor:"pointer", textAlign:"left" }}>
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
                        style={{ width:"100%", background:PASTELS.done, border:"none", borderRadius:14, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12, cursor:"pointer", textAlign:"left", opacity:0.8 }}>
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
                  style={{ width:"100%", padding:"13px", background:"#F5F5F3", border:"none", borderRadius:14, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color:"#0A0A0A", cursor:"pointer", marginTop:4, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <Icon name="plus" size={16} color="#0A0A0A"/> Add order for this day
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
                    style={{ width:"100%", padding:"12px 14px", border:"none", borderRadius:14, fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"#1C1C1E", background:"#F5F5F3", outline:"none", resize:"none", height:90, boxSizing:"border-box" }}
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
          <div style={{ background:"white", borderRadius:"28px 28px 0 0", padding:"24px 24px 44px", width:"100%", maxWidth:480, animation:"fadeUp 0.25s ease" }}>
            <div style={{ width:40, height:4, background:"#E5E5EA", borderRadius:2, margin:"0 auto 22px" }}/>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:13, background:"#0A0A0A", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon name="bell" size={20} color="white"/>
              </div>
              <div>
                <div style={{ fontSize:17, fontWeight:800, color:"#0A0A0A", letterSpacing:"-0.01em" }}>Note for today</div>
                <div style={{ fontSize:12, color:"#ADADAD", fontWeight:500 }}>{new Date(noteAlert.date+"T12:00:00").toLocaleDateString("en-GB",{ weekday:"long", day:"numeric", month:"long" })}</div>
              </div>
            </div>
            <div style={{ background:PASTELS.scan, borderRadius:14, padding:"14px 16px", fontSize:14, color:"#0A0A0A", lineHeight:1.6, marginBottom:20, whiteSpace:"pre-wrap", fontWeight:500 }}>{noteAlert.text}</div>
            <button onClick={()=>setNoteAlert(null)} style={{ width:"100%", padding:"16px", background:"#0A0A0A", color:"white", border:"none", borderRadius:16, fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, cursor:"pointer" }}>Got it</button>
          </div>
        </div>
      )}

      {/* ── DONE MODAL ── */}
      {doneModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:2000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ background:"white", borderRadius:"28px 28px 0 0", padding:"28px 24px 44px", width:"100%", maxWidth:430, animation:"fadeUp 0.2s ease" }}>
            <div style={{ width:40, height:4, background:"#E5E5EA", borderRadius:2, margin:"0 auto 28px" }}/>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
              <div style={{ width:64, height:64, borderRadius:20, background:PASTELS.done, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon name="checkCircle" size={32} color="#34C759"/>
              </div>
            </div>
            <div style={{ fontSize:22, fontWeight:900, color:"#0A0A0A", textAlign:"center", marginBottom:8, letterSpacing:"-0.02em" }}>Order completed!</div>
            <div style={{ fontSize:14, color:"#ADADAD", textAlign:"center", marginBottom:28, lineHeight:1.6, fontWeight:500 }}>Would you like to create an invoice for this order now?</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={()=>{ setDoneModal(null); setView("detail"); showToast("Marked as Done","#34C759"); }}
                style={{ width:"100%", padding:"16px", background:"#F5F5F3", border:"none", borderRadius:16, fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, color:"#0A0A0A", cursor:"pointer" }}>
                Not now
              </button>
              <button onClick={()=>{
                const o = orders.find(x=>x.id===doneModal);
                setDoneModal(null);
                if(o) loadOrderIntoInvoice(o);
              }}
                style={{ width:"100%", padding:"16px", background:"#0A0A0A", border:"none", borderRadius:16, fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, color:"white", cursor:"pointer" }}>
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
