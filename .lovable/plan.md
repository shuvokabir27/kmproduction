## লক্ষ্য

KM admin এখন **freelance/client project**-এ সরাসরি হাজিরা নিতে পারবে। সেই হাজিরা সাধারণ KM-অ্যাটেনডেন্সের মতই কাজ করবে — daily_rate KM ব্যালেন্সে জমা হবে এবং KM পেমেন্ট হিসেবে পরিশোধ হবে। সংশ্লিষ্ট মেম্বারের ড্যাশবোর্ডে "বাইরের কাজ" সেকশনে কিছু দেখাবে না — শুধু হাজিরা লিস্টে project name সহ entry দেখাবে।

বর্তমান client-added `client_project_artists` (ক্লায়েন্ট-পরিশোধিত) এবং admin-added `freelance_assignments` অপরিবর্তিত থাকবে।

## ডেটাবেস পরিবর্তন

`attendance` টেবিলে নতুন optional কলাম:
- `freelance_project_id uuid` — যদি set থাকে তবে এটা freelance project-এর হাজিরা
- `shooting_id` কে nullable করা হবে (এখন NOT NULL)

constraint: `shooting_id` বা `freelance_project_id` — যেকোনো একটি অবশ্যই থাকতে হবে।

RLS: বিদ্যমান `Members can view own attendance` ও admin policies কাজ করবে।

## অ