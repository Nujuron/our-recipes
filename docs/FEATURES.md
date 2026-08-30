# Our Recipes — features

Living list of what the app does. Update this when a feature ships or is retired.

Last updated: 2026-08-30 (allergen exclude).

## Product

A family recipe book you can also open to the world. Private by default. Public only when the author publishes. English, Spanish, and German.

## Discover (anyone)

- Public recipe grid with title search, course, time, and allergen-exclude filters
- Recipe page: cover, ingredients (scalable servings), steps, allergens, ratings, view count
- Cooking mode: full-screen steps and ingredient checklist (session only)
- Duplicate a public recipe into your own private draft (“Make my version”)
- Share the public URL

## Your book (signed in)

- Email sign-in / sign-up; optional Google; link Google later; change password
- Create and edit recipes: title, summary, structured ingredients, steps, rich body, cover, servings, locale, course, effort, EU-14 allergens
- Private draft or publish to Discover (with a warning)
- Choose which families see a recipe; new recipes default to your primary family; uncheck all to keep it to yourself
- My recipes list (filter by course, time, and allergen exclude)
- Cooked list: mark cooked, rate, optional note
- Profile: display name, language

## Families

- Create a named family; you are the creator
- Belong to several families; mark one as primary
- Creator invite link (rotate to invalidate the old one); join requires an account
- Members see recipes shared with that family, cook, and add to their own shopping list
- Members cannot edit, delete, or publish someone else’s recipe
- Family page lists members and shared recipes
- Leave or be removed: access ends immediately; the recipe stays with the author
- Creator can remove members or delete the family
- Shared private recipes do not appear on Discover

## Kitchen session

- Device-local shopping list (survives offline after first visit)
- Add ingredients from a recipe, scaled to servings; add custom lines
- Check off, clear bought, clear all
- Cooking progress is on-device for the session only

## Install and AI

- PWA: install from Chrome (Android) or Safari → Add to Home Screen (iOS)
- Recipes need a network connection; the shopping list does not after the first visit
- MCP at `/mcp`: list, get, create, and update _your_ recipes (creates/edits stay private)
- OAuth consent so Claude, ChatGPT, or Cursor can connect as you

## Routes

| Path                     | Purpose                               |
| ------------------------ | ------------------------------------- |
| `/`                      | Public Discover                       |
| `/login`                 | Sign in / sign up                     |
| `/me`                    | Your recipes                          |
| `/me/cooked`             | Recipes you marked cooked             |
| `/me/profile`            | Profile and account                   |
| `/families`              | Your families                         |
| `/families/[id]`         | Members, invite, shared recipes       |
| `/families/join/[token]` | Accept an invite                      |
| `/recipes/new`           | New recipe                            |
| `/recipes/[id]/edit`     | Edit your recipe                      |
| `/r/[id]`                | Recipe page (public or family-shared) |
| `/shopping`              | Shopping list                         |
| `/mcp`                   | MCP for AI apps                       |
| `/oauth/consent`         | Approve an AI app                     |

## Not in this version

- Guest cook tickets (one-night link for a single recipe, no family membership)
- Shared family shopping list
- Co-edit
- Family creator successor if the creator leaves
- MCP tools for families
- Overlay remix / lineage (duplicate is still a full private copy)
- Offline recipe packets
- Same-account shopping list sync across devices
- Meal plan / “tonight” cart

Ideas and ranking: [product-features ideation](ideation/2026-08-30-product-features-ideation.html). Families plan: [2026-08-30-001](plans/2026-08-30-001-feature-families-plan.md).
