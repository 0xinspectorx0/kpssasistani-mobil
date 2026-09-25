-- !!! TEK DOSYA KURULUM !!!
-- KPSS Asistanım supabase projesi icin tum migrationlar sirasiyla birlestirildi.
-- SQL Editor'de bu dosyanin TAMAMINI secip Calistir (Run) — tek seferde kurulum.
-- Olusturulma: 2026-09-25 — kaynak: supabase/migrations/ (4 dosya, sirayla)

-- ============ 1/4 admin_content ============
-- Run once in the Supabase SQL Editor (or with `supabase db push`).
begin;

create table public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_members enable row level security;
-- No direct client policies: roles cannot be self-assigned.
revoke all on public.admin_members from anon, authenticated;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_members where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.content_entries (
  kind text not null check (kind in ('questions','lessons','news','events','targets','scores','quotes')),
  id text not null check (id ~ '^[a-zA-Z0-9_-]{1,120}$'),
  payload jsonb not null,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (kind, id),
  constraint valid_payload check (
    jsonb_typeof(payload) = 'object' and payload ? 'id'
    and jsonb_typeof(payload->'id') = 'string' and payload->>'id' = id
    and octet_length(payload::text) <= 200000
  )
);
create index content_entries_status_idx on public.content_entries(status, kind, id);
alter table public.content_entries enable row level security;
revoke all on public.content_entries from anon, authenticated;
grant select on public.content_entries to anon, authenticated;
grant insert, update, delete on public.content_entries to authenticated;
create policy published_read on public.content_entries for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));
create policy admin_insert on public.content_entries for insert to authenticated
  with check ((select public.is_admin()));
create policy admin_update on public.content_entries for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_delete on public.content_entries for delete to authenticated
  using ((select public.is_admin()));

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  kind text not null,
  entry_id text not null,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;
create policy admin_audit_read on public.admin_audit_log for select to authenticated
  using ((select public.is_admin()));

-- Validate the critical question structure even if a client bypasses the form.
create function public.validate_content_entry() returns trigger
language plpgsql set search_path = '' as $$
declare
  field text;
  required_fields text[];
  p jsonb := new.payload;
