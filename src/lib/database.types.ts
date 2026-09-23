/**
 * Generated Supabase types, with three columns declared ahead of deployment:
 * `restaurants.is_accepting_orders`, `orders.cash_paid_with_xaf` and
 * `orders.eta_minutes` (see supabase_notifications.sql). All three are optional
 * at runtime — the client keeps working against a database where the migration
 * hasn't been applied yet. Regenerating this file after the migration is a no-op
 * for them. The `live_activity_tokens` table is written through untyped calls
 * for the same reason.
 */
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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          restaurant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          restaurant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      dishes: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          price_xaf: number
          restaurant_id: string | null
          short_description: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          price_xaf: number
          restaurant_id?: string | null
          short_description?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          price_xaf?: number
          restaurant_id?: string | null
          short_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dishes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dishes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          dish_id: string | null
          id: string
          note?: string | null
          name: string
          order_id: string | null
          price_xaf: number
          qty: number
        }
        Insert: {
          created_at?: string | null
          dish_id?: string | null
          id?: string
          note?: string | null
          name: string
          order_id?: string | null
          price_xaf: number
          qty?: number
        }
        Update: {
          created_at?: string | null
          dish_id?: string | null
          id?: string
          note?: string | null
          name?: string
          order_id?: string | null
          price_xaf?: number
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
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
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string
          delivery_fee_xaf: number
          delivery_landmark: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_note: string | null
          delivery_zone: string | null
          id: string
          payment_method: string
          push_token: string | null
          restaurant_id: string | null
          restaurant_name: string | null
          status: string
          cash_paid_with_xaf: number | null
          eta_minutes: number | null
          cancellation_reason: string | null
          accepted_at: string | null
          subtotal_xaf: number
          total_xaf: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address: string
          delivery_fee_xaf?: number
          delivery_landmark?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_note?: string | null
          delivery_zone?: string | null
          id?: string
          payment_method?: string
          push_token?: string | null
          restaurant_id?: string | null
          restaurant_name?: string | null
          status?: string
          cash_paid_with_xaf?: number | null
          eta_minutes?: number | null
          cancellation_reason?: string | null
          accepted_at?: string | null
          subtotal_xaf?: number
          total_xaf?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string
          delivery_fee_xaf?: number
          delivery_landmark?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_note?: string | null
          delivery_zone?: string | null
          id?: string
          payment_method?: string
          push_token?: string | null
          restaurant_id?: string | null
          restaurant_name?: string | null
          status?: string
          cash_paid_with_xaf?: number | null
          eta_minutes?: number | null
          cancellation_reason?: string | null
          accepted_at?: string | null
          subtotal_xaf?: number
          total_xaf?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          phone: string | null
          restaurant_id: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name?: string | null
          phone?: string | null
          restaurant_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          restaurant_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          genre: string | null
          id: string
          image_url: string | null
          is_accepting_orders: boolean | null
          is_active: boolean | null
          lat: number | null
          lng: number | null
          name: string
          rating: number | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          genre?: string | null
          id?: string
          image_url?: string | null
          is_accepting_orders?: boolean | null
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          name: string
          rating?: number | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          genre?: string | null
          id?: string
          image_url?: string | null
          is_accepting_orders?: boolean | null
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string
          rating?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      my_restaurant_id: { Args: never; Returns: string }
      my_role: { Args: never; Returns: string }
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
