export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      agencies: {
        Row: {
          buyer_watch_cap_cents: number;
          created_at: string;
          follow_up_dormant_days: number;
          id: string;
          is_demo: boolean;
          name: string;
          preparation_dormant_days: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          buyer_watch_cap_cents?: number;
          created_at?: string;
          follow_up_dormant_days?: number;
          id?: string;
          is_demo?: boolean;
          name: string;
          preparation_dormant_days?: number;
          updated_at?: string;
        };
        Update: {
          buyer_watch_cap_cents?: number;
          created_at?: string;
          follow_up_dormant_days?: number;
          id?: string;
          is_demo?: boolean;
          name?: string;
          preparation_dormant_days?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      agency_ai_budgets: {
        Row: {
          agency_id: string;
          created_at: string;
          id: string;
          monthly_cap_cents: number;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          id?: string;
          monthly_cap_cents: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          id?: string;
          monthly_cap_cents?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'agency_ai_budgets_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: true;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
        ];
      };
      agency_branding: {
        Row: {
          agency_id: string;
          brand: string | null;
          brand_darker: string | null;
          brand_darkest: string | null;
          brand_deep: string | null;
          brand_soft: string | null;
          created_at: string;
          document_name: string | null;
          financial_guarantee: string | null;
          font_family: string | null;
          id: string;
          logo_dark_path: string | null;
          logo_light_path: string | null;
          on_brand_text: string | null;
          postal_address: string | null;
          professional_card: string | null;
          professional_card_issuer: string | null;
          site_url: string | null;
          text_contrast_adjusted: boolean;
          updated_at: string;
          validated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          brand?: string | null;
          brand_darker?: string | null;
          brand_darkest?: string | null;
          brand_deep?: string | null;
          brand_soft?: string | null;
          created_at?: string;
          document_name?: string | null;
          financial_guarantee?: string | null;
          font_family?: string | null;
          id?: string;
          logo_dark_path?: string | null;
          logo_light_path?: string | null;
          on_brand_text?: string | null;
          postal_address?: string | null;
          professional_card?: string | null;
          professional_card_issuer?: string | null;
          site_url?: string | null;
          text_contrast_adjusted?: boolean;
          updated_at?: string;
          validated_at?: string | null;
        };
        Update: {
          agency_id?: string;
          brand?: string | null;
          brand_darker?: string | null;
          brand_darkest?: string | null;
          brand_deep?: string | null;
          brand_soft?: string | null;
          created_at?: string;
          document_name?: string | null;
          financial_guarantee?: string | null;
          font_family?: string | null;
          id?: string;
          logo_dark_path?: string | null;
          logo_light_path?: string | null;
          on_brand_text?: string | null;
          postal_address?: string | null;
          professional_card?: string | null;
          professional_card_issuer?: string | null;
          site_url?: string | null;
          text_contrast_adjusted?: boolean;
          updated_at?: string;
          validated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'agency_branding_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: true;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
        ];
      };
      agency_invitations: {
        Row: {
          accepted_at: string | null;
          agency_id: string;
          auth_user_id: string | null;
          created_at: string;
          email: string;
          id: string;
          invited_by: string;
          role: string;
          sent_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          agency_id: string;
          auth_user_id?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          invited_by: string;
          role: string;
          sent_at?: string | null;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          agency_id?: string;
          auth_user_id?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          invited_by?: string;
          role?: string;
          sent_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agency_invitations_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agency_invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      agency_legal_identities: {
        Row: {
          agency_email: string | null;
          agency_id: string;
          agency_phone: string | null;
          company_form: string | null;
          company_name: string | null;
          company_seat: string | null;
          created_at: string;
          guarantee_address: string | null;
          guarantee_amount: number | null;
          guarantee_body: string | null;
          guarantee_number: string | null;
          id: string;
          rcp_address: string | null;
          rcp_insurer: string | null;
          rcp_number: string | null;
          rcs_city: string | null;
          rcs_number: string | null;
          representative_name: string | null;
          representative_title: string | null;
          share_capital: string | null;
          updated_at: string;
          updated_by: string | null;
          vat_number: string | null;
        };
        ComputedFields: never;
        Insert: {
          agency_email?: string | null;
          agency_id: string;
          agency_phone?: string | null;
          company_form?: string | null;
          company_name?: string | null;
          company_seat?: string | null;
          created_at?: string;
          guarantee_address?: string | null;
          guarantee_amount?: number | null;
          guarantee_body?: string | null;
          guarantee_number?: string | null;
          id?: string;
          rcp_address?: string | null;
          rcp_insurer?: string | null;
          rcp_number?: string | null;
          rcs_city?: string | null;
          rcs_number?: string | null;
          representative_name?: string | null;
          representative_title?: string | null;
          share_capital?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          vat_number?: string | null;
        };
        Update: {
          agency_email?: string | null;
          agency_id?: string;
          agency_phone?: string | null;
          company_form?: string | null;
          company_name?: string | null;
          company_seat?: string | null;
          created_at?: string;
          guarantee_address?: string | null;
          guarantee_amount?: number | null;
          guarantee_body?: string | null;
          guarantee_number?: string | null;
          id?: string;
          rcp_address?: string | null;
          rcp_insurer?: string | null;
          rcp_number?: string | null;
          rcs_city?: string | null;
          rcs_number?: string | null;
          representative_name?: string | null;
          representative_title?: string | null;
          share_capital?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          vat_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'agency_legal_identities_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: true;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agency_legal_identities_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      agency_search_budgets: {
        Row: {
          agency_id: string;
          created_at: string;
          id: string;
          monthly_cap_cents: number;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          id?: string;
          monthly_cap_cents: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          id?: string;
          monthly_cap_cents?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'agency_search_budgets_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: true;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_usage: {
        Row: {
          agency_id: string;
          buyer_id: string | null;
          cost_millicents: number;
          created_at: string;
          fields_kept: string[];
          fields_proposed: string[];
          id: string;
          model: string;
          outcome: string;
          personal_mentions_skipped: number | null;
          purpose: string;
          reserved: boolean;
          source: string | null;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          buyer_id?: string | null;
          cost_millicents: number;
          created_at?: string;
          fields_kept?: string[];
          fields_proposed?: string[];
          id?: string;
          model: string;
          outcome?: string;
          personal_mentions_skipped?: number | null;
          purpose: string;
          reserved?: boolean;
          source?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          agency_id?: string;
          buyer_id?: string | null;
          cost_millicents?: number;
          created_at?: string;
          fields_kept?: string[];
          fields_proposed?: string[];
          id?: string;
          model?: string;
          outcome?: string;
          personal_mentions_skipped?: number | null;
          purpose?: string;
          reserved?: boolean;
          source?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_usage_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_usage_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'buyers';
            referencedColumns: ['id'];
          },
        ];
      };
      app_errors: {
        Row: {
          agency_id: string | null;
          created_at: string;
          id: string;
          message: string;
          page: string;
          source: string;
          user_id: string | null;
          version: string | null;
        };
        ComputedFields: never;
        Insert: {
          agency_id?: string | null;
          created_at?: string;
          id?: string;
          message: string;
          page: string;
          source: string;
          user_id?: string | null;
          version?: string | null;
        };
        Update: {
          agency_id?: string | null;
          created_at?: string;
          id?: string;
          message?: string;
          page?: string;
          source?: string;
          user_id?: string | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'app_errors_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_dismissals: {
        Row: {
          agency_id: string;
          buyer_id: string;
          created_at: string;
          dismissed_at: string;
          dismissed_by: string | null;
          id: string;
          label: string;
          property_key: string;
          reason: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          buyer_id: string;
          created_at?: string;
          dismissed_at?: string;
          dismissed_by?: string | null;
          id?: string;
          label: string;
          property_key: string;
          reason: string;
        };
        Update: {
          agency_id?: string;
          buyer_id?: string;
          created_at?: string;
          dismissed_at?: string;
          dismissed_by?: string | null;
          id?: string;
          label?: string;
          property_key?: string;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_dismissals_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_dismissals_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'buyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_dismissals_dismissed_by_fkey';
            columns: ['dismissed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_document_acceptances: {
        Row: {
          agency_id: string;
          created_at: string;
          decided_at: string;
          decision: string;
          document_id: string;
          id: string;
          signature_paths: string[] | null;
          signer_names: string[] | null;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          decided_at?: string;
          decision: string;
          document_id: string;
          id?: string;
          signature_paths?: string[] | null;
          signer_names?: string[] | null;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          decided_at?: string;
          decision?: string;
          document_id?: string;
          id?: string;
          signature_paths?: string[] | null;
          signer_names?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_document_acceptances_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_document_acceptances_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: true;
            referencedRelation: 'buyer_documents';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_document_links: {
        Row: {
          agency_id: string;
          audience: string;
          created_at: string;
          created_by: string | null;
          document_id: string;
          expires_at: string;
          id: string;
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          audience?: string;
          created_at?: string;
          created_by?: string | null;
          document_id: string;
          expires_at?: string;
          id?: string;
          token_hash: string;
        };
        Update: {
          agency_id?: string;
          audience?: string;
          created_at?: string;
          created_by?: string | null;
          document_id?: string;
          expires_at?: string;
          id?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_document_links_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_document_links_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_document_links_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'buyer_documents';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_document_visits: {
        Row: {
          agency_id: string;
          created_at: string;
          document_id: string;
          visit_request_id: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          document_id: string;
          visit_request_id: string;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          document_id?: string;
          visit_request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_document_visits_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_document_visits_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'buyer_documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_document_visits_visit_request_id_fkey';
            columns: ['visit_request_id'];
            isOneToOne: false;
            referencedRelation: 'buyer_visit_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_documents: {
        Row: {
          agency_id: string;
          buyer_id: string | null;
          content_sha256: string;
          created_at: string;
          created_by: string | null;
          fields: NonNullable<Json>;
          id: string;
          kind: string;
          rendered_text: string;
          signature_paths: string[];
          signed_at: string;
          template_version: string;
          valid_until: string | null;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          buyer_id?: string | null;
          content_sha256: string;
          created_at?: string;
          created_by?: string | null;
          fields: NonNullable<Json>;
          id?: string;
          kind: string;
          rendered_text: string;
          signature_paths: string[];
          signed_at?: string;
          template_version: string;
          valid_until?: string | null;
        };
        Update: {
          agency_id?: string;
          buyer_id?: string | null;
          content_sha256?: string;
          created_at?: string;
          created_by?: string | null;
          fields?: NonNullable<Json>;
          id?: string;
          kind?: string;
          rendered_text?: string;
          signature_paths?: string[];
          signed_at?: string;
          template_version?: string;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_documents_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_documents_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'buyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_documents_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_dossier_links: {
        Row: {
          agency_id: string;
          buyer_id: string;
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          selection_id: string;
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          buyer_id: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          selection_id: string;
          token_hash: string;
        };
        Update: {
          agency_id?: string;
          buyer_id?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          selection_id?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_dossier_links_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_dossier_links_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'buyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_dossier_links_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_dossier_links_selection_id_fkey';
            columns: ['selection_id'];
            isOneToOne: false;
            referencedRelation: 'buyer_selections';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_events: {
        Row: {
          agency_id: string;
          buyer_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          kind: string;
          occurred_at: string;
          reason: string | null;
          selection_id: string | null;
          summary: string | null;
          week_start: string | null;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          buyer_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind: string;
          occurred_at?: string;
          reason?: string | null;
          selection_id?: string | null;
          summary?: string | null;
          week_start?: string | null;
        };
        Update: {
          agency_id?: string;
          buyer_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: string;
          occurred_at?: string;
          reason?: string | null;
          selection_id?: string | null;
          summary?: string | null;
          week_start?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_events_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_events_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'buyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_events_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_events_selection_id_fkey';
            columns: ['selection_id'];
            isOneToOne: false;
            referencedRelation: 'buyer_selections';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_item_responses: {
        Row: {
          agency_id: string;
          answer: string;
          answered_at: string;
          answered_during: string;
          buyer_id: string;
          created_at: string;
          id: string;
          reasons: string[];
          selection_item_id: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          answer: string;
          answered_at?: string;
          answered_during: string;
          buyer_id: string;
          created_at?: string;
          id?: string;
          reasons?: string[];
          selection_item_id: string;
        };
        Update: {
          agency_id?: string;
          answer?: string;
          answered_at?: string;
          answered_during?: string;
          buyer_id?: string;
          created_at?: string;
          id?: string;
          reasons?: string[];
          selection_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_item_responses_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_item_responses_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'buyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_item_responses_selection_item_id_fkey';
            columns: ['selection_item_id'];
            isOneToOne: false;
            referencedRelation: 'buyer_selection_items';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_offer_follow_ups: {
        Row: {
          agency_id: string;
          created_at: string;
          document_id: string;
          done_at: string;
          done_by: string | null;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          document_id: string;
          done_at?: string;
          done_by?: string | null;
          id?: string;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          document_id?: string;
          done_at?: string;
          done_by?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_offer_follow_ups_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_offer_follow_ups_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: true;
            referencedRelation: 'buyer_documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_offer_follow_ups_done_by_fkey';
            columns: ['done_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_proposals: {
        Row: {
          agency_id: string;
          buyer_id: string;
          created_at: string;
          id: string;
          label: string;
          origin: string;
          project_id: string | null;
          property_key: string;
          reference: string;
          selection_item_id: string | null;
          sent_at: string;
          sent_by: string | null;
          source: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          buyer_id: string;
          created_at?: string;
          id?: string;
          label: string;
          origin: string;
          project_id?: string | null;
          property_key: string;
          reference: string;
          selection_item_id?: string | null;
          sent_at?: string;
          sent_by?: string | null;
          source: string;
        };
        Update: {
          agency_id?: string;
          buyer_id?: string;
          created_at?: string;
          id?: string;
          label?: string;
          origin?: string;
          project_id?: string | null;
          property_key?: string;
          reference?: string;
          selection_item_id?: string | null;
          sent_at?: string;
          sent_by?: string | null;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_proposals_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_proposals_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'buyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_proposals_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_proposals_selection_item_id_fkey';
            columns: ['selection_item_id'];
            isOneToOne: false;
            referencedRelation: 'buyer_selection_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_proposals_sent_by_fkey';
            columns: ['sent_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_prospect_origins: {
        Row: {
          agency_id: string;
          buyer_id: string;
          comparable_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          letter_body: string | null;
          letter_contact_hook: string | null;
          letter_question: string | null;
          letter_saved_at: string | null;
          letter_saved_by: string | null;
          letter_title: string | null;
          letter_version: string | null;
          prospect_id: string | null;
          selection_item_id: string;
          their_photo_mode: string | null;
          their_photo_path: string | null;
          their_photo_source_url: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          buyer_id: string;
          comparable_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          letter_body?: string | null;
          letter_contact_hook?: string | null;
          letter_question?: string | null;
          letter_saved_at?: string | null;
          letter_saved_by?: string | null;
          letter_title?: string | null;
          letter_version?: string | null;
          prospect_id?: string | null;
          selection_item_id: string;
          their_photo_mode?: string | null;
          their_photo_path?: string | null;
          their_photo_source_url?: string | null;
          updated_at?: string;
        };
        Update: {
          agency_id?: string;
          buyer_id?: string;
          comparable_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          letter_body?: string | null;
          letter_contact_hook?: string | null;
          letter_question?: string | null;
          letter_saved_at?: string | null;
          letter_saved_by?: string | null;
          letter_title?: string | null;
          letter_version?: string | null;
          prospect_id?: string | null;
          selection_item_id?: string;
          their_photo_mode?: string | null;
          their_photo_path?: string | null;
          their_photo_source_url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_prospect_origins_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_prospect_origins_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'buyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_prospect_origins_comparable_id_fkey';
            columns: ['comparable_id'];
            isOneToOne: false;
            referencedRelation: 'comparables';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_prospect_origins_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_prospect_origins_letter_saved_by_fkey';
            columns: ['letter_saved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_prospect_origins_prospect_id_fkey';
            columns: ['prospect_id'];
            isOneToOne: false;
            referencedRelation: 'buyer_prospects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_prospect_origins_selection_item_id_fkey';
            columns: ['selection_item_id'];
            isOneToOne: true;
            referencedRelation: 'buyer_selection_items';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_prospects: {
        Row: {
          agency_id: string;
          created_at: string;
          created_by: string | null;
          exclusivity: string | null;
          exclusivity_source: string | null;
          facts: NonNullable<Json>;
          id: string;
          listing_key: string;
          listing_url: string;
          locator_address: string | null;
          locator_address_at: string | null;
          locator_analyzed_at: string | null;
          locator_confirmed: boolean | null;
          locator_label: string | null;
          locator_label_key: string | null;
          locator_latitude: number | null;
          locator_longitude: number | null;
          locator_property_id: string | null;
          locator_purged_at: string | null;
          locator_source: string | null;
          locator_state: string | null;
          prospecting_collaboration_at: string | null;
          prospecting_collaboration_declined_at: string | null;
          prospecting_declined_at: string | null;
          prospecting_handed_at: string | null;
          prospecting_mandate_at: string | null;
          prospecting_meeting_at: string | null;
          sold_by: string | null;
          sold_by_source: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          created_by?: string | null;
          exclusivity?: string | null;
          exclusivity_source?: string | null;
          facts?: NonNullable<Json>;
          id?: string;
          listing_key: string;
          listing_url: string;
          locator_address?: string | null;
          locator_address_at?: string | null;
          locator_analyzed_at?: string | null;
          locator_confirmed?: boolean | null;
          locator_label?: string | null;
          locator_label_key?: string | null;
          locator_latitude?: number | null;
          locator_longitude?: number | null;
          locator_property_id?: string | null;
          locator_purged_at?: string | null;
          locator_source?: string | null;
          locator_state?: string | null;
          prospecting_collaboration_at?: string | null;
          prospecting_collaboration_declined_at?: string | null;
          prospecting_declined_at?: string | null;
          prospecting_handed_at?: string | null;
          prospecting_mandate_at?: string | null;
          prospecting_meeting_at?: string | null;
          sold_by?: string | null;
          sold_by_source?: string | null;
          updated_at?: string;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          created_by?: string | null;
          exclusivity?: string | null;
          exclusivity_source?: string | null;
          facts?: NonNullable<Json>;
          id?: string;
          listing_key?: string;
          listing_url?: string;
          locator_address?: string | null;
          locator_address_at?: string | null;
          locator_analyzed_at?: string | null;
          locator_confirmed?: boolean | null;
          locator_label?: string | null;
          locator_label_key?: string | null;
          locator_latitude?: number | null;
          locator_longitude?: number | null;
          locator_property_id?: string | null;
          locator_purged_at?: string | null;
          locator_source?: string | null;
          locator_state?: string | null;
          prospecting_collaboration_at?: string | null;
          prospecting_collaboration_declined_at?: string | null;
          prospecting_declined_at?: string | null;
          prospecting_handed_at?: string | null;
          prospecting_mandate_at?: string | null;
          prospecting_meeting_at?: string | null;
          sold_by?: string | null;
          sold_by_source?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_prospects_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_prospects_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_selection_items: {
        Row: {
          agency_id: string;
          category: string | null;
          created_at: string;
          dossier_hide_photo: boolean;
          gaps: string[];
          id: string;
          imported: Json | null;
          label: string;
          listed_price: number | null;
          pitch: string | null;
          position: number;
          price_seen_on: string | null;
          reference: string;
          removed_at: string | null;
          selection_id: string;
          snapshot: Json | null;
          source: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          category?: string | null;
          created_at?: string;
          dossier_hide_photo?: boolean;
          gaps?: string[];
          id?: string;
          imported?: Json | null;
          label: string;
          listed_price?: number | null;
          pitch?: string | null;
          position: number;
          price_seen_on?: string | null;
          reference: string;
          removed_at?: string | null;
          selection_id: string;
          snapshot?: Json | null;
          source: string;
        };
        Update: {
          agency_id?: string;
          category?: string | null;
          created_at?: string;
          dossier_hide_photo?: boolean;
          gaps?: string[];
          id?: string;
          imported?: Json | null;
          label?: string;
          listed_price?: number | null;
          pitch?: string | null;
          position?: number;
          price_seen_on?: string | null;
          reference?: string;
          removed_at?: string | null;
          selection_id?: string;
          snapshot?: Json | null;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_selection_items_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_selection_items_selection_id_fkey';
            columns: ['selection_id'];
            isOneToOne: false;
            referencedRelation: 'buyer_selections';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_selections: {
        Row: {
          agency_id: string;
          buyer_id: string;
          buyer_words: string | null;
          created_at: string;
          created_by: string | null;
          dossier_availability: string[];
          id: string;
          presented_at: string | null;
          presented_deck: Json | null;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          buyer_id: string;
          buyer_words?: string | null;
          created_at?: string;
          created_by?: string | null;
          dossier_availability?: string[];
          id?: string;
          presented_at?: string | null;
          presented_deck?: Json | null;
        };
        Update: {
          agency_id?: string;
          buyer_id?: string;
          buyer_words?: string | null;
          created_at?: string;
          created_by?: string | null;
          dossier_availability?: string[];
          id?: string;
          presented_at?: string | null;
          presented_deck?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_selections_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_selections_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'buyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_selections_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_visit_requests: {
        Row: {
          agency_id: string;
          availability: string[];
          buyer_id: string;
          buyer_selection_item_id: string;
          cancelled_at: string | null;
          created_at: string;
          disliked: string[];
          feedback: string | null;
          id: string;
          liked: string[];
          next_step: string | null;
          opinion: string | null;
          outcome: string;
          requested_at: string;
          requested_during: string;
          scheduled_at: string | null;
          visited_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          availability?: string[];
          buyer_id: string;
          buyer_selection_item_id: string;
          cancelled_at?: string | null;
          created_at?: string;
          disliked?: string[];
          feedback?: string | null;
          id?: string;
          liked?: string[];
          next_step?: string | null;
          opinion?: string | null;
          outcome?: string;
          requested_at?: string;
          requested_during: string;
          scheduled_at?: string | null;
          visited_at?: string | null;
        };
        Update: {
          agency_id?: string;
          availability?: string[];
          buyer_id?: string;
          buyer_selection_item_id?: string;
          cancelled_at?: string | null;
          created_at?: string;
          disliked?: string[];
          feedback?: string | null;
          id?: string;
          liked?: string[];
          next_step?: string | null;
          opinion?: string | null;
          outcome?: string;
          requested_at?: string;
          requested_during?: string;
          scheduled_at?: string | null;
          visited_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_visit_requests_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_visit_requests_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'buyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_visit_requests_buyer_selection_item_id_fkey';
            columns: ['buyer_selection_item_id'];
            isOneToOne: false;
            referencedRelation: 'buyer_selection_items';
            referencedColumns: ['id'];
          },
        ];
      };
      buyer_watch_runs: {
        Row: {
          adverts: number;
          agency_id: string;
          buyer_id: string;
          created_at: string;
          finds: NonNullable<Json>;
          found_count: number;
          id: string;
          ran_at: string;
          seen_since: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          adverts?: number;
          agency_id: string;
          buyer_id: string;
          created_at?: string;
          finds?: NonNullable<Json>;
          found_count?: number;
          id?: string;
          ran_at?: string;
          seen_since: string;
          status?: string;
        };
        Update: {
          adverts?: number;
          agency_id?: string;
          buyer_id?: string;
          created_at?: string;
          finds?: NonNullable<Json>;
          found_count?: number;
          id?: string;
          ran_at?: string;
          seen_since?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'buyer_watch_runs_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyer_watch_runs_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'buyers';
            referencedColumns: ['id'];
          },
        ];
      };
      buyers: {
        Row: {
          advisor_id: string;
          agency_id: string;
          archived_at: string | null;
          bedrooms_min: number | null;
          budget_ideal: number | null;
          budget_max: number | null;
          cities: string[];
          condominium_accepted: boolean | null;
          condominium_must_have: boolean;
          contacted_at: string | null;
          created_at: string;
          deal_breakers: string | null;
          demo: boolean;
          elevator: boolean | null;
          email: string | null;
          energy_rating_max: string | null;
          fields_to_verify: string[];
          financing: string;
          financing_changed_at: string | null;
          floor_min: number | null;
          id: string;
          ignored_suggestions: string[];
          language: string;
          must_have: string[];
          name: string;
          notes: string | null;
          outdoor: boolean | null;
          parking: boolean | null;
          phone: string | null;
          pool: boolean | null;
          property_types: string[];
          purpose: string | null;
          rooms_min: number | null;
          soft_criteria: NonNullable<Json>;
          status: string;
          status_changed_at: string;
          surface_min: number | null;
          timeline: string | null;
          updated_at: string;
          works_accepted: boolean | null;
        };
        ComputedFields: never;
        Insert: {
          advisor_id: string;
          agency_id: string;
          archived_at?: string | null;
          bedrooms_min?: number | null;
          budget_ideal?: number | null;
          budget_max?: number | null;
          cities: string[];
          condominium_accepted?: boolean | null;
          condominium_must_have?: boolean;
          contacted_at?: string | null;
          created_at?: string;
          deal_breakers?: string | null;
          demo?: boolean;
          elevator?: boolean | null;
          email?: string | null;
          energy_rating_max?: string | null;
          fields_to_verify?: string[];
          financing?: string;
          financing_changed_at?: string | null;
          floor_min?: number | null;
          id?: string;
          ignored_suggestions?: string[];
          language?: string;
          must_have?: string[];
          name: string;
          notes?: string | null;
          outdoor?: boolean | null;
          parking?: boolean | null;
          phone?: string | null;
          pool?: boolean | null;
          property_types?: string[];
          purpose?: string | null;
          rooms_min?: number | null;
          soft_criteria?: NonNullable<Json>;
          status?: string;
          status_changed_at?: string;
          surface_min?: number | null;
          timeline?: string | null;
          updated_at?: string;
          works_accepted?: boolean | null;
        };
        Update: {
          advisor_id?: string;
          agency_id?: string;
          archived_at?: string | null;
          bedrooms_min?: number | null;
          budget_ideal?: number | null;
          budget_max?: number | null;
          cities?: string[];
          condominium_accepted?: boolean | null;
          condominium_must_have?: boolean;
          contacted_at?: string | null;
          created_at?: string;
          deal_breakers?: string | null;
          demo?: boolean;
          elevator?: boolean | null;
          email?: string | null;
          energy_rating_max?: string | null;
          fields_to_verify?: string[];
          financing?: string;
          financing_changed_at?: string | null;
          floor_min?: number | null;
          id?: string;
          ignored_suggestions?: string[];
          language?: string;
          must_have?: string[];
          name?: string;
          notes?: string | null;
          outdoor?: boolean | null;
          parking?: boolean | null;
          phone?: string | null;
          pool?: boolean | null;
          property_types?: string[];
          purpose?: string | null;
          rooms_min?: number | null;
          soft_criteria?: NonNullable<Json>;
          status?: string;
          status_changed_at?: string;
          surface_min?: number | null;
          timeline?: string | null;
          updated_at?: string;
          works_accepted?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'buyers_advisor_id_fkey';
            columns: ['advisor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buyers_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
        ];
      };
      comparables: {
        Row: {
          address: string | null;
          advisor_notes: string | null;
          agency_id: string;
          bathrooms_count: number | null;
          bedrooms_count: number | null;
          city: string | null;
          construction_year: number | null;
          created_at: string;
          days_on_market: number | null;
          display_order: number;
          district: string | null;
          energy_rating: string | null;
          energy_source: string | null;
          excluded_from_live: boolean;
          exclusivity: string | null;
          exclusivity_source: string | null;
          exposure: string | null;
          fields_to_verify: string[];
          first_seen_on: string | null;
          general_condition: string | null;
          ges_rating: string | null;
          heating_type: string | null;
          id: string;
          imported_from_search: boolean;
          is_selected: boolean;
          land_area: number | null;
          listing_description: string | null;
          listing_features: NonNullable<Json>;
          listing_gone_at: string | null;
          listing_published_at: string | null;
          listing_url: string | null;
          listing_withdrawn: boolean;
          locator_address: string | null;
          locator_address_at: string | null;
          locator_analyzed_at: string | null;
          locator_confirmed: boolean | null;
          locator_label: string | null;
          locator_label_key: string | null;
          locator_latitude: number | null;
          locator_longitude: number | null;
          locator_property_id: string | null;
          locator_purged_at: string | null;
          locator_source: string | null;
          locator_state: string | null;
          meeting_days_on_market: number | null;
          meeting_frozen_at: string | null;
          meeting_price: number | null;
          meeting_price_source: string | null;
          outdoor_spaces: string[];
          parking_types: string[];
          photo_urls: NonNullable<Json>;
          portal_price_per_square_meter: number | null;
          postal_code: string | null;
          price: number;
          price_drop_amount: number | null;
          price_drop_percentage: number | null;
          project_id: string;
          property_type: string | null;
          prospecting_collaboration_at: string | null;
          prospecting_collaboration_declined_at: string | null;
          prospecting_declined_at: string | null;
          prospecting_handed_at: string | null;
          prospecting_mandate_at: string | null;
          prospecting_meeting_at: string | null;
          rooms_count: number | null;
          sold_by: string | null;
          sold_by_source: string | null;
          source: string | null;
          surface_area: number | null;
          synthesis_hide_photo: boolean;
          title: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          advisor_notes?: string | null;
          agency_id: string;
          bathrooms_count?: number | null;
          bedrooms_count?: number | null;
          city?: string | null;
          construction_year?: number | null;
          created_at?: string;
          days_on_market?: number | null;
          display_order: number;
          district?: string | null;
          energy_rating?: string | null;
          energy_source?: string | null;
          excluded_from_live?: boolean;
          exclusivity?: string | null;
          exclusivity_source?: string | null;
          exposure?: string | null;
          fields_to_verify?: string[];
          first_seen_on?: string | null;
          general_condition?: string | null;
          ges_rating?: string | null;
          heating_type?: string | null;
          id?: string;
          imported_from_search?: boolean;
          is_selected?: boolean;
          land_area?: number | null;
          listing_description?: string | null;
          listing_features?: NonNullable<Json>;
          listing_gone_at?: string | null;
          listing_published_at?: string | null;
          listing_url?: string | null;
          listing_withdrawn?: boolean;
          locator_address?: string | null;
          locator_address_at?: string | null;
          locator_analyzed_at?: string | null;
          locator_confirmed?: boolean | null;
          locator_label?: string | null;
          locator_label_key?: string | null;
          locator_latitude?: number | null;
          locator_longitude?: number | null;
          locator_property_id?: string | null;
          locator_purged_at?: string | null;
          locator_source?: string | null;
          locator_state?: string | null;
          meeting_days_on_market?: number | null;
          meeting_frozen_at?: string | null;
          meeting_price?: number | null;
          meeting_price_source?: string | null;
          outdoor_spaces?: string[];
          parking_types?: string[];
          photo_urls?: NonNullable<Json>;
          portal_price_per_square_meter?: number | null;
          postal_code?: string | null;
          price: number;
          price_drop_amount?: number | null;
          price_drop_percentage?: number | null;
          project_id: string;
          property_type?: string | null;
          prospecting_collaboration_at?: string | null;
          prospecting_collaboration_declined_at?: string | null;
          prospecting_declined_at?: string | null;
          prospecting_handed_at?: string | null;
          prospecting_mandate_at?: string | null;
          prospecting_meeting_at?: string | null;
          rooms_count?: number | null;
          sold_by?: string | null;
          sold_by_source?: string | null;
          source?: string | null;
          surface_area?: number | null;
          synthesis_hide_photo?: boolean;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          advisor_notes?: string | null;
          agency_id?: string;
          bathrooms_count?: number | null;
          bedrooms_count?: number | null;
          city?: string | null;
          construction_year?: number | null;
          created_at?: string;
          days_on_market?: number | null;
          display_order?: number;
          district?: string | null;
          energy_rating?: string | null;
          energy_source?: string | null;
          excluded_from_live?: boolean;
          exclusivity?: string | null;
          exclusivity_source?: string | null;
          exposure?: string | null;
          fields_to_verify?: string[];
          first_seen_on?: string | null;
          general_condition?: string | null;
          ges_rating?: string | null;
          heating_type?: string | null;
          id?: string;
          imported_from_search?: boolean;
          is_selected?: boolean;
          land_area?: number | null;
          listing_description?: string | null;
          listing_features?: NonNullable<Json>;
          listing_gone_at?: string | null;
          listing_published_at?: string | null;
          listing_url?: string | null;
          listing_withdrawn?: boolean;
          locator_address?: string | null;
          locator_address_at?: string | null;
          locator_analyzed_at?: string | null;
          locator_confirmed?: boolean | null;
          locator_label?: string | null;
          locator_label_key?: string | null;
          locator_latitude?: number | null;
          locator_longitude?: number | null;
          locator_property_id?: string | null;
          locator_purged_at?: string | null;
          locator_source?: string | null;
          locator_state?: string | null;
          meeting_days_on_market?: number | null;
          meeting_frozen_at?: string | null;
          meeting_price?: number | null;
          meeting_price_source?: string | null;
          outdoor_spaces?: string[];
          parking_types?: string[];
          photo_urls?: NonNullable<Json>;
          portal_price_per_square_meter?: number | null;
          postal_code?: string | null;
          price?: number;
          price_drop_amount?: number | null;
          price_drop_percentage?: number | null;
          project_id?: string;
          property_type?: string | null;
          prospecting_collaboration_at?: string | null;
          prospecting_collaboration_declined_at?: string | null;
          prospecting_declined_at?: string | null;
          prospecting_handed_at?: string | null;
          prospecting_mandate_at?: string | null;
          prospecting_meeting_at?: string | null;
          rooms_count?: number | null;
          sold_by?: string | null;
          sold_by_source?: string | null;
          source?: string | null;
          surface_area?: number | null;
          synthesis_hide_photo?: boolean;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comparables_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparables_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      competitor_decisions: {
        Row: {
          agency_id: string;
          city: string | null;
          comment: string | null;
          created_at: string;
          decision: string;
          district: string | null;
          id: string;
          listing_host: string;
          listing_url: string;
          price: number | null;
          project_id: string;
          property_type: string | null;
          reason: string | null;
          rooms_count: number | null;
          surface_area: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          city?: string | null;
          comment?: string | null;
          created_at?: string;
          decision: string;
          district?: string | null;
          id?: string;
          listing_host: string;
          listing_url: string;
          price?: number | null;
          project_id: string;
          property_type?: string | null;
          reason?: string | null;
          rooms_count?: number | null;
          surface_area?: number | null;
          updated_at?: string;
        };
        Update: {
          agency_id?: string;
          city?: string | null;
          comment?: string | null;
          created_at?: string;
          decision?: string;
          district?: string | null;
          id?: string;
          listing_host?: string;
          listing_url?: string;
          price?: number | null;
          project_id?: string;
          property_type?: string | null;
          reason?: string | null;
          rooms_count?: number | null;
          surface_area?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'competitor_decisions_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'competitor_decisions_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      competitor_listing_copies: {
        Row: {
          agency_id: string;
          captured_at: string;
          comparable_id: string;
          created_at: string;
          facts: NonNullable<Json>;
          id: string;
          listing_key: string | null;
          photo_urls: NonNullable<Json>;
          portal: string | null;
          price: number;
          project_id: string;
          source: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          captured_at?: string;
          comparable_id: string;
          created_at?: string;
          facts?: NonNullable<Json>;
          id?: string;
          listing_key?: string | null;
          photo_urls?: NonNullable<Json>;
          portal?: string | null;
          price: number;
          project_id: string;
          source: string;
        };
        Update: {
          agency_id?: string;
          captured_at?: string;
          comparable_id?: string;
          created_at?: string;
          facts?: NonNullable<Json>;
          id?: string;
          listing_key?: string | null;
          photo_urls?: NonNullable<Json>;
          portal?: string | null;
          price?: number;
          project_id?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'competitor_listing_copies_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'competitor_listing_copies_comparable_id_fkey';
            columns: ['comparable_id'];
            isOneToOne: true;
            referencedRelation: 'comparables';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'competitor_listing_copies_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      competitor_prospecting_files: {
        Row: {
          agency_id: string;
          comparable_id: string;
          contact_hook: string | null;
          created_at: string;
          id: string;
          key_message: string | null;
          letter: string | null;
          photo_path: string | null;
          project_id: string;
          proposal_1: string | null;
          proposal_2: string | null;
          proposal_3: string | null;
          show_prices: boolean | null;
          their_photo_mode: string | null;
          their_photo_path: string | null;
          their_photo_source_url: string | null;
          title: string | null;
          updated_at: string;
          updated_by: string | null;
          version: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          comparable_id: string;
          contact_hook?: string | null;
          created_at?: string;
          id?: string;
          key_message?: string | null;
          letter?: string | null;
          photo_path?: string | null;
          project_id: string;
          proposal_1?: string | null;
          proposal_2?: string | null;
          proposal_3?: string | null;
          show_prices?: boolean | null;
          their_photo_mode?: string | null;
          their_photo_path?: string | null;
          their_photo_source_url?: string | null;
          title?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version: string;
        };
        Update: {
          agency_id?: string;
          comparable_id?: string;
          contact_hook?: string | null;
          created_at?: string;
          id?: string;
          key_message?: string | null;
          letter?: string | null;
          photo_path?: string | null;
          project_id?: string;
          proposal_1?: string | null;
          proposal_2?: string | null;
          proposal_3?: string | null;
          show_prices?: boolean | null;
          their_photo_mode?: string | null;
          their_photo_path?: string | null;
          their_photo_source_url?: string | null;
          title?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'competitor_prospecting_files_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'competitor_prospecting_files_comparable_id_fkey';
            columns: ['comparable_id'];
            isOneToOne: false;
            referencedRelation: 'comparables';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'competitor_prospecting_files_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'competitor_prospecting_files_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      follow_up_contacts: {
        Row: {
          agency_id: string;
          author_id: string | null;
          contacted_at: string;
          created_at: string;
          id: string;
          next_follow_up_on: string | null;
          note: string | null;
          project_id: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          author_id?: string | null;
          contacted_at?: string;
          created_at?: string;
          id?: string;
          next_follow_up_on?: string | null;
          note?: string | null;
          project_id: string;
        };
        Update: {
          agency_id?: string;
          author_id?: string | null;
          contacted_at?: string;
          created_at?: string;
          id?: string;
          next_follow_up_on?: string | null;
          note?: string | null;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'follow_up_contacts_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follow_up_contacts_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follow_up_contacts_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      listing_observations: {
        Row: {
          agency_id: string;
          canonical_url: string;
          created_at: string;
          id: string;
          listing_key: string;
          modified_at: string | null;
          observed_on: string;
          portal: string;
          price: number;
          price_per_square_meter: number | null;
          published_at: string | null;
          published_bound_label: string | null;
          published_lower_bound_at: string | null;
          secondary_id: string | null;
          view_count: number | null;
          view_count_since: string | null;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          canonical_url: string;
          created_at?: string;
          id?: string;
          listing_key: string;
          modified_at?: string | null;
          observed_on?: string;
          portal: string;
          price: number;
          price_per_square_meter?: number | null;
          published_at?: string | null;
          published_bound_label?: string | null;
          published_lower_bound_at?: string | null;
          secondary_id?: string | null;
          view_count?: number | null;
          view_count_since?: string | null;
        };
        Update: {
          agency_id?: string;
          canonical_url?: string;
          created_at?: string;
          id?: string;
          listing_key?: string;
          modified_at?: string | null;
          observed_on?: string;
          portal?: string;
          price?: number;
          price_per_square_meter?: number | null;
          published_at?: string | null;
          published_bound_label?: string | null;
          published_lower_bound_at?: string | null;
          secondary_id?: string | null;
          view_count?: number | null;
          view_count_since?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'listing_observations_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
        ];
      };
      live_reopenings: {
        Row: {
          agency_id: string;
          created_at: string;
          erased: NonNullable<Json>;
          id: string;
          operator_email: string;
          operator_id: string | null;
          project_id: string;
          reason: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          erased: NonNullable<Json>;
          id?: string;
          operator_email: string;
          operator_id?: string | null;
          project_id: string;
          reason: string;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          erased?: NonNullable<Json>;
          id?: string;
          operator_email?: string;
          operator_id?: string | null;
          project_id?: string;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'live_reopenings_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'live_reopenings_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      live_seller_responses: {
        Row: {
          agency_id: string;
          comparable_id: string | null;
          created_at: string;
          id: string;
          project_id: string;
          revealed_listing_price: number | null;
          seller_estimated_days_on_market: number | null;
          seller_estimated_listing_price: number | null;
          seller_market_duration_comment: string | null;
          seller_market_duration_reason: string | null;
          seller_price_coherence: string | null;
          seller_price_coherence_comment: string | null;
          seller_serious_competitor: string | null;
          seller_serious_competitor_comment: string | null;
          shown_directly_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          comparable_id?: string | null;
          created_at?: string;
          id?: string;
          project_id: string;
          revealed_listing_price?: number | null;
          seller_estimated_days_on_market?: number | null;
          seller_estimated_listing_price?: number | null;
          seller_market_duration_comment?: string | null;
          seller_market_duration_reason?: string | null;
          seller_price_coherence?: string | null;
          seller_price_coherence_comment?: string | null;
          seller_serious_competitor?: string | null;
          seller_serious_competitor_comment?: string | null;
          shown_directly_at?: string | null;
          updated_at?: string;
        };
        Update: {
          agency_id?: string;
          comparable_id?: string | null;
          created_at?: string;
          id?: string;
          project_id?: string;
          revealed_listing_price?: number | null;
          seller_estimated_days_on_market?: number | null;
          seller_estimated_listing_price?: number | null;
          seller_market_duration_comment?: string | null;
          seller_market_duration_reason?: string | null;
          seller_price_coherence?: string | null;
          seller_price_coherence_comment?: string | null;
          seller_serious_competitor?: string | null;
          seller_serious_competitor_comment?: string | null;
          shown_directly_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'live_seller_responses_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'live_seller_responses_comparable_id_fkey';
            columns: ['comparable_id'];
            isOneToOne: false;
            referencedRelation: 'comparables';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'live_seller_responses_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      live_seller_summary: {
        Row: {
          advisor_closest_comparable_id: string | null;
          agency_id: string;
          buyers_shown_at: string | null;
          buyers_shown_count: number | null;
          created_at: string;
          id: string;
          project_id: string;
          seller_launch_readiness_first: number | null;
          seller_launch_readiness_last: number | null;
          seller_launch_readiness_missing: string | null;
          seller_most_dangerous_comment: string | null;
          seller_most_dangerous_comparable_id: string | null;
          seller_most_dangerous_reason: string | null;
          seller_perceived_property_price: number | null;
          seller_property_comment: string | null;
          seller_property_confirmed: string | null;
          seller_revised_property_price: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          advisor_closest_comparable_id?: string | null;
          agency_id: string;
          buyers_shown_at?: string | null;
          buyers_shown_count?: number | null;
          created_at?: string;
          id?: string;
          project_id: string;
          seller_launch_readiness_first?: number | null;
          seller_launch_readiness_last?: number | null;
          seller_launch_readiness_missing?: string | null;
          seller_most_dangerous_comment?: string | null;
          seller_most_dangerous_comparable_id?: string | null;
          seller_most_dangerous_reason?: string | null;
          seller_perceived_property_price?: number | null;
          seller_property_comment?: string | null;
          seller_property_confirmed?: string | null;
          seller_revised_property_price?: number | null;
          updated_at?: string;
        };
        Update: {
          advisor_closest_comparable_id?: string | null;
          agency_id?: string;
          buyers_shown_at?: string | null;
          buyers_shown_count?: number | null;
          created_at?: string;
          id?: string;
          project_id?: string;
          seller_launch_readiness_first?: number | null;
          seller_launch_readiness_last?: number | null;
          seller_launch_readiness_missing?: string | null;
          seller_most_dangerous_comment?: string | null;
          seller_most_dangerous_comparable_id?: string | null;
          seller_most_dangerous_reason?: string | null;
          seller_perceived_property_price?: number | null;
          seller_property_comment?: string | null;
          seller_property_confirmed?: string | null;
          seller_revised_property_price?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'live_seller_summary_advisor_closest_comparable_id_fkey';
            columns: ['advisor_closest_comparable_id'];
            isOneToOne: false;
            referencedRelation: 'comparables';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'live_seller_summary_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'live_seller_summary_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: true;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'live_seller_summary_seller_most_dangerous_comparable_id_fkey';
            columns: ['seller_most_dangerous_comparable_id'];
            isOneToOne: false;
            referencedRelation: 'comparables';
            referencedColumns: ['id'];
          },
        ];
      };
      market_study_links: {
        Row: {
          agency_id: string;
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          project_id: string;
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          project_id: string;
          token_hash: string;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          project_id?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'market_study_links_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_study_links_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_study_links_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      pending_competitor_imports: {
        Row: {
          agency_id: string;
          attempts: number;
          created_at: string;
          created_by: string | null;
          id: string;
          last_cause: string | null;
          listing_host: string;
          listing_url: string;
          project_id: string;
          snapshot: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          attempts?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          last_cause?: string | null;
          listing_host: string;
          listing_url: string;
          project_id: string;
          snapshot: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          agency_id?: string;
          attempts?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          last_cause?: string | null;
          listing_host?: string;
          listing_url?: string;
          project_id?: string;
          snapshot?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pending_competitor_imports_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pending_competitor_imports_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pending_competitor_imports_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      portal_place_ids: {
        Row: {
          city_key: string;
          city_label: string;
          created_at: string;
          id: string;
          learned_by: string | null;
          place_id: string;
          portal: string;
          source_url: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          city_key: string;
          city_label: string;
          created_at?: string;
          id?: string;
          learned_by?: string | null;
          place_id: string;
          portal: string;
          source_url: string;
          updated_at?: string;
        };
        Update: {
          city_key?: string;
          city_label?: string;
          created_at?: string;
          id?: string;
          learned_by?: string | null;
          place_id?: string;
          portal?: string;
          source_url?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'portal_place_ids_learned_by_fkey';
            columns: ['learned_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          agency_id: string;
          created_at: string;
          email: string;
          expert_mode: boolean;
          first_name: string;
          id: string;
          last_name: string;
          phone: string | null;
          photo_path: string | null;
          removed_at: string | null;
          role: string;
          search_defaults: Json | null;
          updated_at: string;
          workspace_mode: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          email: string;
          expert_mode?: boolean;
          first_name: string;
          id: string;
          last_name: string;
          phone?: string | null;
          photo_path?: string | null;
          removed_at?: string | null;
          role: string;
          search_defaults?: Json | null;
          updated_at?: string;
          workspace_mode?: string;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          email?: string;
          expert_mode?: boolean;
          first_name?: string;
          id?: string;
          last_name?: string;
          phone?: string | null;
          photo_path?: string | null;
          removed_at?: string | null;
          role?: string;
          search_defaults?: Json | null;
          updated_at?: string;
          workspace_mode?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
        ];
      };
      project_academia_requests: {
        Row: {
          academia_id: string;
          address_sent: string;
          agency_id: string;
          created_at: string;
          id: string;
          link_expires_at: string | null;
          link_url: string | null;
          project_id: string;
          property_address: string;
          requested_at: string;
          requested_by: string | null;
          state: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          academia_id: string;
          address_sent: string;
          agency_id: string;
          created_at?: string;
          id?: string;
          link_expires_at?: string | null;
          link_url?: string | null;
          project_id: string;
          property_address: string;
          requested_at?: string;
          requested_by?: string | null;
          state: string;
          updated_at?: string;
        };
        Update: {
          academia_id?: string;
          address_sent?: string;
          agency_id?: string;
          created_at?: string;
          id?: string;
          link_expires_at?: string | null;
          link_url?: string | null;
          project_id?: string;
          property_address?: string;
          requested_at?: string;
          requested_by?: string | null;
          state?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_academia_requests_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_academia_requests_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: true;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_academia_requests_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      project_market_update_links: {
        Row: {
          agency_id: string;
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          project_id: string;
          token_hash: string;
          update_id: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          project_id: string;
          token_hash: string;
          update_id: string;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          project_id?: string;
          token_hash?: string;
          update_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_market_update_links_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_market_update_links_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_market_update_links_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_market_update_links_update_id_fkey';
            columns: ['update_id'];
            isOneToOne: false;
            referencedRelation: 'project_market_updates';
            referencedColumns: ['id'];
          },
        ];
      };
      project_market_updates: {
        Row: {
          agency_id: string;
          created_at: string;
          id: string;
          made_at: string;
          made_by: string | null;
          project_id: string;
          summary: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          id?: string;
          made_at?: string;
          made_by?: string | null;
          project_id: string;
          summary?: NonNullable<Json>;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          id?: string;
          made_at?: string;
          made_by?: string | null;
          project_id?: string;
          summary?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: 'project_market_updates_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_market_updates_made_by_fkey';
            columns: ['made_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_market_updates_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      project_meeting_conclusions: {
        Row: {
          agency_id: string;
          commercialization_price: number | null;
          concluded_at: string | null;
          created_at: string;
          early_follow_up_kept_at: string | null;
          early_follow_up_kept_ready: number | null;
          fees_amount: number | null;
          fees_paid_by: string | null;
          first_outcome: string | null;
          follow_up_motive: string | null;
          follow_up_motive_detail: string | null;
          follow_up_reason: string | null;
          frozen_advisor_analysis: number | null;
          frozen_advisor_price: number | null;
          frozen_exploitable_competitors: number | null;
          frozen_launch_readiness_first: number | null;
          frozen_launch_readiness_last: number | null;
          frozen_launch_readiness_missing: string | null;
          frozen_market_computed: number | null;
          frozen_meeting_duration_seconds: number | null;
          frozen_retained_competitors: number | null;
          frozen_seller_perceived_price: number | null;
          frozen_seller_wanted_price: number | null;
          id: string;
          mandate_number: string | null;
          mandate_type: string | null;
          next_follow_up_on: string | null;
          objection_note: string | null;
          objections: string[];
          outcome: string | null;
          outcome_changed_at: string;
          project_id: string;
          signed_at: string | null;
          updated_at: string;
          went_through_follow_up: boolean;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          commercialization_price?: number | null;
          concluded_at?: string | null;
          created_at?: string;
          early_follow_up_kept_at?: string | null;
          early_follow_up_kept_ready?: number | null;
          fees_amount?: number | null;
          fees_paid_by?: string | null;
          first_outcome?: string | null;
          follow_up_motive?: string | null;
          follow_up_motive_detail?: string | null;
          follow_up_reason?: string | null;
          frozen_advisor_analysis?: number | null;
          frozen_advisor_price?: number | null;
          frozen_exploitable_competitors?: number | null;
          frozen_launch_readiness_first?: number | null;
          frozen_launch_readiness_last?: number | null;
          frozen_launch_readiness_missing?: string | null;
          frozen_market_computed?: number | null;
          frozen_meeting_duration_seconds?: number | null;
          frozen_retained_competitors?: number | null;
          frozen_seller_perceived_price?: number | null;
          frozen_seller_wanted_price?: number | null;
          id?: string;
          mandate_number?: string | null;
          mandate_type?: string | null;
          next_follow_up_on?: string | null;
          objection_note?: string | null;
          objections?: string[];
          outcome?: string | null;
          outcome_changed_at?: string;
          project_id: string;
          signed_at?: string | null;
          updated_at?: string;
          went_through_follow_up?: boolean;
        };
        Update: {
          agency_id?: string;
          commercialization_price?: number | null;
          concluded_at?: string | null;
          created_at?: string;
          early_follow_up_kept_at?: string | null;
          early_follow_up_kept_ready?: number | null;
          fees_amount?: number | null;
          fees_paid_by?: string | null;
          first_outcome?: string | null;
          follow_up_motive?: string | null;
          follow_up_motive_detail?: string | null;
          follow_up_reason?: string | null;
          frozen_advisor_analysis?: number | null;
          frozen_advisor_price?: number | null;
          frozen_exploitable_competitors?: number | null;
          frozen_launch_readiness_first?: number | null;
          frozen_launch_readiness_last?: number | null;
          frozen_launch_readiness_missing?: string | null;
          frozen_market_computed?: number | null;
          frozen_meeting_duration_seconds?: number | null;
          frozen_retained_competitors?: number | null;
          frozen_seller_perceived_price?: number | null;
          frozen_seller_wanted_price?: number | null;
          id?: string;
          mandate_number?: string | null;
          mandate_type?: string | null;
          next_follow_up_on?: string | null;
          objection_note?: string | null;
          objections?: string[];
          outcome?: string | null;
          outcome_changed_at?: string;
          project_id?: string;
          signed_at?: string | null;
          updated_at?: string;
          went_through_follow_up?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'project_meeting_conclusions_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_meeting_conclusions_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: true;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      project_price_positionings: {
        Row: {
          advisor_comparative_market_price: number | null;
          advisor_price: number;
          agency_id: string;
          calculation_snapshot: NonNullable<Json>;
          confidence_level: string;
          confidence_score: number;
          created_at: string;
          id: string;
          justification: string | null;
          project_id: string;
          range_central: number;
          range_high: number;
          range_low: number;
          seller_price: number | null;
          updated_at: string;
          validated_at: string;
          validated_by: string;
        };
        ComputedFields: never;
        Insert: {
          advisor_comparative_market_price?: number | null;
          advisor_price: number;
          agency_id: string;
          calculation_snapshot: NonNullable<Json>;
          confidence_level: string;
          confidence_score: number;
          created_at?: string;
          id?: string;
          justification?: string | null;
          project_id: string;
          range_central: number;
          range_high: number;
          range_low: number;
          seller_price?: number | null;
          updated_at?: string;
          validated_at?: string;
          validated_by: string;
        };
        Update: {
          advisor_comparative_market_price?: number | null;
          advisor_price?: number;
          agency_id?: string;
          calculation_snapshot?: NonNullable<Json>;
          confidence_level?: string;
          confidence_score?: number;
          created_at?: string;
          id?: string;
          justification?: string | null;
          project_id?: string;
          range_central?: number;
          range_high?: number;
          range_low?: number;
          seller_price?: number | null;
          updated_at?: string;
          validated_at?: string;
          validated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_price_positionings_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_price_positionings_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: true;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_price_positionings_validated_by_fkey';
            columns: ['validated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      projects: {
        Row: {
          academia_living_here_pasted_at: string | null;
          academia_living_here_property: Json | null;
          academia_living_here_url: string | null;
          advisor_id: string;
          agency_id: string;
          created_at: string;
          demo_stage: string | null;
          id: string;
          is_example: boolean;
          language: string;
          listings_checked_at: string | null;
          live_confirmed_at: string | null;
          live_confirmed_by: string | null;
          live_ended_at: string | null;
          live_presentation_mode: string;
          live_rhythm: string;
          live_shortlist_at: string | null;
          live_started_at: string | null;
          search_settings: Json | null;
          seller_email: string | null;
          seller_name: string;
          seller_phone: string | null;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          academia_living_here_pasted_at?: string | null;
          academia_living_here_property?: Json | null;
          academia_living_here_url?: string | null;
          advisor_id: string;
          agency_id: string;
          created_at?: string;
          demo_stage?: string | null;
          id?: string;
          is_example?: boolean;
          language?: string;
          listings_checked_at?: string | null;
          live_confirmed_at?: string | null;
          live_confirmed_by?: string | null;
          live_ended_at?: string | null;
          live_presentation_mode?: string;
          live_rhythm?: string;
          live_shortlist_at?: string | null;
          live_started_at?: string | null;
          search_settings?: Json | null;
          seller_email?: string | null;
          seller_name: string;
          seller_phone?: string | null;
          status: string;
          updated_at?: string;
        };
        Update: {
          academia_living_here_pasted_at?: string | null;
          academia_living_here_property?: Json | null;
          academia_living_here_url?: string | null;
          advisor_id?: string;
          agency_id?: string;
          created_at?: string;
          demo_stage?: string | null;
          id?: string;
          is_example?: boolean;
          language?: string;
          listings_checked_at?: string | null;
          live_confirmed_at?: string | null;
          live_confirmed_by?: string | null;
          live_ended_at?: string | null;
          live_presentation_mode?: string;
          live_rhythm?: string;
          live_shortlist_at?: string | null;
          live_started_at?: string | null;
          search_settings?: Json | null;
          seller_email?: string | null;
          seller_name?: string;
          seller_phone?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_advisor_id_fkey';
            columns: ['advisor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_live_confirmed_by_fkey';
            columns: ['live_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      prospecting_oppositions: {
        Row: {
          address_key: string | null;
          agency_id: string;
          commune_checked_at: string | null;
          commune_typed: string | null;
          commune_unknown: boolean;
          commune_unverified: boolean;
          created_at: string;
          created_by: string | null;
          id: string;
          listing_key: string | null;
          requested_at: string;
          source: string;
        };
        ComputedFields: never;
        Insert: {
          address_key?: string | null;
          agency_id: string;
          commune_checked_at?: string | null;
          commune_typed?: string | null;
          commune_unknown?: boolean;
          commune_unverified?: boolean;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          listing_key?: string | null;
          requested_at?: string;
          source?: string;
        };
        Update: {
          address_key?: string | null;
          agency_id?: string;
          commune_checked_at?: string | null;
          commune_typed?: string | null;
          commune_unknown?: boolean;
          commune_unverified?: boolean;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          listing_key?: string | null;
          requested_at?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prospecting_oppositions_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prospecting_oppositions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      saved_searches: {
        Row: {
          agency_id: string;
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
          settings: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
          settings: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          settings?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'saved_searches_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'saved_searches_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      seller_synthesis_links: {
        Row: {
          agency_id: string;
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          project_id: string;
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          project_id: string;
          token_hash: string;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          project_id?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'seller_synthesis_links_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'seller_synthesis_links_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'seller_synthesis_links_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      stream_estate_results: {
        Row: {
          agency_id: string;
          created_at: string;
          fingerprint: string;
          id: string;
          project_id: string;
          result: NonNullable<Json>;
          saved_by: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          fingerprint: string;
          id?: string;
          project_id: string;
          result: NonNullable<Json>;
          saved_by?: string | null;
          updated_at?: string;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          fingerprint?: string;
          id?: string;
          project_id?: string;
          result?: NonNullable<Json>;
          saved_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'stream_estate_results_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stream_estate_results_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: true;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stream_estate_results_saved_by_fkey';
            columns: ['saved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      stream_estate_usage: {
        Row: {
          adverts: number;
          agency_id: string;
          buyer_id: string | null;
          buyer_watch: boolean;
          created_at: string;
          id: string;
          project_id: string | null;
          reserved: boolean;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          adverts: number;
          agency_id: string;
          buyer_id?: string | null;
          buyer_watch?: boolean;
          created_at?: string;
          id?: string;
          project_id?: string | null;
          reserved?: boolean;
          user_id?: string | null;
        };
        Update: {
          adverts?: number;
          agency_id?: string;
          buyer_id?: string | null;
          buyer_watch?: boolean;
          created_at?: string;
          id?: string;
          project_id?: string | null;
          reserved?: boolean;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'stream_estate_usage_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stream_estate_usage_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'buyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stream_estate_usage_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      subject_properties: {
        Row: {
          address: string | null;
          advisor_price_max: number | null;
          advisor_price_min: number | null;
          agency_id: string;
          bathrooms_count: number | null;
          bedrooms_count: number | null;
          building_floors: number | null;
          city: string | null;
          construction_year: number | null;
          created_at: string;
          description: string | null;
          district: string | null;
          energy_rating: string | null;
          exposure: string | null;
          fields_to_verify: string[];
          floor: number | null;
          general_condition: string | null;
          ges_rating: string | null;
          has_elevator: boolean | null;
          has_pool: boolean | null;
          heating_type: string | null;
          id: string;
          land_area: number | null;
          monthly_charges: number | null;
          outdoor_spaces: string[];
          parking_types: string[];
          photo_urls: Json | null;
          postal_code: string | null;
          project_id: string;
          property_tax: number | null;
          property_type: string | null;
          rooms_count: number | null;
          strengths: string[];
          surface_area: number | null;
          updated_at: string;
          watch_points: string[];
          weaknesses: Json | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          advisor_price_max?: number | null;
          advisor_price_min?: number | null;
          agency_id: string;
          bathrooms_count?: number | null;
          bedrooms_count?: number | null;
          building_floors?: number | null;
          city?: string | null;
          construction_year?: number | null;
          created_at?: string;
          description?: string | null;
          district?: string | null;
          energy_rating?: string | null;
          exposure?: string | null;
          fields_to_verify?: string[];
          floor?: number | null;
          general_condition?: string | null;
          ges_rating?: string | null;
          has_elevator?: boolean | null;
          has_pool?: boolean | null;
          heating_type?: string | null;
          id?: string;
          land_area?: number | null;
          monthly_charges?: number | null;
          outdoor_spaces?: string[];
          parking_types?: string[];
          photo_urls?: Json | null;
          postal_code?: string | null;
          project_id: string;
          property_tax?: number | null;
          property_type?: string | null;
          rooms_count?: number | null;
          strengths?: string[];
          surface_area?: number | null;
          updated_at?: string;
          watch_points?: string[];
          weaknesses?: Json | null;
        };
        Update: {
          address?: string | null;
          advisor_price_max?: number | null;
          advisor_price_min?: number | null;
          agency_id?: string;
          bathrooms_count?: number | null;
          bedrooms_count?: number | null;
          building_floors?: number | null;
          city?: string | null;
          construction_year?: number | null;
          created_at?: string;
          description?: string | null;
          district?: string | null;
          energy_rating?: string | null;
          exposure?: string | null;
          fields_to_verify?: string[];
          floor?: number | null;
          general_condition?: string | null;
          ges_rating?: string | null;
          has_elevator?: boolean | null;
          has_pool?: boolean | null;
          heating_type?: string | null;
          id?: string;
          land_area?: number | null;
          monthly_charges?: number | null;
          outdoor_spaces?: string[];
          parking_types?: string[];
          photo_urls?: Json | null;
          postal_code?: string | null;
          project_id?: string;
          property_tax?: number | null;
          property_type?: string | null;
          rooms_count?: number | null;
          strengths?: string[];
          surface_area?: number | null;
          updated_at?: string;
          watch_points?: string[];
          weaknesses?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'subject_properties_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subject_properties_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: true;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      subject_property_condominiums: {
        Row: {
          agency_id: string;
          annual_charges: number | null;
          created_at: string;
          id: string;
          is_condominium: boolean;
          known_unpaid_charges: boolean | null;
          known_unpaid_charges_amount: number | null;
          last_general_assembly_date: string | null;
          notes: string | null;
          ongoing_procedures: boolean | null;
          planned_works: boolean | null;
          planned_works_details: string | null;
          procedures_details: string | null;
          residential_lots: number | null;
          subject_property_id: string;
          syndic_name: string | null;
          total_lots: number | null;
          updated_at: string;
          voted_works: boolean | null;
          voted_works_details: string | null;
          works_fund: number | null;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          annual_charges?: number | null;
          created_at?: string;
          id?: string;
          is_condominium?: boolean;
          known_unpaid_charges?: boolean | null;
          known_unpaid_charges_amount?: number | null;
          last_general_assembly_date?: string | null;
          notes?: string | null;
          ongoing_procedures?: boolean | null;
          planned_works?: boolean | null;
          planned_works_details?: string | null;
          procedures_details?: string | null;
          residential_lots?: number | null;
          subject_property_id: string;
          syndic_name?: string | null;
          total_lots?: number | null;
          updated_at?: string;
          voted_works?: boolean | null;
          voted_works_details?: string | null;
          works_fund?: number | null;
        };
        Update: {
          agency_id?: string;
          annual_charges?: number | null;
          created_at?: string;
          id?: string;
          is_condominium?: boolean;
          known_unpaid_charges?: boolean | null;
          known_unpaid_charges_amount?: number | null;
          last_general_assembly_date?: string | null;
          notes?: string | null;
          ongoing_procedures?: boolean | null;
          planned_works?: boolean | null;
          planned_works_details?: string | null;
          procedures_details?: string | null;
          residential_lots?: number | null;
          subject_property_id?: string;
          syndic_name?: string | null;
          total_lots?: number | null;
          updated_at?: string;
          voted_works?: boolean | null;
          voted_works_details?: string | null;
          works_fund?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'subject_property_condominiums_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subject_property_condominiums_subject_property_id_fkey';
            columns: ['subject_property_id'];
            isOneToOne: true;
            referencedRelation: 'subject_properties';
            referencedColumns: ['id'];
          },
        ];
      };
      subject_property_diagnostics: {
        Row: {
          agency_id: string;
          asbestos_status: string | null;
          created_at: string;
          diagnostics_completed_at: string | null;
          diagnostics_valid_until: string | null;
          dpe_date: string | null;
          electricity_status: string | null;
          energy_consumption: number | null;
          erp_status: string | null;
          gas_status: string | null;
          ges_emissions: number | null;
          id: string;
          lead_status: string | null;
          notes: string | null;
          subject_property_id: string;
          termites_status: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          asbestos_status?: string | null;
          created_at?: string;
          diagnostics_completed_at?: string | null;
          diagnostics_valid_until?: string | null;
          dpe_date?: string | null;
          electricity_status?: string | null;
          energy_consumption?: number | null;
          erp_status?: string | null;
          gas_status?: string | null;
          ges_emissions?: number | null;
          id?: string;
          lead_status?: string | null;
          notes?: string | null;
          subject_property_id: string;
          termites_status?: string | null;
          updated_at?: string;
        };
        Update: {
          agency_id?: string;
          asbestos_status?: string | null;
          created_at?: string;
          diagnostics_completed_at?: string | null;
          diagnostics_valid_until?: string | null;
          dpe_date?: string | null;
          electricity_status?: string | null;
          energy_consumption?: number | null;
          erp_status?: string | null;
          gas_status?: string | null;
          ges_emissions?: number | null;
          id?: string;
          lead_status?: string | null;
          notes?: string | null;
          subject_property_id?: string;
          termites_status?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subject_property_diagnostics_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subject_property_diagnostics_subject_property_id_fkey';
            columns: ['subject_property_id'];
            isOneToOne: true;
            referencedRelation: 'subject_properties';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      absorb_buyer_prospect: {
        Args: { p_agency_id: string; p_comparable_id: string; p_listing_key: string };
        Returns: number;
      };
      accept_invitation: {
        Args: { first_name: string; last_name: string };
        Returns: {
          agency_id: string;
          profile_id: string;
        }[];
      };
      ai_usage_since: {
        Args: { p_since: string };
        Returns: {
          agency_id: string;
          cost_millicents: number;
        }[];
      };
      answer_buyer_item: {
        Args: { p_agency_id: string; p_answer: string; p_item_id: string; p_reasons: string[] };
        Returns: {
          agency_id: string;
          answer: string;
          answered_at: string;
          answered_during: string;
          buyer_id: string;
          created_at: string;
          id: string;
          reasons: string[];
          selection_item_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'buyer_item_responses';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      bootstrap_agency_owner: {
        Args: { agency_name: string; first_name: string; last_name: string };
        Returns: {
          agency_id: string;
          profile_id: string;
        }[];
      };
      change_meeting_outcome: {
        Args: {
          p_agency_id: string;
          p_follow_up_motive?: string;
          p_follow_up_motive_detail?: string;
          p_mandate_type?: string;
          p_next_follow_up_on?: string;
          p_objection_note?: string;
          p_objections?: string[];
          p_outcome: string;
          p_price?: number;
          p_project_id: string;
          p_reason: string;
        };
        Returns: boolean;
      };
      conclude_meeting: {
        Args: {
          p_advisor_analysis: number;
          p_advisor_price: number;
          p_agency_id: string;
          p_exploitable?: number;
          p_follow_up_motive?: string;
          p_follow_up_motive_detail?: string;
          p_mandate_type?: string;
          p_market_computed: number;
          p_next_follow_up_on?: string;
          p_objection_note?: string;
          p_objections?: string[];
          p_outcome: string;
          p_price: number;
          p_project_id: string;
          p_reason: string;
          p_retained?: number;
          p_seller_perceived?: number;
          p_seller_wanted?: number;
        };
        Returns: boolean;
      };
      current_agency_id_text: { Args: Record<PropertyKey, never>; Returns: string };
      detach_buyer_origins: {
        Args: {
          p_agency_id: string;
          p_comparable_id: string;
          p_facts: Json;
          p_listing_key: string;
          p_target_comparable_id?: string;
        };
        Returns: number;
      };
      finish_buyer_presentation: {
        Args: {
          p_agency_id: string;
          p_availability: string[];
          p_deck: Json;
          p_selection_id: string;
        };
        Returns: boolean;
      };
      get_current_agency_id: { Args: Record<PropertyKey, never>; Returns: string };
      has_pending_invitation: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_current_manager: { Args: Record<PropertyKey, never>; Returns: boolean };
      live_has_started: { Args: { p_project_id: string }; Returns: boolean };
      meeting_duration_seconds: { Args: { p_project_id: string }; Returns: number };
      move_comparable: {
        Args: { move_direction: string; target_comparable_id: string; target_project_id: string };
        Returns: undefined;
      };
      move_selected_comparable: {
        Args: { p_comparable_id: string; p_direction: string };
        Returns: undefined;
      };
      purge_old_app_errors: { Args: Record<PropertyKey, never>; Returns: number };
      purge_stale_buyer_prospect_addresses: { Args: Record<PropertyKey, never>; Returns: number };
      purge_stale_listing_copies: { Args: Record<PropertyKey, never>; Returns: number };
      purge_stale_listing_texts: { Args: Record<PropertyKey, never>; Returns: number };
      purge_stale_owner_addresses: { Args: Record<PropertyKey, never>; Returns: number };
      reopen_live: {
        Args: {
          p_operator_email: string;
          p_operator_id: string;
          p_project_id: string;
          p_reason: string;
        };
        Returns: Json;
      };
      reorder_retained_comparables: {
        Args: { p_ids: string[]; p_project_id: string };
        Returns: undefined;
      };
      reserve_ai_budget: {
        Args: {
          p_agency_id: string;
          p_default_cap_cents: number;
          p_model: string;
          p_purpose: string;
          p_since: string;
          p_source: string;
          p_user_id: string;
          p_wanted_millicents: number;
        };
        Returns: string;
      };
      reserve_stream_estate_budget: {
        Args: {
          p_agency_id: string;
          p_default_cap_cents: number;
          p_project_id: string;
          p_since: string;
          p_user_id: string;
          p_wanted: number;
        };
        Returns: {
          adverts: number;
          reservation_id: string;
        }[];
      };
      save_commercialization_price: {
        Args: {
          p_advisor_analysis: number;
          p_advisor_price: number;
          p_agency_id: string;
          p_market_computed: number;
          p_price: number;
          p_project_id: string;
        };
        Returns: undefined;
      };
      save_live_shortlist: { Args: { p_project_id: string; p_shown: string[] }; Returns: number };
      settle_ai_budget: {
        Args: {
          p_cost_millicents: number;
          p_fields_proposed: string[];
          p_outcome: string;
          p_personal_mentions_skipped: number;
          p_usage_id: string;
        };
        Returns: undefined;
      };
      settle_stream_estate_budget: {
        Args: { p_billed: number; p_reservation_id: string };
        Returns: undefined;
      };
      start_buyer_watch: {
        Args: {
          p_agency_id: string;
          p_buyer_id: string;
          p_default_cap_cents: number;
          p_seen_since: string;
          p_since: string;
          p_wanted: number;
        };
        Returns: {
          adverts: number;
          reservation_id: string;
          run_id: string;
        }[];
      };
      stream_estate_usage_since: {
        Args: { p_since: string };
        Returns: {
          adverts: number;
          agency_id: string;
        }[];
      };
      submit_buyer_dossier_answers: {
        Args: {
          p_agency_id: string;
          p_answers: Json;
          p_availability: string[];
          p_selection_id: string;
        };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