begin
  if tg_op = 'UPDATE' and (new.kind <> old.kind or new.id <> old.id) then
    raise exception 'İçerik kimliği değiştirilemez.';
  end if;
  required_fields := case new.kind
    when 'questions' then array['question','category','difficulty','explanation']
    when 'lessons' then array['name','icon','color','questions']
    when 'news' then array['title','category','detail','date']
    when 'events' then array['title','date','type','desc']
    when 'targets' then array['name','short','scoreType','eventId']
    when 'scores' then array['level','kadro','kurum']
    when 'quotes' then array['text','author']
    else array[]::text[] end;
  foreach field in array required_fields loop
    if jsonb_typeof(p->field) is distinct from 'string' or length(btrim(p->>field)) not between 1 and 20000 then
      raise exception 'Zorunlu alan eksik veya geçersiz: %', field;
    end if;
  end loop;
  if new.kind = 'questions' then
    if p->>'category' not in ('turkce','matematik','tarih','cografya','vatandaslik','guncel')
      or p->>'difficulty' not in ('Kolay','Orta','Zor') then
      raise exception 'Geçersiz ders veya zorluk.';
    end if;
    if jsonb_typeof(p->'options') is distinct from 'array' then raise exception 'Seçenekler zorunludur.'; end if;
    if jsonb_array_length(p->'options') <> 5 then raise exception 'Tam 5 seçenek (A-E) girin.'; end if;
    if exists (select 1 from jsonb_array_elements(p->'options') as o where jsonb_typeof(o) <> 'string' or length(btrim(o #>> '{}')) not between 1 and 20000) then
      raise exception 'Seçenekler boş bırakılamaz.';
    end if;
    if jsonb_typeof(p->'answer') is distinct from 'number' or (p->>'answer') !~ '^[0-4]$' then raise exception 'Doğru cevap seçilmelidir.'; end if;
    if (p->>'answer')::int >= jsonb_array_length(p->'options') then raise exception 'Geçersiz cevap.'; end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger validate_content before insert or update on public.content_entries
  for each row execute function public.validate_content_entry();

create function public.audit_content_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    insert into public.admin_audit_log(actor_id,action,kind,entry_id) values(auth.uid(),tg_op,old.kind,old.id);
    return old;
  end if;
  insert into public.admin_audit_log(actor_id,action,kind,entry_id) values(auth.uid(),tg_op,new.kind,new.id);
  return new;
end;
$$;
revoke all on function public.audit_content_change() from public;
create trigger audit_content after insert or update or delete on public.content_entries
  for each row execute function public.audit_content_change();

create function public.list_admins() returns table(user_id uuid, email text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  return query select m.user_id, u.email::text, m.created_at
    from public.admin_members m join auth.users u on u.id = m.user_id order by m.created_at;
end;
$$;
revoke all on function public.list_admins() from public;
grant execute on function public.list_admins() to authenticated;

-- Only existing, verified Auth accounts may become administrators.
-- First administrator must be bootstrapped by the project owner in SQL Editor.
create function public.set_admin(target_email text, enabled boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare target_id uuid;
begin
  if enabled is null then raise exception 'Yetki durumu zorunludur.'; end if;
  perform pg_advisory_xact_lock(20260922);
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  select id into target_id from auth.users where lower(email) = lower(btrim(target_email)) and email_confirmed_at is not null;
  if target_id is null then raise exception 'Önce Supabase Authentication bölümünde doğrulanmış bir kullanıcı oluşturun.'; end if;
  if target_id = auth.uid() and not enabled then raise exception 'Kendi yönetici yetkinizi kaldıramazsınız.'; end if;
  if enabled then
    insert into public.admin_members(user_id) values(target_id) on conflict do nothing;
  else
    delete from public.admin_members where user_id = target_id;
  end if;
  insert into public.admin_audit_log(actor_id,action,kind,entry_id)
    values(auth.uid(),case when enabled then 'GRANT_ADMIN' else 'REVOKE_ADMIN' end,'admins',target_id::text);
end;
$$;
revoke all on function public.set_admin(text, boolean) from public;
grant execute on function public.set_admin(text, boolean) to authenticated;

commit;

-- ============ 2/4 accounts_roles ============
-- KPSS Asistanım — hesap, rol ve esnek ders güncellemesi
-- Bu dosya 202609220001_admin_content.sql üzerine uygulanır (idempotent parçalar ekleme).
begin;

-- 1) Rol tablosu: admin_members yerine roller. Mevcut adminler "admin" rolüyle taşınır.
create table if not exists public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'uye' check (role in ('admin','editor','viewer','uye','vip')),
  created_at timestamptz not null default now()
);
alter table public.members enable row level security;
revoke all on public.members from anon, authenticated;
grant select on public.members to authenticated;

-- mevcut adminleri taşı (varsa)
insert into public.members(user_id, role)
select user_id, 'admin'
from public.admin_members
on conflict (user_id) do nothing;

-- 2) Yetki yardımcıları ve "okuma erişimi" (üyeler için içerik senkronu)
create or replace function public.user_role() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select role from public.members where user_id = (select auth.uid())), '')
  $$;
revoke all on function public.user_role() from public;
grant execute on function public.user_role() to anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role from public.members where user_id = (select auth.uid())),'') = 'admin';
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.can_manage_content() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role from public.members where user_id = (select auth.uid())),'') in ('admin','editor');
$$;
revoke all on function public.can_manage_content() from public;
grant execute on function public.can_manage_content() to anon, authenticated;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where user_id = (select auth.uid()));
$$;
revoke all on function public.is_member() from public;
grant execute on function public.is_member() to anon, authenticated;

-- ders kimliği doğrulaması: soru kategorisi / ders kimliği serbest biçimde
-- (mevcut check kısıtı yok; uygulama + trigger zaten doğrular)

