import { useState, type FormEvent } from "react";
import { useEntrar } from "@/lib/queries/sessao";

export function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const entrar = useEntrar();

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    entrar.mutate({ email, senha });
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-brand">
          <span className="seal">§</span>
          <div>
            <div className="brand-name">Juris</div>
            <div className="brand-sub">Gestão de processos &amp; prazos</div>
          </div>
        </div>

        <h1>Acessar o sistema</h1>
        <p className="login-hint">Entre com o e-mail corporativo cadastrado pelo escritório.</p>

        <form className="form-login" onSubmit={aoEnviar}>
          <label>
            E-mail
            <div className="input-wrap">
              <span className="field-ico">✉</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
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
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          <div className="login-error">{entrar.error?.message ?? ""}</div>

          <button type="submit" className="btn-primary btn-block" disabled={entrar.isPending}>
            {entrar.isPending ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>

      <div className="login-side">
        <span className="login-eyebrow">Departamento Jurídico</span>
        <div className="login-illustration" aria-hidden="true">
        <svg viewBox="0 0 300 320" xmlns="http://www.w3.org/2000/svg">
        <defs>
        <radialGradient id="scaleGlow" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stopColor="#C9A24B" stopOpacity=".35"/>
        <stop offset="100%" stopColor="#C9A24B" stopOpacity="0"/>
        </radialGradient>
        </defs>
        
        <circle className="glow-pulse" cx="150" cy="150" r="145" fill="url(#scaleGlow)"/>
        
        {/* pedestal */}
        <path d="M120 272 L180 272 L192 292 L108 292 Z" fill="none" stroke="#C9A24B" strokeWidth="1.6"/>
        <line x1="150" y1="250" x2="150" y2="272" stroke="#C9A24B" strokeWidth="1.6"/>
        {/* pole */}
        <line x1="150" y1="70" x2="150" y2="250" stroke="#C9A24B" strokeWidth="1.6"/>
        <circle cx="150" cy="64" r="6" fill="none" stroke="#C9A24B" strokeWidth="1.6"/>
        
        {/* beam + pans (sways gently) */}
        <g className="scale-beam">
        <line x1="68" y1="96" x2="232" y2="96" stroke="#C9A24B" strokeWidth="1.6"/>
        <circle cx="150" cy="96" r="4" fill="#C9A24B"/>
        
        <g className="pan-left">
        <line x1="68" y1="96" x2="52" y2="158" stroke="#C9A24B" strokeWidth="1.2"/>
        <line x1="68" y1="96" x2="84" y2="158" stroke="#C9A24B" strokeWidth="1.2"/>
        <path d="M44 158 Q68 186 92 158" fill="rgba(201,162,75,.14)" stroke="#C9A24B" strokeWidth="1.6"/>
        </g>
        
        <g className="pan-right">
        <line x1="232" y1="96" x2="216" y2="158" stroke="#C9A24B" strokeWidth="1.2"/>
        <line x1="232" y1="96" x2="248" y2="158" stroke="#C9A24B" strokeWidth="1.2"/>
        <path d="M208 158 Q232 186 256 158" fill="rgba(201,162,75,.14)" stroke="#C9A24B" strokeWidth="1.6"/>
        </g>
        </g>
        </svg>
        </div>
        <blockquote>"O prazo não perdoa. O sistema, sim, pode lembrar por você."</blockquote>
      </div>
    </div>
  );
}
