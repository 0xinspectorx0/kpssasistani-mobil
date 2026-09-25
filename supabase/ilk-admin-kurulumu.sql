-- ============================================================
-- İLK YÖNETİCİ (ADMIN) ATAMA
-- Kullanım: 'SENIN@EPOSTA.COM' kısmını KENDİ e-posta adresinle değiştir, sonra Çalıştır.
-- Dikkat: Bu hesabın önce uygulamadan üye olması veya
--         Supabase → Authentication → Users → Add user ile eklenmiş olması gerekir.
-- ============================================================

insert into public.members (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('SENIN@EPOSTA.COM')
on conflict (user_id) do update set role = 'admin';

-- Doğrulama: 1 satır dönmeli (aşağıda e-posta + admin görünmeli).
select u.email, m.role
from public.members m
join auth.users u on u.id = m.user_id;
