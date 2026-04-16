// Registers the CRA-generated service worker and forces an automatic full-page
// reload whenever a new version is deployed — no user action required.

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function register() {
  if (process.env.NODE_ENV !== 'production') return;
  if (!('serviceWorker' in navigator)) return;

  const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
  if (publicUrl.origin !== window.location.origin) return;

  window.addEventListener('load', () => {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

    // When the SW controller changes (new SW activated), reload the page so
    // users always see the freshest build — fully automatic, no prompt needed.
    let reloadPending = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadPending) return; // guard against double-reload
      reloadPending = true;
      window.location.reload();
    });

    if (isLocalhost) {
      // On localhost, check that a valid SW exists before registering.
      checkValidServiceWorker(swUrl);
    } else {
      registerValidSW(swUrl);
    }
  });
}

function registerValidSW(swUrl) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.onstatechange = () => {
          if (installing.state !== 'installed') return;

          if (navigator.serviceWorker.controller) {
            // A new SW finished installing while an old one controls the page.
            // Tell it to skip waiting → triggers 'controllerchange' → reload.
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
          // If there was no previous controller this is the first install — no reload needed.
        };
      };
    })
    .catch((err) => console.error('SW registration failed:', err));
}

function checkValidServiceWorker(swUrl) {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      const isMissing =
        response.status === 404 ||
        (contentType != null && !contentType.includes('javascript'));

      if (isMissing) {
        // SW not found — unregister and reload to get a clean page.
        navigator.serviceWorker.ready.then((reg) =>
          reg.unregister().then(() => window.location.reload())
        );
      } else {
        registerValidSW(swUrl);
      }
    })
    .catch(() => {
      console.log('Offline — serving cached content.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => reg.unregister())
      .catch((err) => console.error(err.message));
  }
}
