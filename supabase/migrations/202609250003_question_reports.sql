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
