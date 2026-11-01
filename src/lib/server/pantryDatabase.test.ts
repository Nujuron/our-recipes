import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const A = '10000000-0000-4000-8000-000000000001';
const B = '10000000-0000-4000-8000-000000000002';
const C = '10000000-0000-4000-8000-000000000003';
const FAMILY = '20000000-0000-4000-8000-000000000001';
const PERSONAL = '30000000-0000-4000-8000-000000000001';
const SHARED = '30000000-0000-4000-8000-000000000002';
const LOT = '40000000-0000-4000-8000-000000000001';
const OP = '50000000-0000-4000-8000-000000000001';
const IMPORT_LOT = '60000000-0000-4000-8000-000000000001';
let db: PGlite;
const migration = (name: string) =>
	readFileSync(new URL(`../../../supabase/migrations/${name}`, import.meta.url), 'utf8');

async function login(userId: string) {
	await db.exec('reset role; set local role authenticated;');
	await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
}

const importedLots = () => [
	{
		id: IMPORT_LOT,
		name: 'Arroz',
		quantity: 1,
		unit: 'kg',
		location: 'pantry',
		food_date: null,
		date_type: null,
		note: null
	}
];
const importLine = (lots = importedLots(), pantry = PERSONAL) =>
	db.query('select public.import_pantry_line($1, $2, $3, $4::jsonb) as ids', [
		OP,
		'line-1',
		pantry,
		JSON.stringify(lots)
	]);

