# Eğitim Platformu (Demo)

Rol bazlı (Admin/Eğitmen/Öğrenci) panelleri olan eğitim platformu demo projesi. Statik HTML + Tailwind UI ve PHP/MySQL API katmanı ile hazırlanmıştır.

> Public repo notu: Marka/logolar ve gerçek anahtarlar repo’da yoktur. Logo için `assets/img/logo-placeholder.svg` kullanılır; gerçek değerler `.env` dosyasında tutulur ve `.gitignore` ile dışarıda bırakılır.

## ⚙️ Proje Bağlamı

Bu repo, portfolyo amacıyla hazırlanmış anonimleştirilmiş bir demo çalışmasıdır.  
Marka/kurumsal varlıklar, müşteri verileri ve gizli bilgiler projeye dahil edilmemiştir; gerçek anahtarlar repo’da yer almaz.

Proje, yapılandırılmış bir yazılım geliştirme eğitimi kapsamında geliştirilmiştir.  
Frontend, backend ve veritabanı tasarımı tarafımdan gerçekleştirilmiştir.

## Neler var?
- **Rol bazlı paneller:** Admin / Eğitmen / Öğrenci
- **Kurs akışı:** listeleme → detay → sepete ekleme → ödeme sayfası
- **Özel ders akışı:** talep → takvim/süreç yönetimi
- **Ödeme iskeleti:** `mock`, `paytr`, `iyzico (3DS)`, `stripe` (sağlayıcı seçimi + doğrulama uçları)
- **İletişim:** Brevo (e-posta) + SMS uçları (scaffold)
- **İçerik yönetimi:** header/footer/HTML modülleri + sayfa yönetimi

## Proje yapısı
- `index.html`: Landing/ana giriş sayfası
- `pages/`: Tüm ekranlar (giriş, paneller, ödeme, içerik yönetimi vb.)
- `assets/js/`: Frontend modülleri (auth, sepet, ödeme, admin modülleri)
- `assets/img/`: Placeholder görseller
- `api/`: PHP API uçları (auth, ödeme, e‑posta, admin kullanıcı yönetimi)
- `schema.sql`: MySQL şeması

## Hızlı gezinti (ekranlar)
- Kullanıcı: `pages/giris.html`, `pages/kayit.html`, `pages/userpanel.html`
- Eğitmen: `pages/egitmenpanel.html`, `pages/egitmen-dersyonetimi.html`
- Admin: `pages/s.adminpanel.html`, `pages/kursadmin.html`, `pages/kullanicimanage.html`, `pages/epostaadmin.html`
- Ödeme: `pages/odeme_page.html`, `pages/odeme_3ds.html`, `pages/odeme_basarili.html`

## Lokal kurulum (5 dk)
1) MySQL’de `schema.sql` çalıştır.
2) `.env.example` dosyasını `.env` olarak kopyala ve değerleri doldur:
   - DB bilgileri (host/user/pass/db)
   - Ödeme sağlayıcısı anahtarları (kullanacaksan)
   - Brevo anahtarı (kullanacaksan)
3) Projeyi bir PHP/Apache ortamında çalıştır (Laragon/XAMPP/Apache + PHP).
4) Tarayıcıdan `index.html` → ekranlara geç.

DB’siz hızlı demo gerekiyorsa:
- `.env` içine `STATIC_ADMIN_ENABLED=true` ekleyip demo admin girişiyle test edebilirsin.

## Güvenlik / paylaşım notları
- `.env` repoya eklenmez (anahtar/şifre yok).
- Logo/kurumsal varlıklar repodan çıkarılmıştır.

## GitHub ayarları (opsiyonel)
Repo sayfası → sağda **About** → dişli (**Edit**) → **Topics**:
- `php`
- `mysql`
- `tailwindcss`
- `vanilla-javascript`
- `demo-project`

## Dokümantasyon
- Detaylı proje anlatımı: `docs/PROJE_OZETI.md`
