const fs = require("fs");
const path = require("path");

function createSVG(size) {
  const rx = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.55);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `  <rect width="${size}" height="${size}" rx="${rx}" fill="#6366F1"/>`,
    `  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="${fontSize}">🪑</text>`,
    `</svg>`,
  ].join("\n");
}

const publicDir = path.join(__dirname, "..", "public");

fs.writeFileSync(path.join(publicDir, "icon-192.svg"), createSVG(192));
fs.writeFileSync(path.join(publicDir, "icon-512.svg"), createSVG(512));
console.log("SVG icons created in public/");
