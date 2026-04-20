import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const CLIENT_ID = "174694147516-h718sh5hh31q3bvrlqt35o58vq4rp4dh.apps.googleusercontent.com";
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const ROOT_NAME = "Stone Setting Pro";

let _token = null;
let _tokenClient = null;

const loadGIS = () => new Promise((resolve) => {
  if (window.google?.accounts) { resolve(); return; }
  const s = document.createElement("script");
  s.src = "https://accounts.google.com/gsi/client";
  s.async = true;
  s.defer = true;
  s.onload = resolve;
  document.head.appendChild(s);
});

const initTokenClient = (callback, errorCallback) => {
  return window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback,
    error_callback: errorCallback,
  });
};

export const connectDrive = async () => {
  await loadGIS();
  return new Promise((resolve, reject) => {
    _tokenClient = initTokenClient(
      (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        _token = resp.access_token;
        localStorage.setItem("ssp_drive_connected", "1");
        resolve();
      },
      (err) => reject(new Error(err?.type || "connection_failed"))
    );
    _tokenClient.requestAccessToken({ prompt: "consent" });
  });
};

// Silently refreshes the token on app load — no popup if Google session is active
export const silentReconnect = async () => {
  await loadGIS();
  return new Promise((resolve, reject) => {
    const client = initTokenClient(
      (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        _token = resp.access_token;
        localStorage.setItem("ssp_drive_connected", "1");
        resolve();
      },
      (err) => reject(new Error(err?.type || "silent_failed"))
    );
    client.requestAccessToken({ prompt: "" }); // empty = silent, no popup
  });
};

export const disconnectDrive = () => {
  if (_token) window.google?.accounts?.oauth2?.revoke(_token, () => {});
  _token = null;
  localStorage.removeItem("ssp_drive_connected");
};

export const isDriveConnected = () => !!_token;

const toBase64 = (url) =>
  fetch(url)
    .then((r) => r.blob())
    .then((blob) => new Promise((res) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result);
      reader.readAsDataURL(blob);
    }))
    .catch(() => null);

// Renders the invoice HTML in a hidden iframe and captures it as a PDF image —
// guarantees the PDF looks exactly like the printed invoice.
const generatePdfBlob = async (htmlString) => {
  const origin = window.location.origin;

  // Embed images as base64 so the iframe can render them without CORS issues
  const [logoB64, qrB64] = await Promise.all([
    toBase64(`${origin}/logo.png`),
    toBase64(`${origin}/qr.png`),
  ]);
  let html = htmlString;
  if (logoB64) html = html.replace(`${origin}/logo.png`, logoB64);
  if (qrB64)   html = html.replace(`${origin}/qr.png`, qrB64);

  // Remove the back-button and print script — not needed in PDF
  html = html.replace(/<div class="back-btn">[\s\S]*?<\/div>/, "");
  html = html.replace(/<script[\s\S]*?<\/script>/g, "");

  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    // Visible to the browser renderer but invisible to the user
    iframe.style.cssText = "position:fixed;top:0;left:0;width:794px;height:1px;border:none;opacity:0;pointer-events:none;z-index:-9999;";
    document.body.appendChild(iframe);

    const cleanup = () => { try { document.body.removeChild(iframe); } catch (_) {} };

    iframe.onload = async () => {
      try {
        // Let fonts and layout settle
        await document.fonts.ready;
        await new Promise((r) => setTimeout(r, 800));

        const iframeDoc = iframe.contentDocument;
        const fullHeight = iframeDoc.documentElement.scrollHeight;
        iframe.style.height = `${fullHeight}px`;

        await new Promise((r) => setTimeout(r, 200));

        const canvas = await html2canvas(iframeDoc.documentElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          width: 794,
          height: fullHeight,
          windowWidth: 794,
          windowHeight: fullHeight,
          logging: false,
          foreignObjectRendering: false,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        const pdf = new jsPDF({ unit: "px", format: "a4", orientation: "portrait" });
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        const imgH = (canvas.height * pdfW) / canvas.width;

        // If content is taller than one page, split across pages
        let yOffset = 0;
        while (yOffset < imgH) {
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, -yOffset, pdfW, imgH);
          yOffset += pdfH;
        }

        cleanup();
        resolve(pdf.output("blob"));
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    iframe.srcdoc = html;
  });
};

const api = async (method, path, body, params) => {
  const url = new URL(`https://www.googleapis.com/drive/v3/${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method,
    headers: { Authorization: `Bearer ${_token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { _token = null; throw new Error("TOKEN_EXPIRED"); }
  return res.json();
};

const findOrCreateFolder = async (name, parentId = null) => {
  const escaped = name.replace(/'/g, "\\'");
  let q = `name='${escaped}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) q += ` and '${parentId}' in parents`;
  const res = await api("GET", "files", null, { q, fields: "files(id)", spaces: "drive" });
  if (res.files?.length) return res.files[0].id;
  const meta = {
    name,
    mimeType: "application/vnd.google-apps.folder",
    ...(parentId && { parents: [parentId] }),
  };
  const created = await api("POST", "files", meta);
  return created.id;
};

const uploadBlob = async (name, blob, mimeType, folderId) => {
  const meta = { name, parents: [folderId] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
  form.append("file", new Blob([blob], { type: mimeType }));
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${_token}` },
    body: form,
  });
  if (res.status === 401) { _token = null; throw new Error("TOKEN_EXPIRED"); }
  return res.json();
};

export const saveInvoiceToDrive = async (inv, htmlContent) => {
  const rootId = await findOrCreateFolder(ROOT_NAME);
  const clientFolderId = await findOrCreateFolder(inv.client || "Sin cliente", rootId);
  const invFolderId = await findOrCreateFolder("Facturas", clientFolderId);
  const filename = `Factura_${inv.number || inv.id}_${(inv.date || "").replace(/-/g, "")}.pdf`;
  const pdfBlob = await generatePdfBlob(htmlContent);
  return uploadBlob(filename, pdfBlob, "application/pdf", invFolderId);
};
