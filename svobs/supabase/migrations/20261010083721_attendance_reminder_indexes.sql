create index if not exists idx_yoklama_uyarilari_sorumlu_ogrenci_id
  on public.yoklama_uyarilari (sorumlu_ogrenci_id);

create index if not exists idx_yoklama_uyarilari_duyuru_id
  on public.yoklama_uyarilari (duyuru_id);