describe('pantry PostgreSQL migration and RLS', () => {
	beforeAll(async () => {
		db = await PGlite.create();
		// Minimal pre-existing application tables; use the actual family migrations and policies.
		await db.exec(`
			create role anon; create role authenticated; create role service_role bypassrls;
			create schema auth; create schema extensions;
			create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
			grant usage on schema public, auth to anon, authenticated;
			grant execute on function auth.uid() to anon, authenticated;
			alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
			create table public.profiles(id uuid primary key);
			create table public.recipes(id uuid primary key, author_id uuid references public.profiles(id), is_public boolean default false);
			alter table public.recipes enable row level security;
			create policy "Public or own recipes are viewable" on public.recipes for select using (is_public or author_id = auth.uid());
		`);
		await db.exec(migration('20260830140000_add_families.sql'));
		await db.exec(migration('20260830150000_families_allow_created_by_delete_empty.sql'));
		await db.exec(migration('20260830160000_fix_recipe_family_rls_recursion.sql'));
		await db.exec(migration('20261101192952_add_pantry.sql'));
		await db.exec(`
			insert into public.profiles(id) values ('${A}'), ('${B}'), ('${C}');
			insert into public.families(id,name,created_by) values ('${FAMILY}','Family','${A}');
			insert into public.family_members(family_id,user_id,role) values ('${FAMILY}','${A}','creator'), ('${FAMILY}','${B}','member');
			insert into public.pantries(id,owner_user_id,name,timezone) values ('${PERSONAL}','${A}','Personal','Atlantic/Canary');
			insert into public.pantries(id,family_id,name,timezone) values ('${SHARED}','${FAMILY}','Shared','Atlantic/Canary');
			insert into public.pantry_lots(id,pantry_id,name,quantity,location) values ('${LOT}','${PERSONAL}','Arroz',2,'pantry');
		`);
	}, 30_000);
	beforeEach(async () => {
		await db.exec('begin;');
	});
	afterEach(async () => {
		await db.exec('rollback; reset role;');
	});
	afterAll(async () => {
		await db?.close();
	});

	it('lets a current member see only shared stock and forbids foreign inserts or changes', async () => {
		await login(B);
		expect((await db.query('select id from public.pantries')).rows).toEqual([{ id: SHARED }]);
		expect((await db.query('select id from public.pantry_lots')).rows).toEqual([]);
		expect(
			(await db.query('update public.pantry_lots set quantity=1 where id=$1 returning id', [LOT]))
				.rows
		).toEqual([]);
		await expect(
			db.query(
				"insert into public.pantry_lots(pantry_id,name,location) values ($1,'Stolen','fridge')",
				[PERSONAL]
			)
		).rejects.toThrow(/row-level security/i);
	});
	it('revokes shared lots and old receipts as soon as membership is removed', async () => {
		await login(B);
		await importLine(importedLots(), SHARED);
		expect((await db.query('select id from public.pantry_lots')).rows).toHaveLength(1);
		await db.exec('reset role;');
		await db.query('delete from public.family_members where family_id=$1 and user_id=$2', [
			FAMILY,
			B
		]);
		await login(B);
		expect((await db.query('select id from public.pantries')).rows).toHaveLength(0);
		expect((await db.query('select id from public.pantry_lots')).rows).toHaveLength(0);
		expect((await db.query('select line_id from public.pantry_import_lines')).rows).toHaveLength(0);
		await expect(importLine(importedLots(), SHARED)).rejects.toThrow('pantry_not_found');
	});
	it('prevents anonymous table and RPC access', async () => {
		await db.exec('set local role anon;');
		await expect(db.query('select * from public.pantries')).rejects.toThrow(/permission denied/i);
		// Errors abort a transaction: each additional assertion runs in a separate test.
	});
	it('restricts RPC execution to authenticated users', async () => {
		const { rows } = await db.query<{ allowed: boolean }>(
			"select has_function_privilege('anon','public.consume_pantry_lot(uuid,integer,numeric)','execute') or has_function_privilege('anon','public.import_pantry_line(uuid,text,uuid,jsonb)','execute') as allowed"
		);
		expect(rows[0].allowed).toBe(false);
	});
	it('atomically consumes quantity and finishes the batch at zero', async () => {
		await login(A);
		await db.query('select public.consume_pantry_lot($1,1,0.5)', [LOT]);
		await db.query('select public.consume_pantry_lot($1,2,1.5)', [LOT]);
		const { rows } = await db.query<{ quantity: string; status: string; version: number }>(
			'select quantity,status,version from public.pantry_lots where id=$1',
			[LOT]
		);
		expect(Number(rows[0].quantity)).toBe(0);
		expect(rows[0].status).toBe('finished');
		expect(rows[0].version).toBe(3);
	});
	it('rejects a stale concurrent consumer rather than subtracting twice', async () => {
		await login(A);
		await db.query('select public.consume_pantry_lot($1,1,1.5)', [LOT]);
		await expect(db.query('select public.consume_pantry_lot($1,1,1.5)', [LOT])).rejects.toThrow(
			'pantry_conflict'
		);
	});
	it('rejects over-consumption', async () => {
		await login(A);
		await expect(db.query('select public.consume_pantry_lot($1,1,3)', [LOT])).rejects.toThrow(
			'invalid_quantity'
		);
	});
	it('rejects partial use of unknown quantities', async () => {
		await login(A);
		await db.query('update public.pantry_lots set quantity=null where id=$1', [LOT]);
		await expect(db.query('select public.consume_pantry_lot($1,2,1)', [LOT])).rejects.toThrow(
			'invalid_quantity'
		);
	});
	it('detects edits made with an old version', async () => {
		await login(A);
		await db.query('update public.pantry_lots set note=$1 where id=$2 and version=1', [
			'First',
			LOT
		]);
		expect(
			(
				await db.query(
					'update public.pantry_lots set note=$1 where id=$2 and version=1 returning id',
					['Stale', LOT]
				)
			).rows
		).toHaveLength(0);
	});
	it('replays a split line after an uncertain response without duplicate batches', async () => {
		await login(A);
		const lots = [
			...importedLots(),
			{ ...importedLots()[0], id: '60000000-0000-4000-8000-000000000002' }
		];
		const first = await importLine(lots);
		expect((await importLine(lots)).rows).toEqual(first.rows);
		expect((await db.query('select * from public.pantry_lots')).rows).toHaveLength(3);
		expect((await db.query('select * from public.pantry_import_lines')).rows).toHaveLength(1);
	});
	it('does not accept changing the payload of a pending import', async () => {
		await login(A);
		await importLine();
		await expect(importLine([{ ...importedLots()[0], quantity: 2 }])).rejects.toThrow(
			'pantry_conflict'
		);
	});
	it('rolls back every split lot and receipt when one lot is invalid', async () => {
		await login(A);
		await db.exec('savepoint invalid_import;');
		await expect(
			importLine([
				...importedLots(),
				{ ...importedLots()[0], id: '60000000-0000-4000-8000-000000000002', quantity: -1 }
			])
		).rejects.toThrow();
		await db.exec('rollback to savepoint invalid_import;');
		expect((await db.query('select * from public.pantry_lots')).rows).toHaveLength(1);
		expect((await db.query('select * from public.pantry_import_lines')).rows).toHaveLength(0);
	});
	it('forbids reassigning pantry ownership even between pantries the caller can access', async () => {
		await login(A);
		await expect(
			db.query('update public.pantries set owner_user_id=null,family_id=$1 where id=$2', [
				FAMILY,
				PERSONAL
			])
		).rejects.toThrow('immutable_pantry_owner');
	});
	it('forbids moving lots by changing their pantry id', async () => {
		await login(A);
		await expect(
			db.query('update public.pantry_lots set pantry_id=$1 where id=$2', [SHARED, LOT])
		).rejects.toThrow('immutable_lot_pantry');
	});
	it('deletes family stock and receipts but preserves personal stock', async () => {
		await login(A);
		await importLine(importedLots(), SHARED);
		await db.query('delete from public.families where id=$1', [FAMILY]);
		expect((await db.query('select id from public.pantries')).rows).toEqual([{ id: PERSONAL }]);
		expect((await db.query('select id from public.pantry_lots')).rows).toEqual([{ id: LOT }]);
		expect((await db.query('select * from public.pantry_import_lines')).rows).toHaveLength(0);
	});
	it('keeps private recipes invisible to outsiders and preserves family recipe permissions', async () => {
		const recipe = '70000000-0000-4000-8000-000000000001';
		await db.query('insert into public.recipes(id,author_id) values ($1,$2)', [recipe, A]);
		await db.query('insert into public.recipe_family_shares(recipe_id,family_id) values ($1,$2)', [
			recipe,
			FAMILY
		]);
		await login(B);
		expect((await db.query('select id from public.recipes')).rows).toEqual([{ id: recipe }]);
		await login(C);
		expect((await db.query('select id from public.recipes')).rows).toEqual([]);
	});
	it('also removes shared stock when the last member leaves, preserving personal stock', async () => {
		await login(A);
		await importLine(importedLots(), SHARED);
		await db.query('delete from public.family_members where family_id=$1 and user_id=$2', [
			FAMILY,
			B
		]);
		await db.query('delete from public.family_members where family_id=$1 and user_id=$2', [
			FAMILY,
			A
		]);
		expect((await db.query('select id from public.pantries')).rows).toEqual([{ id: PERSONAL }]);
		expect((await db.query('select id from public.pantry_lots')).rows).toEqual([{ id: LOT }]);
		expect((await db.query('select * from public.pantry_import_lines')).rows).toHaveLength(0);
	});
});
