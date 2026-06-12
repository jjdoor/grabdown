# Grabdown Privacy Policy

_Last updated: 2026-06-12_

**Grabdown does not collect, store, transmit, or share any data. Full stop.**

Grabdown runs entirely on your device. When you invoke it (via the right-click
menu, the toolbar button, or the keyboard shortcut), it reads the content you
selected on the current page, converts that content to Markdown, and writes the
result to your clipboard. That is the whole story.

Specifically, Grabdown:

- **Makes no network requests.** Nothing you select or convert ever leaves your
  browser. There is no server, no API, no analytics, no telemetry.
- **Stores nothing.** It keeps no history, no database, no logs. It does not use
  `storage`, cookies, or any persistence.
- **Has no account and no identifiers.** There is nothing to sign in to and
  nothing that identifies you.
- **Accesses a page only when you ask.** It uses the `activeTab` permission, so
  it can read page content only on the tab where you actively invoke it, only at
  the moment you invoke it.

## Permissions

| Permission | Why |
| --- | --- |
| `activeTab` | Read the current tab's selected content — only when you invoke Grabdown. |
| `scripting` | Run the bundled converter on that content to produce Markdown. |
| `contextMenus` | Add the "Copy … as Markdown" right-click menu items. |
| `clipboardWrite` | Put the converted Markdown on your clipboard (the output). |

No host permissions are requested. No remote code is loaded or executed.

## Contact

Questions or concerns: open an issue at
<https://github.com/jjdoor/grabdown/issues>.
