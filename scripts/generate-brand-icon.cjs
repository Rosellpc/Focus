// Generate the launcher artwork from the same Lucide Sparkles used in Header.
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { Sparkles } = require("lucide-react");
const root = path.resolve(__dirname, "..");
const rendered = renderToStaticMarkup(React.createElement(Sparkles, { size: 24, strokeWidth: 1.5 }));
const shapes = rendered.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${body}</svg>\n`;
const star = (color) => `<g transform="translate(64 64) scale(16)" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${shapes}</g>`;
fs.writeFileSync(path.join(root, "public/focus.svg"), svg('<rect width="512" height="512" rx="112" fill="#EEF2F3"/>' + star("#167A80")));
fs.writeFileSync(path.join(root, "public/focus-symbol.svg"), svg(star("#167A80")));
fs.writeFileSync(path.join(root, "public/focus-background.svg"), svg('<rect width="512" height="512" fill="#EEF2F3"/>'));
fs.writeFileSync(path.join(root, "public/focus-monochrome.svg"), svg(star("#000000")));
console.log("Focus icon generated from Header's Sparkles.");
