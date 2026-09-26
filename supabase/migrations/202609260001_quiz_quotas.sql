-- Configurable daily quiz limits for guest, member, and VIP plans.
begin;

create table if not exists public.quiz_quota_settings (
  id smallint primary key check (id = 1),
  guest_limit integer not null check (guest_limit between 0 and 9999),
  member_limit integer not null check (member_limit between 0 and 9999),
  vip_limit integer check (vip_limit between 0 and 9999),
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.quiz_quota_settings enable row level security;
revoke all on public.quiz_quota_settings from anon, authenticated;

insert into public.quiz_quota_settings(id, guest_limit, member_limit, vip_limit)
values (1, 1, 3, null)
on conflict (id) do nothing;

create or replace function public.get_quiz_quota_settings() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'guest', guest_limit,
    'uye', member_limit,
    'vip', vip_limit
  )
  from public.quiz_quota_settings where id = 1;
$$;
revoke all on function public.get_quiz_quota_settings() from public;
grant execute on function public.get_quiz_quota_settings() to anon, authenticated;

create or replace function public.set_quiz_quota_settings(
  p_guest_limit integer,
  p_member_limit integer,
  p_vip_limit integer
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Yönetici yetkisi gerekiyor.' using errcode = '42501';
  end if;
  if p_guest_limit is null or p_guest_limit not between 0 and 9999
    or p_member_limit is null or p_member_limit not between 0 and 9999
    or (p_vip_limit is not null and p_vip_limit not between 0 and 9999) then
    raise exception 'Test kotaları 0 ile 9999 arasında olmalıdır.';
  end if;

  insert into public.quiz_quota_settings(id, guest_limit, member_limit, vip_limit, updated_at)
  values (1, p_guest_limit, p_member_limit, p_vip_limit, clock_timestamp())
  on conflict (id) do update set
    guest_limit = excluded.guest_limit,
    member_limit = excluded.member_limit,
    vip_limit = excluded.vip_limit,
    updated_at = excluded.updated_at;

  insert into public.admin_audit_log(actor_id, action, kind, entry_id)
  values (
    auth.uid(),
    'SET_QUIZ_QUOTAS',
    'settings',
    format('guest=%s,uye=%s,vip=%s', p_guest_limit, p_member_limit, coalesce(p_vip_limit::text, 'unlimited'))
  );
end;
$$;
revoke all on function public.set_quiz_quota_settings(integer, integer, integer) from public;
grant execute on function public.set_quiz_quota_settings(integer, integer, integer) to authenticated;

commit;
