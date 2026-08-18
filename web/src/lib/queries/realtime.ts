import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Recarrega a lista quando outra pessoa mexe na mesma tabela.
 *
 * Depende da tabela estar na publicação `supabase_realtime` — ver a migration
 * `realtime.sql`. Sem isso a inscrição conecta, não dá erro, e nunca recebe
 * evento nenhum.
 *
 * @param tabela nome no banco, em snake_case
 * @param chave  queryKey a invalidar (use as constantes de módulo, que têm
 *               identidade estável entre renders)
 */
export function useAoVivo(tabela: string, chave: readonly unknown[]) {
  const qc = useQueryClient();

  useEffect(() => {
    const canal = supabase
      .channel(`${tabela}-ao-vivo`)
      .on("postgres_changes", { event: "*", schema: "public", table: tabela }, () => {
        qc.invalidateQueries({ queryKey: chave });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [qc, tabela, chave]);
}
