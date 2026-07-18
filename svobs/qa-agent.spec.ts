import { test, chromium, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// ============ CONFIG ============
const BASE_URL =
  process.env.SVOBS_URL ||
  'https://symmetrical-system-4qj4x5j45559f7v99-3001.app.github.dev';

const ROLES = [
  { name: 'admin',    email: 'superadmin@siyervakfi.com',   password: '12345678' },
  { name: 'ogretmen', email: 'm.cahitsahinler@gmail.com',   password: '12345678' },
  { name: 'ogrenci',  email: 'huseyinenesyilmaz@gmail.com', password: '12345678' },
];

// Her rolün gezeceği route'lar — şimdilik tek sayfa, sonra alt sayfalar eklenebilir
const ROUTES: Record<string, string[]> = {
  admin:    ['/admin'],
  ogretmen: ['/ogretmen'],
  ogrenci:  ['/ogrenci'],
};

const VIEWPORTS = [
  { name: 'mobile',  width: 390,  height: 844 },
  { name: 'tablet',  width: 820,  height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
];

const OUT_DIR = 'qa-report';
// ==============================================================

async function login(page: Page, email: string, password: string) {
  console.log(`  → /giris sayfasına gidiliyor...`);
  await page.goto(`${BASE_URL}/giris`, { waitUntil: 'domcontentloaded' });

  console.log(`  → form dolduruluyor (${email})...`);
  await page.fill('#email', email, { timeout: 15000 });
  await page.fill('#password', password, { timeout: 15000 });

  console.log(`  → "Giriş Yap" tıklanmadan önce ekran görüntüsü alınıyor...`);
  await page.screenshot({ path: path.join(OUT_DIR, `_DEBUG_oncesi.png`) }).catch(() => {});

  console.log(`  → "Giriş Yap" tıklanıyor...`);
  try {
    await page.click('button:has-text("Giriş Yap")', { timeout: 15000, noWaitAfter: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, `_DEBUG_sonrasi.png`) }).catch(() => {});
  } catch (clickErr) {
    console.log(`  ✘ tıklama başarısız/takıldı: ${clickErr}`);
    await page.screenshot({ path: path.join(OUT_DIR, `_DEBUG_tiklama_hatasi.png`) }).catch(() => {});
    throw clickErr;
  }

  // Hem tam sayfa yenilemesini hem client-side route değişimini yakalar
  try {
    await page.waitForFunction(
      () => !window.location.pathname.includes('/giris'),
      { timeout: 20000 }
    );
    console.log(`  → giriş başarılı, şu an: ${page.url()}`);
  } catch {
    // URL değişmedi — ekranda hata mesajı var mı bak
    await page.waitForTimeout(1500); // toast/hata mesajının belirmesi için
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const possibleError = bodyText
      .split('\n')
      .find((line) =>
        /hatal|geçersiz|yanlış|bulunamadı|error|invalid/i.test(line)
      );
    throw new Error(
      `URL değişmedi (hâlâ: ${page.url()}). Ekranda görünen olası hata: "${
        possibleError || 'bulunamadı'
      }"`
    );
  }
}

test.describe('SVOBS Visual QA Agent', () => {
  test('crawl all roles and routes', async () => {
    test.setTimeout(5 * 60 * 1000); // 5 dakika — çoklu rol/route/viewport için yeterli pay

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const report: any[] = [];

    for (const role of ROLES) {
      console.log(`\n=== ${role.name} taranıyor ===`);
      const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
      const context = await browser.newContext();
      const page = await context.newPage();

      const consoleErrors: string[] = [];
      const networkErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('response', (res) => {
        if (res.status() >= 400) networkErrors.push(`${res.status()} ${res.url()}`);
      });

      try {
        await login(page, role.email, role.password);
      } catch (err) {
        console.log(`  ✘ ${role.name} girişi başarısız: ${err}`);
        await page.screenshot({ path: path.join(OUT_DIR, `${role.name}_LOGIN_HATASI.png`) });
        await browser.close();
        continue;
      }

      for (const route of ROUTES[role.name] || []) {
        for (const vp of VIEWPORTS) {
          console.log(`  → ${route} (${vp.name})`);
          await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });

          // Önce spinner'ın belirmesini bekle (varsa)
          await page.waitForSelector('.animate-spin', { state: 'visible', timeout: 3000 }).catch(() => {});

          // Sonra spinner'ın kaybolmasını bekle (veri gelene kadar)
          await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 }).catch(() => {});

          await page.waitForTimeout(300); // son görsel yerleşme payı

          const fileName = `${role.name}_${route.replace(/\//g, '-') || 'home'}_${vp.name}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: true });

          report.push({
            role: role.name,
            route,
            viewport: vp.name,
            screenshot: fileName,
          });


          // Sayfadaki tüm butonları bul ve tek tek dene
          const buttons = await page.locator('button:visible').all();
          const buttonResults: any[] = [];

          for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            const label = (await btn.innerText().catch(() => '')) || `buton-${i}`;

            try { 
              const beforeUrl = page.url();
              await btn.click({ timeout: 3000, trial: false });
              await page.waitForTimeout(500); // olası animasyon/state değişimi için

              const afterUrl = page.url();
              buttonResults.push({
              label,
              status: 'tıklandı',
              urlDegisti: beforeUrl !== afterUrl,
            });

          // Eğer URL değiştiyse, sayfayı eski haline geri getir (aynı route'ta kalmak için)
     if (beforeUrl !== afterUrl) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
    }
  } catch (err) {
    buttonResults.push({ label, status: 'HATA', error: String(err) });
  }
}

report.push({
  role: role.name,
  route,
  viewport: vp.name,
  butonlar: buttonResults,
});
        }
      }

      report.push({
        role: role.name,
        consoleErrors: [...new Set(consoleErrors)],
        networkErrors: [...new Set(networkErrors)],
      });

      await browser.close();
    }

    fs.writeFileSync(
      path.join(OUT_DIR, 'report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log(`✅ QA taraması bitti. ${OUT_DIR}/ klasörüne bak.`);
  });
});