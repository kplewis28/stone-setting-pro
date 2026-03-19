import { useState, useRef } from "react";

// ─── CLIENT CONFIG — only this changes per client ───────
const CONFIG = {
  ownerName: "Marco",
  businessName: "Stone Setting Pro",
  businessType: "Stone Setting",
  location: "Zürich, Switzerland",
  currency: "CHF",
  taxLabel: "MwSt.",
  taxRate: 0.081,
  paymentTerms: "Payable within 30 days",
  bankDetails: "IBAN CH00 0000 0000 0000 0000 0",
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
const newItem  = () => ({ id: Date.now()+Math.random(), desc:"", field1:"", field2:"", qty:"", price:"" });
const fmt      = n => Number(n||0).toFixed(2);
const INV_NR   = `RS-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}-${String(Math.floor(Math.random()*900+100))}`;

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
  const [orders, setOrders]     = useState(SAMPLE_ORDERS);
  const [view, setView]         = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft]       = useState(newOrder());
  const [items, setItems]       = useState([newItem()]);
  const [invClient, setInvClient] = useState("");
  const [invDate, setInvDate]   = useState(new Date().toISOString().split("T")[0]);
  const [invView, setInvView]   = useState("form");
  const [photoStep, setPhotoStep] = useState("capture");
  const [imgData, setImgData]   = useState(null);
  const [imgFile, setImgFile]   = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg]       = useState("");
  const [extracted, setExtracted] = useState(null);
  const fileRef = useRef();

  const subtotal = items.reduce((s,it) => s + (parseFloat(it.qty)||0)*(parseFloat(it.price)||0), 0);
  const tax      = subtotal * C.taxRate;
  const total    = subtotal + tax;
  const counts   = Object.keys(C.statuses).reduce((a,k) => ({...a,[k]:orders.filter(o=>o.status===k).length}),{});
  const pending  = orders.filter(o=>o.status==="done").reduce((s,o)=>s+(o.amount||0),0);

  // ── PHOTO AI ──
  const analyzePhoto = async () => {
    setAiLoading(true);
    const MSGS = ["Reading document…","Extracting details…","Almost done…"];
    let i=0; setAiMsg(MSGS[0]);
    const iv = setInterval(()=>{ i=(i+1)%MSGS.length; setAiMsg(MSGS[i]); },1400);
    try {
      const b64 = imgData.split(",")[1];
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:800,
          messages:[{ role:"user", content:[
            { type:"image", source:{ type:"base64", media_type: imgFile.type||"image/jpeg", data:b64 }},
            { type:"text", text:`You are reading a jewelry delivery note sent TO a stone setter in Switzerland. The CLIENT is the jewelry company that SENT this document - look for the company name in the letterhead or signature, NOT the recipient address at top. Return ONLY valid JSON no backticks: {"client":"name of jewelry company that sent document","orderRef":"order reference number","field1":"type of jewelry piece or metal","field2":"type of work requested","pieces":"number of pieces","notes":"special instructions","summary":"1 sentence in English"}` }
          ]}]
        })
      });
      const data = await res.json();
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
    setOrders([{ ...newOrder(), client:extracted.client||"", field1:extracted.field1||"", field2:extracted.field2||"", pieces:extracted.pieces||"", notes:extracted.notes||"" }, ...orders]);
    setPhotoStep("done");
  };

  const resetPhoto = () => { setPhotoStep("capture"); setImgData(null); setImgFile(null); setExtracted(null); };

  const goHome = () => { setTab("home"); setView("list"); setPhotoStep("capture"); setInvView("form"); };

  // ── DETAIL ORDER ──
  const selectedOrder = orders.find(o=>o.id===selectedId);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica',sans-serif", background:"#F2F2F7", minHeight:"100vh", maxWidth:430, margin:"0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        * { -webkit-tap-highlight-color: transparent; }
        input:focus, select:focus, textarea:focus { border-color: ${ACCENT} !important; background:white !important; }
      `}</style>

      {/* ── HOME TAB ── */}
      {tab==="home" && (
        <div style={{ animation:"fadeUp 0.3s ease" }}>
          {/* TOP BAR */}
          <div style={{ padding:"56px 24px 0", background:"white" }}>
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

          <div style={{ padding:"20px 16px 100px" }}>
            {/* QUICK ACTIONS */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
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
                    <button key={key} style={{ padding:"7px 16px", borderRadius:100, border:"1.5px solid #E5E5EA", background:"white", fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:13, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", color:"#1C1C1E", flexShrink:0 }}>
                      {label}&nbsp;<span style={{ color:"#C7C7CC", fontWeight:400 }}>{cnt}</span>
                    </button>
                  ))}
                </div>

                {/* Order rows — minimal: client + status + one line of meta */}
                {orders.map(o => (
                  <button key={o.id} onClick={()=>{ setSelectedId(o.id); setView("detail"); }} style={{ width:"100%", background:"white", border:"1.5px solid #F2F2F7", borderRadius:16, padding:"16px 18px", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", textAlign:"left" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:"#1C1C1E", marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{o.client}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        {/* colored dot + meta in one clean line */}
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
                <BtnPrimary disabled={!draft.client} onClick={()=>{ if(draft.client){ setOrders([{...draft},...orders]); setDraft(newOrder()); setView("list"); } }}>
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

                {/* Amount + invoice — only when done */}
                {selectedOrder.status==="done" && (
                  <Card>
                    <Field label={`Amount to charge (${C.currency})`}>
                      <Input
                        type="number" placeholder="0.00"
                        value={selectedOrder.amount||""}
                        onChange={e=>setOrders(orders.map(o=>o.id===selectedOrder.id?{...o,amount:parseFloat(e.target.value)||0}:o))}
                      />
                    </Field>
                    <BtnPrimary onClick={()=>{
                      setInvClient(selectedOrder.client);
                      setItems([{ ...newItem(), desc:`${selectedOrder.field1} · ${selectedOrder.field2}`, field1:selectedOrder.field1, field2:selectedOrder.field2, qty:selectedOrder.pieces||1, price:selectedOrder.amount||"" }]);
                      setTab("invoice"); setInvView("form");
                    }}>
                      <Icon name="invoice" size={18} color="white"/> Create Invoice
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
          <div style={{ padding:"56px 20px 16px", background:"white", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid #F2F2F7" }}>
            <button onClick={()=>{ invView==="preview"?setInvView("form"):goHome(); }} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="back" size={22} color="#1C1C1E"/></button>
            <div style={{ fontSize:18, fontWeight:700, color:"#1C1C1E" }}>{invView==="preview"?"Invoice Preview":"New Invoice"}</div>
            {invView==="form" && <div style={{ marginLeft:"auto", fontFamily:"monospace", fontSize:12, color:"#8E8E93" }}>{INV_NR}</div>}
          </div>

          <div style={{ padding:"20px 16px 100px" }}>
            {invView==="form" && (
              <>
                <Card>
                  <Field label="Client *"><Input placeholder="Company name" value={invClient} onChange={e=>setInvClient(e.target.value)}/></Field>
                  <Field label="Date"><Input type="date" value={invDate} onChange={e=>setInvDate(e.target.value)}/></Field>
                </Card>

                <SectionTitle>Line Items</SectionTitle>
                {items.map((it,idx)=>(
                  <Card key={it.id} style={{ position:"relative" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:ACCENT, letterSpacing:"0.1em", textTransform:"uppercase" }}>Item {idx+1}</div>
                      {items.length>1 && <button onClick={()=>setItems(items.filter(i=>i.id!==it.id))} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon name="trash" size={16} color="#8E8E93"/></button>}
                    </div>
                    <Field label="Description"><Input placeholder={`e.g. ${C.serviceTypes[0]} setting`} value={it.desc} onChange={e=>setItems(items.map(i=>i.id===it.id?{...i,desc:e.target.value}:i))}/></Field>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <Field label={C.fieldLabel}>
                        <Select value={it.field1} onChange={e=>setItems(items.map(i=>i.id===it.id?{...i,field1:e.target.value}:i))}>
                          <option value="">—</option>{C.itemCategories.map(o=><option key={o}>{o}</option>)}
                        </Select>
                      </Field>
                      <Field label={C.subFieldLabel}>
                        <Select value={it.field2} onChange={e=>setItems(items.map(i=>i.id===it.id?{...i,field2:e.target.value}:i))}>
                          <option value="">—</option>{C.serviceTypes.map(o=><option key={o}>{o}</option>)}
                        </Select>
                      </Field>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <Field label="Qty"><Input type="number" placeholder="0" value={it.qty} onChange={e=>setItems(items.map(i=>i.id===it.id?{...i,qty:e.target.value}:i))}/></Field>
                      <Field label={`Price (${C.currency})`}><Input type="number" placeholder="0.00" value={it.price} onChange={e=>setItems(items.map(i=>i.id===it.id?{...i,price:e.target.value}:i))}/></Field>
                    </div>
                    {it.qty&&it.price&&<div style={{ textAlign:"right", fontSize:14, fontWeight:700, color:ACCENT }}>= {C.currency} {fmt((parseFloat(it.qty)||0)*(parseFloat(it.price)||0))}</div>}
                  </Card>
                ))}

                <button onClick={()=>setItems([...items,newItem()])} style={{ width:"100%", padding:"14px", background:"white", border:"2px dashed #E5E5EA", borderRadius:14, fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:14, fontWeight:600, color:"#8E8E93", cursor:"pointer", marginBottom:16 }}>+ Add Item</button>

                <Card style={{ background:"#1C1C1E" }}>
                  {[[`Subtotal`,fmt(subtotal)],[`${C.taxLabel} ${(C.taxRate*100).toFixed(1)}%`,fmt(tax)]].map(([l,v])=>(
                    <div key={l} style={{ display:"flex", justifyContent:"space-between", fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:14, color:"rgba(255,255,255,0.5)", marginBottom:8 }}>
                      <span>{l}</span><span>{C.currency} {v}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid rgba(255,255,255,0.1)", paddingTop:12, marginTop:4 }}>
                    <span style={{ fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:15, color:"rgba(255,255,255,0.7)" }}>Total</span>
                    <span style={{ fontSize:22, fontWeight:700, color:"white" }}>{C.currency} {fmt(total)}</span>
                  </div>
                </Card>

                <BtnPrimary disabled={!invClient} onClick={()=>invClient&&setInvView("preview")}>Preview Invoice →</BtnPrimary>
              </>
            )}

            {invView==="preview" && (
              <>
                <Card style={{ padding:"28px 24px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
                    <div>
                      <div style={{ fontSize:20, fontWeight:800, color:"#1C1C1E", letterSpacing:"-0.02em" }}>{C.businessName}</div>
                      <div style={{ fontSize:12, color:"#8E8E93", marginTop:2 }}>{C.location}</div>
                    </div>
                    <div style={{ width:40, height:40, background:`${ACCENT}15`, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Icon name="gem" size={20} color={ACCENT}/>
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24, padding:"16px", background:"#F2F2F7", borderRadius:12 }}>
                    <div><div style={{ fontSize:10, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:700, marginBottom:4 }}>To</div><div style={{ fontSize:14, fontWeight:700, color:"#1C1C1E" }}>{invClient}</div></div>
                    <div style={{ textAlign:"right" }}><div style={{ fontSize:10, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:700, marginBottom:4 }}>Invoice</div><div style={{ fontSize:12, fontFamily:"monospace", color:"#1C1C1E", fontWeight:600 }}>{INV_NR}</div><div style={{ fontSize:11, color:"#8E8E93" }}>{invDate}</div></div>
                  </div>

                  <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"'DM Sans','Helvetica',sans-serif", fontSize:13, marginBottom:20 }}>
                    <thead><tr>{["Description","Qty","Price","Total"].map(h=><th key={h} style={{ textAlign:h==="Description"?"left":"right", padding:"6px 4px", color:"#8E8E93", fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, borderBottom:"1px solid #F2F2F7" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {items.filter(it=>it.desc||it.price).map((it,i)=>{
                        const line=(parseFloat(it.qty)||0)*(parseFloat(it.price)||0);
                        return <tr key={i}>
                          <td style={{ padding:"10px 4px", borderBottom:"1px solid #F2F2F7", verticalAlign:"top" }}>
                            <div style={{ fontWeight:700, color:"#1C1C1E" }}>{it.desc||"—"}</div>
                            {(it.field1||it.field2)&&<div style={{ fontSize:11, color:"#8E8E93", marginTop:2 }}>{[it.field1,it.field2].filter(Boolean).join(" · ")}</div>}
                          </td>
                          <td style={{ padding:"10px 4px", textAlign:"right", borderBottom:"1px solid #F2F2F7", color:"#3C3C43" }}>{it.qty}</td>
                          <td style={{ padding:"10px 4px", textAlign:"right", borderBottom:"1px solid #F2F2F7", color:"#3C3C43" }}>{C.currency} {fmt(parseFloat(it.price)||0)}</td>
                          <td style={{ padding:"10px 4px", textAlign:"right", borderBottom:"1px solid #F2F2F7", fontWeight:700, color:"#1C1C1E" }}>{C.currency} {fmt(line)}</td>
                        </tr>;
                      })}
                    </tbody>
                  </table>

                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, marginBottom:20 }}>
                    {[[`Subtotal`,subtotal],[`${C.taxLabel} ${(C.taxRate*100).toFixed(1)}%`,tax]].map(([l,v])=>(
                      <div key={l} style={{ display:"flex", gap:32, fontSize:13, color:"#8E8E93" }}><span>{l}</span><span style={{ minWidth:80, textAlign:"right" }}>{C.currency} {fmt(v)}</span></div>
                    ))}
                    <div style={{ display:"flex", gap:32, borderTop:"2px solid #1C1C1E", paddingTop:10, marginTop:4 }}>
                      <span style={{ fontSize:15, fontWeight:700, color:"#1C1C1E" }}>Total</span>
                      <span style={{ fontSize:18, fontWeight:800, color:ACCENT, minWidth:80, textAlign:"right" }}>{C.currency} {fmt(total)}</span>
                    </div>
                  </div>

                  <div style={{ borderTop:"1px solid #F2F2F7", paddingTop:16, fontSize:11, color:"#8E8E93", lineHeight:1.8 }}>
                    {C.paymentTerms}<br/>{C.bankDetails}
                  </div>
                </Card>

                <BtnPrimary onClick={()=>window.print()}><Icon name="invoice" size={18} color="white"/> Print / Save as PDF</BtnPrimary>
                <div style={{ height:10 }}/>
                <BtnGhost onClick={()=>{ const t=`Invoice ${INV_NR}\nClient: ${invClient}\nTotal: ${C.currency} ${fmt(total)}`; navigator.share?navigator.share({title:`Invoice ${INV_NR}`,text:t}):navigator.clipboard?.writeText(t); }}>↗ Share via WhatsApp</BtnGhost>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"white", borderTop:"1px solid #F2F2F7", display:"flex", padding:"10px 0 24px", zIndex:100 }}>
        {[
          { key:"home",    icon:"orders",  label:"Home"    },
          { key:"scan",    icon:"scan",    label:"Scan"    },
          { key:"orders",  icon:"gem",     label:"Orders"  },
          { key:"invoice", icon:"invoice", label:"Invoice" },
        ].map(({ key, icon, label }) => (
          <button key={key} onClick={()=>{ setTab(key); if(key==="scan")resetPhoto(); if(key==="orders"){ setView("list"); } if(key==="invoice")setInvView("form"); }} style={{ flex:1, background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"4px 0" }}>
            <div style={{ width:44, height:44, borderRadius:14, background: tab===key ? `${ACCENT}15` : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
              <Icon name={icon} size={22} color={tab===key ? ACCENT : "#8E8E93"}/>
            </div>
            <span style={{ fontSize:10, fontWeight: tab===key ? 700 : 500, color: tab===key ? ACCENT : "#8E8E93", letterSpacing:"0.02em" }}>{label}</span>
          </button>
        ))}
      </div>

    </div>
  );
}
