import { createClient } from "@supabase/supabase-js"

// Use environment variables - no fallback values for security
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Determine final URL and key to use
let finalUrl: string
let finalKey: string

/**
 * More graceful handling of missing env vars to prevent 500 errors
 */
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ Supabase credentials are missing.\n" +
      "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "in your environment variables."
  )
  // Use dummy values to prevent crashes - auth will fail gracefully
  finalUrl = 'https://dummy.supabase.co'
  finalKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bW15IiwiZXhwIjoxOTg0MTgwODAwfQ.dummy'
} else {
  // Validate URL format to prevent runtime crashes
  try {
    new URL(supabaseUrl)
    finalUrl = supabaseUrl
  } catch (error) {
    console.error('Invalid Supabase URL:', supabaseUrl)
    // Use a dummy URL that won't crash the client but will fail gracefully
    finalUrl = 'https://dummy.supabase.co'
  }
  finalKey = supabaseAnonKey
}

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'raptor-auth-token',
    debug: process.env.NODE_ENV === 'development'
  },
  global: {
    headers: {
      'x-application': 'raptor-esports-crm'
    }
  }
})

// REMOVED testConnection function that was causing getSession() hanging issues
// Connection testing is now handled by the auth hook's simplified approach

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          role: "admin" | "manager" | "coach" | "player" | "analyst" | "pending_player" | "tryout"
          role_level: number | null
          team_id: string | null
          avatar_url: string | null
          created_at: string
          provider: string | null
          contact_number: string | null
          in_game_role: string | null
          device_info: string | null
          device_model: string | null
          ram: string | null
          fps: string | null
          storage: string | null
          status: string | null
          gyroscope_enabled: boolean | null
          instagram_handle: string | null
          discord_id: string | null
          bio: string | null
          favorite_game: string | null
          gaming_experience: string | null
          display_name: string | null
          full_name: string | null
          experience: string | null
          preferred_role: string | null
          favorite_games: string | null
          onboarding_completed: boolean | null
          last_login: string | null
          updated_at: string | null
          // New BGMI-specific fields
          bgmi_id: string | null
          bgmi_tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Crown" | "Ace" | "Conqueror" | null
          bgmi_points: number | null
          sensitivity_settings: Json | null
          control_layout: "2-finger" | "3-finger" | "4-finger" | "5-finger" | "6-finger" | null
          hud_layout_code: string | null
          game_stats: Json | null
          achievements: Json | null
          social_links: Json | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          date_of_birth: string | null
          address: string | null
          preferred_language: string | null
          timezone: string | null
          profile_visibility: "public" | "team" | "private" | null
          auto_sync_tryout_data: boolean | null
          last_profile_update: string | null
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: "admin" | "manager" | "coach" | "player" | "analyst" | "pending_player" | "tryout"
          role_level?: number | null
          team_id?: string | null
          avatar_url?: string | null
          provider?: string | null
          contact_number?: string | null
          in_game_role?: string | null
          device_info?: string | null
          device_model?: string | null
          ram?: string | null
          fps?: string | null
          storage?: string | null
          status?: string | null
          gyroscope_enabled?: boolean | null
          instagram_handle?: string | null
          discord_id?: string | null
          bio?: string | null
          favorite_game?: string | null
          gaming_experience?: string | null
          display_name?: string | null
          full_name?: string | null
          experience?: string | null
          preferred_role?: string | null
          favorite_games?: string | null
          onboarding_completed?: boolean | null
          last_login?: string | null
          updated_at?: string | null
          // New BGMI-specific fields
          bgmi_id?: string | null
          bgmi_tier?: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Crown" | "Ace" | "Conqueror" | null
          bgmi_points?: number | null
          sensitivity_settings?: Json | null
          control_layout?: "2-finger" | "3-finger" | "4-finger" | "5-finger" | "6-finger" | null
          hud_layout_code?: string | null
          game_stats?: Json | null
          achievements?: Json | null
          social_links?: Json | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          date_of_birth?: string | null
          address?: string | null
          preferred_language?: string | null
          timezone?: string | null
          profile_visibility?: "public" | "team" | "private" | null
          auto_sync_tryout_data?: boolean | null
          last_profile_update?: string | null
        }
        Update: {
          name?: string | null
          role?: "admin" | "manager" | "coach" | "player" | "analyst" | "pending_player" | "tryout"
          role_level?: number | null
          team_id?: string | null
          avatar_url?: string | null
          provider?: string | null
          contact_number?: string | null
          in_game_role?: string | null
          device_info?: string | null
          device_model?: string | null
          ram?: string | null
          fps?: string | null
          storage?: string | null
          status?: string | null
          gyroscope_enabled?: boolean | null
          instagram_handle?: string | null
          discord_id?: string | null
          bio?: string | null
          favorite_game?: string | null
          gaming_experience?: string | null
          display_name?: string | null
          full_name?: string | null
          experience?: string | null
          preferred_role?: string | null
          favorite_games?: string | null
          // New BGMI-specific fields
          bgmi_id?: string | null
          bgmi_tier?: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Crown" | "Ace" | "Conqueror" | null
          bgmi_points?: number | null
          sensitivity_settings?: Json | null
          control_layout?: "2-finger" | "3-finger" | "4-finger" | "5-finger" | "6-finger" | null
          hud_layout_code?: string | null
          game_stats?: Json | null
          achievements?: Json | null
          social_links?: Json | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          date_of_birth?: string | null
          address?: string | null
          preferred_language?: string | null
          timezone?: string | null
          profile_visibility?: "public" | "team" | "private" | null
          auto_sync_tryout_data?: boolean | null
          last_profile_update?: string | null
          onboarding_completed?: boolean | null
          last_login?: string | null
          updated_at?: string | null
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          tier: string | null
          coach_id: string | null
          status: string | null
          created_at: string
        }
        Insert: {
          name: string
          tier?: string | null
          coach_id?: string | null
          status?: string | null
        }
        Update: {
          name?: string
          tier?: string | null
          coach_id?: string | null
          status?: string | null
        }
      }
      performances: {
        Row: {
          id: string
          team_id: string | null
          player_id: string
          match_number: number
          slot: string | null
          map: string
          placement: number | null
          kills: number
          assists: number
          damage: number
          survival_time: number
          added_by: string | null
          created_at: string
        }
        Insert: {
          team_id?: string | null
          player_id: string
          match_number: number
          slot?: string | null
          map: string
          placement?: number | null
          kills?: number
          assists?: number
          damage?: number
          survival_time?: number
          added_by?: string | null
        }
        Update: {
          team_id?: string | null
          player_id?: string
          match_number?: number
          slot?: string | null
          map?: string
          placement?: number | null
          kills?: number
          assists?: number
          damage?: number
          survival_time?: number
          added_by?: string | null
        }
      }
      rosters: {
        Row: {
          id: string
          team_id: string
          user_id: string
          in_game_role: string | null
          contact_number: string | null
          device_info: string | null
          created_at: string
        }
        Insert: {
          team_id: string
          user_id: string
          in_game_role?: string | null
          contact_number?: string | null
          device_info?: string | null
        }
        Update: {
          team_id?: string
          user_id?: string
          in_game_role?: string | null
          contact_number?: string | null
          device_info?: string | null
        }
      }
      slots: {
        Row: {
          id: string
          team_id: string
          organizer: string
          time_range: string
          number_of_slots: number
          slot_rate: number
          match_count: number
          notes: string | null
          date: string // DATE type in SQL, string in TS
          created_at: string
        }
        Insert: {
          team_id: string
          organizer: string
          time_range: string
          number_of_slots: number
          slot_rate: number
          match_count: number
          notes?: string | null
          date: string
        }
        Update: {
          team_id?: string
          organizer?: string
          time_range?: string
          number_of_slots?: number
          slot_rate?: number
          match_count?: number
          notes?: string | null
          date?: string
        }
      }
      slot_expenses: {
        Row: {
          id: string
          slot_id: string
          team_id: string
          rate: number
          number_of_slots: number
          total: number
          created_at: string
        }
        Insert: {
          slot_id: string
          team_id: string
          rate: number
          number_of_slots: number
          total: number
        }
        Update: {
          slot_id?: string
          team_id?: string
          rate?: number
          number_of_slots?: number
          total?: number
        }
      }
      prize_pools: {
        Row: {
          id: string
          slot_id: string
          total_amount: number
          breakdown: Json | null // JSONB type in SQL
          created_at: string
        }
        Insert: {
          slot_id: string
          total_amount: number
          breakdown?: Json | null
        }
        Update: {
          slot_id?: string
          total_amount?: number
          breakdown?: Json | null
        }
      }
      winnings: {
        Row: {
          id: string
          slot_id: string
          team_id: string
          position: number
          amount_won: number
          created_at: string
        }
        Insert: {
          slot_id: string
          team_id: string
          position: number
          amount_won: number
        }
        Update: {
          slot_id?: string
          team_id?: string
          position?: number
          amount_won?: number
        }
      }
      attendances: {
        Row: {
          id: string
          player_id: string
          team_id: string
          date: string
          session_time: string
          status: "present" | "late" | "absent" | "auto"
          marked_by: string | null
          slot_id: string | null
          session_id: string | null
          source: "manual" | "auto" | "system"
          created_at: string
        }
        Insert: {
          player_id: string
          team_id: string
          date: string
          session_time: string
          status: "present" | "late" | "absent" | "auto"
          marked_by?: string | null
          slot_id?: string | null
          session_id?: string | null
          source?: "manual" | "auto" | "system"
        }
        Update: {
          player_id?: string
          team_id?: string
          date?: string
          session_time?: string
          status?: "present" | "late" | "absent" | "auto"
          marked_by?: string | null
          slot_id?: string | null
          session_id?: string | null
          source?: "manual" | "auto" | "system"
        }
      }
      sessions: {
        Row: {
          id: string
          team_id: string
          session_type: "practice" | "tournament" | "meeting"
          session_subtype: string | null
          date: string
          start_time: string | null
          end_time: string | null
          cutoff_time: string | null
          title: string | null
          description: string | null
          is_mandatory: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          team_id: string
          session_type: "practice" | "tournament" | "meeting"
          session_subtype?: string | null
          date: string
          start_time?: string | null
          end_time?: string | null
          cutoff_time?: string | null
          title?: string | null
          description?: string | null
          is_mandatory?: boolean
          created_by: string
        }
        Update: {
          team_id?: string
          session_type?: "practice" | "tournament" | "meeting"
          session_subtype?: string | null
          date?: string
          start_time?: string | null
          end_time?: string | null
          cutoff_time?: string | null
          title?: string | null
          description?: string | null
          is_mandatory?: boolean
          created_by?: string
          updated_at?: string
        }
      }
      admin_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
      }
      module_permissions: {
        Row: {
          id: number
          role: string
          module: string
          can_access: boolean
        }
        Insert: {
          role: string
          module: string
          can_access?: boolean
        }
        Update: {
          role?: string
          module?: string
          can_access?: boolean
        }
      }
      profiles: {
        Row: {
          id: number
          user_id: string
          username: string | null
          avatar_url: string | null
          website: string | null
          created_at: string
          updated_at: string
          bio: string | null
          full_name: string | null
          display_name: string | null
          contact_number: string | null
          experience: string | null
          preferred_role: string | null
          favorite_games: string | null
          role: string | null
          onboarding_completed: boolean | null
        }
        Insert: {
          user_id: string
          username?: string | null
          avatar_url?: string | null
          website?: string | null
          bio?: string | null
          full_name?: string | null
          display_name?: string | null
          contact_number?: string | null
          experience?: string | null
          preferred_role?: string | null
          favorite_games?: string | null
          role?: string | null
          onboarding_completed?: boolean | null
        }
        Update: {
          user_id?: string
          username?: string | null
          avatar_url?: string | null
          website?: string | null
          updated_at?: string
          bio?: string | null
          full_name?: string | null
          display_name?: string | null
          contact_number?: string | null
          experience?: string | null
          preferred_role?: string | null
          favorite_games?: string | null
          role?: string | null
          onboarding_completed?: boolean | null
        }
      }
      tier_defaults: {
        Row: {
          id: string
          tier: string
          default_slot_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          tier: string
          default_slot_rate: number
        }
        Update: {
          tier?: string
          default_slot_rate?: number
          updated_at?: string
        }
      }
      discord_webhooks: {
        Row: {
          id: string
          team_id: string | null
          hook_url: string
          type: "team" | "admin" | "global"
          active: boolean
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          team_id?: string | null
          hook_url: string
          type: "team" | "admin" | "global"
          active?: boolean
          created_by: string
        }
        Update: {
          team_id?: string | null
          hook_url?: string
          type?: "team" | "admin" | "global"
          active?: boolean
          updated_at?: string
        }
      }
      communication_logs: {
        Row: {
          id: string
          team_id: string | null
          webhook_id: string | null
          message_type: string
          status: "success" | "failed" | "pending" | "retry"
          payload: Json
          response_code: number | null
          response_body: string | null
          error_message: string | null
          triggered_by: string | null
          retry_count: number
          timestamp: string
        }
        Insert: {
          team_id?: string | null
          webhook_id?: string | null
          message_type: string
          status: "success" | "failed" | "pending" | "retry"
          payload: Json
          response_code?: number | null
          response_body?: string | null
          error_message?: string | null
          triggered_by?: string | null
          retry_count?: number
        }
        Update: {
          team_id?: string | null
          webhook_id?: string | null
          message_type?: string
          status?: "success" | "failed" | "pending" | "retry"
          payload?: Json
          response_code?: number | null
          response_body?: string | null
          error_message?: string | null
          triggered_by?: string | null
          retry_count?: number
          timestamp?: string
        }
      }
      communication_settings: {
        Row: {
          id: string
          team_id: string | null
          setting_key: string
          setting_value: boolean
          updated_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          team_id?: string | null
          setting_key: string
          setting_value: boolean
          updated_by: string
        }
        Update: {
          team_id?: string | null
          setting_key?: string
          setting_value?: boolean
          updated_by?: string
          updated_at?: string
        }
      }
    }
  }
}

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export const SUPABASE_URL_DEBUG = supabaseUrl || 'not-set'
export const SUPABASE_ANON_DEBUG = (supabaseAnonKey || 'not-set').slice(0, 8) + "…"
