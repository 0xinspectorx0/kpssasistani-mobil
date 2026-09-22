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
    if jsonb_array_length(p->'options') not between 4 and 5 then raise exception '4 veya 5 seçenek girin.'; end if;
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
