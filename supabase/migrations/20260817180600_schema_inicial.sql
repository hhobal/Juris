


-- ==========================================================
-- JURIS — SCHEMA INICIAL
--
-- Arquivo único, gerado por "supabase migration squash" a partir
-- das 7 migrations incrementais da construção. Ele descreve o
-- banco como ele é, e não o caminho até aqui.
--
-- A PARTIR DAQUI, NÃO EDITE ESTE ARQUIVO. Toda mudança de
-- estrutura vira uma migration nova:
--
--     npx supabase migration new nome_da_mudanca
--     # edite o .sql criado em supabase/migrations/
--     npx supabase db push
--
-- O PORQUÊ das decisões (papéis, trigger de convite, grants,
-- datas puras) está em supabase/README.md — o squash preserva o
-- código, não a narrativa.
--
-- Resumo do que está aqui:
--   5 tabelas   empresas, advogados, processos, tarefas, prazos
--   3 papéis    admin / advogado / consulta, em advogados.papel
--   18 policies leitura para todos; escrita só no que é seu;
--               admin passa por cima; consulta não escreve
--   triggers    perfil ligado ao login, autoria automática,
--               papel e vínculo protegidos contra autopromoção
-- ==========================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."advogado_atual"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select id from public.advogados
   where auth_user_id = auth.uid() and ativo;
$$;


ALTER FUNCTION "public"."advogado_atual"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(public.papel_atual() = 'admin', false);
$$;


ALTER FUNCTION "public"."e_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- O perfil precisa já existir, cadastrado por um admin. É ele
  -- que autoriza a entrada; o login sozinho não autoriza nada.
  update public.advogados
     set auth_user_id = new.id
   where lower(email) = lower(new.email)
     and auth_user_id is null;

  -- Sem perfil correspondente não criamos nada, e também não
  -- damos erro: o usuário existe no Auth, mas o app recusa o
  -- login por não achar perfil. Recusar aqui devolveria um 500
  -- confuso para quem estivesse criando a conta pelo painel.
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."marca_autoria"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if TG_OP = 'INSERT' then
    new.created_by := coalesce(new.created_by, public.advogado_atual());
    new.updated_by := new.created_by;
  else
    new.created_by := old.created_by; -- autoria original é imutável
    new.updated_by := coalesce(public.advogado_atual(), old.updated_by);
  end if;
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."marca_autoria"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."papel_atual"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select papel from public.advogados
   where auth_user_id = auth.uid() and ativo;
$$;


ALTER FUNCTION "public"."papel_atual"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pode_escrever"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(public.papel_atual() in ('admin', 'advogado'), false);
$$;


ALTER FUNCTION "public"."pode_escrever"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protege_auth_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Mesma ressalva do protege_papel: sem auth.uid() quem está mexendo é o
  -- service_role, o painel ou uma migration. A trava vale para quem chega
  -- pelo app com token de advogado.
  if auth.uid() is null then
    return new;
  end if;

  if old.auth_user_id is not null
     and new.auth_user_id is distinct from old.auth_user_id then
    raise exception 'auth_user_id do advogado % não pode ser alterado', old.id
      using hint = 'Para trocar o login de um advogado, desative o registro e crie outro.';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."protege_auth_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protege_papel"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Sem auth.uid() não há usuário final na jogada: é o service_role, o painel
  -- do Supabase, uma migration ou o seed. Contextos já confiáveis, que
  -- precisam conseguir promover e desativar. Este trigger existe para conter
  -- quem entra pelo app com um token de advogado, não para travar a
  -- administração do banco.
  if auth.uid() is null then
    return new;
  end if;

  if (new.papel is distinct from old.papel or new.ativo is distinct from old.ativo)
     and not public.e_admin() then
    raise exception 'Somente um administrador pode alterar papel ou situação de um advogado'
      using errcode = '42501';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."protege_papel"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."advogados" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid",
    "auth_user_id" "uuid",
    "nome" "text" NOT NULL,
    "email" "text" NOT NULL,
    "oab" "text",
    "cargo" "text",
    "cor" "text" DEFAULT '#C9A24B'::"text",
    "iniciais" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ativo" boolean DEFAULT true NOT NULL,
    "papel" "text" DEFAULT 'advogado'::"text" NOT NULL,
    CONSTRAINT "advogados_papel_check" CHECK (("papel" = ANY (ARRAY['admin'::"text", 'advogado'::"text", 'consulta'::"text"])))
);


ALTER TABLE "public"."advogados" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."empresas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "razao_social" "text" NOT NULL,
    "cnpj" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."empresas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prazos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "numero_processo" "text" NOT NULL,
    "parte_autora" "text" NOT NULL,
    "estado" "text" NOT NULL,
    "descricao" "text" NOT NULL,
    "tipo" "text" DEFAULT 'Prazo processual'::"text",
    "advogado_id" "uuid",
    "vencimento" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."prazos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."prazos"."vencimento" IS 'Data de calendário, sem hora. Não converter para timestamp no cliente.';



