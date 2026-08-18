/**
 * Espelho, no front, das regras que valem no banco.
 *
 * Isto existe só para a interface não oferecer um botão que vai falhar —
 * quem de fato barra é a RLS, e ela continua valendo mesmo que alguém chame
 * a API por fora do app. Se um dia estas funções e as policies discordarem,
 * a policy é que está certa.
 *
 * As regras equivalentes no banco: `e_admin()` e `pode_escrever()`.
 */
import type { Advogado } from "@/types/dominio";

/** Tudo o que tem dono no sistema segue esta forma. */
interface ComResponsavel {
  advogadoId: string | null;
}

export function podeEscrever(eu: Advogado | null): boolean {
  return eu?.papel === "admin" || eu?.papel === "advogado";
}

export function ehAdmin(eu: Advogado | null): boolean {
  return eu?.papel === "admin";
}

/** Editar e apagar: admin em tudo, advogado só no que é dele. */
export function podeEditar(eu: Advogado | null, item: ComResponsavel): boolean {
  if (ehAdmin(eu)) return true;
  if (!podeEscrever(eu)) return false;
  return item.advogadoId === eu?.id;
}

export function podeGerenciarEquipe(eu: Advogado | null): boolean {
  return ehAdmin(eu);
}

export function rotuloPapel(papel: Advogado["papel"]): string {
  return { admin: "Administrador", advogado: "Advogado", consulta: "Consulta" }[papel];
}
