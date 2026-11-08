/* Brand Atlas - on-page logo detector.
 * Injected on demand (only when the popup asks) into the active tab.
 * Returns SVG marks found on the page. These are NOT verified as officially
 * published assets - the popup labels them "detected on this page".
 */
(function () {
  "use strict";
  var MAX_SVG_BYTES = 60000;
  var results = [];

  function likelyLogo(el) {
    var chain = el;
    for (var i = 0; i < 4 && chain; i++, chain = chain.parentElement) {
      var idc = ((chain.id || "") + " " + (chain.className && chain.className.baseVal !== undefined ? chain.className.baseVal : chain.className || "")).toString().toLowerCase();
      if (/\b(logo|brand|masthead|site-header|header)\b/.test(idc)) return true;
      var tag = chain.tagName ? chain.tagName.toLowerCase() : "";
      if (tag === "header" || tag === "nav") return true;
    }
    return false;
  }

  // Inline SVGs
  var svgs = document.querySelectorAll("svg");
  for (var i = 0; i < svgs.length && results.length < 8; i++) {
    var s = svgs[i];
    var text = new XMLSerializer().serializeToString(s);
    if (text.length > MAX_SVG_BYTES) continue;
    var r = s.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    results.push({
      kind: "inline-svg",
      svg: text,
      width: Math.round(r.width),
      height: Math.round(r.height),
      logoish: likelyLogo(s)
    });
  }

  // <img> tags pointing at .svg files served by this site
  var imgs = document.querySelectorAll('img[src$=".svg"], img[src*=".svg?"], img[src*=".svg#"]');
  for (var j = 0; j < imgs.length && results.length < 12; j++) {
    var im = imgs[j];
    var rr = im.getBoundingClientRect();
    if (rr.width < 8 || rr.height < 8) continue;
    results.push({
      kind: "img-svg",
      url: im.src,
      alt: im.alt || "",
      width: Math.round(rr.width),
      height: Math.round(rr.height),
      logoish: likelyLogo(im)
    });
  }

  results.sort(function (a, b) { return (b.logoish ? 1 : 0) - (a.logoish ? 1 : 0); });
  return { host: location.hostname, found: results.slice(0, 12) };
})();
