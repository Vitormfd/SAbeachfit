"use client";
import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="stack">
      <label>
        E-mail
        <input name="email" type="email" required autoComplete="username" autoFocus />
      </label>
      <label>
        Senha
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      {state?.error && <p className="field-error" role="alert">{state.error}</p>}
      <button className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
