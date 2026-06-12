'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { htmlToMarkdown } = require('../src/converter.js');

const md = (html) => htmlToMarkdown(html);

test('empty / non-string input', () => {
  assert.strictEqual(md(''), '');
  assert.strictEqual(md('   '), '');
  assert.strictEqual(md(null), '');
  assert.strictEqual(md(undefined), '');
});

test('plain text collapses whitespace', () => {
  assert.strictEqual(md('hello    world\n\n  again'), 'hello world again');
});

test('headings h1-h6', () => {
  assert.strictEqual(md('<h1>Title</h1>'), '# Title');
  assert.strictEqual(md('<h3>Sub</h3>'), '### Sub');
  assert.strictEqual(md('<h6>Deep</h6>'), '###### Deep');
});

test('bold and italic', () => {
  assert.strictEqual(md('<b>bold</b>'), '**bold**');
  assert.strictEqual(md('<strong>s</strong>'), '**s**');
  assert.strictEqual(md('<em>e</em>'), '*e*');
  assert.strictEqual(md('<i>i</i>'), '*i*');
});

test('nested emphasis', () => {
  assert.strictEqual(md('<strong>bold <em>and italic</em></strong>'), '**bold *and italic***');
});

test('inline code', () => {
  assert.strictEqual(md('<code>const x = 1</code>'), '`const x = 1`');
});

test('inline code containing backticks bumps the fence', () => {
  assert.strictEqual(md('<code>a `b` c</code>'), '`` a `b` c ``');
});

test('links', () => {
  assert.strictEqual(md('<a href="https://x.com">X</a>'), '[X](https://x.com)');
});

test('link with title', () => {
  assert.strictEqual(md('<a href="https://x.com" title="hi">X</a>'), '[X](https://x.com "hi")');
});

test('javascript: links degrade to text', () => {
  assert.strictEqual(md('<a href="javascript:void(0)">click</a>'), 'click');
});

test('bare link uses href as text', () => {
  assert.strictEqual(md('<a href="https://x.com"></a>'), '[https://x.com](https://x.com)');
});

test('images', () => {
  assert.strictEqual(md('<img src="a.png" alt="cat">'), '![cat](a.png)');
  assert.strictEqual(md('<img alt="no src">'), '');
});

test('unordered list', () => {
  assert.strictEqual(md('<ul><li>one</li><li>two</li></ul>'), '- one\n- two');
});

test('ordered list increments', () => {
  assert.strictEqual(md('<ol><li>a</li><li>b</li><li>c</li></ol>'), '1. a\n2. b\n3. c');
});

test('nested list indents', () => {
  const html = '<ul><li>parent<ul><li>child</li></ul></li></ul>';
  assert.strictEqual(md(html), '- parent\n  - child');
});

test('blockquote prefixes lines', () => {
  assert.strictEqual(md('<blockquote>quoted</blockquote>'), '> quoted');
});

test('horizontal rule', () => {
  assert.strictEqual(md('<p>a</p><hr><p>b</p>'), 'a\n\n---\n\nb');
});

test('fenced code block with language', () => {
  const html = '<pre><code class="language-js">const x = 1;\nconst y = 2;</code></pre>';
  assert.strictEqual(md(html), '```js\nconst x = 1;\nconst y = 2;\n```');
});

test('pre preserves whitespace and does not escape', () => {
  const html = '<pre><code>a_b *c*\n  indented</code></pre>';
  assert.strictEqual(md(html), '```\na_b *c*\n  indented\n```');
});

test('strikethrough and highlight', () => {
  assert.strictEqual(md('<del>gone</del>'), '~~gone~~');
  assert.strictEqual(md('<mark>note</mark>'), '==note==');
});

test('GFM table with header', () => {
  const html = '<table><thead><tr><th>A</th><th>B</th></tr></thead>' +
    '<tbody><tr><td>1</td><td>2</td></tr></tbody></table>';
  assert.strictEqual(md(html), '| A | B |\n| --- | --- |\n| 1 | 2 |');
});

test('table without thead uses first row as header', () => {
  const html = '<table><tr><td>h1</td><td>h2</td></tr><tr><td>x</td><td>y</td></tr></table>';
  assert.strictEqual(md(html), '| h1 | h2 |\n| --- | --- |\n| x | y |');
});

test('table cells escape pipes', () => {
  const html = '<table><tr><th>cmd</th></tr><tr><td>a | b</td></tr></table>';
  assert.strictEqual(md(html), '| cmd |\n| --- |\n| a \\| b |');
});

test('entities are decoded', () => {
  assert.strictEqual(md('<p>a &amp; b &lt; c &copy; 2026</p>'), 'a & b < c © 2026');
  assert.strictEqual(md('<p>&#65;&#66;&#x43;</p>'), 'ABC');
});

test('markdown special chars in text are escaped', () => {
  assert.strictEqual(md('<p>use *stars* and _under_</p>'), 'use \\*stars\\* and \\_under\\_');
});

test('script and style content is dropped', () => {
  assert.strictEqual(md('<p>keep</p><script>alert(1)</script><style>.x{}</style>'), 'keep');
});

test('paragraphs separated by blank line', () => {
  assert.strictEqual(md('<p>first</p><p>second</p>'), 'first\n\nsecond');
});

test('br creates a hard line break', () => {
  assert.strictEqual(md('<p>line1<br>line2</p>'), 'line1  \nline2');
});

test('div wrappers are transparent', () => {
  assert.strictEqual(md('<div><div><p>deep</p></div></div>'), 'deep');
});

test('real-world article fragment', () => {
  const html = [
    '<article>',
    '<h2>Install</h2>',
    '<p>Run the <code>npm install</code> command:</p>',
    '<pre><code class="language-bash">npm install grabdown</code></pre>',
    '<p>See the <a href="https://example.com/docs">docs</a> for more.</p>',
    '<ul><li>Fast</li><li>Zero deps</li></ul>',
    '</article>',
  ].join('');
  const expected = [
    '## Install',
    '',
    'Run the `npm install` command:',
    '',
    '```bash',
    'npm install grabdown',
    '```',
    '',
    'See the [docs](https://example.com/docs) for more.',
    '',
    '- Fast',
    '- Zero deps',
  ].join('\n');
  assert.strictEqual(md(html), expected);
});

test('malformed / unclosed tags do not crash', () => {
  assert.doesNotThrow(() => md('<p>open <b>bold <i>both</p> trailing'));
  assert.strictEqual(typeof md('<div><span>x'), 'string');
});
