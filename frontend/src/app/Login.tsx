import { useState, type FormEvent } from "react";
import { useCriarConta, useEntrar } from "@/lib/queries/sessao";

type Modo = "entrar" | "criar";

export function Login() {
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacaoPendente, setConfirmacaoPendente] = useState(false);

  const entrar = useEntrar();
  const criarConta = useCriarConta();

  function trocarModo(novo: Modo) {
    setModo(novo);
    setConfirmacaoPendente(false);
    entrar.reset();
    criarConta.reset();
  }

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (modo === "entrar") {
      entrar.mutate({ email, senha });
      return;
    }
    criarConta.mutate(
      { nome, email, senha },
      {
        onSuccess: (resultado) => {
          if (resultado.confirmacaoPendente) setConfirmacaoPendente(true);
        }
      }
    );
  }

  const enviando = entrar.isPending || criarConta.isPending;
  const erro = entrar.error?.message ?? criarConta.error?.message ?? "";

  return (
    <div className="login-screen">
      <video
        className="login-video"
        src="/video-juris.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="login-scrim" aria-hidden="true" />

      <div className="login-panel">
        <div className="login-brand">
          <span className="seal">§</span>
          <div className="brand-name">Juris</div>
          <span className="brand-rule" aria-hidden="true" />
          <div className="brand-sub">Gestão de processos &amp; prazos</div>
        </div>

        {confirmacaoPendente ? (
          <>
            <h1>Confirme seu e-mail</h1>
            <p className="login-hint">
              Mandamos um link de confirmação para <strong>{email}</strong>. Clique nele para
              ativar a conta e depois volte aqui para entrar.
            </p>
            <button className="btn-primary btn-block" type="button" onClick={() => trocarModo("entrar")}>
              Voltar para o login
            </button>
          </>
        ) : (
          <>
            <h1>{modo === "entrar" ? "Acessar o sistema" : "Criar sua conta"}</h1>
            <p className="login-hint">
              {modo === "entrar"
                ? "Entre com o e-mail e a senha da sua conta."
                : "O Juris é individual: seus processos, prazos e tarefas ficam só com você."}
            </p>

            <form className="form-login" onSubmit={aoEnviar}>
              {modo === "criar" && (
                <label>
                  Nome completo
                  <div className="input-wrap">
                    <span className="field-ico">✎</span>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Escreva seu nome completo"
                      autoComplete="name"
                      required
                    />
                  </div>
                </label>
              )}

              <label>
                E-mail
                <div className="input-wrap">
                  <span className="field-ico">✉</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com.br"
                    autoComplete="username"
                    required
                  />
                </div>
              </label>

              <label>
                Senha
                <div className="input-wrap">
                  <span className="field-ico">🔒</span>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                    minLength={6}
                    required
                  />
                </div>
              </label>

              <div className="login-error">{erro}</div>

              <button type="submit" className="btn-primary btn-block" disabled={enviando}>
                {enviando
                  ? modo === "entrar"
                    ? "Entrando…"
                    : "Criando conta…"
                  : modo === "entrar"
                    ? "Entrar"
                    : "Criar conta"}
              </button>
            </form>

            <p className="login-switch">
              {modo === "entrar" ? (
                <>
                  Ainda não tem conta?{" "}
                  <button type="button" onClick={() => trocarModo("criar")}>
                    Criar uma agora
                  </button>
                </>
              ) : (
                <>
                  Já tem conta?{" "}
                  <button type="button" onClick={() => trocarModo("entrar")}>
                    Entrar
                  </button>
                </>
              )}
            </p>
          </>
        )}

        <blockquote className="login-quote">
          "O prazo não perdoa. O sistema, sim, pode lembrar por você."
        </blockquote>
      </div>
    </div>
  );
}
