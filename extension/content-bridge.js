/* global chrome, window */
// Content script injected ONLY on the ACM Studio origin (content_scripts.matches).
// It is the bridge between the page and the extension: the page cannot talk to the
// service worker directly, so it posts a window message, this script relays it to
// the background, and posts the answer back. It validates that the message really
// comes from this same page — nothing else can drive it.
//
// Protocol (kept in sync with src/features/browser-extension/client.ts):
//   page  → window.postMessage({ __acmStudio: 'request', id, kind, url? })
//   bridge→ window.postMessage({ __acmStudio: 'response', id, ...result })

(function () {
  const REQUEST = 'request';
  const RESPONSE = 'response';

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== window.location.origin) {
      return; // only our own page may drive the bridge
    }
    const data = event.data;
    if (!data || data.__acmStudio !== REQUEST || typeof data.id !== 'string') {
      return;
    }
    const request =
      data.kind === 'fetchPage' || data.kind === 'fetchRobots'
        ? { kind: data.kind, url: data.url }
        : { kind: 'ping' };
    chrome.runtime.sendMessage(request, (result) => {
      const error = chrome.runtime.lastError;
      window.postMessage(
        {
          __acmStudio: RESPONSE,
          id: data.id,
          ...(error ? { ok: false, error: error.message } : result),
        },
        window.location.origin,
      );
    });
  });
})();
