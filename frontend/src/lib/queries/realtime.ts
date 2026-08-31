import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const SEM_EXTRAS: readonly (readonly unknown[])[] = [];

/**
 * Recarrega a lista quando outra pessoa mexe na mesma tabela.
 *
 * Depende da tabela estar na publicação `supabase_realtime` — ver a migration
 * `realtime.sql`. Sem isso a inscrição conecta, não dá erro, e nunca recebe
 * evento nenhum.
 *
 * @param tabela nome no banco, em snake_case
 * @param chave  queryKey principal a invalidar (use as constantes de módulo,
 *               que têm identidade estável entre renders)
 * @param extras outras queries que dependem da mesma tabela (ex: `advogados`
 *               alimenta tanto `equipe` quanto a lista de responsáveis e a
 *               sessão). Também precisa ser uma constante de módulo estável.
 */
export function useAoVivo(
  tabela: string,
  chave: readonly unknown[],
  extras: readonly (readonly unknown[])[] = SEM_EXTRAS
) {
  const qc = useQueryClient();

  useEffect(() => {
    const canal = supabase
      .channel(`${tabela}-ao-vivo`)
      .on("postgres_changes", { event: "*", schema: "public", table: tabela }, () => {
        qc.invalidateQueries({ queryKey: chave });
        extras.forEach((c) => qc.invalidateQueries({ queryKey: c }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [qc, tabela, chave, extras]);
}
