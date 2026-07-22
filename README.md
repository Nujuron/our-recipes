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

## Deploy (Vercel free)

1. Push the repo and import the project in Vercel
2. Set env vars: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Add the production `/auth/callback` URL in Supabase Auth settings

## Useful routes

| Path | Purpose |
|------|---------|
| `/` | Public discover + search |
| `/login` | Email sign-in / sign-up (Google optional) |
| `/me` | Your recipes |
| `/recipes/new` | Create a recipe |
| `/r/[slug]` | Public share page |
