/* Brand Atlas - on-demand official brand-page scanner.
 * Injected into the active tab ONLY when the user clicks "Scan this site".
 * Everything runs in the page's own context, so every request is a normal
 * same-origin request from the site to itself - no cross-origin fetches,
 * no third-party services, no background crawling.
 *
 * Bounded by design: at most 3 link-derived pages + 16 probed paths +
 * 1 sitemap fetch = 20 requests per click, sequential, with small gaps.
 *
 * What it returns is evidence, not guesses: pages that actually answered,
 * and asset links those pages explicitly publish. A page without
 * downloadable assets is reported as "no downloadable kit or guidelines
 * found on checked pages" - never as proof that none exists anywhere.
 */
(async function () {
  "use strict";
  var ORIGIN = location.origin;
  var PROBE_PATHS = [
    "/press", "/press-kit", "/presskit", "/brand", "/branding",
    "/brand-assets", "/brandassets", "/media", "/media-kit", "/mediakit",
    "/newsroom", "/about/brand", "/logos", "/brand-guidelines",
    "/style-guide", "/design"
  ];
  var MAX_LINK_PAGES = 3;      // pages found through links on this page
  var MAX_PAGES = 4;           // total pages analysed per scan
  var MAX_HTML = 1500000;      // cap page size read
  var GAP_MS = 120;

  // A page URL is a candidate when its path or link text points at official
  // brand material. Asset files themselves are collected separately.
  var PAGE_RE = /\b(brand|branding|press|newsroom|logos?|guidelines?|identity|media[-_ ]?kit|press[-_ ]?kit|brand[-_ ]?assets?|style[-_ ]?guide)\b/i;
  var ASSET_EXT_RE = /\.(zip|svg|eps|ai|sketch|pdf)(\?|#|$)/i;
  var PNG_RE = /\.(png)(\?|#|$)/i;
  var ASSET_CTX_RE = /logo|brand|asset|press|media|icon|identity|mark|download/i;

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function absolute(u, base) {
    try { return new URL(u, base || location.href).href; } catch (e) { return null; }
  }
  function sameOrigin(u) {
    try { return new URL(u).origin === ORIGIN; } catch (e) { return false; }
  }
  // Rough registrable-domain match (last two labels). Good enough to spot a
  // company's own subdomains (brand.example.com) without a public-suffix list.
  function rootDomain(h) {
    var parts = (h || "").split(".");
    return parts.length >= 2 ? parts.slice(-2).join(".") : h;
  }
  var ROOT = rootDomain(location.hostname);
  function sameCompanySite(u) {
    try { return rootDomain(new URL(u).hostname) === ROOT; } catch (e) { return false; }
  }
  function hostOf(u) {
    try { return new URL(u).hostname; } catch (e) { return ""; }
  }
  function strip(u) { return u.split("#")[0]; }

  var stats = { linkPagesFetched: 0, pathsProbed: 0, requests: 0, blocked: false };

  // ---------- Phase 1: candidate links already on this page ----------
  var linkCandidates = [];   // {url, text}
  var offsiteCandidates = []; // official-looking pages on this company's other sites (not fetched)
  var seenOffsite = {};
  var seenLink = {};
  var anchors = document.querySelectorAll("a[href]");
  for (var i = 0; i < anchors.length; i++) {
    var a = anchors[i];
    var abs = absolute(a.getAttribute("href"));
    if (!abs) continue;
    if (!sameOrigin(abs)) {
      // A different site owned by the same company (brand.example.com): we
      // cannot read it from this page, but the link itself is evidence.
      if (sameCompanySite(abs) && /^https?:/.test(abs)) {
        var octx = ((a.textContent || "").slice(0, 60) + " " + (a.getAttribute("aria-label") || "") + " " + hostOf(abs) + " " + (function(){ try { return new URL(abs).pathname; } catch (e) { return ""; } })()).toLowerCase();
        if (PAGE_RE.test(octx) && !ASSET_EXT_RE.test(abs)) {
          var okey = strip(abs);
          if (!seenOffsite[okey]) {
            seenOffsite[okey] = true;
            offsiteCandidates.push({ url: abs, text: (a.textContent || "").trim().slice(0, 60) });
          }
        }
      }
      continue;
    }
    abs = strip(abs);
    var pathOnly;
    try { pathOnly = new URL(abs).pathname; } catch (e) { continue; }
    var ctx = ((a.textContent || "").slice(0, 60) + " " + (a.getAttribute("aria-label") || "") + " " + pathOnly).toLowerCase();
    if (ASSET_EXT_RE.test(abs)) continue;              // asset links handled in page analysis
    if (!PAGE_RE.test(ctx)) continue;
    if (seenLink[abs]) continue;
    seenLink[abs] = true;
    linkCandidates.push({ url: abs, text: (a.textContent || "").trim().slice(0, 60) });
    if (linkCandidates.length >= 12) break;
  }

  // ---------- helpers ----------
  function pathOf(u) { try { return new URL(u).pathname.replace(/\/+$/, "") || "/"; } catch (e) { return ""; } }

  async function fetchPage(u, via) {
    stats.requests++;
    try {
      var r = await fetch(u, { method: "GET", credentials: "omit", redirect: "follow" });
      if (!r.ok) return null;
      var ct = (r.headers.get("content-type") || "").toLowerCase();
      if (ct.indexOf("text/html") === -1) return null;
      var finalUrl = r.url || u;
      // Soft-404 guard: many sites answer every unknown path with their
      // homepage or a generic shell (200, no real page). If the server sent us
      // somewhere else, the final path must itself look brand-relevant,
      // otherwise the probe found nothing.
      if (pathOf(finalUrl) !== pathOf(u) && !PAGE_RE.test(pathOf(finalUrl))) return null;
      var html = await r.text();
      if (html.length > MAX_HTML) html = html.slice(0, MAX_HTML);
      return { url: finalUrl, requested: u, via: via, html: html, htmlLen: html.length, redirected: pathOf(finalUrl) !== pathOf(u) };
    } catch (e) {
      return null;   // network/CORS refusal - just means this scan can't read it
    }
  }

  // Asset links a page explicitly publishes: the link target is a brand-file
  // type AND the link's own context says logo/brand/asset. An <img> on the
  // page is NOT a published asset - it is decoration, and stays out.
  function extractAssets(doc, pageUrl) {
    var out = [];
    var seen = {};
    var links = doc.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var l = links[i];
      var href = absolute(l.getAttribute("href"), pageUrl);
      if (!href) continue;
      var isAsset = ASSET_EXT_RE.test(href);
      // PNGs only count when the context explicitly says logo/brand, since
      // most PNG links on the web are not brand assets.
      if (!isAsset && !(PNG_RE.test(href))) continue;
      var ctx = ((l.textContent || "") + " " + (l.getAttribute("aria-label") || "") + " " +
        (l.getAttribute("download") !== null ? "download" : "") + " " + href).toLowerCase();
      if (!ASSET_CTX_RE.test(ctx)) continue;
      if (isAsset === false && !/logo|brand|mark/.test(ctx)) continue;
      var clean = strip(href);
      if (seen[clean]) continue;
      seen[clean] = true;
      out.push({
        url: href,
        label: (l.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80) || href.split("/").pop().slice(0, 60),
        host: hostOf(href),
        onSite: sameOrigin(href)
      });
      if (out.length >= 12) break;
    }
    return out;
  }

  function analyse(page) {
    var doc;
    try { doc = new DOMParser().parseFromString(page.html, "text/html"); }
    catch (e) { return null; }
    var title = ((doc.querySelector("title") || {}).textContent || "").trim().slice(0, 120);
    var assets = extractAssets(doc, page.url);
    // Guidelines text present? (a page that IS a guideline, not a download)
    var bodyText = (doc.body ? doc.body.textContent || "" : "");
    var visibleChars = bodyText.replace(/\s+/g, "").length;
    var low = bodyText.slice(0, 20000).toLowerCase();
    var hasGuidelineText = /trademark|usage|clear space|minimum size|colour palette|color palette|do not alter|brand guideline/.test(low);
    var notFoundTitle = /404|not found|page missing/i.test(title);
    // Brand-ish pages on OTHER sites that this official page itself links to
    // (a company Brand Center on another domain, an asset CDN portal). The
    // official page vouches for them; we report, we don't fetch.
    var outLinks = [];
    var seenOut = {};
    var al = doc.querySelectorAll("a[href]");
    for (var k = 0; k < al.length && outLinks.length < 3; k++) {
      var la = al[k];
      var lhref = absolute(la.getAttribute("href"), page.url);
      if (!lhref || !/^https?:/.test(lhref)) continue;
      if (hostOf(lhref) === location.hostname) continue;
      if (sameOrigin(lhref)) continue;
      if (ASSET_EXT_RE.test(lhref)) continue;
      var lctx = ((la.textContent || "").slice(0, 60) + " " + (la.getAttribute("aria-label") || "") + " " + (function(){ try { return new URL(lhref).pathname + " " + new URL(lhref).hostname; } catch (e) { return ""; } })()).toLowerCase();
      if (!PAGE_RE.test(lctx)) continue;
      var okey2 = strip(lhref);
      if (seenOut[okey2]) continue;
      seenOut[okey2] = true;
      outLinks.push({ url: lhref, text: (la.textContent || "").trim().slice(0, 60), from: page.url });
    }
    return {
      url: page.url, requested: page.requested, via: page.via,
      title: title, assets: assets, hasGuidelineText: hasGuidelineText,
      shell: visibleChars < 400,   // JS-rendered page: real content needs a browser
      notFoundTitle: notFoundTitle,
      outLinks: outLinks
    };
  }

  // ---------- Phase 2: fetch link-derived candidate pages ----------
  var pages = [];
  for (var c = 0; c < linkCandidates.length && stats.linkPagesFetched < MAX_LINK_PAGES && pages.length < MAX_PAGES; c++) {
    await sleep(GAP_MS);
    var pg = await fetchPage(linkCandidates[c].url, "link:" + (linkCandidates[c].text || "page link"));
    stats.linkPagesFetched++;
    if (pg) pages.push(pg);
  }

  // ---------- Phase 3: probe common official paths on this origin ----------
  for (var p = 0; p < PROBE_PATHS.length && pages.length < MAX_PAGES; p++) {
    var path = PROBE_PATHS[p];
    if (seenLink[ORIGIN + path]) continue;   // already fetched via link
    await sleep(GAP_MS);
    stats.pathsProbed++;
    var probed = await fetchPage(ORIGIN + path, "path:" + path);
    if (probed) pages.push(probed);
  }

  // ---------- Phase 4: analyse ----------
  var analysed = [];
  var seenPage = {};
  for (var q = 0; q < pages.length; q++) {
    var key = strip(pages[q].url);
    if (seenPage[key]) continue;
    seenPage[key] = true;
    var a2 = analyse(pages[q]);
    if (a2 && !a2.notFoundTitle) {
      a2.htmlLen = pages[q].htmlLen || 0;
      analysed.push(a2);
    }
  }

  // SPA / router fallback: several distinct probed paths answering with the
  // same titled, same-sized page means the site serves one shell for
  // everything. Those are not official pages - report them as what they are.
  var shellSig = {};
  for (var s = 0; s < analysed.length; s++) {
    if (analysed[s].via.indexOf("path:") !== 0) continue;
    var sig = analysed[s].title + "|" + Math.round((analysed[s].htmlLen || 0) / 200);
    shellSig[sig] = (shellSig[sig] || 0) + 1;
  }
  var results = [];
  var shellPaths = [];
  for (var t = 0; t < analysed.length; t++) {
    var pg2 = analysed[t];
    var sig2 = pg2.title + "|" + Math.round((pg2.htmlLen || 0) / 200);
    if (pg2.via.indexOf("path:") === 0 && shellSig[sig2] >= 2) {
      shellPaths.push(pg2.via.slice(5));
      continue;
    }
    delete pg2.htmlLen;
    results.push(pg2);
  }

  var offsiteMerged = offsiteCandidates.slice();
  var seenMerged = {};
  for (var m2 = 0; m2 < offsiteMerged.length; m2++) seenMerged[strip(offsiteMerged[m2].url)] = true;
  for (var r2 = 0; r2 < results.length; r2++) {
    var ol = results[r2].outLinks || [];
    for (var o2 = 0; o2 < ol.length && offsiteMerged.length < 6; o2++) {
      var kk = strip(ol[o2].url);
      if (seenMerged[kk]) continue;
      seenMerged[kk] = true;
      offsiteMerged.push(ol[o2]);
    }
    delete results[r2].outLinks;
  }

  return {
    host: location.hostname,
    pageUrl: location.href,
    pages: results,
    shellPaths: shellPaths,
    offsiteLinks: offsiteMerged.slice(0, 6),
    checkedPaths: PROBE_PATHS.slice(0, Math.max(stats.pathsProbed, 0)),
    stats: stats
  };
})();
