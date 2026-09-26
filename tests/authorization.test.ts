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
  await db.exec(
    readFileSync(new URL('../supabase/migrations/202609250001_accounts_roles.sql', import.meta.url), 'utf8'),
  );
  await db.exec(
    readFileSync(new URL('../supabase/migrations/202609250002_user_moderation.sql', import.meta.url), 'utf8'),
  );
  await db.exec(
    readFileSync(new URL('../supabase/migrations/202609250003_question_reports.sql', import.meta.url), 'utf8'),
  );
  await db.exec(
    readFileSync(new URL('../supabase/migrations/202609260001_quiz_quotas.sql', import.meta.url), 'utf8'),
  );
  await db.query('insert into public.members(user_id, role) values ($1, $2)', [admin, 'admin']);
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
    insert('bad', 'published', { ...question.payload, id: 'bad', answer: 5, options: ['A', 'B', 'C', 'D', 'E'] }),
    /Doğru cevap seçilmelidir/,
  );
  await assert.rejects(
    insert('bad', 'published', { ...question.payload, id: 'bad', options: [] }),
    /Tam 5 seçenek/,
  );
  await assert.rejects(
    insert('bad', 'published', { ...question.payload, id: 'bad', options: ['A', 'B', 'C', 'D'] }),
    /Tam 5 seçenek/,
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
test('admin bans and unbans users; banned users lose all access at the server', async () => {
  await asUser('authenticated', admin);
  // İkinci hesabı üyeye çevirip engelle.
  await db.query("select public.set_banned('second@example.com', true)");
  const list = await db.query<{ email: string; banned: boolean; role: string }>(
    "select email, banned, role from public.list_members() where email='second@example.com'",
  );
  assert.equal(list.rows.length, 1);
  assert.equal(list.rows[0].banned, true);
  assert.equal(list.rows[0].role, 'uye');

  // Engelli kullanıcı tüm yetkilerden düşer.
  await asUser('authenticated', second);
  assert.deepEqual((await db.query('select public.user_role() as r')).rows, [{ r: 'banned' }]);
  assert.deepEqual((await db.query('select public.is_admin() as a, public.is_member() as m')).rows, [
    { a: false, m: false },
  ]);
  await assert.rejects(insert('banned-write', 'published'), /row-level security/i);

  // Engel kaldırılınca yeniden üye gibi davranır.
  await asUser('authenticated', admin);
  await db.query("select public.set_banned('second@example.com', false)");
  const list2 = await db.query<{ banned: boolean }>(
    "select banned from public.list_members() where email='second@example.com'",
  );
  assert.equal(list2.rows[0].banned, false);
});

test('moderation guards: non-admins, self-ban and last-admin ban are blocked', async () => {
  // Admin olmayan ban yapamaz.
  await asUser('authenticated', student);
  await assert.rejects(db.query("select public.set_banned('second@example.com', true)"), /Yönetici yetkisi/);

  await asUser('authenticated', admin);
  // Kendi hesabını engelleyemez.
  await assert.rejects(db.query("select public.set_banned('owner@example.com', true)"), /Kendi hesabınızı/);
  // Başka bir admin engellendiğinde rolü 'uye'ye düşer; kalan admin (owner) yine ban yapabilir.
  await db.query("select public.set_admin('second@example.com', true)");
  await db.query("select public.set_banned('second@example.com', true)");
  const bannedAdmin = await db.query<{ role: string; banned: boolean }>(
    "select role, banned from public.list_members() where email='second@example.com'",
  );
  assert.deepEqual(bannedAdmin.rows, [{ role: 'uye', banned: true }]);
  await db.query("select public.set_banned('second@example.com', false)");
  await db.query("select public.set_admin('second@example.com', false)");
  // E-posta çözümleme yalnızca admin için.
  await asUser('authenticated', student);
  await assert.rejects(db.query("select public.resolve_user_id('owner@example.com')"), /Yönetici yetkisi/);
});

test('anyone can report a question; only admins read and resolve reports', async () => {
  // Misafir (anon) bildirim gönderebilir.
  await asUser('anon');
  await db.query(
    "insert into public.question_reports(question_id, reason) values ('tr1', 'Şık tekrarı var')",
  );
  // Üye de bildirim gönderebilir.
  await asUser('authenticated', student);
  await db.query("insert into public.question_reports(question_id, reason) values ('mt3', 'Cevap yanlış')");
  // Üye, bildirim listesini okuyamaz.
  await assert.rejects(db.query('select * from public.list_reports()'), /Yönetici yetkisi/);

  // Admin listeyi görür ve durumu değiştirir.
  await asUser('authenticated', admin);
  const reports = await db.query<{ question_id: string; reporter_email: string | null; status: string }>(
    'select question_id, reporter_email, status from public.list_reports() order by id',
  );
  assert.equal(reports.rows.length, 2);
  assert.equal(reports.rows[0].question_id, 'tr1');
  assert.equal(reports.rows[0].reporter_email, null); // misafir
  assert.equal(reports.rows[1].reporter_email, 'student@example.com');
  assert.equal(reports.rows[0].status, 'new');

  const id0 = (await db.query<{ id: number }>('select id from public.list_reports() order by id')).rows[0].id;
  await db.query('select public.set_report_status($1, $2)', [id0, 'resolved']);
  const after = await db.query<{ status: string }>(
    'select status from public.question_reports where id=$1',
    [id0],
  );
  assert.equal(after.rows[0].status, 'resolved');
});

test('admin stats aggregate member activity', async () => {
  // Kullanıcı kendi aktivitesini kaydeder (RLS: user_id = auth.uid()).
  await asUser('authenticated', student);
  await db.query(
    "insert into public.user_activities(user_id, date, quiz_count) values ($1, to_char(now() + interval '3 hours', 'YYYY-MM-DD'), 2)",
    [student],
  );
  await asUser('authenticated', admin);
  const stats = await db.query<{ total_members: string; active_today: string; total_quizzes: string }>(
    'select * from public.get_user_stats()',
  );
  assert.ok(Number(stats.rows[0].total_members) >= 1); // admin + önceki testlerde eklenen üyeler
  assert.ok(Number(stats.rows[0].active_today) >= 1);
  assert.ok(Number(stats.rows[0].total_quizzes) >= 2);
  // Admin olmayan göremez.
  await asUser('authenticated', student);
  await assert.rejects(db.query('select * from public.get_user_stats()'), /Yönetici yetkisi/);
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

test('plan quota settings are readable by users but writable only by admins', async () => {
  await asUser('anon');
  assert.deepEqual(
    (await db.query<{ settings: { guest: number; uye: number; vip: number | null } }>(
      'select public.get_quiz_quota_settings() as settings',
    )).rows[0].settings,
    { guest: 1, uye: 3, vip: null },
  );
  await assert.rejects(db.query('select * from public.quiz_quota_settings'), /permission denied/i);
  await assert.rejects(
    db.query('select public.set_quiz_quota_settings(2, 5, 10)'),
    /permission denied/i,
  );

  await asUser('authenticated', student);
  await assert.rejects(db.query('select public.set_quiz_quota_settings(2, 5, 10)'), /Yönetici yetkisi/);
  await assert.rejects(db.query('select * from public.quiz_quota_settings'), /permission denied/i);

  await asUser('authenticated', admin);
  await db.query('select public.set_quiz_quota_settings(2, 5, 10)');
  assert.deepEqual(
    (await db.query<{ settings: { guest: number; uye: number; vip: number | null } }>(
      'select public.get_quiz_quota_settings() as settings',
    )).rows[0].settings,
    { guest: 2, uye: 5, vip: 10 },
  );
  await db.query('select public.set_quiz_quota_settings(0, 0, null)');
  assert.deepEqual(
    (await db.query<{ settings: { guest: number; uye: number; vip: number | null } }>(
      'select public.get_quiz_quota_settings() as settings',
    )).rows[0].settings,
    { guest: 0, uye: 0, vip: null },
  );
  await assert.rejects(db.query('select public.set_quiz_quota_settings(10000, 5, null)'), /0 ile 9999/);
  assert.ok(
    (await db.query("select id from public.admin_audit_log where action='SET_QUIZ_QUOTAS'")).rows.length >= 2,
  );
});
