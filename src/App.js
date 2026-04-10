import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { dbGet, dbSet } from './supabase';
import { Button, TextInput, TextArea } from '@carbon/react';

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
  accentColor: "#C9933A",
  serviceTypes: ["Pavé", "Bezel", "Prong", "Channel", "Flush", "Invisible"],
  itemCategories: ["Diamond", "Ruby", "Emerald", "Sapphire", "Amethyst", "Other"],
  fieldLabel: "Stone",
  subFieldLabel: "Setting",
  piecesLabel: "Pieces",
  statuses: {
    received:   { label: "Pendiente",  color: "#C9933A" },
    inprogress: { label: "Revisión",   color: "#1B3F45" },
    done:       { label: "Aprobada",   color: "#198038" },
    invoiced:   { label: "Facturada",  color: "#5A7A80" },
  },
};

const C = CONFIG;
const ACCENT = C.accentColor;

// ─── STONE ART PALETTE ──────────────────────────────────
const PASTELS = {
  scan:       "#FBF5E8",  // gold-pale
  orders:     "#E0EDEF",  // teal-light
  invoice:    "#F0F6F7",  // teal-pale
  received:   "#FBF5E8",  // gold-pale
  inprogress: "#E0EDEF",  // teal-light
  done:       "#defbe6",  // soft green
  invoiced:   "#F0F6F7",  // teal-pale
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

const nextInvNumberForClient = (invoices, clientName) => {
  if (!clientName) return genInvNumber(invoices);
  // Find all invoices for this client, get the last one's number
  const clientInvs = invoices.filter(i => i.client === clientName);
  if (clientInvs.length === 0) return genInvNumber(invoices);
  const last = clientInvs[clientInvs.length - 1].number || "";
  // Try to parse trailing sequence number: RS-YYYYMM-NNN or any-NNN
  const match = last.match(/^(.*?)(\d+)$/);
  if (!match) return genInvNumber(invoices);
  const prefix = match[1];
  const seq = String(parseInt(match[2], 10) + 1).padStart(match[2].length, "0");
  return `${prefix}${seq}`;
};

// ─── ICONS ──────────────────────────────────────────────
const Icon = ({ name, size=22, color="#1B3F45" }) => {
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
    arrowUp:     <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>,
    arrowDown:   <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>,
    dots:        <svg style={s} viewBox="0 0 24 24" fill={color} stroke="none"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>,
    pencil:      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    alert:       <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  };
  return icons[name] || null;
};

