---
artifact_contract: ce-unified-plan/v1
artifact_readiness: requirements-only
product_contract_source: ce-brainstorm
execution: code
date: 2026-08-30
topic: families
---

# Families - Plan

## Goal Capsule

**Objective:** Let people in one or more families see each other's private recipes without publishing them to Discover.

**Product authority:** This plan owns family membership, invite links, and per-recipe family visibility. Guest cook tickets and a shared shopping list are not in scope.

**Open blockers:** None. If the family creator leaves, the family stops accepting new members until a later successor feature.

## Product Contract

### Summary

Signed-in users create or join families. A private recipe stays with its author. The author chooses which families may view, cook, and add ingredients to their own lists. The default is the author's primary family. Only the author edits or deletes.

### Problem Frame

People publish a family recipe just so relatives can open the link. That puts private food on the public grid.

### Requirements

- **R1.** A signed-in user can create a named family and become its creator.
- **R2.** Only the creator can mint or rotate an invite link. The recipient must sign in or create an account, then join.
- **R3.** A user may belong to several families at once.
- **R4.** Each user has a primary family: the one they created, or one they mark. New recipes default to sharing with that family.
- **R5.** The author picks which families see a recipe. Sharing with none is the opt-out.
- **R6.** Family members can open a shared private recipe, use cooking mode, and add ingredients to their own shopping list. They cannot edit, delete, or publish it.
- **R7.** Public Discover stays public-only. Family-shared private recipes do not appear there.
- **R8.** Leaving or being removed cuts access immediately. The recipe stays in the author's book.
- **R9.** Joining requires an Our Recipes account. A secret link without sign-in is out.

### Key Decisions

- Visibility grants on the author's recipe, not a family cookbook shelf. (session-settled: user-approved — chosen over family shelf and share-with-all-families)
- View / cook / shop only; author edits. (session-settled: user-directed — chosen over co-edit and personal overlays)
- Several families and a picker in v1. (session-settled: user-directed — chosen over one-family-first)
- Default share is the created or marked primary family, not every family. (session-settled: user-directed — chosen over all-families and per-family default-on toggles)
- Creator-only invites. (session-settled: user-directed — chosen over any-member invites)
- Leave means immediate loss of access, no leftover copies. (session-settled: user-directed — chosen over keeping copies)
- Account required to join. (session-settled: user-directed — chosen over a no-account secret link)

### Scope Boundaries

**In scope:** Create/join/leave family, creator invite links, primary family, per-recipe family picker, family recipe list, cook and shop from shared private recipes.

**Deferred:** Guest tickets, shared family shopping list, co-edit, successor if the creator leaves, MCP family tools.

**Outside:** Becoming a social network or public author pages.

### Success Criteria

A relative can cook a private recipe without it appearing on Discover. The author can keep a recipe to themselves with one opt-out.

### Outstanding Questions

- Whether the creator may delete the whole family (implemented as yes: creator can delete the family they created).
