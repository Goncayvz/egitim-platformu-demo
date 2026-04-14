# Eğitim Platformu (Demo)

Statik HTML + Tailwind arayüzü ve PHP tabanlı API uçlarıyla hazırlanmış eğitim platformu demo projesi.

> Not: Bu repo GitHub paylaşımı için marka/kurumsal varlıklardan arındırıldı. Şirket logosu repo’da yok; yerine `assets/img/logo-placeholder.svg` kullanılır. Gerçek anahtarlar `.env` içinde tutulur ve repoya eklenmez.

## Öne çıkan modüller
- Rol bazlı paneller: **Admin / Eğitmen / Öğrenci**
- Kurs yönetimi ve kurs satın alma akışı
- Özel ders talep/takvim akışları
- Ödeme altyapısı: `mock`, `paytr`, `iyzico (3DS)`, `stripe`
- Toplu e‑posta: **Brevo**
- Sayfa/içerik yönetimi (özel sayfalar) ve tema ayarları

## Klasörler
- `assets/js`: site ve admin tarafı JS modülleri
- `api`: PHP API uçları (auth, ödeme, e‑posta, admin kullanıcı yönetimi)
- `schema.sql`: MySQL şeması

## Hızlı başlama (lokal)
1) MySQL’de `schema.sql` çalıştır.
2) `.env.example` → `.env` kopyala ve DB/entegrasyon anahtarlarını doldur.
3) Projeyi bir PHP/Apache ortamında çalıştır (ör. Laragon/XAMPP).

DB kurmadan admin girişi gerekiyorsa:
- `.env` içine `STATIC_ADMIN_ENABLED=true` ekleyip `api/login.php` içindeki statik admin girişini kullan.

## CV için proje anlatımı
- `CV_PROJE_ANLATIMI.md`
