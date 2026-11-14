
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "public": {
          Tables: {
            "ai_usage": {
                  Row: {
                    "count": number,"day": string,"household_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"day": string,"household_id": string
                  }
                  Update: {
                    "count"?: number,"day"?: string,"household_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_usage_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"dose_confirmations": {
                  Row: {
                    "confirmed_at": string,"household_id": string,"id": string,"level": string,"medicine_id": string,"scheduled_date": string,"scheduled_time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "confirmed_at": string,"household_id": string,"id"?: string,"level": string,"medicine_id": string,"scheduled_date": string,"scheduled_time": string
                  }
                  Update: {
                    "confirmed_at"?: string,"household_id"?: string,"id"?: string,"level"?: string,"medicine_id"?: string,"scheduled_date"?: string,"scheduled_time"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dose_confirmations_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dose_confirmations_medicine_id_fkey"
      columns: ["medicine_id"]
isOneToOne: false
      referencedRelation: "medicines"
      referencedColumns: ["id"]
    }
                  ]
                },"households": {
                  Row: {
                    "created_at": string,"data_consent_at": string | null,"id": string,"is_demo": boolean,"output_mode": string | null,"owner_user_id": string,"scan_consent_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"data_consent_at"?: string | null,"id"?: string,"is_demo"?: boolean,"output_mode"?: string | null,"owner_user_id": string,"scan_consent_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"data_consent_at"?: string | null,"id"?: string,"is_demo"?: boolean,"output_mode"?: string | null,"owner_user_id"?: string,"scan_consent_at"?: string | null
                  }
                  Relationships: [

                  ]
                },"medicines": {
                  Row: {
                    "active": boolean,"created_at": string,"dose_amount": string,"explanation": string | null,"explanation_origin": string,"household_id": string,"id": string,"intake_days": (number)[],"intake_days_started_at": Json,"intake_times": (string)[],"intake_times_started_at": Json,"label_source": string,"name": string,"name_normalized": string,"notes": string | null,"purpose": string,"strength": string,"strength_normalized": string,"usage_rule": string,"warnings": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"dose_amount": string,"explanation"?: string | null,"explanation_origin": string,"household_id": string,"id"?: string,"intake_days"?: (number)[],"intake_days_started_at"?: Json,"intake_times": (string)[],"intake_times_started_at"?: Json,"label_source": string,"name": string,"name_normalized": string,"notes"?: string | null,"purpose": string,"strength": string,"strength_normalized": string,"usage_rule": string,"warnings"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"dose_amount"?: string,"explanation"?: string | null,"explanation_origin"?: string,"household_id"?: string,"id"?: string,"intake_days"?: (number)[],"intake_days_started_at"?: Json,"intake_times"?: (string)[],"intake_times_started_at"?: Json,"label_source"?: string,"name"?: string,"name_normalized"?: string,"notes"?: string | null,"purpose"?: string,"strength"?: string,"strength_normalized"?: string,"usage_rule"?: string,"warnings"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "medicines_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"endpoint": string,"household_id": string,"id": string,"p256dh": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"endpoint": string,"household_id": string,"id"?: string,"p256dh": string
                  }
                  Update: {
                    "auth"?: string,"endpoint"?: string,"household_id"?: string,"id"?: string,"p256dh"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"reminder_dispatches": {
                  Row: {
                    "kind": string,"medicine_id": string,"scheduled_date": string,"scheduled_time": string,"sent_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "kind": string,"medicine_id": string,"scheduled_date": string,"scheduled_time": string,"sent_at"?: string
                  }
                  Update: {
                    "kind"?: string,"medicine_id"?: string,"scheduled_date"?: string,"scheduled_time"?: string,"sent_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reminder_dispatches_medicine_id_fkey"
      columns: ["medicine_id"]
isOneToOne: false
      referencedRelation: "medicines"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            register_push_subscription: {
              Args: { p_household_id: string; p_endpoint: string; p_p256dh: string; p_auth: string };
              Returns: boolean;
            };
            claim_push_reminder: {
              Args: { p_household_id: string; p_subscription_id: string; p_medicine_id: string; p_scheduled_date: string; p_scheduled_time: string };
              Returns: boolean;
            };
            confirm_dose: {
              Args: { p_household_id: string; p_medicine_id: string; p_scheduled_date: string; p_scheduled_time: string; p_confirmed_at: string; p_level: string; p_opens_before_minutes: number; p_closes_after_minutes: number };
              Returns: Json;
            };
            confirm_scanned_dose: {
              Args: { p_household_id: string; p_medicine_id: string; p_scheduled_date: string; p_scheduled_time: string; p_confirmed_at: string; p_level: string; p_opens_before_minutes: number; p_closes_after_minutes: number; p_expected_name: string; p_expected_strength: string };
              Returns: Json;
            };
            "consume_ai_usage":
{ Args: { "p_day": string,"p_household_id": string,"p_limit": number }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {

          }
        }
} as const
