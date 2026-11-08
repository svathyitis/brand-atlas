/* Brand Atlas - starter-kit generation library.
 * Pure functions, no DOM, no network. Used by the popup and by node tests.
 *
 * Capability boundary, stated plainly in the UI as well: this matches the
 * brief against a small built-in list of known site styles, colour words and
 * subject words. It does NOT understand arbitrary brands, sites or styles.
 * Everything it draws is original geometry composed from the brief - never a
 * copy of a referenced brand's mark - and it is a starting point, not AI
 * artwork.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BrandGen = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Keyword -> base hue (degrees). First keyword found in the text wins.
  var MOOD_HUES = [
    { words: ["calm", "trust", "health", "care", "wellness", "serene", "therapy"], hue: 205 },
    { words: ["bold", "energy", "energetic", "power", "sport", "fitness", "fire"], hue: 8 },
    { words: ["playful", "fun", "kids", "children", "toy", "game", "candy"], hue: 320 },
    { words: ["premium", "luxury", "elegant", "fashion", "hotel", "jewel"], hue: 268 },
    { words: ["eco", "green", "nature", "organic", "plant", "sustainab", "farm"], hue: 140 },
    { words: ["tech", "software", "data", " ai", "cloud", "developer", "code", "saas"], hue: 222 },
    { words: ["food", "coffee", "restaurant", "bakery", "kitchen", "spice"], hue: 28 },
    { words: ["finance", "bank", "money", "invest", "insurance", "fintech"], hue: 160 },
    { words: ["creative", "design", "art", "studio", "music", "film"], hue: 288 }
  ];

  // Colour words a layperson might use, incl. a company name like "Orange".
  var COLOR_WORDS = [
    { words: ["orange"], hue: 28 }, { words: ["red", "crimson"], hue: 355 },
    { words: ["blue", "navy", "azure"], hue: 215 }, { words: ["green", "mint"], hue: 145 },
    { words: ["purple", "violet", "lavender"], hue: 272 }, { words: ["pink", "rose"], hue: 330 },
    { words: ["yellow", "gold", "amber"], hue: 45 }, { words: ["teal", "turquoise"], hue: 178 },
    { words: ["black", "monochrome"], hue: 220 }, { words: ["brown", "coffee"], hue: 25 }
  ];

  // Well-known sites/brands a layperson may reference, mapped to plain-language
  // design traits. Never their logos - only how their sites read.
  var REFERENCE_STYLES = [
    { match: ["apple"], traits: ["spacious, minimal layout with lots of white space", "simple type-led pages", "restrained colour, one accent"] },
    { match: ["stripe"], traits: ["clean, technical feel", "confident colour gradients", "generous spacing"] },
    { match: ["airbnb"], traits: ["warm and friendly", "rounded shapes", "photography-led"] },
    { match: ["notion"], traits: ["plain, document-like pages", "black text on white", "understated"] },
    { match: ["nike"], traits: ["bold and high-contrast", "big type", "energetic"] },
    { match: ["google"], traits: ["simple and approachable", "primary-colour accents", "lots of white space"] },
    { match: ["spotify"], traits: ["dark background with vivid accents", "music-first energy", "bold imagery"] },
    { match: ["tesla"], traits: ["minimal and futuristic", "dark tones", "very few elements per page"] },
    { match: ["muji"], traits: ["quiet, natural materials feel", "muted earth tones", "no decoration"] }
  ];

  // Subject words -> original pictorial concept marks (all drawn from
  // primitives below). Each concept is a function(palette) -> svg string.
  function circleOf(cx, cy, r, fill, extra) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' + (extra || "") + "/>";
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function svgWrap(name, inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="' +
      esc(name) + ' logo concept">' + inner + "</svg>";
  }

  var CONCEPTS = {
    "citrus-slice": { label: "Citrus slice", draw: function (p) {
      var seg = "";
      for (var i = 0; i < 8; i++) {
        var a = (Math.PI / 4) * i;
        var x = 60 + 40 * Math.cos(a), y = 60 + 40 * Math.sin(a);
        seg += '<line x1="60" y1="60" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + p.paper + '" stroke-width="4"/>';
      }
      return svgWrap("Citrus slice",
        circleOf(60, 60, 52, p.primary) +
        circleOf(60, 60, 44, "none", ' stroke="' + p.paper + '" stroke-width="4"') + seg +
        circleOf(60, 60, 7, p.paper));
    } },
    "fruit-leaf": { label: "Fruit and leaf", draw: function (p) {
      return svgWrap("Fruit and leaf",
        circleOf(58, 68, 40, p.primary) +
        '<ellipse cx="78" cy="26" rx="20" ry="10" fill="' + p.accent + '" transform="rotate(-28 78 26)"/>' +
        '<rect x="54" y="22" width="6" height="14" rx="3" fill="' + p.ink + '"/>');
    } },
    "peel-arc": { label: "Peel curl", draw: function (p) {
      return svgWrap("Peel curl",
        '<path d="M28 96 A 46 46 0 0 1 96 28" fill="none" stroke="' + p.primary + '" stroke-width="12" stroke-linecap="round"/>' +
        '<path d="M44 96 A 30 30 0 0 1 96 44" fill="none" stroke="' + p.accent + '" stroke-width="12" stroke-linecap="round"/>' +
        circleOf(96, 96, 9, p.primary));
    } },
    "leaf-pair": { label: "Leaf pair", draw: function (p) {
      return svgWrap("Leaf pair",
        '<path d="M60 104 C 28 84 28 44 60 20 C 92 44 92 84 60 104 Z" fill="' + p.primary + '"/>' +
        '<line x1="60" y1="30" x2="60" y2="96" stroke="' + p.paper + '" stroke-width="4"/>');
    } },
    "sprout": { label: "Sprout", draw: function (p) {
      return svgWrap("Sprout",
        '<path d="M60 100 L60 56" stroke="' + p.ink + '" stroke-width="6" stroke-linecap="round"/>' +
        '<ellipse cx="42" cy="44" rx="22" ry="12" fill="' + p.primary + '" transform="rotate(-24 42 44)"/>' +
        '<ellipse cx="78" cy="44" rx="22" ry="12" fill="' + p.accent + '" transform="rotate(24 78 44)"/>');
    } },
    "bolt": { label: "Bolt", draw: function (p) {
      return svgWrap("Bolt",
        '<polygon points="66,10 30,66 54,66 48,110 88,52 62,52" fill="' + p.primary + '"/>');
    } },
    "motion-arc": { label: "In motion", draw: function (p) {
      return svgWrap("In motion",
        circleOf(72, 60, 32, p.primary) +
        '<path d="M14 44 L44 44" stroke="' + p.accent + '" stroke-width="8" stroke-linecap="round"/>' +
        '<path d="M8 60 L36 60" stroke="' + p.accent + '" stroke-width="8" stroke-linecap="round"/>' +
        '<path d="M14 76 L44 76" stroke="' + p.accent + '" stroke-width="8" stroke-linecap="round"/>');
    } },
    "droplet": { label: "Droplet", draw: function (p) {
      return svgWrap("Droplet",
        '<path d="M60 12 C 84 48 96 64 96 82 A 36 36 0 0 1 24 82 C 24 64 36 48 60 12 Z" fill="' + p.primary + '"/>' +
        '<path d="M44 84 A 18 18 0 0 0 60 98" fill="none" stroke="' + p.paper + '" stroke-width="5" stroke-linecap="round"/>');
    } },
    "wave": { label: "Wave", draw: function (p) {
      return svgWrap("Wave",
        '<path d="M8 74 Q 28 46 48 74 T 88 74 T 128 74 L 128 112 L 8 112 Z" fill="' + p.primary + '" transform="translate(-8 0)"/>' +
        '<path d="M8 52 Q 28 28 48 52 T 88 52" fill="none" stroke="' + p.accent + '" stroke-width="7" stroke-linecap="round"/>');
    } },
    "peak": { label: "Peak", draw: function (p) {
      return svgWrap("Peak",
        '<polygon points="12,100 52,32 74,68 88,44 108,100" fill="' + p.primary + '"/>' +
        circleOf(92, 24, 10, p.accent));
    } },
    "cup": { label: "Cup", draw: function (p) {
      return svgWrap("Cup",
        '<path d="M28 48 L84 48 L78 100 L34 100 Z" fill="' + p.primary + '"/>' +
        '<path d="M84 54 A 14 14 0 0 1 84 78" fill="none" stroke="' + p.primary + '" stroke-width="7"/>' +
        '<path d="M46 36 q 4 -8 0 -14 M62 36 q 4 -8 0 -14" stroke="' + p.accent + '" stroke-width="5" fill="none" stroke-linecap="round"/>');
    } },
    "roofline": { label: "Roofline", draw: function (p) {
      return svgWrap("Roofline",
        '<polygon points="14,64 60,22 106,64" fill="' + p.primary + '"/>' +
        '<rect x="30" y="64" width="60" height="38" fill="' + p.primary + '"/>' +
        '<rect x="52" y="74" width="16" height="28" fill="' + p.paper + '"/>');
    } },
    "heart-line": { label: "Heartline", draw: function (p) {
      return svgWrap("Heartline",
        '<path d="M60 102 C 20 74 12 44 34 32 C 48 24 60 34 60 46 C 60 34 72 24 86 32 C 108 44 100 74 60 102 Z" fill="' + p.primary + '"/>' +
        '<polyline points="30,64 48,64 56,50 64,78 72,64 90,64" fill="none" stroke="' + p.paper + '" stroke-width="5" stroke-linejoin="round"/>');
    } },
    "open-book": { label: "Open book", draw: function (p) {
      return svgWrap("Open book",
        '<path d="M60 34 C 44 22 24 22 14 28 L 14 92 C 24 86 44 86 60 98 C 76 86 96 86 106 92 L 106 28 C 96 22 76 22 60 34 Z" fill="' + p.primary + '"/>' +
        '<line x1="60" y1="34" x2="60" y2="98" stroke="' + p.paper + '" stroke-width="4"/>');
    } },
    "aperture": { label: "Aperture", draw: function (p) {
      var blades = "";
      for (var i = 0; i < 6; i++) {
        var a = (Math.PI / 3) * i;
        var x1 = 60 + 16 * Math.cos(a), y1 = 60 + 16 * Math.sin(a);
        var x2 = 60 + 48 * Math.cos(a + 0.6), y2 = 60 + 48 * Math.sin(a + 0.6);
        blades += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + p.paper + '" stroke-width="6"/>';
      }
      return svgWrap("Aperture", circleOf(60, 60, 52, p.primary) + blades);
    } },
    "note": { label: "Note", draw: function (p) {
      return svgWrap("Note",
        '<ellipse cx="44" cy="92" rx="16" ry="12" fill="' + p.primary + '"/>' +
        '<rect x="56" y="24" width="8" height="68" fill="' + p.primary + '"/>' +
        '<path d="M64 24 C 84 28 92 40 96 52 C 84 44 74 42 64 44 Z" fill="' + p.accent + '"/>');
    } }
  };

  var SUBJECTS = [
    { words: ["orange", "citrus", "fruit", "orchard", "juice"], concepts: ["citrus-slice", "fruit-leaf", "peel-arc"] },
    { words: ["leaf", "plant", "eco", "nature", "garden", "farm", "vegan"], concepts: ["leaf-pair", "sprout"] },
    { words: ["bolt", "energy", "power", "electric", "fast", "speed", "delivery", "express", "logistics"], concepts: ["bolt", "motion-arc"] },
    { words: ["water", "drop", "aqua", "pool", "ocean", "clean", "wash"], concepts: ["droplet", "wave"] },
    { words: ["mountain", "outdoor", "trek", "peak", "hike", "adventure"], concepts: ["peak"] },
    { words: ["coffee", "cafe", "tea", "bakery", "restaurant", "kitchen"], concepts: ["cup"] },
    { words: ["home", "house", "real estate", "property", "nest", "stay"], concepts: ["roofline"] },
    { words: ["heart", "care", "health", "love", "clinic", "med"], concepts: ["heart-line"] },
    { words: ["book", "learn", "school", "edu", "read", "library", "course"], concepts: ["open-book"] },
    { words: ["camera", "photo", "lens", "film", "picture"], concepts: ["aperture"] },
    { words: ["music", "sound", "audio", "song", "podcast"], concepts: ["note"] }
  ];

  function hashText(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  function findHue(wordsTable, text) {
    for (var i = 0; i < wordsTable.length; i++) {
      var m = wordsTable[i];
      for (var j = 0; j < m.words.length; j++) {
        if (text.indexOf(m.words[j]) !== -1) return { hue: m.hue, word: m.words[j].trim() };
      }
    }
    return null;
  }

  function initialOf(name) {
    var m = (name || "").trim().match(/[A-Za-z0-9]/);
    return m ? m[0].toUpperCase() : "B";
  }

  function monogram(shape, letter, p) {
    var inner = "";
    var fontStack = shape === "square" || shape === "arc" ? "'Helvetica Neue', Arial, sans-serif" : "Georgia, 'Times New Roman', serif";
    if (shape === "circle") {
      inner = circleOf(60, 60, 52, p.primary) + circleOf(60, 60, 40, "none", ' stroke="' + p.paper + '" stroke-width="2"');
    } else if (shape === "square") {
      inner = '<rect x="10" y="10" width="100" height="100" rx="18" fill="' + p.primary + '"/>' +
        '<rect x="24" y="24" width="72" height="72" rx="10" fill="none" stroke="' + p.paper + '" stroke-width="2"/>';
    } else if (shape === "hexagon") {
      inner = '<polygon points="60,6 107,33 107,87 60,114 13,87 13,33" fill="' + p.primary + '"/>' +
        '<polygon points="60,22 93,41 93,79 60,98 27,79 27,41" fill="none" stroke="' + p.paper + '" stroke-width="2"/>';
    } else {
      inner = '<path d="M8 108 A 56 56 0 0 1 112 108 Z" fill="' + p.primary + '"/>' +
        '<path d="M26 108 A 38 38 0 0 1 94 108" fill="none" stroke="' + p.paper + '" stroke-width="2"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="monogram concept">' +
      inner +
      '<text x="60" y="60" text-anchor="middle" dominant-baseline="central" font-family="' + fontStack +
      '" font-size="52" font-weight="700" fill="' + p.paper + '">' + esc(letter) + "</text></svg>";
  }

  // Concept directions for the brief: subject marks first (original geometry
  // tied to what the venture does), monograms to fill out four options.
  function makeMarks(ventureName, description, palette, variant) {
    variant = variant || 0;
    var text = (" " + (ventureName || "") + " " + (description || "")).toLowerCase();
    var seen = {};
    var marks = [];
    var i, j, idx;
    var order = [];
    for (i = 0; i < SUBJECTS.length; i++) order.push((i + variant) % SUBJECTS.length);
    for (i = 0; i < order.length && marks.length < 4; i++) {
      var s = SUBJECTS[order[i]];
      var hit = false;
      for (j = 0; j < s.words.length; j++) if (text.indexOf(s.words[j]) !== -1) { hit = true; break; }
      if (!hit) continue;
      for (j = 0; j < s.concepts.length && marks.length < 4; j++) {
        idx = (j + variant) % s.concepts.length;
        var id = s.concepts[idx];
        if (seen[id]) continue;
        seen[id] = true;
        marks.push({ id: id, label: CONCEPTS[id].label, kind: "concept", svg: CONCEPTS[id].draw(palette.colors) });
      }
    }
    var letter = initialOf(ventureName);
    var shapes = ["circle", "square", "hexagon", "arc"];
    for (i = 0; marks.length < 4 && i < shapes.length; i++) {
      var shape = shapes[(i + variant) % shapes.length];
      marks.push({
        id: "mono-" + shape,
        label: shape.charAt(0).toUpperCase() + shape.slice(1) + " monogram",
        kind: "monogram",
        svg: monogram(shape, letter, palette.colors)
      });
    }
    return marks;
  }

  // Redraw a previously generated mark (by id) with a different palette, so a
  // pinned logo choice survives a refresh of the colour directions.
  function drawMarkById(id, ventureName, palette) {
    if (!id || !palette) return null;
    if (CONCEPTS[id]) return { id: id, label: CONCEPTS[id].label, kind: "concept", svg: CONCEPTS[id].draw(palette.colors) };
    var m = /^mono-(circle|square|hexagon|arc)$/.exec(id);
    if (m) {
      var shape = m[1];
      return { id: id, label: shape.charAt(0).toUpperCase() + shape.slice(1) + " monogram", kind: "monogram", svg: monogram(shape, initialOf(ventureName), palette.colors) };
    }
    return null;
  }

  // Read the brief and say, in plain language, what was matched - and against
  // what kind of list, so nobody mistakes this for general understanding.
  function interpretBrief(name, description) {
    var text = (" " + (name || "") + " " + (description || "")).toLowerCase();
    var traits = [];
    var references = [];
    var unknownRefs = [];
    var i, j;

    for (i = 0; i < REFERENCE_STYLES.length; i++) {
      var r = REFERENCE_STYLES[i];
      for (j = 0; j < r.match.length; j++) {
        if (text.indexOf(r.match[j]) !== -1) {
          references.push({ name: r.match[j], traits: r.traits });
          for (var k = 0; k < r.traits.length; k++) traits.push(r.traits[k]);
          break;
        }
      }
    }

    var likeRe = /like\s+([a-z][a-z0-9-]{1,30})(?:'s)?(?:\s+(?:website|site|logo|app|brand))?/g;
    var m;
    var known = {};
    for (i = 0; i < REFERENCE_STYLES.length; i++) known[REFERENCE_STYLES[i].match[0]] = true;
    while ((m = likeRe.exec(text)) !== null) {
      var ref = m[1];
      var stop = { the: 1, a: 1, my: 1, our: 1, this: 1, that: 1, it: 1, simple: 1, clean: 1, minimal: 1, bold: 1, modern: 1 };
      if (!known[ref] && !stop[ref]) unknownRefs.push(ref);
    }

    var subjects = [];
    for (i = 0; i < SUBJECTS.length; i++) {
      for (j = 0; j < SUBJECTS[i].words.length; j++) {
        if (text.indexOf(SUBJECTS[i].words[j]) !== -1) { subjects.push(SUBJECTS[i].words[j]); break; }
      }
    }

    var hueHit = findHue(COLOR_WORDS, text) || findHue(MOOD_HUES, text);
    return {
      traits: traits,
      references: references,
      unknownRefs: unknownRefs,
      subjects: subjects,
      hue: hueHit ? hueHit.hue : hashText(text) % 360,
      hueSource: hueHit ? hueHit.word : null
    };
  }

  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m2 = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    function to2(v) { return Math.round((v + m2) * 255).toString(16).padStart(2, "0"); }
    return ("#" + to2(r) + to2(g) + to2(b)).toUpperCase();
  }

  // Relative luminance for readable labels on swatches.
  function luminance(hex) {
    var m = /^#(..)(..)(..)$/.exec(hex);
    if (!m) return 0;
    function ch(v) { v = parseInt(v, 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * ch(m[1]) + 0.7152 * ch(m[2]) + 0.0722 * ch(m[3]);
  }
  function labelColorFor(bgHex) {
    return luminance(bgHex) > 0.32 ? "#1D1B16" : "#FFFFFF";
  }

  // Three harmony directions from the brief's hue. Accents stay inside the
  // named harmony: an analogous palette never carries its complement.
  function makePalettes(name, description, variant) {
    var brief = interpretBrief(name, description);
    variant = variant || 0;
    // Each refresh step moves the starting hue, so later rounds genuinely
    // differ from the first instead of reshuffling the same set.
    var hue = (brief.hue + variant * 36) % 360;
    function base(h, s, l) {
      return {
        primary: hslToHex(h, s, l),
        secondary: hslToHex(h + 24, Math.max(18, s - 30), Math.min(88, l + 26)),
        ink: hslToHex(h, Math.max(10, s - 45), 12),
        paper: hslToHex(h, Math.max(8, s - 55), 97)
      };
    }
    function withAccent(palette, accent) { palette.accent = accent; return palette; }
    var builders = [
      { name: "Analogous", harmony: "analogous", make: function (h) { return withAccent(base(h, 64, 44), hslToHex(h + 48, 70, 38)); } },
      { name: "Complementary", harmony: "complementary", make: function (h) { return withAccent(base(h, 58, 40), hslToHex(h + 180, 72, 38)); } },
      { name: "Quiet neutral", harmony: "muted", make: function (h) { return withAccent(base(h, 28, 38), hslToHex(h + 180, 34, 40)); } },
      { name: "Triadic", harmony: "triadic", make: function (h) { return withAccent(base(h, 60, 42), hslToHex(h + 120, 68, 40)); } },
      { name: "Deep contrast", harmony: "deep", make: function (h) { return withAccent(base(h, 70, 30), hslToHex(h + 200, 75, 55)); } }
    ];
    var palettes = [];
    for (var i = 0; i < 3; i++) {
      var b = builders[(i + variant) % builders.length];
      palettes.push({ name: b.name, harmony: b.harmony, hue: hue, colors: b.make(hue) });
    }
    return { brief: brief, palettes: palettes };
  }

  var FONT_SUGGESTIONS = [
    { name: "Editorial serif + grotesque", heading: "Georgia", body: "Helvetica Neue / Arial", use: "trusted, editorial ventures" },
    { name: "Modern grotesque pair", heading: "Helvetica Neue / Arial", body: "Helvetica Neue / Arial", use: "software and product ventures" },
    { name: "Humanist pair", heading: "Trebuchet MS", body: "Verdana", use: "friendly consumer products" }
  ];

  function fontsFor(description, variant) {
    var h = hashText(description || "");
    return FONT_SUGGESTIONS[(h + (variant || 0)) % FONT_SUGGESTIONS.length];
  }

  return {
    interpretBrief: interpretBrief,
    makePalettes: makePalettes,
    makeMarks: makeMarks,
    drawMarkById: drawMarkById,
    fontsFor: fontsFor,
    hslToHex: hslToHex,
    labelColorFor: labelColorFor
  };
});
