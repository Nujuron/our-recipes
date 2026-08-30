# Our Recipes

SvelteKit + Supabase app to create and share cooking recipes. Private by default; publish when you want the world to see a dish. Families can cook from each other’s private recipes without putting them on Discover.

**What it does:** see [docs/FEATURES.md](docs/FEATURES.md). Keep that file current when you ship or drop a feature.

## Stack

- **Frontend:** SvelteKit (TypeScript), Paraglide (EN/ES/DE), Vercel adapter
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

## Install on your phone

This is a PWA (no App Store / Play Store build). Open the site in **Chrome on Android** and use **Install app**, or in **Safari on iPhone** tap **Share → Add to Home Screen**. Repeat visits load the app shell faster. The shopping list stays on the device after the first visit; recipes still need a network connection.

## Useful routes

Full feature list and routes: [docs/FEATURES.md](docs/FEATURES.md).

| Path             | Purpose                                                |
| ---------------- | ------------------------------------------------------ |
| `/`              | Public discover + search                               |
| `/login`         | Email sign-in / sign-up (Google optional)              |
| `/me`            | Your recipes                                           |
| `/families`      | Families you belong to                                 |
| `/recipes/new`   | Create a recipe                                        |
| `/r/[id]`        | Recipe page (public or family-shared)                  |
| `/shopping`      | Device-local shopping list                             |
| `/mcp`           | MCP (AI apps): list / get / create / edit your recipes |
| `/oauth/consent` | Approve an AI app connecting as you                    |

## Connect an AI app (MCP)

Server URL (replace with your production origin if it differs):

`https://our-recipes-lyart.vercel.app/mcp`

You must already have **Authentication → OAuth Server** enabled (see above). Leave OAuth client ID / secret empty — the app uses dynamic registration. The first connect opens Our Recipes sign-in, then **Allow** on `/oauth/consent`. Creates and edits stay **private** until you publish them on the website.

### Claude (claude.ai, Desktop, Cowork)

Custom connectors work on Free (one connector), Pro, Max, Team, and Enterprise. Claude talks to your server from Anthropic’s cloud, so the URL must be public HTTPS.

**Pro / Max / Free**

1. Open [claude.ai](https://claude.ai) → **Customize → Connectors**.
2. Click **+** → **Add custom connector**.
3. Paste the MCP URL above. Skip Advanced OAuth client ID/secret.
4. Click **Add**, then **Connect** and finish Our Recipes login + Allow.
5. In a chat, click **+** → **Connectors** and toggle **Our Recipes** on for that conversation.

**Team / Enterprise:** an Owner adds it under **Organization settings → Connectors → Add → Custom → Web**. Members then **Customize → Connectors → Connect**.

Try: _List my recipes._ Then: _Save this as a private draft titled “Claude test”._

Official: [Custom connectors (remote MCP)](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)

### ChatGPT

Needs a paid plan (Plus / Pro / Team, etc.). Custom MCP is behind **Developer mode**, which is meant for people who understand write-tool risk.

1. Open ChatGPT → **Settings → Security and login** → turn on **Developer mode**.
2. Go to **Settings → Apps** (or **Connectors**) → **Create** / plus.
3. Name: `Our Recipes`. URL: the MCP URL above. Authentication: **OAuth**. Check that you trust the app.
4. Create, then complete Our Recipes login + Allow.
5. In a new chat, open **+** → **Developer mode** (or **More**) and select the Our Recipes app so its tools are on for that conversation.

ChatGPT will ask you to confirm write tools (`create_recipe`, `update_recipe`). Try: _List my recipes._

Official: [ChatGPT developer mode](https://developers.openai.com/api/docs/guides/developer-mode)

### Cursor

Project file `.cursor/mcp.json`, or **Settings → MCP**:

```json
{
	"mcpServers": {
		"our-recipes": {
			"url": "https://our-recipes-lyart.vercel.app/mcp"
		}
	}
}
```

Enable the server, authenticate if asked, then in Agent chat: _List my recipes._
