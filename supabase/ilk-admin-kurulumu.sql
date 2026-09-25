-- ============================================================
-- İLK YÖNETİCİ (ADMIN) ATAMA
-- E-posta: orangeulrica@uberip.com
-- Çalıştırmadan ÖNCE: bu e-postanın Supabase'de bir hesabı olmalı.
--   Seçenek 1 (önerilen): Supabase → Authentication → Users → Add user
--             → e-posta: orangeulrica@uberip.com, bir şifre yaz,
--             "Auto Confirm User" İŞARETLİ olsun → Create User
--   Seçenek 2: uygulamadan bu e-postayla üye ol.
-- Sonra bu dosyayı SQL Editor'de Çalıştır (Run).
-- ============================================================

insert into public.members (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('orangeulrica@uberip.com')
on conflict (user_id) do update set role = 'admin';

-- Doğrulama: 1 satır dönmeli (e-posta + admin görünmeli).
select u.email, m.role
from public.members m
join auth.users u on u.id = m.user_id
where lower(u.email) = lower('orangeulrica@uberip.com');
