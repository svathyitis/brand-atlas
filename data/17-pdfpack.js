/* Brand Atlas - PDF pack builders (jsPDF).
 * lookupPack: official source links + license notes for a company.
 * kitPack: starter brand guidelines for the user's own venture.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PdfPack = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var M = 18;          // margin mm
  var PAGE_W = 210;

  function localDate() {
    var d = new Date();
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  function header(doc, title, subtitle) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(29, 27, 22);
    doc.text(title, M, 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(111, 106, 94);
    doc.text(subtitle, M, 31);
    doc.setDrawColor(227, 222, 212);
    doc.line(M, 35, PAGE_W - M, 35);
    return 44;
  }

  function footer(doc, text) {
    doc.setFontSize(8.5);
    doc.setTextColor(111, 106, 94);
    doc.text(text, M, 285);
  }

  function link(doc, label, url, y) {
    doc.setFontSize(11);
    doc.setTextColor(43, 94, 167);
    doc.textWithLink(label, M, y, { url: url });
    doc.setFontSize(9);
    doc.setTextColor(111, 106, 94);
    doc.text(doc.splitTextToSize(url, PAGE_W - 2 * M), M, y + 4.5);
    return y + 11;
  }

  // ---- Pack 1: official assets for a company you are visiting ----
  function lookupPack(jspdfNS, entry, detected, pageUrl) {
    var doc = new jspdfNS.jsPDF({ unit: "mm", format: "a4" });
    var y = header(doc, entry.name + " - official brand assets",
      "Collected by Brand Atlas from " + (pageUrl ? new URL(pageUrl).hostname : "the company site") +
      " on " + localDate());

    doc.setFontSize(12);
    doc.setTextColor(29, 27, 22);
    doc.setFont("helvetica", "bold");
    doc.text(entry.status === "official-assets"
      ? "This company publishes official brand assets."
      : "This company publishes guidelines but no public logo downloads.", M, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text("What they publish:", M, y); y += 5.5;
    entry.publishes.forEach(function (p) {
      doc.text("- " + p, M + 3, y); y += 5;
    });
    y += 4;

    doc.setFont("helvetica", "bold");
    doc.text("Official source", M, y); y += 6.5;
    doc.setFont("helvetica", "normal");
    y = link(doc, entry.brandPage, entry.brandPage, y) + 3;

    if (entry.assets && entry.assets.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Assets", M, y); y += 6.5;
      doc.setFont("helvetica", "normal");
      entry.assets.forEach(function (a) {
        y = link(doc, a.label, a.url, y);
      });
      y += 3;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Usage terms to know", M, y); y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(29, 27, 22);
    doc.text(doc.splitTextToSize(entry.licenseNote, PAGE_W - 2 * M), M, y);
    y += 6 + doc.splitTextToSize(entry.licenseNote, PAGE_W - 2 * M).length * 4.2;

    if (detected && detected.length) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text("Detected on the page (not verified as officially published)", M, y); y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(111, 106, 94);
      detected.slice(0, 6).forEach(function (d) {
        var line = d.kind === "img-svg" ? d.url : "Inline SVG in page (" + d.width + "x" + d.height + "px)";
        doc.text(doc.splitTextToSize("- " + line, PAGE_W - 2 * M), M, y);
        y += 5;
      });
    }

    footer(doc, "Brand Atlas - sources are the company's own published pages. Trademarks stay the property of their owners.");
    return doc;
  }

  // ---- Pack 2: starter brand guidelines for the user's own venture ----
  function svgToPngDataUrl(svgText, px, cb) {
    try {
      var img = new Image();
      var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
      img.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width = px; canvas.height = px;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, px, px);
        cb(null, canvas.toDataURL("image/png"));
      };
      img.onerror = function () { cb(new Error("svg render failed")); };
      img.src = url;
    } catch (e) { cb(e); }
  }

  function kitPack(jspdfNS, opts, done) {
    var doc = new jspdfNS.jsPDF({ unit: "mm", format: "a4" });
    var c = opts.palette.colors;

    function finish(logoDataUrl) {
      // Page 1: cover + logo
      var y = header(doc, opts.name + " - brand starter kit",
        "Generated from your brief by Brand Atlas on " + localDate() +
        " - a starting point, not finished artwork");
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", (PAGE_W - 60) / 2, y + 6, 60, 60);
        y += 74;
      }
      doc.setFontSize(11);
      doc.setTextColor(29, 27, 22);
      doc.setFont("helvetica", "bold");
      doc.text("Your brief", M, y); y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(doc.splitTextToSize(opts.description || "(no description given)", PAGE_W - 2 * M), M, y);
      y += 8 + doc.splitTextToSize(opts.description || "", PAGE_W - 2 * M).length * 4.2;
      doc.setFont("helvetica", "bold");
      doc.text("How the brief was read", M, y); y += 6;
      doc.setFont("helvetica", "normal");
      var read = [];
      if (opts.brief.references.length) {
        opts.brief.references.forEach(function (r) {
          read.push(r.name + " -> " + r.traits.join("; "));
        });
      }
      if (opts.brief.hueSource) read.push('"' + opts.brief.hueSource + '" set the colour family');
      if (!read.length) read.push("Built from the words of the brief itself");
      doc.text(doc.splitTextToSize(read.join(". "), PAGE_W - 2 * M), M, y);

      // Page 2: colour
      doc.addPage();
      y = header(doc, "Colour", "Direction: " + opts.palette.name.toLowerCase() + " harmony");
      var keys = [["primary", "Primary"], ["secondary", "Secondary"], ["accent", "Accent"], ["ink", "Ink (text)"], ["paper", "Paper (background)"]];
      keys.forEach(function (k) {
        var hex = c[k[0]];
        var rgb = /^#(..)(..)(..)$/.exec(hex).slice(1).map(function (h) { return parseInt(h, 16); });
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.roundedRect(M, y, 50, 16, 2, 2, "F");
        doc.setFontSize(10.5);
        doc.setTextColor(29, 27, 22);
        doc.setFont("helvetica", "bold");
        doc.text(k[1], M + 56, y + 7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(111, 106, 94);
        doc.text(hex, M + 56, y + 12.5);
        y += 22;
      });
      footer(doc, opts.name + " starter kit - colour");

      // Page 3: type + usage
      doc.addPage();
      y = header(doc, "Type and usage", "Suggested starting pair - swap freely with your designer");
      doc.setFontSize(11);
      doc.setTextColor(29, 27, 22);
      doc.setFont("helvetica", "bold");
      doc.text(opts.fonts.name, M, y); y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Headings: " + opts.fonts.heading, M, y); y += 5.5;
      doc.text("Body: " + opts.fonts.body, M, y); y += 5.5;
      doc.setTextColor(111, 106, 94);
      doc.text("Best for: " + opts.fonts.use, M, y); y += 12;

      doc.setTextColor(29, 27, 22);
      doc.setFont("helvetica", "bold");
      doc.text("Working rules", M, y); y += 6.5;
      doc.setFont("helvetica", "normal");
      [
        "Give the logo clear space: at least the height of its letter on every side.",
        "Use the primary colour for the mark; the accent is for one element per page.",
        "Keep body text in the ink colour on the paper colour.",
        "Do not stretch, recolor or add effects to the mark."
      ].forEach(function (rule) {
        doc.text("- " + rule, M, y); y += 5.5;
      });
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(111, 106, 94);
      doc.text(doc.splitTextToSize(
        "This kit is a procedurally generated starting point from your description. It is original geometry - " +
        "it does not copy any referenced brand's logo or artwork. Have a designer refine it before you ship it.",
        PAGE_W - 2 * M), M, y);
      footer(doc, opts.name + " starter kit - type and usage");

      done(doc);
    }

    svgToPngDataUrl(opts.mark.svg, 480, function (err, dataUrl) {
      finish(err ? null : dataUrl);
    });
  }

  return { lookupPack: lookupPack, kitPack: kitPack };
})();