-- 3) İçerik tablosuna roller için güncellenmiş RLS
-- Okuma: yayındaki içerik herkese; taslaklar (admin/editor/viewer) rollerine.
drop policy if exists published_read on public.content_entries;
create policy published_read on public.content_entries for select to anon, authenticated
  using (status = 'published' or public.user_role() in ('admin', 'editor', 'viewer'));

-- Yazma: yalnızca admin/editor
drop policy if exists admin_insert on public.content_entries;
create policy admin_insert on public.content_entries for insert to authenticated
  with check (public.can_manage_content());
drop policy if exists admin_update on public.content_entries;
create policy admin_update on public.content_entries for update to authenticated
  using (public.can_manage_content()) with check (public.can_manage_content());
drop policy if exists admin_delete on public.content_entries;
create policy admin_delete on public.content_entries for delete to authenticated
  using (public.can_manage_content());

-- 4) Doğrulama trigger'ı: lessons/questions için mesajlar güncellenir,
--    ayrıca ders silinmeden önce bağlı soru/konu kontrolü.
drop trigger if exists validate_content on public.content_entries;
create or replace function public.validate_content_entry() returns trigger
language plpgsql set search_path = '' as $$
declare
  field text;
  required_fields text[];
  p jsonb := new.payload;
begin
  if tg_op = 'UPDATE' and (new.kind <> old.kind or new.id <> old.id) then
    raise exception 'İçerik kimliği değiştirilemez.';
  end if;
  required_fields := case new.kind
    when 'questions' then array['question','category','difficulty','explanation']
    when 'lessons' then array['name','icon','color','questions']
    when 'news' then array['title','category','detail','date']
    when 'events' then array['title','date','type','desc']
    when 'targets' then array['name','short','scoreType','eventId']
    when 'scores' then array['level','kadro','kurum']
    when 'quotes' then array['text','author']
    else array[]::text[] end;
  foreach field in array required_fields loop
    if jsonb_typeof(p->field) is distinct from 'string' or length(btrim(p->>field)) not between 1 and 20000 then
      raise exception 'Zorunlu alan eksik veya geçersiz: %', field;
    end if;
  end loop;
  if new.kind = 'questions' then
    if (p->>'category') !~ '^[a-z0-9][a-z0-9-]*$' then
      raise exception 'Geçersiz ders kimliği.';
    end if;
    if p->>'difficulty' not in ('Kolay','Orta','Zor') then
      raise exception 'Geçersiz zorluk.';
    end if;
    if jsonb_typeof(p->'options') is distinct from 'array' then raise exception 'Seçenekler zorunludur.'; end if;
    if jsonb_array_length(p->'options') <> 5 then raise exception 'Tam 5 seçenek (A-E) girin.'; end if;
    if exists (select 1 from jsonb_array_elements(p->'options') as o where jsonb_typeof(o) <> 'string' or length(btrim(o #>> '{}')) not between 1 and 20000) then
      raise exception 'Seçenekler boş bırakılamaz.';
    end if;
    if jsonb_typeof(p->'answer') is distinct from 'number' or (p->>'answer') !~ '^[0-4]$' then raise exception 'Doğru cevap seçilmelidir.'; end if;
    if (p->>'answer')::int >= jsonb_array_length(p->'options') then raise exception 'Geçersiz cevap.'; end if;
  end if;
  if new.kind = 'lessons' then
    if (p->>'id') !~ '^[a-z0-9][a-z0-9-]*$' then raise exception 'Geçersiz ders kimliği.'; end if;
    if jsonb_typeof(p->'topics') is distinct from 'array' then raise exception 'Konular zorunludur.'; end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger validate_content before insert or update on public.content_entries
  for each row execute function public.validate_content_entry();

-- 5) Silme koruması: başka içeriğin bağlı olduğu ders/etkinlik silinemez.
create or replace function public.block_linked_delete() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.kind = 'lessons' and exists (
    select 1 from public.content_entries q
    where q.kind = 'questions' and q.status = 'published'
      and q.payload->>'category' = old.id
  ) then
    raise exception 'Bu derse yayında soru bağlı. Önce soruları başka derse taşıyın veya taslağa alın.';
  end if;
  if old.kind = 'events' and exists (
    select 1 from public.content_entries t
    where t.kind = 'targets' and t.status = 'published'
      and t.payload->>'eventId' = old.id
  ) then
    raise exception 'Bu etkinliğe hedef sınav bağlı. Önce bağlantıyı kaldırın.';
  end if;
  return old;
end;
$$;
create trigger block_linked_delete before delete on public.content_entries
  for each row execute function public.block_linked_delete();

-- 6) Roller: üyeleri listele ve rol ata/değiştir.
create or replace function public.list_members()
returns table(user_id uuid, email text, role text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  return query
    select m.user_id, u.email::text, m.role, m.created_at
    from public.members m join auth.users u on u.id = m.user_id
    order by m.created_at;
end;
$$;
revoke all on function public.list_members() from public;
grant execute on function public.list_members() to authenticated;

create or replace function public.set_role(target_email text, new_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare target_id uuid;
begin
  if new_role is null or new_role not in ('admin','editor','viewer','uye','vip') then
    raise exception 'Geçersiz rol.'; end if;
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(20260922);
  select id into target_id from auth.users where lower(email) = lower(btrim(target_email));
  if target_id is null then
    raise exception 'Supabase Authentication bölümünde kayıtlı, doğrulanmış bir kullanıcı bulunamadı.';
  end if;
  if target_id = auth.uid() and new_role <> 'admin' then
    raise exception 'Kendi admin yetkinizi düşüremezsiniz.';
  end if;
  insert into public.members(user_id, role) values(target_id, new_role)
    on conflict (user_id) do update set role = excluded.role;
  insert into public.admin_audit_log(actor_id,action,kind,entry_id)
    values(auth.uid(),'SET_ROLE:'||new_role,'admins',target_id::text);
end;
$$;
revoke all on function public.set_role(text, text) from public;
grant execute on function public.set_role(text, text) to authenticated;

-- eski admin girişlerini saran uyumluluk fonksiyonları
create or replace function public.list_admins()
returns table(user_id uuid, email text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  return query select m.user_id, u.email::text, m.created_at
    from public.members m join auth.users u on u.id = m.user_id
    where m.role = 'admin' order by m.created_at;
end;
$$;
revoke all on function public.list_admins() from public;
grant execute on function public.list_admins() to authenticated;

create or replace function public.set_admin(target_email text, enabled boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare target_id uuid;
begin
  if enabled is null then raise exception 'Yetki durumu zorunludur.'; end if;
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  select id into target_id from auth.users where lower(email) = lower(btrim(target_email));
  if target_id is null then raise exception 'Önce Supabase Authentication bölümünde doğrulanmış bir kullanıcı oluşturun.'; end if;
  if target_id = auth.uid() and not enabled then raise exception 'Kendi yönetici yetkinizi kaldıramazsınız.'; end if;
  if enabled then
    insert into public.members(user_id, role) values(target_id, 'admin')
      on conflict (user_id) do update set role = 'admin';
    insert into public.admin_audit_log(actor_id,action,kind,entry_id)
      values(auth.uid(),'GRANT_ADMIN','admins',target_id::text);
  else
    delete from public.members where user_id = target_id;
    insert into public.admin_audit_log(actor_id,action,kind,entry_id)
      values(auth.uid(),'REVOKE_ADMIN','admins',target_id::text);
  end if;
end;
$$;
revoke all on function public.set_admin(text, boolean) from public;
grant execute on function public.set_admin(text, boolean) to authenticated;

-- 7) Kullanıcı verileri senkronu (misafir test kotası, günlük limit, bulut senkronu)
create table if not exists public.user_activities (
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  quiz_count integer not null default 0,
  primary key (user_id, date)
);
alter table public.user_activities enable row level security;
revoke all on public.user_activities from anon, authenticated;
grant select, insert, update on public.user_activities to authenticated;
create policy own_activity_read on public.user_activities for select to authenticated
  using (user_id = (select auth.uid()));
create policy own_activity_insert on public.user_activities for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy own_activity_update on public.user_activities for update to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.increment_quiz_count(p_user_id uuid, p_date text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() <> p_user_id then raise exception 'Yetkiniz yok.' using errcode = '42501'; end if;
  insert into public.user_activities(user_id, date, quiz_count)
  values (p_user_id, p_date, 1)
  on conflict (user_id, date) do update set quiz_count = public.user_activities.quiz_count + 1;
end;
$$;
revoke all on function public.increment_quiz_count(uuid, text) from public;
grant execute on function public.increment_quiz_count(uuid, text) to authenticated;

-- 8) İlk tetikleyici: bir kullanıcı Auth'a kaydolduğunda otomatik üye rolü
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.members(user_id, role) values(new.id, 'uye') on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

commit;

-- ============ 3/4 user_moderation ============
-- KPSS Asistanım — kullanıcı denetimi: engelleme (ban) ve hesap silme desteği
-- 202609250001_accounts_roles.sql üzerine uygulanır.
begin;

-- 1) members tablosuna ban durumu
alter table public.members add column if not exists banned boolean not null default false;
alter table public.members add column if not exists banned_at timestamptz;

-- 2) Yetki fonksiyonları: engelli kullanıcılar tüm yetkilerden düşer
--    (RLS politikalari bu fonksiyonlari cagirdigi icin guncelleme sunucuda da koruma saglar)
create or replace function public.user_role() returns text
language sql stable security definer set search_path = '' as $$
  select case
    when (select coalesce(banned, false) from public.members where user_id = (select auth.uid())) then 'banned'
    else coalesce((select role from public.members where user_id = (select auth.uid())), '')
  end;
$$;
revoke all on function public.user_role() from public;
grant execute on function public.user_role() to anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role from public.members where user_id = (select auth.uid())), '') = 'admin'
    and not coalesce((select banned from public.members where user_id = (select auth.uid())), false);
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.can_manage_content() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role from public.members where user_id = (select auth.uid())), '') in ('admin','editor')
    and not coalesce((select banned from public.members where user_id = (select auth.uid())), false);
