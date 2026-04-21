import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { dbGet, dbSet, supabase } from './supabase';
import { Button, TextInput, TextArea } from '@carbon/react';
import { connectDrive, disconnectDrive, isDriveConnected, silentReconnect, saveInvoiceToDrive } from './googleDrive';

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
  sheetsUrl: "https://script.google.com/macros/s/AKfycbwrS39lpQVDKjW-NIlCSfkjMd7iv36fnMiuUpC9awF2Z5jewZj970YftzWNlcqUrgpetA/exec",
  porto: 0,
  accentColor: "#C9933A",
  serviceTypes: ["Pavé", "Bezel", "Prong", "Channel", "Flush", "Invisible"],
  itemCategories: ["Diamond", "Ruby", "Emerald", "Sapphire", "Amethyst", "Other"],
  fieldLabel: "Stone",
  subFieldLabel: "Setting",
  piecesLabel: "Pieces",
  statuses: {
    received:   { label: "Pending",    color: "#C9933A" },
    inprogress: { label: "In Review",  color: "#1B3F45" },
    done:       { label: "Approved",   color: "#198038" },
    invoiced:   { label: "Invoiced",   color: "#5A7A80" },
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

const TRANS = {
  en: {
    tabHome:"Home", tabScan:"Stats", tabOrders:"Orders", tabClients:"Clients", tabInvoice:"Invoice",
    statsTitle:"Statistics", statsOrders:"Orders", statsRevenue:"Revenue", statsUnits:"Units", statsClients:"Active clients", statsTrend:"Monthly trend",
    signInTo:"Sign in to continue", emailLabel:"Email", passwordLabel:"Password", signingIn:"Signing in\u2026", signInBtn:"Sign in",
    profileLanguage:"Language", profileChangePw:"Change password", profileSignOut:"Sign out",
    changePwTitle:"Change password", newPasswordLabel:"New password", confirmPwLabel:"Confirm password",
    pwMinChars:"Minimum 6 characters", repeatPw:"Repeat new password",
    pwUpdated:"Password updated", enterNewPw:"Enter a new password.", pwNoMatch:"Passwords don\u2019t match.", pwMin6:"Minimum 6 characters.",
    savingLabel:"Saving\u2026", updatePwBtn:"Update password",
    goodMorning:"Good morning", goodAfternoon:"Good afternoon", goodEvening:"Good evening",
    newOrderBtn:"New order", createWorkOrderSub:"Create work order",
    needsAttention:"Needs attention",
    statusReceived:"Pending", statusInprogress:"In Review", statusDone:"Approved", statusInvoiced:"Invoiced",
    allFilter:"All", allClients:"All clients",
    overdueLabel:"Overdue", todayLabel:"Today", tomorrowLabel:"Tomorrow", dueLabel:"Due", noDueDateLabel:"No due date",
    workOrderBtn:"Work order", createInvoiceBtn:"Create invoice", printInvoiceBtn:"Print invoice",
    swipeHint:"\u2190 Swipe to mark done \u00a0\u00b7\u00a0 Swipe to delete \u2192",
    selectBtn:"Select", cancelBtn:"Cancel",
    newOrderTitle:"New order", editOrderTitle:"Edit order",
    chooseClientSection:"Choose a client", chooseClientSub:"Who is this order for? Select an existing client or create a new one.",
    addPiecesSection:"Add the pieces", addPiecesSub:"Describe each piece. Use the quantity field for the amount. Add as many pieces as needed.",
    setDeadlineSection:"Set the delivery deadline", setDeadlineSub:"When does this order need to be ready? You can also add special instructions.",
    searchClientPlaceholder:"Search client...", createNewClientBtn:"Create new client",
    addAnotherPieceBtn:"Add another piece",
    addPhotoBtn:"Add photo of this piece",
    week1:"1 week", weeks2:"2 weeks", month1:"1 month",
    selectClientFirst:"Select a client first",
    specialInstructionsPlaceholder:"Special instructions, client reference, desired finish\u2026",
    descPlaceholder:"What needs to be done? Start with a number for quantity, e.g. 3 rings to polish",
    markCompletedBtn:"Mark as completed", printBtn:"Print",
    totalLabel:"Total",
    readyToInvoice:"Ready to invoice", invoiceCreatedLabel:"Invoice created",
    receivedStep:"Received", inProgressStep:"In Progress", completedStep:"Completed", invoicedStep:"Invoiced",
    pendingStatus:"Pending", inReviewStatus:"In Review",
    invoicesTitle:"Invoices", noInvoicesYet:"No invoices yet",
    noInvoicesDesc:"Invoices created from orders appear here.\nYou can also create one manually.",
    unprintedFilter:"Unprinted", printedFilter:"Printed",
    postageLabel:"Postage", postageNotAdded:"Postage not added", postageScrollUp:"Scroll up to add shipping cost before saving.",
    postageHint:"Don't forget to add shipping cost",
    saveInvoiceBtn:"Save invoice", saveAndPrintBtn:"Save & print",
    invoiceSaved:"Invoice saved",
    clientsTitle:"Clients", newClientTitle:"New client", noClientsYet:"No clients yet",
    nameLabel:"Name", companyLabel:"Company", addressLabel:"Address", phoneLabel:"Phone",
    saveClientBtn:"Save client", clientSaved:"Client saved",
    orderSaved:"Order saved", orderUpdated:"Order updated",
    deleteOrderConfirm:"Delete order",
    areYouSure:"Are you sure?",
    donePromptBtn:"Confirm \u2014 order completed",
    noOrdersYet:"No orders yet",
    noOrdersDesc:"Your orders will appear here.",
    todaysOrders:"Today's Orders",
    noOrdersForDay:"No orders for this day",
    noPendingOrders:"No pending orders",
    viewAllOrders:"View all orders \u2192",
    noDate:"No date",
    scanTitle:"Scan Delivery Note",
    takePhoto:"Take a photo",
    cameraDesc:"Point your camera at the printed sheet inside the box. The AI reads everything automatically.",
    openCamera:"Open Camera",
    chooseGallery:"Choose from Gallery",
    tipsTitle:"Tips for best results",
    analyzeBtn:"Analyze with AI",
    retakePhoto:"\u21a9 Retake photo",
    aiReadThis:"AI read this",
    confirmDetailsTitle:"Confirm details",
    createOrderBtn:"Create Order",
    orderCreatedTitle:"Order created!",
    orderCreatedDesc:"It\u2019s now in your orders list.",
    goToOrders:"Go to Orders \u2192",
    scanAnother:"Scan another",
    subtotalLabel:"Subtotal",
    savedStatus:"Saved",
    newBtn:"+ New",
    noInvoicesMatch:"No invoices match this filter",
    editClientTitle:"Edit Client",
    noClientsDesc:"Add your clients to assign them to orders and invoices automatically.",
    addClientBtn:"+ Add client",
    noOrdersForClient:"No orders for this client yet.",
    newOrderForClient:"+ New order for this client",
    addOrderForDay:"Add order for this day",
    notesLabel:"Notes",
    activeAlert:"Active alert",
    notePlaceholder:"Write a note for this day\u2026",
    alertInfo:"An alert will be shown when the app is opened on this day.",
    noteForToday:"Note for today",
    gotItBtn:"Got it",
    orderCompletedTitle:"Order completed!",
    createInvoicePrompt:"Would you like to create an invoice for this order now?",
    notNowBtn:"Not now",
    yesCreateInvoice:"Yes, create invoice",
    markedAsDone:"Marked as Done",
    editOrderMenu:"Edit order",
    editOrderSub:"Update details, items or date",
    duplicateOrderMenu:"Duplicate order",
    duplicateOrderSub:"Create a copy with a new ID",
    orderDuplicated:"Order duplicated",
    workCompletedSub:"Work is completed",
    createInvoiceForOrder:"Create invoice for this order",
    cannotUndone:"This cannot be undone",
    orderIdLabel:"Order ID",
    dueDateLabel:"Due date",
    descriptionLabel:"Description",
    pieceLabel:"Piece",
    unitsLabel:"Units",
    descPiecePlaceholder:"Describe the work to be done\u2026",
    itemsForInvoice:"Items for invoice",
    addItemBtn:"+ Add item",
    saveChangesBtn:"Save changes",
    itemsLabel:"Items",
    editLabel:"Edit",
    invoiceNotFound:"Invoice not found",
    invoiceDeleted:"Invoice deleted",
    clientDeleted:"Client deleted",
    clientFieldLabel:"Client *",
    workDescLabel:"Work description",
    receivedDateLabel:"Received date",
    deliveryDateLabel:"Delivery date",
    addNewClientLink:"+ Add new client",
    selectClientOption:"\u2014 Select client \u2014",
    createClientBtn:"Create client \u2192",
    addFromOrder:"+ Add items from another order\u2026",
    deleteOrderBtn:"Delete order",
    saveOrderBtn:"Save order",
    ordersHeader:"Orders",
    newClientHeader:"New client",
    receivedLabel:"Received",
    completedLabel:"Completed",
    invoicedLabel:"Invoiced",
    ordersSection:"Orders",
    invoiceSheetSubtitle:"This will create an invoice with these details",
    confirmCreateInvoiceBtn:"Confirm and create invoice",
    yesDeleteOrder:"Yes, delete order",
    orderDeletedToast:"Order deleted",
    deleteOrderWarning:"This cannot be undone. All information for order #",
    deleteOrderWarning2:"will be permanently deleted.",
    deleteBtn:"Delete",
  },
  de: {
    tabHome:"Start", tabScan:"Statistik", tabOrders:"Auftr\u00e4ge", tabClients:"Kunden", tabInvoice:"Rechnung",
    statsTitle:"Statistiken", statsOrders:"Auftr\u00e4ge", statsRevenue:"Einnahmen", statsUnits:"Einheiten", statsClients:"Aktive Kunden", statsTrend:"Monatliche Entwicklung",
    signInTo:"Bitte anmelden", emailLabel:"E-Mail", passwordLabel:"Passwort", signingIn:"Anmelden\u2026", signInBtn:"Anmelden",
    profileLanguage:"Sprache", profileChangePw:"Passwort \u00e4ndern", profileSignOut:"Abmelden",
    changePwTitle:"Passwort \u00e4ndern", newPasswordLabel:"Neues Passwort", confirmPwLabel:"Passwort best\u00e4tigen",
    pwMinChars:"Mindestens 6 Zeichen", repeatPw:"Neues Passwort wiederholen",
    pwUpdated:"Passwort aktualisiert", enterNewPw:"Bitte ein neues Passwort eingeben.", pwNoMatch:"Passw\u00f6rter stimmen nicht \u00fcberein.", pwMin6:"Mindestens 6 Zeichen.",
    savingLabel:"Speichern\u2026", updatePwBtn:"Passwort aktualisieren",
    goodMorning:"Guten Morgen", goodAfternoon:"Guten Tag", goodEvening:"Guten Abend",
    newOrderBtn:"Neuer Auftrag", createWorkOrderSub:"Arbeitsauftrag erstellen",
    needsAttention:"Dringend",
    statusReceived:"Ausstehend", statusInprogress:"In Bearbeitung", statusDone:"Abgeschlossen", statusInvoiced:"Verrechnet",
    allFilter:"Alle", allClients:"Alle Kunden",
    overdueLabel:"\u00dcberf\u00e4llig", todayLabel:"Heute", tomorrowLabel:"Morgen", dueLabel:"F\u00e4llig", noDueDateLabel:"Kein Datum",
    workOrderBtn:"Arbeitsauftrag", createInvoiceBtn:"Rechnung erstellen", printInvoiceBtn:"Rechnung drucken",
    swipeHint:"\u2190 Wischen = Fertig \u00a0\u00b7\u00a0 \u2192 Wischen = L\u00f6schen",
    selectBtn:"Ausw\u00e4hlen", cancelBtn:"Abbrechen",
    newOrderTitle:"Neuer Auftrag", editOrderTitle:"Auftrag bearbeiten",
    chooseClientSection:"Kunden w\u00e4hlen", chooseClientSub:"F\u00fcr wen ist dieser Auftrag? Bestehenden Kunden w\u00e4hlen oder neu anlegen.",
    addPiecesSection:"St\u00fccke hinzuf\u00fcgen", addPiecesSub:"Jedes St\u00fcck beschreiben. Menge im Mengenfeld angeben. Beliebig viele hinzuf\u00fcgen.",
    setDeadlineSection:"Lieferfrist festlegen", setDeadlineSub:"Wann muss der Auftrag fertig sein? Besondere Anweisungen k\u00f6nnen hier eingegeben werden.",
    searchClientPlaceholder:"Kunden suchen...", createNewClientBtn:"Neuen Kunden erstellen",
    addAnotherPieceBtn:"Weiteres St\u00fcck hinzuf\u00fcgen",
    addPhotoBtn:"Foto dieses St\u00fcks hinzuf\u00fcgen",
    week1:"1 Woche", weeks2:"2 Wochen", month1:"1 Monat",
    selectClientFirst:"Zuerst Kunden ausw\u00e4hlen",
    specialInstructionsPlaceholder:"Besondere Anweisungen, Kundenreferenz, gew\u00fcnschte Oberfl\u00e4che\u2026",
    descPlaceholder:"Was soll gemacht werden? Mit einer Zahl f\u00fcr die Menge beginnen, z.B. 3 Ringe polieren",
    markCompletedBtn:"Als abgeschlossen markieren", printBtn:"Drucken",
    totalLabel:"Gesamt",
    readyToInvoice:"Bereit zur Verrechnung", invoiceCreatedLabel:"Rechnung erstellt",
    receivedStep:"Erhalten", inProgressStep:"In Bearbeitung", completedStep:"Abgeschlossen", invoicedStep:"Verrechnet",
    pendingStatus:"Ausstehend", inReviewStatus:"In Bearbeitung",
    invoicesTitle:"Rechnungen", noInvoicesYet:"Noch keine Rechnungen",
    noInvoicesDesc:"Aus Auftr\u00e4gen erstellte Rechnungen erscheinen hier.\nSie k\u00f6nnen auch manuell eine erstellen.",
    unprintedFilter:"Nicht gedruckt", printedFilter:"Gedruckt",
    postageLabel:"Porto", postageNotAdded:"Porto nicht hinzugef\u00fcgt", postageScrollUp:"Bitte nach oben scrollen und Porto eintragen.",
    postageHint:"Porto nicht vergessen",
    saveInvoiceBtn:"Rechnung speichern", saveAndPrintBtn:"Speichern & drucken",
    invoiceSaved:"Rechnung gespeichert",
    clientsTitle:"Kunden", newClientTitle:"Neuer Kunde", noClientsYet:"Noch keine Kunden",
    nameLabel:"Name", companyLabel:"Firma", addressLabel:"Adresse", phoneLabel:"Telefon",
    saveClientBtn:"Kunden speichern", clientSaved:"Kunde gespeichert",
    orderSaved:"Auftrag gespeichert", orderUpdated:"Auftrag aktualisiert",
    deleteOrderConfirm:"Auftrag l\u00f6schen",
    areYouSure:"Sind Sie sicher?",
    donePromptBtn:"Best\u00e4tigen \u2014 Auftrag abgeschlossen",
    noOrdersYet:"Noch keine Auftr\u00e4ge",
    noOrdersDesc:"Ihre Auftr\u00e4ge erscheinen hier.",
    todaysOrders:"Heutige Auftr\u00e4ge",
    noOrdersForDay:"Keine Auftr\u00e4ge f\u00fcr diesen Tag",
    noPendingOrders:"Keine ausstehenden Auftr\u00e4ge",
    viewAllOrders:"Alle Auftr\u00e4ge anzeigen \u2192",
    noDate:"Kein Datum",
    scanTitle:"Lieferschein scannen",
    takePhoto:"Foto aufnehmen",
    cameraDesc:"Kamera auf den Lieferschein im Karton richten. Die KI liest alles automatisch.",
    openCamera:"Kamera \u00f6ffnen",
    chooseGallery:"Aus Galerie w\u00e4hlen",
    tipsTitle:"Tipps f\u00fcr beste Ergebnisse",
    analyzeBtn:"Mit KI analysieren",
    retakePhoto:"\u21a9 Foto wiederholen",
    aiReadThis:"KI hat erkannt",
    confirmDetailsTitle:"Details best\u00e4tigen",
    createOrderBtn:"Auftrag erstellen",
    orderCreatedTitle:"Auftrag erstellt!",
    orderCreatedDesc:"Er ist jetzt in der Auftragsliste.",
    goToOrders:"Zu Auftr\u00e4gen \u2192",
    scanAnother:"Weiteren scannen",
    subtotalLabel:"Zwischensumme",
    savedStatus:"Gespeichert",
    newBtn:"+ Neu",
    noInvoicesMatch:"Keine Rechnungen f\u00fcr diesen Filter",
    editClientTitle:"Kunde bearbeiten",
    noClientsDesc:"F\u00fcgen Sie Kunden hinzu, um sie automatisch Auftr\u00e4gen und Rechnungen zuzuordnen.",
    addClientBtn:"+ Kunde hinzuf\u00fcgen",
    noOrdersForClient:"Noch keine Auftr\u00e4ge f\u00fcr diesen Kunden.",
    newOrderForClient:"+ Neuer Auftrag f\u00fcr diesen Kunden",
    addOrderForDay:"Auftrag f\u00fcr diesen Tag hinzuf\u00fcgen",
    notesLabel:"Notizen",
    activeAlert:"Aktiver Alarm",
    notePlaceholder:"Notiz f\u00fcr diesen Tag schreiben\u2026",
    alertInfo:"Beim \u00d6ffnen der App an diesem Tag wird ein Alarm angezeigt.",
    noteForToday:"Notiz f\u00fcr heute",
    gotItBtn:"Verstanden",
    orderCompletedTitle:"Auftrag abgeschlossen!",
    createInvoicePrompt:"M\u00f6chten Sie jetzt eine Rechnung f\u00fcr diesen Auftrag erstellen?",
    notNowBtn:"Nicht jetzt",
    yesCreateInvoice:"Ja, Rechnung erstellen",
    markedAsDone:"Als erledigt markiert",
    editOrderMenu:"Auftrag bearbeiten",
    editOrderSub:"Details, Artikel oder Datum aktualisieren",
    duplicateOrderMenu:"Auftrag duplizieren",
    duplicateOrderSub:"Kopie mit neuer ID erstellen",
    orderDuplicated:"Auftrag dupliziert",
    workCompletedSub:"Arbeit ist abgeschlossen",
    createInvoiceForOrder:"Rechnung f\u00fcr diesen Auftrag erstellen",
    cannotUndone:"Dies kann nicht r\u00fckg\u00e4ngig gemacht werden",
    orderIdLabel:"Auftrags-ID",
    dueDateLabel:"F\u00e4lligkeitsdatum",
    descriptionLabel:"Beschreibung",
    pieceLabel:"St\u00fcck",
    unitsLabel:"Einheiten",
    descPiecePlaceholder:"Zu erledigende Arbeit beschreiben\u2026",
    itemsForInvoice:"Artikel f\u00fcr Rechnung",
    addItemBtn:"+ Artikel hinzuf\u00fcgen",
    saveChangesBtn:"\u00c4nderungen speichern",
    itemsLabel:"Artikel",
    editLabel:"Bearbeiten",
    invoiceNotFound:"Rechnung nicht gefunden",
    invoiceDeleted:"Rechnung gel\u00f6scht",
    clientDeleted:"Kunde gel\u00f6scht",
    clientFieldLabel:"Kunde *",
    workDescLabel:"Arbeitsbeschreibung",
    receivedDateLabel:"Eingangsdatum",
    deliveryDateLabel:"Lieferdatum",
    addNewClientLink:"+ Neuen Kunden hinzuf\u00fcgen",
    selectClientOption:"\u2014 Kunden ausw\u00e4hlen \u2014",
    createClientBtn:"Kunden erstellen \u2192",
    addFromOrder:"+ Artikel aus einem anderen Auftrag hinzuf\u00fcgen\u2026",
    deleteOrderBtn:"Auftrag l\u00f6schen",
    saveOrderBtn:"Auftrag speichern",
    ordersHeader:"Auftr\u00e4ge",
    newClientHeader:"Neuer Kunde",
    receivedLabel:"Erhalten",
    completedLabel:"Abgeschlossen",
    invoicedLabel:"Verrechnet",
    ordersSection:"Auftr\u00e4ge",
    invoiceSheetSubtitle:"Damit wird eine Rechnung mit diesen Details erstellt",
    confirmCreateInvoiceBtn:"Best\u00e4tigen und Rechnung erstellen",
    yesDeleteOrder:"Ja, Auftrag l\u00f6schen",
    orderDeletedToast:"Auftrag gel\u00f6scht",
    deleteOrderWarning:"Dies kann nicht r\u00fckg\u00e4ngig gemacht werden. Alle Informationen zu Auftrag #",
    deleteOrderWarning2:"werden dauerhaft gel\u00f6scht.",
    deleteBtn:"L\u00f6schen",
  }
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
const genOrderNumber = (orders, clientName) => {
  const clientOrders = (orders||[]).filter(o => o.client === clientName);
  const nums = clientOrders.map(o=>parseInt(o.orderNumber)||0).filter(n=>n>0);
  return String(nums.length ? Math.max(...nums)+1 : 1);
};
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
// Swiss rounding: round final invoice total to nearest 0.05 CHF (Rappenrundung)
const roundCHF = n => Math.round(n * 20) / 20;
// Invoice number format: R{clientSeq}{year}  e.g. R12026, R22026
// Each client has their own sequential count
const genClientInvNumber = (invoices, clientName) => {
  const year = new Date().getFullYear();
  const clientInvs = (invoices || []).filter(i => i.client === clientName);
  const seq = clientInvs.length + 1;
  return `R${seq}${year}`;
};

// ─── ICONS ──────────────────────────────────────────────
const Icon = ({ name, size=22, color="#1B3F45" }) => {
  const s = { width:size, height:size, display:"block", flexShrink:0 };
  const icons = {
    scan: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 12h10M12 7v10"/><rect x="7" y="7" width="4" height="4" rx="1"/><rect x="13" y="13" width="4" height="4" rx="1"/></svg>,
    chart: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
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
    copy:        <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
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
    <span style={{ background: badge.bg, color: badge.color, border:`1px solid ${badge.border}`, borderRadius:20, padding:"4px 12px", fontSize:11, fontWeight:700, fontFamily:"'IBM Plex Sans', sans-serif", letterSpacing:"0.03em", whiteSpace:"nowrap" }}>
      {st.label}
    </span>
  );
};

const Field = ({ label, children }) => (
  <div style={{ marginBottom:16 }}>
    <div style={{ fontSize:13, fontWeight:700, color:"#5A7A80", letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:6, fontFamily:"'IBM Plex Sans', sans-serif" }}>{label}</div>
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
    style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, maxWidth:"100%", ...style }}
  >
    {children}
  </Button>
);

