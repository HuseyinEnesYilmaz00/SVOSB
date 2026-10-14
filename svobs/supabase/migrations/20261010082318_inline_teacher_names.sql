alter table public.dersler
  add column if not exists ogretmen_adi text;

update public.dersler d
set ogretmen_adi = kaynak.ogretmen_adi
from (
  select od.ders_id,
         string_agg(trim(concat_ws(' ', k.ad, k.soyad)), ', ' order by k.ad, k.soyad) as ogretmen_adi
  from public.ogretmen_dersleri od
  join public.kullanicilar k on k.id = od.ogretmen_id
  group by od.ders_id
) kaynak
where kaynak.ders_id = d.id
  and nullif(trim(d.ogretmen_adi), '') is null;

update public.programlar
set ad = case
  when lower(ad) = 'cagin musablari' then 'Çağın Musabları'
  when lower(ad) = 'cagin esmalari' then 'Çağın Esmaları'
  else ad
end
where lower(ad) in ('cagin musablari', 'cagin esmalari');
