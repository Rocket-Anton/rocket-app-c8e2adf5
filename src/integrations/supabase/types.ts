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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      addons: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          provider_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          provider_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addons_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          city: string
          coordinates: Json
          created_at: string
          created_by: string | null
          house_number: string
          id: number
          locality: string | null
          notiz: string | null
          postal_code: string
          project_id: string | null
          street: string
          units: Json
        }
        Insert: {
          city: string
          coordinates: Json
          created_at?: string
          created_by?: string | null
          house_number: string
          id?: number
          locality?: string | null
          notiz?: string | null
          postal_code: string
          project_id?: string | null
          street: string
          units?: Json
        }
        Update: {
          city?: string
          coordinates?: Json
          created_at?: string
          created_by?: string | null
          house_number?: string
          id?: number
          locality?: string | null
          notiz?: string | null
          postal_code?: string
          project_id?: string | null
          street?: string
          units?: Json
        }
        Relationships: [
          {
            foreignKeyName: "addresses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_column_mappings: {
        Row: {
          column_mapping: Json
          created_at: string | null
          created_by: string
          id: string
          is_default: boolean | null
          mapping_name: string
          provider_id: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          column_mapping: Json
          created_at?: string | null
          created_by: string
          id?: string
          is_default?: boolean | null
          mapping_name: string
          provider_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          column_mapping?: Json
          created_at?: string | null
          created_by?: string
          id?: string
          is_default?: boolean | null
          mapping_name?: string
          provider_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "csv_column_mappings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_goals: {
        Row: {
          created_at: string
          goal_date: string
          id: string
          planned_hours: number | null
          target_orders: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_date?: string
          id?: string
          planned_hours?: number | null
          target_orders?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          goal_date?: string
          id?: string
          planned_hours?: number | null
          target_orders?: number | null
          user_id?: string
        }
        Relationships: []
      }
      lauflisten: {
        Row: {
          address_count: number | null
          assigned_to: string | null
          color: string
          created_at: string
          created_by: string | null
          factor: number | null
          id: string
          name: string
          unit_count: number | null
        }
        Insert: {
          address_count?: number | null
          assigned_to?: string | null
          color: string
          created_at?: string
          created_by?: string | null
          factor?: number | null
          id?: string
          name: string
          unit_count?: number | null
        }
        Update: {
          address_count?: number | null
          assigned_to?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          factor?: number | null
          id?: string
          name?: string
          unit_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lauflisten_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lauflisten_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lauflisten_addresses: {
        Row: {
          address_id: number
          created_at: string
          id: string
          laufliste_id: string
        }
        Insert: {
          address_id: number
          created_at?: string
          id?: string
          laufliste_id: string
        }
        Update: {
          address_id?: number
          created_at?: string
          id?: string
          laufliste_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lauflisten_addresses_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lauflisten_addresses_laufliste_id_fkey"
            columns: ["laufliste_id"]
            isOneToOne: false
            referencedRelation: "lauflisten"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      project_addons: {
        Row: {
          addon_id: string
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          addon_id: string
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          addon_id?: string
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_addons_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_ai_instructions: {
        Row: {
          area_name: string | null
          created_at: string
          created_by: string
          id: string
          instruction_text: string
          project_id: string
          updated_at: string
        }
        Insert: {
          area_name?: string | null
          created_at?: string
          created_by: string
          id?: string
          instruction_text: string
          project_id: string
          updated_at?: string
        }
        Update: {
          area_name?: string | null
          created_at?: string
          created_by?: string
          id?: string
          instruction_text?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_ai_instructions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tariffs: {
        Row: {
          created_at: string
          id: string
          project_id: string
          tariff_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          tariff_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          tariff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tariffs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tariffs_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "tariffs"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          area_name: string | null
          city: string | null
          coordinates: Json | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          existing_customer_count: number | null
          federal_state: string | null
          id: string
          important_info: string | null
          marketing_type: string | null
          name: string
          post_job_booster: string | null
          postal_code: string | null
          project_manager_id: string | null
          project_with_bonus: boolean | null
          provider_contact_id: string | null
          provider_id: string | null
          quota_type: string | null
          rocket_count: number | null
          saleable_units: number | null
          shift_date: string | null
          start_date: string | null
          status: string
          street_list_url: string | null
          target_quota: number | null
          telegram_group_create: string | null
          telegram_group_exists: string | null
          tender_info: string | null
          unit_count: number | null
          updated_at: string
        }
        Insert: {
          area_name?: string | null
          city?: string | null
          coordinates?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          existing_customer_count?: number | null
          federal_state?: string | null
          id?: string
          important_info?: string | null
          marketing_type?: string | null
          name: string
          post_job_booster?: string | null
          postal_code?: string | null
          project_manager_id?: string | null
          project_with_bonus?: boolean | null
          provider_contact_id?: string | null
          provider_id?: string | null
          quota_type?: string | null
          rocket_count?: number | null
          saleable_units?: number | null
          shift_date?: string | null
          start_date?: string | null
          status?: string
          street_list_url?: string | null
          target_quota?: number | null
          telegram_group_create?: string | null
          telegram_group_exists?: string | null
          tender_info?: string | null
          unit_count?: number | null
          updated_at?: string
        }
        Update: {
          area_name?: string | null
          city?: string | null
          coordinates?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          existing_customer_count?: number | null
          federal_state?: string | null
          id?: string
          important_info?: string | null
          marketing_type?: string | null
          name?: string
          post_job_booster?: string | null
          postal_code?: string | null
          project_manager_id?: string | null
          project_with_bonus?: boolean | null
          provider_contact_id?: string | null
          provider_id?: string | null
          quota_type?: string | null
          rocket_count?: number | null
          saleable_units?: number | null
          shift_date?: string | null
          start_date?: string | null
          status?: string
          street_list_url?: string | null
          target_quota?: number | null
          telegram_group_create?: string | null
          telegram_group_exists?: string | null
          tender_info?: string | null
          unit_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_provider_contact_id_fkey"
            columns: ["provider_contact_id"]
            isOneToOne: false
            referencedRelation: "provider_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_ai_instructions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          instruction_category: string | null
          instruction_text: string
          provider_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          instruction_category?: string | null
          instruction_text: string
          provider_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          instruction_category?: string | null
          instruction_text?: string
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_ai_instructions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_contacts: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          provider_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          provider_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_contacts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          abbreviation: string | null
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          projects_with_bonus: boolean | null
          updated_at: string
        }
        Insert: {
          abbreviation?: string | null
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          projects_with_bonus?: boolean | null
          updated_at?: string
        }
        Update: {
          abbreviation?: string | null
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          projects_with_bonus?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      tariffs: {
        Row: {
          commission_project_manager: number | null
          commission_recruiter: number | null
          commission_rocket: number | null
          commission_sales_partner: number | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          provider_id: string
          updated_at: string
        }
        Insert: {
          commission_project_manager?: number | null
          commission_recruiter?: number | null
          commission_rocket?: number | null
          commission_sales_partner?: number | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          provider_id: string
          updated_at?: string
        }
        Update: {
          commission_project_manager?: number | null
          commission_recruiter?: number | null
          commission_rocket?: number | null
          commission_sales_partner?: number | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tariffs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          address_id: number
          created_at: string
          etage: string | null
          id: string
          lage: string | null
          notiz: string | null
          status: string
          system_notes: string | null
          system_notes_created_by: string | null
          updated_at: string
        }
        Insert: {
          address_id: number
          created_at?: string
          etage?: string | null
          id?: string
          lage?: string | null
          notiz?: string | null
          status?: string
          system_notes?: string | null
          system_notes_created_by?: string | null
          updated_at?: string
        }
        Update: {
          address_id?: number
          created_at?: string
          etage?: string | null
          id?: string
          lage?: string | null
          notiz?: string | null
          status?: string
          system_notes?: string | null
          system_notes_created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_activities: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_ai_memory: {
        Row: {
          created_at: string
          id: string
          importance: number
          last_referenced: string
          memory_content: string
          memory_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          importance?: number
          last_referenced?: string
          memory_content: string
          memory_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          importance?: number
          last_referenced?: string
          memory_content?: string
          memory_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_conversations: {
        Row: {
          created_at: string
          id: string
          message_content: string
          message_role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_content: string
          message_role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_content?: string
          message_role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_daily_context: {
        Row: {
          context_date: string
          created_at: string
          id: string
          mood_score: number | null
          notes: string | null
          total_contacts: number | null
          total_orders: number | null
          user_id: string
          working_hours: number | null
        }
        Insert: {
          context_date?: string
          created_at?: string
          id?: string
          mood_score?: number | null
          notes?: string | null
          total_contacts?: number | null
          total_orders?: number | null
          user_id: string
          working_hours?: number | null
        }
        Update: {
          context_date?: string
          created_at?: string
          id?: string
          mood_score?: number | null
          notes?: string | null
          total_contacts?: number | null
          total_orders?: number | null
          user_id?: string
          working_hours?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_today_stats: {
        Args: { p_user_id: string }
        Returns: {
          goal_hours: number
          goal_orders: number
          orders_today: number
          status_changes_today: number
        }[]
      }
      get_user_conversion_rate: {
        Args: { p_user_id: string }
        Returns: {
          conversion_rate: number
          total_orders: number
          total_status_changes: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
