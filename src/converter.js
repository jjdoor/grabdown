/*
 * Grabdown — zero-dependency HTML-string → Markdown converter.
 *
 * Pure string in, string out. No DOM required, so it runs in Node (for tests)
 * and inside the extension's injected content script alike. It ships its own
 * tolerant HTML tokenizer instead of leaning on a library (Turndown/Readability),
 * keeping the whole tool dependency-free.
 *
 * Supported: headings, p, br, strong/b, em/i, inline code, fenced code (with
 * language), a, img, ul/ol (nested), blockquote, hr, del/s, mark, and GFM tables.
 */

'use strict';

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: ' ', copy: '©', reg: '®', trade: '™',
  hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  laquo: '«', raquo: '»', times: '×', divide: '÷',
  middot: '·', bull: '•', deg: '°', plusmn: '±',
  emsp: ' ', ensp: ' ', thinsp: ' ', hairsp: ' ',
  sect: '§', para: '¶', dagger: '†', euro: '€',
  pound: '£', cent: '¢', yen: '¥', frac12: '½',
};

function safeFromCodePoint(code) {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

function decodeEntities(s) {
  if (s.indexOf('&') === -1) return s;
  return s.replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, e) => {
    if (e[0] === '#') {
      const hex = e[1] === 'x' || e[1] === 'X';
      const code = parseInt(e.slice(hex ? 2 : 1), hex ? 16 : 10);
      const ch = safeFromCodePoint(code);
      return ch || m;
    }
    if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, e)) return NAMED_ENTITIES[e];
    const lower = e.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, lower)) return NAMED_ENTITIES[lower];
    return m;
  });
}

// ---------------------------------------------------------------------------
// Tokenizer + tree builder
// ---------------------------------------------------------------------------

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// Tags whose entire subtree we discard (non-content / unsafe / interactive noise).
const DROP_TAGS = new Set([
  'script', 'style', 'noscript', 'svg', 'canvas', 'template',
  'head', 'title', 'iframe', 'object', 'audio', 'video',
]);

const TAG_RE = /<\/?[a-zA-Z][a-zA-Z0-9:-]*(?:[^>"']|"[^"]*"|'[^']*')*>|<!--[\s\S]*?-->/g;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;

function parseTag(raw) {
  const closing = raw[1] === '/';
  let inner = raw.slice(closing ? 2 : 1, raw.length - 1);
  const selfClose = inner.endsWith('/');
  if (selfClose) inner = inner.slice(0, -1);
  const nameMatch = inner.match(/^[a-zA-Z][a-zA-Z0-9:-]*/);
  const name = nameMatch ? nameMatch[0].toLowerCase() : '';
  const attrs = {};
  if (!closing && name) {
    const rest = inner.slice(name.length);
    let am;
    ATTR_RE.lastIndex = 0;
    while ((am = ATTR_RE.exec(rest)) !== null) {
      let val = am[2] || '';
      if (val && (val[0] === '"' || val[0] === "'")) val = val.slice(1, -1);
      attrs[am[1].toLowerCase()] = decodeEntities(val);
    }
  }
  return { closing, name, attrs, selfClose };
}

function parse(html) {
  const root = { name: '#root', attrs: {}, children: [] };
  const stack = [root];
  let dropDepth = 0;
  let dropName = null;
  let lastIndex = 0;
  let m;

  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(html)) !== null) {
    if (m.index > lastIndex) {
      const text = html.slice(lastIndex, m.index);
      if (dropDepth === 0 && text) {
        stack[stack.length - 1].children.push({ name: '#text', value: text });
      }
    }
    lastIndex = TAG_RE.lastIndex;

    const raw = m[0];
    if (raw.startsWith('<!--')) continue; // comment

    const tag = parseTag(raw);
    if (!tag.name) continue;

    if (dropDepth > 0) {
      if (tag.name === dropName) {
        if (!tag.closing && !tag.selfClose && !VOID_TAGS.has(tag.name)) dropDepth++;
        else if (tag.closing) dropDepth--;
        if (dropDepth === 0) dropName = null;
      }
      continue;
    }

    if (!tag.closing) {
      if (DROP_TAGS.has(tag.name)) {
        if (!tag.selfClose && !VOID_TAGS.has(tag.name)) {
          dropDepth = 1;
          dropName = tag.name;
        }
        continue;
      }
      const node = { name: tag.name, attrs: tag.attrs, children: [] };
      stack[stack.length - 1].children.push(node);
      if (!tag.selfClose && !VOID_TAGS.has(tag.name)) stack.push(node);
    } else {
      // Close: unwind to the nearest matching open tag (tolerates mismatches).
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].name === tag.name) {
          stack.length = i;
          break;
        }
      }
    }
  }
  if (lastIndex < html.length) {
    const text = html.slice(lastIndex);
    if (dropDepth === 0 && text) {
      stack[stack.length - 1].children.push({ name: '#text', value: text });
    }
  }
  return root;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const BLOCK_TAGS = new Set([
  'p', 'div', 'section', 'article', 'header', 'footer', 'main', 'aside',
  'figure', 'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'blockquote', 'pre', 'hr', 'table', 'dl',
]);

