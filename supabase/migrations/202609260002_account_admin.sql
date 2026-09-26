-- KPSS Asistanım — hesap yönetimi: Edge Function'sız hesap silme + e-postaya önceden rol atama
-- 202609250002_user_moderation.sql ve 202609260001_quiz_quotas.sql üzerine uygulanır.
--
-- Bu dosya Supabase Dashboard > SQL Editor'de bir kez çalıştırılır. Ek kurulum (CLI, Docker,
-- service_role anahtarı, Edge Function deploy) GEREKMEZ:
--   * delete_user_account(): SECURITY DEFINER olduğu için fonksiyonun sahibi (postgres) adına
--     çalışır ve auth.users kaydını doğrudan silebilir. Çağıranın admin olduğu sunucuda doğrulanır.
--   * pending_roles: henüz üye olmamış bir e-postaya rol atanır; kişi üye olur olmaz
--     on_auth_user_created tetikleyicisi rolü otomatik uygular.
begin;

-- 1) Bekleyen rol atamaları (hesap henüz yokken e-postaya rol verme)
create table if not exists public.pending_roles (
  email text primary key check (email = lower(btrim(email)) and email like '%_@_%.__%'),
  role text not null check (role in ('admin','editor','viewer','uye','vip')),
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.pending_roles enable row level security;
revoke all on public.pending_roles from anon, authenticated;
-- İstemci bu tabloya doğrudan erişemez; yalnızca aşağıdaki admin kontrollü RPC'ler kullanılır.

-- 2) Rol ata: hesap varsa hemen uygula, yoksa bekleyenlere yaz.
--    Dönüş: {"status":"applied"|"pending","email":..., "role":...}
create or replace function public.assign_role(target_email text, new_role text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
  clean_email text := lower(btrim(coalesce(target_email, '')));
begin
  if new_role is null or new_role not in ('admin','editor','viewer','uye','vip') then
    raise exception 'Geçersiz rol.';
  end if;
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  if clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' then
    raise exception 'Geçerli bir e-posta adresi girin.';
  end if;
  perform pg_advisory_xact_lock(20260922);

  select id into target_id from auth.users where lower(email) = clean_email;
  if target_id is not null then
    if target_id = auth.uid() and new_role <> 'admin' then
      raise exception 'Kendi admin yetkinizi düşüremezsiniz.';
    end if;
    insert into public.members(user_id, role) values(target_id, new_role)
      on conflict (user_id) do update set role = excluded.role;
    -- Aynı e-posta için bekleyen kayıt kaldıysa temizle.
    delete from public.pending_roles where email = clean_email;
    insert into public.admin_audit_log(actor_id, action, kind, entry_id)
      values(auth.uid(), 'SET_ROLE:' || new_role, 'admins', target_id::text);
    return jsonb_build_object('status', 'applied', 'email', clean_email, 'role', new_role, 'user_id', target_id);
  end if;

  insert into public.pending_roles(email, role, created_by) values (clean_email, new_role, auth.uid())
    on conflict (email) do update set role = excluded.role, created_by = excluded.created_by, created_at = now();
  insert into public.admin_audit_log(actor_id, action, kind, entry_id)
    values(auth.uid(), 'PENDING_ROLE:' || new_role, 'admins', clean_email);
  return jsonb_build_object('status', 'pending', 'email', clean_email, 'role', new_role);
end;
$$;
revoke all on function public.assign_role(text, text) from public;
grant execute on function public.assign_role(text, text) to authenticated;

-- 3) Bekleyen rolleri listele / kaldır (yalnızca admin)
create or replace function public.list_pending_roles()
returns table(email text, role text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  return query
    select p.email, p.role, p.created_at from public.pending_roles p order by p.created_at desc;
end;
$$;
revoke all on function public.list_pending_roles() from public;
grant execute on function public.list_pending_roles() to authenticated;

create or replace function public.cancel_pending_role(target_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare clean_email text := lower(btrim(coalesce(target_email, '')));
begin
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  delete from public.pending_roles where email = clean_email;
  if not found then raise exception 'Bu e-posta için bekleyen rol ataması yok.'; end if;
  insert into public.admin_audit_log(actor_id, action, kind, entry_id)
    values(auth.uid(), 'CANCEL_PENDING_ROLE', 'admins', clean_email);
end;
$$;
revoke all on function public.cancel_pending_role(text) from public;
grant execute on function public.cancel_pending_role(text) to authenticated;

-- 4) Yeni kullanıcı tetikleyicisi: bekleyen rol varsa onu uygula, yoksa 'uye'.
--    (on_auth_user_created tetikleyicisi 202609250001 ile zaten tanımlı; yalnızca gövde güncellenir.)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  pending public.pending_roles%rowtype;
begin
  select * into pending from public.pending_roles where email = lower(btrim(coalesce(new.email, '')));
  if pending.email is not null then
    insert into public.members(user_id, role) values(new.id, pending.role)
      on conflict (user_id) do update set role = excluded.role;
    delete from public.pending_roles where email = pending.email;
    insert into public.admin_audit_log(actor_id, action, kind, entry_id)
      values(pending.created_by, 'APPLY_PENDING_ROLE:' || pending.role, 'admins', new.id::text);
  else
    insert into public.members(user_id, role) values(new.id, 'uye') on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Hesabı kalıcı sil (Edge Function / service_role GEREKMEZ)
--    Güvenlik: yalnızca admin çağırabilir; kendi hesabı ve admin hesapları silinemez.
--    auth.users silinince Supabase'in kendi FK'ları (identities, sessions, refresh_tokens, mfa)
--    ve bu projedeki members / user_activities kayıtları (on delete cascade) birlikte silinir.
create or replace function public.delete_user_account(target_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
  target_role text;
  clean_email text := lower(btrim(coalesce(target_email, '')));
begin
  if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(20260922);

  select id into target_id from auth.users where lower(email) = clean_email;
  if target_id is null then
    -- Hesap yok; yalnızca bekleyen rol kaydı varsa onu temizle.
    delete from public.pending_roles where email = clean_email;
    if found then
      insert into public.admin_audit_log(actor_id, action, kind, entry_id)
        values(auth.uid(), 'CANCEL_PENDING_ROLE', 'admins', clean_email);
      return jsonb_build_object('status', 'pending_removed', 'email', clean_email);
    end if;
    raise exception 'Bu e-posta ile kayıtlı bir hesap bulunamadı.';
  end if;
  if target_id = auth.uid() then raise exception 'Kendi hesabınızı buradan silemezsiniz.'; end if;

  select role into target_role from public.members where user_id = target_id;
  if target_role = 'admin' then
    raise exception 'Yönetici hesabı silinemez. Önce yetkisini kaldırın.';
  end if;

  delete from public.members where user_id = target_id;
  delete from public.user_activities where user_id = target_id;
  delete from public.pending_roles where email = clean_email;
  delete from auth.users where id = target_id;

  insert into public.admin_audit_log(actor_id, action, kind, entry_id)
    values(auth.uid(), 'DELETE_USER', 'admins', clean_email);
  return jsonb_build_object('status', 'deleted', 'email', clean_email, 'user_id', target_id);
end;
$$;
revoke all on function public.delete_user_account(text) from public;
grant execute on function public.delete_user_account(text) to authenticated;

commit;
