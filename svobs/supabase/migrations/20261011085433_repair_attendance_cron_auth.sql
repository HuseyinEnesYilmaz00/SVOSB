create table if not exists public.sistem_anahtarlari (
  anahtar text primary key,
  deger_hash text not null,
  guncellenme_tarihi timestamptz not null default now()
);
alter table public.sistem_anahtarlari enable row level security;
revoke all on table public.sistem_anahtarlari from anon, authenticated;
grant select on table public.sistem_anahtarlari to service_role;

do $$
declare
  ham_anahtar text := encode(gen_random_bytes(32), 'hex');
  eski_anahtar record;
begin
  for eski_anahtar in select id from vault.secrets where name = 'attendance_cron_secret'
  loop
    perform vault.delete_secret(eski_anahtar.id);
  end loop;
  perform vault.create_secret(ham_anahtar, 'attendance_cron_secret', 'Attendance reminder cron authentication');
  insert into public.sistem_anahtarlari (anahtar, deger_hash, guncellenme_tarihi)
  values ('attendance_cron_secret', encode(digest(ham_anahtar, 'sha256'), 'hex'), now())
  on conflict (anahtar) do update
    set deger_hash = excluded.deger_hash,
        guncellenme_tarihi = excluded.guncellenme_tarihi;
end
$$;

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'check-attendance-reminders-hourly'),
  command := $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'attendance_project_url') || '/functions/v1/check-yoklama-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'attendance_cron_secret')
      ),
      body := jsonb_build_object('source', 'cron'),
      timeout_milliseconds := 15000
    );
  $job$
);
