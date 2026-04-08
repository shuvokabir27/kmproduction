

# বাইরের কাজের স্ট্যাটাস ও সদস্য ইনকাম ইন্টিগ্রেশন

## সারসংক্ষেপ
বাইরের কাজের স্ট্যাটাস পরিবর্তন ইতিমধ্যে কাজ করছে (Select + statusMutation আছে)। এখন যা করতে হবে: ফ্রিল্যান্স অ্যাসাইনমেন্ট থেকে প্রাপ্ত আয় সদস্যদের মোট ব্যালেন্সে যুক্ত করা এবং সদস্য ড্যাশবোর্ডে বাইরের আয় আলাদাভাবে দেখানো।

## পরিবর্তন

### 1. `useMemberBalance.ts` — ফ্রিল্যান্স আয় যুক্ত
- `freelance_assignments` টেবিল থেকে `is_paid = true` অ্যাসাইনমেন্টগুলোর `paid_amount` যোগ করবে
- রিটার্ন অবজেক্টে `totalFreelance` ফিল্ড যুক্ত হবে
- `balance` ক্যালকুলেশনে `totalFreelance` যোগ হবে: `totalEarned + totalBonuses + totalSalaryCredits + totalFreelance + previousBalance - totalPaid`

### 2. `MemberDashboard.tsx` — বাইরের আয় কার্ড ও তালিকা
- Balance cards-এ নতুন কার্ড: "বাইরের আয়" (Briefcase আইকন, orange gradient)
- নতুন সেকশন: "বাইরের কাজ" — সদস্যের ফ্রিল্যান্স অ্যাসাইনমেন্ট তালিকা (প্রজেক্ট নাম, ভূমিকা, রেট, পেমেন্ট স্ট্যাটাস)
- `freelance_assignments` ও `freelance_projects` থেকে ডাটা ফেচ করবে

### 3. কোনো ডাটাবেস পরিবর্তন নেই
বিদ্যমান টেবিল ও RLS যথেষ্ট — সদস্যরা ইতিমধ্যে নিজেদের `freelance_assignments` দেখতে পারে।

## ফাইল পরিবর্তন:
1. `src/hooks/useMemberBalance.ts` — freelance income query যুক্ত
2. `src/pages/MemberDashboard.tsx` — freelance কার্ড ও তালিকা সেকশন যুক্ত