// eslint-disable-next-line no-unused-vars
const BtnGhost = ({ children, onClick, disabled, style={} }) => (
  <Button
    kind="ghost"
    onClick={onClick}
    disabled={disabled}
    style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, maxWidth:"100%", ...style }}
  >
    {children}
  </Button>
);

// Stone Art card — 16px radius, generous padding, subtle shadow
const Card = ({ children, onClick, style={} }) => (
  <div onClick={onClick} style={{ background:"#ffffff", padding:"22px 24px", marginBottom:16, border:"0.5px solid #E8E4DC", borderRadius:18, boxShadow:"0 2px 10px rgba(27,63,69,0.08)", cursor: onClick ? "pointer" : "default", ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontSize:13, fontWeight:700, color:"#5A7A80", letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:12, fontFamily:"'IBM Plex Sans', sans-serif" }}>
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
  const [driveConnected, setDriveConnected] = useState(isDriveConnected);
  const [driveLoading, setDriveLoading] = useState(false);
  const [statsMonth, setStatsMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [statsClientFilter, setStatsClientFilter] = useState("all");
  const [statsStatusFilter, setStatsStatusFilter] = useState("all");
  const [statsMetric, setStatsMetric] = useState("revenue"); // "orders"|"revenue"|"units"|"clients"
  const [invPorto, setInvPorto] = useState("");
  const [filterInvStatus, setFilterInvStatus] = useState("all"); // "all" | "printed" | "unprinted"
  const [filterInvClient, setFilterInvClient] = useState("all");
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
  const [photoStep, setPhotoStep] = useState("capture"); // eslint-disable-line no-unused-vars
  const [imgData, setImgData]   = useState(null); // eslint-disable-line no-unused-vars
  const [aiLoading, setAiLoading] = useState(false); // eslint-disable-line no-unused-vars
  const [aiMsg, setAiMsg]       = useState(""); // eslint-disable-line no-unused-vars
  const [aiError, setAiError]   = useState(""); // eslint-disable-line no-unused-vars
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
  const fileRef = useRef(); // eslint-disable-line no-unused-vars
  const draftPhotoRef = useRef();
  const calStripRef = useRef();
  const piecePhotoRef = useRef();
  const TODAY = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [dayNotes, setDayNotes] = useState(() => { try { return JSON.parse(localStorage.getItem("ssp_day_notes")) || {}; } catch { return {}; } });
  const [noteAlert, setNoteAlert] = useState(null); // { date, text } to show on load
  const [dayModal, setDayModal]   = useState(null); // date string or null

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isTablet,  setIsTablet]  = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  useEffect(() => {
    const onResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── AUTH ──
  const [authUser, setAuthUser]       = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authEmail, setAuthEmail]     = useState("");
  const [authPw, setAuthPw]           = useState("");
  const [authError, setAuthError]     = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [lang, setLang]               = useState(() => localStorage.getItem("ssp_lang") || "en");
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [newPw, setNewPw]             = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [pwError, setPwError]         = useState("");
  const [pwLoading, setPwLoading]     = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── AUTO-RECONNECT GOOGLE DRIVE on app load (silent, no popup) ──
  useEffect(() => {
    if (localStorage.getItem("ssp_drive_connected")) {
      silentReconnect()
        .then(() => setDriveConnected(true))
        .catch(() => {}); // fails silently — user reconnects manually if needed
    }
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
  // eslint-disable-next-line no-unused-vars
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

  // eslint-disable-next-line no-unused-vars
  const confirmOrder = () => {
    const order = { ...newOrder(), client:extracted.client||"", field1:extracted.field1||"", field2:extracted.field2||"", pieces:extracted.pieces||"", description:extracted.notes||"", notes:extracted.notes||"", photo: imgData||null };
    setOrders([order, ...orders]);
    syncToSheets(order);
    setPhotoStep("done");
  };

  const resetPhoto = () => { setPhotoStep("capture"); setImgData(null); setExtracted(null); setAiError(""); };

  // eslint-disable-next-line no-unused-vars
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
      ? (o.lineItems).map(li=>({ id:Date.now()+Math.random(), desc:li.desc||"", qty:li.qty||"1", unitPrice:li.unitPrice||"", price:String(lineTotal(li)), orderRef:o.id }))
      : [{ id:Date.now()+Math.random(), desc: o.description||`Order #${o.id}`, qty:"1", unitPrice:String(o.amount||""), price:String(o.amount||""), orderRef:o.id }];
    setItems(invoiceItems);
    setInvNumber(genClientInvNumber(invoices, o.client));
    setTab("invoice");
    setInvView("new");
  };

  // ── BUILD INVOICE HTML (reused by print and Drive upload) ──
  const buildInvoiceHtml = (inv, withPrintScript = false) => {
    const fmtCHF = n => `CHF ${Number(n).toFixed(2).replace(".", ",")}`;
    const sub    = inv.items.reduce((s,it) => s + lineTotal(it), 0);
    const porto  = parseFloat(inv.porto) || 0;
    const mwst   = sub * C.taxRate;
    const total  = roundCHF(sub + porto + mwst);
    const rowsHtml = inv.items.map(it => {
      const qty  = parseFloat(it.qty)||1;
      const unit = parseFloat(it.unitPrice)||parseFloat(it.price)||0;
      const tot  = qty * unit;
      return `<tr><td>${it.desc || "—"}</td><td class="right">${qty}</td><td class="right">${fmtCHF(unit)}</td><td class="right">${fmtCHF(tot)}</td></tr>`;
    }).join("");

    // Build recipient block — avoid repeating client name if address already starts with it
    const addrLines = (inv.clientAddress || "").split("\n").map(l=>l.trim()).filter(Boolean);
    const addrWithoutName = addrLines.length && addrLines[0].toLowerCase() === (inv.client||"").trim().toLowerCase()
      ? addrLines.slice(1)
      : addrLines;
    const addrHtml = addrWithoutName.join("<br>");

    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<meta name="format-detection" content="telephone=no,address=no,email=no">
<title>Rechnung ${inv.number}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  a { color:inherit !important; text-decoration:none !important; pointer-events:none !important; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #222; }
  .page { width: 100%; max-width: 176mm; margin: 0 auto; padding: 0; }
  .logo { margin-bottom: 14px; }
  .address { font-size:8.5pt; color:#555; margin-bottom:18px; line-height:1.6; }
  .rechnung-title { font-size:17pt; font-weight:bold; letter-spacing:3px; color:#8E8E93; border:2.5px solid #C7C7CC; display:inline-block; padding:3px 10px; margin-bottom:4px; text-transform:uppercase; }
  .datum { font-size:9.5pt; font-weight:bold; margin-bottom:0; }
  .recipient-block { float:right; text-align:left; font-size:9.5pt; line-height:1.7; margin-top:-64px; margin-bottom:20px; min-width:180px; }
  .clearfix::after { content:""; display:table; clear:both; }
  table { width:100%; border-collapse:collapse; margin-top:20px; margin-bottom:0; }
  thead tr { background:#e8edf2; color:#1a1a1a; }
  thead th { padding:5px 8px; font-size:9pt; text-align:left; }
  thead th.right { text-align:right; }
  tbody tr td { padding:5px 8px; border-bottom:1px solid #e8e8e8; font-size:9.5pt; }
  tbody tr td.right { text-align:right; }
  .totals td { padding:3px 8px; font-size:9.5pt; }
  .totals td.right { text-align:right; }
  .totals .total-row td { font-weight:bold; font-size:11pt; border-top:1.5px solid #222; padding-top:6px; }
  .total-row td.big { font-size:12pt; text-decoration:underline; }
  .bank-section { margin-top:16px; display:flex; align-items:flex-start; gap:16px; }
  .footer { font-size:8.5pt; line-height:1.7; color:#444; }
  .footer strong { color:#111; }
  .thanks { margin-top:14px; font-size:9pt; }
  .back-btn { position:fixed; top:14px; right:14px; z-index:9999; }
  .back-btn button { background:#1B3F45; color:white; border:none; border-radius:10px; padding:10px 18px; font-size:13pt; font-weight:700; cursor:pointer; font-family:Arial,sans-serif; }
  @media print {
    @page { size: letter portrait; margin: 14mm 18mm; }
    html, body { margin:0; padding:0; }
    .page { max-width:100%; }
    .back-btn { display:none; }
  }
</style></head>
<body>
<div class="back-btn"><button onclick="window.close()">← Back to app</button></div>
<div class="page">
  <div class="logo">
    <img src="${window.location.origin}/logo.png" alt="${C.businessName}" style="height:70px;object-fit:contain;">
  </div>
  <div class="address">${C.address.replace(/\n/g,"<br>")}<br>Telefon ${C.phone}</div>
  <div class="clearfix">
    <div>
      <div class="rechnung-title">RECHNUNG</div><br>
      <div class="datum">DATUM: ${new Date(inv.date+"T12:00:00").toLocaleDateString("de-CH")}</div>
    </div>
    <div class="recipient-block">
      <strong>${inv.client||""}</strong>${addrHtml ? "<br>"+addrHtml : ""}<br>
      <span style="color:#555;">${inv.number}</span>
    </div>
  </div>
  <table>
    <thead><tr><th style="width:50%">BESCHREIBUNG</th><th class="right" style="width:10%">ANZ.</th><th class="right" style="width:20%">STÜCKPREIS</th><th class="right" style="width:20%">BETRAG</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <table class="totals" style="margin-top:0;">
    <tbody>
      <tr class="total-row" style="border-bottom:1px solid #E8E4DC;"><td class="right"><strong>Subtotal</strong></td><td class="right big">CHF ${Number(sub).toFixed(2).replace(".",",")}</td></tr>
      ${porto > 0 ? `<tr><td class="right" style="color:#555;">Porto</td><td class="right">${fmtCHF(porto)}</td></tr>` : ""}
      <tr><td class="right" style="color:#555;">${(C.taxRate*100).toFixed(1).replace(".",",")}% ${C.taxLabel}</td><td class="right">${fmtCHF(mwst)}</td></tr>
      <tr class="total-row"><td class="right"><strong>RECHNUNGSBETRAG</strong></td><td class="right big">CHF ${Number(total).toFixed(2).replace(".",",")}</td></tr>
    </tbody>
  </table>
  <div class="bank-section">
    <img src="${window.location.origin}/qr.png" alt="QR Zahlung" style="width:90px;height:90px;object-fit:contain;flex-shrink:0;">
    <div class="footer">
      Zahlungsempfänger: <strong>${C.businessName}</strong><br>
      <span style="font-family:monospace;font-size:8.5pt;">${C.bankDetails}</span><br>
      ${C.paymentTerms}<br>
      MWST-Nr. ${C.vatId}
    </div>
  </div>
  <div class="thanks">
    Danke für Ihren geschätzten Auftrag.<br><br>
    Freundliche Grüsse<br><br>
    ${C.ownerName}
  </div>
</div>
  ${withPrintScript ? ["<script>window.onload=()=>{ window.print(); }</","script>"].join("") : ""}
</body></html>`;
    return html;
  };

  const printInvoiceDoc = (inv, autoprint = true) => {
    const html = buildInvoiceHtml(inv, autoprint);
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  const uploadInvoiceToDrive = async (inv) => {
    try {
      const html = buildInvoiceHtml(inv, false);
      await saveInvoiceToDrive(inv, html);
      showToast("Saved to Google Drive ✓", "#198038");
    } catch (err) {
      if (err.message === "TOKEN_EXPIRED") {
        setDriveConnected(false);
        showToast("Drive session expired — reconnect in settings", "#C9933A");
      } else {
        console.error("[Drive]", err);
      }
    }
  };

  const [driveSyncing, setDriveSyncing] = useState(false);

  const syncAllToDrive = async () => {
    if (!isDriveConnected() || driveSyncing) return;
    setDriveSyncing(true);
    setProfileOpen(false);
    let done = 0;
    let failed = 0;
    for (const inv of invoices) {
      try {
        const html = buildInvoiceHtml(inv, false);
        await saveInvoiceToDrive(inv, html);
        done++;
      } catch (err) {
        if (err.message === "TOKEN_EXPIRED") {
          setDriveConnected(false);
          showToast("Drive session expired — reconnect in settings", "#C9933A");
          setDriveSyncing(false);
          return;
        }
        failed++;
      }
    }
    setDriveSyncing(false);
    if (failed === 0) {
      showToast(`${done} invoice${done !== 1 ? "s" : ""} synced to Drive ✓`, "#198038");
    } else {
      showToast(`${done} synced, ${failed} failed`, "#C9933A");
    }
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
  const greeting = hour < 12 ? "goodMorning" : hour < 18 ? "goodAfternoon" : "goodEvening";

  const t = key => TRANS[lang]?.[key] ?? TRANS.en[key] ?? key;

  // ── RESPONSIVE HELPERS ──
  const SHEET_MAX = isTablet ? 640 : 500;   // bottom sheet / fixed bar max-width
  const WRAP_MAX  = isDesktop ? "calc(100vw - 240px)" : isTablet ? 720 : 500;

  // ── AUTH HELPERS ──
  const signIn = async () => {
    setAuthLoading(true); setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPw });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  };

  const signOut = async () => {
    setProfileOpen(false);
    await supabase.auth.signOut();
  };

  const changePassword = async () => {
    if (!newPw) { setPwError(t("enterNewPw")); return; }
    if (newPw !== newPwConfirm) { setPwError(t("pwNoMatch")); return; }
    if (newPw.length < 6) { setPwError(t("pwMin6")); return; }
    setPwLoading(true); setPwError("");
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { setPwError(error.message); setPwLoading(false); return; }
    setChangePwOpen(false); setNewPw(""); setNewPwConfirm("");
    setPwLoading(false);
    showToast(t("pwUpdated"));
  };

  // ── LOADING / LOGIN SCREENS ──
  if (!authChecked) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#F7F5F0" }}>
      <div style={{ width:36, height:36, border:"3px solid #1B3F45", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
    </div>
  );

  if (!authUser) return (
    <div style={{ fontFamily:"'IBM Plex Sans', sans-serif", minHeight:"100vh", background:"#1B3F45", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
      <div style={{ width:"100%", maxWidth:360, background:"white", borderRadius:24, padding:"36px 28px", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
        <img src="/logo.png" alt={C.businessName} style={{ height:52, objectFit:"contain", display:"block", marginBottom:8 }} onError={e=>e.target.style.display="none"}/>
        <div style={{ fontSize:22, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.02em", marginBottom:4 }}>{C.businessName}</div>
        <div style={{ fontSize:13, color:"#5A7A80", marginBottom:28 }}>{TRANS[localStorage.getItem("ssp_lang")||"en"]?.signInTo ?? TRANS.en.signInTo}</div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:6 }}>{TRANS[localStorage.getItem("ssp_lang")||"en"]?.emailLabel ?? TRANS.en.emailLabel}</div>
          <input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&signIn()}
            placeholder="email@example.com"
            style={{ width:"100%", padding:"13px 14px", border:"1.5px solid #E8E4DC", borderRadius:12, fontSize:15, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif", outline:"none", boxSizing:"border-box" }}/>
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:6 }}>{TRANS[localStorage.getItem("ssp_lang")||"en"]?.passwordLabel ?? TRANS.en.passwordLabel}</div>
          <input type="password" value={authPw} onChange={e=>setAuthPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&signIn()}
            placeholder="••••••••"
            style={{ width:"100%", padding:"13px 14px", border:"1.5px solid #E8E4DC", borderRadius:12, fontSize:15, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif", outline:"none", boxSizing:"border-box" }}/>
        </div>
        {authError && <div style={{ fontSize:13, color:"#da1e28", marginBottom:14, background:"#FFF0F0", border:"1px solid #F7C1C1", borderRadius:10, padding:"10px 12px" }}>{authError}</div>}
        <button onClick={signIn} disabled={authLoading}
          style={{ width:"100%", padding:"15px", background: authLoading?"#E8E4DC":"#1B3F45", color:"white", border:"none", borderRadius:12, fontSize:15, fontWeight:700, cursor: authLoading?"default":"pointer", fontFamily:"'IBM Plex Sans', sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {authLoading ? <><div style={{ width:16, height:16, border:"2px solid white", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>{TRANS[localStorage.getItem("ssp_lang")||"en"]?.signingIn ?? TRANS.en.signingIn}</> : (TRANS[localStorage.getItem("ssp_lang")||"en"]?.signInBtn ?? TRANS.en.signInBtn)}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'IBM Plex Sans', sans-serif", background:"#F7F5F0", minHeight:"100vh" }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        html, body { overflow-x: hidden; width: 100%; }
        input, select, textarea { font-size: 16px !important; font-family: 'IBM Plex Sans', sans-serif !important; }
        select:focus { outline: 2px solid ${ACCENT} !important; outline-offset: 0px; background: #ffffff !important; }
        ::-webkit-scrollbar { display: none; }
        scrollbar-width: none;
        .safe-top { padding-top: max(56px, env(safe-area-inset-top, 56px)); }
        .safe-bottom { padding-bottom: max(100px, calc(72px + env(safe-area-inset-bottom, 0px))); }
        /* Prevent any child from breaking out horizontally */
        .ssp-tab { max-width: 100vw; overflow-x: hidden; }
        /* Pill filter rows always scroll smoothly */
        .pills-row { display:flex; gap:6px; overflow-x:auto; padding-bottom:2px; -webkit-overflow-scrolling:touch; flex-wrap:nowrap; }
        .pills-row::-webkit-scrollbar { display:none; }
        /* Responsive table inside invoice preview */
        @media (max-width: 400px) {
          .inv-table col:nth-child(3) { width:0; display:none; }
          .inv-table .hide-xs { display:none; }
          .inv-table col:nth-child(2) { width:12%; }
          .inv-table col:nth-child(1) { width:62%; }
          .inv-table col:nth-child(4) { width:26%; }
        }
        @media (max-width: 375px) {
          .two-col { grid-template-columns: 1fr !important; }
          .filter-row { flex-wrap: wrap; }
          .ssp-card-pad { padding: 14px 12px !important; }
          .ssp-h1 { font-size: 22px !important; }
        }
        @media (max-width: 320px) {
          .ssp-h1 { font-size: 20px !important; }
        }
        /* ── Carbon Button: center text ── */
        .cds--btn { justify-content: center !important; text-align: center !important; }
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
            { key:"home",    icon:"orders",  label:t("tabHome")    },
            { key:"scan",    icon:"chart",   label:t("tabScan")    },
            { key:"orders",  icon:"gem",     label:t("tabOrders")  },
            { key:"clients", icon:"person",  label:t("tabClients") },
            { key:"invoice", icon:"invoice", label:t("tabInvoice") },
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
      <div style={ isDesktop ? { marginLeft:240, minHeight:"100vh", maxWidth:"calc(100vw - 240px)" } : { maxWidth:WRAP_MAX, margin:"0 auto", width:"100%" } }>

      {/* ── HOME TAB ── */}
      {tab==="home" && (
        <div style={{ animation:"fadeUp 0.3s ease" }}>

          {/* ── S1: HEADER ── */}
          <div style={{ padding: isDesktop ? "36px 40px 20px" : isTablet ? "max(32px, env(safe-area-inset-top, 32px)) 32px 18px" : "max(56px, env(safe-area-inset-top, 56px)) 22px 18px", background:"white" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:13, color:"#5A7A80", fontWeight:500 }}>{greeting},</div>
                <div style={{ fontSize:36, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.03em", lineHeight:1.05 }}>{C.ownerName.split(" ")[0]}</div>
                <div style={{ fontSize:13, color:"#5A7A80", fontWeight:500, marginTop:5 }}>
                  {orders.filter(o=>o.status!=="done"&&o.status!=="invoiced").length} active order{orders.filter(o=>o.status!=="done"&&o.status!=="invoiced").length!==1?"s":""}
                </div>
              </div>
              {/* Avatar */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:4, position:"relative" }}>
                <button onClick={()=>setProfileOpen(p=>!p)}
                  style={{ width:40, height:40, borderRadius:12, background:"#1B3F45", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:"white", fontFamily:"'IBM Plex Sans', sans-serif" }}>{C.ownerName.split(" ").map(n=>n[0]).join("").slice(0,2)}</span>
                </button>

                {/* Profile dropdown */}
                {profileOpen && (
                  <>
                    <div onClick={()=>setProfileOpen(false)} style={{ position:"fixed", inset:0, zIndex:400 }}/>
                    <div style={{ position:"absolute", top:48, right:0, width:260, background:"white", borderRadius:16, boxShadow:"0 8px 32px rgba(0,0,0,0.16)", border:"1px solid #E8E4DC", zIndex:401, overflow:"auto", maxHeight:"calc(100vh - 80px)" }}>
                      {/* User info */}
                      <div style={{ padding:"14px 16px 12px", borderBottom:"0.5px solid #F0EDE8" }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#1B3F45" }}>{C.ownerName}</div>
                        <div style={{ fontSize:11, color:"#9DB5B9", marginTop:2 }}>{authUser?.email}</div>
                      </div>
                      {/* Language */}
                      <div style={{ padding:"10px 16px", borderBottom:"0.5px solid #F0EDE8" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#9DB5B9", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>{t("profileLanguage")}</div>
                        <div style={{ display:"flex", gap:6 }}>
                          {[{code:"en",label:"English"},{code:"de",label:"Deutsch"}].map(l=>(
                            <button key={l.code} onClick={()=>{ setLang(l.code); localStorage.setItem("ssp_lang",l.code); }}
                              style={{ flex:1, padding:"7px 0", borderRadius:8, border: lang===l.code?"2px solid #1B3F45":"1.5px solid #E8E4DC", background: lang===l.code?"#1B3F45":"white", color: lang===l.code?"white":"#5A7A80", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'IBM Plex Sans', sans-serif" }}>
                              {l.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Google Drive */}
                      <div style={{ padding:"10px 16px", borderBottom:"0.5px solid #F0EDE8" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#9DB5B9", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Google Drive</div>
                        {driveConnected ? (
                          <div>
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <div style={{ width:8, height:8, borderRadius:"50%", background:"#24a148" }}/>
                                <span style={{ fontSize:13, color:"#1B3F45", fontWeight:600 }}>{lang==="de"?"Verbunden":"Connected"}</span>
                              </div>
                              <button onClick={()=>{ disconnectDrive(); setDriveConnected(false); showToast(lang==="de"?"Drive getrennt":"Drive disconnected","#5A7A80"); }}
                                style={{ background:"none", border:"1px solid #E8E4DC", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:600, color:"#5A7A80", cursor:"pointer", fontFamily:"'IBM Plex Sans', sans-serif" }}>
                                {lang==="de"?"Trennen":"Disconnect"}
                              </button>
                            </div>
                            <button onClick={syncAllToDrive} disabled={driveSyncing}
                              style={{ width:"100%", padding:"10px", background: driveSyncing?"#F0F6F7":"#1B3F45", border:"none", borderRadius:10, fontSize:13, fontWeight:700, color: driveSyncing?"#9DB5B9":"white", cursor: driveSyncing?"default":"pointer", fontFamily:"'IBM Plex Sans', sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={driveSyncing?"#9DB5B9":"white"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                              {driveSyncing ? (lang==="de"?"Synchronisiere…":"Syncing…") : (lang==="de"?`Alle ${invoices.length} Rechnungen hochladen`:`Upload all ${invoices.length} invoices`)}
                            </button>
                          </div>
                        ) : (
                          <button disabled={driveLoading}
                            onClick={async ()=>{
                              setDriveLoading(true);
                              try {
                                await connectDrive();
                                setDriveConnected(true);
                                showToast(lang==="de"?"Drive verbunden ✓":"Drive connected ✓","#198038");
                              } catch(e) {
                                showToast(lang==="de"?"Verbindung fehlgeschlagen":"Connection failed","#da1e28");
                              } finally { setDriveLoading(false); }
                            }}
                            style={{ width:"100%", padding:"10px", background: driveLoading?"#F0F6F7":"#1B3F45", border:"none", borderRadius:10, fontSize:13, fontWeight:700, color: driveLoading?"#5A7A80":"white", cursor: driveLoading?"default":"pointer", fontFamily:"'IBM Plex Sans', sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill={driveLoading?"#9DB5B9":"#4285F4"}/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill={driveLoading?"#9DB5B9":"#34A853"}/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill={driveLoading?"#9DB5B9":"#FBBC05"}/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill={driveLoading?"#9DB5B9":"#EA4335"}/></svg>
                            {driveLoading ? (lang==="de"?"Verbinde…":"Connecting…") : (lang==="de"?"Mit Google Drive verbinden":"Connect Google Drive")}
                          </button>
                        )}
                        <div style={{ fontSize:11, color:"#9DB5B9", marginTop:6, lineHeight:1.4 }}>
                          {lang==="de"?"Rechnungen werden beim Erstellen automatisch in Drive gespeichert.":"Invoices are automatically saved to Drive when created."}
                        </div>
                      </div>
                      {/* Change password */}
                      <button onClick={()=>{ setProfileOpen(false); setChangePwOpen(true); }}
                        style={{ width:"100%", padding:"13px 16px", background:"none", border:"none", borderBottom:"0.5px solid #F0EDE8", cursor:"pointer", textAlign:"left", fontSize:13, fontWeight:600, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif", display:"flex", alignItems:"center", gap:10 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5A7A80" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        {t("profileChangePw")}
                      </button>
                      {/* Sign out */}
                      <button onClick={signOut}
                        style={{ width:"100%", padding:"13px 16px", background:"none", border:"none", cursor:"pointer", textAlign:"left", fontSize:13, fontWeight:600, color:"#da1e28", fontFamily:"'IBM Plex Sans', sans-serif", display:"flex", alignItems:"center", gap:10 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#da1e28" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                        {t("profileSignOut")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── S2: CTA PRINCIPAL ── */}
          <div style={{ padding: isDesktop ? "0 40px 20px" : isTablet ? "0 32px 18px" : "0 22px 18px", background:"white" }}>
            <button onClick={()=>{ setNewOrderStep(1); setDraft(newOrder()); setClientSearch(""); setTab("orders"); setView("new"); }} style={{ width:"100%", background:PASTELS.orders, border:"none", borderRadius:20, padding:"20px 20px 22px", textAlign:"left", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ width:60, height:60, borderRadius:18, background:"#1B3F45", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon name="gem" size={28} color="white"/>
                </div>
                <div>
                  <div style={{ fontSize:18, fontWeight:600, color:"#1B3F45", letterSpacing:"-0.01em" }}>{t("newOrderBtn")}</div>
                  <div style={{ fontSize:13, color:"#5A7A80", fontWeight:500, marginTop:3 }}>{t("createWorkOrderSub")}</div>
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
              if(/handwritten|scanned|extract/i.test(txt)) return "Scanned order";
              const words = txt.trim().split(/\s+/);
              return words.length <= 4 ? txt : words.slice(0,4).join(" ") + "…";
            };
            return (
              <div style={{ padding: isDesktop ? "0 40px 20px" : isTablet ? "0 32px 18px" : "0 22px 18px" }}>
                <div style={{ border:"2px solid #C9933A", borderRadius:12, overflow:"hidden" }}>
                  {/* Header dorado sólido */}
                  <div style={{ background:"#C9933A", padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:14, fontWeight:500, color:"white" }}>{t("needsAttention")}</span>
                    <div style={{ background:"rgba(255,255,255,0.2)", borderRadius:20, padding:"2px 10px" }}>
                      <span style={{ fontSize:12, fontWeight:700, color:"white" }}>{urgentes.length} {lang==="de"?"dringend":"urgent"}</span>
                    </div>
                  </div>
                  {/* Filas */}
                  {urgentes.map((o, idx) => {
                    const isToday = o.deadline === todayStr;
                    const isOverdue = o.deadline < todayStr;
                    const labelFecha = isOverdue ? t("overdueLabel") : isToday ? t("todayLabel") : t("tomorrowLabel");
                    const desc = trunca4(o.description || [o.field1, o.field2].filter(Boolean).join(" · "));
                    const tipo = o.status === "inprogress" ? t("inReviewStatus") : t("dueLabel");
                    const piezas = o.pieces || "—";
                    return (
                      <button key={o.id} onClick={()=>{ setSelectedId(o.id); setView("detail"); setTab("orders"); }}
                        style={{ width:"100%", background:"white", border:"none", borderTop: idx>0 ? "0.5px solid #E8E4DC" : "none", padding:"14px 16px", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:14 }}>
                        {/* Avatar piezas */}
                        <div style={{ width:36, height:36, borderRadius:10, background:"#FBF5E8", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <span style={{ fontSize:14, fontWeight:900, color:"#C9933A", lineHeight:1 }}>{piezas}</span>
                        </div>
                        {/* Info centro */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:15, fontWeight:800, color:"#1B3F45", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.client || `#${o.id}`}</div>
                          <div style={{ fontSize:12, color:"#5A7A80", marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{desc}</div>
                        </div>
                        {/* Derecha */}
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontSize:13, fontWeight:800, color: isOverdue ? "#da1e28" : "#C9933A", marginBottom:3 }}>{labelFecha}</div>
                          <div style={{ fontSize:11, color:"#5A7A80" }}>{tipo}</div>
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
            const DAYS_ES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; // already English

            const active = orders.filter(o => o.status !== "done" && o.status !== "invoiced");
            const withDeadline = active.filter(o => o.deadline).sort((a,b) => a.deadline.localeCompare(b.deadline));
            const sorted = [...withDeadline, ...active.filter(o => !o.deadline)];

            const ordersForDay = active.filter(o => o.deadline === selectedDate);

            const getUrgency = (deadline) => {
              if(!deadline) return { accent:"transparent", label:null };
              if(deadline < todayStr) return { accent:"#da1e28", label:"Overdue" };
              if(deadline === todayStr) return { accent:"#C9933A", label:"Today" };
              const diff = Math.round((new Date(deadline+"T12:00:00")-new Date(todayStr+"T12:00:00"))/(864e5));
              if(diff === 1) return { accent:"#C9933A", label:"Tomorrow" };
              if(diff <= 7)  return { accent:"#C9933A", label:null };
              return { accent:"transparent", label:null };
            };

            const statusBorderColor = { received:"#C9933A", inprogress:"#1B3F45", done:"#198038", invoiced:"#5A7A80" };

            const d = new Date();
            const dias  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
            const meses = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            const headerDate = `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;

            return (
              <div style={{ padding: isDesktop ? "0 40px max(40px,60px)" : isTablet ? "0 32px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" : "0 16px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>
                {/* ── Contenedor unificado ── */}
                <div style={{ background:"white", borderRadius:12, border:"0.5px solid #E8E4DC", overflow:"hidden" }}>

                  {/* Parte A: Header */}
                  <div style={{ padding:"16px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:17, fontWeight:800, color:"#1B3F45" }}>{t("todaysOrders")}</span>
                    <span style={{ fontSize:13, color:"#5A7A80", fontWeight:500 }}>{headerDate}</span>
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
                    <span style={{ fontSize:13, color:"#5A7A80", fontWeight:500 }}>
                      {ordersForDay.length > 0
                        ? `${ordersForDay.length} ${lang==="de"?(ordersForDay.length===1?"Auftrag":"Aufträge")+" für diesen Tag":(ordersForDay.length===1?"order":"orders")+" for this day"}`
                        : t("noOrdersForDay")}
                    </span>
                  </div>

                  {/* Separador */}
                  <div style={{ height:"0.5px", background:"#E8E4DC" }}/>

                  {/* Cards de órdenes */}
                  {sorted.length === 0 && (
                    <div style={{ padding:"28px 16px", textAlign:"center", color:"#5A7A80", fontSize:14 }}>{t("noPendingOrders")}</div>
                  )}
                  {sorted.map((o, idx) => {
                    const urg = getUrgency(o.deadline);
                    const borderColor = statusBorderColor[o.status] || "#E8E4DC";
                    const rawDesc = o.description || [o.field1, o.field2].filter(Boolean).join(" · ") || null;
                    const descLabel = (() => {
                      if(!rawDesc) return null;
                      if(/handwritten|scanned|extract/i.test(rawDesc)) return "Scanned order";
                      return rawDesc.length > 25 ? rawDesc.slice(0,25) + "…" : rawDesc;
                    })();
                    const fmtDl = o.deadline ? new Date(o.deadline+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"}) : null;
                    return (
                      <button key={o.id} onClick={()=>{ setSelectedId(o.id); setView("detail"); setTab("orders"); }}
                        style={{ width:"100%", background:"white", border:"none", borderTop: idx>0 ? "0.5px solid #E8E4DC" : "none", borderLeft:`4px solid ${borderColor}`, padding:"15px 16px", cursor:"pointer", textAlign:"left", display:"block" }}>
                        {/* Línea 1: cliente + monto */}
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                          <div style={{ fontSize:16, fontWeight:800, color:"#1B3F45", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, marginRight:8 }}>{o.client || `Orden #${o.id}`}</div>
                          {o.amount > 0 && <div style={{ fontSize:15, fontWeight:700, color:"#1B3F45", flexShrink:0 }}>{C.currency} {fmt(o.amount)}</div>}
                        </div>
                        {/* Línea 2: ID mono · Espera: desc truncada */}
                        <div style={{ fontSize:12, color:"#5A7A80", marginBottom:9, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontWeight:600 }}>#{o.id}</span>
                          {descLabel && <span> · {descLabel}</span>}
                        </div>
                        {/* Línea 3: ícono + fecha ←→ badge */}
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            {fmtDl ? (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={urg.accent !== "transparent" ? urg.accent : "#5A7A80"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                                <span style={{ fontSize:12, fontWeight:600, color: urg.accent !== "transparent" ? urg.accent : "#5A7A80", background: urg.accent !== "transparent" ? `${urg.accent}18` : "#F0F6F7", padding:"3px 9px", borderRadius:6 }}>
                                  {urg.label ? `${urg.label} · ` : ""}{fmtDl}
                                </span>
                              </>
                            ) : (
                              <span style={{ fontSize:12, color:"#5A7A80" }}>{t("noDate")}</span>
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
                      <button onClick={()=>setTab("orders")} style={{ width:"100%", padding:"15px 16px", background:"#F7F5F0", border:"none", fontFamily:"'IBM Plex Sans', sans-serif", fontSize:14, fontWeight:700, color:"#1B3F45", cursor:"pointer", textAlign:"center" }}>
                        {t("viewAllOrders")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── STATS TAB ── */}
      {tab==="scan" && (() => {
        // eslint-disable-next-line no-unused-vars
        const prevMonth = () => {
          const [y, m] = statsMonth.split("-").map(Number);
          const d = new Date(y, m - 2, 1);
          setStatsMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
        };
        // eslint-disable-next-line no-unused-vars
        const nextMonth = () => {
          const [y, m] = statsMonth.split("-").map(Number);
          const d = new Date(y, m, 1);
          const now = new Date();
          const maxYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
          const next = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
          if (next <= maxYM) setStatsMonth(next);
        };
        // eslint-disable-next-line no-unused-vars
        const isCurrentMonth = statsMonth === new Date().toISOString().slice(0,7);
        const monthLabel = new Date(statsMonth+"-15").toLocaleDateString(lang==="de"?"de-CH":"en-US",{month:"long",year:"numeric"});

        // ── Apply filters
        const filterOrders = (os) => os.filter(o => {
          const clientMatch = statsClientFilter === "all" || o.clientId === statsClientFilter || o.client === statsClientFilter;
          const statusMatch = statsStatusFilter === "all" || o.status === statsStatusFilter;
          return clientMatch && statusMatch;
        });
        const filterInvoicesForClient = (ivs) => ivs.filter(i =>
          statsClientFilter === "all" || i.client === (clients.find(c=>c.id===statsClientFilter)?.company || clients.find(c=>c.id===statsClientFilter)?.name || statsClientFilter)
        );

        const mAllOrders  = orders.filter(o => (o.received||"").startsWith(statsMonth));
        const mOrders     = filterOrders(mAllOrders);
        const mInvoices   = filterInvoicesForClient(invoices.filter(i => (i.date||"").startsWith(statsMonth)));
        const mRevenue    = mInvoices.reduce((s,i) => s + roundCHF(i.items.reduce((ss,it)=>ss+lineTotal(it),0)*(1+C.taxRate)+(parseFloat(i.porto)||0)), 0);
        const mUnits      = mInvoices.reduce((s,i) => s + i.items.reduce((ss,it) => ss + (parseFloat(it.qty)||0), 0), 0);
        const mClients    = new Set(mOrders.map(o => o.clientId||o.client).filter(Boolean)).size;
        const mOpen       = mOrders.filter(o => o.status!=="done" && o.status!=="invoiced").length;

        // ── 12-month trend
        const months12 = Array.from({length:12}, (_,i) => {
          const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (11-i));
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        });
        const trend = months12.map(ym => {
          const os = filterOrders(orders.filter(o=>(o.received||"").startsWith(ym)));
          const ivs = filterInvoicesForClient(invoices.filter(i=>(i.date||"").startsWith(ym)));
          return {
            ym,
            label: new Date(ym+"-15").toLocaleDateString(lang==="de"?"de-CH":"en-US",{month:"short"}),
            orders: os.length,
            revenue: ivs.reduce((s,i)=>s+roundCHF(i.items.reduce((ss,it)=>ss+lineTotal(it),0)*(1+C.taxRate)+(parseFloat(i.porto)||0)),0),
            units: ivs.reduce((s,i)=>s+i.items.reduce((ss,it)=>ss+(parseFloat(it.qty)||0),0),0),
            clients: new Set(os.map(o=>o.clientId||o.client).filter(Boolean)).size,
          };
        });

        const metricCfg = {
          orders:  { label:t("statsOrders"),  color:"#1B3F45", format: v => String(v) },
          revenue: { label:t("statsRevenue"), color:"#C9933A", format: v => `${C.currency} ${fmt(v)}` },
          units:   { label:t("statsUnits"),   color:"#5A7A80", format: v => String(v) },
          clients: { label:t("statsClients"), color:"#8B5CF6", format: v => String(v) },
        };
        const mc = metricCfg[statsMetric];

        // ── SVG bar chart (full-width, tall)
        const BarChart = ({ data, metricKey, color, formatVal }) => {
          const vals = data.map(d => d[metricKey]);
          const max  = Math.max(...vals, 1);
          const W = 300; const H = 120; const padL = 4; const padR = 4;
          const plotW = W - padL - padR;
          const xOf = i => padL + (i / (data.length - 1)) * plotW;
          const yOf = v => H - (v / max) * H;
          const points = data.map((d, i) => `${xOf(i)},${yOf(vals[i])}`).join(" ");
          return (
            <svg viewBox={`0 0 ${W} ${H + 28}`} style={{ width:"100%", display:"block" }} preserveAspectRatio="none">
              {/* Grid lines */}
              {[0.25, 0.5, 0.75, 1].map(pct => (
                <g key={pct}>
                  <line x1={0} y1={H - pct*H} x2={W} y2={H - pct*H} stroke="#F0EDE8" strokeWidth="0.8"/>
                  <text x={W - 2} y={H - pct*H - 2} fontSize="6" fill="#C8C4BC" textAnchor="end">{formatVal(Math.round(max*pct))}</text>
                </g>
              ))}
              {/* Area fill under line */}
              <polyline points={[`${xOf(0)},${H}`, ...data.map((_,i)=>`${xOf(i)},${yOf(vals[i])}`), `${xOf(data.length-1)},${H}`].join(" ")}
                fill={`${color}18`} stroke="none"/>
              {/* Line */}
              <polyline points={points} fill="none" stroke={`${color}80`} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
              {/* Dots + labels */}
              {data.map((d, i) => {
                const cx = xOf(i); const cy = yOf(vals[i]);
                const isSelected = d.ym === statsMonth;
                return (
                  <g key={d.ym} onClick={() => setStatsMonth(d.ym)} style={{ cursor:"pointer" }}>
                    <circle cx={cx} cy={cy} r={isSelected ? 5 : 3.5}
                      fill={isSelected ? color : "white"} stroke={color} strokeWidth={isSelected ? 0 : 1.8}/>
                    {isSelected && vals[i] > 0 && (
                      <text x={cx} y={cy - 9} fontSize="7" fill={color} textAnchor="middle" fontWeight="bold">{formatVal(vals[i])}</text>
                    )}
                    <text x={cx} y={H + 16} fontSize="7.5" fill={isSelected?"#1B3F45":"#9DB5B9"} textAnchor="middle" fontWeight={isSelected?"bold":"normal"}>{d.label}</text>
                  </g>
                );
              })}
              {/* Baseline */}
              <line x1={0} y1={H} x2={W} y2={H} stroke="#E8E4DC" strokeWidth="1"/>
            </svg>
          );
        };

        // Status by client breakdown
        const clientBreakdown = clients.map(c => {
          const cName = c.company || c.name;
          const cOrders = mAllOrders.filter(o => o.clientId===c.id || o.client===cName);
          const cInvs   = invoices.filter(i => i.client===cName && (i.date||"").startsWith(statsMonth));
          const cRev    = cInvs.reduce((s,i)=>s+roundCHF(i.items.reduce((ss,it)=>ss+lineTotal(it),0)*(1+C.taxRate)+(parseFloat(i.porto)||0)),0);
          return { id:c.id, name:cName, orders:cOrders.length, revenue:cRev, units:cInvs.reduce((s,i)=>s+i.items.reduce((ss,it)=>ss+(parseFloat(it.qty)||0),0),0) };
        }).filter(c => c.orders > 0 || c.revenue > 0).sort((a,b) => b.revenue - a.revenue);

        const pad = isDesktop?"0 40px 60px":isTablet?"0 32px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))":"0 16px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))";

        return (
          <div style={{ animation:"fadeUp 0.3s ease" }}>
            {/* Header — same structure as Orders/Invoice */}
            <div style={{ padding: isDesktop?"32px 40px 20px":isTablet?"max(32px, env(safe-area-inset-top, 32px)) 32px 16px":"max(56px, env(safe-area-inset-top, 56px)) 22px 16px", background:"white" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:24, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.02em" }}>{t("statsTitle")}</div>
                  <div style={{ fontSize:13, color:"#5A7A80", marginTop:3, fontWeight:500 }}>{monthLabel}</div>
                </div>
              </div>

              {/* Status pills — same pills-row as Orders */}
              <div className="pills-row" style={{ marginBottom:10 }}>
                {[["all", lang==="de"?"Alle":"All", mAllOrders.length], ...Object.entries(C.statuses).map(([k,v])=>[k,v.label,mAllOrders.filter(o=>o.status===k).length])].map(([key,label,cnt]) => (
                  <button key={key} onClick={()=>setStatsStatusFilter(key)}
                    style={{ padding:"8px 16px", borderRadius:100, border:"none", background:statsStatusFilter===key?"#1B3F45":"white", fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", color:statsStatusFilter===key?"white":"#5A7A80", flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                    {label}&nbsp;<span style={{ fontWeight:500, opacity:0.6 }}>{cnt}</span>
                  </button>
                ))}
              </div>

              {/* Client filter — same Select as Orders/Invoice */}
              <div style={{ marginBottom:10 }}>
                <Select value={statsClientFilter} onChange={e=>setStatsClientFilter(e.target.value)} style={{ fontSize:13, padding:"10px 36px 10px 12px", color:statsClientFilter!=="all"?"#1B3F45":"#5A7A80" }}>
                  <option value="all">{lang==="de"?"Alle Kunden":"All clients"}</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.company||c.name}</option>)}
                </Select>
              </div>

              {/* Month picker with calendar icon */}
              <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position:"absolute", left:12, pointerEvents:"none", zIndex:1 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <input type="month" value={statsMonth} max={new Date().toISOString().slice(0,7)}
                  onChange={e=>{ if(e.target.value) setStatsMonth(e.target.value); }}
                  style={{ ...selectBase, paddingLeft:36, fontSize:13, color:"#1B3F45" }}/>
              </div>
            </div>

            <div style={{ padding: pad }}>

              {/* KPI cards */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14, marginTop:16 }}>
                {[
                  { key:"orders",  val:mOrders.length,  display: String(mOrders.length), sub:`${mOpen} ${lang==="de"?"offen":"open"}` },
                  { key:"revenue", val:mRevenue, display: mRevenue>0?`${C.currency} ${fmt(mRevenue)}`:"—", accent:"#C9933A" },
                  { key:"units",   val:mUnits,  display: mUnits>0?String(mUnits):"—", sub:lang==="de"?"Steine/Stücke":"stones / pieces" },
                  { key:"clients", val:mClients,display: mClients>0?String(mClients):"—" },
                ].map(({ key, display, sub, accent }) => (
                  <button key={key} onClick={()=>setStatsMetric(key)}
                    style={{ background: statsMetric===key?metricCfg[key].color:"white", borderRadius:18, padding:"16px 14px", border: statsMetric===key?`2px solid ${metricCfg[key].color}`:"1px solid #E8E4DC", cursor:"pointer", textAlign:"left", transition:"all 0.15s", boxShadow: statsMetric===key?"0 4px 14px rgba(0,0,0,0.15)":"0 1px 4px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize:10, fontWeight:700, color: statsMetric===key?"rgba(255,255,255,0.7)":"#9DB5B9", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>{metricCfg[key].label}</div>
                    <div style={{ fontSize:28, fontWeight:900, color: statsMetric===key?"white":(accent||"#1B3F45"), letterSpacing:"-0.03em", lineHeight:1 }}>{display}</div>
                    {sub && <div style={{ fontSize:11, color: statsMetric===key?"rgba(255,255,255,0.6)":"#9DB5B9", marginTop:5 }}>{sub}</div>}
                  </button>
                ))}
              </div>

              {/* Main chart — selected metric, 12 months, tappable bars */}
              <div style={{ background:"white", borderRadius:18, border:"1px solid #E8E4DC", padding:"18px 16px", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#1B3F45" }}>{mc.label} — {t("statsTrend")}</div>
                  <div style={{ fontSize:11, color:"#9DB5B9" }}>12 {lang==="de"?"Monate":"months"}</div>
                </div>
                <BarChart data={trend} metricKey={statsMetric} color={mc.color} formatVal={mc.format}/>
                <div style={{ fontSize:10, color:"#9DB5B9", marginTop:8, textAlign:"center" }}>{lang==="de"?"Tippe auf einen Punkt um den Monat zu wählen":"Tap a dot to select that month"}</div>
              </div>

              {/* Client breakdown table (only when "All clients") */}
              {statsClientFilter === "all" && clientBreakdown.length > 0 && (
                <div style={{ background:"white", borderRadius:18, border:"1px solid #E8E4DC", overflow:"hidden", marginBottom:14 }}>
                  <div style={{ padding:"14px 16px 10px", borderBottom:"1px solid #F0EDE8" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#1B3F45" }}>{lang==="de"?"Nach Kunde":"By client"}</div>
                  </div>
                  {clientBreakdown.map((c, i) => {
                    const maxRev = Math.max(...clientBreakdown.map(x=>x.revenue), 1);
                    return (
                      <div key={c.id} style={{ padding:"12px 16px", borderTop: i>0?"1px solid #F8F6F3":"none" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"#1B3F45" }}>{c.name}</div>
                          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                            <span style={{ fontSize:11, color:"#9DB5B9" }}>{c.orders} {lang==="de"?"Auftr.":"ord."} · {c.units} {lang==="de"?"Einh.":"units"}</span>
                            <span style={{ fontSize:13, fontWeight:800, color:"#C9933A" }}>{c.revenue>0?`${C.currency} ${fmt(c.revenue)}`:"—"}</span>
                          </div>
                        </div>
                        {c.revenue > 0 && (
                          <div style={{ height:4, background:"#F0EDE8", borderRadius:2, overflow:"hidden" }}>
                            <div style={{ height:"100%", background:"#C9933A", borderRadius:2, width:`${(c.revenue/maxRev)*100}%`, transition:"width 0.4s ease" }}/>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Status breakdown donut-style pills */}
              {statsStatusFilter === "all" && mAllOrders.length > 0 && (
                <div style={{ background:"white", borderRadius:18, border:"1px solid #E8E4DC", padding:"14px 16px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#1B3F45", marginBottom:12 }}>{lang==="de"?"Nach Status":"By status"}</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {Object.entries(C.statuses).map(([key, st]) => {
                      const count = mAllOrders.filter(o=>o.status===key).length;
                      if (count === 0) return null;
                      const pct = Math.round((count / mAllOrders.length) * 100);
                      return (
                        <div key={key}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <span style={{ fontSize:12, color:"#5A7A80", fontWeight:600 }}>{st.label}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:"#1B3F45" }}>{count} <span style={{ color:"#9DB5B9", fontWeight:400 }}>({pct}%)</span></span>
                          </div>
                          <div style={{ height:6, background:"#F0EDE8", borderRadius:3, overflow:"hidden" }}>
                            <div style={{ height:"100%", background:st.color, borderRadius:3, width:`${pct}%`, transition:"width 0.4s ease" }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* ── ORDERS TAB ── */}
      {tab==="orders" && (
        <div style={{ animation:"fadeUp 0.3s ease" }}>
          {/* HEADER */}
          <div style={{ padding: isDesktop?"32px 40px 20px":isTablet?"max(32px, env(safe-area-inset-top, 32px)) 32px 16px":"max(56px, env(safe-area-inset-top, 56px)) 22px 16px", background:"white" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              {/* Left: date block (list) or back + title (other views) */}
              {view==="list" ? (
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  {/* Today's date block */}
                  <div style={{ background:"#1B3F45", borderRadius:16, padding:"8px 14px", textAlign:"center", minWidth:54, flexShrink:0 }}>
                    <div style={{ fontSize:28, fontWeight:900, color:"white", lineHeight:1 }}>{new Date().getDate()}</div>
                    <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.6)", letterSpacing:"0.08em", textTransform:"uppercase", marginTop:1 }}>{new Date().toLocaleDateString("en-US",{month:"short"})}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:"#9DB5B9", fontWeight:500, marginBottom:2 }}>{new Date().toLocaleDateString("en-US",{weekday:"long"})}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.02em", lineHeight:1 }}>Orders</div>
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <button onClick={()=>{ if(view==="edit") setView("detail"); else if(view==="new" && newOrderStep>1) setNewOrderStep(s=>s-1); else setView("list"); }} style={{ width:36, height:36, borderRadius:11, background:"#F0F6F7", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="back" size={18} color="#1B3F45"/></button>
                  <div>
                    <div style={{ fontSize:24, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.02em", lineHeight:1.1 }}>
                      {view==="new" ? t("newOrderTitle") : view==="edit" ? t("editOrderTitle") : view==="detail" ? selectedOrder?.client : t("ordersHeader")}
                    </div>
                    {view==="detail" && selectedOrder?.orderNumber && (
                      <div style={{ fontSize:11, fontWeight:600, color:"#9DB5B9", marginTop:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>Order #{selectedOrder.orderNumber}</div>
                    )}
                  </div>
                </div>
              )}

              {view==="new" && (
                <div style={{ fontSize:12, fontWeight:600, color:"#9DB5B9" }}>{newOrderStep} of 3</div>
              )}
              {view==="list" && (
                <div style={{ display:"flex", gap:8 }}>
                  {selectMode
                    ? <button onClick={()=>{ setSelectMode(false); setSelectedOrderIds(new Set()); }} style={{ padding:"9px 14px", background:"#F0F6F7", border:"none", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:700, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("cancelBtn")}</button>
                    : <>
                        <button onClick={()=>setSelectMode(true)} style={{ padding:"9px 14px", background:"#F0F6F7", border:"none", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:700, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("selectBtn")}</button>
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
                    <Icon name="print" size={15} color="#1B3F45"/> {t("printBtn")}
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

          <div style={{ padding: view==="new" ? 0 : view==="detail" ? (isDesktop?"20px 0 120px":"12px 0 max(110px, calc(90px + env(safe-area-inset-bottom, 0px)))") : isDesktop?"16px 40px 60px":isTablet?"16px 32px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))":"16px 22px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>

            {/* ── LIST ── */}
            {view==="list" && (
              <>
                {/* Status filter pills */}
                <div className="pills-row" style={{ marginBottom:16 }}>
                  {[["all","All",orders.length], ...Object.entries(C.statuses).map(([k,v])=>[k,v.label,counts[k]])].map(([key,label,cnt])=>(
                    <button key={key} style={{ padding:"8px 16px", borderRadius:100, border:"none", background: filterStatus===key ? "#1B3F45" : "white", fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", color: filterStatus===key ? "white" : "#5A7A80", flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }} onClick={()=>setFilterStatus(key)}>
                      {label}&nbsp;<span style={{ fontWeight:500, opacity:0.6 }}>{cnt}</span>
                    </button>
                  ))}
                </div>

                {/* Client filter */}
                {[...new Set(orders.map(o=>o.client).filter(Boolean))].length > 1 && (
                  <div style={{ marginBottom:10 }}>
                    <Select value={filterClient} onChange={e=>setFilterClient(e.target.value)} style={{ fontSize:13, padding:"10px 36px 10px 12px", color: filterClient!=="all"?"#1B3F45":"#5A7A80" }}>
                      <option value="all">{t("allClients")}</option>
                      {[...new Set(orders.map(o=>o.client).filter(Boolean))].sort().map(c=><option key={c} value={c}>{c}</option>)}
                    </Select>
                  </div>
                )}
                {/* Date + Excel */}
                <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center" }}>
                  <div style={{ flex:1, position:"relative" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", zIndex:1 }}>
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <Input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} style={{ width:"100%", fontSize:13, padding:"10px 12px 10px 36px", color: filterDate?"#1B3F45":"#9DB5B9" }}/>
                  </div>
                  {filterDate && <button onClick={()=>setFilterDate("")} style={{ padding:"10px 12px", border:"none", borderRadius:12, background:"#F0F6F7", fontSize:12, fontWeight:700, color:"#5A7A80", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>✕</button>}
                  <button onClick={exportToExcel} style={{ padding:"10px 14px", border:"none", borderRadius:12, background:"#F0F6F7", fontSize:12, fontWeight:700, color:"#1B3F45", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>↓ Excel</button>
                </div>
                {/* Swipe hint — desaparece tras primera interacción */}
                {!swipeHintSeen && !selectMode && filteredOrders.length > 0 && (
                  <div style={{ textAlign:"center", fontSize:9, color:"#9DB5B9", fontWeight:500, letterSpacing:"0.04em", marginBottom:12, fontFamily:"'IBM Plex Sans', sans-serif" }}>
                    ← Swipe to mark done &nbsp;·&nbsp; Swipe to delete →
                  </div>
                )}

                {/* Order rows */}
                {filteredOrders.map((o) => {
                  const today = new Date().toISOString().split("T")[0];
                  const getUrgency = (deadline) => {
                    if(!deadline) return { accent:"transparent", label:null, bg:"#F0F6F7" };
                    if(deadline < today) return { accent:"#da1e28", label:"Overdue", bg:"#FFF0F0" };
                    if(deadline === today) return { accent:"#C9933A", label:"Today", bg:"#FFF8ED" };
                    const diff = Math.round((new Date(deadline+"T12:00:00")-new Date(today+"T12:00:00"))/(864e5));
                    if(diff === 1) return { accent:"#C9933A", label:"Tomorrow", bg:"#FFF8ED" };
                    if(diff <= 7)  return { accent:"#C9933A", label:`${diff} days`, bg:"#FFF8ED" };
                    return { accent:"#1B3F45", label:null, bg:"#F0F6F7" };
                  };
                  const urg = getUrgency(o.deadline);
                  const isChecked = selectedOrderIds.has(o.id);
                  const deadlineDate = o.deadline ? new Date(o.deadline+"T12:00:00") : null;
                  const deadlineDay = deadlineDate ? deadlineDate.getDate() : null;
                  const deadlineMon = deadlineDate ? deadlineDate.toLocaleDateString("en-GB",{month:"short"}).toUpperCase() : null;
                  const swipeDx = swipingCard?.id === o.id ? swipingCard.dx : 0;
                  const isMoving = swipingCard?.id === o.id;

                  return (
                    <div key={o.id} style={{ position:"relative", marginBottom:10, borderRadius:20, height:"auto" }}>

                      {/* Fondo verde — acción "Listo" (se revela con swipe izquierda) */}
                      <div style={{ position:"absolute", inset:0, background:"#E8F3EF", borderRadius:20, display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:22 }}>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                          <Icon name="check" size={22} color="#1B6048"/>
                          <span style={{ fontSize:10, color:"#1B6048", fontWeight:700, fontFamily:"'IBM Plex Sans', sans-serif" }}>Done</span>
                        </div>
                      </div>
                      {/* Fondo rojo — acción "Eliminar" (se revela con swipe derecha) */}
                      <div style={{ position:"absolute", inset:0, background:"#FCEBEB", borderRadius:20, display:"flex", alignItems:"center", paddingLeft:22 }}>
                        <Icon name="trash" size={22} color="#A32D2D"/>
                      </div>

                      {/* Tarjeta deslizable */}
                      <div
                        onTouchStart={e=>{
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
                          borderRadius:20, padding:"18px 16px", display:"flex", alignItems:"stretch", gap:14,
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
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:17, fontWeight:800, color:"#1B3F45", lineHeight:1.2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.client || "—"}</div>
                              {o.orderNumber && <div style={{ fontSize:11, fontWeight:600, color:"#9DB5B9", marginTop:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>Order #{o.orderNumber}</div>}
                            </div>
                            <StatusPill status={o.status}/>
                          </div>

                          {/* Delivery date — prominent */}
                          <div style={{ display:"flex", alignItems:"center", gap:12, background: urg.bg, borderRadius:12, padding:"12px 14px", marginBottom: o.description ? 10 : 0 }}>
                            {deadlineDay ? (
                              <>
                                <div style={{ textAlign:"center", flexShrink:0 }}>
                                  <div style={{ fontSize:32, fontWeight:900, color: urg.accent !== "transparent" ? urg.accent : "#1B3F45", lineHeight:1 }}>{deadlineDay}</div>
                                  <div style={{ fontSize:11, fontWeight:700, color: urg.accent !== "transparent" ? urg.accent : "#5A7A80", letterSpacing:"0.06em", marginTop:2 }}>{deadlineMon}</div>
                                </div>
                                <div style={{ width:"1px", height:40, background: urg.accent !== "transparent" ? `${urg.accent}30` : "#D8D4CC", flexShrink:0 }}/>
                                <div>
                                  <div style={{ fontSize:11, fontWeight:700, color:"#9DB5B9", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:3 }}>{t("dueLabel")}</div>
                                  {urg.label && <div style={{ fontSize:14, fontWeight:800, color: urg.accent }}>{urg.label}</div>}
                                  {!urg.label && <div style={{ fontSize:13, fontWeight:600, color:"#5A7A80" }}>{deadlineDate.toLocaleDateString("en-US",{weekday:"long"})}</div>}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize:13, color:"#9DB5B9", fontStyle:"italic" }}>{t("noDueDateLabel")}</div>
                            )}
                          </div>

                          {/* Description */}
                          {o.description && (
                            <div style={{ fontSize:13, color:"#7A9AA0", lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", marginBottom:10 }}>{o.description}</div>
                          )}

                          {/* Action buttons */}
                          {!selectMode && (
                            <div style={{ display:"flex", gap:8, marginTop: o.description ? 0 : 10 }} onClick={e=>e.stopPropagation()}>
                              <button onClick={()=>setWorkOrderPreview(o)}
                                style={{ flex:1, padding:"9px 6px", background:"#F0F6F7", border:"none", borderRadius:10, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:12, fontWeight:700, color:"#1B3F45", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                                <Icon name="print" size={13} color="#1B3F45"/> {t("workOrderBtn")}
                              </button>
                              {o.status==="invoiced" ? (()=>{
                                const linkedInv = invoices.find(inv=>inv.items&&inv.items.some(it=>it.orderRef===o.id));
                                return (
                                  <button onClick={()=>{ if(linkedInv){ printInvoiceDoc(linkedInv); setInvoices(invoices.map(i=>i.id===linkedInv.id?{...i,printed:true}:i)); } else showToast(t("invoiceNotFound"),"#da1e28"); }}
                                    style={{ flex:1, padding:"9px 6px", background:"#1B3F45", border:"none", borderRadius:10, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:12, fontWeight:700, color:"white", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                                    <Icon name="invoice" size={13} color="#C9933A"/> {t("printInvoiceBtn")}
                                  </button>
                                );
                              })() : (
                                <button onClick={()=>setConfirmSheet({ type:"invoice", order:o })}
                                  style={{ flex:1, padding:"9px 6px", background:"#C9933A", border:"none", borderRadius:10, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:12, fontWeight:700, color:"white", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                                  <Icon name="invoice" size={13} color="white"/> {t("createInvoiceBtn")}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Bulk delete bar */}
                {selectMode && selectedOrderIds.size > 0 && (
                  <div style={{ position:"fixed", bottom:"max(80px, calc(72px + env(safe-area-inset-bottom, 0px)))", left:"50%", transform:"translateX(-50%)", width:"calc(100% - 32px)", maxWidth:SHEET_MAX, zIndex:200, animation:"fadeUp 0.2s ease" }}>
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

            {/* ── NEW ORDER — PANTALLA ÚNICA ── */}
            {view==="new" && (()=>{
              const pieceTotal = (draft.lineItems||[]).reduce((s,li)=>s+lineTotal(li),0);
              const clientName = draft.client || "";
              const items = draft.lineItems||[];

              const dupItem = (li) => {
                const copy = {...li, id:Date.now()+Math.random()};
                const idx = items.findIndex(i=>i.id===li.id);
                const arr = [...items]; arr.splice(idx+1,0,copy);
                setDraft(d=>({...d,lineItems:arr}));
              };
              const delItem = (id) => setDraft(d=>({...d,lineItems:d.lineItems.filter(i=>i.id!==id)}));
              const updItem = (id, patch) => setDraft(d=>({...d,lineItems:d.lineItems.map(i=>i.id===id?{...i,...patch}:i)}));
              const onHandleTouchStart = (e, idx) => { dragTouchStartY.current = e.touches[0].clientY; setDragIdx(idx); };
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
              const onDragStart = (e,idx) => { e.dataTransfer.effectAllowed="move"; setDragIdx(idx); };
              const onDragOver  = (e,idx) => { e.preventDefault(); setDragOverIdx(idx); };
              const onDrop      = (e,idx) => {
                e.preventDefault();
                if(dragIdx!==null && dragIdx!==idx){
                  const arr=[...items]; const [moved]=arr.splice(dragIdx,1); arr.splice(idx,0,moved);
                  setDraft(d=>({...d,lineItems:arr}));
                }
                setDragIdx(null); setDragOverIdx(null);
              };

              const addDays = (n) => { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; };
              const quickDates = [
                { label:"1 week",    date: addDays(7)  },
                { label:"2 weeks",   date: addDays(14) },
                { label:"1 month",   date: addDays(30) },
              ];

              const saveOrder = () => {
                const orderNumber = draft.orderNumber || genOrderNumber(orders, draft.client);
                const order={...draft, amount:pieceTotal, orderNumber};
                setOrders([order,...orders]);
                syncToSheets(order);
                setDraft(newOrder());
                setNewOrderStep(1);
                setClientSearch("");
                setView("list");
                showToast("Order saved");
              };

              const allClients = clients.length > 0 ? clients : [];
              const filtered = allClients.filter(c=>{
                const n = (c.company||c.name||"").toLowerCase();
                return n.includes(clientSearch.toLowerCase());
              });

              const SectionLabel = ({num, text, subtitle}) => (
                <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:16 }}>
                  <div style={{ width:30, height:30, borderRadius:"50%", background:"#1B3F45", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                    <span style={{ fontSize:13, fontWeight:900, color:"#C9933A" }}>{num}</span>
                  </div>
                  <div>
                    <div style={{ fontSize:16, fontWeight:800, color:"#1B3F45", letterSpacing:"-0.01em" }}>{text}</div>
                    {subtitle && <div style={{ fontSize:13, color:"#5A7A80", marginTop:3, lineHeight:1.4, fontFamily:"'IBM Plex Sans', sans-serif" }}>{subtitle}</div>}
                  </div>
                </div>
              );

              return (
                <div style={{ paddingBottom:"max(110px, calc(90px + env(safe-area-inset-bottom, 0px)))" }}>
                  <input ref={draftPhotoRef} type="file" accept="image/*" style={{display:"none"}} onChange={()=>{}}/>
                  <input ref={piecePhotoRef} type="file" accept="image/*" capture="environment" style={{display:"none"}}
                    onChange={e=>{
                      const f=e.target.files[0]; if(!f||!editingPieceId)return;
                      const r=new FileReader(); r.onload=ev=>{ compressPhoto(ev.target.result).then(c=>{ updItem(editingPieceId,{photo:c}); setEditingPieceId(null); }); }; r.readAsDataURL(f);
                    }}/>

                  {/* ── SECCIÓN 1: CLIENTE ── */}
                  <div style={{ padding:"20px 16px 0" }}>
                    <SectionLabel num="1" text={t("chooseClientSection")} subtitle={t("chooseClientSub")}/>
                    <div style={{ background:"white", borderRadius:16, border:"1px solid #E8E4DC", overflow:"hidden" }}>
                      {/* Buscador */}
                      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 14px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <input value={clientSearch} onChange={e=>setClientSearch(e.target.value)} placeholder={t("searchClientPlaceholder")} style={{ flex:1, border:"none", outline:"none", fontSize:15, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif", background:"transparent" }}/>
                        {clientSearch && <button onClick={()=>setClientSearch("")} style={{ background:"none", border:"none", color:"#9DB5B9", cursor:"pointer", fontSize:18, padding:0, lineHeight:1 }}>×</button>}
                      </div>
                      <div style={{ height:"0.5px", background:"#E8E4DC" }}/>
                      {filtered.length === 0 && clientSearch && (
                        <div style={{ padding:"16px 14px", fontSize:14, color:"#9DB5B9", textAlign:"center" }}>No results for "{clientSearch}"</div>
                      )}
                      {filtered.map((c, idx)=>{
                        const name = c.company||c.name;
                        const initials = name.split(" ").map(w=>w[0]||"").join("").slice(0,2).toUpperCase();
                        const orderCount = orders.filter(o=>o.clientId===c.id||o.client===name).length;
                        const isSelected = draft.clientId===c.id;
                        return (
                          <button key={c.id} onClick={()=>{ setDraft(d=>({...d,clientId:c.id,client:name,lineItems:d.lineItems?.length?d.lineItems:[{id:Date.now(),desc:"",qty:"1",unitPrice:"",photo:null}]})); }}
                            style={{ width:"100%", background: isSelected?"#F0F6F7":"white", border:"none", borderTop: idx>0?"0.5px solid #E8E4DC":"none", padding:"14px", cursor:"pointer", display:"flex", alignItems:"center", gap:12, textAlign:"left" }}>
                            <div style={{ width:40, height:40, borderRadius:"50%", background:"#1B3F45", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                              <span style={{ fontSize:14, fontWeight:700, color:"#C9933A" }}>{initials}</span>
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:15, fontWeight:700, color:"#1B3F45" }}>{name}</div>
                              <div style={{ fontSize:12, color:"#9DB5B9", marginTop:2 }}>{orderCount} {lang==="de"?(orderCount===1?"vorheriger Auftrag":"vorherige Aufträge"):(orderCount===1?"previous order":"previous orders")}</div>
                            </div>
                            {isSelected
                              ? <div style={{ width:22, height:22, borderRadius:"50%", background:"#198038", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="check" size={13} color="white"/></div>
                              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C8C4BC" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                            }
                          </button>
                        );
                      })}
                      {filtered.length > 0 && <div style={{ height:"0.5px", background:"#E8E4DC" }}/>}
                      <button onClick={()=>{ setSheetClient({name:"",address:"",phone:"",email:""}); setNewClientSheet(true); }}
                        style={{ width:"100%", background:"none", border:"none", padding:"15px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, justifyContent:"center" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9933A" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        <span style={{ fontSize:14, fontWeight:700, color:"#C9933A", fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("createNewClientBtn")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Divisor */}
                  <div style={{ margin:"24px 16px 0", height:"1px", background:"#E8E4DC" }}/>

                  {/* ── SECCIÓN 2: PIEZAS ── */}
                  <div style={{ padding:"20px 16px 0" }}>
                    <SectionLabel num="2" text={`${t("addPiecesSection")}${items.length > 0 ? ` · ${items.reduce((s,li)=>s+(parseInt(li.qty)||1),0)} pcs` : ""}`} subtitle={t("addPiecesSub")}/>
                    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                      {items.map((li,idx)=>{
                        const isDragging = dragIdx===idx;
                        const isOver    = dragOverIdx===idx && dragIdx!==idx;
                        return (
                          <div key={li.id} data-piece-idx={idx}
                            draggable onDragStart={e=>onDragStart(e,idx)} onDragOver={e=>onDragOver(e,idx)} onDrop={e=>onDrop(e,idx)} onDragEnd={()=>{setDragIdx(null);setDragOverIdx(null);}}
                            style={{ background:"white", borderRadius:16, marginBottom:10, overflow:"hidden",
                              border: isOver?"1.5px solid #C9933A":"1px solid #E8E4DC",
                              opacity: isDragging?0.45:1, transition:"opacity 0.15s, border 0.1s" }}>
                            {/* Cabecera */}
                            <div style={{ display:"flex", alignItems:"center", padding:"10px 12px 10px 0", borderBottom:"0.5px solid #F0F6F7" }}>
                              <div onTouchStart={e=>onHandleTouchStart(e,idx)} onTouchMove={onHandleTouchMove} onTouchEnd={onHandleTouchEnd}
                                style={{ padding:"6px 12px", cursor:"grab", touchAction:"none", display:"flex", flexDirection:"column", gap:3, opacity:0.35, flexShrink:0 }}>
                                {[0,1,2].map(r=><div key={r} style={{ width:16, height:1.5, background:"#1B3F45", borderRadius:1 }}/>)}
                              </div>
                              <span style={{ fontSize:12, fontWeight:800, color:"#1B3F45", letterSpacing:"0.07em", textTransform:"uppercase", flex:1 }}>{t("pieceLabel")} {idx+1}</span>
                              <div style={{ display:"flex", alignItems:"center" }}>
                                <button onClick={()=>dupItem(li)} style={{ background:"none", border:"none", cursor:"pointer", padding:"6px 8px", display:"flex", alignItems:"center" }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A7A80" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                                </button>
                                {items.length>1 && (
                                  <button onClick={()=>delItem(li.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:"6px 8px", display:"flex", alignItems:"center" }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#da1e28" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* Cuerpo */}
                            <div style={{ padding:"12px 14px 14px" }}>
                              <textarea placeholder={t("descPiecePlaceholder")} value={li.desc||""}
                                onChange={e=>updItem(li.id,{desc:e.target.value})}
                                style={{ width:"100%", minHeight:56, border:"none", outline:"none", resize:"none", fontSize:15, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif", lineHeight:1.5, background:"transparent", boxSizing:"border-box", padding:0 }}/>
                              {/* Qty row */}
                              <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:10, paddingTop:10, borderTop:"0.5px solid #F0F6F7" }}>
                                <span style={{ fontSize:12, fontWeight:700, color:"#9DB5B9", textTransform:"uppercase", letterSpacing:"0.06em", flexShrink:0 }}>{t("unitsLabel")}</span>
                                <div style={{ display:"flex", alignItems:"center", gap:0, background:"#F7F5F0", borderRadius:10, overflow:"hidden", flex:1 }}>
                                  <button onClick={()=>{ const cur=Math.max(1,(parseInt(li.qty)||1)-1); updItem(li.id,{qty:String(cur)}); }}
                                    style={{ background:"none", border:"none", cursor:"pointer", padding:"10px 14px", fontSize:18, color:"#1B3F45", lineHeight:1, fontFamily:"'IBM Plex Sans', sans-serif", flexShrink:0 }}>−</button>
                                  <input
                                    type="number" min="1" value={li.qty||""}
                                    onChange={e=>updItem(li.id,{qty:e.target.value})}
                                    onBlur={e=>{ if(!e.target.value||parseInt(e.target.value)<1) updItem(li.id,{qty:"1"}); }}
                                    placeholder="1"
                                    style={{ flex:1, textAlign:"center", border:"none", outline:"none", background:"transparent", fontSize:16, fontWeight:700, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif", padding:"10px 0", minWidth:0 }}/>
                                  <button onClick={()=>{ const cur=(parseInt(li.qty)||1)+1; updItem(li.id,{qty:String(cur)}); }}
                                    style={{ background:"none", border:"none", cursor:"pointer", padding:"10px 14px", fontSize:18, color:"#1B3F45", lineHeight:1, fontFamily:"'IBM Plex Sans', sans-serif", flexShrink:0 }}>+</button>
                                </div>
                              </div>
                              {/* Photo section */}
                              <div style={{ marginTop:10 }}>
                                {li.photo ? (
                                  <div style={{ position:"relative", display:"inline-block" }}>
                                    <img src={li.photo} alt="piece" style={{ width:80, height:80, objectFit:"cover", borderRadius:10, display:"block", border:"1.5px solid #C9933A" }}/>
                                    <button onClick={()=>updItem(li.id,{photo:null})}
                                      style={{ position:"absolute", top:-6, right:-6, width:20, height:20, borderRadius:"50%", background:"#da1e28", border:"2px solid white", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>
                                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={()=>{ setEditingPieceId(li.id); piecePhotoRef.current.click(); }}
                                    style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 14px", background:"#FBF5E8", border:"1.5px dashed #C9933A", borderRadius:10, cursor:"pointer", width:"100%", justifyContent:"center" }}>
                                    <Icon name="camera" size={16} color="#C9933A"/>
                                    <span style={{ fontSize:13, fontWeight:700, color:"#C9933A", fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("addPhotoBtn")}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <button onClick={()=>setDraft(d=>({...d,lineItems:[...(d.lineItems||[]),{id:Date.now()+Math.random(),desc:"",qty:"1",unitPrice:"",photo:null}]}))}
                        style={{ width:"100%", border:"1.5px dashed #C9933A", borderRadius:14, background:"none", padding:"15px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:4 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9933A" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        <span style={{ fontSize:14, fontWeight:700, color:"#C9933A", fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("addAnotherPieceBtn")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Divisor */}
                  <div style={{ margin:"24px 16px 0", height:"1px", background:"#E8E4DC" }}/>

                  {/* ── SECCIÓN 3: FECHA Y NOTAS ── */}
                  <div style={{ padding:"20px 16px 0" }}>
                    <SectionLabel num="3" text={t("setDeadlineSection")} subtitle={t("setDeadlineSub")}/>
                    {/* Fechas rápidas */}
                    <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                      {quickDates.map(qd=>(
                        <button key={qd.label} onClick={()=>setDraft(d=>({...d,deadline:qd.date}))}
                          style={{ flex:1, padding:"12px 4px", borderRadius:12,
                            border: draft.deadline===qd.date?"2px solid #1B3F45":"1.5px solid #E8E4DC",
                            background: draft.deadline===qd.date?"#1B3F45":"white",
                            color: draft.deadline===qd.date?"white":"#5A7A80",
                            fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'IBM Plex Sans', sans-serif", transition:"all 0.15s" }}>
                          {qd.label}
                        </button>
                      ))}
                    </div>
                    <input type="date" value={draft.deadline} onChange={e=>setDraft(d=>({...d,deadline:e.target.value}))}
                      style={{ width:"100%", padding:"14px", borderRadius:12, border:"1.5px solid #E8E4DC", fontSize:15, color: draft.deadline?"#1B3F45":"#9DB5B9",
                        fontFamily:"'IBM Plex Sans', sans-serif", background:"white", boxSizing:"border-box", outline:"none", marginBottom:14 }}/>
                    <textarea value={draft.description} onChange={e=>setDraft(d=>({...d,description:e.target.value}))}
                      placeholder={t("specialInstructionsPlaceholder")}
                      rows={3}
                      style={{ width:"100%", padding:"14px", borderRadius:12, border:"1.5px solid #E8E4DC", fontSize:15, color:"#1B3F45",
                        fontFamily:"'IBM Plex Sans', sans-serif", resize:"none", background:"white", boxSizing:"border-box", outline:"none", lineHeight:1.5 }}/>
                  </div>

                  {/* ── BOTÓN FIJO ── */}
                  <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:SHEET_MAX, background:"#F2EDE4", padding:"12px 20px max(20px, env(safe-area-inset-bottom, 20px))", zIndex:200 }}>
                    <button disabled={!draft.client} onClick={saveOrder}
                      style={{ width:"100%", padding:"17px", background: draft.client?"#C9933A":"#E8E4DC", color: draft.client?"white":"#9DB5B9", border:"none", borderRadius:14,
                        fontFamily:"'IBM Plex Sans', sans-serif", fontSize:16, fontWeight:700, cursor: draft.client?"pointer":"default",
                        boxShadow: draft.client?"0 4px 16px rgba(201,147,58,0.3)":"none", transition:"all 0.2s" }}>
                      {draft.client ? `${t("saveOrderBtn")} · ${clientName}` : t("selectClientFirst")}
                    </button>
                  </div>

                  {/* ── BOTTOM SHEET: NUEVO CLIENTE ── */}
                  {newClientSheet && (<>
                    <div onClick={()=>setNewClientSheet(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:300 }}/>
                    <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:SHEET_MAX, background:"white", borderRadius:"24px 24px 0 0", padding:"0 0 max(28px, env(safe-area-inset-bottom, 28px))", zIndex:301 }}>
                      <div style={{ padding:"14px 0 0", display:"flex", justifyContent:"center" }}>
                        <div style={{ width:36, height:4, borderRadius:2, background:"#E8E4DC" }}/>
                      </div>
                      <div style={{ padding:"16px 24px 4px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <span style={{ fontSize:18, fontWeight:800, color:"#1B3F45" }}>{t("newClientHeader")}</span>
                        <button onClick={()=>setNewClientSheet(false)} style={{ background:"#F0F6F7", border:"none", borderRadius:"50%", width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A7A80" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                      <div style={{ padding:"16px 24px 0" }}>
                        <input autoFocus placeholder="Company name *" value={sheetClient.name} onChange={e=>setSheetClient(s=>({...s,name:e.target.value}))}
                          style={{ width:"100%", padding:"16px", fontSize:16, fontWeight:600, color:"#1B3F45",
                            border: sheetClient.name.trim()?"2px solid #1B3F45":"2px solid #E8E4DC",
                            borderRadius:14, fontFamily:"'IBM Plex Sans', sans-serif",
                            background: sheetClient.name.trim()?"#F0F6F7":"white",
                            outline:"none", boxSizing:"border-box", transition:"all 0.15s" }}/>
                      </div>
                      <div style={{ padding:"10px 24px 0", display:"flex", flexDirection:"column", gap:10 }}>
                        {[
                          { key:"address", placeholder:"Address", type:"text",
                            icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="2" strokeLinecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg> },
                          { key:"phone",   placeholder:"Phone",    type:"tel",
                            icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.59A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/></svg> },
                          { key:"email",   placeholder:"Email",     type:"email",
                            icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg> },
                        ].map(f=>(
                          <div key={f.key} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", border:"1.5px solid #E8E4DC", borderRadius:12, background:"white" }}>
                            {f.icon}
                            <input placeholder={f.placeholder} value={sheetClient[f.key]||""} onChange={e=>setSheetClient(s=>({...s,[f.key]:e.target.value}))} type={f.type}
                              style={{ flex:1, border:"none", outline:"none", fontSize:14, color:"#5A7A80", fontFamily:"'IBM Plex Sans', sans-serif", background:"transparent", padding:0 }}/>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding:"10px 24px 0", display:"flex", alignItems:"center", gap:6 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                        <span style={{ fontSize:12, color:"#9DB5B9" }}>Address, phone and email are optional</span>
                      </div>
                      <div style={{ padding:"16px 24px 0" }}>
                        <button disabled={!sheetClient.name.trim()} onClick={()=>{
                          const nc={...newClient(),name:sheetClient.name.trim(),address:sheetClient.address,phone:sheetClient.phone,email:sheetClient.email};
                          setClients(prev=>[...prev,nc]);
                          setDraft(d=>({...d,clientId:nc.id,client:nc.name,lineItems:d.lineItems?.length?d.lineItems:[{id:Date.now(),desc:"",qty:"1",unitPrice:"",photo:null}]}));
                          setNewClientSheet(false);
                        }} style={{ width:"100%", padding:"17px", background:sheetClient.name.trim()?"#C9933A":"#E8E4DC",
                          color:sheetClient.name.trim()?"white":"#9DB5B9", border:"none", borderRadius:16,
                          fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:700,
                          cursor:sheetClient.name.trim()?"pointer":"default",
                          boxShadow: sheetClient.name.trim()?"0 4px 14px rgba(201,147,58,0.3)":"none",
                          transition:"all 0.15s" }}>
                          {t("createClientBtn")}
                        </button>
                      </div>
                    </div>
                  </>)}
                </div>
              );
            })()}

            {/* ── EDIT ORDER ── */}
            {view==="edit" && (
              <Card>
                <Field label={t("clientFieldLabel")}>
                  {clients.length > 0
                    ? <Select value={draft.clientId} onChange={e=>{ const c=clients.find(x=>x.id===e.target.value); setDraft({...draft,clientId:e.target.value,client:c?(c.company||c.name):""}); }}>
                        <option value="">{t("selectClientOption")}</option>
                        {clients.map(c=><option key={c.id} value={c.id}>{c.company||c.name}{c.company&&c.name?" ("+c.name+")":""}</option>)}
                      </Select>
                    : <Input placeholder="Client or company" value={draft.client} onChange={e=>setDraft({...draft,client:e.target.value})}/>
                  }
                </Field>
                <Field label={t("workDescLabel")}>
                  <Textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder={t("workDescLabel")+"\u2026"}/>
                </Field>
                <Field label={t("deliveryDateLabel")}>
                  <Input type="date" value={draft.deadline} onChange={e=>setDraft({...draft,deadline:e.target.value})}/>
                </Field>
                <div style={{ marginTop:8, marginBottom:4 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>{t("itemsForInvoice")}</div>
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
                  <button onClick={()=>setDraft({...draft,lineItems:[...(draft.lineItems||[]),{id:Date.now()+Math.random(),desc:"",qty:"1",unitPrice:""}]})} style={{ width:"100%", padding:"11px", background:"none", border:"1.5px dashed #E8E4DC", borderRadius:12, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:600, color:"#5A7A80", cursor:"pointer" }}>{t("addItemBtn")}</button>
                </div>
                <BtnPrimary disabled={!draft.client} onClick={()=>{ setOrders(orders.map(o=>o.id===draft.id?{...draft}:o)); setView("detail"); showToast(t("orderUpdated")); }}>
                  {t("saveChangesBtn")}
                </BtnPrimary>
                <div style={{ height:10 }}/>
                <button onClick={()=>showConfirm(t("cannotUndone"),()=>{ setOrders(orders.filter(o=>o.id!==draft.id)); setView("list"); showToast(t("deleteOrderConfirm"),"#da1e28"); })} style={{ width:"100%", background:"none", border:"none", color:"#da1e28", fontSize:13, fontWeight:600, cursor:"pointer", padding:"8px 0" }}>
                  {t("deleteOrderBtn")}
                </button>
              </Card>
            )}

            {/* ── DETAIL ── */}
            {view==="detail" && selectedOrder && (()=>{
              const st = selectedOrder.status;
              const today = new Date().toISOString().split("T")[0];
              const fmtDate = d => d ? new Date(d+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—";
              const dlPast = selectedOrder.deadline && selectedOrder.deadline < today;
              const orderTotal = (selectedOrder.lineItems||[]).length > 0
                ? (selectedOrder.lineItems).reduce((s,li)=>s+lineTotal(li),0)
                : parseFloat(selectedOrder.amount)||0;

              /* ── Progress bar helpers ── */
              const STEPS = [t("receivedStep"),t("inProgressStep"),t("completedStep"),t("invoicedStep")];
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
                        <div style={{ fontSize:13, fontWeight:500, color:"#8A6220", fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("pendingStatus")}</div>
                        <div style={{ fontSize:10, color:"#BA9B55", marginTop:2, fontFamily:"'IBM Plex Sans', sans-serif" }}>
                          {t("receivedLabel")} {fmtDate(selectedOrder.received)}{selectedOrder.deadline ? ` · ${t("dueLabel")} ${fmtDate(selectedOrder.deadline)}` : ""}
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
                        <div style={{ fontSize:13, fontWeight:500, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("inReviewStatus")}</div>
                        <div style={{ fontSize:10, color:"#5A7A80", marginTop:2, fontFamily:"'IBM Plex Sans', sans-serif" }}>
                          {t("receivedLabel")} {fmtDate(selectedOrder.received)}{selectedOrder.deadline ? ` · ${t("dueLabel")} ${fmtDate(selectedOrder.deadline)}` : ""}
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
                        <div style={{ fontSize:13, fontWeight:500, color:"#1B6048", fontFamily:"'IBM Plex Sans', sans-serif" }}>{st==="invoiced"?t("invoicedLabel"):t("completedLabel")}</div>
                        <div style={{ fontSize:10, color:"#3B8060", marginTop:2, fontFamily:"'IBM Plex Sans', sans-serif" }}>{st==="invoiced"?t("invoiceCreatedLabel"):t("readyToInvoice")}</div>
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
                            <span style={{ fontSize:10, fontWeight:500, color: isCompleted(idx)?"#1B3F45": isActive(idx)?"#C9933A":"#9DB5B9", fontFamily:"'IBM Plex Sans', sans-serif", whiteSpace:"nowrap" }}>{label}</span>
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
                    <div style={{ padding:"13px 16px", borderBottom:"0.5px solid #F5F3EF", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontSize:11, color:"#9DB5B9", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("orderIdLabel")}</div>
                        <div style={{ fontSize:14, fontWeight:600, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>#{selectedOrder.id}</div>
                      </div>
                      {selectedOrder.deadline && (
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:11, color:"#9DB5B9", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("dueDateLabel")}</div>
                          <div style={{ fontSize:14, fontWeight:600, color: dlPast?"#E24B4A":"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>{fmtDate(selectedOrder.deadline)}</div>
                        </div>
                      )}
                    </div>

                    {/* Fila B — Descripción */}
                    {selectedOrder.description && (
                      <div style={{ padding:"13px 16px", borderBottom:"0.5px solid #F5F3EF" }}>
                        <div style={{ fontSize:11, color:"#9DB5B9", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("descriptionLabel")}</div>
                        <div style={{ fontSize:13, color:"#1B3F45", lineHeight:1.6, fontFamily:"'IBM Plex Sans', sans-serif" }}>{selectedOrder.description}</div>
                      </div>
                    )}

                    {/* Filas C — Items */}
                    {(selectedOrder.lineItems||[]).filter(li=>li.desc).map((li, idx, arr) => (
                      <div key={li.id} style={{ padding:"13px 16px", borderBottom: idx<arr.length-1||orderTotal>0?"0.5px solid #F5F3EF":"none", display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:40, height:40, borderRadius:10, background:"#E0ECED", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <Icon name="gem" size={18} color="#5A7A80"/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{li.desc||"—"}</div>
                          {(li.qty&&li.qty!=="1") && <div style={{ fontSize:11, color:"#9DB5B9", fontFamily:"'IBM Plex Sans', sans-serif", marginTop:2 }}>×{li.qty}</div>}
                        </div>
                        {lineTotal(li)>0 && (
                          <div style={{ fontSize:14, fontWeight:600, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif", flexShrink:0 }}>{C.currency} {fmt(lineTotal(li))}</div>
                        )}
                      </div>
                    ))}

                    {/* Fila D — Total */}
                    {orderTotal > 0 && (
                      <div style={{ padding:"13px 16px", background:"#F7F5F0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:13, fontWeight:600, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("totalLabel")}</span>
                        <span style={{ fontSize:18, fontWeight:700, color:"#C9933A", fontFamily:"'IBM Plex Sans', sans-serif" }}>{C.currency} {fmt(orderTotal)}</span>
                      </div>
                    )}
                  </div>

                  {/* ── 5. BOTÓN PRINCIPAL FIJO AL FONDO ── */}
                  <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:SHEET_MAX, background:"#F2EDE4", padding:"12px 20px max(20px, env(safe-area-inset-bottom, 20px))", zIndex:150 }}>
                    {(st==="received"||st==="inprogress") && (
                      <button onClick={()=>setConfirmSheet({ type:"done", order:selectedOrder })}
                        style={{ width:"100%", padding:"16px", background:"#1B3F45", color:"white", border:"none", borderRadius:14, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:16, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                        <Icon name="check" size={18} color="#C9933A"/> {t("markCompletedBtn")}
                      </button>
                    )}
                    {st==="done" && (
                      <button onClick={()=>setConfirmSheet({ type:"invoice", order:selectedOrder })}
                        style={{ width:"100%", padding:"16px", background:"#C9933A", color:"white", border:"none", borderRadius:14, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:16, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                        <Icon name="invoice" size={18} color="white"/> {t("createInvoiceBtn")}
                      </button>
                    )}
                    {st==="invoiced" && (()=>{
                      const linkedInv = invoices.find(inv=>inv.items&&inv.items.some(it=>it.orderRef===selectedOrder.id));
                      return (
                        <div style={{ display:"flex", gap:10 }}>
                          <button onClick={()=>setWorkOrderPreview(selectedOrder)}
                            style={{ flex:1, padding:"15px 8px", background:"#E0EDEF", color:"#1B3F45", border:"none", borderRadius:14, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                            <Icon name="print" size={16} color="#1B3F45"/> {t("workOrderBtn")}
                          </button>
                          <button onClick={()=>{ if(linkedInv){ printInvoiceDoc(linkedInv); setInvoices(invoices.map(i=>i.id===linkedInv.id?{...i,printed:true}:i)); } else showToast(t("invoiceNotFound"),"#da1e28"); }}
                            style={{ flex:1, padding:"15px 8px", background:"#1B3F45", color:"white", border:"none", borderRadius:14, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                            <Icon name="invoice" size={16} color="#C9933A"/> {t("printInvoiceBtn")}
                          </button>
                        </div>
                      );
                    })()}
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
          {invView==="list" && (()=>{
            const invClients = [...new Set(invoices.map(i=>i.client).filter(Boolean))].sort();
            const filtered = [...invoices].reverse().filter(inv => {
              if(filterInvStatus === "printed" && !inv.printed) return false;
              if(filterInvStatus === "unprinted" && inv.printed) return false;
              if(filterInvClient !== "all" && inv.client !== filterInvClient) return false;
              return true;
            });
            const totalFiltered = filtered.reduce((s,inv)=>s+(inv.items.reduce((ss,it)=>ss+lineTotal(it),0)*(1+C.taxRate)+(parseFloat(inv.porto)||0)),0);
            return (
              <>
                {/* Header */}
                <div style={{ padding: isDesktop?"32px 40px 20px":isTablet?"max(32px, env(safe-area-inset-top, 32px)) 32px 16px":"max(56px, env(safe-area-inset-top, 56px)) 22px 16px", background:"white" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:24, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.02em" }}>{t("invoicesTitle")}</div>
                      {invoices.length > 0 && <div style={{ fontSize:13, color:"#5A7A80", marginTop:3, fontWeight:500 }}>{invoices.length} invoice{invoices.length!==1?"s":""} · {invoices.filter(i=>!i.printed).length} unprinted</div>}
                    </div>
                    <button onClick={()=>{ setInvClient(""); setInvClientAddress(""); setInvDate(new Date().toISOString().split("T")[0]); setInvPorto(""); setItems([newItem()]); setInvNumber(""); setInvView("new"); }}
                      style={{ background:"#C9933A", color:"white", border:"none", borderRadius:14, padding:"10px 18px", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"'IBM Plex Sans', sans-serif", letterSpacing:"-0.01em" }}>
                      {t("newBtn")}
                    </button>
                  </div>
                </div>

                {/* Filters + cards */}
                <div style={{ padding: isDesktop?"0 40px 60px":isTablet?"16px 32px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))":"16px 16px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>

                  {invoices.length > 0 && (
                    <>
                      {/* Status pills */}
                      <div className="pills-row" style={{ marginBottom:10 }}>
                        {[
                          { key:"all",       label:t("allFilter"),           count: invoices.length },
                          { key:"unprinted", label:t("unprintedFilter"),   count: invoices.filter(i=>!i.printed).length },
                          { key:"printed",   label:t("printedFilter"),     count: invoices.filter(i=>i.printed).length  },
                        ].map(({key, label, count}) => (
                          <button key={key} onClick={()=>setFilterInvStatus(key)}
                            style={{ padding:"8px 16px", borderRadius:100, border:"none", background: filterInvStatus===key?"#1B3F45":"white", fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", color: filterInvStatus===key?"white":"#5A7A80", flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                            {label}&nbsp;<span style={{ fontWeight:500, opacity:0.6 }}>{count}</span>
                          </button>
                        ))}
                      </div>

                      {/* Client filter */}
                      {invClients.length > 1 && (
                        <div style={{ marginBottom:14 }}>
                          <select value={filterInvClient} onChange={e=>setFilterInvClient(e.target.value)}
                            style={{ ...selectBase, fontSize:13, padding:"10px 36px 10px 12px", color: filterInvClient!=="all"?"#1B3F45":"#5A7A80" }}>
                            <option value="all">{t("allClients")}</option>
                            {invClients.map(c=><option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      )}

                      {/* Results summary */}
                      {(filterInvStatus!=="all" || filterInvClient!=="all") && filtered.length > 0 && (
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, padding:"0 2px" }}>
                          <span style={{ fontSize:12, color:"#9DB5B9", fontWeight:500 }}>{filtered.length} result{filtered.length!==1?"s":""}</span>
                          <span style={{ fontSize:13, fontWeight:800, color:"#1B3F45" }}>{C.currency} {fmt(totalFiltered)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {invoices.length === 0 && (
                    <div style={{ textAlign:"center", padding:"48px 24px" }}>
                      <div style={{ width:72, height:72, borderRadius:22, background:PASTELS.invoice, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}><Icon name="receipt" size={32} color="#5A7A80"/></div>
                      <div style={{ fontSize:17, fontWeight:800, color:"#1B3F45", marginBottom:6, letterSpacing:"-0.01em" }}>{t("noInvoicesYet")}</div>
                      <div style={{ fontSize:13, color:"#5A7A80", lineHeight:1.6 }}>{t("noInvoicesDesc").split("\n").map((l,i)=><span key={i}>{l}{i===0&&<br/>}</span>)}</div>
                    </div>
                  )}

                  {invoices.length > 0 && filtered.length === 0 && (
                    <div style={{ textAlign:"center", padding:"40px 24px", color:"#9DB5B9", fontSize:14 }}>{t("noInvoicesMatch")}</div>
                  )}

                  {filtered.map((inv) => {
                    const invTotal = roundCHF(inv.items.reduce((s,it)=>s+lineTotal(it),0)*(1+C.taxRate) + (parseFloat(inv.porto)||0));
                    return (
                      <button key={inv.id} onClick={()=>{ setSelectedInvoice(inv); setInvView("detail"); }}
                        style={{ width:"100%", background:"white", border:"1.5px solid #F0EDE8", borderRadius:20, padding:"18px 16px", marginBottom:10, display:"flex", alignItems:"center", gap:14, cursor:"pointer", textAlign:"left", boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
                        <div style={{ width:46, height:46, borderRadius:14, background: inv.printed?"#E8F3EF":"#F0F6F7", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <Icon name="receipt" size={22} color={inv.printed?"#1B6048":"#5A7A80"}/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:16, fontWeight:800, color:"#1B3F45", letterSpacing:"-0.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{inv.client || "—"}</div>
                          <div style={{ fontSize:13, color:"#5A7A80", fontWeight:500, marginTop:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{inv.number} · {new Date(inv.date+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontSize:16, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.01em" }}>{C.currency} {fmt(invTotal)}</div>
                          <span style={{ fontSize:11, fontWeight:700, color: inv.printed?"#198038":"#C9933A", marginTop:3, display:"block" }}>{inv.printed?t("printedFilter"):t("savedStatus")}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {/* ── NEW INVOICE VIEW ── */}
          {invView==="new" && (()=>{
            const draftSub   = items.reduce((s,it)=>s+lineTotal(it),0);
            const draftPorto = parseFloat(invPorto)||0;
            const draftTax   = draftSub * C.taxRate;
            const draftTotal = roundCHF(draftSub + draftPorto + draftTax);
            // Orders done but not yet invoiced (exclude already linked)
            const syncInvoiceToSheets = (inv) => {
              const url = C.sheetsUrl || process.env.REACT_APP_SHEETS_URL;
              if (!url) return;
              const sub   = inv.items.reduce((s, it) => s + lineTotal(it), 0);
              const porto = parseFloat(inv.porto) || 0;
              const mwst  = sub * C.taxRate;
              const total = roundCHF(sub + porto + mwst);
              const payload = {
                sheet: "Facturas",
                invoiceNumber: inv.number,
                date: inv.date,
                client: inv.client,
                clientAddress: inv.clientAddress || "",
                items: inv.items.map(it => ({
                  desc: it.desc||"",
                  qty: parseFloat(it.qty) || 1,
                  unitPrice: parseFloat(it.unitPrice) || parseFloat(it.price) || 0,
                  total: lineTotal(it),
                })),
                subtotal: sub,
                mwst: mwst,
                porto: porto,
                total: total,
              };
              // GAS requires no-cors + text/plain to avoid preflight rejection
              fetch(url, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify(payload),
              }).catch(err => console.error("[Sheets] Invoice sync failed:", err));
            };

            const saveInvoice = (print) => {
              const validItems = items.filter(it=>it.desc||it.unitPrice||it.price).map(it=>({...it, price: String(lineTotal(it))}));
              const inv = {
                id: Date.now(),
                number: invNumber || genClientInvNumber(invoices, invClient),
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
              syncInvoiceToSheets(inv);
              if(print) printInvoiceDoc(inv);
              if(isDriveConnected()) uploadInvoiceToDrive(inv);
              setInvView("list");
              showToast("Invoice saved","#198038");
            };
            return (
              <>
                {/* Header with live total */}
                <div style={{ padding: isDesktop?"32px 40px 20px":isTablet?"max(32px, env(safe-area-inset-top, 32px)) 32px 20px":"max(56px, env(safe-area-inset-top, 56px)) 22px 20px", background:"white" }}>
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

                <div style={{ padding: isDesktop?"0 40px 60px":isTablet?"0 32px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))":"0 22px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>

                  {/* Client + date */}
                  <Card>
                    <Field label="Client *">
                      {clients.length > 0
                        ? <Select value={invClient} onChange={e=>{
                            const sel = clients.find(c=>c.name===e.target.value || c.company===e.target.value);
                            setInvClient(e.target.value);
                            setInvClientAddress(sel ? [sel.company&&sel.name?sel.company:"", sel.address].filter(Boolean).join("\n") : "");
                            setInvNumber(genClientInvNumber(invoices, e.target.value));
                          }}>
                            <option value="">— Select client —</option>
                            {clients.map(c=><option key={c.id} value={c.company||c.name}>{c.company||c.name}{c.company&&c.name?" ("+c.name+")":""}</option>)}
                          </Select>
                        : <Input placeholder="Company name" value={invClient} onChange={e=>setInvClient(e.target.value)}/>
                      }
                    </Field>
                    <Field label="Invoice number">
                      <Input placeholder="R12026" value={invNumber} onChange={e=>setInvNumber(e.target.value)}/>
                    </Field>
                    <Field label="Date"><Input type="date" value={invDate} onChange={e=>setInvDate(e.target.value)}/></Field>
                  </Card>

                  {/* ── POSTAGE — callout prominente ── */}
                  <div style={{ background: invPorto ? "#F0F9F4" : "#FBF5E8", border: invPorto ? "1.5px solid #9FCFBC" : "1.5px solid #E8C97A", borderRadius:16, padding:"16px 18px", marginBottom:16, transition:"all 0.2s" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background: invPorto ? "#C0E8D8" : "#F0DDB0", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background 0.2s" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={invPorto ? "#1B6048" : "#8A6220"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16v-2"/>
                          <path d="M12 22V12M2.5 7.5l9.5 5.5 9.5-5.5"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize:15, fontWeight:800, color: invPorto ? "#1B6048" : "#8A6220", fontFamily:"'IBM Plex Sans', sans-serif" }}>
                          Postage ({C.currency})
                        </div>
                        <div style={{ fontSize:12, color: invPorto ? "#3B8060" : "#BA9B55", marginTop:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>
                          {invPorto ? `${C.currency} ${fmt(parseFloat(invPorto))} included` : "Don't forget to add shipping cost"}
                        </div>
                      </div>
                    </div>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={invPorto}
                      onChange={e=>setInvPorto(e.target.value)}
                      style={{ width:"100%", padding:"14px 16px", fontSize:18, fontWeight:700, color:"#1B3F45",
                        border: invPorto ? "2px solid #9FCFBC" : "2px solid #E8C97A",
                        borderRadius:12, fontFamily:"'IBM Plex Sans', sans-serif",
                        background:"white", outline:"none", boxSizing:"border-box", transition:"border 0.2s" }}/>
                  </div>


                  {/* Items — all, whether from order or manual */}
                  <SectionTitle>{t("itemsLabel")}</SectionTitle>
                  {items.map((it,idx)=>{ const mv=(a,f,t)=>{const b=[...a];const[x]=b.splice(f,1);b.splice(t,0,x);return b;}; return (
                    <Card key={it.id}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <button onClick={()=>idx>0&&setItems(mv(items,idx,idx-1))} style={{ background:"none", border:"none", cursor:"pointer", padding:2, opacity:idx===0?0.25:1 }}><Icon name="arrowUp" size={13} color="#5A7A80"/></button>
                          <button onClick={()=>idx<items.length-1&&setItems(mv(items,idx,idx+1))} style={{ background:"none", border:"none", cursor:"pointer", padding:2, opacity:idx===items.length-1?0.25:1 }}><Icon name="arrowDown" size={13} color="#5A7A80"/></button>
                          <div style={{ fontSize:13, fontWeight:700, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.06em" }}>Item {idx+1}</div>
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
                      {lineTotal(it) > 0 && <div style={{ fontSize:13, color:"#5A7A80", marginTop:4 }}>Total: <strong style={{color:"#1B3F45"}}>{C.currency} {fmt(lineTotal(it))}</strong></div>}
                    </Card>
                  );})}

                  <button onClick={()=>setItems([...items,newItem()])} style={{ width:"100%", padding:"13px", background:"white", border:"2px dashed #E8E4DC", borderRadius:14, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:14, fontWeight:600, color:"#5A7A80", cursor:"pointer", marginBottom:10 }}>{t("addItemBtn")}</button>

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
                          <option value="">{t("addFromOrder")}</option>
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
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:6 }}><span>{t("subtotalLabel")}</span><span>{C.currency} {fmt(draftSub)}</span></div>
                      {draftPorto>0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:6 }}><span>{t("postageLabel")}</span><span>{C.currency} {fmt(draftPorto)}</span></div>}
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:10 }}><span>{C.taxLabel} {(C.taxRate*100).toFixed(1)}%</span><span>{C.currency} {fmt(draftTax)}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid rgba(255,255,255,0.15)", paddingTop:12 }}>
                        <span style={{ fontSize:16, fontWeight:700, color:"white" }}>{t("totalLabel")}</span>
                        <span style={{ fontSize:22, fontWeight:800, color:"white" }}>{C.currency} {fmt(draftTotal)}</span>
                      </div>
                    </Card>
                  )}

                  {/* Warning if postage is empty */}
                  {draftSub > 0 && !invPorto && (
                    <div style={{ background:"#FBF5E8", border:"1px solid #E8C97A", borderRadius:12, padding:"12px 14px", marginBottom:14, display:"flex", alignItems:"flex-start", gap:10 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A6220" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:1 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:"#8A6220", fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("postageNotAdded")}</div>
                        <div style={{ fontSize:12, color:"#BA9B55", marginTop:2, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("postageScrollUp")}</div>
                      </div>
                    </div>
                  )}
                  <button disabled={!invClient||items.every(it=>!it.desc&&!it.price)}
                    onClick={()=>saveInvoice(true)}
                    style={{ width:"100%", padding:"16px", background: (!invClient||items.every(it=>!it.desc&&!it.price))?"#C6C6C6":"#1B3F45", color:"white", border:"none", borderRadius:14, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:16, fontWeight:700, cursor: (!invClient||items.every(it=>!it.desc&&!it.price))?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    <Icon name="invoice" size={18} color={(!invClient||items.every(it=>!it.desc&&!it.price)) ? "white" : "#C9933A"}/> {t("saveInvoiceBtn")}
                  </button>
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
            const invTotal = roundCHF(invSub + invPortoVal + invMwst);
            return (
              <>
                <div style={{ padding: isDesktop?"32px 40px 20px":isTablet?"max(32px, env(safe-area-inset-top, 32px)) 32px 20px":"max(56px, env(safe-area-inset-top, 56px)) 22px 20px", background:"white" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <button onClick={()=>{ setSelectedInvoice(null); setInvView("list"); }} style={{ width:36, height:36, borderRadius:11, background:"#F0F6F7", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="back" size={18} color="#1B3F45"/></button>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:22, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.02em" }}>{inv.number}</div>
                      {inv.client && <div style={{ fontSize:13, color:"#5A7A80", marginTop:2, fontWeight:500 }}>{inv.client}</div>}
                    </div>
                    <button onClick={()=>showConfirm(`${t("deleteOrderConfirm")} ${inv.number}? ${t("cannotUndone")}.`,()=>{ setInvoices(invoices.filter(i=>i.id!==inv.id)); setSelectedInvoice(null); setInvView("list"); showToast(t("invoiceDeleted"),"#da1e28"); })} style={{ width:36, height:36, borderRadius:11, background:"#fff1f1", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="trash" size={17} color="#da1e28"/></button>
                  </div>
                </div>
                <div style={{ padding: isDesktop?"20px 40px 100px":isTablet?"20px 32px max(110px, calc(90px + env(safe-area-inset-bottom, 0px)))":"20px 16px max(110px, calc(90px + env(safe-area-inset-bottom, 0px)))" }}>

                  {/* ── INVOICE PREVIEW CARD ── */}
                  <div style={{ background:"white", border:"1.5px solid #E8E4DC", borderRadius:16, padding:"28px 24px", marginBottom:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
                    {/* Header */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                      <img src="/logo.png" alt={C.businessName} style={{ height:52, objectFit:"contain" }}/>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:10, color:"#E8E4DC", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>Rechnung</div>
                        <div style={{ fontSize:13, fontFamily:"monospace", fontWeight:700, color:"#1B3F45", marginTop:2 }}>{inv.number}</div>
                        <div style={{ fontSize:11, color:"#5A7A80" }}>{new Date(inv.date+"T12:00:00").toLocaleDateString("de-CH")}</div>
                        <div style={{ fontSize:11, marginTop:6, padding:"2px 8px", borderRadius:6, display:"inline-block", background: inv.printed?"#34C75920":"#FF950020", color: inv.printed?"#198038":"#C9933A", fontWeight:700 }}>{inv.printed?t("printedFilter"):t("savedStatus")}</div>
                      </div>
                    </div>

                    {/* To */}
                    <div style={{ background:"#F0F6F7", borderRadius:10, padding:"10px 14px", marginBottom:18, textAlign:"left" }}>
                      <div style={{ fontSize:9, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:700, marginBottom:3 }}>To</div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#1B3F45" }}>{inv.client}</div>
                      {inv.clientAddress && <div style={{ fontSize:12, color:"#5A7A80", marginTop:2, whiteSpace:"pre-line", lineHeight:1.5 }}>{inv.clientAddress}</div>}
                    </div>

                    {/* Items table */}
                    <table className="inv-table" style={{ width:"100%", borderCollapse:"collapse", marginBottom:12, tableLayout:"fixed" }}>
                      <colgroup className="inv-table">
                        <col style={{ width:"48%" }}/>
                        <col style={{ width:"10%" }}/>
                        <col className="hide-xs" style={{ width:"20%" }}/>
                        <col style={{ width:"22%" }}/>
                      </colgroup>
                      <thead>
                        <tr style={{ borderBottom:"1.5px solid #E8E4DC" }}>
                          <th style={{ textAlign:"left", fontSize:10, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.07em", padding:"4px 4px 8px 0", fontWeight:700 }}>Descripción</th>
                          <th style={{ textAlign:"right", fontSize:10, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.07em", padding:"4px 0 8px", fontWeight:700 }}>Cant.</th>
                          <th className="hide-xs" style={{ textAlign:"right", fontSize:10, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.07em", padding:"4px 0 8px", fontWeight:700 }}>Precio</th>
                          <th style={{ textAlign:"right", fontSize:10, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.07em", padding:"4px 0 8px", fontWeight:700 }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items.map((it,i)=>{
                          const qty = parseFloat(it.qty)||1;
                          const unit = parseFloat(it.unitPrice)||parseFloat(it.price)||0;
                          const tot = qty * unit;
                          return (
                            <tr key={i} style={{ borderBottom:"1px solid #E8E4DC" }}>
                              <td style={{ padding:"8px 4px 8px 0", verticalAlign:"top" }}>
                                <div style={{ fontSize:13, fontWeight:600, color:"#1B3F45", wordBreak:"break-word", lineHeight:1.4 }}>{it.desc||"—"}</div>
                              </td>
                              <td style={{ padding:"8px 0", textAlign:"right", fontSize:13, color:"#5A7A80", verticalAlign:"top" }}>{qty}</td>
                              <td className="hide-xs" style={{ padding:"8px 0", textAlign:"right", fontSize:12, color:"#5A7A80", verticalAlign:"top" }}>{C.currency} {fmt(unit)}</td>
                              <td style={{ padding:"8px 0", textAlign:"right", fontSize:13, fontWeight:700, color:"#1B3F45", verticalAlign:"top" }}>{C.currency} {fmt(tot)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Totals */}
                    <div style={{ borderTop:"1px solid #E8E4DC", paddingTop:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"1px solid #E8E4DC", paddingBottom:10, marginBottom:8 }}>
                        <span style={{ fontSize:15, fontWeight:700, color:"#1B3F45" }}>{t("subtotalLabel")}</span>
                        <span style={{ fontSize:18, fontWeight:800, color:"#1B3F45" }}>{C.currency} {fmt(invSub)}</span>
                      </div>
                      {invPortoVal>0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#5A7A80", marginBottom:4 }}><span>{t("postageLabel")}</span><span>{C.currency} {fmt(invPortoVal)}</span></div>}
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#5A7A80", marginBottom:10 }}><span>{C.taxLabel} {(C.taxRate*100).toFixed(1)}%</span><span>{C.currency} {fmt(invMwst)}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", borderTop:"2px solid #1C1C1E", paddingTop:10 }}>
                        <span style={{ fontSize:15, fontWeight:700, color:"#1B3F45" }}>{t("totalLabel")}</span>
                        <span style={{ fontSize:18, fontWeight:800, color:ACCENT }}>{C.currency} {fmt(invTotal)}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid #E8E4DC", fontSize:10, color:"#5A7A80", lineHeight:1.7 }}>
                      {C.paymentTerms}<br/>{C.bankDetails}<br/>MWST-Nr. {C.vatId}
                    </div>
                  </div>

                  {/* Botón fijo al fondo */}
                  <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:SHEET_MAX, background:"#F2EDE4", padding:"12px 20px max(20px, env(safe-area-inset-bottom, 20px))", zIndex:150 }}>
                    <button onClick={()=>{ printInvoiceDoc(inv); setInvoices(invoices.map(i=>i.id===inv.id?{...i,printed:true}:i)); setSelectedInvoice({...inv,printed:true}); }}
                      style={{ width:"100%", padding:"16px", background:"#1B3F45", color:"white", border:"none", borderRadius:14, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:16, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      <Icon name="print" size={18} color="#C9933A"/> {t("printInvoiceBtn")}
                    </button>
                  </div>
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
          <div style={{ padding: isDesktop?"32px 40px 20px":isTablet?"max(32px, env(safe-area-inset-top, 32px)) 32px 20px":"max(56px, env(safe-area-inset-top, 56px)) 22px 20px", background:"white" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                {clientView!=="list" && (
                  <button onClick={()=>setClientView("list")} style={{ width:36, height:36, borderRadius:11, background:"#F0F6F7", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="back" size={18} color="#1B3F45"/></button>
                )}
                <div>
                  <div style={{ fontSize: clientView==="list"?28:22, fontWeight:900, color:"#1B3F45", letterSpacing:"-0.02em", lineHeight:1.1 }}>
                    {clientView==="list" ? t("clientsTitle") : clientView==="new" ? t("newClientTitle") : clientView==="edit" ? t("editClientTitle") : (clients.find(c=>c.id===selectedClientId)?.company || clients.find(c=>c.id===selectedClientId)?.name || t("clientsTitle"))}
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
                <button onClick={()=>{ setClientDraft({...clients.find(c=>c.id===selectedClientId)}); setClientView("edit"); }} style={{ background:"#F0F6F7", border:"none", cursor:"pointer", padding:"8px 14px", borderRadius:10, fontSize:13, fontWeight:700, color:"#1B3F45" }}>{t("editLabel")}</button>
              )}
            </div>
          </div>

          <div style={{ padding: isDesktop?"20px 40px 60px":isTablet?"20px 32px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))":"20px 16px max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>

            {/* ── LIST ── */}
            {clientView==="list" && (
              <>
                {clients.length === 0 && (
                  <div style={{ textAlign:"center", padding:"48px 24px" }}>
                    <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}><Icon name="users" size={48} color="#E8E4DC"/></div>
                    <div style={{ fontSize:15, fontWeight:600, color:"#1B3F45", marginBottom:6 }}>{t("noClientsYet")}</div>
                    <div style={{ fontSize:13, color:"#5A7A80", lineHeight:1.6, marginBottom:24 }}>{t("noClientsDesc")}</div>
                    <BtnPrimary onClick={()=>{ setClientDraft(newClient()); setClientView("new"); }} style={{ maxWidth:220, margin:"0 auto" }}>{t("addClientBtn")}</BtnPrimary>
                  </div>
                )}
                {clients.length > 0 && (
                  <div style={{ background:"white", borderRadius:16, border:"0.5px solid #E8E4DC", overflow:"hidden" }}>
                    {clients.map((c, idx) => {
                      const name = c.company || c.name;
                      const initials = name.split(" ").map(w=>w[0]||"").join("").slice(0,2).toUpperCase();
                      const orderCount = orders.filter(o=>o.clientId===c.id||o.client===name).length;
                      return (
                        <button key={c.id} onClick={()=>{ setSelectedClientId(c.id); setClientView("detail"); }}
                          style={{ width:"100%", background:"white", border:"none", borderTop: idx>0?"0.5px solid #F0F0EE":"none", padding:"14px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:14, textAlign:"left" }}>
                          <div style={{ width:42, height:42, borderRadius:"50%", background:"#1B3F45", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <span style={{ fontSize:14, fontWeight:700, color:"#C9933A", letterSpacing:"0.02em" }}>{initials}</span>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:15, fontWeight:700, color:"#1B3F45", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</div>
                            <div style={{ fontSize:12, color:"#9DB5B9", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {orderCount > 0 ? `${orderCount} ${lang==="de"?(orderCount===1?"Auftrag":"Aufträge"):(orderCount===1?"order":"orders")}` : c.address?.split("\n")[0] || t("noOrdersYet")}
                            </div>
                          </div>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C8C4BC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── NEW / EDIT FORM ── */}
            {(clientView==="new" || clientView==="edit") && (
              <div style={{ padding:"0 16px" }}>
                {/* Campo principal — empresa */}
                <div style={{ marginBottom:12 }}>
                  <input
                    autoFocus={clientView==="new"}
                    placeholder="Company name *"
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
                    { key:"address", placeholder:"Address", type:"text",
                      icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9DB5B9" strokeWidth="2" strokeLinecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg> },
                    { key:"phone",   placeholder:"Phone",     type:"tel",
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
                  <span style={{ fontSize:11, color:"#9DB5B9" }}>Address, phone and email are optional</span>
                </div>
                {clientView==="edit" && (
                  <button onClick={()=>showConfirm("Delete this client? Their orders will be kept.",()=>{ setClients(clients.filter(c=>c.id!==clientDraft.id)); setClientView("list"); showToast("Client deleted","#da1e28"); })}
                    style={{ background:"none", border:"none", color:"#da1e28", fontSize:13, fontWeight:600, cursor:"pointer", padding:"0 0 16px", display:"block" }}>
                    Delete client
                  </button>
                )}
                <button
                  disabled={!clientDraft.company && !clientDraft.name}
                  onClick={()=>{
                    if(!clientDraft.company && !clientDraft.name) return;
                    if(clientView==="edit"){
                      setClients(clients.map(c=>c.id===clientDraft.id ? clientDraft : c));
                      setClientView("detail");
                      showToast("Client updated");
                    } else {
                      const c = { ...clientDraft, id: String(Date.now()) };
                      setClients([...clients, c]);
                      setClientView("list");
                      showToast("Client saved");
                    }
                  }}
                  style={{ width:"100%", padding:"18px", border:"none", borderRadius:16,
                    background:(clientDraft.company||clientDraft.name)?"#C9933A":"#E8E4DC",
                    color:(clientDraft.company||clientDraft.name)?"white":"#9DB5B9",
                    fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:700,
                    cursor:(clientDraft.company||clientDraft.name)?"pointer":"default",
                    boxShadow:(clientDraft.company||clientDraft.name)?"0 4px 14px rgba(201,147,58,0.3)":"none",
                    transition:"all 0.15s" }}>
                  {clientView==="edit" ? t("saveChangesBtn") : t("saveClientBtn")}
                </button>
              </div>
            )}

            {/* ── DETAIL ── */}
            {clientView==="detail" && (() => {
              const c = clients.find(x=>x.id===selectedClientId);
              if(!c) return null;
              const clientName = c.company || c.name;
              const clientOrders = orders.filter(o=>o.clientId===c.id||o.client===clientName);
              const clientInvoices = invoices.filter(inv=>inv.client===clientName).sort((a,b)=>b.date?.localeCompare(a.date||"")||0);
              const totalInvoiced = clientInvoices.reduce((s,inv)=>s+roundCHF(inv.items.reduce((ss,it)=>ss+lineTotal(it),0)*(1+C.taxRate)+(parseFloat(inv.porto)||0)),0);
              const openOrders = clientOrders.filter(o=>o.status!=="invoiced").length;
              return (
                <>
                  {/* Info card */}
                  <Card style={{ background:PASTELS.orders, border:"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                      <div style={{ width:52, height:52, borderRadius:16, background:"#1B3F45", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Icon name="person" size={26} color="white"/>
                      </div>
                      <div>
                        <div style={{ fontSize:17, fontWeight:800, color:"#1B3F45", letterSpacing:"-0.01em" }}>{clientName}</div>
                        {c.company && c.name && <div style={{ fontSize:13, color:"#5A7A80" }}>{c.name}</div>}
                      </div>
                    </div>
                    {c.address && (
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:11, color:"#5A7A80", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{t("addressLabel")}</div>
                        <div style={{ fontSize:13, color:"#1B3F45", lineHeight:1.6, whiteSpace:"pre-line" }}>{c.address}</div>
                      </div>
                    )}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      {c.phone && <div><div style={{ fontSize:11, color:"#5A7A80", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{t("phoneLabel")}</div><div style={{ fontSize:13, color:"#1B3F45" }}>{c.phone}</div></div>}
                      {c.email && <div><div style={{ fontSize:11, color:"#5A7A80", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{t("emailLabel")}</div><div style={{ fontSize:13, color:"#1B3F45", wordBreak:"break-all" }}>{c.email}</div></div>}
                    </div>
                  </Card>

                  {/* Stats row */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:8 }}>
                    <div style={{ background:"white", borderRadius:14, padding:"14px 12px", border:"1px solid #E8E4DC", textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:900, color:"#1B3F45", lineHeight:1 }}>{clientOrders.length}</div>
                      <div style={{ fontSize:11, color:"#5A7A80", marginTop:4, fontWeight:500 }}>{lang==="de"?"Aufträge":"Orders"}</div>
                    </div>
                    <div style={{ background:"white", borderRadius:14, padding:"14px 12px", border:"1px solid #E8E4DC", textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:900, color: openOrders>0?"#C9933A":"#1B3F45", lineHeight:1 }}>{openOrders}</div>
                      <div style={{ fontSize:11, color:"#5A7A80", marginTop:4, fontWeight:500 }}>{lang==="de"?"Offen":"Open"}</div>
                    </div>
                    <div style={{ background:"white", borderRadius:14, padding:"14px 12px", border:"1px solid #E8E4DC", textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:900, color:"#1B3F45", lineHeight:1 }}>{clientInvoices.length}</div>
                      <div style={{ fontSize:11, color:"#5A7A80", marginTop:4, fontWeight:500 }}>{lang==="de"?"Rechnungen":"Invoices"}</div>
                    </div>
                  </div>

                  {/* Total invoiced */}
                  {totalInvoiced > 0 && (
                    <div style={{ background:"#1B3F45", borderRadius:14, padding:"16px 18px", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>{lang==="de"?"Gesamtbetrag fakturiert":"Total invoiced"}</div>
                      <div style={{ fontSize:20, fontWeight:900, color:"#C9933A" }}>{C.currency} {fmt(totalInvoiced)}</div>
                    </div>
                  )}

                  {/* Orders section */}
                  <SectionTitle>Orders ({clientOrders.length})</SectionTitle>
                  {clientOrders.length === 0 && (
                    <div style={{ textAlign:"center", padding:"24px", color:"#5A7A80", fontSize:13 }}>{t("noOrdersForClient")}</div>
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
                  <BtnPrimary onClick={()=>{ setView("new"); setDraft({...newOrder(), clientId:c.id, client: clientName}); setTab("orders"); }} style={{ marginTop:8 }}>
                    {t("newOrderForClient")}
                  </BtnPrimary>

                  {/* Invoices section */}
                  <SectionTitle style={{ marginTop:24 }}>{lang==="de"?"Rechnungen":"Invoices"} ({clientInvoices.length})</SectionTitle>
                  {clientInvoices.length === 0 && (
                    <div style={{ textAlign:"center", padding:"24px", color:"#5A7A80", fontSize:13 }}>{lang==="de"?"Noch keine Rechnungen für diesen Kunden.":"No invoices for this client yet."}</div>
                  )}
                  {clientInvoices.map(inv=>{
                    const invTotal = roundCHF(inv.items.reduce((s,it)=>s+lineTotal(it),0)*(1+C.taxRate)+(parseFloat(inv.porto)||0));
                    return (
                      <button key={inv.id} onClick={()=>{ setSelectedInvoice(inv); setInvView("detail"); setTab("invoice"); }}
                        style={{ width:"100%", background:"white", border:"1.5px solid #F0EDE8", borderRadius:16, padding:"14px 16px", marginBottom:10, display:"flex", alignItems:"center", gap:14, cursor:"pointer", textAlign:"left", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                        <div style={{ width:40, height:40, borderRadius:12, background:inv.printed?"#E8F3EF":"#F0F6F7", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <Icon name="receipt" size={20} color={inv.printed?"#1B6048":"#5A7A80"}/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:"#1B3F45", marginBottom:2 }}>{inv.number || inv.id}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:12, color:"#5A7A80" }}>{inv.date ? new Date(inv.date+"T12:00:00").toLocaleDateString(lang==="de"?"de-CH":"en-GB") : ""}</span>
                            {inv.printed
                              ? <span style={{ fontSize:11, fontWeight:700, color:"#1B6048", background:"#E8F3EF", borderRadius:6, padding:"1px 7px" }}>{lang==="de"?"Gedruckt":"Printed"}</span>
                              : <span style={{ fontSize:11, fontWeight:700, color:"#5A7A80", background:"#F0F6F7", borderRadius:6, padding:"1px 7px" }}>{lang==="de"?"Ausstehend":"Pending"}</span>
                            }
                          </div>
                        </div>
                        <div style={{ fontSize:15, fontWeight:800, color:ACCENT, flexShrink:0 }}>{C.currency} {fmt(invTotal)}</div>
                      </button>
                    );
                  })}
                </>
              );
            })()}

          </div>
        </div>
      )}

      {/* ── BOTTOM NAV (mobile only, hidden during wizard) ── */}
      {!isDesktop && !(tab==="orders" && view==="new") && (
        <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:WRAP_MAX, background:"#ffffff", borderTop:"none", boxShadow:"0 -4px 20px rgba(27,63,69,0.07)", display:"flex", padding:"8px 0 max(24px, env(safe-area-inset-bottom, 24px))", zIndex:100 }}>
          {[
            { key:"home",    icon:"orders",  label:t("tabHome")    },
            { key:"scan",    icon:"chart",   label:t("tabScan")    },
            { key:"orders",  icon:"gem",     label:t("tabOrders")  },
            { key:"clients", icon:"person",  label:t("tabClients") },
            { key:"invoice", icon:"invoice", label:t("tabInvoice") },
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
                        {isPast&&!isToday
                          ? (lang==="de" ? `${dayOrders.length} überfällige Lieferung${dayOrders.length>1?"en":""}` : `${dayOrders.length} overdue deliver${dayOrders.length>1?"ies":"y"}`)
                          : (lang==="de" ? `${dayOrders.length} Lieferung${dayOrders.length>1?"en":""} heute` : `${dayOrders.length} deliver${dayOrders.length>1?"ies":"y"} today`)}
                      </div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,0.85)" }}>{lang==="de"?"Diese Aufträge sind noch ausstehend":"These orders are still pending"}</div>
                    </div>
                  </div>
                )}

                {/* Pending orders */}
                {dayOrders.length > 0 && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("pendingStatus")} · {dayOrders.length}</div>
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
                    <div style={{ fontSize:11, fontWeight:700, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, marginTop:4, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("completedLabel")} · {doneOrders.length}</div>
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
                  <div style={{ textAlign:"center", padding:"20px 0 8px", color:"#E8E4DC", fontSize:13 }}>{t("noOrdersForDay")}</div>
                )}

                {/* Add order for this day */}
                <button onClick={()=>{ setDayModal(null); setDraft({...newOrder(), deadline:d}); setView("new"); setTab("orders"); }}
                  style={{ width:"100%", padding:"13px", background:"#F0F6F7", border:"none", borderRadius:14, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:700, color:"#1B3F45", cursor:"pointer", marginTop:4, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <Icon name="plus" size={16} color="#1B3F45"/> {t("addOrderForDay")}
                </button>

                {/* Notes */}
                <div style={{ marginTop:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontFamily:"'IBM Plex Sans', sans-serif", display:"flex", alignItems:"center", gap:6 }}>
                    {t("notesLabel")}
                    {alertOn && <span style={{ fontSize:10, color:ACCENT, background:`${ACCENT}15`, padding:"2px 7px", borderRadius:6, fontWeight:700 }}>{t("activeAlert")}</span>}
                  </div>
                  <Textarea
                    placeholder={t("notePlaceholder")}
                    value={noteText}
                    onChange={e=>setDayNotes(n=>({...n,[d]:{...(n[d]||{}),text:e.target.value}}))}
                    rows={3}
                  />
                  {alertOn && <div style={{ fontSize:11, color:"#5A7A80", marginTop:6 }}>{t("alertInfo")}</div>}
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
                <div style={{ fontSize:17, fontWeight:800, color:"#1B3F45", letterSpacing:"-0.01em" }}>{t("noteForToday")}</div>
                <div style={{ fontSize:12, color:"#5A7A80", fontWeight:500 }}>{new Date(noteAlert.date+"T12:00:00").toLocaleDateString("en-GB",{ weekday:"long", day:"numeric", month:"long" })}</div>
              </div>
            </div>
            <div style={{ background:PASTELS.scan, borderRadius:14, padding:"14px 16px", fontSize:14, color:"#1B3F45", lineHeight:1.6, marginBottom:20, whiteSpace:"pre-wrap", fontWeight:500 }}>{noteAlert.text}</div>
            <button onClick={()=>setNoteAlert(null)} style={{ width:"100%", padding:"16px", background:"#1B3F45", color:"white", border:"none", borderRadius:16, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:700, cursor:"pointer" }}>{t("gotItBtn")}</button>
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
            <div style={{ fontSize:22, fontWeight:900, color:"#1B3F45", textAlign:"center", marginBottom:8, letterSpacing:"-0.02em" }}>{t("orderCompletedTitle")}</div>
            <div style={{ fontSize:14, color:"#5A7A80", textAlign:"center", marginBottom:28, lineHeight:1.6, fontWeight:500 }}>{t("createInvoicePrompt")}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={()=>{ setDoneModal(null); setView("detail"); showToast(t("markedAsDone"),"#198038"); }}
                style={{ width:"100%", padding:"16px", background:"#F0F6F7", border:"none", borderRadius:16, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:700, color:"#1B3F45", cursor:"pointer" }}>
                {t("notNowBtn")}
              </button>
              <button onClick={()=>{
                const o = orders.find(x=>x.id===doneModal);
                setDoneModal(null);
                if(o) loadOrderIntoInvoice(o);
              }}
                style={{ width:"100%", padding:"16px", background:"#1B3F45", border:"none", borderRadius:16, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:700, color:"white", cursor:"pointer" }}>
                {t("yesCreateInvoice")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── OPTIONS MENU (···) ── */}
      {optionsMenu && (
        <div style={{ position:"fixed", inset:0, background:"rgba(27,63,69,0.35)", zIndex:3000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
             onClick={()=>setOptionsMenu(null)}>
          <div style={{ background:"white", borderRadius:"14px 14px 0 0", padding:"12px 0 max(28px, env(safe-area-inset-bottom, 28px))", width:"100%", maxWidth:SHEET_MAX, animation:"fadeUp 0.2s ease" }}
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
                <div style={{ fontSize:14, fontWeight:600, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("editOrderMenu")}</div>
                <div style={{ fontSize:11, color:"#9DB5B9", marginTop:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("editOrderSub")}</div>
              </div>
            </button>

            {/* Opción 2 — Duplicar */}
            <button onClick={()=>{
              const copy = {
                ...optionsMenu,
                id: String(Date.now()).slice(-4),
                received: new Date().toISOString().split("T")[0],
                status: "received",
                amount: 0,
                lineItems: (optionsMenu.lineItems||[]).map(li=>({...li, id: Date.now()+Math.random()})),
              };
              setOrders(prev=>[copy, ...prev]);
              setOptionsMenu(null);
              showToast(t("orderDuplicated"), "#1B3F45");
            }} style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 20px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
              <div style={{ width:38, height:38, borderRadius:10, background:"#F0F6F7", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon name="copy" size={18} color="#1B3F45"/>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("duplicateOrderMenu")}</div>
                <div style={{ fontSize:11, color:"#9DB5B9", marginTop:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("duplicateOrderSub")}</div>
              </div>
            </button>

            {/* Opción 3 — Marcar como terminada (solo si no está done/invoiced) */}
            {optionsMenu.status !== "done" && optionsMenu.status !== "invoiced" && (
              <button onClick={()=>{ setOptionsMenu(null); setConfirmSheet({ type:"done", order:optionsMenu }); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 20px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
                <div style={{ width:38, height:38, borderRadius:10, background:"#E8F3EF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon name="check" size={18} color="#1B6048"/>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("markCompletedBtn")}</div>
                  <div style={{ fontSize:11, color:"#9DB5B9", marginTop:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("workCompletedSub")}</div>
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
                  <div style={{ fontSize:14, fontWeight:600, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("createInvoiceBtn")}</div>
                  <div style={{ fontSize:11, color:"#9DB5B9", marginTop:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("createInvoiceForOrder")}</div>
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
                  <div style={{ fontSize:14, fontWeight:600, color:"#A32D2D", fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("deleteOrderBtn")}</div>
                  <div style={{ fontSize:11, color:"#9DB5B9", marginTop:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("cannotUndone")}</div>
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
              <span style={{ fontSize:11, color:"#9DB5B9", fontWeight:500, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("clientFieldLabel")}</span>
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
                <span style={{ fontSize:12, fontWeight:700, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("totalLabel")}</span>
                <span style={{ fontSize:12, fontWeight:800, color:"#C9933A", fontFamily:"'IBM Plex Sans', sans-serif" }}>{C.currency} {fmt(total)}</span>
              </div>
            )}
          </div>
        );

        /* ─── Variante A — Marcar como terminada ─── */
        if(type === "done") return (
          <div style={{ position:"fixed", inset:0, background:"rgba(27,63,69,0.35)", zIndex:3500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
               onClick={close}>
            <div style={{ background:"white", borderRadius:"14px 14px 0 0", padding:"16px 20px max(28px, env(safe-area-inset-bottom, 28px))", width:"100%", maxWidth:SHEET_MAX, animation:"fadeUp 0.2s ease" }}
                 onClick={e=>e.stopPropagation()}>
              <div style={{ width:28, height:3, background:"#E8E4DC", borderRadius:2, margin:"0 auto 16px" }}/>
              <div style={{ fontSize:13, fontWeight:500, color:"#1B3F45", marginBottom:4, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("markCompletedBtn")}</div>
              <div style={{ fontSize:10, color:"#9DB5B9", lineHeight:1.4, marginBottom:16, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("workCompletedSub")}</div>
              <OrderSummary/>
              <button onClick={()=>{
                close();
                setOrders(orders.map(o=>o.id===order.id?{...o,status:"done"}:o));
                showToast(t("markedAsDone"),"#198038");
                setDoneModal(order.id);
              }} style={{ width:"100%", padding:"15px", background:"#1B3F45", color:"white", border:"none", borderRadius:10, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:10 }}>
                <Icon name="check" size={16} color="#C9933A"/> {t("donePromptBtn")}
              </button>
              <button onClick={close} style={{ width:"100%", padding:"13px", background:"none", border:"none", fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:600, color:"#5A7A80", cursor:"pointer" }}>{t("cancelBtn")}</button>
            </div>
          </div>
        );

        /* ─── Variante B — Generar factura ─── */
        if(type === "invoice") return (
          <div style={{ position:"fixed", inset:0, background:"rgba(27,63,69,0.35)", zIndex:3500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
               onClick={close}>
            <div style={{ background:"white", borderRadius:"14px 14px 0 0", padding:"16px 20px max(28px, env(safe-area-inset-bottom, 28px))", width:"100%", maxWidth:SHEET_MAX, animation:"fadeUp 0.2s ease" }}
                 onClick={e=>e.stopPropagation()}>
              <div style={{ width:28, height:3, background:"#E8E4DC", borderRadius:2, margin:"0 auto 16px" }}/>
              <div style={{ fontSize:13, fontWeight:500, color:"#1B3F45", marginBottom:4, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("createInvoiceForOrder")}</div>
              <div style={{ fontSize:10, color:"#9DB5B9", lineHeight:1.4, marginBottom:16, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("invoiceSheetSubtitle")}</div>
              <OrderSummary/>
              <button onClick={()=>{
                close();
                loadOrderIntoInvoice(order);
              }} style={{ width:"100%", padding:"15px", background:"#C9933A", color:"white", border:"none", borderRadius:10, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:10 }}>
                <Icon name="invoice" size={16} color="white"/> {t("confirmCreateInvoiceBtn")}
              </button>
              <button onClick={close} style={{ width:"100%", padding:"13px", background:"none", border:"none", fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:600, color:"#5A7A80", cursor:"pointer" }}>{t("cancelBtn")}</button>
            </div>
          </div>
        );

        /* ─── Variante C — Eliminar ─── */
        if(type === "delete") return (
          <div style={{ position:"fixed", inset:0, background:"rgba(27,63,69,0.35)", zIndex:3500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
               onClick={close}>
            <div style={{ background:"white", borderRadius:"14px 14px 0 0", padding:"16px 20px max(28px, env(safe-area-inset-bottom, 28px))", width:"100%", maxWidth:SHEET_MAX, animation:"fadeUp 0.2s ease" }}
                 onClick={e=>e.stopPropagation()}>
              <div style={{ width:28, height:3, background:"#E8E4DC", borderRadius:2, margin:"0 auto 16px" }}/>
              <div style={{ fontSize:13, fontWeight:500, color:"#1B3F45", marginBottom:4, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("deleteOrderBtn")}</div>
              <div style={{ fontSize:10, color:"#9DB5B9", lineHeight:1.4, marginBottom:14, fontFamily:"'IBM Plex Sans', sans-serif" }}>{t("areYouSure")}</div>
              {/* Advertencia */}
              <div style={{ display:"flex", alignItems:"flex-start", gap:10, background:"#FCEBEB", borderRadius:8, padding:"8px 10px", marginBottom:14 }}>
                <Icon name="alert" size={16} color="#A32D2D"/>
                <span style={{ fontSize:10, color:"#A32D2D", lineHeight:1.4, fontFamily:"'IBM Plex Sans', sans-serif" }}>
                  {t("deleteOrderWarning")}{order.id} — {t("deleteOrderWarning2")}
                </span>
              </div>
              <OrderSummary/>
              <button onClick={()=>{
                close();
                setOrders(orders.filter(o=>o.id!==order.id));
                if(selectedId===order.id) setView("list");
                showToast(t("orderDeletedToast"),"#da1e28");
              }} style={{ width:"100%", padding:"15px", background:"#FCEBEB", color:"#A32D2D", border:"1px solid #F7C1C1", borderRadius:10, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:14, fontWeight:700, cursor:"pointer", marginBottom:10 }}>
                {t("yesDeleteOrder")}
              </button>
              <button onClick={close} style={{ width:"100%", padding:"13px", background:"none", border:"none", fontFamily:"'IBM Plex Sans', sans-serif", fontSize:13, fontWeight:600, color:"#5A7A80", cursor:"pointer" }}>{t("cancelBtn")}</button>
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

      {/* ── CHANGE PASSWORD SHEET ── */}
      {changePwOpen && (
        <>
          <div onClick={()=>{ setChangePwOpen(false); setNewPw(""); setNewPwConfirm(""); setPwError(""); }} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:3000 }}/>
          <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:SHEET_MAX, background:"white", borderRadius:"24px 24px 0 0", padding:"0 0 max(28px, env(safe-area-inset-bottom, 28px))", zIndex:3001 }}>
            <div style={{ padding:"14px 0 0", display:"flex", justifyContent:"center" }}>
              <div style={{ width:36, height:4, borderRadius:2, background:"#E8E4DC" }}/>
            </div>
            <div style={{ padding:"16px 24px 4px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:18, fontWeight:800, color:"#1B3F45" }}>{t("changePwTitle")}</span>
              <button onClick={()=>{ setChangePwOpen(false); setNewPw(""); setNewPwConfirm(""); setPwError(""); }} style={{ background:"#F0F6F7", border:"none", borderRadius:"50%", width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A7A80" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ padding:"12px 24px 0" }}>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:6 }}>{t("newPasswordLabel")}</div>
                <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder={t("pwMinChars")}
                  style={{ width:"100%", padding:"13px 14px", border:"1.5px solid #E8E4DC", borderRadius:12, fontSize:15, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif", outline:"none", boxSizing:"border-box" }}/>
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#5A7A80", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:6 }}>{t("confirmPwLabel")}</div>
                <input type="password" value={newPwConfirm} onChange={e=>setNewPwConfirm(e.target.value)} placeholder={t("repeatPw")}
                  style={{ width:"100%", padding:"13px 14px", border:"1.5px solid #E8E4DC", borderRadius:12, fontSize:15, color:"#1B3F45", fontFamily:"'IBM Plex Sans', sans-serif", outline:"none", boxSizing:"border-box" }}/>
              </div>
              {pwError && <div style={{ fontSize:13, color:"#da1e28", background:"#FFF0F0", border:"1px solid #F7C1C1", borderRadius:10, padding:"10px 12px", marginBottom:14 }}>{pwError}</div>}
              <button onClick={changePassword} disabled={pwLoading}
                style={{ width:"100%", padding:"15px", background: pwLoading?"#E8E4DC":"#1B3F45", color:"white", border:"none", borderRadius:12, fontSize:15, fontWeight:700, cursor: pwLoading?"default":"pointer", fontFamily:"'IBM Plex Sans', sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                {pwLoading ? <><div style={{ width:16, height:16, border:"2px solid white", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/> {t("savingLabel")}</> : t("updatePwBtn")}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── CONFIRM MODAL ── */}
      {confirmModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:3000, display:"flex", alignItems:"flex-end", justifyContent:"center", padding:"0 16px 32px" }}>
          <div style={{ background:"white", borderRadius:24, padding:"24px 24px 20px", width:"100%", maxWidth:SHEET_MAX, animation:"fadeUp 0.2s ease", textAlign:"left" }}>
            <div style={{ fontSize:16, fontWeight:700, color:"#1B3F45", marginBottom:8, textAlign:"center", letterSpacing:"-0.01em" }}>{t("areYouSure")}</div>
            <div style={{ fontSize:14, color:"#5A7A80", textAlign:"center", lineHeight:1.5, marginBottom:24 }}>{confirmModal.message}</div>
            <button onClick={()=>{ confirmModal.onConfirm(); setConfirmModal(null); }} style={{ width:"100%", padding:"16px", background:"#da1e28", color:"white", border:"none", borderRadius:16, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:800, cursor:"pointer", marginBottom:10 }}>
              {t("deleteBtn")}
            </button>
            <button onClick={()=>setConfirmModal(null)} style={{ width:"100%", padding:"15px", background:"#F0F6F7", color:"#1B3F45", border:"none", borderRadius:16, fontFamily:"'IBM Plex Sans', sans-serif", fontSize:15, fontWeight:600, cursor:"pointer" }}>
              {t("cancelBtn")}
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
        const total    = roundCHF(sub + porto + mwst);
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
                    <tr style={{ borderTop:"2px solid #1a1a1a" }}>
                      <td colSpan={3} style={{ padding:"8px 10px", textAlign:"right", fontWeight:700, fontSize:12, letterSpacing:"0.06em" }}>Subtotal</td>
                      <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:700, fontSize:13, borderLeft:"1px solid #1a1a1a" }}>{fC(sub)}</td>
                    </tr>
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