CREATE TABLE IF NOT EXISTS "public"."processos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "numero" "text" NOT NULL,
    "parte" "text" NOT NULL,
    "tipo" "text",
    "tribunal" "text",
    "vara" "text",
    "advogado_id" "uuid",
    "status" "text" DEFAULT 'Em andamento'::"text",
    "fase" "text",
    "valor_causa" numeric DEFAULT 0 NOT NULL,
    "distribuicao" "date",
    "ultima_mov" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."processos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tarefas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "processo_numero" "text",
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "advogado_id" "uuid",
    "coluna" "text" DEFAULT 'fazer'::"text",
    "prioridade" "text" DEFAULT 'media'::"text",
    "prazo" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."tarefas" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tarefas"."prazo" IS 'Data de calendário, sem hora. Não converter para timestamp no cliente.';



ALTER TABLE ONLY "public"."advogados"
    ADD CONSTRAINT "advogados_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."advogados"
    ADD CONSTRAINT "advogados_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."advogados"
    ADD CONSTRAINT "advogados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."empresas"
    ADD CONSTRAINT "empresas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prazos"
    ADD CONSTRAINT "prazos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."processos"
    ADD CONSTRAINT "processos_numero_key" UNIQUE ("numero");



ALTER TABLE ONLY "public"."processos"
    ADD CONSTRAINT "processos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tarefas"
    ADD CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_advogados_email_lower" ON "public"."advogados" USING "btree" ("lower"("email"));



CREATE INDEX "idx_advogados_papel" ON "public"."advogados" USING "btree" ("papel") WHERE "ativo";



CREATE INDEX "idx_prazos_advogado" ON "public"."prazos" USING "btree" ("advogado_id");



CREATE INDEX "idx_prazos_vencimento" ON "public"."prazos" USING "btree" ("vencimento");



CREATE INDEX "idx_processos_advogado" ON "public"."processos" USING "btree" ("advogado_id");



CREATE INDEX "idx_processos_status" ON "public"."processos" USING "btree" ("status");



CREATE INDEX "idx_tarefas_advogado" ON "public"."tarefas" USING "btree" ("advogado_id");



CREATE INDEX "idx_tarefas_coluna" ON "public"."tarefas" USING "btree" ("coluna");



CREATE INDEX "idx_tarefas_prazo" ON "public"."tarefas" USING "btree" ("prazo");



CREATE OR REPLACE TRIGGER "advogados_protege_papel" BEFORE UPDATE ON "public"."advogados" FOR EACH ROW EXECUTE FUNCTION "public"."protege_papel"();



CREATE OR REPLACE TRIGGER "advogados_protege_vinculo" BEFORE UPDATE ON "public"."advogados" FOR EACH ROW EXECUTE FUNCTION "public"."protege_auth_user_id"();



CREATE OR REPLACE TRIGGER "prazos_autoria" BEFORE INSERT OR UPDATE ON "public"."prazos" FOR EACH ROW EXECUTE FUNCTION "public"."marca_autoria"();



CREATE OR REPLACE TRIGGER "processos_autoria" BEFORE INSERT OR UPDATE ON "public"."processos" FOR EACH ROW EXECUTE FUNCTION "public"."marca_autoria"();



CREATE OR REPLACE TRIGGER "tarefas_autoria" BEFORE INSERT OR UPDATE ON "public"."tarefas" FOR EACH ROW EXECUTE FUNCTION "public"."marca_autoria"();



ALTER TABLE ONLY "public"."advogados"
    ADD CONSTRAINT "advogados_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."advogados"
    ADD CONSTRAINT "advogados_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prazos"
    ADD CONSTRAINT "prazos_advogado_id_fkey" FOREIGN KEY ("advogado_id") REFERENCES "public"."advogados"("id");



ALTER TABLE ONLY "public"."prazos"
    ADD CONSTRAINT "prazos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."advogados"("id");



ALTER TABLE ONLY "public"."prazos"
    ADD CONSTRAINT "prazos_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."advogados"("id");



ALTER TABLE ONLY "public"."processos"
    ADD CONSTRAINT "processos_advogado_id_fkey" FOREIGN KEY ("advogado_id") REFERENCES "public"."advogados"("id");



ALTER TABLE ONLY "public"."processos"
    ADD CONSTRAINT "processos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."advogados"("id");



ALTER TABLE ONLY "public"."processos"
    ADD CONSTRAINT "processos_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."advogados"("id");



ALTER TABLE ONLY "public"."tarefas"
    ADD CONSTRAINT "tarefas_advogado_id_fkey" FOREIGN KEY ("advogado_id") REFERENCES "public"."advogados"("id");



