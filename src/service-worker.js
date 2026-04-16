/* eslint-disable no-restricted-globals */
import { clientsClaim } from 'workbox-core';
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// ── Activate the new SW immediately on every install (enables auto-update) ──
self.addEventListener('install', () => self.skipWaiting());
clientsClaim();

// ── Also respond to explicit SKIP_WAITING messages (belt-and-suspenders) ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Precache all CRA build assets (JS, CSS, HTML) ──
// __WB_MANIFEST is injected at build time by CRA's InjectManifest plugin
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── SPA navigation: serve index.html for all page navigations ──
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'))
);

// ── Cache-first: static assets (images, fonts) — long-lived ──
registerRoute(
  ({ request }) =>
    request.destination === 'image' ||
    request.destination === 'font',
  new CacheFirst({
    cacheName: 'stone-art-static',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// ── Network-first: Supabase API calls ──
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  new NetworkFirst({
    cacheName: 'stone-art-supabase',
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 min — stale fallback only when offline
      }),
    ],
  })
);

// ── Network-first: Anthropic AI calls — no persistent cache ──
registerRoute(
  ({ url }) => url.hostname.includes('anthropic.com'),
  new NetworkFirst({
    cacheName: 'stone-art-ai',
    networkTimeoutSeconds: 30,
    plugins: [
      new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 60 }),
    ],
  })
);
