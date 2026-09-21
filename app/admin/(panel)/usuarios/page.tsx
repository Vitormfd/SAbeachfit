import { listAdmins, requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/util";
import { Flash, type SP } from "@/components/AdminBits";
import { SubmitButton } from "@/components/admin";
import { adminUserAction, changeOwnPasswordAction, createAdminAction } from "../actions";

export const metadata = { title: "Usuários" };

export default async function Usuarios({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await requireAdmin();
  const admins = me.role === "owner" ? await listAdmins() : [];
  const sp = await searchParams;
  return (
    <>
      <div className="admin-head"><h1>{me.role === "owner" ? "Usuários" : "Minha senha"}</h1></div>
      <Flash sp={sp} />
      <section className="panel">
        <h2>Alterar minha senha</h2>
        <form action={changeOwnPasswordAction} className="inline-form">
          <input name="current" type="password" placeholder="Senha atual" required autoComplete="current-password" />
          <input name="password" type="password" placeholder="Nova senha (mín. 8)" minLength={8} required autoComplete="new-password" />
          <SubmitButton>Alterar</SubmitButton>
        </form>
        <p className="muted small">Você será desconectada após alterar a senha.</p>
      </section>

      {me.role === "owner" && (
        <>
          <section className="panel">
            <h2>Novo usuário</h2>
            <form action={createAdminAction} className="inline-form">
              <input name="name" placeholder="Nome" required />
              <input name="email" type="email" placeholder="E-mail" required />
              <input name="password" type="password" placeholder="Senha (mín. 8)" minLength={8} required autoComplete="new-password" />
              <select name="role" defaultValue="staff"><option value="staff">Equipe (sem configurações/usuários)</option><option value="owner">Proprietária (acesso total)</option></select>
              <SubmitButton>Criar</SubmitButton>
            </form>
          </section>
          <section className="panel">
            <h2>Usuários cadastrados</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Desde</th><th>Situação</th><th>Ações</th></tr></thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.id}>
                      <td>{a.name}</td><td>{a.email}</td><td>{a.role === "owner" ? "Proprietária" : "Equipe"}</td><td>{formatDateTime(a.created_at)}</td><td>{a.active ? "Ativo" : "Desativado"}</td>
                      <td>
                        <form action={adminUserAction} className="move-form">
                          <input type="hidden" name="id" value={a.id} />
                          <input name="password" type="password" placeholder="Nova senha" minLength={8} autoComplete="new-password" />
                          <button name="op" value="password" className="btn btn-ghost">Redefinir</button>
                          {a.id !== me.id && <button name="op" value="toggle" className="btn btn-ghost" formNoValidate>{a.active ? "Desativar" : "Ativar"}</button>}
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
