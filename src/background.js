/*
 * Grabdown — background service worker (event page on Firefox).
 *
 * Wires up the context menus, the keyboard command, and the popup. All real work
 * is delegated to the page via chrome.scripting: we inject the converter, read the
 * relevant HTML, convert it, and copy it to the clipboard — entirely on the user's
 * machine, no network, no storage.
 */

'use strict';

// Same code runs on Chrome/Edge (chrome.*) and Firefox (browser.*); both expose
// promise-returning APIs under MV3, so a simple alias keeps us dependency-free.
const api = globalThis.browser || globalThis.chrome;

const MENUS = [
  { id: 'grabdown-selection', title: 'Copy selection as Markdown', contexts: ['selection'] },
  { id: 'grabdown-link', title: 'Copy link as Markdown', contexts: ['link'] },
  { id: 'grabdown-page', title: 'Copy page as Markdown', contexts: ['page'] },
];

function createMenus() {
  api.contextMenus.removeAll(() => {
    for (const m of MENUS) api.contextMenus.create(m);
  });
}

api.runtime.onInstalled.addListener(createMenus);
if (api.runtime.onStartup) api.runtime.onStartup.addListener(createMenus);

// --- Injected into the page (must be self-contained; uses the injected global) ---
async function grabAndCopy(mode, payload) {
  const convert = globalThis.GrabdownConvert;
  if (typeof convert !== 'function') return { ok: false, reason: 'converter-missing' };

  let markdown = '';
  if (mode === 'selection') {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return { ok: false, reason: 'no-selection' };
    const div = document.createElement('div');
    for (let i = 0; i < sel.rangeCount; i++) div.appendChild(sel.getRangeAt(i).cloneContents());
    markdown = convert(div.innerHTML);
  } else if (mode === 'page') {
    const main = document.querySelector('article') || document.querySelector('main') || document.body;
    markdown = convert(main ? main.innerHTML : '');
  } else if (mode === 'link') {
    const url = (payload && payload.url) || '';
    if (!url) return { ok: false, reason: 'no-link' };
    const text = (payload && payload.text && payload.text.trim()) || url;
    markdown = '[' + text + '](' + url + ')';
  }

  markdown = (markdown || '').trim();
  if (!markdown) return { ok: false, reason: 'empty' };

  try {
    await navigator.clipboard.writeText(markdown);
    return { ok: true, length: markdown.length };
  } catch (e) {
    try {
      const ta = document.createElement('textarea');
      ta.value = markdown;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok ? { ok: true, length: markdown.length } : { ok: false, reason: 'copy-failed' };
    } catch (e2) {
      return { ok: false, reason: 'copy-failed' };
    }
  }
}

async function flashBadge(tabId, ok) {
  if (tabId == null) return;
  try {
    await api.action.setBadgeText({ tabId, text: ok ? '✓' : '×' });
    await api.action.setBadgeBackgroundColor({ tabId, color: ok ? '#1a7f37' : '#cf222e' });
    setTimeout(() => api.action.setBadgeText({ tabId, text: '' }), 1200);
  } catch (e) { /* badge is best-effort */ }
}

async function doGrab(tabId, mode, payload) {
  if (tabId == null) return { ok: false, reason: 'no-tab' };
  try {
    await api.scripting.executeScript({ target: { tabId }, files: ['src/converter.js'] });
    const results = await api.scripting.executeScript({
      target: { tabId },
      func: grabAndCopy,
      args: [mode, payload || null],
    });
    const res = (results && results[0] && results[0].result) || { ok: false, reason: 'no-result' };
    await flashBadge(tabId, res.ok);
    return res;
  } catch (e) {
    await flashBadge(tabId, false);
    return { ok: false, reason: String((e && e.message) || e) };
  }
}

api.contextMenus.onClicked.addListener((info, tab) => {
  const tabId = tab && tab.id;
  if (info.menuItemId === 'grabdown-selection') doGrab(tabId, 'selection');
  else if (info.menuItemId === 'grabdown-link') doGrab(tabId, 'link', { url: info.linkUrl, text: info.selectionText });
  else if (info.menuItemId === 'grabdown-page') doGrab(tabId, 'page');
});

if (api.commands && api.commands.onCommand) {
  api.commands.onCommand.addListener(async (command) => {
    if (command !== 'copy-selection') return;
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (tab) doGrab(tab.id, 'selection');
  });
}

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.action !== 'grab') return undefined;
  (async () => {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    const res = tab ? await doGrab(tab.id, msg.mode, msg.payload) : { ok: false, reason: 'no-tab' };
    sendResponse(res);
  })();
  return true; // keep the message channel open for the async response
});
