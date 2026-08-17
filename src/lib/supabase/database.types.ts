export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agencies: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          agency_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          profile_id: string | null
          project_id: string | null
        }
        Insert: {
          action: string
          agency_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          project_id?: string | null
        }
        Update: {
          action?: string
          agency_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      comparables: {
        Row: {
          address: string | null
          advisor_notes: string | null
          agency_id: string
          bathrooms_count: number | null
          bedrooms_count: number | null
          city: string | null
          construction_year: number | null
          created_at: string
          days_on_market: number | null
          display_order: number
          district: string | null
          energy_rating: string | null
          energy_source: string | null
          exposure: string | null
          general_condition: string | null
          ges_rating: string | null
          heating_type: string | null
          id: string
          is_selected: boolean
          land_area: number | null
          listing_description: string | null
          listing_features: Json
          listing_url: string | null
          outdoor_spaces: string[]
          parking_types: string[]
          photo_urls: Json
          portal_price_per_square_meter: number | null
          postal_code: string | null
          price: number
          price_drop_amount: number | null
          price_drop_percentage: number | null
          project_id: string
          rooms_count: number | null
          source: string | null
          surface_area: number | null
          title: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          advisor_notes?: string | null
          agency_id: string
          bathrooms_count?: number | null
          bedrooms_count?: number | null
          city?: string | null
          construction_year?: number | null
          created_at?: string
          days_on_market?: number | null
          display_order: number
          district?: string | null
          energy_rating?: string | null
          energy_source?: string | null
          exposure?: string | null
          general_condition?: string | null
          ges_rating?: string | null
          heating_type?: string | null
          id?: string
          is_selected?: boolean
          land_area?: number | null
          listing_description?: string | null
          listing_features?: Json
          listing_url?: string | null
          outdoor_spaces?: string[]
          parking_types?: string[]
          photo_urls?: Json
          portal_price_per_square_meter?: number | null
          postal_code?: string | null
          price: number
          price_drop_amount?: number | null
          price_drop_percentage?: number | null
          project_id: string
          rooms_count?: number | null
          source?: string | null
          surface_area?: number | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          advisor_notes?: string | null
          agency_id?: string
          bathrooms_count?: number | null
          bedrooms_count?: number | null
          city?: string | null
          construction_year?: number | null
          created_at?: string
          days_on_market?: number | null
          display_order?: number
          district?: string | null
          energy_rating?: string | null
          energy_source?: string | null
          exposure?: string | null
          general_condition?: string | null
          ges_rating?: string | null
          heating_type?: string | null
          id?: string
          is_selected?: boolean
          land_area?: number | null
          listing_description?: string | null
          listing_features?: Json
          listing_url?: string | null
          outdoor_spaces?: string[]
          parking_types?: string[]
          photo_urls?: Json
          portal_price_per_square_meter?: number | null
          postal_code?: string | null
          price?: number
          price_drop_amount?: number | null
          price_drop_percentage?: number | null
          project_id?: string
          rooms_count?: number | null
          source?: string | null
          surface_area?: number | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comparables_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string
          export_type: string
          file_url: string | null
          id: string
          project_id: string
          report_id: string | null
          status: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by: string
          export_type: string
          file_url?: string | null
          id?: string
          project_id: string
          report_id?: string | null
          status: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string
          export_type?: string
          file_url?: string | null
          id?: string
          project_id?: string
          report_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "exports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      live_seller_responses: {
        Row: {
          agency_id: string
          comparable_id: string | null
          created_at: string
          id: string
          project_id: string
          seller_estimated_days_on_market: number | null
          seller_estimated_listing_price: number | null
          seller_market_duration_comment: string | null
          seller_market_duration_reason: string | null
          seller_serious_competitor: string | null
          seller_serious_competitor_comment: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          comparable_id?: string | null
          created_at?: string
          id?: string
          project_id: string
          seller_estimated_days_on_market?: number | null
          seller_estimated_listing_price?: number | null
          seller_market_duration_comment?: string | null
          seller_market_duration_reason?: string | null
          seller_serious_competitor?: string | null
          seller_serious_competitor_comment?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          comparable_id?: string | null
          created_at?: string
          id?: string
          project_id?: string
          seller_estimated_days_on_market?: number | null
          seller_estimated_listing_price?: number | null
          seller_market_duration_comment?: string | null
          seller_market_duration_reason?: string | null
          seller_serious_competitor?: string | null
          seller_serious_competitor_comment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_seller_responses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_seller_responses_comparable_id_fkey"
            columns: ["comparable_id"]
            isOneToOne: false
            referencedRelation: "comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_seller_responses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      live_seller_summary: {
        Row: {
          advisor_comparative_market_price: number | null
          agency_id: string
          created_at: string
          id: string
          project_id: string
          seller_most_dangerous_comment: string | null
          seller_most_dangerous_comparable_id: string | null
          seller_most_dangerous_reason: string | null
          seller_perceived_property_price: number | null
          updated_at: string
        }
        Insert: {
          advisor_comparative_market_price?: number | null
          agency_id: string
          created_at?: string
          id?: string
          project_id: string
          seller_most_dangerous_comment?: string | null
          seller_most_dangerous_comparable_id?: string | null
          seller_most_dangerous_reason?: string | null
          seller_perceived_property_price?: number | null
          updated_at?: string
        }
        Update: {
          advisor_comparative_market_price?: number | null
          agency_id?: string
          created_at?: string
          id?: string
          project_id?: string
          seller_most_dangerous_comment?: string | null
          seller_most_dangerous_comparable_id?: string | null
          seller_most_dangerous_reason?: string | null
          seller_perceived_property_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_seller_summary_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_seller_summary_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_seller_summary_seller_most_dangerous_comparable_id_fkey"
            columns: ["seller_most_dangerous_comparable_id"]
            isOneToOne: false
            referencedRelation: "comparables"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_scripts: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string
          id: string
          project_id: string
          script_json: Json
          status: string
          updated_at: string
          validated_at: string | null
          version: number
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by: string
          id?: string
          project_id: string
          script_json: Json
          status: string
          updated_at?: string
          validated_at?: string | null
          version: number
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string
          script_json?: Json
          status?: string
          updated_at?: string
          validated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "meeting_scripts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_scripts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_scripts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_sessions: {
        Row: {
          advisor_id: string
          agency_id: string
          completed_at: string | null
          created_at: string
          id: string
          meeting_script_id: string
          project_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          agency_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          meeting_script_id: string
          project_id: string
          started_at?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          agency_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          meeting_script_id?: string
          project_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_sessions_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_sessions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_sessions_meeting_script_id_fkey"
            columns: ["meeting_script_id"]
            isOneToOne: false
            referencedRelation: "meeting_scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      perception_results: {
        Row: {
          agency_id: string
          best_value_competitor_id: string | null
          created_at: string
          id: string
          market_understanding_score: number | null
          meeting_session_id: string
          most_dangerous_competitor_id: string | null
          perception_gaps: Json | null
          priority_criteria: Json | null
          project_id: string
          psychological_competitor_id: string | null
          seller_suggested_price: number | null
          summary_json: Json | null
        }
        Insert: {
          agency_id: string
          best_value_competitor_id?: string | null
          created_at?: string
          id?: string
          market_understanding_score?: number | null
          meeting_session_id: string
          most_dangerous_competitor_id?: string | null
          perception_gaps?: Json | null
          priority_criteria?: Json | null
          project_id: string
          psychological_competitor_id?: string | null
          seller_suggested_price?: number | null
          summary_json?: Json | null
        }
        Update: {
          agency_id?: string
          best_value_competitor_id?: string | null
          created_at?: string
          id?: string
          market_understanding_score?: number | null
          meeting_session_id?: string
          most_dangerous_competitor_id?: string | null
          perception_gaps?: Json | null
          priority_criteria?: Json | null
          project_id?: string
          psychological_competitor_id?: string | null
          seller_suggested_price?: number | null
          summary_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "perception_results_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perception_results_best_value_competitor_id_fkey"
            columns: ["best_value_competitor_id"]
            isOneToOne: false
            referencedRelation: "comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perception_results_meeting_session_id_fkey"
            columns: ["meeting_session_id"]
            isOneToOne: false
            referencedRelation: "meeting_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perception_results_most_dangerous_competitor_id_fkey"
            columns: ["most_dangerous_competitor_id"]
            isOneToOne: false
            referencedRelation: "comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perception_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perception_results_psychological_competitor_id_fkey"
            columns: ["psychological_competitor_id"]
            isOneToOne: false
            referencedRelation: "comparables"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_id: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          role: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          email: string
          first_name: string
          id: string
          last_name: string
          role: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          role?: string
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
      project_price_positionings: {
        Row: {
          advisor_price: number
          agency_id: string
          calculation_snapshot: Json
          confidence_level: string
          confidence_score: number
          created_at: string
          id: string
          justification: string | null
          project_id: string
          range_central: number
          range_high: number
          range_low: number
          seller_price: number | null
          updated_at: string
          validated_at: string
          validated_by: string
        }
        Insert: {
          advisor_price: number
          agency_id: string
          calculation_snapshot: Json
          confidence_level: string
          confidence_score: number
          created_at?: string
          id?: string
          justification?: string | null
          project_id: string
          range_central: number
          range_high: number
          range_low: number
          seller_price?: number | null
          updated_at?: string
          validated_at?: string
          validated_by: string
        }
        Update: {
          advisor_price?: number
          agency_id?: string
          calculation_snapshot?: Json
          confidence_level?: string
          confidence_score?: number
          created_at?: string
          id?: string
          justification?: string | null
          project_id?: string
          range_central?: number
          range_high?: number
          range_low?: number
          seller_price?: number | null
          updated_at?: string
          validated_at?: string
          validated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_price_positionings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_price_positionings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_price_positionings_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          advisor_id: string
          agency_id: string
          created_at: string
          id: string
          seller_email: string | null
          seller_name: string
          seller_phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          agency_id: string
          created_at?: string
          id?: string
          seller_email?: string | null
          seller_name: string
          seller_phone?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          agency_id?: string
          created_at?: string
          id?: string
          seller_email?: string | null
          seller_name?: string
          seller_phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          advisor_summary: string | null
          agency_id: string
          created_at: string
          created_by: string
          id: string
          meeting_session_id: string
          perception_result_id: string | null
          project_id: string
          report_json: Json
          updated_at: string
        }
        Insert: {
          advisor_summary?: string | null
          agency_id: string
          created_at?: string
          created_by: string
          id?: string
          meeting_session_id: string
          perception_result_id?: string | null
          project_id: string
          report_json: Json
          updated_at?: string
        }
        Update: {
          advisor_summary?: string | null
          agency_id?: string
          created_at?: string
          created_by?: string
          id?: string
          meeting_session_id?: string
          perception_result_id?: string | null
          project_id?: string
          report_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_meeting_session_id_fkey"
            columns: ["meeting_session_id"]
            isOneToOne: false
            referencedRelation: "meeting_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_perception_result_id_fkey"
            columns: ["perception_result_id"]
            isOneToOne: false
            referencedRelation: "perception_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_answers: {
        Row: {
          agency_id: string
          answer_boolean: boolean | null
          answer_json: Json | null
          answer_number: number | null
          answer_text: string | null
          answer_type: string
          comparable_id: string | null
          created_at: string
          id: string
          meeting_session_id: string
          project_id: string
          question_key: string
        }
        Insert: {
          agency_id: string
          answer_boolean?: boolean | null
          answer_json?: Json | null
          answer_number?: number | null
          answer_text?: string | null
          answer_type: string
          comparable_id?: string | null
          created_at?: string
          id?: string
          meeting_session_id: string
          project_id: string
          question_key: string
        }
        Update: {
          agency_id?: string
          answer_boolean?: boolean | null
          answer_json?: Json | null
          answer_number?: number | null
          answer_text?: string | null
          answer_type?: string
          comparable_id?: string | null
          created_at?: string
          id?: string
          meeting_session_id?: string
          project_id?: string
          question_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_answers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_answers_comparable_id_fkey"
            columns: ["comparable_id"]
            isOneToOne: false
            referencedRelation: "comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_answers_meeting_session_id_fkey"
            columns: ["meeting_session_id"]
            isOneToOne: false
            referencedRelation: "meeting_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_answers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_properties: {
        Row: {
          address: string | null
          agency_id: string
          bathrooms_count: number | null
          bedrooms_count: number | null
          building_floors: number | null
          city: string | null
          construction_year: number | null
          created_at: string
          description: string | null
          district: string | null
          energy_rating: string | null
          exposure: string | null
          floor: number | null
          general_condition: string | null
          ges_rating: string | null
          heating_type: string | null
          id: string
          land_area: number | null
          monthly_charges: number | null
          outdoor_spaces: string[]
          parking_types: string[]
          photo_urls: Json | null
          postal_code: string | null
          project_id: string
          property_tax: number | null
          property_type: string | null
          rooms_count: number | null
          strengths: string[]
          surface_area: number | null
          updated_at: string
          watch_points: string[]
          weaknesses: Json | null
        }
        Insert: {
          address?: string | null
          agency_id: string
          bathrooms_count?: number | null
          bedrooms_count?: number | null
          building_floors?: number | null
          city?: string | null
          construction_year?: number | null
          created_at?: string
          description?: string | null
          district?: string | null
          energy_rating?: string | null
          exposure?: string | null
          floor?: number | null
          general_condition?: string | null
          ges_rating?: string | null
          heating_type?: string | null
          id?: string
          land_area?: number | null
          monthly_charges?: number | null
          outdoor_spaces?: string[]
          parking_types?: string[]
          photo_urls?: Json | null
          postal_code?: string | null
          project_id: string
          property_tax?: number | null
          property_type?: string | null
          rooms_count?: number | null
          strengths?: string[]
          surface_area?: number | null
          updated_at?: string
          watch_points?: string[]
          weaknesses?: Json | null
        }
        Update: {
          address?: string | null
          agency_id?: string
          bathrooms_count?: number | null
          bedrooms_count?: number | null
          building_floors?: number | null
          city?: string | null
          construction_year?: number | null
          created_at?: string
          description?: string | null
          district?: string | null
          energy_rating?: string | null
          exposure?: string | null
          floor?: number | null
          general_condition?: string | null
          ges_rating?: string | null
          heating_type?: string | null
          id?: string
          land_area?: number | null
          monthly_charges?: number | null
          outdoor_spaces?: string[]
          parking_types?: string[]
          photo_urls?: Json | null
          postal_code?: string | null
          project_id?: string
          property_tax?: number | null
          property_type?: string | null
          rooms_count?: number | null
          strengths?: string[]
          surface_area?: number | null
          updated_at?: string
          watch_points?: string[]
          weaknesses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_properties_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_properties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_property_condominiums: {
        Row: {
          agency_id: string
          annual_charges: number | null
          created_at: string
          id: string
          is_condominium: boolean
          known_unpaid_charges: boolean | null
          known_unpaid_charges_amount: number | null
          last_general_assembly_date: string | null
          notes: string | null
          ongoing_procedures: boolean | null
          planned_works: boolean | null
          planned_works_details: string | null
          procedures_details: string | null
          residential_lots: number | null
          subject_property_id: string
          syndic_name: string | null
          total_lots: number | null
          updated_at: string
          voted_works: boolean | null
          voted_works_details: string | null
          works_fund: number | null
        }
        Insert: {
          agency_id: string
          annual_charges?: number | null
          created_at?: string
          id?: string
          is_condominium?: boolean
          known_unpaid_charges?: boolean | null
          known_unpaid_charges_amount?: number | null
          last_general_assembly_date?: string | null
          notes?: string | null
          ongoing_procedures?: boolean | null
          planned_works?: boolean | null
          planned_works_details?: string | null
          procedures_details?: string | null
          residential_lots?: number | null
          subject_property_id: string
          syndic_name?: string | null
          total_lots?: number | null
          updated_at?: string
          voted_works?: boolean | null
          voted_works_details?: string | null
          works_fund?: number | null
        }
        Update: {
          agency_id?: string
          annual_charges?: number | null
          created_at?: string
          id?: string
          is_condominium?: boolean
          known_unpaid_charges?: boolean | null
          known_unpaid_charges_amount?: number | null
          last_general_assembly_date?: string | null
          notes?: string | null
          ongoing_procedures?: boolean | null
          planned_works?: boolean | null
          planned_works_details?: string | null
          procedures_details?: string | null
          residential_lots?: number | null
          subject_property_id?: string
          syndic_name?: string | null
          total_lots?: number | null
          updated_at?: string
          voted_works?: boolean | null
          voted_works_details?: string | null
          works_fund?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_property_condominiums_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_property_condominiums_subject_property_id_fkey"
            columns: ["subject_property_id"]
            isOneToOne: true
            referencedRelation: "subject_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_property_diagnostics: {
        Row: {
          agency_id: string
          asbestos_status: string | null
          created_at: string
          diagnostics_completed_at: string | null
          diagnostics_valid_until: string | null
          dpe_date: string | null
          electricity_status: string | null
          energy_consumption: number | null
          erp_status: string | null
          gas_status: string | null
          ges_emissions: number | null
          id: string
          lead_status: string | null
          notes: string | null
          subject_property_id: string
          termites_status: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          asbestos_status?: string | null
          created_at?: string
          diagnostics_completed_at?: string | null
          diagnostics_valid_until?: string | null
          dpe_date?: string | null
          electricity_status?: string | null
          energy_consumption?: number | null
          erp_status?: string | null
          gas_status?: string | null
          ges_emissions?: number | null
          id?: string
          lead_status?: string | null
          notes?: string | null
          subject_property_id: string
          termites_status?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          asbestos_status?: string | null
          created_at?: string
          diagnostics_completed_at?: string | null
          diagnostics_valid_until?: string | null
          dpe_date?: string | null
          electricity_status?: string | null
          energy_consumption?: number | null
          erp_status?: string | null
          gas_status?: string | null
          ges_emissions?: number | null
          id?: string
          lead_status?: string | null
          notes?: string | null
          subject_property_id?: string
          termites_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_property_diagnostics_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_property_diagnostics_subject_property_id_fkey"
            columns: ["subject_property_id"]
            isOneToOne: true
            referencedRelation: "subject_properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_agency_owner: {
        Args: { agency_name: string; first_name: string; last_name: string }
        Returns: {
          agency_id: string
          profile_id: string
        }[]
      }
      get_current_agency_id: { Args: never; Returns: string }
      move_comparable: {
        Args: {
          move_direction: string
          target_comparable_id: string
          target_project_id: string
        }
        Returns: undefined
      }
      move_selected_comparable: {
        Args: { p_comparable_id: string; p_direction: string }
        Returns: undefined
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
