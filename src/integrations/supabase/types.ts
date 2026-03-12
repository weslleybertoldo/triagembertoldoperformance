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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      tb_admins: {
        Row: {
          criado_em: string | null
          email: string
          id: string
        }
        Insert: {
          criado_em?: string | null
          email: string
          id?: string
        }
        Update: {
          criado_em?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      tb_agendamentos_triagem: {
        Row: {
          altura: number | null
          como_conheceu: string | null
          created_at: string | null
          data_agendamento: string
          data_nascimento: string | null
          id: string
          nome: string
          objetivo: string | null
          peso: number | null
          respostas: Json | null
          saude: string | null
          status: string | null
          tags: string[] | null
          whatsapp: string | null
        }
        Insert: {
          altura?: number | null
          como_conheceu?: string | null
          created_at?: string | null
          data_agendamento: string
          data_nascimento?: string | null
          id?: string
          nome: string
          objetivo?: string | null
          peso?: number | null
          respostas?: Json | null
          saude?: string | null
          status?: string | null
          tags?: string[] | null
          whatsapp?: string | null
        }
        Update: {
          altura?: number | null
          como_conheceu?: string | null
          created_at?: string | null
          data_agendamento?: string
          data_nascimento?: string | null
          id?: string
          nome?: string
          objetivo?: string | null
          peso?: number | null
          respostas?: Json | null
          saude?: string | null
          status?: string | null
          tags?: string[] | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      tb_alunos: {
        Row: {
          acesso_liberado: boolean | null
          created_at: string | null
          email: string | null
          foto_url: string | null
          id: string
          nome: string | null
          whatsapp: string | null
        }
        Insert: {
          acesso_liberado?: boolean | null
          created_at?: string | null
          email?: string | null
          foto_url?: string | null
          id: string
          nome?: string | null
          whatsapp?: string | null
        }
        Update: {
          acesso_liberado?: boolean | null
          created_at?: string | null
          email?: string | null
          foto_url?: string | null
          id?: string
          nome?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      tb_config_triagem: {
        Row: {
          id: string
          mensagem_whatsapp: string
          numero_whatsapp: string
          perguntas: Json
          updated_at: string | null
        }
        Insert: {
          id?: string
          mensagem_whatsapp?: string
          numero_whatsapp?: string
          perguntas?: Json
          updated_at?: string | null
        }
        Update: {
          id?: string
          mensagem_whatsapp?: string
          numero_whatsapp?: string
          perguntas?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      tb_consultas: {
        Row: {
          aluno_id: string | null
          created_at: string | null
          criado_por: string | null
          data_consulta: string
          id: string
          observacao: string | null
          status: string | null
        }
        Insert: {
          aluno_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_consulta: string
          id?: string
          observacao?: string | null
          status?: string | null
        }
        Update: {
          aluno_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_consulta?: string
          id?: string
          observacao?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tb_consultas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "tb_alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      tb_tags: {
        Row: {
          cor: string | null
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
