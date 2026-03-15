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
      attendance: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          daily_rate: number | null
          id: string
          is_present: boolean | null
          member_id: string
          notes: string | null
          shooting_id: string
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          daily_rate?: number | null
          id?: string
          is_present?: boolean | null
          member_id: string
          notes?: string | null
          shooting_id: string
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          daily_rate?: number | null
          id?: string
          is_present?: boolean | null
          member_id?: string
          notes?: string | null
          shooting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_shooting_id_fkey"
            columns: ["shooting_id"]
            isOneToOne: false
            referencedRelation: "shootings"
            referencedColumns: ["id"]
          },
        ]
      }
      bonuses: {
        Row: {
          amount: number
          bonus_date: string
          created_at: string
          given_by: string | null
          id: string
          member_id: string
          notes: string | null
          type: Database["public"]["Enums"]["bonus_type"]
        }
        Insert: {
          amount: number
          bonus_date?: string
          created_at?: string
          given_by?: string | null
          id?: string
          member_id: string
          notes?: string | null
          type: Database["public"]["Enums"]["bonus_type"]
        }
        Update: {
          amount?: number
          bonus_date?: string
          created_at?: string
          given_by?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          type?: Database["public"]["Enums"]["bonus_type"]
        }
        Relationships: [
          {
            foreignKeyName: "bonuses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string
          details: string | null
          id: string
          service_id: string | null
          service_title: string
          status: string
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_name: string
          customer_phone: string
          details?: string | null
          id?: string
          service_id?: string | null
          service_title: string
          status?: string
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_name?: string
          customer_phone?: string
          details?: string | null
          id?: string
          service_id?: string | null
          service_title?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_at: string
          id: string
          name: string
          platform: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          platform?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          platform?: string | null
          url?: string | null
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Relationships: []
      }
      favorite_works: {
        Row: {
          created_at: string
          description: string | null
          id: string
          member_id: string
          sort_order: number | null
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          member_id: string
          sort_order?: number | null
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          member_id?: string
          sort_order?: number | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorite_works_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean | null
          sort_order: number | null
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempt_count: number
          id: string
          identifier: string
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          id?: string
          identifier: string
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          id?: string
          identifier?: string
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          post_number: number | null
          published_at: string | null
          publisher_id: string | null
          slug: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          post_number?: number | null
          published_at?: string | null
          publisher_id?: string | null
          slug?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          post_number?: number | null
          published_at?: string | null
          publisher_id?: string | null
          slug?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "news_publishers"
            referencedColumns: ["id"]
          },
        ]
      }
      news_publishers: {
        Row: {
          created_at: string
          id: string
          name: string
          photo_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
        }
        Relationships: []
      }
      news_ticker: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          sort_order: number | null
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number | null
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number | null
          text?: string
        }
        Relationships: []
      }
      notice_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          notice_id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          notice_id: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          notice_id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_comments_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "notice_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          member_id: string
          notes: string | null
          paid_by: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          member_id: string
          notes?: string | null
          paid_by?: string | null
          payment_date?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          paid_by?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      popular_videos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          video_url?: string
        }
        Relationships: []
      }
      profile_comments: {
        Row: {
          commenter_email: string | null
          commenter_name: string
          content: string
          created_at: string
          id: string
          is_approved: boolean
          profile_id: string
        }
        Insert: {
          commenter_email?: string | null
          commenter_name: string
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean
          profile_id: string
        }
        Update: {
          commenter_email?: string | null
          commenter_name?: string
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_ratings: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          rater_email: string | null
          rater_name: string
          rating: number
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          rater_email?: string | null
          rater_name: string
          rating: number
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          rater_email?: string | null
          rater_name?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "profile_ratings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          achievements: string | null
          achievements_en: string | null
          address: string | null
          address_en: string | null
          bank_account_no: string | null
          bank_name: string | null
          bio: string | null
          bio_en: string | null
          bkash_no: string | null
          cover_url: string | null
          created_at: string
          daily_rate: number | null
          date_of_birth: string | null
          designation: string | null
          designation_en: string | null
          education: string | null
          education_en: string | null
          email: string | null
          favorite_actor: string | null
          favorite_actor_en: string | null
          favorite_actress: string | null
          favorite_actress_en: string | null
          favorite_color: string | null
          favorite_color_en: string | null
          favorite_dress: string | null
          favorite_dress_en: string | null
          favorite_food: string | null
          favorite_food_en: string | null
          full_name: string
          full_name_en: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          joining_date: string | null
          last_seen_at: string | null
          member_id: number
          monthly_salary: number | null
          nagad_no: string | null
          phone: string | null
          photo_url: string | null
          previous_balance: number | null
          public_display_order: number | null
          salary_type: Database["public"]["Enums"]["salary_type"] | null
          short_bio: string | null
          short_bio_en: string | null
          show_on_public: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievements?: string | null
          achievements_en?: string | null
          address?: string | null
          address_en?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          bio?: string | null
          bio_en?: string | null
          bkash_no?: string | null
          cover_url?: string | null
          created_at?: string
          daily_rate?: number | null
          date_of_birth?: string | null
          designation?: string | null
          designation_en?: string | null
          education?: string | null
          education_en?: string | null
          email?: string | null
          favorite_actor?: string | null
          favorite_actor_en?: string | null
          favorite_actress?: string | null
          favorite_actress_en?: string | null
          favorite_color?: string | null
          favorite_color_en?: string | null
          favorite_dress?: string | null
          favorite_dress_en?: string | null
          favorite_food?: string | null
          favorite_food_en?: string | null
          full_name: string
          full_name_en?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          joining_date?: string | null
          last_seen_at?: string | null
          member_id?: number
          monthly_salary?: number | null
          nagad_no?: string | null
          phone?: string | null
          photo_url?: string | null
          previous_balance?: number | null
          public_display_order?: number | null
          salary_type?: Database["public"]["Enums"]["salary_type"] | null
          short_bio?: string | null
          short_bio_en?: string | null
          show_on_public?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievements?: string | null
          achievements_en?: string | null
          address?: string | null
          address_en?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          bio?: string | null
          bio_en?: string | null
          bkash_no?: string | null
          cover_url?: string | null
          created_at?: string
          daily_rate?: number | null
          date_of_birth?: string | null
          designation?: string | null
          designation_en?: string | null
          education?: string | null
          education_en?: string | null
          email?: string | null
          favorite_actor?: string | null
          favorite_actor_en?: string | null
          favorite_actress?: string | null
          favorite_actress_en?: string | null
          favorite_color?: string | null
          favorite_color_en?: string | null
          favorite_dress?: string | null
          favorite_dress_en?: string | null
          favorite_food?: string | null
          favorite_food_en?: string | null
          full_name?: string
          full_name_en?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          joining_date?: string | null
          last_seen_at?: string | null
          member_id?: number
          monthly_salary?: number | null
          nagad_no?: string | null
          phone?: string | null
          photo_url?: string | null
          previous_balance?: number | null
          public_display_order?: number | null
          salary_type?: Database["public"]["Enums"]["salary_type"] | null
          short_bio?: string | null
          short_bio_en?: string | null
          show_on_public?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      salary_credits: {
        Row: {
          amount: number
          created_at: string
          credit_month: string
          id: string
          member_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_month: string
          id?: string
          member_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_month?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_credits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      script_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          script_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          script_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          script_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_comments_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_permissions: {
        Row: {
          created_at: string
          id: string
          member_id: string
          script_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          script_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          script_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_permissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_permissions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_offers: {
        Row: {
          created_at: string
          description: string | null
          discount_percentage: number
          id: string
          is_active: boolean
          offer_end_date: string
          service_ids: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percentage?: number
          id?: string
          is_active?: boolean
          offer_end_date: string
          service_ids?: Json | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percentage?: number
          id?: string
          is_active?: boolean
          offer_end_date?: string
          service_ids?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          discount_percentage: number | null
          edited_photos_per_hour: number | null
          features: Json | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          price: number | null
          price_label: string | null
          price_per_hour: number | null
          price_per_minute: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"] | null
          sort_order: number | null
          title: string
          unlimited_photos_per_hour: boolean | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          edited_photos_per_hour?: number | null
          features?: Json | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          price?: number | null
          price_label?: string | null
          price_per_hour?: number | null
          price_per_minute?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"] | null
          sort_order?: number | null
          title: string
          unlimited_photos_per_hour?: boolean | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          edited_photos_per_hour?: number | null
          features?: Json | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          price?: number | null
          price_label?: string | null
          price_per_hour?: number | null
          price_per_minute?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"] | null
          sort_order?: number | null
          title?: string
          unlimited_photos_per_hour?: boolean | null
        }
        Relationships: []
      }
      shooting_expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          shooting_id: string
        }
        Insert: {
          amount?: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          shooting_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          shooting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shooting_expenses_shooting_id_fkey"
            columns: ["shooting_id"]
            isOneToOne: false
            referencedRelation: "shootings"
            referencedColumns: ["id"]
          },
        ]
      }
      shooting_participants: {
        Row: {
          character_name: string | null
          costume: string | null
          created_at: string
          id: string
          member_id: string
          props: string | null
          shooting_id: string
        }
        Insert: {
          character_name?: string | null
          costume?: string | null
          created_at?: string
          id?: string
          member_id: string
          props?: string | null
          shooting_id: string
        }
        Update: {
          character_name?: string | null
          costume?: string | null
          created_at?: string
          id?: string
          member_id?: string
          props?: string | null
          shooting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shooting_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shooting_participants_shooting_id_fkey"
            columns: ["shooting_id"]
            isOneToOne: false
            referencedRelation: "shootings"
            referencedColumns: ["id"]
          },
        ]
      }
      shootings: {
        Row: {
          call_time: string | null
          channel_id: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          name: string
          script_content: string | null
          script_id: string | null
          script_url: string | null
          shoot_date: string
          show_on_public: boolean | null
          status: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          call_time?: string | null
          channel_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name: string
          script_content?: string | null
          script_id?: string | null
          script_url?: string | null
          shoot_date: string
          show_on_public?: boolean | null
          status?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          call_time?: string | null
          channel_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          script_content?: string | null
          script_id?: string | null
          script_url?: string | null
          shoot_date?: string
          show_on_public?: boolean | null
          status?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shootings_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shootings_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          facebook_pages: Json | null
          facebook_url: string | null
          favicon_url: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          site_description: string | null
          site_name: string | null
          ticker_enabled: boolean | null
          ticker_speed: number | null
          tiktok_url: string | null
          updated_at: string
          whatsapp_no: string | null
          youtube_url: string | null
        }
        Insert: {
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          facebook_pages?: Json | null
          facebook_url?: string | null
          favicon_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          site_description?: string | null
          site_name?: string | null
          ticker_enabled?: boolean | null
          ticker_speed?: number | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp_no?: string | null
          youtube_url?: string | null
        }
        Update: {
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          facebook_pages?: Json | null
          facebook_url?: string | null
          favicon_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          site_description?: string | null
          site_name?: string | null
          ticker_enabled?: boolean | null
          ticker_speed?: number | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp_no?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vapid_keys: {
        Row: {
          created_at: string | null
          id: string
          private_key: string
          public_key: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          private_key: string
          public_key: string
        }
        Update: {
          created_at?: string | null
          id?: string
          private_key?: string
          public_key?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_creator: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      notify_all_members: {
        Args: {
          _link?: string
          _message?: string
          _title: string
          _type: string
        }
        Returns: undefined
      }
      notify_member: {
        Args: {
          _link?: string
          _member_profile_id: string
          _message?: string
          _title: string
          _type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "member"
      bonus_type: "bonus" | "transport"
      conversation_type: "personal" | "group"
      expense_category: "food" | "transport" | "props" | "other"
      payment_method: "bank" | "bkash" | "nagad" | "cash"
      pricing_type: "hourly" | "per_minute" | "event" | "fixed"
      salary_type: "daily" | "monthly"
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
      app_role: ["admin", "member"],
      bonus_type: ["bonus", "transport"],
      conversation_type: ["personal", "group"],
      expense_category: ["food", "transport", "props", "other"],
      payment_method: ["bank", "bkash", "nagad", "cash"],
      pricing_type: ["hourly", "per_minute", "event", "fixed"],
      salary_type: ["daily", "monthly"],
    },
  },
} as const
