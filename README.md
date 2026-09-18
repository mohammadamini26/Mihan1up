# Mihan1 v2 — Netlify Ready

پنل ادمین اکنون امکان انتخاب مستقیم عکس و ویدیو از گوشی/کامپیوتر و آپلود به Netlify Blobs را دارد.

## Deploy
1. پروژه را روی GitHub قرار دهید یا با Netlify متصل کنید.
2. در Netlify برای سایت یک Blobs store بسازید: Site configuration → Blobs.
3. Environment Variables:
   - `OWNER_PASSWORD` = رمز اختصاصی صاحب سایت (مدیر اصلی)
   - `SESSION_SECRET` = یک عبارت تصادفی طولانی

ادمین‌ها از داخل `/owner.html` توسط مالک ساخته می‌شوند و دیگر نیازی به `ADMIN_PASSWORD` ندارند.
4. Deploy.

پنل: `/admin.html`

حداکثر اندازه هر فایل در این نسخه: 10MB.
