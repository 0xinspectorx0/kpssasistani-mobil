// Real PostgreSQL policy/trigger tests in PGlite. Auth schema is a minimal test fixture;
// Supabase GoTrue sign-in/HTTP integration still needs a configured Supabase project.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { seedEntries } from '../lib/content-schema';

let db: PGlite;
const admin = '00000000-0000-0000-0000-000000000001';
const student = '00000000-0000-0000-0000-000000000002';
const second = '00000000-0000-0000-0000-000000000003';
const question = seedEntries()[0];
async function asUser(role: 'anon' | 'authenticated', uid = '') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
  await db.exec(`set role ${role}`);
}
async function insert(id: string, status: string, payload: unknown = { ...question.payload, id }) {
  return db.query('insert into public.content_entries(kind,id,payload,status) values ($1,$2,$3,$4)', [
    'questions',
    id,
    JSON.stringify(payload),
    status,
  ]);
}
before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${admin}','owner@example.com',now()), ('${student}','student@example.com',now()), ('${second}','second@example.com',now());
  `);
  await db.exec(
    readFileSync(new URL('../supabase/migrations/202609220001_admin_content.sql', import.meta.url), 'utf8'),
  );
  await db.query('insert into public.admin_members(user_id) values ($1)', [admin]);
  await asUser('authenticated', admin);
  await insert('published', 'published');
  await insert('draft', 'draft');
});
after(async () => {
  await db.close();
});

test('anonymous readers see published content only and cannot insert', async () => {
  await asUser('anon');
  assert.deepEqual((await db.query('select id from public.content_entries')).rows, [{ id: 'published' }]);
  await assert.rejects(insert('attack', 'published'), /permission denied/i);
  await assert.rejects(db.query('select * from public.admin_members'), /permission denied/i);
});
test('authenticated non-admin cannot self-promote, write content, or read audit/admins', async () => {
  await asUser('authenticated', student);
  assert.deepEqual((await db.query('select public.is_admin() as allowed')).rows, [{ allowed: false }]);
  assert.deepEqual((await db.query('select id from public.content_entries')).rows, [{ id: 'published' }]);
  await assert.rejects(insert('attack', 'draft'), /row-level security/i);
  assert.equal(
    (await db.query("update public.content_entries set status='draft' returning id")).rows.length,
    0,
  );
  assert.equal((await db.query('delete from public.content_entries returning id')).rows.length, 0);
  await assert.rejects(
    db.query('insert into public.admin_members(user_id) values ($1)', [student]),
    /permission denied/i,
  );
  await assert.rejects(db.query("select public.set_admin('student@example.com',true)"), /Yönetici yetkisi/);
  await assert.rejects(db.query('select * from public.list_admins()'), /Yönetici yetkisi/);
  assert.equal((await db.query('select * from public.admin_audit_log')).rows.length, 0);
});
test('admin can CRUD questions, read drafts and audit logs', async () => {
  await asUser('authenticated', admin);
  assert.equal((await db.query('select * from public.content_entries')).rows.length, 2);
  await insert('new', 'draft');
  const before = (
    await db.query<{ updated_at: string }>(
      "select updated_at::text as updated_at from public.content_entries where id='new'",
    )
  ).rows[0].updated_at;
  await db.query("update public.content_entries set status='published' where id='new'");
  const after = (
    await db.query<{ updated_at: string }>(
      "select updated_at::text as updated_at from public.content_entries where id='new'",
    )
  ).rows[0].updated_at;
  assert.notEqual(String(before), String(after));
  await db.query("delete from public.content_entries where id='new'");
  const actions = (
    await db.query<{ action: string }>(
      "select action from public.admin_audit_log where entry_id='new' order by id",
    )
  ).rows.map((r) => r.action);
  assert.deepEqual(actions, ['INSERT', 'UPDATE', 'DELETE']);
  await assert.rejects(db.query('delete from public.admin_audit_log'), /permission denied/i);
});
test('invalid direct API payloads are rejected at database boundary', async () => {
  await asUser('authenticated', admin);
  await assert.rejects(
    insert('bad', 'published', { ...question.payload, id: 'bad', answer: 4, options: ['A', 'B', 'C', 'D'] }),
    /Geçersiz cevap/,
  );
  await assert.rejects(
    insert('bad', 'published', { ...question.payload, id: 'bad', options: [] }),
    /4 veya 5/,
  );
  await assert.rejects(
    insert('bad', 'published', { ...question.payload, id: 'bad', question: '' }),
    /Zorunlu alan/,
  );
  await assert.rejects(insert('bad', 'published', { ...question.payload, id: 'wrong' }), /valid_payload/);
});
test('admin grants and revokes roles; self-removal and unknown accounts are blocked', async () => {
  await asUser('authenticated', admin);
  await db.query("select public.set_admin('second@example.com',true)");
  assert.equal((await db.query('select * from public.list_admins()')).rows.length, 2);
  await assert.rejects(db.query("select public.set_admin('owner@example.com',false)"), /Kendi yönetici/);
  await assert.rejects(db.query("select public.set_admin('owner@example.com',null)"), /Yetki durumu/);
  await assert.rejects(db.query("select public.set_admin('missing@example.com',true)"), /Önce Supabase/);
  await asUser('authenticated', second);
  await insert('second-question', 'draft');
  await asUser('authenticated', admin);
  await db.query("select public.set_admin('second@example.com',false)");
  await asUser('authenticated', second);
  await assert.rejects(insert('revoked-write', 'published'), /row-level security/);
});
test('bundled import is complete and cannot overwrite existing edits', async () => {
  await asUser('authenticated', admin);
  for (const row of seedEntries()) {
    await db.query(
      'insert into public.content_entries(kind,id,payload,status) values ($1,$2,$3,$4) on conflict(kind,id) do nothing',
      [row.kind, row.id, JSON.stringify(row.payload), row.status],
    );
  }
  const count = (await db.query<{ n: number }>('select count(*)::int as n from public.content_entries'))
    .rows[0].n;
  assert.equal(count, seedEntries().length + 3);
  await db.query("update public.content_entries set status='draft' where kind=$1 and id=$2", [
    question.kind,
    question.id,
  ]);
  await db.query(
    'insert into public.content_entries(kind,id,payload,status) values ($1,$2,$3,$4) on conflict(kind,id) do nothing',
    [question.kind, question.id, JSON.stringify(question.payload), 'published'],
  );
  assert.equal(
    (
      await db.query<{ status: string }>(
        'select status from public.content_entries where kind=$1 and id=$2',
        [question.kind, question.id],
      )
    ).rows[0].status,
    'draft',
  );
});
