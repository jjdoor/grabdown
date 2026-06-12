'use strict';

const api = globalThis.browser || globalThis.chrome;

const statusEl = document.getElementById('gd-status');
const btnSelection = document.getElementById('gd-selection');
const btnPage = document.getElementById('gd-page');

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = 'gd-status' + (kind ? ' gd-status--' + kind : '');
}

const REASONS = {
  'no-selection': 'Select some text first.',
  'no-link': 'No link under the cursor.',
  'empty': 'Nothing to copy here.',
  'copy-failed': 'Clipboard blocked by this page.',
  'converter-missing': 'Could not run on this page.',
  'no-tab': 'No active tab.',
  'no-result': 'This page blocks extensions.',
};

function grab(mode, btn) {
  setStatus('Working…', null);
  [btnSelection, btnPage].forEach((b) => { b.disabled = true; });
  api.runtime.sendMessage({ action: 'grab', mode }, (res) => {
    [btnSelection, btnPage].forEach((b) => { b.disabled = false; });
    if (api.runtime.lastError) {
      setStatus('This page blocks extensions.', 'err');
      return;
    }
    if (res && res.ok) {
      setStatus('Copied ' + res.length + ' chars as Markdown ✓', 'ok');
      setTimeout(() => window.close(), 700);
    } else {
      const reason = (res && res.reason) || 'empty';
      setStatus(REASONS[reason] || 'Could not copy.', 'err');
    }
  });
}

btnSelection.addEventListener('click', () => grab('selection', btnSelection));
btnPage.addEventListener('click', () => grab('page', btnPage));
