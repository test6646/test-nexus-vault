export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
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
        Relationships: []
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
            foreignKeyName: "event_staff_assignments_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_staff_assignments_event_id"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      firms: {
        Row: {
          calendar_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          spreadsheet_id: string | null
          updated_at: string
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          spreadsheet_id?: string | null
          updated_at?: string
        }
        Update: {
          calendar_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          spreadsheet_id?: string | null
          updated_at?: string
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
        Relationships: []
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
          notes?: string | null
          payment_date?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
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
          telegram_chat_id: string | null
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
          telegram_chat_id?: string | null
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
          telegram_chat_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_firm_id_fkey"
            columns: ["current_firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
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
      sync_queue: {
        Row: {
          action: string
          created_at: string
          data: Json | null
          error_message: string | null
          id: string
          item_id: string
          item_type: string
          processed_at: string | null
        }
        Insert: {
          action: string
          created_at?: string
          data?: Json | null
          error_message?: string | null
          id?: string
          item_id: string
          item_type: string
          processed_at?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          data?: Json | null
          error_message?: string | null
          id?: string
          item_id?: string
          item_type?: string
          processed_at?: string | null
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
          task_id: string | null
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
          task_id?: string | null
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
          task_id?: string | null
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
            foreignKeyName: "tasks_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connection_logs: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          firm_id: string
          id: string
          message: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          firm_id: string
          id?: string
          message?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          firm_id?: string
          id?: string
          message?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connection_logs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_fresh_sessions: {
        Row: {
          created_at: string
          file_content: Json
          file_name: string
          firm_id: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_content: Json
          file_name: string
          firm_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_content?: Json
          file_name?: string
          firm_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_fresh_sessions_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          connected_at: string | null
          connection_data: Json | null
          created_at: string
          firm_id: string
          id: string
          is_active: boolean
          last_ping: string | null
          qr_code: string | null
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          connected_at?: string | null
          connection_data?: Json | null
          created_at?: string
          firm_id: string
          id?: string
          is_active?: boolean
          last_ping?: string | null
          qr_code?: string | null
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          connected_at?: string | null
          connection_data?: Json | null
          created_at?: string
          firm_id?: string
          id?: string
          is_active?: boolean
          last_ping?: string | null
          qr_code?: string | null
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_firm_id_fkey"
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
      cleanup_inactive_whatsapp_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_google_sheets_sync_queue: {
        Args: Record<PropertyKey, never>
        Returns: {
          item_type: string
          item_id: string
          firm_id: string
          operation: string
        }[]
      }
      validate_whatsapp_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
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
      payment_method: "Cash" | "UPI" | "Bank Transfer" | "Card" | "Cheque"
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
      payment_method: ["Cash", "UPI", "Bank Transfer", "Card", "Cheque"],
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
