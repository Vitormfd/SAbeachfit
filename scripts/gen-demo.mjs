// Gera imagens ILUSTRATIVAS de peças (flat-lay) em public/demo. Não são fotos reais.
// Uso: node scripts/gen-demo.mjs
import fs from "node:fs";

const COLORS = {
  preto: { hex: "#2f2926", wall: ["#e9dfd3", "#d5c6b5"] },
  rosa: { hex: "#dfb3ad", wall: ["#efe6dc", "#dccdbd"] },
  areia: { hex: "#cdb290", wall: ["#ece8f0", "#d6cfdc"] },
  verde: { hex: "#87977a", wall: ["#f1e8dc", "#dfd0bc"] },
  "off-white": { hex: "#f4eee5", wall: ["#cfc0ae", "#b9a68f"] },
  azul: { hex: "#8ba2b7", wall: ["#f1e9df", "#e0d2c1"] },
  terracota: { hex: "#b5745b", wall: ["#efe7dc", "#ddcdb9"] },
};

// Silhuetas (viewBox 800x1000). Cada peça = lista de caminhos + dobras.
const TOP = "M300 250 L352 228 Q400 268 448 228 L500 250 L572 335 L516 376 L492 344 L492 700 Q400 722 308 700 L308 344 L284 376 L228 335 Z";
const BRA = "M338 300 Q350 390 304 476 Q400 530 496 476 Q450 390 462 300 L436 300 Q428 358 400 380 Q372 358 364 300 Z";
const LEG = "M312 200 L488 200 L522 800 L432 812 L400 390 L368 812 L278 800 Z";
const SHORTS = "M302 470 L498 470 L530 690 L420 702 L400 580 L380 702 L270 690 Z";
const DRESS = "M342 228 Q400 292 458 228 L492 258 L470 380 Q566 520 626 830 Q400 872 174 830 Q234 520 330 380 L308 258 Z";
const SKIRT = "M322 300 L478 300 L604 820 Q400 852 196 820 Z";
const SLIP = "M346 216 L364 216 L378 306 Q400 328 422 306 L436 216 L454 216 L484 326 L528 830 Q400 864 272 830 L316 326 Z";
const JUMP = "M344 222 Q400 304 456 222 L492 252 L502 430 L526 830 L432 842 L400 540 L368 842 L274 830 L298 430 L308 252 Z";
const PANTS = "M312 470 L488 470 L516 850 L428 860 L400 600 L372 860 L284 850 Z";
const T_S = "translate(80 -30) scale(.8)";
const P = (d, tf = "") => ({ d, tf });
const GARMENTS = {
  vestido: { paths: [P(DRESS)], folds: ["M400 300 L400 850", "M350 420 Q330 620 290 820", "M450 420 Q470 620 510 820"] },
  blusa: { paths: [P(TOP)], folds: ["M400 268 L400 712", "M300 340 L308 700"] },
  top: { paths: [P(BRA)], folds: ["M400 380 L400 520"] },
  legging: { paths: [P(LEG)], folds: ["M400 390 L400 200", "M340 300 L318 790", "M460 300 L482 790"] },
  short: { paths: [P(SHORTS, "translate(0 -90)")], folds: [] },
  saia: { paths: [P(SKIRT)], folds: ["M370 300 L300 830", "M400 300 L400 840", "M430 300 L500 830"] },
  camisola: { paths: [P(SLIP)], folds: ["M400 330 L400 850", "M350 400 Q340 620 310 820"] },
  macacao: { paths: [P(JUMP)], folds: ["M400 540 L400 300"] },
  pijamaCurto: { paths: [P(TOP, T_S), P(SHORTS, "translate(0 130)")], folds: [] },
  pijamaLongo: { paths: [P(TOP, T_S), P(PANTS, "translate(0 40)")], folds: [] },
  conjuntoFitness: { paths: [P(BRA, "translate(80 -20) scale(.8)"), P(LEG, "translate(120 300) scale(.7)")], folds: [] },
  conjuntoAlfaiataria: { paths: [P(TOP, T_S), P(SKIRT, "translate(120 320) scale(.7)")], folds: [] },
};

function garmentSvg(name, cname) {
  const g = GARMENTS[name];
  const c = COLORS[cname];
  const light = ["off-white", "areia", "rosa"].includes(cname);
  const paths = g.paths
    .map(({ d, tf }) => {
      const t = tf ? ` transform="${tf}"` : "";
      return `<path d="${d}"${t} fill="${c.hex}"/><path d="${d}"${t} fill="url(#shade)"/><path d="${d}"${t} fill="none" stroke="rgba(0,0,0,.14)" stroke-width="1.5"/>`;
    })
    .join("");
  const folds = g.folds.map((f) => `<path d="${f}" fill="none" stroke="${light ? "rgba(90,70,50,.16)" : "rgba(255,255,255,.10)"}" stroke-width="3" stroke-linecap="round"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" role="img" aria-label="Imagem ilustrativa">
<defs>
<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.wall[0]}"/><stop offset="1" stop-color="${c.wall[1]}"/></linearGradient>
<linearGradient id="shade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
<radialGradient id="sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#3d2b1f" stop-opacity=".28"/><stop offset="1" stop-color="#3d2b1f" stop-opacity="0"/></radialGradient>
</defs>
<rect width="800" height="1000" fill="url(#wall)"/>
<path d="M0 860 Q400 820 800 870 L800 1000 L0 1000Z" fill="#fff" fill-opacity=".22"/>
<ellipse cx="400" cy="900" rx="250" ry="34" fill="url(#sh)"/>
<g transform="translate(0 -20)">${paths}${folds}</g>
<text x="400" y="968" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="17" letter-spacing="3" fill="#5b4a40" fill-opacity=".55">IMAGEM ILUSTRATIVA</text>
</svg>`;
}

function fabricSvg(cname) {
  const c = COLORS[cname];
  const light = ["off-white", "areia", "rosa"].includes(cname);
  let lines = "";
  for (let y = 0; y < 1000; y += 14) lines += `<path d="M0 ${y} Q200 ${y + 8} 400 ${y} T800 ${y}" stroke="${light ? "rgba(90,70,50,.10)" : "rgba(255,255,255,.07)"}" stroke-width="5" fill="none"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" role="img" aria-label="Textura ilustrativa">
<defs><linearGradient id="l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs>
<rect width="800" height="1000" fill="${c.hex}"/>${lines}<rect width="800" height="1000" fill="url(#l)"/>
<path d="M-40 760 C200 520 420 640 840 380 L840 1000 L-40 1000Z" fill="#000" fill-opacity=".10"/>
<text x="400" y="968" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="17" letter-spacing="3" fill="${light ? "#5b4a40" : "#f4eee5"}" fill-opacity=".6">IMAGEM ILUSTRATIVA</text>
</svg>`;
}

fs.mkdirSync("public/demo", { recursive: true });
for (const f of fs.readdirSync("public/demo")) fs.unlinkSync(`public/demo/${f}`);
for (const cname of Object.keys(COLORS)) {
  fs.writeFileSync(`public/demo/fabric-${cname}.svg`, fabricSvg(cname));
  for (const g of Object.keys(GARMENTS)) fs.writeFileSync(`public/demo/${g}-${cname}.svg`, garmentSvg(g, cname));
}
console.log("ok", fs.readdirSync("public/demo").length, "arquivos");
