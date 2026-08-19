# Our Recipes

SvelteKit + Supabase app to create and share cooking recipes.

## Stack

- **Frontend:** SvelteKit (TypeScript), Paraglide (EN/ES), Vercel adapter
- **Backend:** Supabase Auth (email + optional Google), Postgres + RLS, Storage (`recipe-covers`)

## Local setup

1. Copy env file and fill values from your Supabase project:

```bash
cp .env.example .env
```

2. Install and run:

```bash
pnpm install
pnpm dev
```

3. In Supabase Dashboard:
   - **Authentication → Providers → Email**: enabled (default). For local/family use, you can turn off **Confirm email** so accounts work immediately.
   - **Authentication → Providers → Google** (optional, later): enable and add Client ID/Secret
   - **Authentication → URL configuration**: add redirect URL  
     `http://localhost:5173/auth/callback`  
     (and your Vercel URL later, e.g. `https://your-app.vercel.app/auth/callback`)
   - **Authentication → OAuth Server** (for MCP / ChatGPT / Cursor):
     - Enable OAuth 2.1
     - Authorization path: `/oauth/consent`
     - Enable **Allow Dynamic OAuth Apps** so AI clients can register themselves
     - Site URL must be your production origin (same as the website)

## Deploy (Vercel free)

1. Push the repo and import the project in Vercel
2. Set env vars: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, optionally `PUBLIC_SITE_URL`
3. Add the production `/auth/callback` URL in Supabase Auth settings
4. Enable **Authentication → OAuth Server** as above, with Site URL = production origin

## Useful routes

| Path             | Purpose                                                |
| ---------------- | ------------------------------------------------------ |
| `/`              | Public discover + search                               |
| `/login`         | Email sign-in / sign-up (Google optional)              |
| `/me`            | Your recipes                                           |
| `/recipes/new`   | Create a recipe                                        |
| `/r/[id]`        | Public share page                                      |
| `/mcp`           | MCP (AI apps): list / get / create / edit your recipes |
| `/oauth/consent` | Approve an AI app connecting as you                    |

## Connect an AI app (MCP)

After OAuth Server is enabled, point a Streamable HTTP MCP client at:

`https://<your-domain>/mcp`

Example Cursor config:

```json
{
	"mcpServers": {
		"our-recipes": {
			"url": "https://your-app.vercel.app/mcp"
		}
	}
}
```

The first tool call should send you through Our Recipes sign-in and the consent page. Recipes created or edited via MCP stay **private** until you publish them on the website.
