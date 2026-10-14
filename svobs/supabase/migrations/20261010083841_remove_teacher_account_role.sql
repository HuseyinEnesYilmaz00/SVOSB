alter table public.kullanicilar
  drop constraint if exists kullanicilar_rol_check;

alter table public.kullanicilar
  add constraint kullanicilar_rol_check
  check (rol = any (array['super_admin'::text, 'program_admin'::text, 'ogrenci'::text]));
