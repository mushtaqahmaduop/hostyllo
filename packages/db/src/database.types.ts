// GENERATED FILE — do not edit by hand.
// Supabase TypeScript types for the HOSTYLLO schema (public).
// Regenerate: Supabase MCP generate_typescript_types (project eprrhckgtrerknenngdy).
// Phase 1 gate: 'TypeScript types generated from schema'.

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          expires_at: string | null
          hostel_id: string
          id: string
          is_active: boolean
          key_hash: string
          last_used_at: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          hostel_id: string
          id?: string
          is_active?: boolean
          key_hash: string
          last_used_at?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          hostel_id?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          last_used_at?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          hash: string | null
          hostel_id: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          hash?: string | null
          hostel_id: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          hash?: string | null
          hostel_id?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      beds: {
        Row: {
          created_at: string
          hostel_id: string
          id: string
          label: string
          room_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hostel_id: string
          id?: string
          label: string
          room_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hostel_id?: string
          id?: string
          label?: string
          room_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beds_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_splits: {
        Row: {
          amount_per_head: number
          bill_date: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          hostel_id: string
          id: string
          notes: string | null
          split_count: number
          title: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_per_head: number
          bill_date?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          hostel_id: string
          id?: string
          notes?: string | null
          split_count: number
          title: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          amount_per_head?: number
          bill_date?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          hostel_id?: string
          id?: string
          notes?: string | null
          split_count?: number
          title?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_splits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_splits_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellations: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          hostel_id: string
          id: string
          reason: string | null
          status: string
          student_id: string
          updated_at: string
          vacate_date: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          hostel_id: string
          id?: string
          reason?: string | null
          status?: string
          student_id: string
          updated_at?: string
          vacate_date: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          hostel_id?: string
          id?: string
          reason?: string | null
          status?: string
          student_id?: string
          updated_at?: string
          vacate_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellations_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_log: {
        Row: {
          created_at: string
          created_by: string | null
          hostel_id: string
          id: string
          logged_at: string
          note: string | null
          student_id: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hostel_id: string
          id?: string
          logged_at?: string
          note?: string | null
          student_id: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hostel_id?: string
          id?: string
          logged_at?: string
          note?: string | null
          student_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_log_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          hostel_id: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          student_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          hostel_id: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          student_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          hostel_id?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          student_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      dlq_jobs: {
        Row: {
          attempts: number
          created_at: string
          data: Json | null
          error: string | null
          failed_at: string
          hostel_id: string | null
          id: string
          job_id: string
          job_name: string
          queue_name: string
          resolved_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          data?: Json | null
          error?: string | null
          failed_at?: string
          hostel_id?: string | null
          id?: string
          job_id: string
          job_name: string
          queue_name: string
          resolved_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          data?: Json | null
          error?: string | null
          failed_at?: string
          hostel_id?: string | null
          id?: string
          job_id?: string
          job_name?: string
          queue_name?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dlq_jobs_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          expense_date: string
          hostel_id: string
          id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          hostel_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          hostel_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          hostel_id: string
          id: string
          message: string
          page_url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          hostel_id: string
          id?: string
          message: string
          page_url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          hostel_id?: string
          id?: string
          message?: string
          page_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fines: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          fine_date: string
          hostel_id: string
          id: string
          is_paid: boolean
          paid_at: string | null
          reason: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          fine_date?: string
          hostel_id: string
          id?: string
          is_paid?: boolean
          paid_at?: string | null
          reason: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          fine_date?: string
          hostel_id?: string
          id?: string
          is_paid?: boolean
          paid_at?: string | null
          reason?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fines_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fines_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      hostels: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          email: string | null
          id: string
          language: string
          logo_url: string | null
          name: string
          phone: string | null
          plan: string
          plan_status: string
          tagline: string | null
          timezone: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          language?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          plan?: string
          plan_status?: string
          tagline?: string | null
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          language?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          plan?: string
          plan_status?: string
          tagline?: string | null
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_requests: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          hostel_id: string
          id: string
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          room_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          hostel_id: string
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          room_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          hostel_id?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          room_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          expires_at: string | null
          hostel_id: string
          id: string
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          hostel_id: string
          id?: string
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          hostel_id?: string
          id?: string
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_responses: {
        Row: {
          comment: string | null
          created_at: string
          hostel_id: string
          id: string
          score: number
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          hostel_id: string
          id?: string
          score: number
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          hostel_id?: string
          id?: string
          score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_events: {
        Row: {
          created_at: string
          event: string
          hostel_id: string
          id: string
          metadata: Json | null
          step: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          hostel_id: string
          id?: string
          metadata?: Json | null
          step?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          hostel_id?: string
          id?: string
          metadata?: Json | null
          step?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_events_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_transfers: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          hostel_id: string
          id: string
          transfer_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          hostel_id: string
          id?: string
          transfer_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          hostel_id?: string
          id?: string
          transfer_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_transfers_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_extra_charges: {
        Row: {
          amount: number
          created_at: string
          hostel_id: string
          id: string
          label: string
          payment_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          hostel_id: string
          id?: string
          label: string
          payment_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          hostel_id?: string
          id?: string
          label?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_extra_charges_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_extra_charges_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          admission_fee: number
          concession: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          hostel_id: string
          id: string
          idempotency_key: string | null
          month: string
          paid: number
          payment_date: string | null
          payment_method: string | null
          receipt_number: string | null
          rent: number
          room_id: string | null
          status: string
          student_id: string
          total_due: number
          unpaid: number
          updated_at: string
          void_reason: string | null
          void_requested_by: string | null
        }
        Insert: {
          admission_fee?: number
          concession?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          hostel_id: string
          id?: string
          idempotency_key?: string | null
          month: string
          paid?: number
          payment_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          rent?: number
          room_id?: string | null
          status?: string
          student_id: string
          total_due?: number
          unpaid?: number
          updated_at?: string
          void_reason?: string | null
          void_requested_by?: string | null
        }
        Update: {
          admission_fee?: number
          concession?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          hostel_id?: string
          id?: string
          idempotency_key?: string | null
          month?: string
          paid?: number
          payment_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          rent?: number
          room_id?: string | null
          status?: string
          student_id?: string
          total_due?: number
          unpaid?: number
          updated_at?: string
          void_reason?: string | null
          void_requested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_void_requested_by_fkey"
            columns: ["void_requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_counter: {
        Row: {
          hostel_id: string
          last_number: number
          updated_at: string
        }
        Insert: {
          hostel_id: string
          last_number?: number
          updated_at?: string
        }
        Update: {
          hostel_id?: string
          last_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_counter_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: true
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_payouts: {
        Row: {
          amount: number
          created_at: string
          hostel_id: string
          id: string
          paid_at: string | null
          referred_hostel_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          hostel_id: string
          id?: string
          paid_at?: string | null
          referred_hostel_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          hostel_id?: string
          id?: string
          paid_at?: string | null
          referred_hostel_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_payouts_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_payouts_referred_hostel_id_fkey"
            columns: ["referred_hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      room_inspections: {
        Row: {
          created_at: string
          hostel_id: string
          id: string
          inspected_at: string
          inspected_by: string | null
          notes: string | null
          rating: number
          room_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hostel_id: string
          id?: string
          inspected_at?: string
          inspected_by?: string | null
          notes?: string | null
          rating: number
          room_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hostel_id?: string
          id?: string
          inspected_at?: string
          inspected_by?: string | null
          notes?: string | null
          rating?: number
          room_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_inspections_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_inspections_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_inspections_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_shifts: {
        Row: {
          created_at: string
          created_by: string | null
          from_bed_id: string | null
          from_room_id: string | null
          hostel_id: string
          id: string
          reason: string | null
          shift_date: string
          student_id: string
          to_bed_id: string | null
          to_room_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_bed_id?: string | null
          from_room_id?: string | null
          hostel_id: string
          id?: string
          reason?: string | null
          shift_date?: string
          student_id: string
          to_bed_id?: string | null
          to_room_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_bed_id?: string | null
          from_room_id?: string | null
          hostel_id?: string
          id?: string
          reason?: string | null
          shift_date?: string
          student_id?: string
          to_bed_id?: string | null
          to_room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_shifts_from_bed_id_fkey"
            columns: ["from_bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_shifts_from_room_id_fkey"
            columns: ["from_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_shifts_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_shifts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_shifts_to_bed_id_fkey"
            columns: ["to_bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_shifts_to_room_id_fkey"
            columns: ["to_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          color: string | null
          created_at: string
          deleted_at: string | null
          floor: string | null
          hostel_id: string
          id: string
          is_active: boolean
          monthly_fee: number
          number: string
          type: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          floor?: string | null
          hostel_id: string
          id?: string
          is_active?: boolean
          monthly_fee?: number
          number: string
          type?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          floor?: string | null
          hostel_id?: string
          id?: string
          is_active?: boolean
          monthly_fee?: number
          number?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_fee: number
          bed_id: string | null
          cnic_encrypted: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          emergency_contact: string | null
          father_name: string | null
          hostel_id: string
          id: string
          join_date: string
          monthly_fee: number
          name: string
          phone: string | null
          photo_url: string | null
          room_id: string | null
          search_vector: unknown
          status: string
          updated_at: string
          vacate_date: string | null
        }
        Insert: {
          address?: string | null
          admission_fee?: number
          bed_id?: string | null
          cnic_encrypted?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          emergency_contact?: string | null
          father_name?: string | null
          hostel_id: string
          id?: string
          join_date?: string
          monthly_fee?: number
          name: string
          phone?: string | null
          photo_url?: string | null
          room_id?: string | null
          search_vector?: unknown
          status?: string
          updated_at?: string
          vacate_date?: string | null
        }
        Update: {
          address?: string | null
          admission_fee?: number
          bed_id?: string | null
          cnic_encrypted?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          emergency_contact?: string | null
          father_name?: string | null
          hostel_id?: string
          id?: string
          join_date?: string
          monthly_fee?: number
          name?: string
          phone?: string | null
          photo_url?: string | null
          room_id?: string | null
          search_vector?: unknown
          status?: string
          updated_at?: string
          vacate_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          hostel_id: string
          id: string
          plan: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          hostel_id: string
          id?: string
          plan: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          hostel_id?: string
          id?: string
          plan?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_name: string | null
          email: string
          hostel_id: string
          id: string
          is_active: boolean
          language: string
          last_login_at: string | null
          name: string
          password_hash: string
          role: string
          theme: string
          totp_backup_codes: string | null
          totp_enabled: boolean
          totp_secret: string | null
          totp_secret_enc: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          email: string
          hostel_id: string
          id?: string
          is_active?: boolean
          language?: string
          last_login_at?: string | null
          name: string
          password_hash: string
          role?: string
          theme?: string
          totp_backup_codes?: string | null
          totp_enabled?: boolean
          totp_secret?: string | null
          totp_secret_enc?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          email?: string
          hostel_id?: string
          id?: string
          is_active?: boolean
          language?: string
          last_login_at?: string | null
          name?: string
          password_hash?: string
          role?: string
          theme?: string
          totp_backup_codes?: string | null
          totp_enabled?: boolean
          totp_secret?: string | null
          totp_secret_enc?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      warden_shift_log: {
        Row: {
          created_at: string
          hostel_id: string
          id: string
          ip_address: string | null
          login_at: string
          logout_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          hostel_id: string
          id?: string
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          hostel_id?: string
          id?: string
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warden_shift_log_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warden_shift_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_receipt_number: {
        Args: { p_hostel_id: string }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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