const TRANSPARENT_BLOCK = new Set([
  'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'figure', 'figcaption', 'dl',
]);

// Sentinel for a hard line break, so the trailing-whitespace cleanup below
// can run freely without eating the two trailing spaces a `<br>` needs.
const HARD_BREAK = '';

function isInline(name) {
  return !BLOCK_TAGS.has(name) && name !== 'li' && name !== 'tr' &&
    name !== 'td' && name !== 'th' && name !== 'thead' && name !== 'tbody' &&
    name !== 'tfoot' && name !== 'dt' && name !== 'dd';
}

function escapeText(s) {
  return s.replace(/([\\`*_[\]])/g, '\\$1');
}

function renderTextNode(value, ctx) {
  const decoded = decodeEntities(value);
  if (ctx.inPre) return decoded;
  const collapsed = decoded.replace(/\s+/g, ' ');
  return escapeText(collapsed);
}

function rawText(node) {
  if (node.name === '#text') return decodeEntities(node.value);
  if (node.name === 'br') return '\n';
  return node.children.map(rawText).join('');
}

// Render the children of a node as a single inline string.
function renderInlineChildren(node, ctx) {
  let out = '';
  for (const child of node.children) {
    if (child.name === '#text') out += renderTextNode(child.value, ctx);
    else if (isInline(child.name)) out += renderInline(child, ctx);
    else out += renderBlock(child, ctx); // block inside inline context (rare)
  }
  return out;
}

function fenceInlineCode(text) {
  // Choose a backtick run longer than any inside the text.
  let longest = 0;
  const matches = text.match(/`+/g);
  if (matches) for (const run of matches) longest = Math.max(longest, run.length);
  const fence = '`'.repeat(longest + 1);
  const pad = text.startsWith('`') || text.endsWith('`') || longest > 0 ? ' ' : '';
  return fence + pad + text + pad + fence;
}

function renderInline(node, ctx) {
  const n = node.name;
  switch (n) {
    case 'br':
      return HARD_BREAK + '\n';
    case 'strong':
    case 'b': {
      const inner = renderInlineChildren(node, ctx);
      return inner.trim() ? `**${inner}**` : inner;
    }
    case 'em':
    case 'i': {
      const inner = renderInlineChildren(node, ctx);
      return inner.trim() ? `*${inner}*` : inner;
    }
    case 'del':
    case 's':
    case 'strike': {
      const inner = renderInlineChildren(node, ctx);
      return inner.trim() ? `~~${inner}~~` : inner;
    }
    case 'mark': {
      const inner = renderInlineChildren(node, ctx);
      return inner.trim() ? `==${inner}==` : inner;
    }
    case 'code': {
      if (ctx.inPre) return renderInlineChildren(node, ctx);
      const text = rawText(node);
      return text ? fenceInlineCode(text) : '';
    }
    case 'a': {
      const inner = renderInlineChildren(node, ctx).trim();
      let href = (node.attrs.href || '').trim();
      if (!href || /^javascript:/i.test(href)) return inner;
      const title = node.attrs.title ? ` "${node.attrs.title.replace(/"/g, '\\"')}"` : '';
      const text = inner || href;
      return `[${text}](${href}${title})`;
    }
    case 'img': {
      const src = (node.attrs.src || '').trim();
      if (!src) return '';
      const alt = (node.attrs.alt || '').replace(/[\r\n]+/g, ' ');
      const title = node.attrs.title ? ` "${node.attrs.title.replace(/"/g, '\\"')}"` : '';
      return `![${alt}](${src}${title})`;
    }
    case 'sup':
    case 'sub':
    case 'span':
    case 'u':
    case 'font':
    case 'small':
    case 'abbr':
    case 'cite':
    case 'q':
    case 'kbd':
    case 'samp':
    case 'var':
    case 'time':
    case 'ins':
      return renderInlineChildren(node, ctx);
    default:
      return renderInlineChildren(node, ctx);
  }
}

// Render the children of a node as a sequence of blocks joined by blank lines.
function renderBlocks(node, ctx) {
  const blocks = [];
  let inlineBuf = '';
  const flush = () => {
    const s = inlineBuf.replace(/[ \t]+\n/g, '\n').trim();
    if (s) blocks.push(s);
    inlineBuf = '';
  };
  for (const child of node.children) {
    if (child.name === '#text') {
      inlineBuf += renderTextNode(child.value, ctx);
    } else if (isInline(child.name)) {
      inlineBuf += renderInline(child, ctx);
    } else {
      flush();
      const b = renderBlock(child, ctx);
      if (b) blocks.push(b);
    }
  }
  flush();
  return blocks.join('\n\n');
}

// Render one <li>'s inner content. Nested lists attach tightly (single newline);
// sibling block content (extra paragraphs) keeps the blank-line separation.
function renderListItem(li, ctx) {
  const parts = [];
  let inlineBuf = '';
  const flush = () => {
    const s = inlineBuf.replace(/[ \t]+\n/g, '\n').trim();
    if (s) parts.push({ tight: false, s });
    inlineBuf = '';
  };
  for (const child of li.children) {
    if (child.name === '#text') {
      inlineBuf += renderTextNode(child.value, ctx);
    } else if (isInline(child.name)) {
      inlineBuf += renderInline(child, ctx);
    } else {
      flush();
      const b = renderBlock(child, ctx);
      if (b) parts.push({ tight: child.name === 'ul' || child.name === 'ol', s: b });
    }
  }
  flush();
  let out = '';
  parts.forEach((p, i) => {
    if (i === 0) out = p.s;
    else out += (p.tight ? '\n' : '\n\n') + p.s;
  });
  return out;
}

function renderList(node, ctx, ordered) {
  const items = node.children.filter((c) => c.name === 'li');
  const out = [];
  let idx = 0;
  for (const li of items) {
    const marker = ordered ? `${++idx}. ` : '- ';
    const inner = renderListItem(li, ctx).trim();
    if (!inner) {
      out.push(marker.trimEnd());
      continue;
    }
    const pad = ' '.repeat(marker.length);
    const lines = inner.split('\n').map((ln, i) => (i === 0 ? marker + ln : (ln ? pad + ln : '')));
    out.push(lines.join('\n'));
  }
  return out.join('\n');
}

function collectRows(node, rows) {
  for (const child of node.children) {
    if (child.name === 'tr') {
      const cells = child.children.filter((c) => c.name === 'td' || c.name === 'th');
      rows.push(cells.map((c) => ({
        header: c.name === 'th',
        text: renderInlineChildren(c, { ...node, inPre: false })
          .replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim(),
      })));
    } else if (child.name === 'thead' || child.name === 'tbody' || child.name === 'tfoot') {
      collectRows(child, rows);
    }
  }
}

function renderTable(node) {
  const rows = [];
  collectRows(node, rows);
  if (!rows.length) return '';
  const cols = rows.reduce((max, r) => Math.max(max, r.length), 0);
  if (!cols) return '';

  const headerIsFirst = rows[0].some((c) => c.header) || rows.length > 1;
  let header;
  let body;
  if (headerIsFirst) {
    header = rows[0];
    body = rows.slice(1);
  } else {
    header = Array.from({ length: cols }, () => ({ text: '' }));
    body = rows;
  }

  const pad = (r) => {
    const cells = r.map((c) => c.text);
    while (cells.length < cols) cells.push('');
    return `| ${cells.join(' | ')} |`;
  };
  const sep = `| ${Array.from({ length: cols }, () => '---').join(' | ')} |`;
  return [pad(header), sep, ...body.map(pad)].join('\n');
}

function detectLang(pre) {
  const probe = (node) => {
    const cls = (node.attrs && node.attrs.class) || '';
    const m = cls.match(/(?:language|lang|brush:|highlight-source)-?([a-zA-Z0-9+#]+)/);
    if (m) return m[1];
    for (const c of node.children || []) {
      if (c.name === 'code' || c.name === 'span') {
        const r = probe(c);
        if (r) return r;
      }
    }
    return '';
  };
  return probe(pre);
}

function renderBlock(node, ctx) {
  const n = node.name;
  if (/^h[1-6]$/.test(n)) {
    const level = Number(n[1]);
    const text = renderInlineChildren(node, ctx).replace(/\s*\n\s*/g, ' ').trim();
    return text ? `${'#'.repeat(level)} ${text}` : '';
  }
  switch (n) {
    case 'p':
      return renderInlineChildren(node, ctx).replace(/[ \t]+\n/g, '\n').trim();
    case 'br':
      return '';
    case 'hr':
      return '---';
    case 'pre': {
      const lang = detectLang(node);
      const code = rawText(node).replace(/\n$/, '');
      return '```' + lang + '\n' + code + '\n```';
    }
    case 'blockquote': {
      const inner = renderBlocks(node, ctx).trim();
      if (!inner) return '';
      return inner.split('\n').map((ln) => (ln ? `> ${ln}` : '>')).join('\n');
    }
    case 'ul':
      return renderList(node, ctx, false);
    case 'ol':
      return renderList(node, ctx, true);
    case 'table':
      return renderTable(node);
    case 'dl':
    case 'figure':
    case 'figcaption':
    case 'div':
    case 'section':
    case 'article':
    case 'header':
    case 'footer':
    case 'main':
    case 'aside':
      return renderBlocks(node, ctx);
    default:
      return renderBlocks(node, ctx);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function htmlToMarkdown(html) {
  if (typeof html !== 'string' || html.trim() === '') return '';
  const tree = parse(html);
  const md = renderBlocks(tree, { inPre: false });
  return md
    .replace(/[ \t]+$/gm, '')
    .replace(new RegExp(HARD_BREAK + '\\n', 'g'), '  \n')
    .replace(new RegExp(HARD_BREAK, 'g'), '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// UMD-ish export: CommonJS for Node tests, global for the injected content script.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { htmlToMarkdown };
}
if (typeof globalThis !== 'undefined') {
  globalThis.GrabdownConvert = htmlToMarkdown;
}
