export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      advogados: {
        Row: {
          ativo: boolean
          auth_user_id: string | null
          cargo: string | null
          cor: string | null
          created_at: string | null
          email: string
          id: string
          iniciais: string | null
          nome: string
          oab_numero: string | null
          oab_uf: string | null
          tribunais_monitorados: string[]
        }
        Insert: {
          ativo?: boolean
          auth_user_id?: string | null
          cargo?: string | null
          cor?: string | null
          created_at?: string | null
          email: string
          id?: string
          iniciais?: string | null
          nome: string
          oab_numero?: string | null
          oab_uf?: string | null
          tribunais_monitorados?: string[]
        }
        Update: {
          ativo?: boolean
          auth_user_id?: string | null
          cargo?: string | null
          cor?: string | null
          created_at?: string | null
          email?: string
          id?: string
          iniciais?: string | null
          nome?: string
          oab_numero?: string | null
          oab_uf?: string | null
          tribunais_monitorados?: string[]
        }
        Relationships: []
      }
      compartilhamentos: {
        Row: {
          created_at: string
          dono_id: string
          email_convidado: string
          id: string
          processo_id: string
        }
        Insert: {
          created_at?: string
          dono_id: string
          email_convidado: string
          id?: string
          processo_id: string
        }
        Update: {
          created_at?: string
          dono_id?: string
          email_convidado?: string
          id?: string
          processo_id?: string
        }
        Relationships: []
      }
      prazos: {
        Row: {
          advogado_id: string | null
          confirmado: boolean
          created_at: string | null
          created_by: string | null
          descricao: string
          dias_uteis: number | null
          estado: string
          id: string
          numero_processo: string
          origem: string
          parte_autora: string
          publicacao_id: string | null
          tipo: string | null
          updated_at: string | null
          updated_by: string | null
          vencimento: string
        }
        Insert: {
          advogado_id?: string | null
          confirmado?: boolean
          created_at?: string | null
          created_by?: string | null
          descricao: string
          dias_uteis?: number | null
          estado: string
          id?: string
          numero_processo: string
          origem?: string
          parte_autora: string
          publicacao_id?: string | null
          tipo?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vencimento: string
        }
        Update: {
          advogado_id?: string | null
          confirmado?: boolean
          created_at?: string | null
          created_by?: string | null
          descricao?: string
          dias_uteis?: number | null
          estado?: string
          id?: string
          numero_processo?: string
          origem?: string
          parte_autora?: string
          publicacao_id?: string | null
          tipo?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "prazos_advogado_id_fkey"
            columns: ["advogado_id"]
            isOneToOne: false
            referencedRelation: "advogados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prazos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "advogados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prazos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "advogados"
            referencedColumns: ["id"]
          },
        ]
      }
      publicacoes: {
        Row: {
          advogado_id: string
          advogados_intimados: string[]
          classe: string | null
          cnj_hash: string | null
          cnj_id: number
          created_at: string
          disponibilizacao: string
          id: string
          link: string | null
          numero_processo: string
          numero_processo_limpo: string
          orgao: string | null
          partes: string[]
          processo_id: string | null
          situacao: string
          teor: string | null
          tipo: string | null
          tribunal: string | null
        }
        Insert: {
          advogado_id: string
          advogados_intimados?: string[]
          classe?: string | null
          cnj_hash?: string | null
          cnj_id: number
          created_at?: string
          disponibilizacao: string
          id?: string
          link?: string | null
          numero_processo: string
          numero_processo_limpo: string
          orgao?: string | null
          partes?: string[]
          processo_id?: string | null
          situacao?: string
          teor?: string | null
          tipo?: string | null
          tribunal?: string | null
        }
        Update: {
          advogado_id?: string
          advogados_intimados?: string[]
          classe?: string | null
          cnj_hash?: string | null
          cnj_id?: number
          created_at?: string
          disponibilizacao?: string
          id?: string
          link?: string | null
          numero_processo?: string
          numero_processo_limpo?: string
          orgao?: string | null
          partes?: string[]
          processo_id?: string | null
          situacao?: string
          teor?: string | null
          tipo?: string | null
          tribunal?: string | null
        }
        Relationships: []
      }
      processos: {
        Row: {
          advogado_id: string | null
          created_at: string | null
          created_by: string | null
          distribuicao: string | null
          fase: string | null
          id: string
          numero: string
          origem: string
          parte: string
          status: string | null
          tipo: string | null
          tribunal: string | null
          ultima_mov: string | null
          updated_at: string | null
          updated_by: string | null
          valor_causa: number
          vara: string | null
        }
        Insert: {
          advogado_id?: string | null
          created_at?: string | null
          created_by?: string | null
          distribuicao?: string | null
          fase?: string | null
          id?: string
          numero: string
          origem?: string
          parte: string
          status?: string | null
          tipo?: string | null
          tribunal?: string | null
          ultima_mov?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valor_causa?: number
          vara?: string | null
        }
        Update: {
          advogado_id?: string | null
          created_at?: string | null
          created_by?: string | null
          distribuicao?: string | null
          fase?: string | null
          id?: string
          numero?: string
          origem?: string
          parte?: string
          status?: string | null
          tipo?: string | null
          tribunal?: string | null
          ultima_mov?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valor_causa?: number
          vara?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_advogado_id_fkey"
            columns: ["advogado_id"]
            isOneToOne: false
            referencedRelation: "advogados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "advogados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "advogados"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          advogado_id: string | null
          coluna: string | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          prazo: string | null
          prioridade: string | null
          processo_numero: string | null
          titulo: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          advogado_id?: string | null
          coluna?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          prazo?: string | null
          prioridade?: string | null
          processo_numero?: string | null
          titulo: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          advogado_id?: string | null
          coluna?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          prazo?: string | null
          prioridade?: string | null
          processo_numero?: string | null
          titulo?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_advogado_id_fkey"
            columns: ["advogado_id"]
            isOneToOne: false
            referencedRelation: "advogados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "advogados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "advogados"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advogado_atual: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
