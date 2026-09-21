import { getSettings } from "@/lib/settings";
import { ProductForm } from "@/components/ProductForm";
import { categoryOptions } from "../categoryOptions";

export const metadata = { title: "Novo produto" };

export default async function NovoProduto() {
  const s = await getSettings();
  return (
    <>
      <div className="admin-head"><h1>Novo produto</h1></div>
      <ProductForm
        categories={await categoryOptions()}
        initial={{ name: "", description: "", price: "", promo: "", category_id: null, active: true, featured: false, is_new: true, threshold: parseInt(s.default_low_stock) || 2, images: [], variants: [] }}
      />
    </>
  );
}
