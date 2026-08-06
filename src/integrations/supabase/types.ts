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
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor: string
          agency_id: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor?: string
          agency_id: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor?: string
          agency_id?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          plan: string
          registration_no: string | null
          slug: string | null
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          plan?: string
          registration_no?: string | null
          slug?: string | null
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          plan?: string
          registration_no?: string | null
          slug?: string | null
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      agency_settings: {
        Row: {
          agency_id: string
          ai_custom_instructions: string
          ai_emoji: boolean
          ai_language: string
          ai_name: string
          ai_personality: string
          ai_reply_length: string
          ai_tone: string
          business_hours: Json
          created_at: string
          id: string
          kb_auto_use: boolean
          kb_escalate_when_unknown: boolean
          kb_max_articles: number
          kb_strict_mode: boolean
          notify_booking: boolean
          notify_daily_summary: boolean
          notify_email: boolean
          notify_followup_due: boolean
          notify_hot_lead: boolean
          notify_new_lead: boolean
          notify_whatsapp: boolean
          plan: string
          plan_status: string
          renews_at: string | null
          seats: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          ai_custom_instructions?: string
          ai_emoji?: boolean
          ai_language?: string
          ai_name?: string
          ai_personality?: string
          ai_reply_length?: string
          ai_tone?: string
          business_hours?: Json
          created_at?: string
          id?: string
          kb_auto_use?: boolean
          kb_escalate_when_unknown?: boolean
          kb_max_articles?: number
          kb_strict_mode?: boolean
          notify_booking?: boolean
          notify_daily_summary?: boolean
          notify_email?: boolean
          notify_followup_due?: boolean
          notify_hot_lead?: boolean
          notify_new_lead?: boolean
          notify_whatsapp?: boolean
          plan?: string
          plan_status?: string
          renews_at?: string | null
          seats?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          ai_custom_instructions?: string
          ai_emoji?: boolean
          ai_language?: string
          ai_name?: string
          ai_personality?: string
          ai_reply_length?: string
          ai_tone?: string
          business_hours?: Json
          created_at?: string
          id?: string
          kb_auto_use?: boolean
          kb_escalate_when_unknown?: boolean
          kb_max_articles?: number
          kb_strict_mode?: boolean
          notify_booking?: boolean
          notify_daily_summary?: boolean
          notify_email?: boolean
          notify_followup_due?: boolean
          notify_hot_lead?: boolean
          notify_new_lead?: boolean
          notify_whatsapp?: boolean
          plan?: string
          plan_status?: string
          renews_at?: string | null
          seats?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tasks: {
        Row: {
          agency_id: string
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          input: Json
          kind: string
          lead_id: string | null
          minutes_saved: number
          output: Json | null
          requires_approval: boolean
          status: Database["public"]["Enums"]["ai_task_status"]
          summary: string | null
          title: string
          updated_at: string
          worker_key: string
        }
        Insert: {
          agency_id: string
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          input?: Json
          kind: string
          lead_id?: string | null
          minutes_saved?: number
          output?: Json | null
          requires_approval?: boolean
          status?: Database["public"]["Enums"]["ai_task_status"]
          summary?: string | null
          title: string
          updated_at?: string
          worker_key: string
        }
        Update: {
          agency_id?: string
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          input?: Json
          kind?: string
          lead_id?: string | null
          minutes_saved?: number
          output?: Json | null
          requires_approval?: boolean
          status?: Database["public"]["Enums"]["ai_task_status"]
          summary?: string | null
          title?: string
          updated_at?: string
          worker_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tasks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workers: {
        Row: {
          agency_id: string
          autonomy: string
          created_at: string
          description: string
          id: string
          is_enabled: boolean
          last_run_at: string | null
          name: string
          status: Database["public"]["Enums"]["ai_worker_status"]
          updated_at: string
          worker_key: string
        }
        Insert: {
          agency_id: string
          autonomy?: string
          created_at?: string
          description?: string
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          name: string
          status?: Database["public"]["Enums"]["ai_worker_status"]
          updated_at?: string
          worker_key: string
        }
        Update: {
          agency_id?: string
          autonomy?: string
          created_at?: string
          description?: string
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          name?: string
          status?: Database["public"]["Enums"]["ai_worker_status"]
          updated_at?: string
          worker_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at: string | null
          revoked: boolean
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          label?: string
          last_used_at?: string | null
          revoked?: boolean
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          revoked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          agency_id: string
          amount_myr: number
          created_at: string
          deposit_paid: boolean
          id: string
          lead_id: string | null
          package_id: string | null
          pax: number
          status: string
        }
        Insert: {
          agency_id: string
          amount_myr?: number
          created_at?: string
          deposit_paid?: boolean
          id?: string
          lead_id?: string | null
          package_id?: string | null
          pax?: number
          status?: string
        }
        Update: {
          agency_id?: string
          amount_myr?: number
          created_at?: string
          deposit_paid?: boolean
          id?: string
          lead_id?: string | null
          package_id?: string | null
          pax?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agency_id: string
          ai_enabled: boolean
          channel: Database["public"]["Enums"]["channel"]
          created_at: string
          escalated_at: string | null
          escalation_reason: string | null
          external_id: string | null
          first_response_ms: number | null
          id: string
          last_message_at: string
          lead_id: string | null
          status: string
        }
        Insert: {
          agency_id: string
          ai_enabled?: boolean
          channel?: Database["public"]["Enums"]["channel"]
          created_at?: string
          escalated_at?: string | null
          escalation_reason?: string | null
          external_id?: string | null
          first_response_ms?: number | null
          id?: string
          last_message_at?: string
          lead_id?: string | null
          status?: string
        }
        Update: {
          agency_id?: string
          ai_enabled?: boolean
          channel?: Database["public"]["Enums"]["channel"]
          created_at?: string
          escalated_at?: string | null
          escalation_reason?: string | null
          external_id?: string | null
          first_response_ms?: number | null
          id?: string
          last_message_at?: string
          lead_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_jobs: {
        Row: {
          agency_id: string
          channel: Database["public"]["Enums"]["channel"]
          created_at: string
          id: string
          lead_id: string | null
          run_at: string
          status: Database["public"]["Enums"]["followup_status"]
          title: string
        }
        Insert: {
          agency_id: string
          channel?: Database["public"]["Enums"]["channel"]
          created_at?: string
          id?: string
          lead_id?: string | null
          run_at?: string
          status?: Database["public"]["Enums"]["followup_status"]
          title?: string
        }
        Update: {
          agency_id?: string
          channel?: Database["public"]["Enums"]["channel"]
          created_at?: string
          id?: string
          lead_id?: string | null
          run_at?: string
          status?: Database["public"]["Enums"]["followup_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_jobs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_jobs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          agency_id: string
          category: Database["public"]["Enums"]["kb_category"]
          content: string
          created_at: string
          created_by: string | null
          file_name: string | null
          file_path: string | null
          id: string
          is_active: boolean
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          category?: Database["public"]["Enums"]["kb_category"]
          content?: string
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          category?: Database["public"]["Enums"]["kb_category"]
          content?: string
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          agency_id: string
          author_id: string | null
          body: string
          created_at: string
          id: string
          lead_id: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          lead_id: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agency_id: string
          assigned_to: string | null
          budget_myr: number | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_contact_at: string | null
          package_interest: string | null
          pax: number
          phone: string | null
          preferred_month: string | null
          score: number
          source: string
          stage: Database["public"]["Enums"]["lead_stage"]
          tags: string[]
          temperature: Database["public"]["Enums"]["lead_temperature"]
          updated_at: string
        }
        Insert: {
          agency_id: string
          assigned_to?: string | null
          budget_myr?: number | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_contact_at?: string | null
          package_interest?: string | null
          pax?: number
          phone?: string | null
          preferred_month?: string | null
          score?: number
          source?: string
          stage?: Database["public"]["Enums"]["lead_stage"]
          tags?: string[]
          temperature?: Database["public"]["Enums"]["lead_temperature"]
          updated_at?: string
        }
        Update: {
          agency_id?: string
          assigned_to?: string | null
          budget_myr?: number | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_contact_at?: string | null
          package_interest?: string | null
          pax?: number
          phone?: string | null
          preferred_month?: string | null
          score?: number
          source?: string
          stage?: Database["public"]["Enums"]["lead_stage"]
          tags?: string[]
          temperature?: Database["public"]["Enums"]["lead_temperature"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          agency_id: string
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender: Database["public"]["Enums"]["msg_sender"]
        }
        Insert: {
          agency_id: string
          body?: string
          conversation_id: string
          created_at?: string
          id?: string
          sender: Database["public"]["Enums"]["msg_sender"]
        }
        Update: {
          agency_id?: string
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender?: Database["public"]["Enums"]["msg_sender"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          agency_id: string
          airline: string | null
          created_at: string
          departure_date: string | null
          hotel_madinah: string | null
          hotel_makkah: string | null
          id: string
          inclusions: string[]
          is_active: boolean
          name: string
          nights: number
          price_myr: number
          star_rating: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          airline?: string | null
          created_at?: string
          departure_date?: string | null
          hotel_madinah?: string | null
          hotel_makkah?: string | null
          id?: string
          inclusions?: string[]
          is_active?: boolean
          name: string
          nights?: number
          price_myr?: number
          star_rating?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          airline?: string | null
          created_at?: string
          departure_date?: string | null
          hotel_madinah?: string | null
          hotel_makkah?: string | null
          id?: string
          inclusions?: string[]
          is_active?: boolean
          name?: string
          nights?: number
          price_myr?: number
          star_rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_id: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          job_title: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          agency_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_configs: {
        Row: {
          access_token: string | null
          agency_id: string
          auto_reply: boolean
          business_account_id: string | null
          created_at: string
          display_phone_number: string | null
          id: string
          is_connected: boolean
          last_inbound_at: string | null
          phone_number_id: string | null
          updated_at: string
          verify_token: string
        }
        Insert: {
          access_token?: string | null
          agency_id: string
          auto_reply?: boolean
          business_account_id?: string | null
          created_at?: string
          display_phone_number?: string | null
          id?: string
          is_connected?: boolean
          last_inbound_at?: string | null
          phone_number_id?: string | null
          updated_at?: string
          verify_token?: string
        }
        Update: {
          access_token?: string | null
          agency_id?: string
          auto_reply?: boolean
          business_account_id?: string | null
          created_at?: string
          display_phone_number?: string | null
          id?: string
          is_connected?: boolean
          last_inbound_at?: string | null
          phone_number_id?: string | null
          updated_at?: string
          verify_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_configs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ai_task_status:
        | "queued"
        | "processing"
        | "waiting_approval"
        | "completed"
        | "failed"
        | "rejected"
      ai_worker_status:
        | "active"
        | "idle"
        | "processing"
        | "completed"
        | "waiting_approval"
      app_role: "owner" | "admin" | "agent"
      channel: "whatsapp" | "web" | "manual"
      followup_status: "pending" | "sent" | "skipped" | "failed"
      kb_category:
        | "faq"
        | "travel_guide"
        | "package_info"
        | "visa_info"
        | "hotel_info"
        | "general"
      lead_stage:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "booked"
        | "completed"
        | "lost"
      lead_temperature: "hot" | "warm" | "cold"
      msg_sender: "customer" | "ai" | "human"
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
      ai_task_status: [
        "queued",
        "processing",
        "waiting_approval",
        "completed",
        "failed",
        "rejected",
      ],
      ai_worker_status: [
        "active",
        "idle",
        "processing",
        "completed",
        "waiting_approval",
      ],
      app_role: ["owner", "admin", "agent"],
      channel: ["whatsapp", "web", "manual"],
      followup_status: ["pending", "sent", "skipped", "failed"],
      kb_category: [
        "faq",
        "travel_guide",
        "package_info",
        "visa_info",
        "hotel_info",
        "general",
      ],
      lead_stage: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "booked",
        "completed",
        "lost",
      ],
      lead_temperature: ["hot", "warm", "cold"],
      msg_sender: ["customer", "ai", "human"],
    },
  },
} as const
