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
      admin_phone_logins: {
        Row: {
          created_at: string
          phone: string
          user_id: string
        }
        Insert: {
          created_at?: string
          phone: string
          user_id: string
        }
        Update: {
          created_at?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      app_versions: {
        Row: {
          created_at: string
          file_path: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_active: boolean
          platform: string
          release_notes: string | null
          released_at: string | null
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          platform?: string
          release_notes?: string | null
          released_at?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          platform?: string
          release_notes?: string | null
          released_at?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      customer_password_otps: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          otp_hash: string
          phone: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at: string
          id?: string
          otp_hash: string
          phone: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          phone?: string
          used_at?: string | null
        }
        Relationships: []
      }
      delivery_settings: {
        Row: {
          base_charge: number
          base_weight_grams: number
          extra_charge_per_kg: number
          free_delivery_enabled: boolean
          free_delivery_threshold: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_charge?: number
          base_weight_grams?: number
          extra_charge_per_kg?: number
          free_delivery_enabled?: boolean
          free_delivery_threshold?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_charge?: number
          base_weight_grams?: number
          extra_charge_per_kg?: number
          free_delivery_enabled?: boolean
          free_delivery_threshold?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      free_delivery_campaign_products: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "free_delivery_campaign_products_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "free_delivery_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "free_delivery_campaign_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      free_delivery_campaign_tiers: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          label: string
          required_products: number
          reward_text: string | null
          sort_order: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          label: string
          required_products: number
          reward_text?: string | null
          sort_order?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          label?: string
          required_products?: number
          reward_text?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "free_delivery_campaign_tiers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "free_delivery_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      free_delivery_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          max_orders_per_phone: number
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_orders_per_phone?: number
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_orders_per_phone?: number
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      free_delivery_orders: {
        Row: {
          campaign_id: string
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          id: string
          product_ids: Json
          shared_order_number: number | null
          tier_id: string | null
          total_amount: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          customer_address: string
          customer_name: string
          customer_phone: string
          id?: string
          product_ids?: Json
          shared_order_number?: number | null
          tier_id?: string | null
          total_amount?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          customer_address?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          product_ids?: Json
          shared_order_number?: number | null
          tier_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "free_delivery_orders_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "free_delivery_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "free_delivery_orders_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "free_delivery_campaign_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      home_section_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          section_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          section_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          section_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "home_section_products_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "home_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      home_sections: {
        Row: {
          accent_color: string
          badge_color: string
          badge_text: string | null
          bg_color: string | null
          bg_color_2: string | null
          category_id: string | null
          category_value: string | null
          created_at: string
          cta_label: string | null
          cta_link: string | null
          discount_type: string
          discount_value: number
          eyebrow: string | null
          id: string
          is_active: boolean
          max_items: number
          order_btn_color: string | null
          section_type: string
          sort_order: number
          title: string
          title_color: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string
          badge_color?: string
          badge_text?: string | null
          bg_color?: string | null
          bg_color_2?: string | null
          category_id?: string | null
          category_value?: string | null
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          discount_type?: string
          discount_value?: number
          eyebrow?: string | null
          id?: string
          is_active?: boolean
          max_items?: number
          order_btn_color?: string | null
          section_type?: string
          sort_order?: number
          title: string
          title_color?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string
          badge_color?: string
          badge_text?: string | null
          bg_color?: string | null
          bg_color_2?: string | null
          category_id?: string | null
          category_value?: string | null
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          discount_type?: string
          discount_value?: number
          eyebrow?: string | null
          id?: string
          is_active?: boolean
          max_items?: number
          order_btn_color?: string | null
          section_type?: string
          sort_order?: number
          title?: string
          title_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      landing_page_sections: {
        Row: {
          content: string | null
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          section_key: string
          sort_order: number | null
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          section_key: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          section_key?: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string
          delivery_charge: number
          delivery_date: string | null
          id: string
          notes: string | null
          order_number: number
          payment_method: string | null
          payment_sender_no: string | null
          payment_status: Database["public"]["Enums"]["order_payment_status"]
          payment_trx_id: string | null
          product_id: string | null
          product_name: string
          quantity: number
          return_amount: number | null
          returned_at: string | null
          shop_customer_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          unit_price: number
          updated_at: string
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_name: string
          customer_phone: string
          delivery_charge?: number
          delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: string | null
          payment_sender_no?: string | null
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          payment_trx_id?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          return_amount?: number | null
          returned_at?: string | null
          shop_customer_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          unit_price?: number
          updated_at?: string
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_charge?: number
          delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: string | null
          payment_sender_no?: string | null
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          payment_trx_id?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          return_amount?: number | null
          returned_at?: string | null
          shop_customer_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          unit_price?: number
          updated_at?: string
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shop_customer_id_fkey"
            columns: ["shop_customer_id"]
            isOneToOne: false
            referencedRelation: "shop_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          label: string
          parent_id: string | null
          sort_order: number
          value: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          label: string
          parent_id?: string | null
          sort_order?: number
          value: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          label?: string
          parent_id?: string | null
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_name: string | null
          id: string
          product_id: string
          rating: number
          shop_customer_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          product_id: string
          rating: number
          shop_customer_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          product_id?: string
          rating?: number
          shop_customer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_shop_customer_id_fkey"
            columns: ["shop_customer_id"]
            isOneToOne: false
            referencedRelation: "shop_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_weight_prices: {
        Row: {
          created_at: string
          discount_price: number | null
          id: string
          is_active: boolean | null
          label: string | null
          price: number
          sort_order: number | null
          weight_kg: number
          weight_label: string
        }
        Insert: {
          created_at?: string
          discount_price?: number | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          price?: number
          sort_order?: number | null
          weight_kg?: number
          weight_label: string
        }
        Update: {
          created_at?: string
          discount_price?: number | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          price?: number
          sort_order?: number | null
          weight_kg?: number
          weight_label?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          contact_info: string | null
          created_at: string
          description: string | null
          description_html: string | null
          discount_price: number | null
          id: string
          image_url: string | null
          images: Json | null
          is_active: boolean
          is_featured: boolean
          name: string
          price: number
          short_description: string | null
          short_description_html: string | null
          slug: string | null
          sort_order: number | null
          stock_status: string
          suggested_product_ids: string[]
          unit_type: string
          updated_at: string
          variants: Json
          weight_grams: number
        }
        Insert: {
          category?: string | null
          contact_info?: string | null
          created_at?: string
          description?: string | null
          description_html?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          price?: number
          short_description?: string | null
          short_description_html?: string | null
          slug?: string | null
          sort_order?: number | null
          stock_status?: string
          suggested_product_ids?: string[]
          unit_type?: string
          updated_at?: string
          variants?: Json
          weight_grams?: number
        }
        Update: {
          category?: string | null
          contact_info?: string | null
          created_at?: string
          description?: string | null
          description_html?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price?: number
          short_description?: string | null
          short_description_html?: string | null
          slug?: string | null
          sort_order?: number | null
          stock_status?: string
          suggested_product_ids?: string[]
          unit_type?: string
          updated_at?: string
          variants?: Json
          weight_grams?: number
        }
        Relationships: []
      }
      shop_customers: {
        Row: {
          address: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          password_hash: string
          phone: string
          session_expires_at: string | null
          session_token: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password_hash: string
          phone: string
          session_expires_at?: string | null
          session_token?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password_hash?: string
          phone?: string
          session_expires_at?: string | null
          session_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shop_offers: {
        Row: {
          badge_text: string | null
          combo_free_delivery: boolean
          combo_price: number | null
          combo_products: Json
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: Database["public"]["Enums"]["shop_offer_type"]
          discount_value: number
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          popup_priority: number
          product_id: string | null
          show_popup: boolean
          slug: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          badge_text?: string | null
          combo_free_delivery?: boolean
          combo_price?: number | null
          combo_products?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["shop_offer_type"]
          discount_value?: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          popup_priority?: number
          product_id?: string | null
          show_popup?: boolean
          slug?: string | null
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          badge_text?: string | null
          combo_free_delivery?: boolean
          combo_price?: number | null
          combo_products?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["shop_offer_type"]
          discount_value?: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          popup_priority?: number
          product_id?: string | null
          show_popup?: boolean
          slug?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          facebook_url: string | null
          footer_about: string | null
          footer_copyright: string | null
          free_delivery: boolean | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          released_at: string | null
          shop_name: string | null
          shop_tagline: string | null
          site_name: string | null
          top_strip_enabled: boolean | null
          top_strip_speed: number | null
          top_strip_text: string | null
          updated_at: string
          whatsapp_no: string | null
          youtube_url: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          facebook_url?: string | null
          footer_about?: string | null
          footer_copyright?: string | null
          free_delivery?: boolean | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          released_at?: string | null
          shop_name?: string | null
          shop_tagline?: string | null
          site_name?: string | null
          top_strip_enabled?: boolean | null
          top_strip_speed?: number | null
          top_strip_text?: string | null
          updated_at?: string
          whatsapp_no?: string | null
          youtube_url?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          facebook_url?: string | null
          footer_about?: string | null
          footer_copyright?: string | null
          free_delivery?: boolean | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          released_at?: string | null
          shop_name?: string | null
          shop_tagline?: string | null
          site_name?: string | null
          top_strip_enabled?: boolean | null
          top_strip_speed?: number | null
          top_strip_text?: string | null
          updated_at?: string
          whatsapp_no?: string | null
          youtube_url?: string | null
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
      bn_to_en: { Args: { input: string }; Returns: string }
      free_delivery_phone_order_count: {
        Args: { _campaign_id: string; _phone: string }
        Returns: number
      }
      generate_unique_product_slug: {
        Args: { exclude_id?: string; input: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_order_number: { Args: never; Returns: number }
      slugify: { Args: { input: string }; Returns: string }
      submit_product_review: {
        Args: {
          _comment: string
          _product_id: string
          _rating: number
          _token: string
        }
        Returns: {
          comment: string | null
          created_at: string
          customer_name: string | null
          id: string
          product_id: string
          rating: number
          shop_customer_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "product_reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      advance_status: "pending" | "approved" | "rejected" | "cancelled"
      app_platform: "android" | "ios"
      app_role: "product_admin" | "super_admin"
      bonus_type: "bonus" | "transport"
      call_status: "ringing" | "active" | "ended" | "missed" | "declined"
      call_type: "audio" | "video"
      client_expense_category: "food" | "costume" | "transport"
      client_payment_type: "artist" | "expense"
      conversation_type: "personal" | "group"
      expense_category: "food" | "transport" | "props" | "other"
      order_payment_status: "unpaid" | "partial" | "paid"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "abandoned"
        | "returned"
      payment_method: "bank" | "bkash" | "nagad" | "cash"
      pricing_type: "hourly" | "per_minute" | "event" | "fixed"
      salary_change_type: "amount_increase" | "amount_decrease" | "type_change"
      shop_offer_type: "percentage" | "fixed" | "free_delivery" | "combo"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "done" | "cancelled"
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
      advance_status: ["pending", "approved", "rejected", "cancelled"],
      app_platform: ["android", "ios"],
      app_role: ["product_admin", "super_admin"],
      bonus_type: ["bonus", "transport"],
      call_status: ["ringing", "active", "ended", "missed", "declined"],
      call_type: ["audio", "video"],
      client_expense_category: ["food", "costume", "transport"],
      client_payment_type: ["artist", "expense"],
      conversation_type: ["personal", "group"],
      expense_category: ["food", "transport", "props", "other"],
      order_payment_status: ["unpaid", "partial", "paid"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "abandoned",
        "returned",
      ],
      payment_method: ["bank", "bkash", "nagad", "cash"],
      pricing_type: ["hourly", "per_minute", "event", "fixed"],
      salary_change_type: ["amount_increase", "amount_decrease", "type_change"],
      shop_offer_type: ["percentage", "fixed", "free_delivery", "combo"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "done", "cancelled"],
    },
  },
} as const
