# Grabdown — Store Submission Kit

Everything you paste into the Chrome Web Store, Edge Add-ons, and Firefox AMO
dashboards. Upload packages are in `../dist/` (run `npm run build` to refresh).

- **Chrome / Edge package:** `dist/grabdown-chrome-0.1.0.zip`
- **Firefox package:** `dist/grabdown-firefox-0.1.0.zip`
- **Privacy policy URL:** https://github.com/jjdoor/grabdown/blob/main/PRIVACY.md
- **Homepage / source:** https://github.com/jjdoor/grabdown

---

## Name (≤45 chars)

```
Grabdown — Selection to Markdown
```

## Summary / short description (Chrome ≤132 chars)

```
Select any text, link, or page and copy it as clean Markdown. Zero data, no account. Chrome, Edge & Firefox.
```

## Category

Chrome: **Productivity** (alt: Developer Tools) · Edge: **Productivity** ·
Firefox: **Other / Bookmarks**

## Detailed description

```
Grabdown copies web content as clean Markdown — instantly, privately, and with no setup.

Select text and right-click "Copy selection as Markdown." Or grab a link, or the whole page. The Markdown lands on your clipboard, ready to paste into Obsidian, Notion, a pull request, your notes, or an AI prompt.

THREE WAYS TO GRAB
• Right-click a selection → Copy selection as Markdown
• Right-click a link → Copy link as Markdown
• Toolbar button → Copy the whole page (pulls the main article)
• Keyboard shortcut → Ctrl/Cmd + Shift + M

WHAT IT CONVERTS
Headings, bold and italic, links and images, inline code, fenced code blocks with language detection, ordered and nested lists, blockquotes, horizontal rules, strikethrough, highlight, and GitHub-flavored tables — with HTML entities decoded and Markdown special characters escaped.

BUILT CLEAN
• Zero data collection. Nothing leaves your browser — no network requests, no storage, no analytics, no account.
• Minimal permissions. It reads a page only when you invoke it (activeTab). No broad host permissions, no tab snooping.
• Zero dependencies. The HTML-to-Markdown engine is hand-written and bundled — no third-party libraries, no remote code. The whole extension is about 16 KB.
• Open source (MIT). Read every line: https://github.com/jjdoor/grabdown

Works in Chrome, Edge, and Firefox.
```

---

## Privacy / single-purpose (Chrome "Privacy practices" tab · Edge "Privacy")

**Single purpose**

```
Grabdown converts the content the user selects on the current web page (or the focused link or the whole page) into Markdown text and copies it to the clipboard. Converting selected content to Markdown is its only purpose.
```

**Permission justifications** (one per requested permission)

- **activeTab**
  ```
  Used only when the user explicitly invokes Grabdown (right-click menu item, toolbar button, or keyboard shortcut) to read the content the user selected on the current tab so it can be converted to Markdown. No page is accessed until the user acts.
  ```
- **scripting**
  ```
  On user invocation, injects the extension's own bundled converter into the current tab to read the selected HTML and convert it to Markdown. No remotely hosted code is used.
  ```
- **contextMenus**
  ```
  Adds the "Copy selection / link / page as Markdown" right-click menu items.
  ```
- **clipboardWrite**
  ```
  Writes the converted Markdown to the clipboard. This is the extension's output.
  ```
- **Host permissions:** none requested.
- **Remote code:** No, I am not using remote code.

**Data usage disclosure** — check **nothing**. Grabdown collects/uses/transfers
no user data. Certify all three:

- ☑ I do not sell or transfer user data to third parties (outside approved use cases)
- ☑ I do not use or transfer user data for purposes unrelated to the item's single purpose
- ☑ I do not use or transfer user data to determine creditworthiness or for lending

---

## Edge Add-ons extras

- **Search terms (≤21 words / 7 phrases):**
  `markdown, copy as markdown, html to markdown, selection to markdown, web clipper, obsidian, notion, clipboard, markdown converter`
- **Notes for certification:**
  ```
  No login required. To test: open any web page, select text, right-click, choose "Copy selection as Markdown," then paste into a text editor. The selection is converted to Markdown on the clipboard. Also testable via the toolbar popup ("Copy whole page") and Ctrl/Cmd+Shift+M.
  ```

## Firefox AMO extras

- **Summary (≤250 chars):**
  ```
  Select any text, link, or page and copy it as clean Markdown — headings, code, tables, lists and more. Runs entirely on your device: no network, no storage, no account. Minimal permissions, zero dependencies, open source.
  ```
- **Data collection:** None (already declared in manifest:
  `data_collection_permissions: { required: ["none"] }`).
- **Notes for reviewer:** same as Edge certification notes above.

---

## Required image assets (in this folder)

| Asset | File | Size | Store |
| --- | --- | --- | --- |
| Screenshot 1 (hero) | `screenshot-1.png` | 1280×800 | Chrome, Edge, Firefox |
| Screenshot 2 (features) | `screenshot-2.png` | 1280×800 | Chrome, Edge, Firefox |
| Small promo tile | `promo-tile.png` | 440×280 | Chrome (required), Edge |
| Store icon | `../icons/icon128.png` | 128×128 | all |

Marquee promo tile (1400×560) is optional and only needed for homepage features —
skipped for launch.

---

## Submit checklist

**Chrome Web Store** ([dashboard](https://chromewebstore.google.com/u/0/developer/dashboard))
1. Confirm the developer account exists ($5 one-time) and **2-Step Verification is ON** (required to upload).
2. New item → upload `dist/grabdown-chrome-0.1.0.zip`.
3. Store listing: paste name, summary, description; upload `screenshot-1/2.png` + `promo-tile.png`; set category Productivity.
4. Privacy practices: paste single purpose + the four permission justifications; set the privacy policy URL; declare no remote code; check the three data certifications.
5. Submit for review (typically a few days; can be up to ~3 weeks at peak).

**Edge Add-ons** ([Partner Center](https://partner.microsoft.com/dashboard/microsoftedge))
- Reuse the **same** `grabdown-chrome-0.1.0.zip`. Fill Properties + Privacy (same answers) + Store listing + search terms + certification notes.

**Firefox AMO** ([dashboard](https://addons.mozilla.org/developers/))
- Upload `dist/grabdown-firefox-0.1.0.zip` (listed). Paste the AMO summary + description; data collection = none; add reviewer notes.
