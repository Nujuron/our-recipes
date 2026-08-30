import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { z } from 'zod';
import { COURSES, EFFORTS } from '$lib/classifications';
import { createRecipe, getOwnedRecipe, listOwnedRecipes, updateRecipe } from '$lib/recipeMutations';
import { verifyMcpAccessToken } from './mcpAuth';
import { createUserSupabase, publicSiteOrigin, supabaseAuthIssuer } from './userSupabase';

const ingredientSchema = z.object({
	name: z.string(),
	quantity: z.string().nullable().optional(),
	unit: z.string().nullable().optional()
});

const localeSchema = z.enum(['en', 'es', 'de', 'other']);
const courseSchema = z.enum(COURSES);
const effortSchema = z.enum(EFFORTS);
const allergenSchema = z.enum([
	'gluten',
	'crustaceans',
	'eggs',
	'fish',
	'peanuts',
	'soy',
	'milk',
	'nuts',
	'celery',
	'mustard',
	'sesame',
	'sulphites',
	'lupin',
	'molluscs'
]);

function jsonResult(value: unknown) {
	return {
		content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }]
	};
}

function errorResult(message: string) {
	return {
		content: [{ type: 'text' as const, text: message }],
		isError: true
	};
}

function actor(ctx: { http?: { authInfo?: { token?: string; extra?: unknown } } }) {
	const info = ctx.http?.authInfo;
	const extra = info?.extra as { userId?: string; origin?: string } | undefined;
	if (!info?.token || !extra?.userId) return null;
	return {
		userId: extra.userId,
		origin: extra.origin ?? '',
		token: info.token
	};
}

const mcpHandler = createMcpHandler(
	(server) => {
		server.registerTool(
			'list_my_recipes',
			{
				title: 'List my recipes',
				description:
					"List the signed-in user's recipes (private and public they authored). Optional title filter.",
				inputSchema: z.object({
					q: z.string().optional().describe('Optional title search')
				}),
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ q }, ctx) => {
				const user = actor(ctx);
				if (!user) return errorResult('Not authenticated.');

				const listed = await listOwnedRecipes(
					createUserSupabase(user.token),
					user.userId,
					q,
					user.origin
				);
				if ('error' in listed) return errorResult(listed.error);
				return jsonResult(listed.items);
			}
		);

		server.registerTool(
			'get_recipe',
			{
				title: 'Get recipe',
				description:
					'Get one of the signed-in user’s recipes by id, including ingredients and body.',
				inputSchema: z.object({
					id: z.string().uuid().describe('Recipe id')
				}),
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ id }, ctx) => {
				const user = actor(ctx);
				if (!user) return errorResult('Not authenticated.');

				const recipe = await getOwnedRecipe(
					createUserSupabase(user.token),
					user.userId,
					id,
					user.origin
				);
				if ('error' in recipe) {
					return errorResult(
						recipe.error === 'forbidden' ? 'You do not own this recipe.' : 'Recipe not found.'
					);
				}
				return jsonResult(recipe);
			}
		);

		server.registerTool(
			'create_recipe',
			{
				title: 'Create recipe',
				description:
					'Create a private draft recipe for the signed-in user. Publishing stays on the website. Returns the edit URL.',
				inputSchema: z.object({
					title: z.string().describe('Recipe title'),
					body_md: z.string().describe('Recipe body in markdown'),
					servings: z.number().int().min(1).max(99).describe('How many people the recipe serves'),
					summary: z.string().optional(),
					ingredients: z.array(ingredientSchema).optional(),
					steps: z.union([z.string(), z.array(z.string())]).optional(),
					locale: localeSchema.optional(),
					course: courseSchema.optional().describe('Meal course for dinner-style browsing'),
					effort: effortSchema.optional().describe('Total-time band: under_30, 30_60, or over_60'),
					allergens: z
						.array(allergenSchema)
						.optional()
						.describe('EU 14 allergens contained in the recipe')
				}),
				annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
			},
			async (input, ctx) => {
				const user = actor(ctx);
				if (!user) return errorResult('Not authenticated.');

				const created = await createRecipe(createUserSupabase(user.token), user.userId, input, {
					forcePrivate: true
				});
				if ('error' in created) {
					if (created.error === 'missing') {
						return errorResult('Title, recipe body, and servings (1–99) are required.');
					}
					return errorResult(created.message ?? 'Could not save the recipe.');
				}

				const recipe = await getOwnedRecipe(
					createUserSupabase(user.token),
					user.userId,
					created.id,
					user.origin
				);
				if ('error' in recipe) {
					return jsonResult({ id: created.id, is_public: false });
				}
				return jsonResult({
					id: recipe.id,
					title: recipe.title,
					is_public: recipe.is_public,
					editUrl: recipe.editUrl
				});
			}
		);

		server.registerTool(
			'update_recipe',
			{
				title: 'Update recipe',
				description:
					'Update one of the signed-in user’s recipes. The recipe is saved as private so it leaves the public catalog until published on the website.',
				inputSchema: z.object({
					id: z.string().uuid().describe('Recipe id to update'),
					title: z.string().optional(),
					body_md: z.string().optional(),
					servings: z.number().int().min(1).max(99).optional(),
					summary: z.string().nullable().optional(),
					ingredients: z.array(ingredientSchema).optional(),
					steps: z.union([z.string(), z.array(z.string())]).optional(),
					locale: localeSchema.optional(),
					course: courseSchema.nullable().optional().describe('Meal course, or null to clear'),
					effort: effortSchema.nullable().optional().describe('Total-time band, or null to clear'),
					allergens: z
						.array(allergenSchema)
						.optional()
						.describe('EU 14 allergens contained in the recipe')
				}),
				annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
			},
			async ({ id, ...patch }, ctx) => {
				const user = actor(ctx);
				if (!user) return errorResult('Not authenticated.');

				const saved = await updateRecipe(createUserSupabase(user.token), user.userId, id, patch, {
					forcePrivate: true
				});
				if ('error' in saved) {
					if (saved.error === 'missing') {
						return errorResult('Title, recipe body, and servings (1–99) are required.');
					}
					if (saved.error === 'forbidden') {
						return errorResult('You do not own this recipe.');
					}
					if (saved.error === 'not_found') {
						return errorResult('Recipe not found.');
					}
					return errorResult(saved.message ?? 'Could not save the recipe.');
				}

				const recipe = await getOwnedRecipe(
					createUserSupabase(user.token),
					user.userId,
					saved.id,
					user.origin
				);
				if ('error' in recipe) {
					return jsonResult({ id: saved.id, is_public: false });
				}
				return jsonResult({
					id: recipe.id,
					title: recipe.title,
					is_public: recipe.is_public,
					editUrl: recipe.editUrl
				});
			}
		);
	},
	{
		serverInfo: {
			name: 'our-recipes',
			version: '0.6.1'
		}
	}
);

export const mcpRequestHandler = withMcpAuth(mcpHandler, verifyMcpAccessToken, {
	required: true,
	resourceMetadataPath: '/.well-known/oauth-protected-resource'
});

export function mcpResourceMetadata(request: Request) {
	const origin = publicSiteOrigin(request);
	return {
		resource: `${origin}/mcp`,
		authorization_servers: [supabaseAuthIssuer()],
		bearer_methods_supported: ['header'],
		scopes_supported: ['openid', 'email', 'profile']
	};
}
