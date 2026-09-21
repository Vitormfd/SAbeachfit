# SA Beach Fit — Loja virtual com painel administrativo

E-commerce de moda feminina (roupas, fitness, pijamas): catálogo, carrinho, checkout via WhatsApp, estoque por variação
(cor + tamanho) e painel administrativo completo.

## Stack
- **Next.js 15 (App Router) + TypeScript** — SSR para SEO, Server Actions no painel. Hospedagem: **Vercel**.
- **Supabase**: **Postgres** (dados) e **Storage** (imagens). O servidor acessa o banco por conexão Postgres direta
  (`DATABASE_URL`); o **RLS está ligado em todas as tabelas, sem políticas** — a API pública/anon do Supabase não lê nem grava nada.
- Autenticação própria (senha `scrypt`, sessão aleatória guardada como hash SHA-256 no banco, cookie `httpOnly`, bloqueio após
  5 tentativas/15 min, perfis *proprietária* e *equipe*). Zod para validação. CSS próprio.

## Desenvolvimento local
```bash
npm install
npm run dev          # http://localhost:3000
```
Sem `DATABASE_URL`, usa um Postgres embutido (PGlite, em `./data/pglite`), criado e populado com dados de demonstração.
Painel: `/admin` — login de desenvolvimento `admin@sabeachfit.local` / `admin12345` (só existe fora de produção).

Para testar o driver de produção localmente: `npm run db:test-server` e, em outro terminal,
`DATABASE_URL="postgres://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable" PG_POOL_MAX=1 npm run dev`.
Testes de integração (com o servidor rodando): `npm run smoke`.

## Colocar no ar (Supabase + Vercel)

### 1. Supabase
1. Crie o projeto (região **South America – São Paulo** é a melhor para a loja).
2. **Connect → Transaction pooler** → copie a *connection string* (porta 6543) → será a `DATABASE_URL`.
3. **Project Settings → API** → copie a **Project URL** (`SUPABASE_URL`) e a **service_role / secret key** (`SUPABASE_SERVICE_ROLE_KEY`).
4. *(Opcional)* rode `supabase/schema.sql` no **SQL Editor**. Se não rodar, o app cria as tabelas sozinho no primeiro acesso.
5. O bucket público `media` é criado automaticamente no primeiro upload.

### 2. Vercel
1. **Add New → Project** → importe o repositório do GitHub.
2. **Environment Variables** (Production): `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD`, `ADMIN_NAME`, `SITE_URL`, `SEED_DEMO=false`. (Modelo em `.env.example`.)
3. **Deploy**. Em *Settings → Functions → Region*, escolha **São Paulo (gru1)** para ficar perto do banco.
4. Acesse `/admin`, entre com `ADMIN_EMAIL`/`ADMIN_PASSWORD` e configure a loja (logo, WhatsApp, frete, fotos).

> A `SUPABASE_SERVICE_ROLE_KEY` é secreta: use apenas como variável de ambiente do servidor (nunca `NEXT_PUBLIC_`).

## Regras de negócio importantes
- **Estoque reservado no pedido**: as unidades são baixadas na mesma transação do pedido, com `UPDATE ... WHERE stock + delta >= 0`
  (lock de linha do Postgres) e `CHECK (stock >= 0)`. Cancelar devolve; reativar reserva de novo. Toda alteração gera uma linha
  imutável em `stock_movements` (tipo, motivo, responsável, data, saldo).
- **Preços vêm sempre do banco** — o navegador só envia `variantId` + quantidade.
- **Sem duplicidade**: cada tentativa de checkout tem `idempotencyKey` único.
- **Pagamento manual**: o pedido nasce "Aguardando confirmação / Não pago"; o admin confirma e marca pago. "Faturamento registrado" =
  pedidos pagos e não cancelados.
- **Frete**: taxa fixa (padrão R$ 9,99) para a cidade configurada; outras cidades → "a combinar pelo WhatsApp".
- **Gateway futuro**: `lib/payments.ts` (interface `PaymentProvider`) e colunas `payment_provider/payment_ref/payment_status`.
- **Imagens**: o painel reduz as fotos no navegador (lado maior 1800 px, WebP) antes de enviar — respeita o limite de ~4,5 MB de
  corpo da Vercel — e o servidor grava no Supabase Storage. O endereço salvo é `/media/<arquivo>` (reescrito para o Storage).

## Estrutura
- `supabase/schema.sql` — schema (fonte única); `npm run db:schema` regenera `lib/schema.ts`.
- `lib/db.ts` — conexão (Postgres ou PGlite), transações e helpers; `lib/orders.ts`, `lib/stock.ts` — pedidos e estoque.
- `app/(store)` — loja; `app/admin` — painel; `app/api` — carrinho, pedidos e upload.
