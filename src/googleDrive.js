import html2pdf from 'html2pdf.js';

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

export const connectDrive = async () => {
  await loadGIS();
  return new Promise((resolve, reject) => {
    _tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        _token = resp.access_token;
        localStorage.setItem("ssp_drive_connected", "1");
        resolve();
      },
    });
    _tokenClient.requestAccessToken({ prompt: _token ? "" : "consent" });
  });
};

export const disconnectDrive = () => {
  if (_token) window.google?.accounts?.oauth2?.revoke(_token, () => {});
  _token = null;
  localStorage.removeItem("ssp_drive_connected");
};

export const isDriveConnected = () => !!_token;

const generatePdfBlob = (htmlString) => {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:794px;height:1123px;border:none;visibility:hidden;";
    document.body.appendChild(iframe);

    const cleanup = () => { try { document.body.removeChild(iframe); } catch(_) {} };

    iframe.onload = () => {
      setTimeout(() => {
        const body = iframe.contentDocument?.body;
        if (!body) { cleanup(); reject(new Error("iframe body not found")); return; }
        html2pdf()
          .set({
            margin: [14, 18, 14, 18],
            filename: "invoice.pdf",
            html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: "#ffffff" },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          })
          .from(body)
          .outputPdf("blob")
          .then((blob) => { cleanup(); resolve(blob); })
          .catch((err) => { cleanup(); reject(err); });
      }, 600);
    };

    iframe.contentDocument.open();
    iframe.contentDocument.write(htmlString);
    iframe.contentDocument.close();
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
  if (res.status === 401) {
    _token = null;
    throw new Error("TOKEN_EXPIRED");
  }
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
