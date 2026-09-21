// Marca tipográfica inspirada no logo (SA | BEACH Fit). Se a loja enviar o logo em Configurações, ele substitui isto.
export function Logo({ logoUrl, name, light = false }: { logoUrl?: string; name: string; light?: boolean }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={name} className="logo-img" height={44} />;
  }
  return (
    <span className={`wordmark${light ? " light" : ""}`} aria-label={name}>
      <span className="wm-sa">SA</span>
      <span className="wm-bar" aria-hidden="true" />
      <span className="wm-rest">
        <span className="wm-beach">BEACH</span>
        <span className="wm-fit">Fit</span>
      </span>
    </span>
  );
}
