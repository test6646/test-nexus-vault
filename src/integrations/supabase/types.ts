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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accounting_entries: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["accounting_category"]
          created_at: string
          created_by: string | null
          description: string | null
          document_url: string | null
          entry_date: string
          entry_type: string
          firm_id: string
          id: string
          payment_method: string | null
          reflect_to_company: boolean
          subcategory: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: Database["public"]["Enums"]["accounting_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          entry_date?: string
          entry_type?: string
          firm_id: string
          id?: string
          payment_method?: string | null
          reflect_to_company?: boolean
          subcategory?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["accounting_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          entry_date?: string
          entry_type?: string
          firm_id?: string
          id?: string
          payment_method?: string | null
          reflect_to_company?: boolean
          subcategory?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          firm_id: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          firm_id?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          firm_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_clients_firm_id"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      event_assignment_rates: {
        Row: {
          created_at: string
          day_number: number
          event_id: string
          firm_id: string
          freelancer_id: string | null
          id: string
          notes: string | null
          quantity: number
          rate: number
          role: string
          staff_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_number?: number
          event_id: string
          firm_id: string
          freelancer_id?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          rate: number
          role: string
          staff_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_number?: number
          event_id?: string
          firm_id?: string
          freelancer_id?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          rate?: number
          role?: string
          staff_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_assignment_rates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_assignment_rates_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_assignment_rates_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_assignment_rates_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_closing_balances: {
        Row: {
          closing_amount: number
          closing_reason: string | null
          collected_amount: number
          created_at: string
          created_by: string | null
          event_id: string
          firm_id: string
          id: string
          total_bill: number
          updated_at: string
        }
        Insert: {
          closing_amount: number
          closing_reason?: string | null
          collected_amount: number
          created_at?: string
          created_by?: string | null
          event_id: string
          firm_id: string
          id?: string
          total_bill: number
          updated_at?: string
        }
        Update: {
          closing_amount?: number
          closing_reason?: string | null
          collected_amount?: number
          created_at?: string
          created_by?: string | null
          event_id?: string
          firm_id?: string
          id?: string
          total_bill?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_event_closing_balances_event_id"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff_assignments: {
        Row: {
          created_at: string | null
          day_date: string | null
          day_number: number
          event_id: string
          firm_id: string | null
          freelancer_id: string | null
          id: string
          role: string
          staff_id: string | null
          staff_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_date?: string | null
          day_number?: number
          event_id: string
          firm_id?: string | null
          freelancer_id?: string | null
          id?: string
          role: string
          staff_id?: string | null
          staff_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_date?: string | null
          day_number?: number
          event_id?: string
          firm_id?: string | null
          freelancer_id?: string | null
          id?: string
          role?: string
          staff_id?: string | null
          staff_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_assignments_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_staff_assignments_firm_id"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_staff_assignments_staff_id"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          advance_amount: number | null
          advance_payment_method:
            | Database["public"]["Enums"]["payment_method"]
            | null
          balance_amount: number | null
          calendar_event_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_end_date: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          firm_id: string | null
          id: string
          photo_editing_status: boolean | null
          quotation_source_id: string | null
          same_day_editor: boolean | null
          storage_disk: string | null
          storage_size: number | null
          title: string
          total_amount: number | null
          total_days: number | null
          updated_at: string
          venue: string | null
          video_editing_status: boolean | null
        }
        Insert: {
          advance_amount?: number | null
          advance_payment_method?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          balance_amount?: number | null
          calendar_event_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_end_date?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          firm_id?: string | null
          id?: string
          photo_editing_status?: boolean | null
          quotation_source_id?: string | null
          same_day_editor?: boolean | null
          storage_disk?: string | null
          storage_size?: number | null
          title: string
          total_amount?: number | null
          total_days?: number | null
          updated_at?: string
          venue?: string | null
          video_editing_status?: boolean | null
        }
        Update: {
          advance_amount?: number | null
          advance_payment_method?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          balance_amount?: number | null
          calendar_event_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_end_date?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          firm_id?: string | null
          id?: string
          photo_editing_status?: boolean | null
          quotation_source_id?: string | null
          same_day_editor?: boolean | null
          storage_disk?: string | null
          storage_size?: number | null
          title?: string
          total_amount?: number | null
          total_days?: number | null
          updated_at?: string
          venue?: string | null
          video_editing_status?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_firm_id"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          description: string
          event_id: string | null
          expense_date: string
          firm_id: string | null
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description: string
          event_id?: string | null
          expense_date?: string
          firm_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description?: string
          event_id?: string | null
          expense_date?: string
          firm_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_expenses_event_id"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_expenses_firm_id"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_members: {
        Row: {
          firm_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          firm_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          firm_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_members_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_firm_members_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      firm_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          firm_id: string
          id: string
          notes: string | null
          paid_at: string | null
          period_months: number
          plan_type: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          receipt_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          firm_id: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_months: number
          plan_type: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          receipt_url?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          firm_id?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_months?: number
          plan_type?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_payments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_subscriptions: {
        Row: {
          created_at: string
          firm_id: string
          grace_until: string
          last_payment_at: string | null
          plan_type: string | null
          status: string
          subscribed_once: boolean
          subscription_end_at: string | null
          subscription_start_at: string | null
          trial_end_at: string
          trial_start_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          firm_id: string
          grace_until: string
          last_payment_at?: string | null
          plan_type?: string | null
          status?: string
          subscribed_once?: boolean
          subscription_end_at?: string | null
          subscription_start_at?: string | null
          trial_end_at: string
          trial_start_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          firm_id?: string
          grace_until?: string
          last_payment_at?: string | null
          plan_type?: string | null
          status?: string
          subscribed_once?: boolean
          subscription_end_at?: string | null
          subscription_start_at?: string | null
          trial_end_at?: string
          trial_start_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_subscriptions_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: true
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_ifsc_code: string | null
          bank_name: string | null
          calendar_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          default_addon_rates: Json | null
          default_postproduction_rates: Json | null
          default_role_rates: Json | null
          description: string | null
          footer_content: string | null
          header_left_content: string | null
          id: string
          logo_url: string | null
          name: string
          spreadsheet_id: string | null
          tagline: string | null
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc_code?: string | null
          bank_name?: string | null
          calendar_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          default_addon_rates?: Json | null
          default_postproduction_rates?: Json | null
          default_role_rates?: Json | null
          description?: string | null
          footer_content?: string | null
          header_left_content?: string | null
          id?: string
          logo_url?: string | null
          name: string
          spreadsheet_id?: string | null
          tagline?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc_code?: string | null
          bank_name?: string | null
          calendar_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          default_addon_rates?: Json | null
          default_postproduction_rates?: Json | null
          default_role_rates?: Json | null
          description?: string | null
          footer_content?: string | null
          header_left_content?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          spreadsheet_id?: string | null
          tagline?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      freelancer_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          event_id: string | null
          firm_id: string
          freelancer_id: string
          id: string
          payment_date: string
          payment_method: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          firm_id: string
          freelancer_id: string
          id?: string
          payment_date: string
          payment_method?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          firm_id?: string
          freelancer_id?: string
          id?: string
          payment_date?: string
          payment_method?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_payments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_payments_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancers: {
        Row: {
          created_at: string
          email: string | null
          firm_id: string
          full_name: string
          id: string
          phone: string | null
          rate: number | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          firm_id: string
          full_name: string
          id?: string
          phone?: string | null
          rate?: number | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          firm_id?: string
          full_name?: string
          id?: string
          phone?: string | null
          rate?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancers_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          purpose: string
          updated_at: string
          used: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          purpose?: string
          updated_at?: string
          used?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          purpose?: string
          updated_at?: string
          used?: boolean
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          event_id: string | null
          firm_id: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          firm_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          firm_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_payments_event_id"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_payments_firm_id"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          current_firm_id: string | null
          firm_id: string | null
          full_name: string
          id: string
          mobile_number: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_firm_id?: string | null
          firm_id?: string | null
          full_name: string
          id?: string
          mobile_number: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_firm_id?: string | null
          firm_id?: string | null
          full_name?: string
          id?: string
          mobile_number?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          amount: number
          client_id: string | null
          converted_to_event: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discount_amount: number | null
          discount_type: string | null
          discount_value: number | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          firm_id: string | null
          id: string
          quotation_details: Json | null
          title: string
          updated_at: string
          valid_until: string | null
          venue: string | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          converted_to_event?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          firm_id?: string | null
          id?: string
          quotation_details?: Json | null
          title: string
          updated_at?: string
          valid_until?: string | null
          venue?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          converted_to_event?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          event_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          firm_id?: string | null
          id?: string
          quotation_details?: Json | null
          title?: string
          updated_at?: string
          valid_until?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_quotations_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_quotations_firm_id"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_converted_to_event_fkey"
            columns: ["converted_to_event"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          event_id: string | null
          firm_id: string
          id: string
          payment_date: string
          payment_method: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          firm_id: string
          id?: string
          payment_date: string
          payment_method: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          firm_id?: string
          id?: string
          payment_date?: string
          payment_method?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          display_name: string
          duration_months: number
          id: string
          is_active: boolean
          name: string
          plan_id: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          display_name: string
          duration_months: number
          id?: string
          is_active?: boolean
          name: string
          plan_id: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          display_name?: string
          duration_months?: number
          id?: string
          is_active?: boolean
          name?: string
          plan_id?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          amount: number | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          event_id: string | null
          firm_id: string | null
          freelancer_id: string | null
          id: string
          is_salary_based: boolean | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          report_data: Json | null
          salary_details: Json | null
          status: Database["public"]["Enums"]["task_status"]
          task_type: Database["public"]["Enums"]["task_type"] | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          firm_id?: string | null
          freelancer_id?: string | null
          id?: string
          is_salary_based?: boolean | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          report_data?: Json | null
          salary_details?: Json | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: Database["public"]["Enums"]["task_type"] | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          firm_id?: string | null
          freelancer_id?: string | null
          id?: string
          is_salary_based?: boolean | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          report_data?: Json | null
          salary_details?: Json | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: Database["public"]["Enums"]["task_type"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_sessions: {
        Row: {
          contact_info: string | null
          created_at: string | null
          firm_id: string
          firm_name: string | null
          firm_tagline: string | null
          footer_signature: string | null
          id: string
          notification_templates: Json | null
          qr_expires_at: string | null
          reconnect_enabled: boolean
          session_data: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          contact_info?: string | null
          created_at?: string | null
          firm_id: string
          firm_name?: string | null
          firm_tagline?: string | null
          footer_signature?: string | null
          id: string
          notification_templates?: Json | null
          qr_expires_at?: string | null
          reconnect_enabled?: boolean
          session_data?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          contact_info?: string | null
          created_at?: string | null
          firm_id?: string
          firm_name?: string | null
          firm_tagline?: string | null
          footer_signature?: string | null
          id?: string
          notification_templates?: Json | null
          qr_expires_at?: string | null
          reconnect_enabled?: boolean
          session_data?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_sessions_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_otps: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_invoice_id: {
        Args: Record<PropertyKey, never> | { p_event_id?: string }
        Returns: string
      }
      get_auth_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_firm_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_firm_profile_ids: {
        Args: { target_firm_id: string }
        Returns: {
          profile_id: string
        }[]
      }
      get_firm_public_info: {
        Args: { p_id: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      is_firm_owner: {
        Args: { p_firm_id: string }
        Returns: boolean
      }
      is_firm_owner_of_any: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_firm_writable: {
        Args: { p_firm_id: string }
        Returns: boolean
      }
      is_member_or_owner: {
        Args: { p_firm_id: string }
        Returns: boolean
      }
      purge_expired_trial_firm: {
        Args: { p_firm_id: string }
        Returns: undefined
      }
      purge_expired_trial_firms: {
        Args: Record<PropertyKey, never>
        Returns: {
          message: string
          purged_firms_count: number
        }[]
      }
      verify_firm_id: {
        Args: { p_id: string }
        Returns: boolean
      }
      verify_otp_only: {
        Args: { p_email: string; p_otp_code: string; p_purpose?: string }
        Returns: Json
      }
    }
    Enums: {
      accounting_category:
        | "Equipment Sales"
        | "Security Deposits Received"
        | "Photography Consultation"
        | "Miscellaneous Income"
        | "Office Supplies"
        | "Software Subscriptions"
        | "Equipment Maintenance"
        | "Professional Services"
        | "Business Insurance"
        | "Bank Charges"
        | "Office Rent & Utilities"
        | "Miscellaneous Expenses"
        | "Capital"
        | "Assets"
        | "Liabilities"
      event_status:
        | "Quotation"
        | "Confirmed"
        | "Shooting"
        | "Editing"
        | "Delivered"
        | "Cancelled"
      event_type:
        | "Ring-Ceremony"
        | "Pre-Wedding"
        | "Wedding"
        | "Maternity Photography"
        | "Others"
      expense_category:
        | "Equipment"
        | "Travel"
        | "Accommodation"
        | "Food"
        | "Marketing"
        | "Software"
        | "Maintenance"
        | "Salary"
        | "Other"
      payment_method: "Cash" | "Digital"
      payment_status: "Pending" | "Paid" | "Partial" | "Overdue"
      task_priority: "Low" | "Medium" | "High" | "Urgent"
      task_status:
        | "Pending"
        | "In Progress"
        | "Completed"
        | "On Hold"
        | "Waiting for Response"
        | "Accepted"
        | "Declined"
        | "Under Review"
        | "Reported"
      task_type: "Photo Editing" | "Video Editing" | "Other"
      user_role:
        | "Admin"
        | "Photographer"
        | "Videographer"
        | "Editor"
        | "Other"
        | "Cinematographer"
        | "Drone Pilot"
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
      accounting_category: [
        "Equipment Sales",
        "Security Deposits Received",
        "Photography Consultation",
        "Miscellaneous Income",
        "Office Supplies",
        "Software Subscriptions",
        "Equipment Maintenance",
        "Professional Services",
        "Business Insurance",
        "Bank Charges",
        "Office Rent & Utilities",
        "Miscellaneous Expenses",
        "Capital",
        "Assets",
        "Liabilities",
      ],
      event_status: [
        "Quotation",
        "Confirmed",
        "Shooting",
        "Editing",
        "Delivered",
        "Cancelled",
      ],
      event_type: [
        "Ring-Ceremony",
        "Pre-Wedding",
        "Wedding",
        "Maternity Photography",
        "Others",
      ],
      expense_category: [
        "Equipment",
        "Travel",
        "Accommodation",
        "Food",
        "Marketing",
        "Software",
        "Maintenance",
        "Salary",
        "Other",
      ],
      payment_method: ["Cash", "Digital"],
      payment_status: ["Pending", "Paid", "Partial", "Overdue"],
      task_priority: ["Low", "Medium", "High", "Urgent"],
      task_status: [
        "Pending",
        "In Progress",
        "Completed",
        "On Hold",
        "Waiting for Response",
        "Accepted",
        "Declined",
        "Under Review",
        "Reported",
      ],
      task_type: ["Photo Editing", "Video Editing", "Other"],
      user_role: [
        "Admin",
        "Photographer",
        "Videographer",
        "Editor",
        "Other",
        "Cinematographer",
        "Drone Pilot",
      ],
    },
  },
} as const