ALTER TABLE ONLY "public"."tarefas"
    ADD CONSTRAINT "tarefas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."advogados"("id");



ALTER TABLE ONLY "public"."tarefas"
    ADD CONSTRAINT "tarefas_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."advogados"("id");



CREATE POLICY "admin cadastra advogado" ON "public"."advogados" FOR INSERT WITH CHECK ("public"."e_admin"());



CREATE POLICY "admin edita empresa" ON "public"."empresas" FOR UPDATE USING ("public"."e_admin"()) WITH CHECK ("public"."e_admin"());



CREATE POLICY "admin ou dono edita advogado" ON "public"."advogados" FOR UPDATE USING (("public"."e_admin"() OR ("id" = "public"."advogado_atual"()))) WITH CHECK (("public"."e_admin"() OR ("id" = "public"."advogado_atual"())));



ALTER TABLE "public"."advogados" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "apaga prazo proprio" ON "public"."prazos" FOR DELETE USING (("public"."e_admin"() OR ("advogado_id" = "public"."advogado_atual"())));



CREATE POLICY "apaga processo proprio" ON "public"."processos" FOR DELETE USING (("public"."e_admin"() OR ("advogado_id" = "public"."advogado_atual"())));



CREATE POLICY "apaga tarefa propria" ON "public"."tarefas" FOR DELETE USING (("public"."e_admin"() OR ("advogado_id" = "public"."advogado_atual"())));



CREATE POLICY "cria prazo" ON "public"."prazos" FOR INSERT WITH CHECK ("public"."pode_escrever"());



CREATE POLICY "cria processo" ON "public"."processos" FOR INSERT WITH CHECK ("public"."pode_escrever"());



CREATE POLICY "cria tarefa" ON "public"."tarefas" FOR INSERT WITH CHECK ("public"."pode_escrever"());



CREATE POLICY "edita prazo proprio" ON "public"."prazos" FOR UPDATE USING (("public"."e_admin"() OR ("advogado_id" = "public"."advogado_atual"()))) WITH CHECK ("public"."pode_escrever"());



CREATE POLICY "edita processo proprio" ON "public"."processos" FOR UPDATE USING (("public"."e_admin"() OR ("advogado_id" = "public"."advogado_atual"()))) WITH CHECK ("public"."pode_escrever"());



CREATE POLICY "edita tarefa propria" ON "public"."tarefas" FOR UPDATE USING (("public"."e_admin"() OR ("advogado_id" = "public"."advogado_atual"()))) WITH CHECK ("public"."pode_escrever"());



CREATE POLICY "empresa visivel" ON "public"."empresas" FOR SELECT USING (("public"."advogado_atual"() IS NOT NULL));



ALTER TABLE "public"."empresas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipe visivel" ON "public"."advogados" FOR SELECT USING (("public"."advogado_atual"() IS NOT NULL));



ALTER TABLE "public"."prazos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."processos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tarefas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "todos leem prazos" ON "public"."prazos" FOR SELECT USING (("public"."advogado_atual"() IS NOT NULL));



CREATE POLICY "todos leem processos" ON "public"."processos" FOR SELECT USING (("public"."advogado_atual"() IS NOT NULL));



CREATE POLICY "todos leem tarefas" ON "public"."tarefas" FOR SELECT USING (("public"."advogado_atual"() IS NOT NULL));



CREATE POLICY "ve o proprio cadastro" ON "public"."advogados" FOR SELECT USING (("auth_user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




























































































































































GRANT ALL ON FUNCTION "public"."advogado_atual"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."advogado_atual"() TO "service_role";



GRANT ALL ON FUNCTION "public"."e_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."marca_autoria"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."marca_autoria"() TO "service_role";



GRANT ALL ON FUNCTION "public"."papel_atual"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."papel_atual"() TO "service_role";



GRANT ALL ON FUNCTION "public"."pode_escrever"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."pode_escrever"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protege_auth_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protege_auth_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protege_papel"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protege_papel"() TO "service_role";


















GRANT ALL ON TABLE "public"."advogados" TO "authenticated";
GRANT ALL ON TABLE "public"."advogados" TO "service_role";



GRANT ALL ON TABLE "public"."empresas" TO "authenticated";
GRANT ALL ON TABLE "public"."empresas" TO "service_role";



GRANT ALL ON TABLE "public"."prazos" TO "authenticated";
GRANT ALL ON TABLE "public"."prazos" TO "service_role";



GRANT ALL ON TABLE "public"."processos" TO "authenticated";
GRANT ALL ON TABLE "public"."processos" TO "service_role";



GRANT ALL ON TABLE "public"."tarefas" TO "authenticated";
GRANT ALL ON TABLE "public"."tarefas" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































--
-- Dumped schema changes for auth and storage
--

CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



