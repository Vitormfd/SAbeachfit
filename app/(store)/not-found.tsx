import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container page">
      <div className="empty">
        <span className="empty-arch" aria-hidden="true" />
        <h1>Página não encontrada</h1>
        <p>O endereço pode ter mudado ou a peça não está mais disponível.</p>
        <Link href="/catalogo" className="btn btn-primary">Ver o catálogo</Link>
      </div>
    </div>
  );
}
