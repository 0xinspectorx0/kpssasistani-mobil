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
