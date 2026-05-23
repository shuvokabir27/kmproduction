## লক্ষ্য
হোম পেইজে "বাছাইকৃত পণ্য" সেকশনের মতো একাধিক কাস্টম সেকশন এডমিন প্যানেল থেকে তৈরি ও ম্যানেজ করার সুবিধা যোগ করা। প্রতিটি সেকশন হতে পারে:
- **ক্যাটাগরি সেকশন** — একটি নির্দিষ্ট ক্যাটাগরির প্রডাক্টগুলো দেখাবে
- **অফার সেকশন** — এডমিন নিজে বেছে নেওয়া প্রডাক্টগুলো দেখাবে (ফ্রি ডেলিভারি / স্পেশাল অফার ব্যাজসহ)

## ডেটাবেস
নতুন দুটি টেবিল তৈরি হবে:

**`home_sections`**
- `title` (সেকশনের বাংলা নাম, যেমন "ফ্রি ডেলিভারি অফার")
- `subtitle` / `eyebrow` (ছোট লেবেল, যেমন "SPECIAL OFFER")
- `section_type` — `category` বা `manual`
- `category_id` (যদি `category` টাইপ হয়)
- `badge_text` (ঐচ্ছিক, যেমন "ফ্রি ডেলিভারি", "৫০% ছাড়")
- `badge_color` (amber / red / green / blue)
- `accent_color` (সেকশনের রঙ থিম)
- `cta_label` ও `cta_link` (ঐচ্ছিক "সব দেখুন" বাটন)
- `max_items` (ডিফল্ট ১২)
- `sort_order`, `is_active`

**`home_section_products`** (manual টাইপের জন্য)
- `section_id`, `product_id`, `sort_order`

RLS: সবাই active সেকশন পড়তে পারবে; শুধু admin/product_admin তৈরি/এডিট/ডিলিট করতে পারবে।

## অ্যাডমিন প্যানেল (`AdminProducts` এর ভেতরে নতুন ট্যাব)
"হোম সেকশন" নামে নতুন ট্যাব যোগ হবে যেখানে:
- সব সেকশনের তালিকা (drag-friendly sort, active toggle, delete)
- "নতুন সেকশন" বাটন → ডায়ালগে টাইটেল, eyebrow, টাইপ (ক্যাটাগরি / ম্যানুয়াল), ক্যাটাগরি সিলেক্টর অথবা প্রডাক্ট মাল্টি-সিলেক্টর, ব্যাজ টেক্সট/কালার, CTA, max items
- এডিট/আপডেটও একই ডায়ালগ দিয়ে

## ফ্রন্টএন্ড কম্পোনেন্ট
- `CustomHomeSections.tsx` — সব active সেকশন এনে রেন্ডার করবে
- প্রতিটি সেকশন `FeaturedProductsSection` এর মতোই carousel UI ব্যবহার করবে, কিন্তু সেকশনের নিজস্ব accent কালার ও ব্যাজ থাকবে
- `PublicHome.tsx` এ `FeaturedProductsSection` এর নিচে `CustomHomeSections` বসবে

## কারিগরি বিস্তারিত
- নতুন কম্পোনেন্ট: `src/components/CustomHomeSections.tsx`, `src/components/admin/HomeSectionsManager.tsx`
- কুয়েরি: section → products। `manual` হলে `home_section_products` জয়েন; `category` হলে `products` থেকে `category_id` ফিল্টার + `is_active=true` + `sort_order` অনুযায়ী।
- ক্যারোসেল, ব্যাজ, ও বাটন স্টাইল `FeaturedProductsSection` থেকে রিইউজ — শুধু রঙ ডায়নামিক।
- `PublicHome.tsx` এবং `AdminProducts.tsx` এ ইন্টিগ্রেশন।

প্রথমে মাইগ্রেশন রান হবে, এপ্রুভাল পেলে কোড লেখা হবে।
