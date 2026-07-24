export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					display_name: string | null;
					avatar_url: string | null;
					preferred_locale: 'en' | 'es' | 'de';
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					display_name?: string | null;
					avatar_url?: string | null;
					preferred_locale?: 'en' | 'es' | 'de';
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					display_name?: string | null;
					avatar_url?: string | null;
					preferred_locale?: 'en' | 'es' | 'de';
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			recipes: {
				Row: {
					id: string;
					author_id: string;
					title: string;
					summary: string | null;
					ingredients: Json;
					steps: string | null;
					body_md: string;
					cover_path: string | null;
					is_public: boolean;
					locale: 'en' | 'es' | 'de' | 'other';
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					author_id: string;
					title: string;
					summary?: string | null;
					ingredients?: Json;
					steps?: string | null;
					body_md?: string;
					cover_path?: string | null;
					is_public?: boolean;
					locale?: 'en' | 'es' | 'de' | 'other';
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					author_id?: string;
					title?: string;
					summary?: string | null;
					ingredients?: Json;
					steps?: string | null;
					body_md?: string;
					cover_path?: string | null;
					is_public?: boolean;
					locale?: 'en' | 'es' | 'de' | 'other';
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'recipes_author_id_fkey';
						columns: ['author_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			recipe_ratings: {
				Row: {
					id: string;
					recipe_id: string;
					user_id: string;
					score: number;
					note: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					recipe_id: string;
					user_id: string;
					score: number;
					note?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					recipe_id?: string;
					user_id?: string;
					score?: number;
					note?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'recipe_ratings_recipe_id_fkey';
						columns: ['recipe_id'];
						isOneToOne: false;
						referencedRelation: 'recipes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'recipe_ratings_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			recipe_rating_stats: {
				Row: {
					recipe_id: string;
					rating_sum: number;
					rating_count: number;
					updated_at: string;
				};
				Insert: {
					recipe_id: string;
					rating_sum?: number;
					rating_count?: number;
					updated_at?: string;
				};
				Update: {
					recipe_id?: string;
					rating_sum?: number;
					rating_count?: number;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'recipe_rating_stats_recipe_id_fkey';
						columns: ['recipe_id'];
						isOneToOne: true;
						referencedRelation: 'recipes';
						referencedColumns: ['id'];
					}
				];
			};
			recipe_view_stats: {
				Row: {
					recipe_id: string;
					view_count: number;
					updated_at: string;
				};
				Insert: {
					recipe_id: string;
					view_count?: number;
					updated_at?: string;
				};
				Update: {
					recipe_id?: string;
					view_count?: number;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'recipe_view_stats_recipe_id_fkey';
						columns: ['recipe_id'];
						isOneToOne: true;
						referencedRelation: 'recipes';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Views: Record<string, never>;
		Functions: {
			record_recipe_view: {
				Args: {
					p_recipe_id: string;
					p_user_id: string | null;
					p_viewer_hash: string;
				};
				Returns: {
					counted: boolean;
					view_count: number;
				}[];
			};
		};
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Recipe = Database['public']['Tables']['recipes']['Row'];
export type RecipeRating = Database['public']['Tables']['recipe_ratings']['Row'];
export type RecipeRatingStats = Database['public']['Tables']['recipe_rating_stats']['Row'];
export type RecipeViewStats = Database['public']['Tables']['recipe_view_stats']['Row'];
