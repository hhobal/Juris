/**
 * O ÚNICO arquivo do app que importa o SDK do Supabase.
 *
 * Nada fora de `lib/queries/` deve importar daqui. É essa regra que mantém a
 * troca por uma API própria como um trabalho de uma pasta só, e não de
 * quarenta componentes.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. " +
      "Copie frontend/.env.example para frontend/.env.local e preencha."
  );
}

export const supabase = createClient<Database>(url, anonKey);
