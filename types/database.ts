// Mirrors supabase/migrations. Once your project is linked you can regenerate
// this file with:
//   npx supabase gen types typescript --project-id <project-ref> --schema public > types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: never;
        Update: {
          username?: string;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          property_type: string;
          city: string;
          country: string;
          nightly_price: number;
          cleaning_fee: number;
          service_fee: number;
          max_guests: number;
          bedrooms: number;
          beds: number;
          bathrooms: number;
          amenities: Json;
          status: string;
          view_count: number;
          favourite_count: number;
          review_count: number;
          rating_avg: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          description: string;
          property_type: string;
          city: string;
          country: string;
          nightly_price: number;
          cleaning_fee?: number;
          service_fee?: number;
          max_guests: number;
          bedrooms: number;
          beds: number;
          bathrooms: number;
          amenities?: Json;
          status?: string;
        };
        Update: {
          title?: string;
          description?: string;
          property_type?: string;
          city?: string;
          country?: string;
          nightly_price?: number;
          cleaning_fee?: number;
          service_fee?: number;
          max_guests?: number;
          bedrooms?: number;
          beds?: number;
          bathrooms?: number;
          amenities?: Json;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_images: {
        Row: {
          id: string;
          listing_id: string;
          storage_path: string;
          display_order: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          listing_id: string;
          storage_path: string;
          display_order: number;
          is_primary?: boolean;
        };
        Update: {
          display_order?: number;
          is_primary?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          listing_id: string;
          user_id: string;
          rating: number;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          listing_id: string;
          rating: number;
          content: string;
        };
        Update: {
          rating?: number;
          content?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      favourites: {
        Row: {
          user_id: string;
          listing_id: string;
          created_at: string;
        };
        Insert: {
          listing_id: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "favourites_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favourites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string | null;
          target_type: string;
          target_id: string;
          reason: string;
          details: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          target_type: string;
          target_id: string;
          reason: string;
          details?: string | null;
        };
        Update: {
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      increment_listing_view: {
        Args: { target_listing_id: string };
        Returns: undefined;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
