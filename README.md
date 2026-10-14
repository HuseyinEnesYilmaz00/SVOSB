# SVOBS

Siyer Vakfı Öğrenci Bilgi Sistemi; Çağın Musabları, Çağın Esmaları ve Siyer Akademi programları için öğrenci, ders, sınav, yoklama, duyuru ve raporlama platformudur.

Canlı adres: [siyerobs.com](https://siyerobs.com)

## Yerel geliştirme

Uygulama `svobs/` klasöründedir.

```bash
cd svobs
npm install
npm run dev
```

Gerekli ortam değişkenleri `.env.local` içinde tutulur ve Git'e eklenmez.

## Kontrol ve yayınlama

```bash
cd svobs
npm run build
npm run deploy
```

Uygulama OpenNext aracılığıyla Cloudflare Workers'a yayınlanır. Veritabanı, kimlik doğrulama, cron işleri ve Edge Functions Supabase üzerinde çalışır; uygulama e-postaları Resend üzerinden gönderilir.
