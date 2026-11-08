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

## v0.2.0 (review branch `next-version`)

**New: scan any site for official brand pages.** On a site that isn't in the
hand-verified directory, "Scan this site for official brand pages" runs one
bounded check, only when clicked: it reads brand/press-looking links on the
current page and probes 16 common official paths (`/press`, `/brand`,
`/media-kit`, …) - around 20 requests to the site itself, from the page's own
context (no third-party services, no cross-origin reads, no background
crawling). Results are reported as evidence:

- Pages that actually answered, with the links they publish. Downloadable
  asset links (logo zips, SVGs, guideline PDFs) are listed with the official
  page that publishes them; assets hosted on another domain are kept and
  labelled with their host, since the official page links to them.
- A press/brand page with no downloads is reported as "no downloadable kit or
  guidelines found on this page" - a press contact page is not a guidelines
  page.
- Sites that answer every path with the same app shell (client-side routers)
  are reported as such, not as pages found.
- Brand-looking pages on a company's other domains that an official page
  links to (for example a Brand Center) are listed as "linked from the
  official page" but not fetched.
- Nothing found says exactly that about the checked paths and links - it is
  never a claim that the company publishes nothing.

Known limits: logos shown incidentally in a page (nav, footer) are site
decoration, not published assets, and are never listed as downloads (the
existing "detected on this page" section shows them as unverified). On sites
whose paths belong to users rather than the company (for example
github.com/<user>), path probes can surface user pages that merely have
brand-ish names - read the listed pages before relying on them. Pages that
render only in a browser are labelled as unreadable by the scan.

**New: Try more options.** The own-kit generator keeps your brief and adds a
refresh that produces genuinely different colour harmonies (rotating five
harmony builders, shifted starting hue), different logo concept orderings and
a different font pairing on each click. Pin any palette or logo with "Keep"
and it stays - pinned logos are redrawn in the current palette. The first
suggestions for a given brief are unchanged from v0.1.0.

No new permissions: scanning uses the existing `activeTab` + `scripting`
grants and runs entirely in the scanned page's own context.
