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
      customers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          order_id: string
          product_name: string
          quantity: number
          unit: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          product_name: string
          quantity: number
          unit?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          product_name?: string
          quantity?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          due_at: string
          id: string
          location: Database["public"]["Enums"]["location_type"]
          notes: string | null
          priority: Database["public"]["Enums"]["order_priority"]
          service_id: string
          status: Database["public"]["Enums"]["order_status"]
          type: Database["public"]["Enums"]["order_type"]
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          due_at: string
          id?: string
          location?: Database["public"]["Enums"]["location_type"]
          notes?: string | null
          priority?: Database["public"]["Enums"]["order_priority"]
          service_id: string
          status?: Database["public"]["Enums"]["order_status"]
          type?: Database["public"]["Enums"]["order_type"]
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          due_at?: string
          id?: string
          location?: Database["public"]["Enums"]["location_type"]
          notes?: string | null
          priority?: Database["public"]["Enums"]["order_priority"]
          service_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          type?: Database["public"]["Enums"]["order_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          id: string
          name: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          service_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          service_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          service_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          color: string
          created_at: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["service_type"]
        }
        Insert: {
          active?: boolean | null
          color: string
          created_at?: string | null
          id?: string
          name: string
          type: Database["public"]["Enums"]["service_type"]
        }
        Update: {
          active?: boolean | null
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["service_type"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      get_user_service: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "service" | "readonly"
      location_type: "retrait" | "livraison"
      order_priority: "basse" | "normale" | "haute"
      order_status: "a_faire" | "en_cours" | "pret" | "livre" | "annule"
      order_type: "produit_simple" | "traiteur"
      service_type: "cuisine" | "charcuterie" | "commande" | "boutique"
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
      app_role: ["admin", "service", "readonly"],
      location_type: ["retrait", "livraison"],
      order_priority: ["basse", "normale", "haute"],
      order_status: ["a_faire", "en_cours", "pret", "livre", "annule"],
      order_type: ["produit_simple", "traiteur"],
      service_type: ["cuisine", "charcuterie", "commande", "boutique"],
    },
  },
} as const
