# Eğitim Platformu - CV Proje Anlatımı

## Proje: Eğitim Platformu (Demo)
**Rolüm:** Full-Stack Web Geliştirici  
**Teknolojiler:** HTML5, Tailwind CSS, Vanilla JavaScript, PHP, MySQL, Iyzico (3DS), Brevo (E-posta), Apache (.htaccess)

### Proje Genel Bakış
Bu proje; rol bazlı (Admin/Eğitmen/Öğrenci) erişim kontrollü, tam fonksiyonel bir **online eğitim platformu** demo uygulamasıdır. Modern UI/UX tasarımıyla (Tailwind CSS + custom animasyonlar) hazırlanmış responsive web uygulaması.

> GitHub notu: Marka/logolar ve kurumsal iletişim bilgileri public paylaşım için çıkarılıp anonimleştirilecek şekilde düzenlenmiştir.

### Ana Özellikler
✅ **Rol Bazlı Kullanıcı Panelleri**  
- **Admin Paneli**: Dashboard, kullanıcı/kurs yönetimi, finansal raporlar, toplu e-posta (Brevo), içerik denetimi (header/footer/HTML modülleri)  
- **Eğitmen Paneli**: Ders talebi onayı, takvim yönetimi, profil/bio/saatlik ücret  
- **Öğrenci Paneli**: Kurs listesi, özel ders talebi, ödeme geçmişi, takvim  

✅ **Kurs & Özel Ders Sistemi**  
```
Kurs Yönetimi ←→ Satın Alma ←→ Ödeme (Iyzico 3DS) ←→ Erişim
     ↓
Özel Ders Talebi ←→ Takvim Eşleştirme ←→ Canlı Ders Planlama
```

✅ **Ödeme Altyapısı** (Production-ready)  
- Iyzico 3DS entegrasyonu (callback/auth/verify)  
- Ödeme ayarları paneli (mock/paytr/iyzico/stripe)  
- Başarılı/başarısız sayfalar + 3DS yönlendirme  

✅ **İletişim & Bildirim**  
- Toplu e-posta sistemi (Brevo API)  
- SMS entegrasyonu  
- Destek mesajları admin paneli  
- Bildirim geçmişi  

### Teknik Mimari
```
Frontend: 
├── HTML5 + Tailwind CSS (responsive/dark mode)
├── Vanilla JS modülleri (admin-courses.js, site-payments.js...)
└── Animasyonlar (marquee, float, soft-reveal)

Backend: 
├── PHP API endpoints (/api/login.php, /api/payment_create.php...)
├── MySQL şeması (users, lesson_requests, payments, notifications)
├── .env tabanlı konfigürasyon
└── .htaccess güvenlik kuralları

Veritabanı (schema.sql): 
├── users (role: admin/instructor/student)
├── lesson_requests (status workflow)
├── payments (iyzico_ref tracking)
├── notifications (email/sms/in_app)
└── announcements (audience targeting)
```

### Geliştirilen Kritik Bileşenler
1. **Iyzico 3DS Entegrasyonu** (`api/_iyzico.php`, `iyzico_3ds_callback.php`)  
2. **Rol Bazlı Auth** (`api/login.php`, `api/me.php`)  
3. **Dinamik Admin Panel** (sidebar, modüller, dark mode)  
4. **Özel Ders Takvim Akışı** (talep → onay → ödeme → canlı ders)  
5. **İçerik Yönetim Sistemi** (header/footer/HTML modül editörü)  

### Demo Kurulum (5 dk)
```bash
# 1. MySQL > schema.sql çalıştır
# 2. .env kopyala → DB/iyzico/brevo anahtarları doldur  
# 3. PHP/Apache → localhost aç
# 4. Admin: api/login.php?static (DB olmadan test)
```

### Performans & Ölçeklenebilirlik
- **Statik HTML + API** mimarisi (CDN uyumlu)  
- **Lazy loading** + modern animasyonlar (60fps)  
- **Production DB şeması** (indexler, foreign key, enum status)  
- **Güvenlik** (.htaccess, SQL injection koruması, 3DS)  

**Sonuç:** Çok sayıda HTML sayfası, PHP API ucu ve JS modülü ile; 3DS ödeme akışı ve rol bazlı panelleri kapsayan uçtan uca bir eğitim platformu demo çalışması.

---

**Kullanım Önerisi:** CV'nde "Featured Projects" bölümüne koy. Tech stack badge'leri: `Tailwind | PHP | MySQL | Iyzico | Brevo`. Interview sorusu hazır: "3DS callback nasıl çalışır?" → `api/iyzico_3ds_callback.php` göster.

