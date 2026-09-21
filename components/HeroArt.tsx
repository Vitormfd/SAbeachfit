// Cena ilustrada (sol, dunas e capim-dos-pampas — o motivo do logo). Substituída por foto real quando enviada no painel.
function Sprig({ x, y, h, lean, o = 1 }: { x: number; y: number; h: number; lean: number; o?: number }) {
  const tx = x + lean, ty = y - h;
  const bx = x + lean * 0.72, by = ty + h * 0.34; // onde o penacho começa
  const feathers = Array.from({ length: 17 }, (_, i) => {
    const k = i - 8;
    const ex = tx + k * 7.5 + lean * 0.25;
    const ey = ty - 34 + Math.abs(k) * 3.4;
    const cx = bx + k * 3.2 + lean * 0.1;
    const cy = (by + ey) / 2;
    return <path key={i} d={`M${bx} ${by} Q${cx} ${cy} ${ex} ${ey}`} strokeWidth={1.1 + (i % 3) * 0.25} opacity={0.55 + (i % 4) * 0.1} />;
  });
  return (
    <g stroke="#a98668" strokeLinecap="round" fill="none" opacity={o}>
      <path d={`M${x} ${y} Q${x + lean * 0.15} ${y - h * 0.55} ${tx} ${ty + h * 0.2}`} strokeWidth={1.6} />
      {feathers}
    </g>
  );
}

export function HeroArt({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ilustração de dunas ao amanhecer com capim-dos-pampas">
      <defs>
        <linearGradient id="ha-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe1d4" />
          <stop offset=".55" stopColor="#f3d9c4" />
          <stop offset="1" stopColor="#ecc9ae" />
        </linearGradient>
        <radialGradient id="ha-sun" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff6ea" />
          <stop offset=".62" stopColor="#fbe9d6" />
          <stop offset="1" stopColor="#f6d9c0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="600" height="800" fill="url(#ha-sky)" />
      <circle cx="390" cy="330" r="210" fill="url(#ha-sun)" />
      <circle cx="390" cy="330" r="86" fill="#fff4e6" opacity=".95" />
      <path d="M0 520 C120 470 240 500 360 470 C470 445 540 470 600 455 L600 800 L0 800Z" fill="#e5cdb7" />
      <path d="M0 590 C110 540 230 600 350 560 C460 525 540 560 600 540 L600 800 L0 800Z" fill="#d3b79b" />
      <path d="M0 670 C130 630 220 690 350 655 C470 622 540 650 600 640 L600 800 L0 800Z" fill="#bd9c80" />
      <path d="M0 740 C150 715 260 760 400 735 C500 718 560 730 600 726 L600 800 L0 800Z" fill="#a98668" />
      <Sprig x={92} y={780} h={330} lean={-26} />
      <Sprig x={130} y={790} h={250} lean={18} o={0.85} />
      <Sprig x={64} y={800} h={200} lean={-6} o={0.7} />
      <Sprig x={520} y={790} h={290} lean={22} o={0.9} />
      <Sprig x={556} y={800} h={210} lean={-14} o={0.75} />
    </svg>
  );
}

/** Capim solto que "vaza" da moldura em arco (profundidade). */
export function PampasAccent({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 420" aria-hidden="true">
      <Sprig x={70} y={420} h={380} lean={30} />
      <Sprig x={120} y={420} h={300} lean={-22} o={0.8} />
      <Sprig x={38} y={420} h={230} lean={-12} o={0.65} />
    </svg>
  );
}
