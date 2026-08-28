// Bundles src/ into the single-file index.html.
//
// The page has to stay one self-contained file: the Artifact publish
// uploads exactly one HTML file, and "HTML로 저장" clones the live DOM
// into a standalone copy — external stylesheets or scripts would come
// out empty. So the source is split for editing and stitched back here.
//
//   node build.js           build
//   node build.js --check   fail if index.html is out of date
//
// No dependencies, CommonJS, no syntax newer than Node 12.

"use strict";

const fs = require("fs").promises;
const path = require("path");

const ROOT = __dirname;
const p = function () {
  return path.join.apply(path, [ROOT].concat(Array.prototype.slice.call(arguments)));
};
const read = function () {
  return fs.readFile(p.apply(null, arguments), "utf8");
};

// Order matters: everything is concatenated into one closure,
// so state comes first and the wiring that uses it comes last.
const STYLES = [
  "themes.css",   // colour tokens for all five themes
  "shell.css",    // page frame, header, typography
  "toolbar.css",
  "field.css",    // chart surface and graph-paper ruling
  "token.css",    // character disc, labels, cm chip
  "ruler.css",
  "panel.css",    // editor drawer and image framer
];

const SCRIPTS = [
  "state.js",       // constants, persistence, normalize
  "color.js",       // per-theme height ramps
  "layout.js",      // axis bounds, lane packing, coordinates
  "render.js",      // DOM: tokens, leaders, ruler, stats
  "editor.js",      // panel, image ingest, framing
  "export-png.js",  // canvas redraw of the chart
  "export-file.js", // standalone HTML + saving
  "main.js",        // event wiring and boot — must be last
];

// favicons are inlined from the real PNGs so the page needs no external asset
const ICONS = [
  ["icon-32.png",  'rel="icon" type="image/png" sizes="32x32"'],
  ["icon-16.png",  'rel="icon" type="image/png" sizes="16x16"'],
  ["icon-192.png", 'rel="icon" type="image/png" sizes="192x192"'],
  ["icon-180.png", 'rel="apple-touch-icon" sizes="180x180"'],
];

async function build() {
  const shell = await read("src", "shell.html");
  const body = (await read("src", "body.html")).replace(/\s+$/, "");

  const styleParts = await Promise.all(STYLES.map(f => read("src/styles", f)));
  const styles = styleParts.map(s => s.replace(/\s+$/, "")).join("\n\n");

  const scriptParts = await Promise.all(SCRIPTS.map(f => read("src/js", f)));
  scriptParts.forEach((s, i) => {
    // a literal </script> anywhere in the source would close the tag early
    if (s.indexOf("</script") !== -1) throw new Error(SCRIPTS[i] + " contains </script");
  });
  const scripts = scriptParts.map(s => s.replace(/\s+$/, "")).join("\n\n");

  const iconParts = await Promise.all(ICONS.map(async pair => {
    const buf = await fs.readFile(p(pair[0]));
    return '<link ' + pair[1] + ' href="data:image/png;base64,' + buf.toString("base64") + '">';
  }));

  return shell
    .replace("<!--#icons-->", iconParts.join("\n"))
    .replace("<!--#styles-->", styles)
    .replace("<!--#body-->", body)
    .replace("<!--#scripts-->", scripts);
}

async function main() {
  const out = await build();
  const check = process.argv.indexOf("--check") !== -1;
  let current = null;
  try { current = await read("index.html"); } catch (e) { /* first build */ }
  const kb = (out.length / 1024).toFixed(1);

  if (check) {
    if (current !== out) {
      console.error("index.html is stale — run: node build.js");
      process.exit(1);
    }
    console.log("index.html is up to date (" + kb + " KB)");
    return;
  }
  if (current === out) {
    console.log("index.html unchanged (" + kb + " KB)");
    return;
  }
  await fs.writeFile(p("index.html"), out);
  console.log("index.html written (" + kb + " KB)");
}

main().catch(err => { console.error(err.message); process.exit(1); });
