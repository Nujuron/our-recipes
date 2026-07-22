export function coverPublicUrl(supabaseUrl: string, coverPath: string | null): string | null {
	if (!coverPath) return null;
	return `${supabaseUrl}/storage/v1/object/public/recipe-covers/${coverPath}`;
}
