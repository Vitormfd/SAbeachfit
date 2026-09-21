import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container page">
      <h1 className="page-title">Carrinho</h1>
      <CartView />
    </div>
  );
}