// ─── SHARED COMPONENTS ──────────────────────────────────
const SA_BADGE = {
  received:   { bg:"#FBF5E8", color:"#C9933A", border:"#E8BE7A" },
  inprogress: { bg:"#E0EDEF", color:"#1B3F45", border:"#2A5F68" },
  done:       { bg:"#defbe6", color:"#198038", border:"#82cfaa" },
  invoiced:   { bg:"#F0F6F7", color:"#5A7A80", border:"#c1c7cd" },
};
const StatusPill = ({ status }) => {
  const st = C.statuses[status];
  const badge = SA_BADGE[status];
  if(!st || !badge) return null;
  return (
    <span style={{ background: badge.bg, color: badge.color, border:`1px solid ${badge.border}`, borderRadius:6, padding:"2px 10px", fontSize:11, fontWeight:600, fontFamily:"'IBM Plex Sans', sans-serif", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>
      {st.label}
    </span>
  );
};

const Field = ({ label, children }) => (
  <div style={{ marginBottom:16 }}>
    <div style={{ fontSize:"0.75rem", fontWeight:600, color:"#5A7A80", letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:4, fontFamily:"'IBM Plex Sans', sans-serif" }}>{label}</div>
    {children}
  </div>
);

// Carbon TextInput wrapper — generates stable id per instance
const Input = ({ labelText = "", id: providedId, ...props }) => {
  const idRef = useRef(null);
  if (!idRef.current) idRef.current = providedId || `ssp-input-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <TextInput
      id={idRef.current}
      labelText={labelText}
      hideLabel
      {...props}
    />
  );
};

const CHEVRON_URL = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235A7A80' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C%2Fsvg%3E\")";
const selectBase = { width:"100%", padding:"13px 40px 13px 14px", border:"1.5px solid #E8E4DC", borderRadius:14, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:14, color:"#1B3F45", background:"#ffffff", outline:"none", boxSizing:"border-box", appearance:"none", WebkitAppearance:"none", backgroundImage:CHEVRON_URL, backgroundRepeat:"no-repeat", backgroundPosition:"right 14px center" };
const Select = ({ children, ...props }) => (
  <select {...props} style={{ ...selectBase, color: props.value ? "#1B3F45" : "#5A7A80", ...props.style }}>
    {children}
  </select>
);

// Carbon TextArea wrapper
const Textarea = ({ id: providedId, labelText = "", rows = 3, ...props }) => {
  const idRef = useRef(null);
  if (!idRef.current) idRef.current = providedId || `ssp-textarea-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <TextArea
      id={idRef.current}
      labelText={labelText}
      hideLabel
      rows={rows}
      {...props}
    />
  );
};

// Carbon Button wrappers
const BtnPrimary = ({ children, onClick, disabled, style={} }) => (
  <Button
    kind="primary"
    onClick={onClick}
    disabled={disabled}
    style={{ display:"flex", alignItems:"center", gap:8, ...style }}
  >
    {children}
  </Button>
);

const BtnGhost = ({ children, onClick, disabled, style={} }) => (
  <Button
    kind="ghost"
    onClick={onClick}
    disabled={disabled}
    style={{ display:"flex", alignItems:"center", gap:8, ...style }}
  >
    {children}
  </Button>
);

// Stone Art card — 16px radius, generous padding, subtle shadow
const Card = ({ children, onClick, style={} }) => (
  <div onClick={onClick} style={{ background:"#ffffff", padding:"20px 22px", marginBottom:14, border:"0.5px solid #E8E4DC", borderRadius:16, boxShadow:"0 2px 8px rgba(27,63,69,0.07)", cursor: onClick ? "pointer" : "default", ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontSize:"0.75rem", fontWeight:600, color:"#5A7A80", letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:12, fontFamily:"'IBM Plex Sans', sans-serif" }}>
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
  const showToast = (msg, color="#198038") => { setToast({msg,color}); setTimeout(()=>setToast(null), 2000); };
  const [clients, setClients]     = useState(() => { try { const s = localStorage.getItem("ssp_clients"); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [clientView, setClientView] = useState("list"); // "list" | "new" | "edit" | "detail"
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientDraft, setClientDraft] = useState(newClient());
  const [filterClient, setFilterClient] = useState("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm }
  const showConfirm = (message, onConfirm) => setConfirmModal({ message, onConfirm });
  const [workOrderPreview, setWorkOrderPreview] = useState(null);
  const [doneModal, setDoneModal] = useState(null); // order to prompt invoice creation
  const [rechnungData, setRechnungData] = useState(null);
  const [photoStep, setPhotoStep] = useState("capture");
  const [imgData, setImgData]   = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg]       = useState("");
  const [aiError, setAiError]   = useState("");
  const [newOrderStep, setNewOrderStep]   = useState(1);
  const [newClientSheet, setNewClientSheet] = useState(false);
  const [sheetClient, setSheetClient]     = useState({ name:"", address:"", phone:"", email:"" });
  const [clientSearch, setClientSearch]   = useState("");
  const [confirmSheet, setConfirmSheet]   = useState(null); // { type:"done"|"invoice"|"delete", order:{} }
  const [optionsMenu, setOptionsMenu]     = useState(null); // order object | null
  const [swipeHintSeen, setSwipeHintSeen] = useState(() => localStorage.getItem("ssp_swipe_hint")==="1");
  const [swipingCard, setSwipingCard]     = useState(null); // { id, startX, dx }
  const [editingPieceId, setEditingPieceId] = useState(null);
  const [dragIdx, setDragIdx]     = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragTouchStartY = useRef(null);
  const [extracted, setExtracted] = useState(null);
  const fileRef = useRef();
  const draftPhotoRef = useRef();
  const calStripRef = useRef();
  const piecePhotoRef = useRef();
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

  // ── LOAD FROM SUPABASE ON MOUNT (cloud overrides local cache) ──
  const [dbLoaded, setDbLoaded] = useState(false);
  useEffect(() => {
    const load = async () => {
      try {
        const [o, inv, cl, dn] = await Promise.all([
          dbGet('orders'), dbGet('invoices'), dbGet('clients'), dbGet('day_notes')
        ]);
        if (o   != null) setOrders(o);
        if (inv != null) setInvoices(inv);
        if (cl  != null) setClients(cl);
        if (dn  != null) setDayNotes(dn);
      } catch(_) {}
      setDbLoaded(true);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── SAVE TO LOCALSTORAGE + SUPABASE ──
  useEffect(() => {
    if (!dbLoaded) return;
    try { localStorage.setItem("ssp_orders", JSON.stringify(orders)); }
    catch(e) { try { localStorage.setItem("ssp_orders", JSON.stringify(orders.map(o=>({...o,photo:null})))); } catch(_) {} }
    dbSet('orders', orders).catch(()=>{});
  }, [orders, dbLoaded]);
  useEffect(() => {
    if (!dbLoaded) return;
    try { localStorage.setItem("ssp_invoices", JSON.stringify(invoices)); } catch(_) {}
    dbSet('invoices', invoices).catch(()=>{});
  }, [invoices, dbLoaded]);
  useEffect(() => {
    if (!dbLoaded) return;
    try { localStorage.setItem("ssp_clients", JSON.stringify(clients)); } catch(_) {}
    dbSet('clients', clients).catch(()=>{});
  }, [clients, dbLoaded]);
  useEffect(() => {
    if (!dbLoaded) return;
    try { localStorage.setItem("ssp_day_notes", JSON.stringify(dayNotes)); } catch(_) {}
    dbSet('day_notes', dayNotes).catch(()=>{});
  }, [dayNotes, dbLoaded]);

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
    setInvNumber(nextInvNumberForClient(invoices, o.client));
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
      return `<tr><td>${it.desc || "—"}</td><td class="right">${qty}</td><td class="right">${fmtCHF(unit)}</td><td class="right">${fmtCHF(tot)}</td></tr>`;
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
    <div style={{ fontFamily:"'IBM Plex Sans', sans-serif", background:"#F7F5F0", minHeight:"100vh" }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input, select, textarea { font-size: 16px !important; font-family: 'IBM Plex Sans', sans-serif !important; }
        select:focus { outline: 2px solid ${ACCENT} !important; outline-offset: 0px; background: #ffffff !important; }
        ::-webkit-scrollbar { display: none; }
        .safe-top { padding-top: max(56px, env(safe-area-inset-top, 56px)); }
        .safe-bottom { padding-bottom: max(100px, calc(72px + env(safe-area-inset-bottom, 0px))); }
        @media (max-width: 375px) {
          .two-col { grid-template-columns: 1fr !important; }
          .filter-row { flex-wrap: wrap; }
        }
        /* ── Carbon overrides: rounded inputs ── */
        .cds--text-input-wrapper .cds--text-input,
        .cds--text-input-wrapper .cds--text-input:focus {
          border-radius: 14px !important;
          border: 1.5px solid #E8E4DC !important;
          border-bottom: 1.5px solid #E8E4DC !important;
          background: #ffffff !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .cds--text-area__wrapper .cds--text-area,
        .cds--text-area__wrapper .cds--text-area:focus {
          border-radius: 14px !important;
          border: 1.5px solid #E8E4DC !important;
          border-bottom: 1.5px solid #E8E4DC !important;
          background: #ffffff !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .cds--text-input:focus ~ .cds--text-input__divider,
        .cds--text-input__field-wrapper[data-invalid] .cds--text-input,
        .cds--text-area__wrapper--warning .cds--text-area,
        .cds--text-area__wrapper[data-invalid] .cds--text-area {
          border-radius: 14px !important;
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>

      {/* ── DESKTOP SIDEBAR ── */}
      {isDesktop && (
        <div style={{ width:240, minHeight:"100vh", background:"#1B3F45", borderRight:"none", position:"fixed", top:0, left:0, display:"flex", flexDirection:"column", paddingTop:32, zIndex:50 }}>
          <div style={{ padding:"0 24px 28px", borderBottom:"1px solid rgba(255,255,255,0.1)", marginBottom:8 }}>
            <img src="/logo.png" alt="Stone Art Precision GmbH" style={{ height:48, objectFit:"contain", display:"block" }} onError={e=>{ e.target.style.display="none"; e.target.nextSibling.style.display="block"; }}/>
            <div style={{ display:"none" }}>
              <div style={{ fontSize:"1.1rem", fontWeight:700, color:"#ffffff", fontFamily:"'IBM Plex Sans', sans-serif" }}>Stone Art</div>
              <div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.5)", fontWeight:400, marginTop:2, fontFamily:"'IBM Plex Sans', sans-serif" }}>Precision GmbH</div>
            </div>
          </div>
          {[
            { key:"home",    icon:"orders",  label:"Home"    },
            { key:"scan",    icon:"scan",    label:"Scan"    },
            { key:"orders",  icon:"gem",     label:"Orders"  },
            { key:"clients", icon:"person",  label:"Clients" },
            { key:"invoice", icon:"invoice", label:"Invoice" },
          ].map(({ key, icon, label }) => (
            <button key={key} onClick={()=>{ setTab(key); if(key==="scan")resetPhoto(); if(key==="orders")setView("list"); if(key==="invoice")setInvView("list"); if(key==="clients")setClientView("list"); }}
              style={{ width:"100%", background: tab===key ? "rgba(201,147,58,0.18)" : "none", borderLeft: tab===key ? `3px solid #C9933A` : "3px solid transparent", borderTop:"none", borderRight:"none", borderBottom:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:12, padding:"14px 20px", transition:"all 0.1s" }}>
              <Icon name={icon} size={20} color={tab===key ? "#C9933A" : "rgba(255,255,255,0.55)"}/>
              <span style={{ fontSize:"0.875rem", fontWeight: tab===key ? 600 : 400, color: tab===key ? "#ffffff" : "rgba(255,255,255,0.55)", fontFamily:"'IBM Plex Sans', sans-serif" }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── CONTENT WRAPPER ── */}
      <div style={ isDesktop ? { marginLeft:220, minHeight:"100vh" } : { maxWidth:500, margin:"0 auto" } }>

      {/* ── HOME TAB ── */}
      {tab==="home" && (
        <div style={{ animation:"fadeUp 0.3s ease" }}>

          {/* ── S1: HEADER ── */}
          <div style={{ padding: isDesktop ? "36px 40px 20px" : "max(56px, env(safe-area-inset-top, 56px)) 22px 18px", background:"white" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:13, color:"#5A7A80", fontWeight:500 }}>{greeting},</div>
                <div style={{ fontSize:36, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.03em", lineHeight:1.05 }}>{C.ownerName.split(" ")[0]}</div>
                <div style={{ fontSize:13, color:"#5A7A80", fontWeight:500, marginTop:5 }}>
                  {orders.filter(o=>o.status!=="done"&&o.status!=="invoiced").length} active order{orders.filter(o=>o.status!=="done"&&o.status!=="invoiced").length!==1?"s":""}
                </div>
              </div>
              {/* Bell + Avatar */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:4 }}>
                <button onClick={()=>{}} style={{ width:40, height:40, borderRadius:12, background:"#F0F6F7", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  <Icon name="bell" size={20} color="#1B3F45"/>
                  {orders.filter(o=>o.deadline===TODAY&&o.status!=="done"&&o.status!=="invoiced").length > 0 && (
                    <div style={{ position:"absolute", top:8, right:8, width:7, height:7, borderRadius:"50%", background:"#da1e28", border:"1.5px solid white" }}/>
                  )}
                </button>
                <div style={{ width:40, height:40, borderRadius:12, background:"#1B3F45", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:"white" }}>{C.ownerName.split(" ").map(n=>n[0]).join("").slice(0,2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── S2: CTA PRINCIPAL ── */}
          <div style={{ padding: isDesktop ? "0 40px 20px" : "0 22px 18px", background:"white" }}>
            <button onClick={()=>{ setNewOrderStep(1); setDraft(newOrder()); setClientSearch(""); setTab("orders"); setView("new"); }} style={{ width:"100%", background:PASTELS.orders, border:"none", borderRadius:20, padding:"20px 20px 22px", textAlign:"left", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ width:60, height:60, borderRadius:18, background:"#1B3F45", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon name="gem" size={28} color="white"/>
                </div>
                <div>
                  <div style={{ fontSize:18, fontWeight:600, color:"#1B3F45", letterSpacing:"-0.01em" }}>Nueva orden</div>
                  <div style={{ fontSize:13, color:"#5A7A80", fontWeight:500, marginTop:3 }}>Crear orden de trabajo</div>
                </div>
              </div>
              <div style={{ width:36, height:36, borderRadius:10, background:"rgba(27,63,69,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B3F45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg>
              </div>
            </button>
          </div>

          {/* ── S3: URGENTES ── */}
          {(() => {
            const todayStr = new Date().toISOString().split("T")[0];
            const tmrw = new Date(); tmrw.setDate(tmrw.getDate()+1);
            const tmrwStr = tmrw.toISOString().split("T")[0];
            const urgentes = orders.filter(o =>
              o.status !== "done" && o.status !== "invoiced" && o.deadline && (
                o.deadline === todayStr ||
                o.deadline === tmrwStr ||
                (o.status === "received" && o.deadline < todayStr)
              )
            );
            if(urgentes.length === 0) return null;
            const trunca4 = (txt) => {
              if(!txt) return "—";
              if(/handwritten|scanned|extract/i.test(txt)) return "Orden escaneada";
              const words = txt.trim().split(/\s+/);
              return words.length <= 4 ? txt : words.slice(0,4).join(" ") + "…";
            };
            return (
              <div style={{ padding: isDesktop ? "0 40px 20px" : "0 22px 18px" }}>
                <div style={{ border:"2px solid #C9933A", borderRadius:12, overflow:"hidden" }}>
                  {/* Header dorado sólido */}
                  <div style={{ background:"#C9933A", padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:14, fontWeight:500, color:"white" }}>Requieren atención</span>
                    <div style={{ background:"rgba(255,255,255,0.2)", borderRadius:20, padding:"2px 10px" }}>
                      <span style={{ fontSize:12, fontWeight:700, color:"white" }}>{urgentes.length} urgentes</span>
                    </div>
                  </div>
                  {/* Filas */}
                  {urgentes.map((o, idx) => {
                    const isToday = o.deadline === todayStr;
                    const isOverdue = o.deadline < todayStr;
                    const labelFecha = isOverdue ? "Vencida" : isToday ? "Hoy" : "Mañana";
                    const desc = trunca4(o.description || [o.field1, o.field2].filter(Boolean).join(" · "));
                    const tipo = o.status === "inprogress" ? "Revisión" : "Entrega";
                    const piezas = o.pieces || "—";
                    return (
                      <button key={o.id} onClick={()=>{ setSelectedId(o.id); setView("detail"); setTab("orders"); }}
                        style={{ width:"100%", background:"white", border:"none", borderTop: idx>0 ? "0.5px solid #E8E4DC" : "none", padding:"12px 14px", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:12 }}>
                        {/* Avatar 28px */}
                        <div style={{ width:28, height:28, borderRadius:6, background:"#FBF5E8", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <span style={{ fontSize:12, fontWeight:800, color:"#C9933A", lineHeight:1 }}>{piezas}</span>
                        </div>
                        {/* Info centro */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"#1B3F45", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.client || `#${o.id}`}</div>
                          <div style={{ fontSize:11, color:"#5A7A80", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>Espera: {desc}</div>
                        </div>
                        {/* Derecha */}
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontSize:11, fontWeight:700, color: isOverdue ? "#da1e28" : "#C9933A", marginBottom:2 }}>{labelFecha}</div>
                          <div style={{ fontSize:10, color:"#5A7A80" }}>{tipo}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── S4 + S5: BLOQUE UNIFICADO CALENDARIO + ÓRDENES ── */}
          {(() => {
            const todayStr = new Date().toISOString().split("T")[0];
            const days = [];
            for(let i = -7; i <= 30; i++) {
              const d = new Date(); d.setDate(d.getDate()+i);
              days.push(d.toISOString().split("T")[0]);
            }
            const DAYS_ES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

            const active = orders.filter(o => o.status !== "done" && o.status !== "invoiced");
            const withDeadline = active.filter(o => o.deadline).sort((a,b) => a.deadline.localeCompare(b.deadline));
            const sorted = [...withDeadline, ...active.filter(o => !o.deadline)];

            const ordersForDay = active.filter(o => o.deadline === selectedDate);

            const getUrgency = (deadline) => {
              if(!deadline) return { accent:"transparent", label:null };
              if(deadline < todayStr) return { accent:"#da1e28", label:"Vencida" };
              if(deadline === todayStr) return { accent:"#C9933A", label:"Hoy" };
              const diff = Math.round((new Date(deadline+"T12:00:00")-new Date(todayStr+"T12:00:00"))/(864e5));
              if(diff === 1) return { accent:"#C9933A", label:"Mañana" };
              if(diff <= 7)  return { accent:"#C9933A", label:null };
              return { accent:"transparent", label:null };
            };

            const statusBorderColor = { received:"#C9933A", inprogress:"#1B3F45", done:"#198038", invoiced:"#5A7A80" };

            const d = new Date();
            const dias  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
            const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
            const headerDate = `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;

            return (
              <div style={{ padding: isDesktop ? "0 40px max(40px,60px)" : "0 16px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>
                {/* ── Contenedor unificado ── */}
                <div style={{ background:"white", borderRadius:12, border:"0.5px solid #E8E4DC", overflow:"hidden" }}>

                  {/* Parte A: Header */}
                  <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:15, fontWeight:700, color:"#1B3F45" }}>Órdenes del día</span>
                    <span style={{ fontSize:12, color:"#5A7A80" }}>{headerDate}</span>
                  </div>

                  {/* Separador */}
                  <div style={{ height:"0.5px", background:"#E8E4DC" }}/>

                  {/* Parte B: Strip de días */}
                  <div ref={calStripRef} style={{ overflowX:"auto", display:"flex", gap:6, padding:"10px 12px", scrollbarWidth:"none" }}>
                    {days.map(dayStr => {
                      const date      = new Date(dayStr+"T12:00:00");
                      const isToday   = dayStr === TODAY;
                      const isSelected= dayStr === selectedDate;
                      const hasOrders = orders.some(o => o.deadline === dayStr && o.status !== "done" && o.status !== "invoiced");
                      const hasNote   = dayNotes[dayStr]?.text;
                      const isPast    = dayStr < TODAY;
                      return (
                        <button key={dayStr} data-today={isToday||undefined} onClick={()=>{ setSelectedDate(dayStr); setDayModal(dayStr); }}
                          style={{ flexShrink:0, width:52, padding:"9px 4px", borderRadius:16, border:"none", background: isSelected ? "#1B3F45" : isToday ? `${ACCENT}18` : "transparent", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                          <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color: isSelected ? "rgba(255,255,255,0.6)" : "#5A7A80", letterSpacing:"0.08em" }}>{DAYS_ES[date.getDay()]}</span>
                          <span style={{ fontSize:17, fontWeight:800, color: isSelected ? "white" : isPast ? "#c6c6c6" : "#1B3F45", lineHeight:1, letterSpacing:"-0.01em" }}>{date.getDate()}</span>
                          <div style={{ display:"flex", gap:3, height:5, alignItems:"center" }}>
                            {hasOrders && <div style={{ width:4, height:4, borderRadius:"50%", background: isSelected?"rgba(255,255,255,0.7)":ACCENT }}/>}
                            {hasNote   && <div style={{ width:4, height:4, borderRadius:"50%", background: isSelected?"rgba(255,255,255,0.5)":"#C9933A" }}/>}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Separador */}
                  <div style={{ height:"0.5px", background:"#E8E4DC" }}/>

                  {/* Parte D: Conteo del día seleccionado */}
                  <div style={{ padding:"10px 16px", background:"#F7F5F0" }}>
                    <span style={{ fontSize:12, color:"#5A7A80" }}>
                      {ordersForDay.length > 0
                        ? `${ordersForDay.length} ${ordersForDay.length===1?"orden":"órdenes"} para este día`
                        : "Sin órdenes para este día"}
                    </span>
                  </div>

                  {/* Separador */}
                  <div style={{ height:"0.5px", background:"#E8E4DC" }}/>

                  {/* Cards de órdenes */}
                  {sorted.length === 0 && (
                    <div style={{ padding:"28px 16px", textAlign:"center", color:"#5A7A80", fontSize:14 }}>Sin órdenes pendientes</div>
                  )}
                  {sorted.map((o, idx) => {
                    const urg = getUrgency(o.deadline);
                    const borderColor = statusBorderColor[o.status] || "#E8E4DC";
                    const rawDesc = o.description || [o.field1, o.field2].filter(Boolean).join(" · ") || null;
                    const descLabel = (() => {
                      if(!rawDesc) return null;
                      if(/handwritten|scanned|extract/i.test(rawDesc)) return "Orden escaneada";
                      return rawDesc.length > 25 ? rawDesc.slice(0,25) + "…" : rawDesc;
                    })();
                    const fmtDl = o.deadline ? new Date(o.deadline+"T12:00:00").toLocaleDateString("es-CH",{day:"numeric",month:"short"}) : null;
                    return (
                      <button key={o.id} onClick={()=>{ setSelectedId(o.id); setView("detail"); setTab("orders"); }}
                        style={{ width:"100%", background:"white", border:"none", borderTop: idx>0 ? "0.5px solid #E8E4DC" : "none", borderLeft:`4px solid ${borderColor}`, padding:"13px 16px", cursor:"pointer", textAlign:"left", display:"block" }}>
                        {/* Línea 1: cliente + monto */}
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:"#1B3F45", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, marginRight:8 }}>{o.client || `Orden #${o.id}`}</div>
                          {o.amount > 0 && <div style={{ fontSize:14, fontWeight:700, color:"#1B3F45", flexShrink:0 }}>{C.currency} {fmt(o.amount)}</div>}
                        </div>
                        {/* Línea 2: ID mono · Espera: desc truncada */}
                        <div style={{ fontSize:11, color:"#5A7A80", marginBottom:8, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontWeight:600 }}>#{o.id}</span>
                          {descLabel && <span> · Espera: {descLabel}</span>}
                        </div>
                        {/* Línea 3: ícono + fecha ←→ badge */}
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            {fmtDl ? (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={urg.accent !== "transparent" ? urg.accent : "#5A7A80"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                                <span style={{ fontSize:11, fontWeight:600, color: urg.accent !== "transparent" ? urg.accent : "#5A7A80", background: urg.accent !== "transparent" ? `${urg.accent}18` : "#F0F6F7", padding:"2px 8px", borderRadius:6 }}>
                                  {urg.label ? `${urg.label} · ` : ""}{fmtDl}
                                </span>
                              </>
                            ) : (
                              <span style={{ fontSize:11, color:"#5A7A80" }}>Sin fecha</span>
                            )}
                          </div>
                          <StatusPill status={o.status}/>
                        </div>
                      </button>
                    );
                  })}

                  {/* Footer: ver todas */}
                  {sorted.length > 0 && (
                    <>
                      <div style={{ height:"0.5px", background:"#E8E4DC" }}/>
                      <button onClick={()=>setTab("orders")} style={{ width:"100%", padding:"13px 16px", background:"#F7F5F0", border:"none", fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:700, color:"#1B3F45", cursor:"pointer", textAlign:"center" }}>
                        Ver todas las órdenes →
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── SCAN TAB ── */}
      {tab==="scan" && (
        <div style={{ animation:"fadeUp 0.3s ease" }}>
          <div style={{ padding: isDesktop?"32px 40px 20px":"max(56px, env(safe-area-inset-top, 56px)) 22px 20px", background:"white", display:"flex", alignItems:"center", gap:14 }}>
            <button onClick={goHome} style={{ width:36, height:36, borderRadius:11, background:"#F0F6F7", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="back" size={18} color="#1B3F45"/></button>
            <div style={{ fontSize:24, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.02em" }}>Scan Delivery Note</div>
          </div>

          <div style={{ padding: isDesktop?"0 40px 60px":"0 22px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>{ compressPhoto(ev.target.result).then(c=>{ setImgData(c); setPhotoStep("preview"); }); }; r.readAsDataURL(f); }}/>

            {photoStep==="capture" && (
              <>
                <div style={{ background:"white", borderRadius:24, padding:"40px 24px", textAlign:"center", marginBottom:16, border:"1.5px solid #E8E4DC" }}>
                  <div style={{ width:80, height:80, background:"#F0F6F7", borderRadius:24, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
                    <Icon name="camera" size={36} color="#1B3F45"/>
                  </div>
                  <div style={{ fontSize:20, fontWeight:700, color:"#1B3F45", marginBottom:8 }}>Take a photo</div>
                  <div style={{ fontSize:14, color:"#5A7A80", lineHeight:1.6, marginBottom:28 }}>Point your camera at the printed sheet inside the box. The AI reads everything automatically.</div>
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
                    <div><div style={{ fontSize:14, fontWeight:600, color:"#1B3F45" }}>{t}</div><div style={{ fontSize:13, color:"#5A7A80" }}>{d}</div></div>
                  </div>
                ))}
              </>
            )}

            {photoStep==="preview" && (
              <>
                <img src={imgData} alt="doc" style={{ width:"100%", maxHeight:220, objectFit:"cover", borderRadius:16, border:"1.5px solid #E8E4DC", marginBottom:16, display:"block" }}/>
                {aiLoading ? (
                  <Card style={{ textAlign:"center", padding:"32px" }}>
                    <div style={{ width:36, height:36, border:`3px solid #E8E4DC`, borderTopColor:ACCENT, borderRadius:"50%", animation:"spin 0.7s linear infinite", margin:"0 auto 16px" }}/>
                    <div style={{ fontSize:15, fontWeight:600, color:"#1B3F45", marginBottom:4 }}>{aiMsg}</div>
                    <div style={{ fontSize:13, color:"#5A7A80" }}>AI is reading the document</div>
                  </Card>
                ) : (
                  <>
                    {aiError && <div style={{ background:"#FF3B3015", border:"1px solid #FF3B3030", borderRadius:12, padding:"12px 14px", marginBottom:12, fontSize:13, color:"#da1e28", lineHeight:1.5 }}>{aiError}</div>}
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
                  <div style={{ fontSize:14, color:"#5A7A80", lineHeight:1.6, fontStyle:"italic" }}>"{extracted.summary}"</div>
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
                <div style={{ fontSize:24, fontWeight:700, color:"#1B3F45", marginBottom:8 }}>Order created!</div>
                <div style={{ fontSize:15, color:"#5A7A80", marginBottom:32 }}>It's now in your orders list.</div>
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
          <div style={{ padding: isDesktop?"32px 40px 20px":"max(56px, env(safe-area-inset-top, 56px)) 22px 16px", background:"white" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              {/* Left: date block (list) or back + title (other views) */}
              {view==="list" ? (
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  {/* Today's date block */}
                  <div style={{ background:"#1B3F45", borderRadius:16, padding:"8px 14px", textAlign:"center", minWidth:54, flexShrink:0 }}>
                    <div style={{ fontSize:28, fontWeight:900, color:"white", lineHeight:1 }}>{new Date().getDate()}</div>
                    <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.6)", letterSpacing:"0.08em", textTransform:"uppercase", marginTop:1 }}>{new Date().toLocaleDateString("es-ES",{month:"short"}).replace(".","")}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:"#9DB5B9", fontWeight:500, marginBottom:2 }}>{new Date().toLocaleDateString("es-ES",{weekday:"long"})}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.02em", lineHeight:1 }}>Órdenes</div>
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <button onClick={()=>{ if(view==="edit") setView("detail"); else if(view==="new" && newOrderStep>1) setNewOrderStep(s=>s-1); else setView("list"); }} style={{ width:36, height:36, borderRadius:11, background:"#F0F6F7", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="back" size={18} color="#1B3F45"/></button>
                  <div style={{ fontSize:24, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.02em" }}>
                    {view==="new" ? "Nueva orden" : view==="edit" ? "Edit Order" : view==="detail" ? selectedOrder?.client : "Órdenes"}
                  </div>
                </div>
              )}

              {view==="new" && (
                <div style={{ fontSize:12, fontWeight:600, color:"#9DB5B9" }}>{newOrderStep} de 3</div>
              )}
              {view==="list" && (
                <div style={{ display:"flex", gap:8 }}>
                  {selectMode
                    ? <button onClick={()=>{ setSelectMode(false); setSelectedOrderIds(new Set()); }} style={{ padding:"9px 14px", background:"#F0F6F7", border:"none", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:700, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>Cancel</button>
                    : <>
                        <button onClick={()=>setSelectMode(true)} style={{ padding:"9px 14px", background:"#F0F6F7", border:"none", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:700, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>Select</button>
                        <button onClick={()=>{ setView("new"); setNewOrderStep(1); setDraft(newOrder()); setClientSearch(""); }} style={{ width:38, height:38, borderRadius:14, background:"#C9933A", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <Icon name="plus" size={18} color="white"/>
                        </button>
                      </>
                  }
                </div>
              )}
              {view==="detail" && selectedOrder && (
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>setWorkOrderPreview(selectedOrder)} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", background:"#F0F6F7", border:"none", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:700, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>
                    <Icon name="print" size={15} color="#1B3F45"/> Print
                  </button>
                  <button onClick={()=>setOptionsMenu(selectedOrder)} style={{ width:38, height:38, background:"#F0F6F7", border:"none", borderRadius:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Icon name="dots" size={18} color="#1B3F45"/>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Barra de progreso — solo en nueva orden */}
          {view==="new" && (
            <div style={{ display:"flex", gap:4, padding:"10px 22px 12px", background:"white" }}>
              {[1,2,3].map(s=>(
                <div key={s} style={{ flex:1, height:3, borderRadius:2, background: s<newOrderStep?"#1B3F45":s===newOrderStep?"#C9933A":"#E8E4DC", transition:"background 0.2s" }}/>
              ))}
            </div>
          )}

          <div style={{ padding: view==="new" ? 0 : view==="detail" ? (isDesktop?"20px 0 120px":"12px 0 max(110px, calc(90px + env(safe-area-inset-bottom, 0px)))") : isDesktop?"16px 40px 60px":"16px 22px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>

            {/* ── LIST ── */}
            {view==="list" && (
              <>
                {/* Status filter pills */}
                <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:16, paddingBottom:2 }}>
                  {[["all","All",orders.length], ...Object.entries(C.statuses).map(([k,v])=>[k,v.label,counts[k]])].map(([key,label,cnt])=>(
                    <button key={key} style={{ padding:"8px 16px", borderRadius:100, border:"none", background: filterStatus===key ? "#1B3F45" : "white", fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", color: filterStatus===key ? "white" : "#5A7A80", flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }} onClick={()=>setFilterStatus(key)}>
                      {label}&nbsp;<span style={{ fontWeight:500, opacity:0.6 }}>{cnt}</span>
                    </button>
                  ))}
                </div>

                {/* Client + Date filters */}
                <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
                  {clients.length > 0 && (
                    <Select value={filterClient} onChange={e=>setFilterClient(e.target.value)} style={{ flex:1, minWidth:140, fontSize:13, padding:"10px 36px 10px 12px", color: filterClient!=="all"?"#1B3F45":"#5A7A80" }}>
                      <option value="all">All clients</option>
                      {[...new Set(orders.map(o=>o.client).filter(Boolean))].sort().map(c=><option key={c} value={c}>{c}</option>)}
                    </Select>
                  )}
                  <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:140 }}>
                    <Input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} style={{ fontSize:13, padding:"10px 12px", color: filterDate?"#1B3F45":"#5A7A80" }}/>
                    {filterDate && <button onClick={()=>setFilterDate("")} style={{ padding:"10px 12px", border:"none", borderRadius:12, background:"#F0F6F7", fontSize:12, fontWeight:700, color:"#5A7A80", cursor:"pointer", whiteSpace:"nowrap" }}>✕</button>}
                  </div>
                  <button onClick={exportToExcel} style={{ padding:"10px 14px", border:"none", borderRadius:12, background:"#F0F6F7", fontSize:12, fontWeight:700, color:"#1B3F45", cursor:"pointer", whiteSpace:"nowrap" }}>↓ Excel</button>
                </div>
                {/* Swipe hint — desaparece tras primera interacción */}
                {!swipeHintSeen && !selectMode && filteredOrders.length > 0 && (
                  <div style={{ textAlign:"center", fontSize:9, color:"#9DB5B9", fontWeight:500, letterSpacing:"0.04em", marginBottom:12, fontFamily:"'IBM Plex Sans', sans-serif" }}>
                    ← Desliza para marcar listo &nbsp;·&nbsp; Desliza para eliminar →
                  </div>
                )}

                {/* Order rows */}
                {filteredOrders.map((o) => {
                  const today = new Date().toISOString().split("T")[0];
                  const getUrgency = (deadline) => {
                    if(!deadline) return { accent:"transparent", label:null, bg:"#F0F6F7" };
                    if(deadline < today) return { accent:"#da1e28", label:"Vencida", bg:"#FFF0F0" };
                    if(deadline === today) return { accent:"#C9933A", label:"Hoy", bg:"#FFF8ED" };
                    const diff = Math.round((new Date(deadline+"T12:00:00")-new Date(today+"T12:00:00"))/(864e5));
                    if(diff === 1) return { accent:"#C9933A", label:"Mañana", bg:"#FFF8ED" };
                    if(diff <= 7)  return { accent:"#C9933A", label:`${diff} días`, bg:"#FFF8ED" };
                    return { accent:"#1B3F45", label:null, bg:"#F0F6F7" };
                  };
                  const urg = getUrgency(o.deadline);
                  const isChecked = selectedOrderIds.has(o.id);
                  const deadlineDate = o.deadline ? new Date(o.deadline+"T12:00:00") : null;
                  const deadlineDay = deadlineDate ? deadlineDate.getDate() : null;
                  const deadlineMon = deadlineDate ? deadlineDate.toLocaleDateString("es-ES",{month:"short"}).replace(".","").toUpperCase() : null;
                  const swipeDx = swipingCard?.id === o.id ? swipingCard.dx : 0;
                  const isMoving = swipingCard?.id === o.id;

                  return (
                    <div key={o.id} style={{ position:"relative", marginBottom:10, borderRadius:20, height:"auto" }}>

                      {/* Fondo verde — acción "Listo" (se revela con swipe izquierda) */}
                      <div style={{ position:"absolute", inset:0, background:"#E8F3EF", borderRadius:20, display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:22 }}>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                          <Icon name="check" size={22} color="#1B6048"/>
                          <span style={{ fontSize:10, color:"#1B6048", fontWeight:700, fontFamily:"'IBM Plex Sans', sans-serif" }}>Listo</span>
                        </div>
                      </div>
                      {/* Fondo rojo — acción "Eliminar" (se revela con swipe derecha) */}
                      <div style={{ position:"absolute", inset:0, background:"#FCEBEB", borderRadius:20, display:"flex", alignItems:"center", paddingLeft:22 }}>
                        <Icon name="trash" size={22} color="#A32D2D"/>
                      </div>

                      {/* Tarjeta deslizable */}
                      <div
                        onTouchStart={e => {
                          if(selectMode) return;
                          setSwipingCard({ id:o.id, startX:e.touches[0].clientX, dx:0 });
                        }}
                        onTouchMove={e => {
                          if(!swipingCard || swipingCard.id!==o.id || selectMode) return;
                          const raw = e.touches[0].clientX - swipingCard.startX;
                          const dx = Math.max(-140, Math.min(140, raw));
                          setSwipingCard(prev=>({...prev, dx}));
                        }}
                        onTouchEnd={()=>{
                          if(!swipingCard || swipingCard.id!==o.id) return;
                          const { dx } = swipingCard;
                          setSwipingCard(null);
                          if(!swipeHintSeen){ setSwipeHintSeen(true); localStorage.setItem("ssp_swipe_hint","1"); }
                          if(dx < -60) {
                            setConfirmSheet({ type:"done", order:o });
                          } else if(dx > 60) {
                            setConfirmSheet({ type:"delete", order:o });
                          }
                        }}
                        onClick={()=>{
                          if(swipingCard && Math.abs(swipingCard.dx||0) > 10) return;
                          if(selectMode){
                            setSelectedOrderIds(prev=>{ const n=new Set(prev); n.has(o.id)?n.delete(o.id):n.add(o.id); return n; });
                          } else {
                            setSelectedId(o.id); setView("detail");
                          }
                        }}
                        style={{ position:"relative", transform:`translateX(${swipeDx}px)`, transition: isMoving?"none":"transform 0.3s ease",
                          background: isChecked?"#FFF3F0":"white", border: isChecked?"2px solid #da1e2840":"1.5px solid #F0EDE8",
                          borderRadius:20, padding:"16px", display:"flex", alignItems:"stretch", gap:14,
                          cursor:"pointer", textAlign:"left", boxShadow:"0 2px 12px rgba(0,0,0,0.07)", userSelect:"none" }}>

                        {/* Select checkbox (solo en modo selección) */}
                        {selectMode && (
                          <div style={{ width:32, display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:2, flexShrink:0 }}>
                            {isChecked
                              ? <div style={{ width:22, height:22, borderRadius:6, background:"#da1e28", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="check" size={14} color="white"/></div>
                              : <div style={{ width:22, height:22, borderRadius:6, border:"2px solid #D8D4CC" }}/>
                            }
                          </div>
                        )}

                        {/* Main content */}
                        <div style={{ flex:1, minWidth:0 }}>
                          {/* Client name + status */}
                          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom:10 }}>
                            <div style={{ fontSize:16, fontWeight:800, color:"#1B3F45", lineHeight:1.2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{o.client || "—"}</div>
                            <StatusPill status={o.status}/>
                          </div>

                          {/* Delivery date — prominent */}
                          <div style={{ display:"flex", alignItems:"center", gap:10, background: urg.bg, borderRadius:12, padding:"10px 14px", marginBottom: o.description ? 10 : 0 }}>
                            {deadlineDay ? (
                              <>
                                <div style={{ textAlign:"center", flexShrink:0 }}>
                                  <div style={{ fontSize:28, fontWeight:900, color: urg.accent !== "transparent" ? urg.accent : "#1B3F45", lineHeight:1 }}>{deadlineDay}</div>
                                  <div style={{ fontSize:10, fontWeight:700, color: urg.accent !== "transparent" ? urg.accent : "#5A7A80", letterSpacing:"0.08em", marginTop:1 }}>{deadlineMon}</div>
                                </div>
                                <div style={{ width:"1px", height:36, background: urg.accent !== "transparent" ? `${urg.accent}30` : "#D8D4CC", flexShrink:0 }}/>
                                <div>
                                  <div style={{ fontSize:10, fontWeight:700, color:"#9DB5B9", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>Entrega</div>
                                  {urg.label && <div style={{ fontSize:13, fontWeight:800, color: urg.accent }}>{urg.label}</div>}
                                  {!urg.label && <div style={{ fontSize:12, fontWeight:600, color:"#5A7A80" }}>{deadlineDate.toLocaleDateString("es-ES",{weekday:"long"})}</div>}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize:12, color:"#9DB5B9", fontStyle:"italic" }}>Sin fecha de entrega</div>
                            )}
                          </div>

                          {/* Description */}
                          {o.description && (
                            <div style={{ fontSize:12, color:"#7A9AA0", lineHeight:1.4, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{o.description}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Bulk delete bar */}
                {selectMode && selectedOrderIds.size > 0 && (
                  <div style={{ position:"fixed", bottom:"max(80px, calc(72px + env(safe-area-inset-bottom, 0px)))", left:"50%", transform:"translateX(-50%)", width:"calc(100% - 32px)", maxWidth:468, zIndex:200, animation:"fadeUp 0.2s ease" }}>
                    <button onClick={()=>{
                      const count = selectedOrderIds.size;
                      showConfirm(`Delete ${count} order${count>1?"s":""}? This cannot be undone.`,()=>{
                        setOrders(orders.filter(o=>!selectedOrderIds.has(o.id)));
                        setSelectedOrderIds(new Set());
                        setSelectMode(false);
                        showToast(`${count} order${count>1?"s":""} deleted`, "#da1e28");
                      });
                    }} style={{ width:"100%", padding:"17px", background:"#da1e28", color:"white", border:"none", borderRadius:18, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:16, fontWeight:800, cursor:"pointer", boxShadow:"0 4px 20px rgba(255,59,48,0.4)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      <Icon name="trash" size={18} color="white"/> Delete {selectedOrderIds.size} order{selectedOrderIds.size>1?"s":""}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── NEW ORDER — WIZARD 3 PASOS ── */}
            {view==="new" && (()=>{
              const pieceTotal = (draft.lineItems||[]).reduce((s,li)=>s+lineTotal(li),0);
              const clientName = draft.client || "";

              /* ── PASO 1: Cliente ── */
              if(newOrderStep===1) {
                const allClients = clients.length > 0 ? clients : [];
                const filtered = allClients.filter(c=>{
                  const n = (c.company||c.name||"").toLowerCase();
                  return n.includes(clientSearch.toLowerCase());
                });
                return (
                  <div style={{ paddingBottom:"max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>
                    <input ref={draftPhotoRef} type="file" accept="image/*" style={{display:"none"}} onChange={()=>{}}/>
                    <div style={{ padding:"16px 22px 10px" }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"#9DB5B9", letterSpacing:"0.1em", textTransform:"uppercase" }}>¿Para quién es?</div>
                    </div>
                    {/* Card de clientes */}
                    <div style={{ margin:"0 16px", background:"white", borderRadius:12, border:"0.5px solid #E8E4DC", overflow:"hidden" }}>
                      {/* Buscador */}
                      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <input value={clientSearch} onChange={e=>setClientSearch(e.target.value)} placeholder="Buscar cliente..." style={{ flex:1, border:"none", outline:"none", fontSize:14, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif", background:"transparent" }}/>
                        {clientSearch && <button onClick={()=>setClientSearch("")} style={{ background:"none", border:"none", color:"#9DB5B9", cursor:"pointer", fontSize:16, padding:0 }}>×</button>}
                      </div>
                      <div style={{ height:"0.5px", background:"#E8E4DC" }}/>
                      {/* Lista de clientes */}
                      {filtered.length === 0 && clientSearch && (
                        <div style={{ padding:"16px 14px", fontSize:13, color:"#9DB5B9", textAlign:"center" }}>Sin resultados para "{clientSearch}"</div>
                      )}
                      {filtered.map((c, idx)=>{
                        const name = c.company||c.name;
                        const initials = name.split(" ").map(w=>w[0]||"").join("").slice(0,2).toUpperCase();
                        const orderCount = orders.filter(o=>o.clientId===c.id||o.client===name).length;
                        const isSelected = draft.clientId===c.id;
                        return (
                          <button key={c.id} onClick={()=>{ setDraft(d=>({...d,clientId:c.id,client:name,lineItems:d.lineItems?.length?d.lineItems:[{id:Date.now(),desc:"",qty:"1",unitPrice:"",photo:null}]})); setNewOrderStep(2); }}
                            style={{ width:"100%", background: isSelected?"#F0F6F7":"white", border:"none", borderTop: idx>0?"0.5px solid #E8E4DC":"none", padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:12, textAlign:"left" }}>
                            <div style={{ width:36, height:36, borderRadius:"50%", background:"#1B3F45", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                              <span style={{ fontSize:13, fontWeight:700, color:"#C9933A" }}>{initials}</span>
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:700, color:"#1B3F45" }}>{name}</div>
                              <div style={{ fontSize:11, color:"#9DB5B9", marginTop:1 }}>{orderCount} {orderCount===1?"orden anterior":"órdenes anteriores"}</div>
                            </div>
                            {isSelected && (
                              <div style={{ width:20, height:20, borderRadius:"50%", background:"#198038", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                <Icon name="check" size={12} color="white"/>
                              </div>
                            )}
                          </button>
                        );
                      })}
                      {filtered.length > 0 && <div style={{ height:"0.5px", background:"#E8E4DC" }}/>}
                      {/* + Crear nuevo cliente */}
                      <button onClick={()=>{ setSheetClient({name:"",address:"",phone:"",email:""}); setNewClientSheet(true); }}
                        style={{ width:"100%", background:"none", border:"none", padding:"14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, justifyContent:"center" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9933A" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        <span style={{ fontSize:14, fontWeight:600, color:"#C9933A", fontFamily:"'IBM Plex Sans', sans-serif" }}>Crear nuevo cliente</span>
                      </button>
                    </div>
                    {/* Botón continuar fijo */}
                    <div style={{ position:"fixed", bottom:"max(24px, env(safe-area-inset-bottom, 24px))", left:"50%", transform:"translateX(-50%)", width:"calc(100% - 32px)", maxWidth:468, zIndex:200 }}>
                      <button disabled={!draft.client} onClick={()=>{ setNewOrderStep(2); if(!(draft.lineItems||[]).length) setDraft(d=>({...d,lineItems:[{id:Date.now(),desc:"",qty:"1",unitPrice:"",photo:null}]})); }}
                        style={{ width:"100%", padding:"16px", background:draft.client?"#1B3F45":"#E8E4DC", color:draft.client?"white":"#9DB5B9", border:"none", borderRadius:16, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:700, cursor:draft.client?"pointer":"default" }}>
                        Continuar →
                      </button>
                    </div>
                    {/* Bottom sheet — nuevo cliente */}
                    {newClientSheet && (<>
                      <div onClick={()=>setNewClientSheet(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:300 }}/>
                      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:500, background:"white", borderRadius:"24px 24px 0 0", padding:"0 0 max(28px, env(safe-area-inset-bottom, 28px))", zIndex:301 }}>
                        {/* Handle */}
                        <div style={{ padding:"14px 0 0", display:"flex", justifyContent:"center" }}>
                          <div style={{ width:36, height:4, borderRadius:2, background:"#E8E4DC" }}/>
                        </div>
                        {/* Título */}
                        <div style={{ padding:"16px 24px 4px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <span style={{ fontSize:18, fontWeight:700, color:"#1B3F45" }}>Nuevo cliente</span>
                          <button onClick={()=>setNewClientSheet(false)} style={{ background:"#F0F6F7", border:"none", borderRadius:"50%", width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A7A80" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        </div>
                        {/* Campo principal */}
                        <div style={{ padding:"16px 24px 0" }}>
                          <input
                            autoFocus
                            placeholder="Nombre de la empresa *"
                            value={sheetClient.name}
                            onChange={e=>setSheetClient(s=>({...s,name:e.target.value}))}
                            style={{ width:"100%", padding:"16px", fontSize:16, fontWeight:600, color:"#1B3F45",
                              border: sheetClient.name.trim()?"2px solid #1B3F45":"2px solid #E8E4DC",
                              borderRadius:14, fontFamily:"'IBM Plex Sans', sans-serif",
                              background: sheetClient.name.trim()?"#F0F6F7":"white",
                              outline:"none", boxSizing:"border-box", transition:"all 0.15s" }}/>
                        </div>
                        {/* Campos opcionales */}
                        <div style={{ padding:"10px 24px 0", display:"flex", flexDirection:"column", gap:10 }}>
                          {[
                            { key:"address", placeholder:"Dirección", type:"text",
                              icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="2" strokeLinecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg> },
                            { key:"phone",   placeholder:"Teléfono",  type:"tel",
                              icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.59A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/></svg> },
                            { key:"email",   placeholder:"Email",     type:"email",
                              icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg> },
                          ].map(f=>(
                            <div key={f.key} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", border:"1.5px solid #E8E4DC", borderRadius:12, background:"white" }}>
                              {f.icon}
                              <input
                                placeholder={f.placeholder}
                                value={sheetClient[f.key]||""}
                                onChange={e=>setSheetClient(s=>({...s,[f.key]:e.target.value}))}
                                type={f.type}
                                style={{ flex:1, border:"none", outline:"none", fontSize:13, color:"#5A7A80",
                                  fontFamily:"'IBM Plex Sans', sans-serif", background:"transparent", padding:0 }}/>
                            </div>
                          ))}
                        </div>
                        <div style={{ padding:"10px 24px 0", display:"flex", alignItems:"center", gap:6 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                          <span style={{ fontSize:11, color:"#9DB5B9" }}>Dirección, teléfono y email son opcionales</span>
                        </div>
                        {/* Botón */}
                        <div style={{ padding:"16px 24px 0" }}>
                          <button disabled={!sheetClient.name.trim()} onClick={()=>{
                            const nc={...newClient(),name:sheetClient.name.trim(),address:sheetClient.address,phone:sheetClient.phone,email:sheetClient.email};
                            setClients(prev=>[...prev,nc]);
                            setDraft(d=>({...d,clientId:nc.id,client:nc.name,lineItems:d.lineItems?.length?d.lineItems:[{id:Date.now(),desc:"",qty:"1",unitPrice:"",photo:null}]}));
                            setNewClientSheet(false);
                            setNewOrderStep(2);
                          }} style={{ width:"100%", padding:"17px", background:sheetClient.name.trim()?"#C9933A":"#E8E4DC",
                            color:sheetClient.name.trim()?"white":"#9DB5B9", border:"none", borderRadius:16,
                            fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:700,
                            cursor:sheetClient.name.trim()?"pointer":"default",
                            boxShadow: sheetClient.name.trim()?"0 4px 14px rgba(201,147,58,0.3)":"none",
                            transition:"all 0.15s" }}>
                            Crear cliente →
                          </button>
                        </div>
                      </div>
                    </>)}
                  </div>
                );
              }

              /* ── PASO 2: Piezas ── */
              if(newOrderStep===2) {
                const items = draft.lineItems||[];
                const dupItem = (li) => {
                  const copy = {...li, id:Date.now()+Math.random()};
                  const idx = items.findIndex(i=>i.id===li.id);
                  const arr = [...items]; arr.splice(idx+1,0,copy);
                  setDraft(d=>({...d,lineItems:arr}));
                };
                const delItem = (id) => setDraft(d=>({...d,lineItems:d.lineItems.filter(i=>i.id!==id)}));
                const updItem = (id, patch) => setDraft(d=>({...d,lineItems:d.lineItems.map(i=>i.id===id?{...i,...patch}:i)}));
                const stepQty = (id, delta) => {
                  const cur = parseInt(items.find(i=>i.id===id)?.qty)||1;
                  updItem(id,{qty:String(Math.max(1,cur+delta))});
                };
                /* touch drag handlers */
                const onHandleTouchStart = (e, idx) => {
                  dragTouchStartY.current = e.touches[0].clientY;
                  setDragIdx(idx);
                };
                const onHandleTouchMove = (e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  const el = document.elementFromPoint(touch.clientX, touch.clientY);
                  const card = el?.closest('[data-piece-idx]');
                  if(card) setDragOverIdx(parseInt(card.dataset.pieceIdx));
                };
                const onHandleTouchEnd = () => {
                  if(dragIdx!==null && dragOverIdx!==null && dragIdx!==dragOverIdx){
                    const arr=[...items];
                    const [moved]=arr.splice(dragIdx,1);
                    arr.splice(dragOverIdx,0,moved);
                    setDraft(d=>({...d,lineItems:arr}));
                  }
                  setDragIdx(null); setDragOverIdx(null);
                };
                /* desktop drag */
                const onDragStart = (e,idx) => { e.dataTransfer.effectAllowed="move"; setDragIdx(idx); };
                const onDragOver  = (e,idx) => { e.preventDefault(); setDragOverIdx(idx); };
                const onDrop      = (e,idx) => {
                  e.preventDefault();
                  if(dragIdx!==null && dragIdx!==idx){
                    const arr=[...items];
                    const [moved]=arr.splice(dragIdx,1);
                    arr.splice(idx,0,moved);
                    setDraft(d=>({...d,lineItems:arr}));
                  }
                  setDragIdx(null); setDragOverIdx(null);
                };
                return (
                  <div style={{ paddingBottom:"max(120px, calc(90px + env(safe-area-inset-bottom, 0px)))" }}>
                    <input ref={piecePhotoRef} type="file" accept="image/*" capture="environment" style={{display:"none"}}
                      onChange={e=>{
                        const f=e.target.files[0]; if(!f||!editingPieceId)return;
                        const r=new FileReader(); r.onload=ev=>{ compressPhoto(ev.target.result).then(c=>{ updItem(editingPieceId,{photo:c}); setEditingPieceId(null); }); }; r.readAsDataURL(f);
                      }}/>
                    <div style={{ padding:"10px 20px 6px" }}>
                      <span style={{ fontSize:12, color:"#9DB5B9", fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase" }}>
                        {items.length} {items.length===1?"pieza":"piezas"} · {clientName}
                      </span>
                    </div>
                    <div style={{ padding:"0 16px" }}>
                      {items.map((li,idx)=>{
                        const isDragging = dragIdx===idx;
                        const isOver    = dragOverIdx===idx && dragIdx!==idx;
                        return (
                          <div key={li.id} data-piece-idx={idx}
                            draggable onDragStart={e=>onDragStart(e,idx)} onDragOver={e=>onDragOver(e,idx)} onDrop={e=>onDrop(e,idx)} onDragEnd={()=>{setDragIdx(null);setDragOverIdx(null);}}
                            style={{ background:"white", borderRadius:12, marginBottom:10, overflow:"hidden",
                              border: isOver?"1.5px solid #C9933A":"0.5px solid #E8E4DC",
                              opacity: isDragging?0.45:1,
                              transition:"opacity 0.15s, border 0.1s" }}>
                            {/* Cabecera */}
                            <div style={{ display:"flex", alignItems:"center", gap:0, padding:"8px 10px 8px 0", borderBottom:"0.5px solid #F0F6F7" }}>
                              {/* Handle — draggable */}
                              <div
                                onTouchStart={e=>onHandleTouchStart(e,idx)}
                                onTouchMove={onHandleTouchMove}
                                onTouchEnd={onHandleTouchEnd}
                                style={{ padding:"6px 12px", cursor:"grab", touchAction:"none", display:"flex", flexDirection:"column", gap:3, opacity:0.4 }}>
                                {[0,1,2].map(r=><div key={r} style={{ width:16, height:1.5, background:"#1B3F45", borderRadius:1 }}/>)}
                              </div>
                              <span style={{ fontSize:11, fontWeight:700, color:"#1B3F45", letterSpacing:"0.06em", textTransform:"uppercase", flex:1 }}>Pieza {idx+1}</span>
                              {/* Acciones */}
                              <div style={{ display:"flex", alignItems:"center", gap:0 }}>
                                <button onClick={()=>{ setEditingPieceId(li.id); piecePhotoRef.current.click(); }}
                                  style={{ background:"none", border:"none", cursor:"pointer", padding:"6px 7px", display:"flex", alignItems:"center" }}>
                                  <Icon name="camera" size={14} color={li.photo?"#C9933A":"#9DB5B9"}/>
                                </button>
                                <button onClick={()=>dupItem(li)} style={{ background:"none", border:"none", cursor:"pointer", padding:"6px 7px", display:"flex", alignItems:"center" }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A7A80" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                                </button>
                                {items.length>1 && (
                                  <button onClick={()=>delItem(li.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:"6px 7px", display:"flex", alignItems:"center" }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#da1e28" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* Cuerpo */}
                            <div style={{ padding:"10px 14px 12px" }}>
                              <textarea placeholder="¿Qué hay que hacer? (ej. Engaste Pavé, pulido, grabado…)" value={li.desc||""} onChange={e=>updItem(li.id,{desc:e.target.value})}
                                style={{ width:"100%", minHeight:52, border:"none", outline:"none", resize:"none", fontSize:14, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif", lineHeight:1.5, background:"transparent", boxSizing:"border-box", padding:0 }}/>
                              <div style={{ height:"0.5px", background:"#F0F6F7", margin:"8px 0" }}/>
                              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                <input placeholder="Material / tipo" value={li.material||""} onChange={e=>updItem(li.id,{material:e.target.value})}
                                  style={{ flex:1, border:"none", outline:"none", fontSize:12, color:"#5A7A80", fontFamily:"'IBM Plex Sans', sans-serif", background:"transparent", padding:0 }}/>
                                {/* Stepper de cantidad */}
                                <div style={{ display:"flex", alignItems:"center", gap:0, background:"#F7F5F0", borderRadius:8, overflow:"hidden", flexShrink:0 }}>
                                  <button onClick={()=>stepQty(li.id,-1)} style={{ background:"none", border:"none", cursor:"pointer", padding:"5px 10px", fontSize:16, color:"#1B3F45", lineHeight:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>−</button>
                                  <span style={{ fontSize:13, fontWeight:700, color:"#1B3F45", minWidth:20, textAlign:"center", fontFamily:"'IBM Plex Sans', sans-serif" }}>{li.qty||1}</span>
                                  <button onClick={()=>stepQty(li.id,1)} style={{ background:"none", border:"none", cursor:"pointer", padding:"5px 10px", fontSize:16, color:"#1B3F45", lineHeight:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>+</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <button onClick={()=>setDraft(d=>({...d,lineItems:[...(d.lineItems||[]),{id:Date.now()+Math.random(),desc:"",qty:"1",unitPrice:"",photo:null}]}))}
                        style={{ width:"100%", border:"1.5px dashed #C9933A", borderRadius:12, background:"none", padding:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:16 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9933A" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        <span style={{ fontSize:14, fontWeight:600, color:"#C9933A", fontFamily:"'IBM Plex Sans', sans-serif" }}>Agregar otra pieza</span>
                      </button>
                    </div>
                    <div style={{ position:"fixed", bottom:"max(24px, env(safe-area-inset-bottom, 24px))", left:"50%", transform:"translateX(-50%)", width:"calc(100% - 32px)", maxWidth:468, zIndex:200 }}>
                      <button onClick={()=>setNewOrderStep(3)}
                        style={{ width:"100%", padding:"16px", background:"#1B3F45", color:"white", border:"none", borderRadius:16, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:700, cursor:"pointer" }}>
                        Continuar →
                      </button>
                    </div>
                  </div>
                );
              }

              /* ── PASO 3: Detalles ── */
              const addDays = (n) => { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; };
              const quickDates = [
                { label:"1 semana",  date: addDays(7)  },
                { label:"2 semanas", date: addDays(14) },
                { label:"1 mes",     date: addDays(30) },
              ];
              const clientInitials = clientName.split(" ").map(w=>w[0]||"").join("").slice(0,2).toUpperCase();
              const saveOrder = () => {
                const order={...draft, amount:pieceTotal};
                setOrders([order,...orders]);
                syncToSheets(order);
                setDraft(newOrder());
                setNewOrderStep(1);
                setClientSearch("");
                setView("list");
                showToast("Orden guardada");
              };
              return (
                <div style={{ padding:"16px 16px max(110px, calc(90px + env(safe-area-inset-bottom, 0px)))" }}>

                  {/* Resumen visual */}
                  <div style={{ background:"#F0F6F7", borderRadius:20, padding:"20px", marginBottom:24 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom: (draft.lineItems||[]).some(li=>li.desc) ? 14 : 0 }}>
                      <div style={{ width:44, height:44, borderRadius:"50%", background:"#1B3F45", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <span style={{ fontSize:15, fontWeight:700, color:"#C9933A" }}>{clientInitials}</span>
                      </div>
                      <div>
                        <div style={{ fontSize:16, fontWeight:700, color:"#1B3F45" }}>{clientName}</div>
                        <div style={{ fontSize:12, color:"#5A7A80", marginTop:2 }}>
                          {(draft.lineItems||[]).length} {(draft.lineItems||[]).length===1?"pieza":"piezas"}
                        </div>
                      </div>
                    </div>
                    {(draft.lineItems||[]).filter(li=>li.desc).map((li,i)=>(
                      <div key={li.id} style={{ display:"flex", alignItems:"flex-start", gap:10, marginTop: i===0?0:8 }}>
                        <div style={{ width:6, height:6, borderRadius:"50%", background:"#C9933A", marginTop:5, flexShrink:0 }}/>
                        <span style={{ fontSize:13, color:"#1B3F45", lineHeight:1.4 }}>{li.desc}{li.qty&&li.qty!=="1"?` × ${li.qty}`:""}</span>
                      </div>
                    ))}
                  </div>

                  {/* Fecha de entrega */}
                  <div style={{ marginBottom:24 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#5A7A80", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:12 }}>
                      ¿Cuándo debe estar listo?
                    </div>
                    <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                      {quickDates.map(qd=>(
                        <button key={qd.label} onClick={()=>setDraft(d=>({...d,deadline:qd.date}))}
                          style={{ flex:1, padding:"10px 4px", borderRadius:12, border: draft.deadline===qd.date?"2px solid #1B3F45":"1.5px solid #E8E4DC",
                            background: draft.deadline===qd.date?"#1B3F45":"white",
                            color: draft.deadline===qd.date?"white":"#5A7A80",
                            fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'IBM Plex Sans', sans-serif",
                            transition:"all 0.15s" }}>
                          {qd.label}
                        </button>
                      ))}
                    </div>
                    <input type="date" value={draft.deadline} onChange={e=>setDraft(d=>({...d,deadline:e.target.value}))}
                      style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:"1.5px solid #E8E4DC", fontSize:14, color: draft.deadline?"#1B3F45":"#9DB5B9",
                        fontFamily:"'IBM Plex Sans', sans-serif", background:"white", boxSizing:"border-box", outline:"none" }}/>
                  </div>

                  {/* Notas */}
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#5A7A80", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:12 }}>
                      Notas <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(opcional)</span>
                    </div>
                    <textarea value={draft.description} onChange={e=>setDraft(d=>({...d,description:e.target.value}))}
                      placeholder="Instrucciones especiales, referencia del cliente, acabado deseado…"
                      rows={3}
                      style={{ width:"100%", padding:"14px", borderRadius:12, border:"1.5px solid #E8E4DC", fontSize:14, color:"#1B3F45",
                        fontFamily:"'IBM Plex Sans', sans-serif", resize:"none", background:"white", boxSizing:"border-box", outline:"none", lineHeight:1.5 }}/>
                  </div>

                  {/* Guardar — fixed */}
                  <div style={{ position:"fixed", bottom:"max(24px, env(safe-area-inset-bottom, 24px))", left:"50%", transform:"translateX(-50%)", width:"calc(100% - 32px)", maxWidth:468, zIndex:200 }}>
                    <button onClick={saveOrder}
                      style={{ width:"100%", padding:"18px", background:"#C9933A", color:"white", border:"none", borderRadius:16,
                        fontFamily:"'IBM Plex Sans', sans-serif", fontSize:16, fontWeight:700, cursor:"pointer",
                        boxShadow:"0 4px 16px rgba(201,147,58,0.35)", letterSpacing:"0.01em" }}>
                      Guardar orden
                    </button>
                  </div>
                </div>
              );
            })()}

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
                  <div style={{ fontSize:12, fontWeight:700, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Items for invoice</div>
                  {(draft.lineItems||[]).map((li,idx)=>{ const mv=(a,f,t)=>{const b=[...a];const[x]=b.splice(f,1);b.splice(t,0,x);return b;}; return (
                    <div key={li.id} style={{ background:"#F0F6F7", borderRadius:14, padding:"12px 14px", marginBottom:8 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <button onClick={()=>idx>0&&setDraft({...draft,lineItems:mv(draft.lineItems,idx,idx-1)})} style={{ background:"none", border:"none", cursor:"pointer", padding:2, opacity:idx===0?0.25:1 }}><Icon name="arrowUp" size={13} color="#5A7A80"/></button>
                          <button onClick={()=>idx<draft.lineItems.length-1&&setDraft({...draft,lineItems:mv(draft.lineItems,idx,idx+1)})} style={{ background:"none", border:"none", cursor:"pointer", padding:2, opacity:idx===draft.lineItems.length-1?0.25:1 }}><Icon name="arrowDown" size={13} color="#5A7A80"/></button>
                          <span style={{ fontSize:12, fontWeight:700, color:"#5A7A80" }}>Item {idx+1}</span>
                        </div>
                        <div style={{ display:"flex", gap:4 }}>
                          <button onClick={()=>setDraft({...draft,lineItems:[...draft.lineItems.slice(0,idx+1),{...li,id:Date.now()+Math.random()},...draft.lineItems.slice(idx+1)]})} style={{ background:"none", border:"none", cursor:"pointer", padding:2, opacity:0.5 }} title="Duplicate"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A7A80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>
                          <button onClick={()=>showConfirm("This item will be permanently deleted.",()=>setDraft({...draft,lineItems:draft.lineItems.filter(i=>i.id!==li.id)}))} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}><Icon name="trash" size={14} color="#da1e28"/></button>
                        </div>
                      </div>
                      <Input placeholder="Description" value={li.desc} onChange={e=>setDraft({...draft,lineItems:draft.lineItems.map(i=>i.id===li.id?{...i,desc:e.target.value}:i)})} style={{ marginBottom:8 }}/>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                        <Input type="number" placeholder="Qty" value={li.qty||""} onChange={e=>setDraft({...draft,lineItems:draft.lineItems.map(i=>i.id===li.id?{...i,qty:e.target.value}:i)})}/>
                        <Input type="number" placeholder={`Unit price (${C.currency})`} value={li.unitPrice||""} onChange={e=>setDraft({...draft,lineItems:draft.lineItems.map(i=>i.id===li.id?{...i,unitPrice:e.target.value}:i)})}/>
                      </div>
                      {lineTotal(li)>0 && <div style={{ fontSize:11, color:"#5A7A80", marginTop:6 }}>Total: <strong style={{color:"#1B3F45"}}>{C.currency} {fmt(lineTotal(li))}</strong></div>}
                    </div>
                  );})}
                  <button onClick={()=>setDraft({...draft,lineItems:[...(draft.lineItems||[]),{id:Date.now()+Math.random(),desc:"",qty:"1",unitPrice:""}]})} style={{ width:"100%", padding:"11px", background:"none", border:"1.5px dashed #E8E4DC", borderRadius:12, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:600, color:"#5A7A80", cursor:"pointer" }}>+ Add item</button>
                </div>
                <BtnPrimary disabled={!draft.client} onClick={()=>{ setOrders(orders.map(o=>o.id===draft.id?{...draft}:o)); setView("detail"); showToast("Order updated"); }}>
                  Save changes
                </BtnPrimary>
                <div style={{ height:10 }}/>
                <button onClick={()=>showConfirm("This order and all its items will be permanently deleted.",()=>{ setOrders(orders.filter(o=>o.id!==draft.id)); setView("list"); showToast("Order deleted","#da1e28"); })} style={{ width:"100%", background:"none", border:"none", color:"#da1e28", fontSize:13, fontWeight:600, cursor:"pointer", padding:"8px 0" }}>
                  Delete order
                </button>
              </Card>
            )}

            {/* ── DETAIL ── */}
            {view==="detail" && selectedOrder && (()=>{
              const st = selectedOrder.status;
              const today = new Date().toISOString().split("T")[0];
              const fmtDate = d => d ? new Date(d+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"}) : "—";
              const dlPast = selectedOrder.deadline && selectedOrder.deadline < today;
              const orderTotal = (selectedOrder.lineItems||[]).length > 0
                ? (selectedOrder.lineItems).reduce((s,li)=>s+lineTotal(li),0)
                : parseFloat(selectedOrder.amount)||0;

              /* ── Progress bar helpers ── */
              const STEPS = ["Recibida","En trabajo","Terminada","Facturada"];
              const activeIdx = { received:1, inprogress:2, done:3, invoiced:-1 }[st] ?? 1;
              const isCompleted = idx => st==="invoiced" || idx < activeIdx;
              const isActive    = idx => st!=="invoiced" && idx===activeIdx;

              return (
                <>
                  {/* Photo */}
                  {selectedOrder.photo && (
                    <img src={selectedOrder.photo} alt="order" style={{ width:"calc(100% - 32px)", margin:"0 16px 12px", borderRadius:14, objectFit:"cover", maxHeight:200, display:"block" }}/>
                  )}

                  {/* ── 1. BANNER DE ESTADO ── */}
                  {st==="received" && (
                    <div style={{ margin:"0 16px 10px", background:"#FBF5E8", border:"1.5px solid #E8C97A", borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:"#F0DDB0", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Icon name="alert" size={18} color="#8A6220"/>
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, color:"#8A6220", fontFamily:"'IBM Plex Sans', sans-serif" }}>Pendiente</div>
                        <div style={{ fontSize:10, color:"#BA9B55", marginTop:2, fontFamily:"'IBM Plex Sans', sans-serif" }}>
                          Recibida {fmtDate(selectedOrder.received)}{selectedOrder.deadline ? ` · Entrega ${fmtDate(selectedOrder.deadline)}` : ""}
                        </div>
                      </div>
                    </div>
                  )}
                  {st==="inprogress" && (
                    <div style={{ margin:"0 16px 10px", background:"#E0EDEF", border:"1.5px solid #9DB5B9", borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:"#C4D8DC", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B3F45" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>En revisión</div>
                        <div style={{ fontSize:10, color:"#5A7A80", marginTop:2, fontFamily:"'IBM Plex Sans', sans-serif" }}>
                          Recibida {fmtDate(selectedOrder.received)}{selectedOrder.deadline ? ` · Entrega ${fmtDate(selectedOrder.deadline)}` : ""}
                        </div>
                      </div>
                    </div>
                  )}
                  {(st==="done"||st==="invoiced") && (
                    <div style={{ margin:"0 16px 10px", background:"#E8F3EF", border:"1.5px solid #9FCFBC", borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:"#C0E8D8", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Icon name="checkCircle" size={18} color="#1B6048"/>
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, color:"#1B6048", fontFamily:"'IBM Plex Sans', sans-serif" }}>{st==="invoiced"?"Facturada":"Terminada"}</div>
                        <div style={{ fontSize:10, color:"#3B8060", marginTop:2, fontFamily:"'IBM Plex Sans', sans-serif" }}>{st==="invoiced"?"Factura generada":"Lista para facturar"}</div>
                      </div>
                    </div>
                  )}

                  {/* ── 2. BARRA DE PROGRESO ── */}
                  <div style={{ margin:"0 16px 10px", background:"white", border:"0.5px solid #E8E4DC", borderRadius:12, padding:"12px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center" }}>
                      {STEPS.map((label, idx) => (
                        <React.Fragment key={label}>
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, flexShrink:0 }}>
                            <div style={{ width:22, height:22, borderRadius:"50%",
                              background: isCompleted(idx)?"#1B3F45": isActive(idx)?"#C9933A":"white",
                              border: (!isCompleted(idx)&&!isActive(idx))?"1.5px solid #E8E4DC":"none",
                              display:"flex", alignItems:"center", justifyContent:"center" }}>
                              {isCompleted(idx)
                                ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                                : isActive(idx)
                                  ? <div style={{ width:6, height:6, borderRadius:"50%", background:"white" }}/>
                                  : null
                              }
                            </div>
                            <span style={{ fontSize:9, fontWeight:500, color: isCompleted(idx)?"#1B3F45": isActive(idx)?"#C9933A":"#9DB5B9", fontFamily:"'IBM Plex Sans', sans-serif", whiteSpace:"nowrap" }}>{label}</span>
                          </div>
                          {idx < STEPS.length-1 && (
                            <div style={{ flex:1, height:2, background: isCompleted(idx+1)?"#1B3F45":"#E8E4DC", margin:"0 3px", marginBottom:14 }}/>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* ── 3. CARD DE INFORMACIÓN ── */}
                  <div style={{ margin:"0 16px", background:"white", border:"0.5px solid #E8E4DC", borderRadius:12, overflow:"hidden" }}>

                    {/* Fila A — Order ID + Entrega */}
                    <div style={{ padding:"10px 14px", borderBottom:"0.5px solid #F5F3EF", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontSize:9, color:"#9DB5B9", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3, fontFamily:"'IBM Plex Sans', sans-serif" }}>Order ID</div>
                        <div style={{ fontSize:13, fontWeight:500, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>#{selectedOrder.id}</div>
                      </div>
                      {selectedOrder.deadline && (
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:9, color:"#9DB5B9", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3, fontFamily:"'IBM Plex Sans', sans-serif" }}>Entrega</div>
                          <div style={{ fontSize:13, fontWeight:500, color: dlPast?"#E24B4A":"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>{fmtDate(selectedOrder.deadline)}</div>
                        </div>
                      )}
                    </div>

                    {/* Fila B — Descripción */}
                    {selectedOrder.description && (
                      <div style={{ padding:"10px 14px", borderBottom:"0.5px solid #F5F3EF" }}>
                        <div style={{ fontSize:9, color:"#9DB5B9", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4, fontFamily:"'IBM Plex Sans', sans-serif" }}>Descripción</div>
                        <div style={{ fontSize:12, color:"#1B3F45", lineHeight:1.5, fontFamily:"'IBM Plex Sans', sans-serif" }}>{selectedOrder.description}</div>
                      </div>
                    )}

                    {/* Filas C — Items */}
                    {(selectedOrder.lineItems||[]).filter(li=>li.desc).map((li, idx, arr) => (
                      <div key={li.id} style={{ padding:"10px 14px", borderBottom: idx<arr.length-1||orderTotal>0?"0.5px solid #F5F3EF":"none", display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:36, height:36, borderRadius:8, background:"#E0ECED", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <Icon name="gem" size={16} color="#5A7A80"/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:500, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{li.desc}</div>
                          {(li.qty&&li.qty!=="1") && <div style={{ fontSize:10, color:"#9DB5B9", fontFamily:"'IBM Plex Sans', sans-serif" }}>×{li.qty}</div>}
                        </div>
                        {lineTotal(li)>0 && (
                          <div style={{ fontSize:13, fontWeight:500, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif", flexShrink:0 }}>{C.currency} {fmt(lineTotal(li))}</div>
                        )}
                      </div>
                    ))}

                    {/* Fila D — Total */}
                    {orderTotal > 0 && (
                      <div style={{ padding:"10px 14px", background:"#F7F5F0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:12, fontWeight:500, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>Total</span>
                        <span style={{ fontSize:16, fontWeight:500, color:"#C9933A", fontFamily:"'IBM Plex Sans', sans-serif" }}>{C.currency} {fmt(orderTotal)}</span>
                      </div>
                    )}
                  </div>

                  {/* ── 5. BOTÓN PRINCIPAL FIJO AL FONDO ── */}
                  <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:500, background:"#F2EDE4", padding:"12px 16px max(20px, env(safe-area-inset-bottom, 20px))", zIndex:150 }}>
                    {(st==="received"||st==="inprogress") && (
                      <button onClick={()=>setConfirmSheet({ type:"done", order:selectedOrder })}
                        style={{ width:"100%", padding:"13px", background:"#1B3F45", color:"white", border:"none", borderRadius:12, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                        <Icon name="check" size={16} color="#C9933A"/> Marcar como terminada
                      </button>
                    )}
                    {st==="done" && (
                      <button onClick={()=>setConfirmSheet({ type:"invoice", order:selectedOrder })}
                        style={{ width:"100%", padding:"13px", background:"#C9933A", color:"white", border:"none", borderRadius:12, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                        <Icon name="invoice" size={16} color="white"/> Generar factura
                      </button>
                    )}
                    {st==="invoiced" && (
                      <button onClick={()=>setWorkOrderPreview(selectedOrder)}
                        style={{ width:"100%", padding:"13px", background:"#1B3F45", color:"white", border:"none", borderRadius:12, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                        <Icon name="print" size={16} color="#C9933A"/> Imprimir / compartir factura
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
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
                    <div style={{ fontSize:24, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.02em" }}>Invoices</div>
                    {invoices.length > 0 && <div style={{ fontSize:13, color:"#5A7A80", marginTop:3, fontWeight:500 }}>{invoices.length} invoice{invoices.length!==1?"s":""} · {invoices.filter(i=>!i.printed).length} unprinted</div>}
                  </div>
                  <button onClick={()=>{ setInvClient(""); setInvClientAddress(""); setInvDate(new Date().toISOString().split("T")[0]); setInvPorto(""); setItems([newItem()]); setInvNumber(""); setInvView("new"); }}
                    style={{ background:"#C9933A", color:"white", border:"none", borderRadius:14, padding:"10px 18px", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"'IBM Plex Sans', sans-serif", letterSpacing:"-0.01em" }}>
                    + New
                  </button>
                </div>
              </div>
              <div style={{ padding: isDesktop?"0 40px 60px":"0 22px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>
                {invoices.length === 0 && (
                  <div style={{ textAlign:"center", padding:"48px 24px" }}>
                    <div style={{ width:72, height:72, borderRadius:22, background:PASTELS.invoice, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}><Icon name="receipt" size={32} color="#5A7A80"/></div>
                    <div style={{ fontSize:17, fontWeight:800, color:"#1B3F45", marginBottom:6, letterSpacing:"-0.01em" }}>No invoices yet</div>
                    <div style={{ fontSize:13, color:"#5A7A80", lineHeight:1.6 }}>Invoices created from orders appear here.<br/>You can also create one manually.</div>
                  </div>
                )}
                {[...invoices].reverse().map((inv,i) => {
                  const invTotal = inv.items.reduce((s,it)=>s+lineTotal(it),0)*(1+C.taxRate) + (parseFloat(inv.porto)||0);
                  const priorityColor = i === 0 ? "#da1e28" : i === 1 ? "#C9933A" : i === 2 ? "#C9933A" : "#5A7A80";
                  return (
                    <button key={inv.id} onClick={()=>{ setSelectedInvoice(inv); setInvView("detail"); }}
                      style={{ width:"100%", background:"white", border:"none", borderRadius:16, padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:14, cursor:"pointer", textAlign:"left", boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:"#F0F6F7", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <span style={{ fontSize:16, fontWeight:900, color:priorityColor, lineHeight:1 }}>{i+1}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:"#1B3F45", letterSpacing:"-0.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{inv.client}</div>
                        <div style={{ fontSize:12, color:"rgba(0,0,0,0.38)", fontWeight:500, marginTop:3 }}>{inv.number} · {new Date(inv.date+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontSize:15, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.01em" }}>{C.currency} {fmt(invTotal)}</div>
                        <span style={{ fontSize:10, fontWeight:700, color: inv.printed?"#198038":"#C9933A" }}>{inv.printed?"Printed":"Saved"}</span>
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
              showToast("Invoice saved","#198038");
            };
            return (
              <>
                {/* Header with live total */}
                <div style={{ padding: isDesktop?"32px 40px 20px":"max(56px, env(safe-area-inset-top, 56px)) 22px 20px", background:"white" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <button onClick={()=>{ setInvView("list"); }} style={{ width:36, height:36, borderRadius:11, background:"#F0F6F7", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="back" size={18} color="#1B3F45"/></button>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:24, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.02em" }}>New Invoice</div>
                      {invClient && <div style={{ fontSize:13, color:"#5A7A80", marginTop:2, fontWeight:500 }}>{invClient}</div>}
                    </div>
                    {draftTotal > 0 && (
                      <div style={{ background:"#1B3F45", borderRadius:14, padding:"8px 14px", textAlign:"right" }}>
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
                            setInvNumber(nextInvNumberForClient(invoices, e.target.value));
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
                  {items.map((it,idx)=>{ const mv=(a,f,t)=>{const b=[...a];const[x]=b.splice(f,1);b.splice(t,0,x);return b;}; return (
                    <Card key={it.id}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <button onClick={()=>idx>0&&setItems(mv(items,idx,idx-1))} style={{ background:"none", border:"none", cursor:"pointer", padding:2, opacity:idx===0?0.25:1 }}><Icon name="arrowUp" size={13} color="#5A7A80"/></button>
                          <button onClick={()=>idx<items.length-1&&setItems(mv(items,idx,idx+1))} style={{ background:"none", border:"none", cursor:"pointer", padding:2, opacity:idx===items.length-1?0.25:1 }}><Icon name="arrowDown" size={13} color="#5A7A80"/></button>
                          <div style={{ fontSize:12, fontWeight:700, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.08em" }}>Item {idx+1}</div>
                        </div>
                        <div style={{ display:"flex", gap:4 }}>
                          <button onClick={()=>setItems([...items.slice(0,idx+1),{...it,id:Date.now()+Math.random()},...items.slice(idx+1)])} style={{ background:"none", border:"none", cursor:"pointer", padding:4, opacity:0.5 }} title="Duplicate"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5A7A80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>
                          <button onClick={()=>showConfirm("This item will be permanently deleted.",()=>setItems(items.filter(i=>i.id!==it.id)))} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="trash" size={16} color="#da1e28"/></button>
                        </div>
                      </div>
                      <Field label="Description"><Input placeholder="e.g. Pavé setting – ring" value={it.desc} onChange={e=>setItems(items.map(i=>i.id===it.id?{...i,desc:e.target.value}:i))}/></Field>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        <Field label="Qty"><Input type="number" placeholder="1" value={it.qty||""} onChange={e=>setItems(items.map(i=>i.id===it.id?{...i,qty:e.target.value}:i))}/></Field>
                        <Field label={`Unit price (${C.currency})`}><Input type="number" placeholder="0.00" value={it.unitPrice||""} onChange={e=>setItems(items.map(i=>i.id===it.id?{...i,unitPrice:e.target.value}:i))}/></Field>
                      </div>
                      {lineTotal(it) > 0 && <div style={{ fontSize:12, color:"#5A7A80", marginTop:2 }}>Total: <strong style={{color:"#1B3F45"}}>{C.currency} {fmt(lineTotal(it))}</strong></div>}
                    </Card>
                  );})}

                  <button onClick={()=>setItems([...items,newItem()])} style={{ width:"100%", padding:"13px", background:"white", border:"2px dashed #E8E4DC", borderRadius:14, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:14, fontWeight:600, color:"#5A7A80", cursor:"pointer", marginBottom:10 }}>+ Add item</button>

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
                    <Card style={{ background:"#1B3F45" }}>
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
                    <button onClick={()=>{ setSelectedInvoice(null); setInvView("list"); }} style={{ width:36, height:36, borderRadius:11, background:"#F0F6F7", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="back" size={18} color="#1B3F45"/></button>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:22, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.02em" }}>{inv.number}</div>
                      {inv.client && <div style={{ fontSize:13, color:"#5A7A80", marginTop:2, fontWeight:500 }}>{inv.client}</div>}
                    </div>
                    <button onClick={()=>showConfirm(`Delete invoice ${inv.number}? This cannot be undone.`,()=>{ setInvoices(invoices.filter(i=>i.id!==inv.id)); setSelectedInvoice(null); setInvView("list"); showToast("Invoice deleted","#da1e28"); })} style={{ width:36, height:36, borderRadius:11, background:"#fff1f1", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="trash" size={17} color="#da1e28"/></button>
                  </div>
                </div>
                <div style={{ padding: isDesktop?"20px 40px 60px":"20px 16px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>

                  {/* ── INVOICE PREVIEW CARD ── */}
                  <div style={{ background:"white", border:"1.5px solid #E8E4DC", borderRadius:16, padding:"28px 24px", marginBottom:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
                    {/* Header */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                      <img src="/logo.png" alt={C.businessName} style={{ height:52, objectFit:"contain" }}/>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:10, color:"#E8E4DC", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>Rechnung</div>
                        <div style={{ fontSize:13, fontFamily:"monospace", fontWeight:700, color:"#1B3F45", marginTop:2 }}>{inv.number}</div>
                        <div style={{ fontSize:11, color:"#5A7A80" }}>{new Date(inv.date+"T12:00:00").toLocaleDateString("de-CH")}</div>
                        <div style={{ fontSize:11, marginTop:6, padding:"2px 8px", borderRadius:6, display:"inline-block", background: inv.printed?"#34C75920":"#FF950020", color: inv.printed?"#198038":"#C9933A", fontWeight:700 }}>{inv.printed?"Printed":"Saved"}</div>
                      </div>
                    </div>

                    {/* To */}
                    <div style={{ background:"#F0F6F7", borderRadius:10, padding:"10px 14px", marginBottom:18, textAlign:"left" }}>
                      <div style={{ fontSize:9, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:700, marginBottom:3 }}>To</div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#1B3F45" }}>{inv.client}</div>
                      {inv.clientAddress && <div style={{ fontSize:12, color:"#5A7A80", marginTop:2, whiteSpace:"pre-line", lineHeight:1.5 }}>{inv.clientAddress}</div>}
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
                        <tr style={{ borderBottom:"1.5px solid #E8E4DC" }}>
                          <th style={{ textAlign:"left", fontSize:9, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.07em", padding:"4px 4px 7px 0", fontWeight:700 }}>Description</th>
                          <th style={{ textAlign:"right", fontSize:9, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.07em", padding:"4px 0 7px", fontWeight:700 }}>Qty</th>
                          <th style={{ textAlign:"right", fontSize:9, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.07em", padding:"4px 0 7px", fontWeight:700 }}>Unit</th>
                          <th style={{ textAlign:"right", fontSize:9, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.07em", padding:"4px 0 7px", fontWeight:700 }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items.map((it,i)=>{
                          const qty = parseFloat(it.qty)||1;
                          const unit = parseFloat(it.unitPrice)||parseFloat(it.price)||0;
                          const tot = qty * unit;
                          return (
                            <tr key={i} style={{ borderBottom:"1px solid #E8E4DC" }}>
                              <td style={{ padding:"7px 4px 7px 0", verticalAlign:"top" }}>
                                <div style={{ fontSize:12, fontWeight:600, color:"#1B3F45", wordBreak:"break-word" }}>{it.desc||"—"}</div>
                              </td>
                              <td style={{ padding:"7px 0", textAlign:"right", fontSize:12, color:"#5A7A80", verticalAlign:"top" }}>{qty}</td>
                              <td style={{ padding:"7px 0", textAlign:"right", fontSize:11, color:"#5A7A80", verticalAlign:"top" }}>{C.currency} {fmt(unit)}</td>
                              <td style={{ padding:"7px 0", textAlign:"right", fontSize:12, fontWeight:700, color:"#1B3F45", verticalAlign:"top" }}>{C.currency} {fmt(tot)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Totals */}
                    <div style={{ borderTop:"1px solid #E8E4DC", paddingTop:10 }}>
                      {invPortoVal>0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#5A7A80", marginBottom:4 }}><span>Postage</span><span>{C.currency} {fmt(invPortoVal)}</span></div>}
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#5A7A80", marginBottom:4 }}><span>Subtotal</span><span>{C.currency} {fmt(invSub)}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#5A7A80", marginBottom:10 }}><span>{C.taxLabel} {(C.taxRate*100).toFixed(1)}%</span><span>{C.currency} {fmt(invMwst)}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", borderTop:"2px solid #1C1C1E", paddingTop:10 }}>
                        <span style={{ fontSize:15, fontWeight:700, color:"#1B3F45" }}>Total</span>
                        <span style={{ fontSize:18, fontWeight:800, color:ACCENT }}>{C.currency} {fmt(invTotal)}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid #E8E4DC", fontSize:10, color:"#5A7A80", lineHeight:1.7 }}>
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
                  <button onClick={()=>setClientView("list")} style={{ width:36, height:36, borderRadius:11, background:"#F0F6F7", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="back" size={18} color="#1B3F45"/></button>
                )}
                <div>
                  <div style={{ fontSize: clientView==="list"?28:22, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.02em", lineHeight:1.1 }}>
                    {clientView==="list" ? "Clients" : clientView==="new" ? "New Client" : clientView==="edit" ? "Edit Client" : (clients.find(c=>c.id===selectedClientId)?.company || clients.find(c=>c.id===selectedClientId)?.name || "Client")}
                  </div>
                  {clientView==="list" && <div style={{ fontSize:13, color:"#5A7A80", marginTop:3, fontWeight:500 }}>{clients.length} client{clients.length!==1?"s":""}</div>}
                </div>
              </div>
              {clientView==="list" && (
                <button onClick={()=>{ setClientDraft(newClient()); setClientView("new"); }} style={{ width:40, height:40, borderRadius:12, background:"#C9933A", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon name="plus" size={18} color="white"/>
                </button>
              )}
              {clientView==="detail" && (
                <button onClick={()=>{ setClientDraft({...clients.find(c=>c.id===selectedClientId)}); setClientView("edit"); }} style={{ background:"#F0F6F7", border:"none", cursor:"pointer", padding:"8px 14px", borderRadius:10, fontSize:13, fontWeight:700, color:"#1B3F45" }}>Edit</button>
              )}
            </div>
          </div>

          <div style={{ padding: isDesktop?"20px 40px 60px":"20px 16px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>

            {/* ── LIST ── */}
            {clientView==="list" && (
              <>
                {clients.length === 0 && (
                  <div style={{ textAlign:"center", padding:"48px 24px" }}>
                    <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}><Icon name="users" size={48} color="#E8E4DC"/></div>
                    <div style={{ fontSize:15, fontWeight:600, color:"#1B3F45", marginBottom:6 }}>No clients yet</div>
                    <div style={{ fontSize:13, color:"#5A7A80", lineHeight:1.6, marginBottom:24 }}>Add your clients to assign them to orders and invoices automatically.</div>
                    <BtnPrimary onClick={()=>{ setClientDraft(newClient()); setClientView("new"); }} style={{ maxWidth:220, margin:"0 auto" }}>+ Add client</BtnPrimary>
                  </div>
                )}
                {clients.map((c, idx) => {
                  const orderCount = orders.filter(o=>o.clientId===c.id||o.client===(c.company||c.name)).length;
                  const priorityColor = idx === 0 ? "#da1e28" : idx === 1 ? "#C9933A" : idx === 2 ? "#C9933A" : "#5A7A80";
                  return (
                    <button key={c.id} onClick={()=>{ setSelectedClientId(c.id); setClientView("detail"); }}
                      style={{ width:"100%", background:"white", border:"none", borderRadius:16, padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:14, cursor:"pointer", textAlign:"left", boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:"#F0F6F7", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <span style={{ fontSize:16, fontWeight:900, color:priorityColor, lineHeight:1 }}>{idx+1}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:"#1B3F45", letterSpacing:"-0.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.company || c.name}</div>
                        <div style={{ fontSize:12, color:"rgba(0,0,0,0.38)", fontWeight:500, marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {c.company && c.name ? c.name : c.address?.split("\n")[0] || ""}
                        </div>
                      </div>
                      {orderCount > 0 && <span style={{ fontSize:11, fontWeight:700, color:"#5A7A80", background:"#F0F6F7", padding:"3px 9px", borderRadius:8, flexShrink:0 }}>{orderCount} order{orderCount!==1?"s":""}</span>}
                    </button>
                  );
                })}
              </>
            )}

            {/* ── NEW / EDIT FORM ── */}
            {(clientView==="new" || clientView==="edit") && (
              <div style={{ padding:"0 16px" }}>
                {/* Campo principal — empresa */}
                <div style={{ marginBottom:12 }}>
                  <input
                    autoFocus={clientView==="new"}
                    placeholder="Nombre de la empresa *"
                    value={clientDraft.company||clientDraft.name||""}
                    onChange={e=>setClientDraft(d=>({...d,company:e.target.value,name:e.target.value}))}
                    style={{ width:"100%", padding:"18px 16px", fontSize:17, fontWeight:600, color:"#1B3F45",
                      border:(clientDraft.company||clientDraft.name)?"2px solid #1B3F45":"2px solid #E8E4DC",
                      borderRadius:16, fontFamily:"'IBM Plex Sans', sans-serif",
                      background:(clientDraft.company||clientDraft.name)?"#F0F6F7":"white",
                      outline:"none", boxSizing:"border-box", transition:"all 0.15s" }}/>
                </div>
                {/* Campos opcionales */}
                <div style={{ background:"white", borderRadius:16, border:"0.5px solid #E8E4DC", overflow:"hidden", marginBottom:12 }}>
                  {[
                    { key:"address", placeholder:"Dirección", type:"text",
                      icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="2" strokeLinecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg> },
                    { key:"phone",   placeholder:"Teléfono",  type:"tel",
                      icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.59A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/></svg> },
                    { key:"email",   placeholder:"Email",     type:"email",
                      icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg> },
                  ].map((f,i)=>(
                    <div key={f.key} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderTop: i>0?"0.5px solid #F0F6F7":"none" }}>
                      {f.icon}
                      <input
                        placeholder={f.placeholder}
                        value={clientDraft[f.key]||""}
                        onChange={e=>setClientDraft(d=>({...d,[f.key]:e.target.value}))}
                        type={f.type}
                        style={{ flex:1, border:"none", outline:"none", fontSize:14, color:"#1B3F45",
                          fontFamily:"'IBM Plex Sans', sans-serif", background:"transparent", padding:0 }}/>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:24 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                  <span style={{ fontSize:11, color:"#9DB5B9" }}>Dirección, teléfono y email son opcionales</span>
                </div>
                {clientView==="edit" && (
                  <button onClick={()=>showConfirm("¿Eliminar este cliente? Sus órdenes se conservarán.",()=>{ setClients(clients.filter(c=>c.id!==clientDraft.id)); setClientView("list"); showToast("Cliente eliminado","#da1e28"); })}
                    style={{ background:"none", border:"none", color:"#da1e28", fontSize:13, fontWeight:600, cursor:"pointer", padding:"0 0 16px", display:"block" }}>
                    Eliminar cliente
                  </button>
                )}
                <button
                  disabled={!clientDraft.company && !clientDraft.name}
                  onClick={()=>{
                    if(!clientDraft.company && !clientDraft.name) return;
                    if(clientView==="edit"){
                      setClients(clients.map(c=>c.id===clientDraft.id ? clientDraft : c));
                      setClientView("detail");
                      showToast("Cliente guardado");
                    } else {
                      const c = { ...clientDraft, id: String(Date.now()) };
                      setClients([...clients, c]);
                      setClientView("list");
                      showToast("Cliente añadido");
                    }
                  }}
                  style={{ width:"100%", padding:"18px", border:"none", borderRadius:16,
                    background:(clientDraft.company||clientDraft.name)?"#C9933A":"#E8E4DC",
                    color:(clientDraft.company||clientDraft.name)?"white":"#9DB5B9",
                    fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:700,
                    cursor:(clientDraft.company||clientDraft.name)?"pointer":"default",
                    boxShadow:(clientDraft.company||clientDraft.name)?"0 4px 14px rgba(201,147,58,0.3)":"none",
                    transition:"all 0.15s" }}>
                  {clientView==="edit" ? "Guardar cambios" : "Guardar cliente"}
                </button>
              </div>
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
                      <div style={{ width:52, height:52, borderRadius:16, background:"#1B3F45", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Icon name="person" size={26} color="white"/>
                      </div>
                      <div>
                        <div style={{ fontSize:17, fontWeight:800, color:"#1B3F45", letterSpacing:"-0.01em" }}>{c.company || c.name}</div>
                        {c.company && c.name && <div style={{ fontSize:13, color:"#5A7A80" }}>{c.name}</div>}
                      </div>
                    </div>
                    {c.address && (
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:11, color:"#5A7A80", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Address</div>
                        <div style={{ fontSize:13, color:"#1B3F45", lineHeight:1.6, whiteSpace:"pre-line" }}>{c.address}</div>
                      </div>
                    )}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      {c.phone && <div><div style={{ fontSize:11, color:"#5A7A80", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Phone</div><div style={{ fontSize:13, color:"#1B3F45" }}>{c.phone}</div></div>}
                      {c.email && <div><div style={{ fontSize:11, color:"#5A7A80", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Email</div><div style={{ fontSize:13, color:"#1B3F45", wordBreak:"break-all" }}>{c.email}</div></div>}
                    </div>
                  </Card>

                  <SectionTitle>Orders ({clientOrders.length})</SectionTitle>
                  {clientOrders.length === 0 && (
                    <div style={{ textAlign:"center", padding:"24px", color:"#5A7A80", fontSize:13 }}>No orders for this client yet.</div>
                  )}
                  {clientOrders.map(o=>(
                    <button key={o.id} onClick={()=>{ setSelectedId(o.id); setView("detail"); setTab("orders"); }}
                      style={{ width:"100%", background:"white", border:"1.5px solid #E8E4DC", borderRadius:16, padding:"14px 16px", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", textAlign:"left" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:"#1B3F45", marginBottom:3 }}>#{o.id}{o.deadline ? ` · Delivery: ${o.deadline}` : ""}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:6, height:6, borderRadius:"50%", background:C.statuses[o.status]?.color, flexShrink:0 }}/>
                          <span style={{ fontSize:12, color:"#5A7A80" }}>{C.statuses[o.status]?.label}</span>
                          {o.amount > 0 && <span style={{ fontSize:12, fontWeight:700, color:ACCENT }}>· {C.currency} {fmt(o.amount)}</span>}
                        </div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8E4DC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
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

      {/* ── BOTTOM NAV (mobile only, hidden during wizard) ── */}
      {!isDesktop && !(tab==="orders" && view==="new") && (
        <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:500, background:"#ffffff", borderTop:"none", boxShadow:"0 -4px 20px rgba(27,63,69,0.07)", display:"flex", padding:"8px 0 max(24px, env(safe-area-inset-bottom, 24px))", zIndex:100 }}>
          {[
            { key:"home",    icon:"orders",  label:"Home"    },
            { key:"scan",    icon:"scan",    label:"Scan"    },
            { key:"orders",  icon:"gem",     label:"Orders"  },
            { key:"clients", icon:"person",  label:"Clients" },
            { key:"invoice", icon:"invoice", label:"Invoice" },
          ].map(({ key, icon, label }) => (
            <button key={key} onClick={()=>{ setTab(key); if(key==="scan")resetPhoto(); if(key==="orders"){ setView("list"); } if(key==="invoice"){ setInvView("list"); setSelectedInvoice(null); } if(key==="clients"){ setClientView("list"); } }} style={{ flex:1, background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"4px 0" }}>
              <div style={{ width:44, height:32, background:"none", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon name={icon} size={20} color={tab===key ? "#1B3F45" : "#5A7A80"}/>
              </div>
              <span style={{ fontSize:"0.625rem", fontWeight: tab===key ? 600 : 400, color: tab===key ? "#1B3F45" : "#5A7A80", fontFamily:"'IBM Plex Sans', sans-serif" }}>{label}</span>
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
        const labelStyle = { fontSize:9, fontWeight:700, color:GOLD, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:5, fontFamily:"'IBM Plex Sans', sans-serif" };
        const lineStyle  = { borderBottom:`1px solid #ccc`, paddingBottom:4, minHeight:24, fontSize:13, fontWeight:600, color:"#1a1a1a", fontFamily:"'IBM Plex Sans', sans-serif" };
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:1000, overflowY:"auto", display:"flex", flexDirection:"column" }}>
            {/* Sticky top bar */}
            <div style={{ position:"sticky", top:0, background:"white", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:"1px solid #E8E4DC", zIndex:10, flexShrink:0 }}>
              <button onClick={()=>setWorkOrderPreview(null)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#1B3F45", padding:"0 4px", lineHeight:1 }}>×</button>
              <span style={{ fontWeight:700, fontSize:15, fontFamily:"'IBM Plex Sans', sans-serif" }}>Vorschau Arbeitsauftrag</span>
              <button onClick={()=>printWorkOrder(o)} style={{ background:GOLD, color:"white", border:"none", borderRadius:10, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'IBM Plex Sans', sans-serif", display:"flex", alignItems:"center", gap:6 }}>
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
                <div style={{ width:40, height:4, background:"#E8E4DC", borderRadius:2, margin:"0 auto 18px" }}/>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:22, fontWeight:900, color:"#1B3F45", textTransform:"capitalize", letterSpacing:"-0.02em" }}>{dayLabel}</div>
                    <div style={{ fontSize:13, color:"#5A7A80", marginTop:3, fontWeight:500 }}>
                      {dateObj.toLocaleDateString("en-GB",{ day:"numeric", month:"long", year:"numeric" })}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    {/* Alert toggle */}
                    <button onClick={()=>setDayNotes(n=>({...n,[d]:{...(n[d]||{}),alert:!alertOn}}))}
                      style={{ width:36, height:36, borderRadius:11, background: alertOn?"#1B3F45":"#F0F6F7", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Icon name="bell" size={18} color={alertOn?"white":"#5A7A80"}/>
                    </button>
                    <button onClick={()=>setDayModal(null)} style={{ width:36, height:36, borderRadius:11, background:"#F0F6F7", border:"none", cursor:"pointer", fontSize:20, color:"#1B3F45", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                  </div>
                </div>
              </div>

              {/* Scrollable body */}
              <div style={{ overflowY:"auto", padding:"16px 20px 32px", flex:1 }}>

                {/* Delivery alert banner */}
                {hasPendingDelivery && (
                  <div style={{ background: isPast&&!isToday?"#da1e28":"#C9933A", borderRadius:14, padding:"14px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
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
                    <div style={{ fontSize:11, fontWeight:700, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontFamily:"'IBM Plex Sans', sans-serif" }}>Pending · {dayOrders.length}</div>
                    {dayOrders.map(o=>(
                      <button key={o.id} onClick={()=>{ setDayModal(null); setSelectedId(o.id); setView("detail"); setTab("orders"); }}
                        style={{ width:"100%", background:PASTELS.inprogress, border:"none", borderRadius:14, padding:"13px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12, cursor:"pointer", textAlign:"left" }}>
                        {o.photo && <img src={o.photo} alt="" style={{ width:38, height:38, borderRadius:9, objectFit:"cover", flexShrink:0 }}/>}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:"#1B3F45", marginBottom:2 }}>{o.client || `#${o.id}`}</div>
                          {o.description && <div style={{ fontSize:12, color:"#5A7A80", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.description}</div>}
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                          <StatusPill status={o.status}/>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8E4DC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {/* Done orders for this day */}
                {doneOrders.length > 0 && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, marginTop:4, fontFamily:"'IBM Plex Sans', sans-serif" }}>Completed · {doneOrders.length}</div>
                    {doneOrders.map(o=>(
                      <button key={o.id} onClick={()=>{ setDayModal(null); setSelectedId(o.id); setView("detail"); setTab("orders"); }}
                        style={{ width:"100%", background:PASTELS.done, border:"none", borderRadius:14, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12, cursor:"pointer", textAlign:"left", opacity:0.8 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:"#1B3F45" }}>{o.client || `#${o.id}`}</div>
                          {o.description && <div style={{ fontSize:11, color:"#5A7A80", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.description}</div>}
                        </div>
                        <StatusPill status={o.status}/>
                      </button>
                    ))}
                  </>
                )}

                {dayOrders.length===0 && doneOrders.length===0 && (
                  <div style={{ textAlign:"center", padding:"20px 0 8px", color:"#E8E4DC", fontSize:13 }}>No orders for this day</div>
                )}

                {/* Add order for this day */}
                <button onClick={()=>{ setDayModal(null); setDraft({...newOrder(), deadline:d}); setView("new"); setTab("orders"); }}
                  style={{ width:"100%", padding:"13px", background:"#F0F6F7", border:"none", borderRadius:14, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:700, color:"#1B3F45", cursor:"pointer", marginTop:4, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <Icon name="plus" size={16} color="#1B3F45"/> Add order for this day
                </button>

                {/* Notes */}
                <div style={{ marginTop:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontFamily:"'IBM Plex Sans', sans-serif", display:"flex", alignItems:"center", gap:6 }}>
                    Notes
                    {alertOn && <span style={{ fontSize:10, color:ACCENT, background:`${ACCENT}15`, padding:"2px 7px", borderRadius:6, fontWeight:700 }}>Active alert</span>}
                  </div>
                  <Textarea
                    placeholder="Write a note for this day…"
                    value={noteText}
                    onChange={e=>setDayNotes(n=>({...n,[d]:{...(n[d]||{}),text:e.target.value}}))}
                    rows={3}
                  />
                  {alertOn && <div style={{ fontSize:11, color:"#5A7A80", marginTop:6 }}>An alert will be shown when the app is opened on this day.</div>}
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
            <div style={{ width:40, height:4, background:"#E8E4DC", borderRadius:2, margin:"0 auto 22px" }}/>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:13, background:"#1B3F45", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon name="bell" size={20} color="white"/>
              </div>
              <div>
                <div style={{ fontSize:17, fontWeight:800, color:"#1B3F45", letterSpacing:"-0.01em" }}>Note for today</div>
                <div style={{ fontSize:12, color:"#5A7A80", fontWeight:500 }}>{new Date(noteAlert.date+"T12:00:00").toLocaleDateString("en-GB",{ weekday:"long", day:"numeric", month:"long" })}</div>
              </div>
            </div>
            <div style={{ background:PASTELS.scan, borderRadius:14, padding:"14px 16px", fontSize:14, color:"#1B3F45", lineHeight:1.6, marginBottom:20, whiteSpace:"pre-wrap", fontWeight:500 }}>{noteAlert.text}</div>
            <button onClick={()=>setNoteAlert(null)} style={{ width:"100%", padding:"16px", background:"#1B3F45", color:"white", border:"none", borderRadius:16, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:700, cursor:"pointer" }}>Got it</button>
          </div>
        </div>
      )}

      {/* ── DONE MODAL ── */}
      {doneModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:2000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ background:"white", borderRadius:"28px 28px 0 0", padding:"28px 24px 44px", width:"100%", maxWidth:430, animation:"fadeUp 0.2s ease" }}>
            <div style={{ width:40, height:4, background:"#E8E4DC", borderRadius:2, margin:"0 auto 28px" }}/>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
              <div style={{ width:64, height:64, borderRadius:20, background:PASTELS.done, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon name="checkCircle" size={32} color="#198038"/>
              </div>
            </div>
            <div style={{ fontSize:22, fontWeight:900, color:"#1B3F45", textAlign:"center", marginBottom:8, letterSpacing:"-0.02em" }}>Order completed!</div>
            <div style={{ fontSize:14, color:"#5A7A80", textAlign:"center", marginBottom:28, lineHeight:1.6, fontWeight:500 }}>Would you like to create an invoice for this order now?</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={()=>{ setDoneModal(null); setView("detail"); showToast("Marked as Done","#198038"); }}
                style={{ width:"100%", padding:"16px", background:"#F0F6F7", border:"none", borderRadius:16, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:700, color:"#1B3F45", cursor:"pointer" }}>
                Not now
              </button>
              <button onClick={()=>{
                const o = orders.find(x=>x.id===doneModal);
                setDoneModal(null);
                if(o) loadOrderIntoInvoice(o);
              }}
                style={{ width:"100%", padding:"16px", background:"#1B3F45", border:"none", borderRadius:16, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:700, color:"white", cursor:"pointer" }}>
                Yes, create invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── OPTIONS MENU (···) ── */}
      {optionsMenu && (
        <div style={{ position:"fixed", inset:0, background:"rgba(27,63,69,0.35)", zIndex:3000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
             onClick={()=>setOptionsMenu(null)}>
          <div style={{ background:"white", borderRadius:"14px 14px 0 0", padding:"12px 0 max(28px, env(safe-area-inset-bottom, 28px))", width:"100%", maxWidth:500, animation:"fadeUp 0.2s ease" }}
               onClick={e=>e.stopPropagation()}>
            {/* Handle */}
            <div style={{ width:28, height:3, background:"#E8E4DC", borderRadius:2, margin:"0 auto 16px" }}/>
            {/* Título */}
            <div style={{ padding:"0 20px 14px", borderBottom:"0.5px solid #F5F3EF" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1B3F45" }}>{optionsMenu.client || "Orden"}</div>
              <div style={{ fontSize:11, color:"#9DB5B9", marginTop:2 }}>#{optionsMenu.id}</div>
            </div>

            {/* Opción 1 — Editar */}
            <button onClick={()=>{ setOptionsMenu(null); setDraft({...optionsMenu}); setView("edit"); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 20px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
              <div style={{ width:38, height:38, borderRadius:10, background:"#E0EDEF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon name="pencil" size={18} color="#1B3F45"/>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>Editar orden</div>
                <div style={{ fontSize:11, color:"#9DB5B9", marginTop:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>Cambiar datos, items o fecha</div>
              </div>
            </button>

            {/* Opción 2 — Marcar como terminada (solo si no está done/invoiced) */}
            {optionsMenu.status !== "done" && optionsMenu.status !== "invoiced" && (
              <button onClick={()=>{ setOptionsMenu(null); setConfirmSheet({ type:"done", order:optionsMenu }); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 20px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
                <div style={{ width:38, height:38, borderRadius:10, background:"#E8F3EF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon name="check" size={18} color="#1B6048"/>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>Marcar como terminada</div>
                  <div style={{ fontSize:11, color:"#9DB5B9", marginTop:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>El trabajo está completado</div>
                </div>
              </button>
            )}

            {/* Opción 3 — Generar factura (solo si está done) */}
            {optionsMenu.status === "done" && (
              <button onClick={()=>{ setOptionsMenu(null); setConfirmSheet({ type:"invoice", order:optionsMenu }); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 20px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
                <div style={{ width:38, height:38, borderRadius:10, background:"#FBF5E8", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon name="invoice" size={18} color="#8A6220"/>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>Generar factura</div>
                  <div style={{ fontSize:11, color:"#9DB5B9", marginTop:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>Crear factura con esta orden</div>
                </div>
              </button>
            )}

            {/* Separador antes de eliminar */}
            {optionsMenu.status !== "invoiced" && (
              <div style={{ height:"0.5px", background:"#F5F3EF", margin:"4px 0" }}/>
            )}

            {/* Opción 4 — Eliminar (si no está facturada) */}
            {optionsMenu.status !== "invoiced" && (
              <button onClick={()=>{ setOptionsMenu(null); setConfirmSheet({ type:"delete", order:optionsMenu }); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 20px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
                <div style={{ width:38, height:38, borderRadius:10, background:"#FCEBEB", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon name="trash" size={18} color="#A32D2D"/>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:"#A32D2D", fontFamily:"'IBM Plex Sans', sans-serif" }}>Eliminar orden</div>
                  <div style={{ fontSize:11, color:"#9DB5B9", marginTop:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>Esta acción no se puede deshacer</div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── CONFIRM SHEET ── */}
      {confirmSheet && (()=>{
        const { type, order } = confirmSheet;
        const close = () => setConfirmSheet(null);
        const total = (order.lineItems||[]).length > 0
          ? (order.lineItems).reduce((s,li)=>s+lineTotal(li),0)
          : parseFloat(order.amount)||0;

        const OrderSummary = () => (
          <div style={{ background:"#F7F5F0", borderRadius:9, padding:"12px 14px", marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:11, color:"#9DB5B9", fontWeight:500, fontFamily:"'IBM Plex Sans', sans-serif" }}>Cliente</span>
              <span style={{ fontSize:11, fontWeight:700, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>{order.client||"—"}</span>
            </div>
            {(order.lineItems||[]).filter(li=>li.desc).map(li=>(
              <div key={li.id} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:11, color:"#5A7A80", fontFamily:"'IBM Plex Sans', sans-serif", flex:1, marginRight:8 }}>{li.desc}{li.qty&&li.qty!=="1"?` ×${li.qty}`:""}</span>
                {lineTotal(li)>0 && <span style={{ fontSize:11, color:"#5A7A80", fontFamily:"'IBM Plex Sans', sans-serif", whiteSpace:"nowrap" }}>{C.currency} {fmt(lineTotal(li))}</span>}
              </div>
            ))}
            {(order.lineItems||[]).filter(li=>li.desc).length===0 && order.description && (
              <div style={{ fontSize:11, color:"#5A7A80", fontFamily:"'IBM Plex Sans', sans-serif", marginBottom:6 }}>{order.description}</div>
            )}
            {total > 0 && (
              <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, borderTop:"0.5px solid #E8E4DC", marginTop:4 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>Total</span>
                <span style={{ fontSize:12, fontWeight:800, color:"#C9933A", fontFamily:"'IBM Plex Sans', sans-serif" }}>{C.currency} {fmt(total)}</span>
              </div>
            )}
          </div>
        );

        /* ─── Variante A — Marcar como terminada ─── */
        if(type === "done") return (
          <div style={{ position:"fixed", inset:0, background:"rgba(27,63,69,0.35)", zIndex:3500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
               onClick={close}>
            <div style={{ background:"white", borderRadius:"14px 14px 0 0", padding:"16px 20px max(28px, env(safe-area-inset-bottom, 28px))", width:"100%", maxWidth:500, animation:"fadeUp 0.2s ease" }}
                 onClick={e=>e.stopPropagation()}>
              <div style={{ width:28, height:3, background:"#E8E4DC", borderRadius:2, margin:"0 auto 16px" }}/>
              <div style={{ fontSize:13, fontWeight:500, color:"#1B3F45", marginBottom:4, fontFamily:"'IBM Plex Sans', sans-serif" }}>Marcar como terminada</div>
              <div style={{ fontSize:10, color:"#9DB5B9", lineHeight:1.4, marginBottom:16, fontFamily:"'IBM Plex Sans', sans-serif" }}>Confirma que el trabajo está completado</div>
              <OrderSummary/>
              <button onClick={()=>{
                close();
                setOrders(orders.map(o=>o.id===order.id?{...o,status:"done"}:o));
                showToast("Orden marcada como terminada","#198038");
                setDoneModal(order.id);
              }} style={{ width:"100%", padding:"15px", background:"#1B3F45", color:"white", border:"none", borderRadius:10, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:10 }}>
                <Icon name="check" size={16} color="#C9933A"/> Confirmar — está terminada
              </button>
              <button onClick={close} style={{ width:"100%", padding:"13px", background:"none", border:"none", fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:600, color:"#5A7A80", cursor:"pointer" }}>Cancelar</button>
            </div>
          </div>
        );

        /* ─── Variante B — Generar factura ─── */
        if(type === "invoice") return (
          <div style={{ position:"fixed", inset:0, background:"rgba(27,63,69,0.35)", zIndex:3500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
               onClick={close}>
            <div style={{ background:"white", borderRadius:"14px 14px 0 0", padding:"16px 20px max(28px, env(safe-area-inset-bottom, 28px))", width:"100%", maxWidth:500, animation:"fadeUp 0.2s ease" }}
                 onClick={e=>e.stopPropagation()}>
              <div style={{ width:28, height:3, background:"#E8E4DC", borderRadius:2, margin:"0 auto 16px" }}/>
              <div style={{ fontSize:13, fontWeight:500, color:"#1B3F45", marginBottom:4, fontFamily:"'IBM Plex Sans', sans-serif" }}>Generar factura</div>
              <div style={{ fontSize:10, color:"#9DB5B9", lineHeight:1.4, marginBottom:16, fontFamily:"'IBM Plex Sans', sans-serif" }}>Esto creará la factura con estos datos</div>
              <OrderSummary/>
              <button onClick={()=>{
                close();
                loadOrderIntoInvoice(order);
              }} style={{ width:"100%", padding:"15px", background:"#C9933A", color:"white", border:"none", borderRadius:10, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:10 }}>
                <Icon name="invoice" size={16} color="white"/> Confirmar y generar factura
              </button>
              <button onClick={close} style={{ width:"100%", padding:"13px", background:"none", border:"none", fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:600, color:"#5A7A80", cursor:"pointer" }}>Cancelar</button>
            </div>
          </div>
        );

        /* ─── Variante C — Eliminar ─── */
        if(type === "delete") return (
          <div style={{ position:"fixed", inset:0, background:"rgba(27,63,69,0.35)", zIndex:3500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
               onClick={close}>
            <div style={{ background:"white", borderRadius:"14px 14px 0 0", padding:"16px 20px max(28px, env(safe-area-inset-bottom, 28px))", width:"100%", maxWidth:500, animation:"fadeUp 0.2s ease" }}
                 onClick={e=>e.stopPropagation()}>
              <div style={{ width:28, height:3, background:"#E8E4DC", borderRadius:2, margin:"0 auto 16px" }}/>
              <div style={{ fontSize:13, fontWeight:500, color:"#1B3F45", marginBottom:4, fontFamily:"'IBM Plex Sans', sans-serif" }}>Eliminar orden</div>
              <div style={{ fontSize:10, color:"#9DB5B9", lineHeight:1.4, marginBottom:14, fontFamily:"'IBM Plex Sans', sans-serif" }}>¿Estás segura?</div>
              {/* Advertencia */}
              <div style={{ display:"flex", alignItems:"flex-start", gap:10, background:"#FCEBEB", borderRadius:8, padding:"8px 10px", marginBottom:14 }}>
                <Icon name="alert" size={16} color="#A32D2D"/>
                <span style={{ fontSize:10, color:"#A32D2D", lineHeight:1.4, fontFamily:"'IBM Plex Sans', sans-serif" }}>
                  Esta acción no se puede deshacer. Se eliminará toda la información de la orden #{order.id}
                </span>
              </div>
              <OrderSummary/>
              <button onClick={()=>{
                close();
                setOrders(orders.filter(o=>o.id!==order.id));
                if(selectedId===order.id) setView("list");
                showToast("Orden eliminada","#da1e28");
              }} style={{ width:"100%", padding:"15px", background:"#FCEBEB", color:"#A32D2D", border:"1px solid #F7C1C1", borderRadius:10, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:14, fontWeight:700, cursor:"pointer", marginBottom:10 }}>
                Sí, eliminar orden
              </button>
              <button onClick={close} style={{ width:"100%", padding:"13px", background:"none", border:"none", fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:600, color:"#5A7A80", cursor:"pointer" }}>Cancelar</button>
            </div>
          </div>
        );

        return null;
      })()}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position:"fixed", bottom:100, left:"50%", transform:"translateX(-50%)", background:toast.color, color:"white", padding:"12px 24px", borderRadius:100, fontFamily:"'IBM Plex Sans', sans-serif", fontWeight:700, fontSize:14, zIndex:2000, boxShadow:"0 4px 20px rgba(0,0,0,0.2)", whiteSpace:"nowrap", animation:"fadeUp 0.2s ease", display:"flex", alignItems:"center", gap:8 }}>
          <Icon name="check" size={15} color="white"/> {toast.msg}
        </div>
      )}

      {/* ── CONFIRM MODAL ── */}
      {confirmModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:3000, display:"flex", alignItems:"flex-end", justifyContent:"center", padding:"0 16px 32px" }}>
          <div style={{ background:"white", borderRadius:24, padding:"24px 24px 20px", width:"100%", maxWidth:468, animation:"fadeUp 0.2s ease", textAlign:"left" }}>
            <div style={{ fontSize:16, fontWeight:700, color:"#1B3F45", marginBottom:8, textAlign:"center", letterSpacing:"-0.01em" }}>Are you sure?</div>
            <div style={{ fontSize:14, color:"#5A7A80", textAlign:"center", lineHeight:1.5, marginBottom:24 }}>{confirmModal.message}</div>
            <button onClick={()=>{ confirmModal.onConfirm(); setConfirmModal(null); }} style={{ width:"100%", padding:"16px", background:"#da1e28", color:"white", border:"none", borderRadius:16, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:800, cursor:"pointer", marginBottom:10 }}>
              Delete
            </button>
            <button onClick={()=>setConfirmModal(null)} style={{ width:"100%", padding:"15px", background:"#F0F6F7", color:"#1B3F45", border:"none", borderRadius:16, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:600, cursor:"pointer" }}>
              Cancel
            </button>
          </div>
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
            <div style={{ position:"sticky", top:0, background:"white", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:"1px solid #E8E4DC", zIndex:10, flexShrink:0 }}>
              <button onClick={()=>setRechnungData(null)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#1B3F45", padding:"0 4px" }}>×</button>
              <span style={{ fontWeight:700, fontSize:15, fontFamily:"'IBM Plex Sans', sans-serif" }}>Rechnung Vorschau</span>
              <button onClick={()=>printRechnung(order, unitPrice, porto)} style={{ background:ACCENT, color:"white", border:"none", borderRadius:10, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'IBM Plex Sans', sans-serif" }}>⎙ Drucken / PDF</button>
            </div>

            {/* invoice paper */}
            <div style={{ background:"#F0F6F7", flex:1, padding:"24px 16px 40px" }}>
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
