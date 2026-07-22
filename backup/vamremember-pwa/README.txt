VamRemember PWA - نسخه اولیه

فایل index.html را مستقیماً با file:// باز نکنید، چون Service Worker به HTTP/HTTPS نیاز دارد.

تست روی ویندوز:
1) داخل پوشه پروژه PowerShell باز کنید.
2) اگر Python نصب است:
   python -m http.server 8080
3) مرورگر:
   http://localhost:8080

برای نصب روی iPhone باید پروژه روی یک آدرس HTTPS میزبانی شود.
سپس در Safari باز کنید و Share > Add to Home Screen را بزنید.

این نسخه:
- اطلاعات expenses را از Supabase می‌خواند.
- CLOSED را ماه غیرفعال در نظر می‌گیرد.
- اقساط ماه جاری و معوق ماه قبل را نمایش می‌دهد.
- هنوز ثبت پرداخت و ساخت قسط جدید ندارد.
