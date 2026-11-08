/* Brand Atlas - popup logic. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var jspdf = window.jspdf;

  var state = {
    tab: null,            // the tab the user is looking at (never the popup itself)
    entry: null,          // directory entry or null
    detected: [],         // on-page SVG detections
    directory: null,
    // create mode
    palettes: null, brief: null, marks: null,
    chosenPalette: null, chosenMark: null,
    variant: 0,            // refresh round: 0 = first suggestions
    keptPalette: null, keptMark: null,   // pinned with Keep
    scanning: false
  };

  function hostnameOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return null; }
  }

  function findEntry(host) {
    if (!host || !state.directory) return null;
    var parts = host.split(".");
    for (var i = 0; i < state.directory.companies.length; i++) {
      var c = state.directory.companies[i];
      for (var j = 0; j < c.domains.length; j++) {
        var d = c.domains[j];
        if (host === d) return c;
        // subdomains of a listed domain match the company (developer.apple.com -> apple.com)
        if (host.length > d.length && host.slice(-(d.length + 1)) === "." + d) return c;
      }
    }
    return null;
  }

  // Pick the tab the user is actually viewing. The worker remembers the last
  // web tab the user looked at; fall back to the active http(s) tab.
  function resolveTargetTab(cb) {
    function fallback() {
      chrome.tabs.query({ currentWindow: true }, function (tabs) {
        var candidate = null, active = null;
        for (var i = 0; i < tabs.length; i++) {
          var t = tabs[i];
          if (t.url && t.url.indexOf("chrome-extension://") === 0) continue;
          if (t.active) active = t;
          if (/^https?:/.test(t.url || "")) candidate = candidate || t;
          if (t.active && /^https?:/.test(t.url || "")) { candidate = t; break; }
        }
        cb(candidate || active || null);
      });
    }
    try {
      chrome.runtime.sendMessage({ type: "get-target-tab" }, function (res) {
        if (chrome.runtime.lastError || !res || typeof res.tabId !== "number") return fallback();
        chrome.tabs.get(res.tabId, function (tab) {
          if (chrome.runtime.lastError || !tab) return fallback();
          cb(tab);
        });
      });
    } catch (e) { fallback(); }
  }

  // ---------- Lookup mode ----------

  function renderAssetRow(asset, inDetected) {
    var row = document.createElement("div");
    row.className = "asset";
    var left = document.createElement("div");
    var label = document.createElement("div");
    label.className = "label";
    label.textContent = asset.label || asset.alt || asset.url || "SVG found in page";
    left.appendChild(label);
    var type = document.createElement("div");
    type.className = "type";
    type.textContent = inDetected ? "on this page · unverified" : (asset.type || "file");
    left.appendChild(type);
    row.appendChild(left);

    var btn = document.createElement("button");
    if (inDetected && asset.kind === "inline-svg") {
      btn.textContent = "Save SVG";
      btn.onclick = function () {
        var blob = new Blob([asset.svg], { type: "image/svg+xml" });
        var url = URL.createObjectURL(blob);
        chrome.runtime.sendMessage({ type: "download-asset", url: url }, function () {});
      };
    } else {
      btn.textContent = asset.type === "page" ? "Open" : "Download";
      btn.onclick = function () {
        if (asset.type === "page") chrome.tabs.create({ url: asset.url });
        else chrome.runtime.sendMessage({ type: "download-asset", url: asset.url }, function () {});
      };
    }
    row.appendChild(btn);
    return row;
  }

  function renderDetected(listEl, box) {
    listEl.textContent = "";
    if (!state.detected.length) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    state.detected.forEach(function (d) {
      listEl.appendChild(renderAssetRow(d, true));
    });
  }

  function renderLookup() {
    $("lookup-loading").hidden = true;
    var entry = state.entry;
    if (!entry) {
      $("lookup-none").hidden = false;
      $("none-host").textContent = hostnameOf(state.tab && state.tab.url) || "This page";
      renderDetected($("detected-list-2"), $("detected-box-2"));
      return;
    }
    $("lookup-result").hidden = false;
    $("co-name").textContent = entry.name;
    var chip = $("co-status");
    if (entry.status === "official-assets") {
      chip.textContent = "Publishes official assets";
      chip.className = "chip ok";
    } else {
      chip.textContent = "Guidelines only";
      chip.className = "chip warn";
    }
    var link = $("co-brandpage");
    link.href = entry.brandPage;
    link.textContent = "Official source: " + entry.brandPage.replace(/^https?:\/\//, "");
    var pub = $("co-publishes");
    pub.textContent = "";
    entry.publishes.forEach(function (p) {
      var li = document.createElement("li");
      li.textContent = p;
      pub.appendChild(li);
    });
    $("co-license").textContent = entry.licenseNote;
    var assets = $("co-assets");
    assets.textContent = "";
    entry.assets.forEach(function (a) { assets.appendChild(renderAssetRow(a, false)); });
    renderDetected($("detected-list"), $("detected-box"));
  }

  function initLookup() {
    resolveTargetTab(function (tab) {
      state.tab = tab;
      state.entry = findEntry(hostnameOf(tab && tab.url));
      // On-page detection only runs on the tab the user opened the popup on.
      if (tab && /^https?:/.test(tab.url || "")) {
        chrome.scripting.executeScript(
          { target: { tabId: tab.id }, files: ["content/detect.js"] },
          function (res) {
            if (!chrome.runtime.lastError && res && res[0] && res[0].result) {
              state.detected = res[0].result.found || [];
            }
            renderLookup();
          }
        );
      } else {
        renderLookup();
      }
    });
  }

  $("btn-pack").addEventListener("click", function () {
    var doc = PdfPack.lookupPack(jspdf, state.entry, state.detected, state.tab && state.tab.url);
    doc.save("brand-atlas-" + state.entry.name.toLowerCase().replace(/\s+/g, "-") + ".pdf");
  });

  // ---------- Create mode ----------

  function swatch(color) {
    var d = document.createElement("div");
    d.className = "swatch";
    d.style.background = color;
    var s = document.createElement("small");
    s.textContent = color;
    s.style.color = BrandGen.labelColorFor(color);
    d.appendChild(s);
    return d;
  }

  function renderInterpretation() {
    var b = state.brief;
    var parts = [];
    if (b.references.length) {
      b.references.forEach(function (r) {
        parts.push('"' + r.name + '" is on my short list of known site styles: ' + r.traits.join("; ") + ". I will not copy their logo or artwork.");
      });
    }
    if (b.hueSource) parts.push('"' + b.hueSource + '" is a word I know, and it points me to this colour family.');
    if (b.subjects.length) parts.push('"' + b.subjects.join('", "') + '" gives me the subject for the logo concepts below.');
    if (!parts.length) parts.push("Nothing in your brief matched my built-in lists, so the directions below start from neutral geometry.");
    $("interpretation").textContent = parts.join(" ");
    $("unknown-refs").hidden = false;
    var boundary = "I work from small built-in lists of known site styles, colour words and subjects - I don't understand arbitrary brands, sites or styles.";
    if (b.unknownRefs.length) {
      boundary = "I don't know " + b.unknownRefs.join(", ") +
        " - tell me what you like about it in plain words (for example: spacious, playful, dark) and I'll use that. " + boundary;
    }
    $("unknown-refs").textContent = boundary;
  }

  function paletteKey(p) { return p.name + "|" + JSON.stringify(p.colors); }

  function makeKeepToggle(isKept, onToggle) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "keep-toggle";
    b.setAttribute("aria-pressed", isKept ? "true" : "false");
    b.textContent = isKept ? "Kept" : "Keep";
    b.addEventListener("click", function (ev) {
      ev.stopPropagation();
      onToggle();
    });
    return b;
  }

  function renderPalettes() {
    var list = $("palette-list");
    list.textContent = "";
    var all = [];
    if (state.keptPalette &&
        !state.palettes.some(function (p) { return paletteKey(p) === paletteKey(state.keptPalette); })) {
      all.push(state.keptPalette);   // pinned palette stays visible across refreshes
    }
    all = all.concat(state.palettes);
    all.forEach(function (p) {
      var kept = state.keptPalette && paletteKey(p) === paletteKey(state.keptPalette);
      var card = document.createElement("div");
      card.className = "card" + (kept ? " kept" : "");
      var t = document.createElement("div");
      t.className = "card-title";
      t.textContent = p.name;
      card.appendChild(t);
      var sw = document.createElement("div");
      sw.className = "swatches";
      ["primary", "secondary", "accent", "ink", "paper"].forEach(function (k) {
        sw.appendChild(swatch(p.colors[k]));
      });
      card.appendChild(sw);
      card.appendChild(makeKeepToggle(kept, function () {
        state.keptPalette = kept ? null : p;
        if (state.keptPalette) state.chosenPalette = p;
        renderPalettes();
        renderMarks();
        maybeEnableKit();
      }));
      card.onclick = function () {
        state.chosenPalette = p;
        Array.prototype.forEach.call(list.children, function (c) { c.classList.remove("selected"); });
        card.classList.add("selected");
        renderMarks();
        maybeEnableKit();
      };
      if (state.chosenPalette && paletteKey(p) === paletteKey(state.chosenPalette)) {
        card.classList.add("selected");
      }
      list.appendChild(card);
    });
  }

  function renderMarks() {
    var list = $("mark-list");
    list.textContent = "";
    if (!state.chosenPalette) return;
    var name = $("in-name").value, desc = $("in-desc").value;
    state.marks = BrandGen.makeMarks(name, desc, state.chosenPalette, state.variant);
    // A pinned logo stays pinned across refreshes, redrawn in the current palette.
    if (state.keptMark) {
      var redrawn = BrandGen.drawMarkById(state.keptMark.id, name, state.chosenPalette);
      if (redrawn) {
        state.keptMark = redrawn;
        if (!state.marks.some(function (m) { return m.id === redrawn.id; })) {
          state.marks.unshift(redrawn);
        }
      }
    }
    var scopeNoteId = "mark-scope-note";
    var oldNote = document.getElementById(scopeNoteId);
    if (oldNote) oldNote.remove();
    if (state.keptMark && !state.keptPalette) {
      var scope = document.createElement("p");
      scope.id = scopeNoteId;
      scope.className = "fineprint";
      scope.textContent = "Your kept logo keeps its shape; its colours follow whichever colour direction is selected.";
      list.parentNode.insertBefore(scope, list);
    }
    var stillThere = false;
    state.marks.forEach(function (mk) {
      var kept = state.keptMark && mk.id === state.keptMark.id;
      var card = document.createElement("div");
      card.className = "card mark-card" + (kept ? " kept" : "");
      var box = document.createElement("div");
      box.className = "svgbox";
      box.innerHTML = mk.svg;
      card.appendChild(box);
      var t = document.createElement("div");
      t.className = "card-title";
      t.textContent = mk.label;
      card.appendChild(t);
      card.appendChild(makeKeepToggle(kept, function () {
        state.keptMark = kept ? null : mk;
        if (state.keptMark) state.chosenMark = mk;
        renderMarks();
        maybeEnableKit();
      }));
      card.onclick = function () {
        state.chosenMark = mk;
        Array.prototype.forEach.call(list.children, function (c) { c.classList.remove("selected"); });
        card.classList.add("selected");
        maybeEnableKit();
      };
      if (state.chosenMark && mk.id === state.chosenMark.id) {
        card.classList.add("selected");
        stillThere = true;
      }
      list.appendChild(card);
    });
    if (!stillThere) state.chosenMark = state.keptMark || null;
    maybeEnableKit();
  }

  function maybeEnableKit() {
    $("btn-kit").disabled = !(state.chosenPalette && state.chosenMark);
  }

  $("btn-interpret").addEventListener("click", function () {
    var name = $("in-name").value.trim();
    var desc = $("in-desc").value.trim();
    if (!name) { $("in-name").focus(); return; }
    var res = BrandGen.makePalettes(name, desc, 0);
    state.brief = res.brief;
    state.palettes = res.palettes;
    state.variant = 0;
    state.keptPalette = null;
    state.keptMark = null;
    state.chosenPalette = null;
    state.chosenMark = null;
    renderInterpretation();
    renderPalettes();
    renderMarks();
    $("brief-step").hidden = true;
    $("interpret-step").hidden = false;
    var firstPalette = document.querySelector("#palette-list .card");
    if (firstPalette) firstPalette.click();
  });

  $("btn-rebrief").addEventListener("click", function () {
    $("interpret-step").hidden = true;
    $("brief-step").hidden = false;
  });

  $("btn-refresh").addEventListener("click", function () {
    var name = $("in-name").value.trim();
    var desc = $("in-desc").value.trim();
    state.variant++;
    var res = BrandGen.makePalettes(name, desc, state.variant);
    state.palettes = res.palettes;
    // A kept logo must survive refresh: keep its palette as the colour base when no palette is pinned.
    state.chosenPalette = state.keptPalette || (state.keptMark ? state.chosenPalette : null);
    if (!state.keptMark) state.chosenMark = null;
    renderPalettes();
    // reselect the kept palette card if there is one, else clear marks
    if (state.chosenPalette) {
      renderMarks();
    } else {
      state.marks = null;
      $("mark-list").textContent = "";
      maybeEnableKit();
    }
  });

  $("btn-kit").addEventListener("click", function () {
    var name = $("in-name").value.trim();
    var desc = $("in-desc").value.trim();
    var fonts = BrandGen.fontsFor(desc || name, state.variant);
    PdfPack.kitPack(jspdf, {
      name: name,
      description: desc,
      brief: state.brief,
      palette: state.chosenPalette,
      mark: state.chosenMark,
      fonts: fonts
    }, function (doc) {
      doc.save("brand-atlas-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-starter-kit.pdf");
    });
  });

  // ---------- Site scan (lookup mode, directory miss) ----------

  function renderScan(res) {
    $("scan-status").hidden = true;
    var box = $("scan-results");
    box.hidden = false;
    box.textContent = "";
    var summary = document.createElement("p");
    summary.className = "scan-note";
    var parts = [];
    if (res.checkedPaths.length) parts.push(res.checkedPaths.length + " common paths");
    if (res.stats.linkPagesFetched) parts.push(res.stats.linkPagesFetched + " links from this page");
    summary.textContent = "Checked " + (parts.join(" and ") || "this page") + " on " + res.host +
      " (" + res.stats.requests + " requests to the site).";
    box.appendChild(summary);

    if (res.shellPaths && res.shellPaths.length) {
      var sh = document.createElement("p");
      sh.className = "scan-note";
      sh.textContent = "This site answers at " + res.shellPaths.length + " checked paths (" +
        res.shellPaths.slice(0, 4).join(", ") + (res.shellPaths.length > 4 ? ", …" : "") +
        ") with the same generic page - its router serves one page for every address, so these are not distinct official pages.";
      box.appendChild(sh);
    }

    if (!res.pages.length) {
      var none = document.createElement("p");
      none.className = "scan-empty";
      none.textContent = "No distinct official brand or press page answered on the checked paths and links. " +
        "That only means this scan did not find one - it does not prove the company publishes none.";
      if (!(res.offsiteLinks && res.offsiteLinks.length)) {
        box.appendChild(none);
        return;
      }
      box.appendChild(none);
    }

    if (res.unverifiedPages && res.unverifiedPages.length) {
      var uh = document.createElement("p");
      uh.className = "scan-note";
      uh.textContent = "Unverified - these addresses answered but belong to user or community spaces on this site, not to the company's own newsroom:";
      box.appendChild(uh);
      res.unverifiedPages.forEach(function (pg) {
        var row = document.createElement("div");
        row.className = "asset";
        var left = document.createElement("div");
        var label = document.createElement("div");
        label.className = "label";
        label.textContent = pg.title || pg.url;
        left.appendChild(label);
        var type = document.createElement("div");
        type.className = "type";
        type.textContent = "unverified - not an official source";
        left.appendChild(type);
        row.appendChild(left);
        var btn = document.createElement("button");
        btn.textContent = "Open";
        btn.onclick = function () { chrome.tabs.create({ url: pg.url }); };
        row.appendChild(btn);
        box.appendChild(row);
      });
    }

    if (res.offsiteLinks && res.offsiteLinks.length) {
      var off = document.createElement("p");
      off.className = "scan-note";
      off.textContent = "This page also links to official-looking pages on related sites - these can't be scanned from here, open to check:";
      box.appendChild(off);
      res.offsiteLinks.forEach(function (o) {
        var row = document.createElement("div");
        row.className = "asset";
        var left = document.createElement("div");
        var label = document.createElement("div");
        label.className = "label";
        label.textContent = o.text || o.url;
        left.appendChild(label);
        var type = document.createElement("div");
        type.className = "type";
        try {
          type.textContent = o.from
            ? "linked from the official page, on " + new URL(o.url).hostname
            : "related company site: " + new URL(o.url).hostname;
        } catch (e) { type.textContent = "related company site"; }
        left.appendChild(type);
        row.appendChild(left);
        var btn = document.createElement("button");
        btn.textContent = "Open";
        btn.onclick = function () { chrome.tabs.create({ url: o.url }); };
        row.appendChild(btn);
        box.appendChild(row);
      });
    }

    res.pages.forEach(function (pg) {
      var card = document.createElement("div");
      card.className = "scan-page";
      var h = document.createElement("h3");
      h.textContent = pg.title || pg.url;
      card.appendChild(h);
      var via = document.createElement("div");
      via.className = "via";
      var viaText = pg.via.indexOf("path:") === 0
        ? "found at " + pg.via.slice(5)
        : "found through a page link" + (pg.via.indexOf("link:") === 0 && pg.via.slice(5) ? ' ("' + pg.via.slice(5) + '")' : "");
      via.textContent = viaText;
      card.appendChild(via);
      var open = document.createElement("a");
      open.href = pg.url;
      open.target = "_blank";
      open.rel = "noopener";
      open.className = "source-link";
      open.textContent = "Open official page";
      card.appendChild(open);

      if (pg.assets.length) {
        var assets = document.createElement("div");
        assets.className = "assets";
        pg.assets.forEach(function (a) {
          var row = document.createElement("div");
          row.className = "asset";
          var left = document.createElement("div");
          var label = document.createElement("div");
          label.className = "label";
          label.textContent = a.label;
          left.appendChild(label);
          var type = document.createElement("div");
          type.className = "type";
          type.textContent = a.onSite
            ? "download linked from the official page"
            : "linked from the official page, hosted on " + a.host;
          left.appendChild(type);
          row.appendChild(left);
          var btn = document.createElement("button");
          btn.textContent = a.onSite ? "Download" : "Open";
          btn.onclick = function () {
            if (a.onSite) chrome.runtime.sendMessage({ type: "download-asset", url: a.url }, function () {});
            else chrome.tabs.create({ url: a.url });
          };
          row.appendChild(btn);
          assets.appendChild(row);
        });
        card.appendChild(assets);
      } else {
        var note = document.createElement("p");
        note.className = "scan-empty";
        if (pg.shell) {
          note.textContent = "This page is built by JavaScript in the browser, so the scan couldn't read its content - open it to check for brand material.";
        } else {
          note.textContent = "No downloadable kit or guidelines found on this page." +
            (pg.hasGuidelineText ? " It does contain brand-usage text - open it to read the terms." : "");
        }
        card.appendChild(note);
      }
      box.appendChild(card);
    });
  }

  $("btn-scan").addEventListener("click", function () {
    var tab = state.tab;
    var status = $("scan-status");
    if (!tab || !/^https?:/.test(tab.url || "")) {
      status.hidden = false;
      status.textContent = "Open a normal website tab first - browser pages can't be scanned.";
      return;
    }
    if (state.scanning) return;
    state.scanning = true;
    $("btn-scan").disabled = true;
    $("scan-results").hidden = true;
    status.hidden = false;
    status.textContent = "Scanning " + (hostnameOf(tab.url) || "this site") + " - links on this page plus 16 common paths…";
    chrome.scripting.executeScript(
      { target: { tabId: tab.id }, files: ["content/discover.js"] },
      function (res) {
        state.scanning = false;
        $("btn-scan").disabled = false;
        if (chrome.runtime.lastError || !res || !res[0] || !res[0].result) {
          status.textContent = "This page wouldn't let the scan run (some browser and store pages block it). Try a normal page on the site.";
          return;
        }
        renderScan(res[0].result);
      }
    );
  });

  // ---------- Mode switching ----------

  $("tab-lookup").addEventListener("click", function () {
    $("tab-lookup").classList.add("active");
    $("tab-create").classList.remove("active");
    $("mode-lookup").hidden = false;
    $("mode-create").hidden = true;
  });
  $("tab-create").addEventListener("click", function () {
    $("tab-create").classList.add("active");
    $("tab-lookup").classList.remove("active");
    $("mode-create").hidden = false;
    $("mode-lookup").hidden = true;
  });

  // ---------- Boot ----------

  fetch("../data/directory.json")
    .then(function (r) { return r.json(); })
    .then(function (dir) {
      state.directory = dir;
      initLookup();
    });
})();
