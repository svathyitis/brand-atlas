# Brand Atlas (prototype)

A Chrome extension with two modes:

1. **Find official assets** — on a company's website, shows the brand assets the
   company itself publishes: logo packages, brand books, guideline pages, each
   with its official source link, plus a PDF pack collecting those links.
   Companies whose official pages publish guidelines but no downloadable logo
   assets (Apple, Microsoft - verified 9 Nov 2026) say so instead of inventing assets. SVG marks merely found in the page DOM
   are listed separately as "detected on this page — not verified as officially
   published".
2. **Make your own kit** — describe your venture in plain words, optionally
   referencing sites you like ("I like Apple's website"). The extension reads
   the brief back to you in plain language, then offers original colour
   directions and geometric logo directions to pick from, and builds a
   brand-guidelines starter PDF. Generation is procedural and on-device; it is
   not AI image generation and never copies a referenced brand's mark.

## Install

1. Open `chrome://extensions`
2. Enable Developer mode
3. "Load unpacked" and choose this folder

## Permissions

`activeTab`, `scripting`, `downloads`. Nothing else: no browsing history, no
cookies, no storage, no host permissions. The directory and kit generation run on-device; downloading an official asset or opening a source link goes to the company's own site. The
on-page scan runs only when the popup is opened, only on the tab you opened
it on.

## Directory

`data/directory.json` is a hand-verified starter directory (GitHub, Figma,
Slack, Angular, Apple, Microsoft, verified 9 Nov 2026). An entry is added only
after its official source is checked by hand. Third-party libraries: jsPDF
(MIT) in `vendor/`.

## Tested

Real Chrome 156 with the extension loaded: GitHub lookup (official ZIP
download verified, 132 files inside), Microsoft guidelines-only state, unknown
site state, brief interpretation with the "Orange + Apple" example, unknown
reference disambiguation, both PDF packs generated and their contents checked.
