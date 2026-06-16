## Goal
WordPress-অ্যাডমিন স্টাইলে পুরো প্রোডাক্ট অ্যাডমিন ড্যাশবোর্ড নতুনভাবে ডিজাইন — মিনিমাল, ক্লিন, সাদা ব্যাকগ্রাউন্ড, বাম পাশে collapsible সাইডবার, উপরে slim টপবার। পাশাপাশি Site Customization এবং Order Management সম্পূর্ণ আলাদা সেকশনে। Super Admin নতুন রোলে (যেমন Order Manager) ম্যানেজার অ্যাকাউন্ট তৈরি করতে পারবে।

## ১. নতুন রোল সিস্টেম (DB)
`app_role` enum-এ যোগ করা হবে:
- `order_manager` — শুধু অর্ডার ম্যানেজ করবে
- `site_manager` — শুধু সাইট কাস্টমাইজেশন (প্রোডাক্ট, ক্যাটাগরি, হোম সেকশন, অফার ইত্যাদি)
- `product_admin` (existing) — Super Admin, সব কিছু + ইউজার/রোল ম্যানেজমেন্ট

`user_roles` টেবিলে ইতিমধ্যেই rows যোগ করা যায়। নতুন helper:
- `is_super_admin(uid)` = has_role(uid, 'product_admin')
- নতুন RLS policy লাগবে user_roles টেবিলে — শুধু super admin INSERT/DELETE করতে পারবে।

## ২. WordPress-স্টাইল লেআউট
নতুন shell: `src/components/admin/WPAdminShell.tsx`
- বাম সাইডবার: সাদা ব্যাকগ্রাউন্ড, slate-900 টেক্সট, hover-এ blue accent বার, collapsible (icon-only mode), দুটি গ্রুপ:
  - **Site Customization**: ড্যাশবোর্ড, প্রোডাক্ট, ক্যাটাগরি, প্রাইসিং, ভিডিও, হোম সেকশন, অফার, ফ্রি ডেলিভারি, ব্ল্যাঙ্ক টেমপ্লেট, সাইট সেটিংস
  - **Order Management**: অর্ডার, পেন্ডিং/কনফার্মড/শিপড… (filter chips), কাস্টমার, রিপোর্ট, ডেলিভারি সেটিংস
  - **User Management** (super admin only): ম্যানেজার অ্যাকাউন্ট, রোল
- টপবার: ব্রেডক্রাম্ব + সার্চ + লগআউট + অ্যাকাউন্ট মেনু

বর্তমান glossy blue/green কার্ড সরিয়ে minimal: সাদা কার্ড, slate-200 বর্ডার, ছোট ছায়া, blue accent (#3b82f6) শুধু buttons/active state-এ।

## ৩. রুট রিস্ট্রাকচার
- `/admin` → ওভারভিউ ড্যাশবোর্ড (stats)
- `/admin/site/*` → সাইট কাস্টমাইজেশন সাব-রুট (products, categories, home-sections…)
- `/admin/orders/*` → অর্ডার ম্যানেজমেন্ট সাব-রুট (orders list, customers, reports, delivery)
- `/admin/users` → ম্যানেজার অ্যাকাউন্ট (super admin only)

রোল ভিত্তিক gate:
- `order_manager` শুধু `/admin/orders/*` দেখবে
- `site_manager` শুধু `/admin/site/*`
- `product_admin` সব

## ৪. ম্যানেজার অ্যাকাউন্ট তৈরি
`/admin/users` পেজে super admin:
- ইমেইল, পাসওয়ার্ড, রোল select (order_manager / site_manager / product_admin) দিয়ে নতুন ম্যানেজার তৈরি
- Edge function `admin-create-manager` (service role দিয়ে auth user বানাবে + user_roles INSERT)
- লিস্টে existing managers দেখাবে, role পরিবর্তন/মুছে ফেলা যাবে

## ৫. বিদ্যমান পেজ মাইগ্রেশন
পুরোনো `ProductAdminLayout`/`SetupShopAdmin` ইত্যাদি নতুন `WPAdminShell`-এর ভিতরে render হবে। ভেতরের page content (প্রোডাক্ট টেবিল, অর্ডার লিস্ট ইত্যাদি) যেমন আছে রেখে শুধু কার্ড/বাটন styling minimal-এ আনব।

## টেকনিক্যাল বিস্তারিত
- Migration: `ALTER TYPE app_role ADD VALUE 'order_manager'; ADD VALUE 'site_manager';` + user_roles RLS update + helper functions
- Edge function: `admin-create-manager` (verifies caller is product_admin via JWT, creates auth.user, inserts user_roles)
- নতুন কম্পোনেন্ট: `WPAdminShell`, `WPSidebar`, `WPTopbar`, `RoleGate`, `ManagersPage`, `CreateManagerDialog`
- পুরোনো colorful gradient কার্ড সরিয়ে `bg-white border border-slate-200 rounded-md` ব্যবহার

## যা পরিবর্তন হবে না
- Bengali fonts (Tiro Bangla / Hind Siliguri)
- সব business logic, API calls, table schemas (orders, products ইত্যাদি)
- Customer/landing pages
