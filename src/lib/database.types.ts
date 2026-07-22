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
					ingredients: string | null;
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
					ingredients?: string | null;
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
					ingredients?: string | null;
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
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Recipe = Database['public']['Tables']['recipes']['Row'];
