# Grabdown — Selection to Markdown

Select anything on a web page and copy it as **clean Markdown**. Right-click a
selection, hit the button, or use a keyboard shortcut — the Markdown lands on
your clipboard, ready to paste into Obsidian, Notion, a PR description, or an LLM
prompt.

- **Zero dependencies.** The HTML→Markdown engine is hand-written and bundled —
  no Turndown, no Readability, no framework. The whole extension is a handful of
  small files.
- **Zero data collection.** Everything runs locally in your browser. No network
  requests, no storage, no account, no telemetry. Nothing to put in a privacy
  policy because nothing leaves your machine.
- **Minimal permissions.** `activeTab` + `scripting` + `contextMenus` +
  `clipboardWrite`. No `<all_urls>`, no host permissions, no tab snooping. It only
  touches a page the moment *you* ask it to.
- **Cross-browser.** One MV3 codebase ships to Chrome, Edge, and Firefox.

## What it converts

Headings, bold/italic, links, images, inline code, fenced code blocks (with
language detection), ordered/nested lists, blockquotes, horizontal rules,
strikethrough, highlight (`==mark==`), and **GFM tables** — with HTML entities
decoded and Markdown special characters escaped.

## Three ways to grab

| Action | How |
| --- | --- |
| Copy a **selection** | Select text → right-click → *Copy selection as Markdown* (or `Ctrl/Cmd+Shift+M`) |
| Copy a **link** | Right-click a link → *Copy link as Markdown* |
| Copy the **whole page** | Click the toolbar icon → *Copy whole page* (grabs the main `<article>`/`<main>`) |

## Install (development)

1. Clone this repo.
2. **Chrome / Edge:** open `chrome://extensions`, enable *Developer mode*, click
   *Load unpacked*, and select this folder.
3. **Firefox:** open `about:debugging#/runtime/this-firefox`, click *Load
   Temporary Add-on*, and select `manifest.firefox.json`.

## Build store packages

```sh
npm run build
```

Produces `dist/grabdown-chrome-<version>.zip` (Chrome Web Store + Edge Add-ons)
and `dist/grabdown-firefox-<version>.zip` (Firefox AMO).

## Test

```sh
npm test
```

Runs the converter suite (Node's built-in test runner, no dependencies).

## License

MIT
