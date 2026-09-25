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
