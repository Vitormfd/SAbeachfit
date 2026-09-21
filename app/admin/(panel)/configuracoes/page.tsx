import { requireOwner } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { centsToInput } from "@/lib/util";
import { DEFAULT_WHATSAPP_TEMPLATE } from "@/lib/settings-defaults";
import { Flash, type SP } from "@/components/AdminBits";
import { SubmitButton } from "@/components/admin";
import { SingleImageField } from "@/components/ImageUploader";
import { saveSettingsAction } from "../actions";

export const metadata = { title: "Configurações" };

export default async function Configuracoes({ searchParams }: { searchParams: Promise<SP> }) {
  await requireOwner();
  const sp = await searchParams;
  const s = await getSettings();
  return (
    <>
      <div className="admin-head"><h1>Configurações da loja</h1></div>
      <Flash sp={sp} />
      <form action={saveSettingsAction} className="stack">
        <section className="panel">
          <h2>Identidade</h2>
          <div className="form-grid">
            <label>Nome da loja *<input name="store_name" defaultValue={s.store_name} required /></label>
            <label>Slogan<input name="tagline" defaultValue={s.tagline} /></label>
            <label className="span2">Frase institucional<input name="about" defaultValue={s.about} /></label>
          </div>
          <div><p className="label">Logo (opcional — substitui a marca tipográfica)</p><SingleImageField name="logo_url" initial={s.logo_url} /></div>
        </section>

        <section className="panel">
          <h2>Página inicial</h2>
          <p className="muted small">Sem imagem, o site mostra uma ilustração. Envie uma foto vertical (proporção 3:4) para o destaque principal.</p>
          <div className="form-grid">
            <label className="span2">Título do destaque<input name="hero_title" defaultValue={s.hero_title} /></label>
            <label className="span2">Subtítulo<input name="hero_subtitle" defaultValue={s.hero_subtitle} /></label>
          </div>
          <div><p className="label">Foto do destaque</p><SingleImageField name="hero_image_url" initial={s.hero_image_url} /></div>
          <div className="form-grid">
            <label>Título do banner de coleção<input name="banner_title" defaultValue={s.banner_title} /></label>
            <label>Link do banner<input name="banner_link" defaultValue={s.banner_link} /></label>
            <label className="span2">Texto do banner<input name="banner_text" defaultValue={s.banner_text} /></label>
          </div>
          <div><p className="label">Foto do banner (horizontal)</p><SingleImageField name="banner_image_url" initial={s.banner_image_url} /></div>
        </section>

        <section className="panel">
          <h2>Contato</h2>
          <div className="form-grid">
            <label>WhatsApp para pedidos *<input name="whatsapp" defaultValue={s.whatsapp} inputMode="numeric" required placeholder="5575999999999" /><small className="muted">Formato internacional: 55 + DDD + número.</small></label>
            <label>Instagram (sem @)<input name="instagram" defaultValue={s.instagram} /></label>
            <label>E-mail<input name="email" type="email" defaultValue={s.email} /></label>
            <label>Endereço / cidade<input name="address" defaultValue={s.address} /></label>
            <label className="span2">Horário de atendimento<input name="hours" defaultValue={s.hours} placeholder="Ex.: Seg a Sáb, 9h às 18h" /></label>
          </div>
        </section>

        <section className="panel">
          <h2>Retirada e entrega</h2>
          <div className="checks">
            <label className="check"><input type="checkbox" name="pickup_enabled" defaultChecked={s.pickup_enabled === "1"} /> Permitir retirada</label>
            <label className="check"><input type="checkbox" name="delivery_enabled" defaultChecked={s.delivery_enabled === "1"} /> Permitir entrega</label>
          </div>
          <div className="form-grid">
            <label>Taxa de entrega (R$)<input name="delivery_fee" defaultValue={centsToInput(parseInt(s.delivery_fee_cents))} inputMode="decimal" /></label>
            <label>Cidade com taxa fixa<input name="local_city" defaultValue={s.local_city} /><small className="muted">Outras cidades: frete &quot;a combinar pelo WhatsApp&quot;. Deixe vazio para cobrar a taxa em todas.</small></label>
            <label>Frete grátis acima de (R$)<input name="free_delivery_above" defaultValue={parseInt(s.free_delivery_above_cents) ? centsToInput(parseInt(s.free_delivery_above_cents)) : ""} inputMode="decimal" placeholder="desativado" /></label>
            <label className="span2">Texto sobre retirada<input name="pickup_note" defaultValue={s.pickup_note} /></label>
            <label className="span2">Texto sobre entrega<input name="delivery_note" defaultValue={s.delivery_note} /></label>
          </div>
        </section>

        <section className="panel">
          <h2>Catálogo</h2>
          <div className="form-grid">
            <label>Produtos por página<input name="page_size" type="number" min={4} max={48} defaultValue={s.page_size} /></label>
            <label>Estoque baixo padrão (novos produtos)<input name="default_low_stock" type="number" min={0} defaultValue={s.default_low_stock} /></label>
          </div>
          <div className="checks"><label className="check"><input type="checkbox" name="show_out_of_stock" defaultChecked={s.show_out_of_stock === "1"} /> Mostrar produtos esgotados no catálogo</label></div>
        </section>

        <section className="panel">
          <h2>Mensagem do WhatsApp</h2>
          <p className="muted small">Campos: {"{loja} {pedido} {cliente} {telefone} {itens} {subtotal} {entrega} {total} {recebimento} {endereco} {observacoes}"}. Linhas com campo vazio são omitidas.</p>
          <textarea name="whatsapp_template" rows={14} defaultValue={s.whatsapp_template} className="mono" />
          <details><summary className="muted small">Ver modelo padrão</summary><pre className="msg">{DEFAULT_WHATSAPP_TEMPLATE}</pre></details>
        </section>

        <div className="form-actions"><SubmitButton>Salvar configurações</SubmitButton></div>
      </form>
    </>
  );
}
