// Valores iniciais (extraídos do perfil público da loja). Tudo é editável em /admin/configuracoes.
export const DEFAULT_WHATSAPP_TEMPLATE = `🛍️ NOVO PEDIDO — {loja}
Pedido: {pedido}
Cliente: {cliente}
Telefone: {telefone}

Produtos:
{itens}

Subtotal: {subtotal}
Entrega: {entrega}
Total: {total}
Forma de recebimento: {recebimento}
Endereço: {endereco}
Observações: {observacoes}`;

export const SETTINGS_DEFAULTS = {
  store_name: "SA Beach Fit",
  tagline: "Moda Praia, Fitness e Pijamas",
  about: "Estilo, conforto e qualidade em cada detalhe.",
  logo_url: "",
  whatsapp: "5575981139972",
  instagram: "sa.beachfit",
  email: "",
  address: "Feira de Santana - BA",
  hours: "",
  pickup_enabled: "1",
  pickup_note: "Retirada em Feira de Santana. Combinamos o horário pelo WhatsApp.",
  delivery_enabled: "1",
  delivery_fee_cents: "999",
  local_city: "Feira de Santana",
  free_delivery_above_cents: "0",
  delivery_note: "Frete fixo para Feira de Santana. Outras cidades: enviamos para todo o Brasil e combinamos o valor pelo WhatsApp.",
  whatsapp_template: DEFAULT_WHATSAPP_TEMPLATE,
  hero_title: "Estilo e conforto em cada detalhe",
  hero_subtitle: "Moda feminina, fitness e pijamas. Enviamos para todo o Brasil.",
  hero_image_url: "",
  banner_title: "Moda fitness",
  banner_text: "Peças pensadas para treinar com liberdade de movimento e conforto.",
  banner_image_url: "",
  banner_link: "/catalogo?categoria=moda-fitness",
  page_size: "12",
  default_low_stock: "2",
  show_out_of_stock: "1",
} as const;

export type SettingKey = keyof typeof SETTINGS_DEFAULTS;