$$;
revoke all on function public.can_manage_content() from public;
grant execute on function public.can_manage_content() to anon, authenticated;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members
    where user_id = (select auth.uid()) and not coalesce(banned, false)
  );
$$;
revoke all on function public.is_member() from public;
grant execute on function public.is_member() to anon, authenticated;

-- 3) Üye listesi: engelli durumunu da döndür (dönüş tipi değiştiği için önce drop)
drop function if exists public.list_members();
create function public.list_members()
returns table(user_id uuid, email text, role text, banned boolean, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  return query
    select m.user_id, u.email::text, m.role, coalesce(m.banned, false), m.created_at
    from public.members m join auth.users u on u.id = m.user_id
    order by m.created_at;
end;
$$;
revoke all on function public.list_members() from public;
grant execute on function public.list_members() to authenticated;

-- 4) Engelleme / engel kaldırma
create or replace function public.set_banned(target_email text, banned_state boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
  target_role text;
  admin_count int;
begin
  if banned_state is null then raise exception 'Durum zorunludur.'; end if;
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(20260922);
  select id into target_id from auth.users where lower(email) = lower(btrim(target_email));
  if target_id is null then raise exception 'Supabase Authentication bölümünde kayıtlı bir kullanıcı bulunamadı.'; end if;
  if target_id = auth.uid() then raise exception 'Kendi hesabınızı engelleyemezsiniz.'; end if;

  select role into target_role from public.members where user_id = target_id;
  if banned_state and target_role = 'admin' then
    select count(*) into admin_count from public.members where role = 'admin' and not coalesce(banned, false);
    if admin_count <= 1 then raise exception 'Son yönetici engellenemez.'; end if;
  end if;

  insert into public.members(user_id, role, banned) values (target_id, 'uye', coalesce(banned_state, false))
    on conflict (user_id) do nothing;
  update public.members
    set banned = banned_state,
        banned_at = case when banned_state then now() else null end
    where user_id = target_id;
  if banned_state then
    update public.members set role = 'uye' where user_id = target_id;
  end if;

  insert into public.admin_audit_log(actor_id, action, kind, entry_id)
    values(auth.uid(), case when banned_state then 'BAN_USER' else 'UNBAN_USER' end, 'admins', target_id::text);
end;
$$;
revoke all on function public.set_banned(text, boolean) from public;
grant execute on function public.set_banned(text, boolean) to authenticated;

-- 5) E-posta -> kullanici kimligi (Edge Function'in hedefi silmek icin kullandigi, admin kontrollu)
create or replace function public.resolve_user_id(target_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare target_id uuid;
begin
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  select id into target_id from auth.users where lower(email) = lower(btrim(target_email));
  if target_id is null then raise exception 'Supabase Authentication bölümünde kayıtlı bir kullanıcı bulunamadı.'; end if;
  return target_id;
end;
$$;
revoke all on function public.resolve_user_id(text) from public;
grant execute on function public.resolve_user_id(text) to authenticated;

commit;

-- ============ 4/4 question_reports ============
-- KPSS Asistanım — hatalı soru bildirimleri + kullanıcı etkinlik istatistikleri
-- 202609250001_accounts_roles.sql ve 202609250002_user_moderation.sql üzerine uygulanır.
begin;

-- 1) Hatalı soru bildirimleri
create table if not exists public.question_reports (
  id bigint generated always as identity primary key,
  question_id text not null,
  reporter_id uuid default auth.uid(),   -- girişli kullanıcı otomatik; misafirde null
  reason text,                   -- kullanıcının isteğe bağlı kısa açıklaması
  status text not null default 'new' check (status in ('new', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);
alter table public.question_reports enable row level security;
revoke all on public.question_reports from anon, authenticated;
grant select, insert, update on public.question_reports to anon, authenticated;

-- Herkes (misafir dahil) bildirim gönderebilir.
create policy question_reports_insert on public.question_reports for insert to anon, authenticated
  with check (true);
-- Yalnızca adminler listeyi okur ve durumu değiştirir (yazım güvenliği için extra kontrol).
create policy question_reports_admin_read on public.question_reports for select to authenticated
  using ((select public.is_admin()));
create policy question_reports_admin_update on public.question_reports for update to authenticated
  using ((select public.is_admin()));

-- 2) Admin için bildirim listesi
create or replace function public.list_reports()
returns table(id bigint, question_id text, reporter_email text, reason text, status text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  return query
    select r.id, r.question_id, u.email::text, r.reason, r.status, r.created_at
    from public.question_reports r
    left join auth.users u on u.id = r.reporter_id
    order by r.created_at desc;
end;
$$;
revoke all on function public.list_reports() from public;
grant execute on function public.list_reports() to authenticated;

-- 3) Bildirim durumu güncelleme (çözüldü / kapatıldı)
create or replace function public.set_report_status(report_id bigint, new_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  if new_status not in ('new', 'resolved', 'dismissed') then raise exception 'Geçersiz durum.'; end if;
  update public.question_reports set status = new_status where id = report_id;
end;
$$;
revoke all on function public.set_report_status(bigint, text) from public;
grant execute on function public.set_report_status(bigint, text) to authenticated;

-- 4) Kullanıcı etkinlik istatistikleri (admin)
create or replace function public.get_user_stats()
returns table(
  total_members bigint,
  active_today bigint,
  active_7d bigint,
  total_quizzes bigint
)
language plpgsql security definer set search_path = '' as $$
declare
  today_txt text := to_char(now() + interval '3 hours', 'YYYY-MM-DD'); -- TR saati (UTC+3, DST yok)
  week_txt text := to_char(now() + interval '3 hours' - interval '6 days', 'YYYY-MM-DD');
begin
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  return query
    select
      (select count(*)::bigint from public.members),
      (select count(distinct user_id)::bigint from public.user_activities where date = today_txt and quiz_count > 0),
      (select count(distinct user_id)::bigint from public.user_activities where date >= week_txt),
      (select coalesce(sum(quiz_count), 0)::bigint from public.user_activities);
end;
$$;
revoke all on function public.get_user_stats() from public;
grant execute on function public.get_user_stats() to authenticated;

commit;
